import { Route, Routes } from 'react-router-dom';
import { useAuth } from './app/useAuth';
import { LoginScreen } from './features/auth/LoginScreen';
import { HomeScreen } from './features/home/HomeScreen';
import { SportScreen } from './features/sport/SportScreen';
import { HistoryScreen } from './features/history/HistoryScreen';
import { NewChallengeScreen } from './features/challenges/NewChallengeScreen';
import { ChatScreen } from './features/chat/ChatScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { TabBar } from './components/TabBar';

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-muted">Chargement…</div>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="flex-1 pb-6">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/sport" element={<SportScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/challenges/new" element={<NewChallengeScreen />} />
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </div>
      <TabBar />
    </div>
  );
}

export default App;
