import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,'Content-Type':'application/json'}});
const clean=(v:unknown,n:number)=>String(v??'').trim().slice(0,n)||null;
async function hashIp(req:Request,pepper:string){const ip=req.headers.get('cf-connecting-ip')?.trim()||req.headers.get('x-real-ip')?.trim()||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();if(!ip)return null;const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pepper+':'+ip));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return reply({error:'Server configuration missing'},500);
 let b:any;try{b=await req.json()}catch{return reply({error:'Invalid JSON'},400)}
 if(!/^[0-9a-f-]{36}$/i.test(String(b.session_id||'')))return reply({error:'Invalid session'},400);
 const status=['started','in_progress','issue','submitted'].includes(b.status)?b.status:'in_progress';
 const institution=['school','college','coaching'].includes(b.institution_type)?b.institution_type:'unknown';
 const consent=b.consent===true,ipHash=await hashIp(req,key),admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:prior}=await admin.from('registration_leads').select('last_seen_at').eq('session_id',b.session_id).maybeSingle();
 if(prior?.last_seen_at&&Date.now()-new Date(prior.last_seen_at).getTime()<1800)return reply({success:true,throttled:true});
 const row={session_id:b.session_id,institution_type:institution,current_step:clean(b.current_step,100)||'registration_opened',status,
 visitor_name:consent?clean(b.visitor_name,120):null,contact_email:consent?clean(b.contact_email,254)?.toLowerCase()||null:null,phone:consent?clean(b.phone,40):null,
 last_error:status==='issue'?clean(b.last_error,300):null,ip_hash:ipHash,last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()};
 const {error}=await admin.from('registration_leads').upsert(row,{onConflict:'session_id'});if(error)return reply({error:'Could not record registration progress'},503);return reply({success:true});
});
