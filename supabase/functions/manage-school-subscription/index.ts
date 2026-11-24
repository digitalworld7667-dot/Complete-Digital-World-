import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\\s+/i, '');
  if (!url || !anon || !service || !jwt) return reply({ error: 'Valid session and server configuration required.' }, 401);
  const callerClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
  if (authError || !caller) return reply({ error: 'Valid login required.' }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await admin.from('profiles').select('id,role,account_status').eq('id', caller.id).single();
  if (actorError || !actor || actor.role !== 'super_admin' || actor.account_status !== 'active') return reply({ error: 'Only an active Super Admin can verify subscription payments.' }, 403);
  let body: any; try { body = await req.json(); } catch { return reply({ error: 'Invalid JSON.' }, 400); }
  const paymentId = String(body.payment_id || ''), decision = String(body.action || ''), note = String(body.note || '').slice(0, 1000);
  if (!paymentId || !['verify','reject'].includes(decision)) return reply({ error: 'payment_id and verify/reject action are required.' }, 400);
  const { data, error } = await admin.rpc('review_school_subscription_payment', {
    p_payment_id: paymentId, p_decision: decision, p_reviewer_id: caller.id, p_note: note
  });
  if (error) return reply({ error: error.message || 'Could not process subscription payment.' }, 400);
  return reply(data);
});