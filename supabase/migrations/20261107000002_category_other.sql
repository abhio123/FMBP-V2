-- A business that chooses the category "Other" says in its own words what it does (agreed 2026-11-07). Those words are
-- counted in "Words people use" (migration 20261107000001), so admins can see which categories are missing.
alter table public.businesses add column if not exists category_other text check (char_length(category_other) <= 40);
grant select (category_other) on public.businesses to authenticated;

-- Only a business in "Other" keeps these words; the server decides, so every app version stays correct
create or replace function fmbp.tidy_category_other()
returns trigger language plpgsql set search_path = public as $$
begin
  new.category_other := nullif(btrim(new.category_other), '');
  if new.category_other is not null
     and (new.kind <> 'business' or new.category_id is distinct from (select c.id from categories c where c.slug = 'other')) then
    new.category_other := null;
  end if;
  return new;
end $$;
revoke all on function fmbp.tidy_category_other() from public, anon, authenticated;
create trigger businesses_category_other before insert or update of category_id, category_other, kind on public.businesses
  for each row execute function fmbp.tidy_category_other();

-- Count them
alter table public.word_counts drop constraint word_counts_source_check;
alter table public.word_counts add constraint word_counts_source_check
  check (source in ('search', 'category_list', 'trade_list', 'form_list', 'other_trade', 'other_form', 'other_category'));

create or replace function fmbp.words_from_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.trade_other is not null and (tg_op = 'INSERT' or new.trade_other is distinct from old.trade_other) then
    perform fmbp.count_word(new.owner_id, new.trade_other, 'other_trade', false, new.city, new.state);
  end if;
  if new.category_other is not null and (tg_op = 'INSERT' or new.category_other is distinct from old.category_other) then
    perform fmbp.count_word(new.owner_id, new.category_other, 'other_category', false, new.city, new.state);
  end if;
  return new;
exception when others then
  raise warning 'words_from_profile: %', sqlerrm;
  return new;
end $$;
revoke all on function fmbp.words_from_profile() from public, anon, authenticated;

drop trigger businesses_word_counts on public.businesses;
create trigger businesses_word_counts after insert or update of trade_other, category_other on public.businesses
  for each row execute function fmbp.words_from_profile();
