import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/useAuth';
import { getOrCreateMyPrefs, updateMyPrefs } from '../../api/notificationPrefs';
import { disablePush, enablePush, getPushSubscriptionEndpoint, isPushSupported } from '../../lib/push';
import { Button } from '../../components/Button';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="toggle-row">
      <span style={{ fontSize: 14 }}>{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`toggle${checked ? ' on' : ''}`}>
        <span className="knob" />
      </button>
    </div>
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
    <section className="page-enter screen">
      <div className="ltitle">
        <div className="k">Réglages</div>
        <h1 style={{ fontSize: 24 }}>Notifications</h1>
      </div>

      <div className="glass gcard">
        {permission === 'unsupported' && <p className="note" style={{ textAlign: 'left' }}>Push non supporté sur cet appareil/navigateur.</p>}
        {permission === 'denied' && (
          <p className="note" style={{ textAlign: 'left', color: 'var(--red)' }}>
            Permission refusée au niveau du système. Va dans Réglages iOS → l'app → Notifications pour l'autoriser.
          </p>
        )}
        {(permission === 'default' || permission === 'granted') && (
          <>
            <p className="note" style={{ textAlign: 'left' }}>
              {subscribed
                ? 'Les notifications sont activées sur cet appareil.'
                : "Active les notifications pour être prévenu des messages, mises à jour partagées et paliers validés."}
            </p>
            {error && (
              <p className="note" style={{ textAlign: 'left', color: 'var(--red)', marginTop: 8 }}>
                {error}
              </p>
            )}
            {subscribed ? (
              <button
                type="button"
                onClick={() => disableMutation.mutate()}
                disabled={disableMutation.isPending}
                style={{
                  marginTop: 12,
                  width: '100%',
                  borderRadius: 18,
                  padding: 13,
                  fontWeight: 700,
                  border: '0.5px solid rgba(255,255,255,.7)',
                  background: 'rgba(255,255,255,.4)',
                  color: 'var(--label)',
                  opacity: disableMutation.isPending ? 0.6 : 1,
                }}
              >
                {disableMutation.isPending ? 'Désactivation…' : 'Désactiver les notifications'}
              </button>
            ) : (
              <Button type="button" onClick={() => enableMutation.mutate()} loading={enableMutation.isPending} loadingText="Activation…" className="mt-3">
                Activer les notifications
              </Button>
            )}
          </>
        )}
      </div>

      {prefs && (
        <div className="glass gcard" style={{ marginTop: 14 }}>
          <Toggle checked={prefs.chat} onChange={(v) => updateMutation.mutate({ chat: v })} label="Nouveaux messages" />
          <Toggle checked={prefs.sharedUpdates} onChange={(v) => updateMutation.mutate({ sharedUpdates: v })} label="Planning / courses / dépenses" />
          <Toggle checked={prefs.milestones} onChange={(v) => updateMutation.mutate({ milestones: v })} label="Paliers validés" />
          <Toggle checked={prefs.dailyReminder} onChange={(v) => updateMutation.mutate({ dailyReminder: v })} label="Rappel de saisie quotidien" />
          {prefs.dailyReminder && (
            <div className="toggle-row">
              <span style={{ fontSize: 14 }}>Heure du rappel</span>
              <input
                type="time"
                value={prefs.reminderTime}
                onChange={(e) => updateMutation.mutate({ reminderTime: e.target.value })}
                className="plain-input"
                style={{ width: 100 }}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
