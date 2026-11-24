import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200, extraHeaders: Record<string,string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...cors, ...extraHeaders, 'Content-Type': 'application/json' } });
const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max) || null;
const validUrl = (v: unknown) => { if (!v) return null; try { const u = new URL(String(v)); return ['http:', 'https:'].includes(u.protocol) ? u.toString() : null; } catch { return null; } };
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
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply({ error: 'Server configuration is missing.' }, 500);
  let body: any; try { body = await req.json(); } catch { return reply({ error: 'Invalid request.' }, 400); }
  const captcha = await verifyCaptcha(body.captchaToken);
  if (!captcha.ok) return reply({ error: captcha.reason }, 403);
  if (String(body.website || '').trim()) return reply({ success: true });
  const selectedPlan = ['basic','advanced','premium'].includes(String(body.selected_plan)) ? String(body.selected_plan) : 'basic';
  const school_name = clean(body.school_name, 180), contact_person = clean(body.contact_person, 120);
  const contact_email = String(body.contact_email || '').trim().toLowerCase(), phone = clean(body.phone, 40);
  if (!school_name || !contact_person || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email) || contact_email.length > 320 || !phone) return reply({ error: 'School name, contact person, valid email and phone are required.' }, 400);
  const classes = Array.isArray(body.classes_offered) ? [...new Set(body.classes_offered.map((x: unknown) => String(x).trim()).filter((x: string) => /^(Nursery|LKG|UKG|Class ([1-9]|1[0-2]))$/.test(x)))] : [];
  if (!classes.length) return reply({ error: 'Select at least one class offered by the school.' }, 400);
  const languageSet = new Set(['English','Hindi','Urdu','Bengali','Maithili','Punjabi','Odia','Assamese','Marathi','Gujarati','Tamil','Telugu','Kannada','Malayalam','Nepali','Sanskrit']);
  const supported_languages = Array.isArray(body.supported_languages) ? [...new Set(body.supported_languages.map((x: unknown) => String(x).trim()).filter((x: string) => languageSet.has(x)))].slice(0,16) : [];
  const optionalCount = (v: unknown) => v === undefined || v === null || v === '' ? null : Number(v);
  const students = optionalCount(body.estimated_students);
  const teachers = optionalCount(body.estimated_teachers);
  const branches = optionalCount(body.branches_count);
  if ([students, teachers, branches].some(x => x !== null && (!Number.isInteger(x) || x < 0)) || (branches !== null && branches < 1)) return reply({ error: 'Student, teacher and branch counts must be valid non-negative whole numbers.' }, 400);
  const documents = Array.isArray(body.document_urls) ? body.document_urls.slice(0, 10).map((x: unknown) => validUrl(x)).filter(Boolean) : [];
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const hashedIp = await ipHash(req, key);
  if (!hashedIp) return reply({ error: 'Could not verify request source. Please try again.' }, 503);
  const { data: allowed, error: limitError } = await admin.rpc('consume_public_form_rate_limit', { p_ip_hash: hashedIp, p_form: 'school' });
  if (limitError) return reply({ error: 'Submission protection is temporarily unavailable. Please try again later.' }, 503);
  if (allowed !== true) return reply({ error: 'Please wait 10 minutes before submitting another school request from this network.' }, 429, { 'Retry-After': '600' });
  const { data, error } = await admin.from('school_requests').insert({
    school_name, school_code: clean(body.school_code, 40), school_type: clean(body.school_type, 60),
    contact_person, contact_email, phone, alternate_phone: clean(body.alternate_phone, 40), website: validUrl(body.website_url),
    city: clean(body.city, 100), state: clean(body.state, 100), district: clean(body.district, 100), pincode: clean(body.pincode, 6),
    address: clean(body.address, 500), board: clean(body.board, 100), affiliation_number: clean(body.affiliation_number, 100),
    classes_offered: classes, instruction_medium: clean(body.instruction_medium, 60), supported_languages,
    academic_session: clean(body.academic_session, 30), estimated_students: students, estimated_teachers: teachers,
    branches_count: branches, selected_plan: selectedPlan, logo_url: validUrl(body.logo_url), document_urls: documents,
    message: clean(body.message, 2000), status: 'pending'
  }).select('id').single();
  if (error) return reply({ error: 'Could not submit request: ' + error.message }, 400);
  return reply({ success: true, request_id: data.id });
});