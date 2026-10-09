-- Push notifications from the database: a new message or response inserts a `notifications` row for the recipient and
-- posts to the Expo push API (pg_net, async) for every device token the recipient registered. No Edge Function, no
-- secrets: Expo's push endpoint needs none, and tokens are only ever read here (security definer).
create extension if not exists pg_net with schema extensions;

create or replace function fmbp.send_push(p_user_id uuid, p_kind text, p_title text, p_body text, p_data jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare toks text[];
begin
  if p_user_id is null then return; end if;
  insert into public.notifications (user_id, kind, payload)
  values (p_user_id, p_kind, p_data || jsonb_build_object('title', p_title, 'body', p_body));
  select array_agg(expo_token) into toks from public.push_tokens where user_id = p_user_id;
  if toks is null then return; end if;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
    body := (select jsonb_agg(jsonb_build_object('to', t, 'title', p_title, 'body', p_body, 'data', p_data,
                                                 'sound', 'default', 'channelId', 'default', 'priority', 'high'))
               from unnest(toks) t)
  );
end $$;
revoke all on function fmbp.send_push(uuid, text, text, text, jsonb) from public, anon, authenticated;

-- new chat message → the other participant's owner
create or replace function fmbp.trg_message_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare c record; recipient uuid; prefs jsonb; sender_name text;
begin
  select business_a, business_b into c from public.conversations where id = new.conversation_id;
  select b.owner_id into recipient from public.businesses b
   where b.id = case when c.business_a = new.sender_business_id then c.business_b else c.business_a end;
  select notification_prefs into prefs from public.users where id = recipient;
  if coalesce((prefs->>'messages')::boolean, true) is false then return null; end if;
  select name into sender_name from public.businesses where id = new.sender_business_id;
  perform fmbp.send_push(recipient, 'message', sender_name, left(coalesce(new.body, '📎'), 140),
    jsonb_build_object('kind', 'message', 'conversation_id', new.conversation_id, 'sender_business_id', new.sender_business_id));
  return null;
end $$;
drop trigger if exists messages_push on public.messages;
create trigger messages_push after insert on public.messages for each row execute function fmbp.trg_message_push();

-- new response → the post owner, in the owner's language
create or replace function fmbp.trg_response_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record; recipient uuid; prefs jsonb; lang text; responder text; v_title text; v_body text;
begin
  select op.business_id, op.title into p from public.opportunity_posts op where op.id = new.post_id;
  select owner_id into recipient from public.businesses where id = p.business_id;
  select notification_prefs, language into prefs, lang from public.users where id = recipient;
  if coalesce((prefs->>'responses')::boolean, true) is false then return null; end if;
  select name into responder from public.businesses where id = new.business_id;
  v_title := case when lang = 'hi' then 'आपकी पोस्ट पर नया जवाब' else 'New response on your post' end;
  v_body := responder || case when new.response_type = 'interested'
                           then (case when lang = 'hi' then ' ने रुचि दिखाई · ' else ' is interested · ' end)
                           else (case when lang = 'hi' then ' बात करना चाहते हैं · ' else ' wants to talk · ' end) end || left(p.title, 80);
  perform fmbp.send_push(recipient, 'response', v_title, v_body,
    jsonb_build_object('kind', 'response', 'post_id', new.post_id, 'response_id', new.id, 'conversation_id', new.conversation_id));
  return null;
end $$;
drop trigger if exists post_responses_push on public.post_responses;
create trigger post_responses_push after insert on public.post_responses for each row execute function fmbp.trg_response_push();

-- the app marks notifications read; keep the table small
create index if not exists notifications_unread_idx on public.notifications(user_id) where read_at is null;
