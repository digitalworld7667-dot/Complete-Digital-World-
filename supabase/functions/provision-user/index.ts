import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), {status, headers:{...cors,'Content-Type':'application/json'}});
const temporaryPassword = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') + 'Aa7!';
};
const loginCode: Record<string,string> = { student:'STD', teacher:'TCH', parent:'PAR', bus_driver:'DRV', school_admin:'ADM' };
async function createLoginId(admin: ReturnType<typeof createClient>, role: string) {
  for (let attempt=0; attempt<10; attempt++) {
    const bytes = new Uint32Array(1); crypto.getRandomValues(bytes);
    const id = 'MSD-' + loginCode[role] + '-' + String(10000000 + (bytes[0] % 90000000));
    const {data,error} = await admin.from('profiles').select('id').eq('login_id',id).maybeSingle();
    if (error) throw new Error('Could not allocate a unique Login ID.');
    if (!data) return id;
  }
  throw new Error('Could not allocate a unique Login ID. Please retry.');
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:cors});
  if (req.method !== 'POST') return reply({error:'Method not allowed'},405);
  const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader=req.headers.get('Authorization')||'', jwt=authHeader.replace(/^Bearer\s+/i,'');
  if(!url||!anon||!key||!jwt) return reply({error:'Missing server configuration or login session.'},401);
  const callerClient=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${jwt}`}},auth:{persistSession:false}});
  const {data:{user:caller},error:authErr}=await callerClient.auth.getUser();
  if(authErr||!caller) return reply({error:'Valid login required.'},401);
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:callerProfile,error:profileErr}=await admin.from('profiles').select('id,role,school_id,account_status').eq('id',caller.id).single();
  if(profileErr||!callerProfile||callerProfile.account_status!=='active') return reply({error:'Active administrator profile required.'},403);
  let body:any; try{body=await req.json()}catch{return reply({error:'Invalid JSON.'},400)}
  const role=String(body.role||'').toLowerCase(), allowed=['student','teacher','parent','bus_driver'];
  if(!(allowed.includes(role)||(role==='school_admin'&&callerProfile.role==='super_admin'))) return reply({error:'This role cannot be provisioned by your account.'},400);
  const schoolId=String(body.school_id||'');
  if(callerProfile.role==='school_admin') { if(!callerProfile.school_id||schoolId!==callerProfile.school_id) return reply({error:'School Admin can create accounts only inside their own school.'},403); }
  else if(callerProfile.role==='super_admin') { if(!schoolId) return reply({error:'school_id is required.'},400); }
  else return reply({error:'Only Super Admin or School Admin can provision accounts.'},403);
  const email=String(body.email||'').trim().toLowerCase(), fullName=String(body.full_name||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>320||!fullName||fullName.length>120) return reply({error:'A valid unique email and full name are required for every account.'},400);
  if(role==='student'&&(!String(body.class_name||'').trim()||!String(body.roll_number||'').trim())) return reply({error:'Student class and roll number are required.'},400);
  const teacherClasses=role==='teacher'?[...new Set(String(body.class_names||'').split(',').map((x:string)=>x.trim()).filter(Boolean))]:[];
  if(role==='teacher'&&!teacherClasses.length) return reply({error:'Teacher ke liye kam se kam ek assigned class enter karein (comma separated).'},400);
  if(role==='parent'){
    const studentId=String(body.student_id||'');
    if(!studentId)return reply({error:'Parent must be linked to a student record.'},400);
    const {data:child}=await admin.from('students').select('id,school_id').eq('id',studentId).single();
    if(!child||child.school_id!==schoolId)return reply({error:'Linked student must exist in the same school.'},400);
  }
  const {data:school,error:schoolErr}=await admin.from('schools').select('id,approval_status').eq('id',schoolId).single();
  if(schoolErr||!school)return reply({error:'School not found.'},400);
  if(school.approval_status!=='approved')return reply({error:'Accounts can be provisioned only for an approved school.'},403);
  let loginId:string;
  try{loginId=await createLoginId(admin,role)}catch(e){return reply({error:e instanceof Error?e.message:'Could not allocate Login ID.'},503)}
  const tempPassword=temporaryPassword();
  const {data:created,error:createErr}=await admin.auth.admin.createUser({email,password:tempPassword,email_confirm:true,user_metadata:{full_name:fullName}});
  if(createErr||!created.user)return reply({error:createErr?.message||'Could not create auth user.'},400);
  const uid=created.user.id;
  const {error:insertProfileErr}=await admin.from('profiles').insert({id:uid,school_id:schoolId,full_name:fullName,role,login_id:loginId,must_change_password:true,account_status:'active'});
  if(insertProfileErr){await admin.auth.admin.deleteUser(uid);return reply({error:'Profile creation failed: '+insertProfileErr.message},500)}
  if(role==='school_admin') return reply({success:true,user_id:uid,role,login_id:loginId,temporary_password:tempPassword,message:'School Admin account created. Give the login slip privately; password change is required at first login.'});
  let row:any=null;
  if(role==='student') row={profile_id:uid,school_id:schoolId,student_name:fullName,class_name:String(body.class_name||'').trim(),section:String(body.section||'').trim()||null,roll_number:String(body.roll_number||'').trim(),admission_number:String(body.admission_number||'').trim()||null,guardian_contact:String(body.guardian_contact||'').trim()||null};
  if(role==='teacher') row={profile_id:uid,school_id:schoolId,teacher_name:fullName,subject:String(body.subject||'').trim()};
  if(role==='parent') row={profile_id:uid,school_id:schoolId,parent_name:fullName,student_id:String(body.student_id||''),relationship:String(body.relationship||'').trim()||null};
  if(role==='bus_driver'){
    if(String(body.bus_number||'').trim()){
      const {data:bus,error:busErr}=await admin.from('buses').insert({school_id:schoolId,bus_number:String(body.bus_number).trim(),driver_profile_id:uid,vehicle_number:String(body.vehicle_number||'').trim()||null,route_name:String(body.route_name||'').trim()||null,authorization_reference:String(body.authorization_reference||'').trim()||null}).select('id').single();
      if(busErr){await admin.from('profiles').delete().eq('id',uid);await admin.auth.admin.deleteUser(uid);return reply({error:'Driver bus assignment failed: '+busErr.message},400)}
      return reply({success:true,user_id:uid,record_id:bus.id,role,login_id:loginId,temporary_password:tempPassword,message:'Driver account created and bus assigned.'});
    }
    return reply({success:true,user_id:uid,role,login_id:loginId,temporary_password:tempPassword,message:'Driver account created. Assign a bus later from Buses.'});
  }
  const table=role==='student'?'students':role==='teacher'?'teachers':'parents';
  const {data:linked,error:linkErr}=await admin.from(table).insert(row).select('id').single();
  if(linkErr){await admin.from('profiles').delete().eq('id',uid);await admin.auth.admin.deleteUser(uid);return reply({error:'Role record creation failed: '+linkErr.message},400)}
  if(role==='teacher'){
    const assignments=teacherClasses.map((class_name:string)=>({teacher_id:linked.id,school_id:schoolId,class_name}));
    const {error:assignErr}=await admin.from('teacher_class_assignments').upsert(assignments,{onConflict:'teacher_id,school_id,class_name'});
    if(assignErr){await admin.from('teachers').delete().eq('id',linked.id);await admin.from('profiles').delete().eq('id',uid);await admin.auth.admin.deleteUser(uid);return reply({error:'Teacher class assignment failed: '+assignErr.message},400)}
  }
  return reply({success:true,user_id:uid,record_id:linked.id,role,login_id:loginId,temporary_password:tempPassword,message:'Account provisioned. Change the temporary password at first login.'});
});
