create or replace function public.marketplace_submit_chat_report(
  p_conversation_id uuid,
  p_order_id uuid,
  p_reason text,
  p_details text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_product uuid;
  v_other uuid;
  v_order public.marketplace_orders%rowtype;
  v_report_reason text;
  v_dispute_reason text;
  v_report_id uuid;
  v_dispute_id uuid;
  v_details text := btrim(coalesce(p_details, ''));
begin
  if v_user is null then
    raise exception 'Please sign in before submitting a report.';
  end if;
  if p_conversation_id is null then
    raise exception 'Choose a marketplace conversation before reporting.';
  end if;
  if char_length(v_details) < 10 or char_length(v_details) > 3000 then
    raise exception 'Report details must contain between 10 and 3000 characters.';
  end if;

  v_report_reason := case p_reason
    when 'seller_fraud' then 'seller_scam'
    when 'buyer_fraud' then 'buyer_scam'
    when 'not_delivered' then 'not_delivered'
    when 'wrong_item' then 'wrong_item'
    when 'damaged_item' then 'damaged_item'
    when 'not_as_described' then 'other'
    when 'counterfeit' then 'counterfeit'
    when 'other' then 'other'
    else null
  end;
  if v_report_reason is null then
    raise exception 'Choose a valid report reason.';
  end if;

  select c.marketplace_product_id
    into v_product
  from public.chat_conversations c
  join public.chat_participants mine
    on mine.conversation_id = c.id and mine.user_id = v_user
  where c.id = p_conversation_id
    and c.marketplace_product_id is not null;
  if not found then
    raise exception 'This marketplace conversation is not available to your account.';
  end if;

  select cp.user_id into v_other
  from public.chat_participants cp
  where cp.conversation_id = p_conversation_id
    and cp.user_id <> v_user
  limit 1;
  if v_other is null then
    raise exception 'The other conversation participant could not be verified.';
  end if;

  if p_order_id is not null then
    select * into v_order
    from public.marketplace_orders o
    where o.id = p_order_id
      and o.product_id = v_product
      and (o.buyer_id = v_user or o.seller_id = v_user)
      and (o.buyer_id = v_other or o.seller_id = v_other)
      and o.buyer_id <> o.seller_id
    for update;
    if not found then
      raise exception 'That order is not connected to this conversation.';
    end if;

    if exists (
      select 1 from public.marketplace_disputes d
      where d.order_id = p_order_id
        and d.status in ('open','under_review','awaiting_evidence')
    ) then
      raise exception 'This order already has an open dispute. Add evidence in the existing case or contact support.';
    end if;

    v_dispute_reason := case p_reason
      when 'not_as_described' then 'not_as_described'
      when 'seller_fraud' then 'seller_fraud'
      when 'buyer_fraud' then 'buyer_fraud'
      when 'not_delivered' then 'not_delivered'
      when 'wrong_item' then 'wrong_item'
      when 'damaged_item' then 'damaged_item'
      when 'counterfeit' then 'counterfeit'
      else 'other'
    end;
  end if;

  insert into public.marketplace_reports
    (product_id, order_id, conversation_id, reporter_id, reported_user_id, reason, details)
  values
    (v_product, p_order_id, p_conversation_id, v_user, v_other, v_report_reason, v_details)
  returning id into v_report_id;

  if p_order_id is not null then
    insert into public.marketplace_disputes
      (order_id, opened_by, reason, details, status, priority)
    values
      (p_order_id, v_user, v_dispute_reason, v_details, 'open',
       case when p_reason in ('seller_fraud','buyer_fraud','counterfeit') then 'high' else 'normal' end)
    returning id into v_dispute_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'dispute_id', v_dispute_id,
    'message', case when v_dispute_id is not null
      then 'Your report and order dispute have both been submitted for review.'
      else 'Your report has been submitted to Marketplace Safety.'
    end
  );
end;
$function$;

revoke all on function public.marketplace_submit_chat_report(uuid,uuid,text,text) from public, anon;
grant execute on function public.marketplace_submit_chat_report(uuid,uuid,text,text) to authenticated;