import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

type NotificationKind = 'chat' | 'shared' | 'milestone' | 'reminder';

const PREF_COLUMN: Record<NotificationKind, string> = {
  chat: 'chat',
  shared: 'shared_updates',
  milestone: 'milestones',
  reminder: 'daily_reminder',
};

interface SendPushRequest {
  toUserId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  url?: string;
}

Deno.serve(async (req) => {
  const { toUserId, kind, title, body, url }: SendPushRequest = await req.json();

  const { data: prefs } = await supabase.from('notification_prefs').select('*').eq('user_id', toUserId).maybeSingle();
  const prefColumn = PREF_COLUMN[kind];
  if (prefs && prefColumn && prefs[prefColumn] === false) {
    return new Response('skipped', { status: 200 });
  }

  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', toUserId);

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify({ title, body, url: url ?? '/', tag: kind }));
      } catch (e) {
        const statusCode = (e as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }
    })
  );

  return new Response('ok', { status: 200 });
});
