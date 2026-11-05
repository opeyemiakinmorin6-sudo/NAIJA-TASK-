-- NAIJA TASK: keep Normal Task posting social-only and validate the new
-- social service keys against Admin-configured server-side prices.
begin;
create or replace function public.apply_poster_service_pricing()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_kind text;
  v_group text;
  v_key text;
  v_pricing jsonb;
  v_item jsonb;
  v_poster numeric;
  v_worker numeric;
  v_base_fee numeric := 500;
  v_promo_fee numeric := 0;
begin
  if coalesce(new.status,'') <> 'PAYMENT_REQUIRED'
     or new.created_by is null then
    return new;
  end if;

  v_kind := coalesce(new.task_kind,'normal_task');
  if v_kind = 'business_job' then
    v_group := 'business';
    v_key := nullif(new.business_details->>'service_type','');
  else
    v_group := 'social';
    v_key := coalesce(nullif(new.task_type,''),'general');
    v_key := case v_key
      when 'website' then 'website_blog'
      when 'survey' then 'survey_task'
      when 'app_download' then 'app_testing'
      else v_key
    end;
  end if;

  -- Only genuine work, research, testing and creative services are supported.
  if v_group = 'social' and v_key not in
    ('social_content_writing','social_video_editing','social_graphic_design',
     'social_account_audit','social_content_calendar',
     'social_community_moderation','social_audience_research',
     'social_transcription_translation') then
    raise exception 'This social service is unavailable. Choose an enabled social content, creative, research or support service.';
  end if;
  if v_group = 'business' and v_key not in
    ('product_testing','website_testing','app_testing','survey_research',
     'writing_content','graphic_design','video_audio','data_admin',
     'business_support','translation_transcription','other_business') then
    raise exception 'Invalid business service.';
  end if;

  select coalesce(service_pricing,'{}'::jsonb),
         greatest(0,coalesce(poster_task_fee,500))
    into v_pricing,v_base_fee
  from public.platform_settings
  order by id
  limit 1;

  v_item := v_pricing #> array[v_group,v_key];
  if v_item is null or coalesce((v_item->>'enabled')::boolean,false) is false then
    raise exception 'This service is not currently available.';
  end if;

  begin
    v_poster := (v_item->>'poster_price')::numeric;
    v_worker := (v_item->>'tasker_reward')::numeric;
  exception when others then
    raise exception 'The service price has not been configured correctly.';
  end;

  if v_poster is null or v_worker is null
     or v_poster < 1 or v_poster > 999
     or v_worker < 1 or v_worker > 999
     or v_worker > v_poster then
    raise exception 'Service pricing is invalid. Contact NAIJA TASK support.';
  end if;

  new.service_key := v_key;
  new.poster_rate_per_slot := v_poster;
  new.tasker_reward_per_slot := v_worker;
  new.platform_margin_per_slot := v_poster - v_worker;
  new.reward := v_worker;
  case coalesce(new.promotion_tier,'none')
    when 'fast' then v_promo_fee := greatest(0,coalesce((v_pricing->>'fast_fee')::numeric,500));
    when 'priority' then v_promo_fee := greatest(0,coalesce((v_pricing->>'priority_fee')::numeric,1000));
    when 'none' then v_promo_fee := 0;
    else raise exception 'Invalid promotion option';
  end case;
  new.poster_base_fee_snapshot := v_base_fee;
  new.promotion_fee_snapshot := v_promo_fee;
  new.pricing_snapshot := jsonb_build_object(
    'group',v_group,'service_key',v_key,
    'poster_price',v_poster,'tasker_reward',v_worker,
    'platform_margin',v_poster-v_worker,
    'poster_base_fee',v_base_fee,'promotion_fee',v_promo_fee,
    'captured_at',now()
  );
  return new;
end;
$function$;


commit;
