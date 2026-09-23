/**
 * Pure functions that turn a Competition document + current time + the
 * viewer's participation record into everything the details screen needs
 * to render correctly. Keeping this logic in one place (rather than
 * scattering `if (now > startDate)` checks across controllers and the
 * mobile app) is what makes the "time-dependent" and "state-dependent"
 * requirements in the brief actually testable and consistent.
 */

const STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  CANCELLED: 'CANCELLED',
  UPCOMING: 'UPCOMING', // published, registration not open yet
  REGISTRATION_OPEN: 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED: 'REGISTRATION_CLOSED', // closed but competition hasn't started
  ONGOING: 'ONGOING',
  ENDED: 'ENDED',
});

/**
 * Derives the lifecycle status purely from data — no side effects, no DB
 * writes. Because this runs on every read, the UI is never more than one
 * request stale, unlike a cron-based status flip.
 */
function computeStatus(competition, now = new Date()) {
  if (competition.adminStatus === 'DRAFT') return STATUS.DRAFT;
  if (competition.adminStatus === 'CANCELLED') return STATUS.CANCELLED;

  if (now < competition.registrationOpensAt) return STATUS.UPCOMING;
  if (now >= competition.registrationOpensAt && now < competition.registrationClosesAt) {
    return STATUS.REGISTRATION_OPEN;
  }
  if (now >= competition.registrationClosesAt && now < competition.startDate) {
    return STATUS.REGISTRATION_CLOSED;
  }
  if (now >= competition.startDate && now < competition.endDate) return STATUS.ONGOING;
  return STATUS.ENDED;
}

function computeSpots(competition) {
  const isUnlimited = competition.maxParticipants == null;
  const spotsLeft = isUnlimited
    ? null
    : Math.max(competition.maxParticipants - competition.currentParticipantsCount, 0);
  const isFull = !isUnlimited && spotsLeft === 0;
  return { isUnlimited, spotsLeft, isFull };
}

/**
 * Decides what the primary CTA on the details screen should say/do.
 * This is the single source of truth both the API and the mobile app's
 * tests can rely on — the mobile app should treat this as authoritative
 * rather than re-deriving it from raw dates itself.
 */
function computeUserAction({ status, isFull }, participation) {
  const isRegistered = !!participation && participation.status === 'REGISTERED';

  if (status === STATUS.DRAFT || status === STATUS.CANCELLED) {
    return { action: 'NONE', label: 'Unavailable', enabled: false };
  }

  if (isRegistered) {
    if (status === STATUS.REGISTRATION_OPEN) {
      return { action: 'LEAVE', label: 'Leave Competition', enabled: true };
    }
    if (status === STATUS.ONGOING) {
      return { action: 'VIEW_PROGRESS', label: "You're In — View Progress", enabled: true };
    }
    if (status === STATUS.ENDED) {
      return { action: 'VIEW_RESULTS', label: 'View Results', enabled: true };
    }
    // Registered but registration since closed and event hasn't started
    return { action: 'NONE', label: "You're Registered", enabled: false };
  }

  if (status === STATUS.UPCOMING) {
    return { action: 'NONE', label: 'Registration Opens Soon', enabled: false };
  }
  if (status === STATUS.REGISTRATION_OPEN) {
    if (isFull) return { action: 'NONE', label: 'Competition Full', enabled: false };
    return { action: 'JOIN', label: 'Join Competition', enabled: true };
  }
  if (status === STATUS.REGISTRATION_CLOSED) {
    return { action: 'NONE', label: 'Registration Closed', enabled: false };
  }
  if (status === STATUS.ONGOING) {
    return { action: 'NONE', label: 'Competition In Progress', enabled: false };
  }
  return { action: 'NONE', label: 'Competition Ended', enabled: false };
}

/** What the countdown timer on the details screen should count down to. */
function computeCountdownTarget(competition, status) {
  switch (status) {
    case STATUS.UPCOMING:
      return { label: 'Registration opens in', target: competition.registrationOpensAt };
    case STATUS.REGISTRATION_OPEN:
      return { label: 'Registration closes in', target: competition.registrationClosesAt };
    case STATUS.REGISTRATION_CLOSED:
      return { label: 'Starts in', target: competition.startDate };
    case STATUS.ONGOING:
      return { label: 'Ends in', target: competition.endDate };
    default:
      return null; // ENDED / CANCELLED / DRAFT — nothing to count down to
  }
}

/**
 * Assembles the full view model returned by GET /competitions/:id.
 */
function buildCompetitionView(competition, participation, now = new Date()) {
  const status = computeStatus(competition, now);
  const spots = computeSpots(competition);
  const userAction = computeUserAction({ status, isFull: spots.isFull }, participation);
  const countdown = computeCountdownTarget(competition, status);

  return {
    id: competition._id,
    title: competition.title,
    slug: competition.slug,
    shortDescription: competition.shortDescription,
    description: competition.description,
    rules: competition.rules,
    category: competition.category,
    bannerImageUrl: competition.bannerImageUrl,
    thumbnailImageUrl: competition.thumbnailImageUrl,
    entryFee: competition.entryFee,
    currency: competition.currency,
    prizePool: competition.prizePool,
    prizeTiers: competition.prizeTiers,
    organizer: competition.organizer,

    dates: {
      registrationOpensAt: competition.registrationOpensAt,
      registrationClosesAt: competition.registrationClosesAt,
      startDate: competition.startDate,
      endDate: competition.endDate,
    },

    status,
    spots: {
      max: competition.maxParticipants,
      current: competition.currentParticipantsCount,
      ...spots,
    },
    countdown,
    viewer: {
      isRegistered: !!participation && participation.status === 'REGISTERED',
      participation: participation
        ? {
            joinedAt: participation.joinedAt,
            status: participation.status,
            paymentStatus: participation.paymentStatus,
          }
        : null,
      action: userAction,
    },
    serverTime: now, // lets the client correct for its own clock skew
  };
}

module.exports = {
  STATUS,
  computeStatus,
  computeSpots,
  computeUserAction,
  computeCountdownTarget,
  buildCompetitionView,
};
