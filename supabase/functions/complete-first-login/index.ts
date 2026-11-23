import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={ 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS' };
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
 if(!url||!anon||!service||!jwt)return reply({error:'Valid session required.'},401);
 const callerClient=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${jwt}`}},auth:{persistSession:false}});
 const {data:{user},error:authError}=await callerClient.auth.getUser();
 if(authError||!user)return reply({error:'Valid session required.'},401);
 let body:any;try{body=await req.json()}catch{return reply({error:'Invalid JSON.'},400)}
 const password=String(body.password||'');
 if(password.length<10||password.length>128)return reply({error:'Password must be between 10 and 128 characters.'},400);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error}=await admin.from('profiles').select('must_change_password,account_status').eq('id',user.id).single();
 if(error||!profile)return reply({error:'Account profile not found.'},404);
 if(profile.account_status!=='active')return reply({error:'Account is inactive.'},403);
 if(!profile.must_change_password)return reply({success:true,message:'Password change already completed.'});
 const {error:updateError}=await admin.auth.admin.updateUserById(user.id,{password});
 if(updateError)return reply({error:'Password could not be updated: '+updateError.message},400);
 const {error:flagError}=await admin.from('profiles').update({must_change_password:false}).eq('id',user.id);
 if(flagError)return reply({error:'Password was updated, but activation flag could not be cleared. Please retry or contact administrator.'},500);
 await admin.from('activity_logs').insert({actor_profile_id:user.id,action:'FIRST_LOGIN_PASSWORD_CHANGED',entity_table:'profiles',entity_id:user.id});
 return reply({success:true});
});
