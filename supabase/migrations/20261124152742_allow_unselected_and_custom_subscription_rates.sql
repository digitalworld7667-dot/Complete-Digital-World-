alter table public.school_subscriptions drop constraint if exists school_subscriptions_price_per_student_check;
alter table public.school_subscriptions add constraint school_subscriptions_price_per_student_check check (price_per_student >= 0);
