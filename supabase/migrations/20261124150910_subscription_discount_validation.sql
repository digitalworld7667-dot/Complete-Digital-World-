alter table public.school_subscriptions drop constraint if exists school_subscriptions_discount_value_check;
alter table public.school_subscriptions add constraint school_subscriptions_discount_value_check
 check (discount_value >= 0 and (discount_type <> 'percent' or discount_value <= 100));
