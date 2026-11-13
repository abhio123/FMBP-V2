-- A word counts once per person per day, wherever it was used. Searching "golgappe" in a post form's list and then
-- writing it under "Other" is one person asking once, not two (the promise in ADMIN.md 3.9). Before, each source counted.
create or replace function fmbp.count_word(p_user uuid, p_word text, p_source text, p_found boolean, p_city text, p_state text)
returns void language plpgsql security definer set search_path = public as $$
declare
  w text := fmbp.clean_word(p_word);
  daily_cap constant integer := 50; -- one person cannot flood the list
begin
  if w is null then return; end if;
  if p_user is not null then
    if exists (select 1 from word_seen s where s.user_id = p_user and s.seen_on = current_date and s.word = w) then return; end if;
    if (select count(*) from word_seen s where s.user_id = p_user and s.seen_on = current_date) >= daily_cap then return; end if;
    insert into word_seen (user_id, word, source) values (p_user, w, p_source) on conflict do nothing;
  end if;
  insert into word_insights (word) values (w) on conflict (word) do update set last_seen = now();
  insert into word_counts (word, source, state, city, uses, found_nothing)
  values (w, p_source, coalesce(btrim(p_state), ''), coalesce(btrim(p_city), ''), 1, case when p_found is false then 1 else 0 end)
  on conflict (word, source, state, city) do update
    set uses = word_counts.uses + 1, found_nothing = word_counts.found_nothing + excluded.found_nothing;
end $$;
revoke all on function fmbp.count_word(uuid, text, text, boolean, text, text) from public, anon, authenticated;
