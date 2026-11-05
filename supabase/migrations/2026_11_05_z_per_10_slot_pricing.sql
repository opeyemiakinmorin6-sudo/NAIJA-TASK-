-- NAIJA TASK: interpret Admin service prices as the amount charged for 10 slots.
-- For quantities above 10, the server scales the per-10 rate proportionally.
-- Existing task pricing snapshots are not changed.
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
  -- Social task keys are platform-specific. Each one has its own Admin price.
  if v_group = 'social' and v_key not in
    ('facebook_video_view',
     'facebook_post_like',
     'facebook_page_follow',
     'facebook_group_join',
     'facebook_video_share',
     'facebook_post_comment',
     'facebook_post_share',
     'facebook_custom_comment_review',
     'instagram_page_follow',
     'instagram_post_view',
     'instagram_save_post',
     'instagram_comment_like',
     'instagram_comment_reply',
     'instagram_post_repost',
     'instagram_post_comment',
     'instagram_vote',
     'instagram_custom_comment',
     'instagram_post_like',
     'instagram_reel_sound_use',
     'tiktok_video_like',
     'tiktok_video_view',
     'tiktok_page_follow',
     'tiktok_add_favorites',
     'tiktok_video_comment',
     'tiktok_custom_comment',
     'tiktok_video_duet',
     'tiktok_use_sound',
     'tiktok_premium_use_sound',
     'youtube_video_view',
     'youtube_video_like',
     'youtube_channel_subscribe',
     'youtube_video_comment',
     'youtube_video_share',
     'youtube_custom_comment',
     'youtube_playlist_add',
     'youtube_music_stream',
     'youtube_music_like',
     'youtube_music_follow_artist',
     'youtube_music_add_playlist',
     'youtube_music_comment',
     'x_twitter_page_follow',
     'x_twitter_tweet_view',
     'x_twitter_tweet_comment',
     'x_twitter_tweet_repost',
     'x_twitter_tweet_like',
     'x_twitter_custom_comment',
     'x_twitter_quote_repost',
     'linkedin_post_reaction',
     'linkedin_page_follow',
     'linkedin_page_connect',
     'linkedin_post_comment',
     'linkedin_post_repost',
     'linkedin_custom_comment',
     'whatsapp_channel_follow',
     'whatsapp_group_join',
     'whatsapp_status_view',
     'whatsapp_channel_reaction',
     'whatsapp_poll_vote',
     'telegram_bot_chat',
     'telegram_group_join',
     'telegram_channel_join',
     'threads_page_follow',
     'threads_comment',
     'threads_repost',
     'threads_quote_repost',
     'threads_like',
     'threads_view',
     'spotify_music_like',
     'spotify_page_follow',
     'spotify_stream_music',
     'apple_music_like',
     'apple_music_stream',
     'audiomack_music_comment',
     'audiomack_stream_music',
     'audiomack_music_like',
     'audiomack_page_follow',
     'boomplay_page_follow',
     'boomplay_music_like',
     'boomplay_stream_music',
     'boomplay_music_comment',
     'boomplay_music_favorite',
     'snapchat_page_follow',
     'snapchat_post_like',
     'snapchat_post_repost',
     'snapchat_post_comment',
     'snapchat_custom_comment',
     'quora_post_view',
     'quora_upvote',
     'quora_post_comment',
     'quora_post_repost',
     'quora_downvote',
     'quora_page_follow',
     'quora_custom_comment',
     'google_search_visit',
     'google_website_click',
     'google_maps_profile_visit',
     'google_play_app_download',
     'google_play_app_review',
     'apple_app_download',
     'apple_app_review') then
    raise exception 'This social task type is unavailable. Choose a task type shown for the selected platform.';
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
  new.poster_rate_per_slot := v_poster / 10;
  new.tasker_reward_per_slot := v_worker / 10;
  new.platform_margin_per_slot := (v_poster - v_worker) / 10;
  new.reward := v_worker / 10;
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
    'price_basis','per_10_slots',
    'poster_price_per_10',v_poster,'tasker_reward_per_10',v_worker,
    'platform_margin_per_10',v_poster-v_worker,
    'poster_rate_per_slot',v_poster/10,
    'tasker_reward_per_slot',v_worker/10,
    'poster_base_fee',v_base_fee,'promotion_fee',v_promo_fee,
    'captured_at',now()
  );
  return new;
end;
$function$;


commit;
