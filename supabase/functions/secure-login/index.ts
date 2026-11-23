import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!url || !anonKey || !serviceKey) return json({ error: 'Server auth configuration missing.' }, 500);

  let body: { email?: string; login_id?: string; password?: string; captchaToken?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const identifier = String(body.login_id || body.email || '').trim();
  const password = String(body.password || '');
  const captchaToken = String(body.captchaToken || '');
  if (!identifier || identifier.length > 320 || !password || password.length > 1024) {
    return json({ error: 'Login ID/email aur password enter karein.' }, 400);
  }
  if (!captchaToken) return json({ error: 'Please complete CAPTCHA verification.' }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let email = identifier.toLowerCase();
  if (!identifier.includes('@')) {
    if (!/^MSD-(STD|TCH|PAR|DRV|ADM)-[0-9]{4,10}$/i.test(identifier)) {
      return json({ error: 'Login ID ya password galat hai.' }, 401);
    }
    const { data: profile, error: lookupError } = await admin
      .from('profiles').select('id,account_status').eq('login_id', identifier.toUpperCase()).maybeSingle();
    if (lookupError || !profile) return json({ error: 'Login ID ya password galat hai.' }, 401);
    if (profile.account_status !== 'active') return json({ error: 'This account is not active. Please contact your school administrator.' }, 403);
    const { data: authData, error: authLookupError } = await admin.auth.admin.getUserById(profile.id);
    if (authLookupError || !authData.user?.email) return json({ error: 'Login ID ya password galat hai.' }, 401);
    email = authData.user.email.toLowerCase();
  }

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.signInWithPassword({
    email, password, options: { captchaToken }
  });
  if (error || !data.session || !data.user) return json({ error: 'Login ID/email ya password galat hai.' }, 401);

  const { data: profileState, error: profileStateError } = await admin.from('profiles')
    .select('account_status').eq('id', data.user.id).maybeSingle();
  if (profileStateError) return json({ error: 'Account status could not be verified. Please contact your school administrator.' }, 503);
  if (!profileState || profileState.account_status !== 'active') {
    await admin.auth.admin.updateUserById(data.user.id, { ban_duration: '876000h' });
    return json({ error: 'This account is not active. Please contact your school administrator.' }, 403);
  }
  return json({ session: data.session, user: data.user });
});
