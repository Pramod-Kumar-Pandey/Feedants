# Feedants — Competition Details (Full-Stack Assignment)

A functional Competition Details feature: React Native screen, Express/MongoDB
backend, with concurrency-safe registration and fully server-derived
lifecycle state (nothing about "is this open / full / ended" is hardcoded
or computed on the client).

> **Note on the design reference:** no design file was attached to this
> assignment brief when I received it, so the screen layout below is my own
> reasonable interpretation of a typical competition-details screen (banner,
> status badge, countdown, prize pool, entry fee, spots-left bar, rules,
> prize breakdown, sticky join CTA). The effort went into making every one
> of these pieces genuinely dynamic and backend-driven, since that's the
> actual evaluation focus per the brief.

---

## 1. Project structure

```
feedants-competition/
  backend/              Express + MongoDB API
    src/
      config/db.js
      models/            Competition, Participation, User (Mongoose)
      services/
        competitionStatus.js   <- lifecycle/status derivation (core logic)
      controllers/
        competitionController.js  <- join/leave transactions live here
        authController.js
      middleware/        auth, error handling, rate limiting
      validators/         Joi request validation
      routes/
    seed/seed.js         seeds 5 competitions covering every lifecycle state
  mobile/                React Native (Expo) app
    src/
      api/                fetch client + endpoint wrappers
      hooks/useCompetitionDetails.js   <- screen state management
      components/         CountdownTimer, SpotsProgressBar, StatusBadge, etc.
      screens/CompetitionDetailsScreen.js
```

---

## 2. Running it

### Backend

Requirements: Node 18+, a MongoDB **replica set** (required — see below).

```bash
cd backend
cp .env.example .env      # fill in MONGO_URI / JWT_SECRET
npm install
npm run seed               # creates 5 demo competitions + a demo user, prints their ids
npm run dev                 # starts on http://localhost:4000
```

**Why a replica set?** The join/leave endpoints use MongoDB multi-document
transactions to keep the participant counter and the participation record
atomic. Transactions require a replica set — even a single-node one works
locally:

```bash
mongod --replSet rs0 --dbpath ./data
# in a separate mongosh session, once:
rs.initiate()
```

Or just use a free MongoDB Atlas cluster, which is a replica set by default.

After seeding, log in with the printed demo account to get a JWT:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@feedants.app","password":"password123"}'
```

### Running tests

The core lifecycle/business logic (`services/competitionStatus.js` — status
derivation, spots calculation, and the CTA decision table) is covered by a
unit test suite using Node's built-in test runner, so no extra dependency
is required:

```bash
cd backend
npm test
```

### Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

Edit `mobile/app.json` → `expo.extra.apiBaseUrl` to point at your backend
(use your machine's LAN IP, not `localhost`, when testing on a physical
device — e.g. `http://192.168.1.20:4000/api`). For a first run, also paste
one of the competition ids printed by `npm run seed` into
`DEMO_COMPETITION_ID` in `mobile/App.js` (in a real app this comes from
navigation params off a competitions list screen, which is out of scope
here).

### Environment variables (backend/.env)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `MONGO_URI` | MongoDB connection string — **must be a replica set** |
| `JWT_SECRET` | Signing secret for auth tokens |
| `JWT_EXPIRES_IN` | Token lifetime, default `7d` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | General API rate limiting |
| `CORS_ORIGIN` | Allowed origin(s) |

---

## 3. API surface

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | — | Get a JWT (demo auth) |
| GET | `/api/competitions` | optional | List competitions (paginated) |
| GET | `/api/competitions/:id` | optional | Full details view, status, spots, viewer's registration state |
| POST | `/api/competitions/:id/join` | required | Register (concurrency-safe) |
| DELETE | `/api/competitions/:id/join` | required | Withdraw |
| GET | `/api/competitions/:id/leaderboard` | optional | Paginated leaderboard |

All responses follow `{ success, data }` or `{ success: false, error: { message, details? } }`.

---

## 4. Core design decisions

**Status is computed, not stored.** `services/competitionStatus.js` derives
`UPCOMING / REGISTRATION_OPEN / REGISTRATION_CLOSED / ONGOING / ENDED` purely
from the current time and the competition's date fields, on every read. I
deliberately avoided a cron job that flips a `status` field on a schedule —
that approach always has a window where the stored status is stale relative
to the actual clock, and it doesn't scale cleanly (you're now coordinating a
background job with live traffic). Deriving it at read-time means the API
is never wrong, at the cost of a few date comparisons per request, which is
negligible. `adminStatus` (DRAFT/PUBLISHED/CANCELLED) is the only part that
*is* stored, because those states genuinely can't be derived from dates.

**The join/leave endpoints are the concurrency-critical path.** A denormalized
`currentParticipantsCount` on the Competition document is updated with an
atomic conditional `$inc` (`$expr: currentParticipantsCount < maxParticipants`)
inside a MongoDB transaction, paired with a `Participation` insert protected
by a **partial unique index** on `{competitionId, userId, status: REGISTERED}`.
That combination means:
- Two simultaneous requests for the last open spot can't both succeed — the
  conditional `$inc` is atomic per-document at the MongoDB level, so the
  "check remaining spots, then decide to write" race is impossible.
- A user can't double-register even from two rapid taps/devices — the unique
  index rejects the second insert with `E11000`, and the transaction rolls
  back the counter increment along with it, so counts never drift.
- I used a *partial* unique index (only enforced on `status: REGISTERED`)
  rather than a hard unique index on the pair, so a user can leave and later
  rejoin without hitting a stale duplicate-key error, while still keeping a
  full audit trail of past withdrawals.

**Read/write paths are optimized differently.** The details GET is the
highest-traffic endpoint (every user viewing the screen), so it's just two
indexed point-reads with no aggregation and no locks — `currentParticipantsCount`
is read directly off the document rather than counted live from
`Participation`. The join/leave paths are comparatively low-traffic and can
afford the extra cost of a transaction.

**The mobile screen contains no business logic.** The API returns a fully
resolved view model — `status`, `spots.isFull`, `viewer.action.{action,label,enabled}`,
and a `countdown.{label,target}` telling the client exactly what to show and
count down to. The screen just renders it. This was a deliberate choice so
that adding a new state (e.g. a "waitlist" status) only requires a backend
change, not a synchronized frontend + backend update — important for a
system meant to serve many client versions in production.

**Optimistic UI was intentionally avoided for join/leave.** Since spots and
status are actively contested by other concurrent users, I re-fetch the full
details view after every join/leave (success *or* failure) rather than
mutating local state — trusting only the server's post-action truth avoids
the UI showing a state ("Joined!") that a moment later turns out to be wrong
because someone else took the last spot first.

---

## 5. Assumptions

- Auth is a minimal email/password + JWT implementation, purely so the
  screen has something to authenticate the "viewer" with. A real system
  would delegate to a proper identity provider; the competition backend
  should only ever need a verified `userId`.
- Payment for paid competitions (`entryFee > 0`) is modeled as a
  `paymentStatus` field on `Participation` (`PENDING → PAID`), but actual
  payment processing (Razorpay/Stripe webhook, etc.) is out of scope —
  flagged as a clear "would add in production" item below.
- A "spot" is released back to the pool on withdrawal only while
  registration is still open; withdrawing after the competition starts is
  not supported, matching how most real competitions behave (you can't get
  a mid-event slot back into rotation).
- Scoring/leaderboard mechanics (how `score` gets set) are outside this
  assignment's scope — the leaderboard endpoint and schema exist and are
  paginated/indexed, but nothing computes a live score.
- Single currency/timezone-naive dates (stored as UTC `Date`s, formatted
  client-side) — sufficient for this assignment, would need explicit
  timezone handling for a global product.

## 6. Trade-offs considered

- **Denormalized counter vs. live count:** considered always computing
  `currentParticipantsCount` via `Participation.countDocuments()` for
  simplicity/no-drift-risk, but rejected it — that turns the highest-traffic
  read endpoint into a collection scan-adjacent query under load. The
  denormalized counter is the standard trade for a read-heavy feature like
  this, and the transaction guarantees it can't drift from reality.
- **Transactions vs. a distributed lock / queue:** a message-queue-based
  "reservation" system (e.g. enqueue join requests, process serially) would
  also solve the race, but adds real operational complexity and latency for
  what a same-document atomic conditional update already solves correctly.
  Transactions were the right-sized tool here.
- **Derived status vs. stored + cron:** covered above — chose correctness
  over the (very small) computational convenience of a stored field.
- **Polling vs. WebSockets/SSE for live spot updates:** the mobile hook
  polls every 30s (paused when backgrounded) rather than opening a
  socket. For "thousands of concurrent users" and a details screen that
  isn't hyper-real-time-critical, polling is simpler to run at scale and
  cache in front of; I'd revisit this if the product needed sub-second
  spot-count accuracy (see below).

## 7. What I'd change for a real production build

- Replace the demo JWT auth with the organization's actual identity
  provider and add refresh-token handling.
- Add a proper payment integration with webhook-verified `PAID` transitions
  and a refund flow tied to `WITHDRAWN`.
- Move from polling to a push mechanism (WebSocket/SSE, or a lightweight
  pub/sub like Redis + Socket.io) for spot-count/status changes on
  high-demand competitions, so users see "Full" the instant it happens
  instead of up to 30s later.
- Add Redis caching in front of `GET /competitions/:id` (short TTL, e.g.
  2–5s) — at real "thousands of concurrent users" scale this endpoint would
  otherwise dominate MongoDB read capacity; cache invalidation on
  join/leave/admin-update would keep it consistent.
- Add structured logging/metrics (join success/failure rates, time-in-queue
  for the last-spot race) and integration tests specifically simulating
  concurrent joins against the last remaining spot.
- Build out the surrounding screens (competitions list, my-registrations,
  results/leaderboard detail) and wire real React Navigation instead of the
  standalone `App.js` demo harness used here.
- Add image upload/CDN handling for banner images instead of static URLs.

---

## 8. Pushing this to GitHub

This zip is a plain folder, not yet a git repo. To submit it as required:

```bash
cd feedants-competition
git init
git add .
git commit -m "Feedants competition details: full-stack implementation"
git branch -M main
git remote add origin https://github.com/<your-username>/feedants-competition.git
git push -u origin main
```

A `.gitignore` is already included (excludes `node_modules/`, `.env`, `.expo/`).

