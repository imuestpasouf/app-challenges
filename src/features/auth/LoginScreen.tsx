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
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-card">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Challenges & Vie Partagée</p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Connexion</h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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
            <p className="rounded-xl bg-red-bg px-3 py-2 text-sm text-red">{error}</p>
          )}

          <Button type="submit" loading={loading} loadingText="Connexion…" className="mt-2">
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  );
}
