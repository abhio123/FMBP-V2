-- QA round 2026-11-04 (Surya): owners can edit a published post (fix mistakes, add details). The post page then shows
-- "Updated on". `updated_at` cannot be used for that (it also moves on counters, status changes and nightly jobs), so
-- edited_at is set by the database only when the post's content changes. Editing never moves expires_at: only Renew
-- extends a post (agreed 2026-11-01).
alter table public.opportunity_posts add column if not exists edited_at timestamptz;

create or replace function fmbp.trg_post_edited()
returns trigger language plpgsql as $$
begin
  if (new.title, new.description, new.basic, new.advanced, new.amount_min, new.amount_max, new.city, new.deal_type)
     is distinct from (old.title, old.description, old.basic, old.advanced, old.amount_min, old.amount_max, old.city, old.deal_type) then
    new.edited_at := now();
  end if;
  return new;
end $$;
drop trigger if exists posts_edited on public.opportunity_posts;
create trigger posts_edited before update on public.opportunity_posts for each row execute function fmbp.trg_post_edited();
