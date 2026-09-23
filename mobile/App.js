import React from 'react';
import { StatusBar } from 'expo-status-bar';
import CompetitionDetailsScreen from './src/screens/CompetitionDetailsScreen';

/**
 * Minimal standalone entry point for local preview/demo purposes.
 * In the full app this screen would be registered inside a React
 * Navigation stack (see README) and receive `competitionId` via
 * route.params. Here we hardcode a seeded competition id placeholder —
 * replace with a real id printed by `npm run seed` in the backend.
 */
const DEMO_COMPETITION_ID = 'REPLACE_WITH_SEEDED_COMPETITION_ID';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <CompetitionDetailsScreen
        route={{ params: { competitionId: DEMO_COMPETITION_ID } }}
        navigation={{ navigate: () => {} }}
      />
    </>
  );
}
