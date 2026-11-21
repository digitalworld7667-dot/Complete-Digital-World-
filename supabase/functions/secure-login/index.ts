// Secure login proxy: account lock after 5 wrong passwords for 24 hours,
// plus per-IP throttling. Never expose the service-role key to the browser.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value), digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, anonKey = Deno.env.get('SUPABASE_ANON_KEY')!, serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!url || !anonKey || !serviceKey) return json({ error: 'Server auth configuration missing.' }, 500);
  let body: { email?: string; password?: string; captchaToken?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const email = String(body.email || '').trim().toLowerCase(), password = String(body.password || '');
  if (!email || !password || !body.captchaToken || email.length > 320 || password.length > 1024) return json({ error: 'Email, password aur CAPTCHA complete karein.' }, 400);
  const accountHash = await sha256(`cdw-account:${email}`), forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || forwarded || 'unknown', ipHash = await sha256(`cdw-ip:${ip}`);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [accountState, ipState] = await Promise.all([
    admin.from('login_account_security').select('failed_attempts,locked_until').eq('identity_hash', accountHash).maybeSingle(),
    admin.from('login_ip_security').select('failed_attempts,locked_until').eq('ip_hash', ipHash).maybeSingle()
  ]);
  if (accountState.error || ipState.error) return json({ error: 'Login security check failed. Please try again later.' }, 503);
  const now = Date.now(), accountLock = accountState.data?.locked_until ? Date.parse(accountState.data.locked_until) : 0, ipLock = ipState.data?.locked_until ? Date.parse(ipState.data.locked_until) : 0;
  if (accountLock > now) return json({ error: 'Too many incorrect attempts. This account is blocked for 24 hours.', lockedUntil: accountState.data!.locked_until }, 423);
  if (ipLock > now) return json({ error: 'Too many login attempts from this network. Please try again later.', lockedUntil: ipState.data!.locked_until }, 429);
  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.signInWithPassword({ email, password, options: { captchaToken: body.captchaToken } });
  if (error || !data.session || !data.user) {
    const { data: result, error: recordError } = await admin.rpc('record_login_failure', { p_identity_hash: accountHash, p_ip_hash: ipHash });
    if (recordError) return json({ error: 'Login failed and security counter could not be updated. Try again later.' }, 503);
    if (result?.account_locked_until) {
      for (let page = 1; page <= 100; page++) {
        const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (listError || !usersPage?.users?.length) break;
        const match = usersPage.users.find((u) => String(u.email || '').toLowerCase() === email);
        if (match) { await admin.auth.admin.updateUserById(match.id, { ban_duration: '24h' }); break; }
        if (usersPage.users.length < 1000) break;
      }
      return json({ error: '5 incorrect password attempts. This account is now blocked for 24 hours.', lockedUntil: result.account_locked_until }, 423);
    }
    if (result?.ip_locked_until) return json({ error: 'Too many login attempts from this network. Please try again later.' }, 429);
    return json({ error: 'Email ya password galat hai. Bache hue attempts: ' + Math.max(0, 5 - Number(result?.account_attempts || 0)) }, 401);
  }
  const { data: profileState, error: profileStateError } = await admin.from('profiles').select('account_status').eq('id', data.user.id).maybeSingle();
  if (profileStateError) return json({ error: 'Account status could not be verified. Please contact your school administrator.' }, 503);
  if (!profileState || profileState.account_status !== 'active') {
    await admin.auth.admin.updateUserById(data.user.id, { ban_duration: '876000h' });
    return json({ error: 'This account is not active. Please contact your school administrator.' }, 403);
  }
  await admin.from('login_account_security').delete().eq('identity_hash', accountHash);
  return json({ session: data.session, user: data.user });
});