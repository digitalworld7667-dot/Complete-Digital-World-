import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!url || !anon || !service || !jwt) return reply({ error: 'Valid session and server configuration required.' }, 401);
  const callerClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
  if (authError || !caller) return reply({ error: 'Valid login required.' }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await admin.from('profiles').select('id,role,school_id,account_status').eq('id', caller.id).single();
  if (actorError || !actor || !['super_admin','school_admin'].includes(actor.role) || actor.account_status !== 'active') return reply({ error: 'Active administrator access required.' }, 403);
  let body: any; try { body = await req.json(); } catch { return reply({ error: 'Invalid JSON.' }, 400); }
  const action = String(body.action || '');
  if (action === 'select_plan') {
    if (actor.role !== 'school_admin') return reply({ error: 'Only School Admin can select its school plan.' }, 403);
    const plan = String(body.plan || ''), schoolId = String(body.school_id || '');
    if (!['basic','advanced','premium'].includes(plan) || !schoolId || schoolId !== actor.school_id) return reply({ error: 'Valid plan and own school are required.' }, 400);
    const { data, error } = await admin.rpc('school_select_subscription_plan', { p_school_id: schoolId, p_actor_id: caller.id, p_plan: plan });
    if (error) return reply({ error: error.message || 'Could not select subscription plan.' }, 400);
    return reply(data);
  }
  if (action === 'set_plan') {
    if (actor.role !== 'super_admin') return reply({ error: 'Only Super Admin can manage school plans and discounts.' }, 403);
    const schoolId = String(body.school_id || ''), plan = String(body.plan || '');
    const discountType = body.discount_type ? String(body.discount_type) : null;
    const discountValue = Number(body.discount_value || 0);
    const customPrice = body.custom_price_per_student === null || body.custom_price_per_student === undefined || body.custom_price_per_student === '' ? null : Number(body.custom_price_per_student);
    if (!schoolId || !['basic','advanced','premium'].includes(plan) || !Number.isFinite(discountValue) || (customPrice !== null && !Number.isFinite(customPrice))) return reply({ error: 'Valid school, plan and price values are required.' }, 400);
    const { data, error } = await admin.rpc('super_admin_manage_subscription', {
      p_actor_id: caller.id, p_school_id: schoolId, p_plan: plan, p_discount_type: discountType,
      p_discount_value: discountValue, p_offer_label: String(body.offer_label || '').slice(0,120),
      p_custom_price_per_student: customPrice
    });
    if (error) return reply({ error: error.message || 'Could not update school subscription.' }, 400);
    return reply(data);
  }
  const paymentId = String(body.payment_id || ''), decision = String(body.action || ''), note = String(body.note || '').slice(0, 1000);
  if (!paymentId || !['verify','reject'].includes(decision)) return reply({ error: 'payment_id and verify/reject action are required.' }, 400);
  const { data, error } = await admin.rpc('review_school_subscription_payment', {
    p_payment_id: paymentId, p_decision: decision, p_reviewer_id: caller.id, p_note: note
  });
  if (error) return reply({ error: error.message || 'Could not process subscription payment.' }, 400);
  return reply(data);
});