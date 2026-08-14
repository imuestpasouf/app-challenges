import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/useAuth';
import { getOrCreateMyPrefs, updateMyPrefs } from '../../api/notificationPrefs';
import { disablePush, enablePush, getPushSubscriptionEndpoint, isPushSupported } from '../../lib/push';
import { Button } from '../../components/Button';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 py-3">
      <span className="text-sm text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-line-2'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </button>
    </label>
  );
}

export function SettingsScreen() {
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const prefsQuery = useQuery({ queryKey: ['notification-prefs'], queryFn: getOrCreateMyPrefs });
  const prefs = prefsQuery.data;

  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    isPushSupported() ? Notification.permission : 'unsupported'
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    void getPushSubscriptionEndpoint().then((endpoint) => setSubscribed(!!endpoint));
  }, []);

  const updateMutation = useMutation({
    mutationFn: updateMyPrefs,
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['notification-prefs'] });
      const previous = queryClient.getQueryData(['notification-prefs']);
      queryClient.setQueryData(['notification-prefs'], (old: typeof prefs) => (old ? { ...old, ...patch } : old));
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(['notification-prefs'], context.previous);
    },
  });

  const enableMutation = useMutation({
    mutationFn: async () => {
      if (!myId) throw new Error('Not authenticated');
      if (!VAPID_PUBLIC_KEY) throw new Error('VITE_VAPID_PUBLIC_KEY manquante');
      await enablePush(myId, VAPID_PUBLIC_KEY);
    },
    onSuccess: () => {
      setSubscribed(true);
      setPermission(Notification.permission);
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'),
  });

  const disableMutation = useMutation({
    mutationFn: disablePush,
    onSuccess: () => setSubscribed(false),
  });

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-6">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">Réglages</p>
      <h1 className="mt-1 font-heading text-2xl font-extrabold text-ink">Notifications</h1>

      <div className="mt-5 rounded-3xl border border-line bg-card p-4 shadow-sm">
        {permission === 'unsupported' && (
          <p className="text-sm text-muted">Push non supporté sur cet appareil/navigateur.</p>
        )}
        {permission === 'denied' && (
          <p className="text-sm text-red">
            Permission refusée au niveau du système. Va dans Réglages iOS → l'app → Notifications pour l'autoriser.
          </p>
        )}
        {(permission === 'default' || permission === 'granted') && (
          <>
            <p className="text-sm text-muted">
              {subscribed
                ? 'Les notifications sont activées sur cet appareil.'
                : "Active les notifications pour être prévenu des messages, mises à jour partagées et paliers validés."}
            </p>
            {error && <p className="mt-2 rounded-xl bg-red-bg px-3 py-2 text-sm text-red">{error}</p>}
            {subscribed ? (
              <button
                type="button"
                onClick={() => disableMutation.mutate()}
                disabled={disableMutation.isPending}
                className="mt-3 w-full rounded-2xl border border-line bg-bg px-5 py-3.5 font-heading font-bold text-ink transition-opacity disabled:opacity-60"
              >
                {disableMutation.isPending ? 'Désactivation…' : 'Désactiver les notifications'}
              </button>
            ) : (
              <Button
                type="button"
                onClick={() => enableMutation.mutate()}
                loading={enableMutation.isPending}
                loadingText="Activation…"
                className="mt-3"
              >
                Activer les notifications
              </Button>
            )}
          </>
        )}
      </div>

      {prefs && (
        <div className="mt-4 divide-y divide-line-2 rounded-3xl border border-line bg-card px-4 shadow-sm">
          <Toggle checked={prefs.chat} onChange={(v) => updateMutation.mutate({ chat: v })} label="Nouveaux messages" />
          <Toggle
            checked={prefs.sharedUpdates}
            onChange={(v) => updateMutation.mutate({ sharedUpdates: v })}
            label="Planning / courses / dépenses"
          />
          <Toggle
            checked={prefs.milestones}
            onChange={(v) => updateMutation.mutate({ milestones: v })}
            label="Paliers validés"
          />
          <Toggle
            checked={prefs.dailyReminder}
            onChange={(v) => updateMutation.mutate({ dailyReminder: v })}
            label="Rappel de saisie quotidien"
          />
          {prefs.dailyReminder && (
            <label className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm text-ink">Heure du rappel</span>
              <input
                type="time"
                value={prefs.reminderTime}
                onChange={(e) => updateMutation.mutate({ reminderTime: e.target.value })}
                className="rounded-lg border border-line bg-bg px-2 py-1 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
