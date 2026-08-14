import { useAuth } from './app/useAuth';
import { LoginScreen } from './features/auth/LoginScreen';

function App() {
  const { session, loading, signOut } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-muted">Chargement…</div>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
      <p className="font-heading text-xl text-ink">Connecté ✓</p>
      <button onClick={signOut} className="font-mono text-sm text-brand underline">
        Se déconnecter
      </button>
    </div>
  );
}

export default App;
