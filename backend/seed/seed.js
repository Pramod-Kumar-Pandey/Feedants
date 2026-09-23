require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/db');
const Competition = require('../src/models/Competition');
const Participation = require('../src/models/Participation');
const User = require('../src/models/User');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function run() {
  await connectDB();

  await Promise.all([
    Competition.deleteMany({}),
    Participation.deleteMany({}),
    User.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('password123', 10);
  const demoUser = await User.create({
    name: 'Demo User',
    email: 'demo@feedants.app',
    passwordHash,
  });
  const otherUsers = await User.insertMany(
    Array.from({ length: 18 }, (_, i) => ({
      name: `Filler User ${i + 1}`,
      email: `filler${i + 1}@feedants.app`,
      passwordHash,
    }))
  );

  const now = Date.now();

  const competitions = await Competition.insertMany([
    {
      title: '30-Day Step Challenge',
      slug: '30-day-step-challenge',
      shortDescription: 'Walk your way to the top of the leaderboard.',
      description:
        'Track your daily steps for 30 days. The top 10 participants split the prize pool. Open to all fitness levels.',
      rules: [
        'Steps must be tracked via the Feedants app or a synced wearable.',
        'Manual step entries are capped at 20,000/day.',
        'Winners are verified before payout.',
      ],
      category: 'Fitness',
      bannerImageUrl: 'https://picsum.photos/seed/steps-banner/1200/600',
      thumbnailImageUrl: 'https://picsum.photos/seed/steps-thumb/400/400',
      entryFee: 0,
      prizePool: 10000,
      prizeTiers: [
        { rank: 1, amount: 5000, label: '1st Place' },
        { rank: 2, amount: 3000, label: '2nd Place' },
        { rank: 3, amount: 2000, label: '3rd Place' },
      ],
      maxParticipants: 500,
      currentParticipantsCount: 0,
      registrationOpensAt: new Date(now - 1 * DAY), // open now
      registrationClosesAt: new Date(now + 5 * DAY),
      startDate: new Date(now + 6 * DAY),
      endDate: new Date(now + 36 * DAY),
      adminStatus: 'PUBLISHED',
      organizer: { name: 'Feedants', logoUrl: 'https://picsum.photos/seed/feedants-logo/100/100' },
      createdBy: demoUser._id,
    },
    {
      title: 'Protein Recipe Showdown',
      slug: 'protein-recipe-showdown',
      shortDescription: 'Submit your best high-protein recipe.',
      description: 'A near-full competition to demo the "almost full" and full states.',
      rules: ['One submission per participant.', 'Judged by community votes.'],
      category: 'Nutrition',
      bannerImageUrl: 'https://picsum.photos/seed/recipe-banner/1200/600',
      thumbnailImageUrl: 'https://picsum.photos/seed/recipe-thumb/400/400',
      entryFee: 49,
      prizePool: 5000,
      prizeTiers: [{ rank: 1, amount: 5000, label: 'Winner' }],
      maxParticipants: 20,
      currentParticipantsCount: 18, // demoes "spots almost gone"
      registrationOpensAt: new Date(now - 2 * DAY),
      registrationClosesAt: new Date(now + 2 * DAY),
      startDate: new Date(now + 3 * DAY),
      endDate: new Date(now + 10 * DAY),
      adminStatus: 'PUBLISHED',
      organizer: { name: 'Feedants', logoUrl: 'https://picsum.photos/seed/feedants-logo/100/100' },
      createdBy: demoUser._id,
    },
    {
      title: 'Marathon Prep Sprint (FULL)',
      slug: 'marathon-prep-sprint',
      shortDescription: 'A fully-booked competition, demoing the FULL state.',
      description: 'Demonstrates the "Competition Full" CTA state.',
      rules: ['Log a minimum of 3 runs per week.'],
      category: 'Fitness',
      bannerImageUrl: 'https://picsum.photos/seed/marathon-banner/1200/600',
      thumbnailImageUrl: 'https://picsum.photos/seed/marathon-thumb/400/400',
      entryFee: 0,
      prizePool: 2000,
      maxParticipants: 10,
      currentParticipantsCount: 10,
      registrationOpensAt: new Date(now - 3 * DAY),
      registrationClosesAt: new Date(now + 1 * DAY),
      startDate: new Date(now + 2 * DAY),
      endDate: new Date(now + 8 * DAY),
      adminStatus: 'PUBLISHED',
      organizer: { name: 'Feedants', logoUrl: 'https://picsum.photos/seed/feedants-logo/100/100' },
      createdBy: demoUser._id,
    },
    {
      title: 'Upcoming Hydration Challenge',
      slug: 'upcoming-hydration-challenge',
      shortDescription: 'Registration has not opened yet.',
      description: 'Demonstrates the UPCOMING state (registration opens in the future).',
      rules: ['Log 2.5L+ water intake daily.'],
      category: 'Wellness',
      bannerImageUrl: 'https://picsum.photos/seed/hydration-banner/1200/600',
      thumbnailImageUrl: 'https://picsum.photos/seed/hydration-thumb/400/400',
      entryFee: 0,
      prizePool: 1500,
      maxParticipants: 200,
      currentParticipantsCount: 0,
      registrationOpensAt: new Date(now + 3 * DAY),
      registrationClosesAt: new Date(now + 10 * DAY),
      startDate: new Date(now + 11 * DAY),
      endDate: new Date(now + 41 * DAY),
      adminStatus: 'PUBLISHED',
      organizer: { name: 'Feedants', logoUrl: 'https://picsum.photos/seed/feedants-logo/100/100' },
      createdBy: demoUser._id,
    },
    {
      title: 'Summer Fitness Sprint (ENDED)',
      slug: 'summer-fitness-sprint-ended',
      shortDescription: 'A finished competition, demoing the ENDED / results state.',
      description: 'Demonstrates the ENDED state and "View Results" CTA.',
      rules: ['Completed.'],
      category: 'Fitness',
      bannerImageUrl: 'https://picsum.photos/seed/summer-banner/1200/600',
      thumbnailImageUrl: 'https://picsum.photos/seed/summer-thumb/400/400',
      entryFee: 0,
      prizePool: 8000,
      maxParticipants: 100,
      currentParticipantsCount: 76,
      registrationOpensAt: new Date(now - 40 * DAY),
      registrationClosesAt: new Date(now - 35 * DAY),
      startDate: new Date(now - 34 * DAY),
      endDate: new Date(now - 2 * DAY),
      adminStatus: 'PUBLISHED',
      organizer: { name: 'Feedants', logoUrl: 'https://picsum.photos/seed/feedants-logo/100/100' },
      createdBy: demoUser._id,
    },
  ]);

  // Register the demo user + a handful of filler users into competition[1]
  // (Protein Recipe Showdown) so the app has a real leaderboard to render.
  const target = competitions[1];
  await Participation.insertMany(
    otherUsers.slice(0, 17).map((u, i) => ({
      competitionId: target._id,
      userId: u._id,
      status: 'REGISTERED',
      paymentStatus: 'PAID',
      score: Math.floor(Math.random() * 1000),
    }))
  );

  console.log('Seed complete.');
  console.log('Demo login: demo@feedants.app / password123');
  console.log('Competition IDs:');
  competitions.forEach((c) => console.log(`  ${c.title}: ${c._id}`));

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
