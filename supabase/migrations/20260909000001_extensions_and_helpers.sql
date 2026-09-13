-- FMBP: extensions and shared helpers
create extension if not exists "uuid-ossp";
create extension if not exists postgis;
create extension if not exists pg_trgm;

create schema if not exists fmbp;
grant usage on schema fmbp to authenticated, anon, service_role;

create or replace function fmbp.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
