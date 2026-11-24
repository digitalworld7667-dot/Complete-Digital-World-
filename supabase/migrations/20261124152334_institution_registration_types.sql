alter table public.school_requests
 add column if not exists institution_type text not null default 'school',
 add column if not exists boards_supported text[] not null default '{}',
 add column if not exists programs_offered text[] not null default '{}';
alter table public.schools
 add column if not exists institution_type text not null default 'school',
 add column if not exists boards_supported text[] not null default '{}',
 add column if not exists programs_offered text[] not null default '{}';
alter table public.school_requests drop constraint if exists school_requests_institution_type_check;
alter table public.school_requests add constraint school_requests_institution_type_check check (institution_type in ('school','college','coaching'));
alter table public.schools drop constraint if exists schools_institution_type_check;
alter table public.schools add constraint schools_institution_type_check check (institution_type in ('school','college','coaching'));
create or replace function public.review_school_request_atomic(p_request_id uuid,p_decision text,p_reviewer_id uuid,p_rejection_reason text default null)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_request public.school_requests%rowtype; v_school_id uuid:=null;
begin
 if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
 if not exists(select 1 from public.profiles p where p.id=p_reviewer_id and p.role='super_admin' and p.account_status='active') then raise exception 'Active Super Admin access required'; end if;
 select * into v_request from public.school_requests where id=p_request_id for update;
 if not found then raise exception 'Registration request not found'; end if;
 if v_request.status<>'pending' then raise exception 'Request has already been reviewed'; end if;
 if p_decision='approved' then
  insert into public.schools(name,school_code,city,address,phone,contact_email,approval_status,alternate_phone,website,state,district,pincode,school_type,board,affiliation_number,classes_offered,instruction_medium,academic_session,estimated_students,estimated_teachers,branches_count,logo_url,document_urls,institution_type,boards_supported,programs_offered)
  values(v_request.school_name,v_request.school_code,v_request.city,v_request.address,v_request.phone,v_request.contact_email,'approved',v_request.alternate_phone,v_request.website,v_request.state,v_request.district,v_request.pincode,v_request.school_type,v_request.board,v_request.affiliation_number,v_request.classes_offered,v_request.instruction_medium,v_request.academic_session,v_request.estimated_students,v_request.estimated_teachers,v_request.branches_count,v_request.logo_url,v_request.document_urls,v_request.institution_type,v_request.boards_supported,v_request.programs_offered)
  returning id into v_school_id;
  insert into public.school_subscriptions(school_id,plan,student_count,price_per_student,list_price_per_student,minimum_monthly_fee,monthly_amount,status,trial_started_at,trial_ends_at,plan_selected_at)
  values(v_school_id,null,0,0,0,0,0,'trialing',now(),now()+interval '7 days',null);
 end if;
 update public.school_requests set status=p_decision,reviewed_by=p_reviewer_id,reviewed_at=now(),rejection_reason=case when p_decision='rejected' then left(coalesce(p_rejection_reason,''),1000) else null end where id=p_request_id;
 insert into public.activity_logs(school_id,actor_profile_id,action,entity_table,entity_id,old_data,new_data)
 values(v_school_id,p_reviewer_id,'INSTITUTION_REQUEST_'||upper(p_decision),'school_requests',p_request_id::text,jsonb_build_object('status','pending'),jsonb_build_object('status',p_decision,'school_id',v_school_id,'institution_type',v_request.institution_type));
 return jsonb_build_object('success',true,'request_id',p_request_id,'status',p_decision,'school_id',v_school_id,'institution_type',v_request.institution_type);
end; $function$;
revoke all on function public.review_school_request_atomic(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.review_school_request_atomic(uuid,text,uuid,text) to service_role;
