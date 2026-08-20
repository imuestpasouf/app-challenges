import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from './app/useAuth';
import { LoginScreen } from './features/auth/LoginScreen';
import { HomeScreen } from './features/home/HomeScreen';
import { SportScreen } from './features/sport/SportScreen';
import { HistoryScreen } from './features/history/HistoryScreen';
import { NewChallengeScreen } from './features/challenges/NewChallengeScreen';
import { ChatScreen } from './features/chat/ChatScreen';
import { ShoppingScreen } from './features/shopping/ShoppingScreen';
import { ReadingScreen } from './features/reading/ReadingScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { TabBar } from './components/TabBar';
import { Wallpaper } from './components/Wallpaper';
import { useSpecularLight } from './lib/useSpecularLight';
import { useIsResurrectionActive } from './features/resurrection/useResurrectionData';
import { RESURRECTION_ACTIVATED_EVENT } from './lib/resurrectionEvent';

function App() {
  const { session, loading } = useAuth();
  useSpecularLight();
  const isResurrectionActive = useIsResurrectionActive(!!session);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function onActivated() {
      if (reduceMotion) return;
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    }
    window.addEventListener(RESURRECTION_ACTIVATED_EVENT, onActivated);
    return () => window.removeEventListener(RESURRECTION_ACTIVATED_EVENT, onActivated);
  }, []);

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
    <div className={`app-shell${isResurrectionActive ? ' res' : ''}`}>
      <Wallpaper resurrectionActive={isResurrectionActive} />
      {flash && <div className="res-flash go" />}
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/sport" element={<SportScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/challenges/new" element={<NewChallengeScreen />} />
        <Route path="/chat" element={<ChatScreen />} />
        <Route path="/shopping" element={<ShoppingScreen />} />
        <Route path="/reading" element={<ReadingScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <TabBar />
    </div>
  );
}

export default App;
