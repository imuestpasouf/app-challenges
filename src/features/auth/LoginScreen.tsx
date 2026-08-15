import { useState, type SubmitEvent } from 'react';
import { useAuth } from '../../app/useAuth';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
  }

  return (
    <div className="page-enter" style={{ position: 'relative', zIndex: 10, display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div className="glass gcard" style={{ width: '100%', maxWidth: 360 }}>
        <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--label-2)', fontWeight: 600 }}>
          Challenges & Vie Partagée
        </p>
        <h1 style={{ marginTop: 8, fontSize: 24, fontWeight: 800 }}>Connexion</h1>

        <form onSubmit={handleSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            id="password"
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="note" style={{ color: 'var(--red)', textAlign: 'left' }}>
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} loadingText="Connexion…" className="mt-2">
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  );
}
