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
import { Wallpaper } from './components/Wallpaper';
import { useSpecularLight } from './lib/useSpecularLight';

function App() {
  const { session, loading } = useAuth();
  useSpecularLight();

  if (loading) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
        <Wallpaper />
        Chargement…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-shell">
        <Wallpaper />
        <LoginScreen />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Wallpaper />
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/sport" element={<SportScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/challenges/new" element={<NewChallengeScreen />} />
        <Route path="/chat" element={<ChatScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <TabBar />
    </div>
  );
}

export default App;
