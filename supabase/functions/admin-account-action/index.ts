import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, siteUrl = Deno.env.get('SITE_URL')!;
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!url || !anon || !service || !jwt) return reply({ error: 'Valid session and server configuration required.' }, 401);
  const callerClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
  if (authError || !caller) return reply({ error: 'Valid login required.' }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor } = await admin.from('profiles').select('id,role,school_id,account_status').eq('id', caller.id).single();
  if (!actor || !['super_admin','school_admin'].includes(actor.role) || actor.account_status !== 'active') return reply({ error: 'Active administrator access required.' }, 403);
  let body: any; try { body = await req.json(); } catch { return reply({ error: 'Invalid JSON.' }, 400); }
  const action = String(body.action || '');
  if (action === 'set_account_status') {
    const targetId = String(body.user_id || ''), status = String(body.status || '');
    if (!targetId || !['active','inactive'].includes(status)) return reply({ error: 'user_id and active/inactive status are required.' }, 400);
    if (targetId === caller.id) return reply({ error: 'You cannot deactivate or change your own account here.' }, 403);
    const { data: target, error: targetError } = await admin.from('profiles').select('id,role,school_id,account_status').eq('id', targetId).single();
    if (targetError || !target) return reply({ error: 'Account not found.' }, 404);
    if (target.role === 'super_admin') return reply({ error: 'Super Admin accounts cannot be changed here.' }, 403);
    if (actor.role === 'school_admin' && target.role === 'school_admin') return reply({ error: 'School Admin cannot change another School Admin account.' }, 403);
    if (actor.role === 'school_admin' && (!actor.school_id || target.school_id !== actor.school_id)) return reply({ error: 'You can manage only accounts in your own school.' }, 403);
    const { error: updateError } = await admin.from('profiles').update({ account_status: status }).eq('id', targetId);
    if (updateError) return reply({ error: updateError.message }, 400);
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(targetId, { ban_duration: status === 'inactive' ? '876000h' : 'none' });
    if (authUpdateError) {
      await admin.from('profiles').update({ account_status: target.account_status || 'active' }).eq('id', targetId);
      return reply({ error: 'Account status change was rolled back because Auth update failed: ' + authUpdateError.message }, 500);
    }
    await admin.from('activity_logs').insert({ school_id: target.school_id, actor_profile_id: caller.id, action: 'ACCOUNT_STATUS_CHANGED', entity_table: 'profiles', entity_id: targetId, new_data: { account_status: status, role: target.role } });
    return reply({ success: true, user_id: targetId, status });
  }
  if (action === 'send_password_reset') {
    const targetId = String(body.user_id || '');
    if (!targetId) return reply({ error: 'user_id is required.' }, 400);
    const { data: target, error: targetError } = await admin.auth.admin.getUserById(targetId);
    if (targetError || !target?.user?.email) return reply({ error: 'Account email not found.' }, 404);
    const { data: targetProfile } = await admin.from('profiles').select('role,school_id').eq('id', targetId).single();
    if (!targetProfile) return reply({ error: 'Account profile not found.' }, 404);
    if (targetProfile.role === 'super_admin' && actor.role !== 'super_admin') return reply({ error: 'Only Super Admin can reset a Super Admin account.' }, 403);
    if (actor.role === 'school_admin' && (!actor.school_id || targetProfile.school_id !== actor.school_id)) return reply({ error: 'You can manage only accounts in your own school.' }, 403);
    if (!siteUrl) return reply({ error: 'SITE_URL secret is not configured in Supabase.' }, 500);
    const publicClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await publicClient.auth.resetPasswordForEmail(target.user.email, { redirectTo: siteUrl });
    if (error) return reply({ error: error.message }, 400);
    await admin.from('activity_logs').insert({ school_id: targetProfile.school_id, actor_profile_id: caller.id, action: 'PASSWORD_RESET_EMAIL_SENT', entity_table: 'profiles', entity_id: targetId });
    return reply({ success: true, message: 'Password reset email requested.' });
  }
  if (action === 'delete_account') return reply({ error: 'Permanent account deletion is disabled to protect linked academic and financial records. Use set_account_status with status=inactive to block access while preserving records.' }, 409);
  if (action === 'review_school_request') {
    if (actor.role !== 'super_admin') return reply({ error: 'Only Super Admin can review school requests.' }, 403);
    const requestId = String(body.request_id || ''), decision = String(body.decision || '');
    if (!requestId || !['approved','rejected'].includes(decision)) return reply({ error: 'request_id and approved/rejected decision are required.' }, 400);
    const { data: reviewResult, error: reviewError } = await admin.rpc('review_school_request_atomic', { p_request_id: requestId, p_decision: decision, p_reviewer_id: caller.id, p_rejection_reason: decision === 'rejected' ? String(body.reason || '').slice(0, 1000) : null });
    if (reviewError) { const message = reviewError.message || 'Could not review school request.'; const status = /already been reviewed/i.test(message) ? 409 : /not found/i.test(message) ? 404 : /Super Admin/i.test(message) ? 403 : 400; return reply({ error: message }, status); }
    return reply(reviewResult);
  }
  return reply({ error: 'Unsupported action.' }, 400);
});