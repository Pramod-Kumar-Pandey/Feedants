/**
 * Unit tests for the pure status/action-derivation logic — the part of
 * the system that determines lifecycle state, spots, and the CTA shown to
 * the user. Uses Node's built-in test runner (Node 18+), so no extra
 * dependency is needed: `npm test`.
 *
 * These are deliberately isolated from MongoDB — computeStatus/computeSpots/
 * computeUserAction are pure functions of (data, now), so they're testable
 * without a database, and this is exactly the logic most worth locking
 * down with tests since every screen state depends on it being correct.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  STATUS,
  computeStatus,
  computeSpots,
  computeUserAction,
} = require('../src/services/competitionStatus');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function makeCompetition(overrides = {}) {
  const now = Date.now();
  return {
    adminStatus: 'PUBLISHED',
    registrationOpensAt: new Date(now - 2 * DAY),
    registrationClosesAt: new Date(now + 2 * DAY),
    startDate: new Date(now + 3 * DAY),
    endDate: new Date(now + 10 * DAY),
    maxParticipants: 10,
    currentParticipantsCount: 0,
    ...overrides,
  };
}

test('computeStatus: DRAFT and CANCELLED are always returned regardless of dates', () => {
  assert.equal(computeStatus(makeCompetition({ adminStatus: 'DRAFT' })), STATUS.DRAFT);
  assert.equal(computeStatus(makeCompetition({ adminStatus: 'CANCELLED' })), STATUS.CANCELLED);
});

test('computeStatus: before registrationOpensAt -> UPCOMING', () => {
  const c = makeCompetition({ registrationOpensAt: new Date(Date.now() + DAY) });
  assert.equal(computeStatus(c), STATUS.UPCOMING);
});

test('computeStatus: between opens and closes -> REGISTRATION_OPEN', () => {
  assert.equal(computeStatus(makeCompetition()), STATUS.REGISTRATION_OPEN);
});

test('computeStatus: between closes and start -> REGISTRATION_CLOSED', () => {
  const c = makeCompetition({
    registrationClosesAt: new Date(Date.now() - HOUR),
    startDate: new Date(Date.now() + DAY),
  });
  assert.equal(computeStatus(c), STATUS.REGISTRATION_CLOSED);
});

test('computeStatus: between start and end -> ONGOING', () => {
  const c = makeCompetition({
    registrationClosesAt: new Date(Date.now() - 2 * DAY),
    startDate: new Date(Date.now() - DAY),
    endDate: new Date(Date.now() + DAY),
  });
  assert.equal(computeStatus(c), STATUS.ONGOING);
});

test('computeStatus: after endDate -> ENDED', () => {
  const c = makeCompetition({
    registrationClosesAt: new Date(Date.now() - 5 * DAY),
    startDate: new Date(Date.now() - 3 * DAY),
    endDate: new Date(Date.now() - DAY),
  });
  assert.equal(computeStatus(c), STATUS.ENDED);
});

test('computeSpots: unlimited (maxParticipants null) reports isUnlimited, no isFull', () => {
  const spots = computeSpots(makeCompetition({ maxParticipants: null, currentParticipantsCount: 500 }));
  assert.equal(spots.isUnlimited, true);
  assert.equal(spots.spotsLeft, null);
  assert.equal(spots.isFull, false);
});

test('computeSpots: exactly at capacity -> isFull true, spotsLeft 0', () => {
  const spots = computeSpots(makeCompetition({ maxParticipants: 10, currentParticipantsCount: 10 }));
  assert.equal(spots.isFull, true);
  assert.equal(spots.spotsLeft, 0);
});

test('computeSpots: never reports negative spotsLeft even if overbooked by a bug', () => {
  const spots = computeSpots(makeCompetition({ maxParticipants: 10, currentParticipantsCount: 15 }));
  assert.equal(spots.spotsLeft, 0);
});

test('computeUserAction: unregistered + open + not full -> JOIN enabled', () => {
  const action = computeUserAction({ status: STATUS.REGISTRATION_OPEN, isFull: false }, null);
  assert.equal(action.action, 'JOIN');
  assert.equal(action.enabled, true);
});

test('computeUserAction: unregistered + open + full -> disabled, not JOIN', () => {
  const action = computeUserAction({ status: STATUS.REGISTRATION_OPEN, isFull: true }, null);
  assert.equal(action.action, 'NONE');
  assert.equal(action.enabled, false);
});

test('computeUserAction: registered + open -> LEAVE enabled', () => {
  const action = computeUserAction(
    { status: STATUS.REGISTRATION_OPEN, isFull: false },
    { status: 'REGISTERED' }
  );
  assert.equal(action.action, 'LEAVE');
  assert.equal(action.enabled, true);
});

test('computeUserAction: registered + ongoing -> VIEW_PROGRESS, not LEAVE (no seat-back mid-event)', () => {
  const action = computeUserAction({ status: STATUS.ONGOING, isFull: false }, { status: 'REGISTERED' });
  assert.equal(action.action, 'VIEW_PROGRESS');
});

test('computeUserAction: registered + ended -> VIEW_RESULTS', () => {
  const action = computeUserAction({ status: STATUS.ENDED, isFull: false }, { status: 'REGISTERED' });
  assert.equal(action.action, 'VIEW_RESULTS');
});

test('computeUserAction: unregistered + upcoming -> disabled, no JOIN yet', () => {
  const action = computeUserAction({ status: STATUS.UPCOMING, isFull: false }, null);
  assert.equal(action.enabled, false);
  assert.notEqual(action.action, 'JOIN');
});

test('computeUserAction: unregistered + registration closed -> disabled', () => {
  const action = computeUserAction({ status: STATUS.REGISTRATION_CLOSED, isFull: false }, null);
  assert.equal(action.enabled, false);
});
