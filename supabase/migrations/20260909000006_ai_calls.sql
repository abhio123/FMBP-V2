-- AI usage log for rate limiting and cost tracking
create table public.ai_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);
create index ai_calls_user_time_idx on public.ai_calls(user_id, created_at desc);
alter table public.ai_calls enable row level security;
create policy "ai_calls: self" on public.ai_calls for all using (user_id = auth.uid()) with check (user_id = auth.uid());
