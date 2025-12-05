import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import TournamentsPage from './pages/TournamentsPage';
import CreateTournamentPage from './pages/CreateTournamentPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import EditTournamentPage from './pages/EditTournamentPage';
import StatisticsPage from './pages/StatisticsPage';
import GamesPage from './pages/GamesPage';
import FieldsPage from './pages/FieldsPage';
import AdminPage from './pages/AdminPage';
import SupportTicketsPage from './pages/SupportTicketsPage';
import RegistrationsPage from './pages/RegistrationsPage';
import LeaderboardsPage from './pages/LeaderboardsPage';
import GameLeaderboardPage from './pages/GameLeaderboardPage';
import ContentsPage from './pages/ContentsPage';
import BracketPage from './pages/BracketPage';
import FullScreenBracketPage from './pages/FullScreenBracketPage';
import SwissBracketPage from './pages/SwissBracketPage';
import RRBracketPage from './pages/RRBracketPage';
import BracketsPage from './pages/BracketsPage';
import BattleRoyaleMatchEntryPage from './pages/BattleRoyaleMatchEntryPage';
import ReportsPage from './pages/ReportsPage';
import PublicReportPage from './pages/PublicReportPage';
import GamificationPortalPage from './pages/GamificationPortalPage';
import QuestsManagementPage from './pages/QuestsManagementPage';
import BattlePassManagementPage from './pages/BattlePassManagementPage';
import BattlePassTiersPage from './pages/BattlePassTiersPage';
import RewardsLibraryPage from './pages/RewardsLibraryPage';
import AchievementsManagementPage from './pages/AchievementsManagementPage';
import XPLevelsPage from './pages/XPLevelsPage';
import ShopManagementPage from './pages/ShopManagementPage';
import UserProgressPage from './pages/UserProgressPage';
import XPEventsPage from './pages/XPEventsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CountryConfigurationPage from './pages/admin/CountryConfigurationPage';
import ProjectConfigurationsPage from './pages/admin/ProjectConfigurationsPage';
import { JulPage } from './pages/admin/JulPage';

function App() {
  const { user, checkSession, isLoading } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Protected route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-text)',
                border: '1px solid var(--toast-border)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: 'var(--toast-text)',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: 'var(--toast-text)',
                },
              },
            }}
          />
          <Routes>
          <Route
            key="login-route"
            path="/login"
            element={<LoginPage />}
          />

          <Route
            key="public-report"
            path="/report/:token"
            element={<PublicReportPage />}
          />

          <Route
            key="protected-layout"
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route 
              key="tournaments-index"
              index 
              element={<TournamentsPage />} 
            />
            <Route 
              key="tournaments-new"
              path="tournaments/new" 
              element={<CreateTournamentPage />} 
            />
            <Route 
              key="tournament-detail"
              path="tournaments/:id" 
              element={<TournamentDetailPage />} 
            />
            <Route 
              key="tournament-edit"
              path="tournaments/edit/:id" 
              element={<EditTournamentPage />} 
            />
            <Route 
              key="registrations-page"
              path="registrations" 
              element={<RegistrationsPage />} 
            />
            <Route 
              key="brackets-page"
              path="brackets" 
              element={<BracketsPage />} 
            />
            <Route
              key="single-elimination-bracket"
              path="tournaments/:id/bracket"
              element={<BracketPage />}
            />
            <Route
              key="full-screen-bracket"
              path="tournaments/:id/bracket/fullscreen"
              element={<FullScreenBracketPage />}
            />
            <Route
              key="swiss-bracket"
              path="tournaments/:id/swiss-bracket"
              element={<SwissBracketPage />}
            />
            <Route 
              key="round-robin-bracket"
              path="tournaments/:id/rr-bracket" 
              element={<RRBracketPage />} 
            />
            <Route 
              key="battle-royale-entry"
              path="tournaments/:id/br-entry" 
              element={<BattleRoyaleMatchEntryPage />} 
            />
            <Route
              key="statistics-page"
              path="statistics"
              element={<StatisticsPage />}
            />
            <Route
              key="reports-page"
              path="reports"
              element={<ReportsPage />}
            />
            <Route
              key="games-page"
              path="games"
              element={<GamesPage />}
            />
            <Route 
              key="fields-page"
              path="fields" 
              element={<FieldsPage />} 
            />
            <Route
              key="admin-page"
              path="admin"
              element={<AdminPage />}
            />
            <Route
              key="admin-countries"
              path="admin/countries"
              element={<CountryConfigurationPage />}
            />
            <Route
              key="admin-project-configs"
              path="admin/project-configurations"
              element={<ProjectConfigurationsPage />}
            />
            <Route
              key="admin-jul"
              path="admin/jul"
              element={<JulPage />}
            />
            <Route
              key="support-tickets-page"
              path="support-tickets"
              element={<SupportTicketsPage />}
            />
            <Route 
              key="leaderboards-index"
              path="leaderboards" 
              element={<LeaderboardsPage />} 
            />
            <Route 
              key="game-leaderboard"
              path="leaderboards/:gameId" 
              element={<GameLeaderboardPage />} 
            />
            <Route
              key="contents-page"
              path="contents"
              element={<ContentsPage />}
            />
            <Route
              key="gamification-portal"
              path="gamification"
              element={<GamificationPortalPage />}
            />
            <Route
              key="gamification-quests"
              path="gamification/quests"
              element={<QuestsManagementPage />}
            />
            <Route
              key="gamification-battle-pass"
              path="gamification/battle-pass"
              element={<BattlePassManagementPage />}
            />
            <Route
              key="gamification-battle-pass-tiers"
              path="gamification/battle-pass/:seasonId/tiers"
              element={<BattlePassTiersPage />}
            />
            <Route
              key="gamification-rewards"
              path="gamification/rewards"
              element={<RewardsLibraryPage />}
            />
            <Route
              key="gamification-achievements"
              path="gamification/achievements"
              element={<AchievementsManagementPage />}
            />
            <Route
              key="gamification-xp-levels"
              path="gamification/xp-levels"
              element={<XPLevelsPage />}
            />
            <Route
              key="gamification-shop"
              path="gamification/shop"
              element={<ShopManagementPage />}
            />
            <Route
              key="gamification-user-progress"
              path="gamification/user-progress"
              element={<UserProgressPage />}
            />
            <Route
              key="gamification-xp-events"
              path="gamification/xp-events"
              element={<XPEventsPage />}
            />
            <Route
              key="gamification-analytics"
              path="gamification/analytics"
              element={<AnalyticsPage />}
            />
          </Route>
        </Routes>
          </BrowserRouter>
        </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;