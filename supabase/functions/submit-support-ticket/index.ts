import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status=200, extraHeaders: Record<string,string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...cors, ...extraHeaders, 'Content-Type': 'application/json' } });
async function ipHash(req: Request, pepper: string) {
  const ip = req.headers.get('cf-connecting-ip')?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || req.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
  if (!ip) return null;
  const bytes = new TextEncoder().encode(pepper + ':' + ip);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function verifyCaptcha(token: unknown) {
  const secret = Deno.env.get('HCAPTCHA_SECRET');
  if (!secret) return { ok: false, reason: 'CAPTCHA server secret is not configured.' };
  const response = await fetch('https://api.hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: String(token || '') }),
  });
  if (!response.ok) return { ok: false, reason: 'CAPTCHA verification service unavailable.' };
  const result = await response.json();
  return result.success === true ? { ok: true } : { ok: false, reason: 'CAPTCHA verification failed. Please try again.' };
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!url || !key) return reply({ error: 'Server configuration is missing.' }, 500);
  let body: any; try { body = await req.json(); } catch { return reply({ error: 'Invalid request.' }, 400); }
  const captcha = await verifyCaptcha(body.captchaToken);
  if (!captcha.ok) return reply({ error: captcha.reason }, 403);
  if (String(body.website || '').trim()) return reply({ success: true });
  const requester_name = String(body.requester_name || '').trim(), requester_contact = String(body.requester_contact || '').trim();
  const category = String(body.category || '').trim(), message = String(body.message || '').trim(), subject = String(body.subject || '').trim();
  if (!requester_name || requester_name.length > 120 || !requester_contact || requester_contact.length > 320 || !category || category.length > 80 || !message || message.length > 4000 || subject.length > 180) return reply({ error: 'Name, contact, category and message are required.' }, 400);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const hashedIp = await ipHash(req, key);
  if (!hashedIp) return reply({ error: 'Could not verify request source. Please try again.' }, 503);
  const { data: allowed, error: limitError } = await admin.rpc('consume_public_form_rate_limit', { p_ip_hash: hashedIp, p_form: 'support' });
  if (limitError) return reply({ error: 'Submission protection is temporarily unavailable. Please try again later.' }, 503);
  if (allowed !== true) return reply({ error: 'Please wait 5 minutes before submitting another support ticket from this network.' }, 429, { 'Retry-After': '300' });
  let school_id: string | null = null;
  const schoolName = String(body.school_name || '').trim();
  if (schoolName) { const { data: school } = await admin.from('schools').select('id').ilike('name', schoolName).limit(1).maybeSingle(); school_id = school?.id || null; }
  const { data, error } = await admin.from('support_tickets').insert({ requester_name, requester_contact, category, subject: subject || category, message, school_id, status: 'open', requester_profile_id: null }).select('id').single();
  if (error) return reply({ error: 'Could not submit ticket: ' + error.message }, 400);
  return reply({ success: true, ticket_id: data.id });
});