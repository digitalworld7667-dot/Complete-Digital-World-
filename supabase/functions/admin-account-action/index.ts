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
    if (authUpdateError) { await admin.from('profiles').update({ account_status: target.account_status || 'active' }).eq('id', targetId); return reply({ error: 'Account status change was rolled back because Auth update failed: ' + authUpdateError.message }, 500); }
    await admin.from('activity_logs').insert({ school_id: target.school_id, actor_profile_id: caller.id, action: 'ACCOUNT_STATUS_CHANGED', entity_table: 'profiles', entity_id: targetId, new_data: { account_status: status, role: target.role } });
    return reply({ success: true, user_id: targetId, status });
  }
  if (action === 'send_password_reset') {
    const targetId = String(body.user_id || '');
    if (!targetId) return reply({ error: 'user_id is required.' }, 400);
    const { data: targetProfile, error: targetProfileError } = await admin.from('profiles')
      .select('role,school_id,login_id,must_change_password').eq('id', targetId).single();
    if (targetProfileError || !targetProfile) return reply({ error: 'Account profile not found.' }, 404);
    if (targetProfile.role === 'super_admin' && actor.role !== 'super_admin') return reply({ error: 'Only Super Admin can reset a Super Admin account.' }, 403);
    if (actor.role === 'school_admin' && (!actor.school_id || targetProfile.school_id !== actor.school_id)) return reply({ error: 'You can manage only accounts in your own school.' }, 403);
    if (actor.role === 'school_admin' && targetProfile.role === 'school_admin') return reply({ error: 'School Admin cannot reset another School Admin account.' }, 403);
    const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
    const tempPassword = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') + 'Aa7!';
    const { error: flagError } = await admin.from('profiles').update({ must_change_password: true }).eq('id', targetId);
    if (flagError) return reply({ error: 'Could not require a password change for this account.' }, 500);
    const { error: passwordError } = await admin.auth.admin.updateUserById(targetId, { password: tempPassword });
    if (passwordError) {
      await admin.from('profiles').update({ must_change_password: targetProfile.must_change_password === true }).eq('id', targetId);
      return reply({ error: 'Could not issue a temporary password: ' + passwordError.message }, 400);
    }
    await admin.from('activity_logs').insert({ school_id: targetProfile.school_id, actor_profile_id: caller.id, action: 'TEMPORARY_PASSWORD_ISSUED', entity_table: 'profiles', entity_id: targetId });
    return reply({ success: true, login_id: targetProfile.login_id, temporary_password: tempPassword, message: 'Temporary password issued. Share it privately; user must change it at next login.' });
  }

  if (action === 'unlock_login_lockout') {
    if (actor.role !== 'super_admin') return reply({ error: 'Only Super Admin can unlock a login-locked account.' }, 403);
    const targetId = String(body.user_id || '');
    if (!targetId) return reply({ error: 'user_id is required.' }, 400);
    const { data: target, error: targetError } = await admin.from('profiles')
      .select('id,role,school_id,login_id,full_name').eq('id', targetId).single();
    if (targetError || !target) return reply({ error: 'Account not found.' }, 404);
    const { data: targetAuth, error: targetAuthError } = await admin.auth.admin.getUserById(targetId);
    const targetEmail = targetAuth?.user?.email?.trim().toLowerCase();
    if (targetAuthError || !targetEmail) return reply({ error: 'Could not resolve the account email for secure unlock.' }, 400);
    const bytes = new TextEncoder().encode(service + ':' + targetEmail);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const identityHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const { error: clearError } = await admin.rpc('clear_login_failures', { p_identity_hash: identityHash });
    if (clearError) return reply({ error: 'Could not clear login lockout: ' + clearError.message }, 500);
    await admin.from('activity_logs').insert({
      school_id: target.school_id, actor_profile_id: caller.id,
      action: 'LOGIN_LOCKOUT_CLEARED', entity_table: 'profiles', entity_id: targetId,
      new_data: { role: target.role, login_id: target.login_id || null, method: 'super_admin_support_unlock' }
    });
    return reply({ success: true, user_id: targetId, login_id: target.login_id || null, message: 'Login lockout cleared. The user can try signing in again.' });
  }

  if (action === 'super_admin_reset_password') {
    if (actor.role !== 'super_admin') return reply({ error: 'Only Super Admin can reset a password through support.' }, 403);
    const targetId = String(body.user_id || '');
    if (!targetId) return reply({ error: 'user_id is required.' }, 400);
    if (targetId === caller.id) return reply({ error: 'Use the normal account recovery process for your own account.' }, 403);
    const { data: target, error: targetError } = await admin.from('profiles')
      .select('id,role,school_id,login_id,must_change_password').eq('id', targetId).single();
    if (targetError || !target) return reply({ error: 'Account not found.' }, 404);
    if (target.role === 'super_admin') return reply({ error: 'A Super Admin cannot reset another Super Admin password through this support action.' }, 403);
    const { data: targetAuth, error: targetAuthError } = await admin.auth.admin.getUserById(targetId);
    const targetEmail = targetAuth?.user?.email?.trim().toLowerCase();
    if (targetAuthError || !targetEmail) return reply({ error: 'Could not resolve the account email for password reset.' }, 400);
    const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
    const tempPassword = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') + 'Aa7!';
    const identityBytes = new TextEncoder().encode(service + ':' + targetEmail);
    const digest = await crypto.subtle.digest('SHA-256', identityBytes);
    const identityHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const { error: clearError } = await admin.rpc('clear_login_failures', { p_identity_hash: identityHash });
    if (clearError) return reply({ error: 'Could not clear the login lockout. Password was not changed.' }, 500);
    const { error: flagError } = await admin.from('profiles').update({ must_change_password: true }).eq('id', targetId);
    if (flagError) return reply({ error: 'Could not require a password change.' }, 500);
    const { error: passwordError } = await admin.auth.admin.updateUserById(targetId, { password: tempPassword });
    if (passwordError) {
      await admin.from('profiles').update({ must_change_password: target.must_change_password === true }).eq('id', targetId);
      return reply({ error: 'Password reset failed: ' + passwordError.message }, 400);
    }
    await admin.from('activity_logs').insert({
      school_id: target.school_id, actor_profile_id: caller.id,
      action: 'SUPPORT_PASSWORD_RESET_AND_UNLOCK', entity_table: 'profiles', entity_id: targetId,
      new_data: { role: target.role, login_id: target.login_id || null, must_change_password: true }
    });
    return reply({
      success: true, user_id: targetId, login_id: target.login_id || null,
      temporary_password: tempPassword, lockout_cleared: true,
      message: 'Password reset and login lockout cleared. User must change this temporary password after signing in.'
    });
  }

  if (action === 'delete_account') return reply({ error: 'Permanent account deletion is disabled to protect linked academic and financial records. Use set_account_status with status=inactive to block access while preserving records.' }, 409);
  if (action === 'review_school_request') {
    if (actor.role !== 'super_admin') return reply({ error: 'Only Super Admin can review school requests.' }, 403);
    const requestId = String(body.request_id || ''), decision = String(body.decision || '');
    if (!requestId || !['approved','rejected'].includes(decision)) return reply({ error: 'request_id and approved/rejected decision are required.' }, 400);
    const { data: reviewResult, error: reviewError } = await admin.rpc('review_school_request_atomic', { p_request_id: requestId, p_decision: decision, p_reviewer_id: caller.id, p_rejection_reason: decision === 'rejected' ? String(body.reason || '').slice(0, 1000) : null });
    if (reviewError) { const message = reviewError.message || 'Could not review school request.'; const status = /already been reviewed/i.test(message) ? 409 : /not found/i.test(message) ? 404 : /Super Admin/i.test(message) ? 403 : 400; return reply({ error: message }, status); }
    if (decision === 'approved' && reviewResult?.school_id) {
      const { data: requestRow, error: requestFetchError } = await admin.from('school_requests').select('contact_person,contact_email').eq('id', requestId).single();
      if (requestFetchError || !requestRow?.contact_email) return reply({ ...reviewResult, invitation_sent: false, warning: 'School approved, but School Admin contact email could not be read. Use Accounts to invite manually.' });
      const email = String(requestRow.contact_email).trim().toLowerCase(), fullName = String(requestRow.contact_person || 'School Admin').trim().slice(0,120);
      const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) return reply({ ...reviewResult, invitation_sent: false, warning: 'School approved, but account lookup failed. Use Accounts to invite manually.' });
      let authUser = usersPage.users.find((u: any) => (u.email || '').toLowerCase() === email);
      if (!authUser) {
        const inviteOptions: any = { data: { full_name: fullName } };
        if (siteUrl) inviteOptions.redirectTo = siteUrl;
        const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, inviteOptions);
        if (inviteError || !invited?.user) return reply({ ...reviewResult, invitation_sent: false, warning: 'School approved, but invitation email failed: ' + (inviteError?.message || 'Unknown error') });
        authUser = invited.user;
      }
      const { data: existingProfile } = await admin.from('profiles').select('id,role,school_id').eq('id', authUser.id).maybeSingle();
      if (existingProfile && (existingProfile.role !== 'school_admin' || existingProfile.school_id !== reviewResult.school_id)) return reply({ ...reviewResult, invitation_sent: false, warning: 'This email is already linked to another account. Review Accounts manually.' });
      if (!existingProfile) {
        const { error: profileCreateError } = await admin.from('profiles').insert({ id: authUser.id, school_id: reviewResult.school_id, full_name: fullName, role: 'school_admin' });
        if (profileCreateError) return reply({ ...reviewResult, invitation_sent: false, warning: 'School approved, but profile creation failed: ' + profileCreateError.message });
      }
      await admin.from('activity_logs').insert({ school_id: reviewResult.school_id, actor_profile_id: caller.id, action: 'SCHOOL_ADMIN_INVITATION_PROCESSED', entity_table: 'profiles', entity_id: authUser.id, new_data: { email, role: 'school_admin' } });
      return reply({ ...reviewResult, invitation_sent: true, school_admin_user_id: authUser.id, message: 'School approved and School Admin invitation requested.' });
    }
    return reply(reviewResult);
  }
  return reply({ error: 'Unsupported action.' }, 400);
});