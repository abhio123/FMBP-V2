-- E-mail login (2026-11-14), a stand-in until SMS works in India (DLT). FMBP stays phone-first: e-mail sign-up is
-- switched on in Auth only while SMS is blocked, and this check keeps throwaway accounts out.
--
-- Supabase Auth calls public.hook_before_user_created before it saves ANY new user (config.toml →
-- [auth.hook.before_user_created]; hosted: Dashboard → Authentication → Hooks → Before User Created).
--   • phone sign-ups: always allowed (the SMS hook and the test numbers decide);
--   • e-mail sign-ups: refused for addresses at known disposable / temporary-mail domains, and for malformed ones.
-- Existing users are never affected (the hook only runs for new accounts).
--
-- The domain list lives in a table so admins can extend it with one SQL insert, without an app release:
--   insert into fmbp.blocked_email_domains (domain) values ('example-temp-mail.com') on conflict do nothing;

create table if not exists fmbp.blocked_email_domains (
  domain text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  added_at timestamptz not null default now()
);
alter table fmbp.blocked_email_domains enable row level security; -- no policies: read only by the hook below

insert into fmbp.blocked_email_domains (domain) values
  ('mailinator.com'), ('mailinator.net'), ('mailinator2.com'), ('notmailinator.com'), ('reallymymail.com'),
  ('guerrillamail.com'), ('guerrillamail.net'), ('guerrillamail.org'), ('guerrillamail.biz'), ('guerrillamail.de'),
  ('guerrillamailblock.com'), ('sharklasers.com'), ('grr.la'), ('pokemail.net'), ('spam4.me'),
  ('10minutemail.com'), ('10minutemail.net'), ('10minutemail.co.uk'), ('10minemail.com'), ('20minutemail.com'),
  ('temp-mail.org'), ('temp-mail.io'), ('tempmail.com'), ('tempmail.net'), ('tempmailo.com'), ('tempmail.dev'),
  ('tempmailaddress.com'), ('tempr.email'), ('tempinbox.com'), ('temporary-mail.net'), ('tmpmail.org'), ('tmpmail.net'),
  ('tmails.net'), ('tmail.ws'), ('throwawaymail.com'), ('trashmail.com'), ('trashmail.net'), ('trashmail.de'),
  ('trashmail.io'), ('trash-mail.com'), ('mytrashmail.com'), ('wegwerfmail.de'), ('wegwerfmail.net'),
  ('yopmail.com'), ('yopmail.net'), ('yopmail.fr'), ('cool.fr.nf'), ('jetable.fr.nf'), ('nospam.ze.tc'),
  ('nomail.xl.cx'), ('mega.zik.dj'), ('speed.1s.fr'), ('courriel.fr.nf'), ('moncourrier.fr.nf'), ('monemail.fr.nf'),
  ('monmail.fr.nf'), ('dispostable.com'), ('discard.email'), ('discardmail.com'), ('discardmail.de'),
  ('getnada.com'), ('nada.email'), ('getairmail.com'), ('maildrop.cc'), ('mailnesia.com'), ('mailcatch.com'),
  ('mintemail.com'), ('mohmal.com'), ('emailondeck.com'), ('fakeinbox.com'), ('fakemail.net'), ('fakemailgenerator.com'),
  ('emailfake.com'), ('email-fake.com'), ('fake-mail.net'), ('mailpoof.com'), ('spambox.us'), ('spamgourmet.com'),
  ('spamdecoy.net'), ('spamex.com'), ('mailexpire.com'), ('mailforspam.com'), ('incognitomail.org'), ('anonbox.net'),
  ('mvrht.net'), ('harakirimail.com'), ('mailtemp.info'), ('emailtemporanea.com'), ('emailtemporanea.net'),
  ('correotemporal.org'), ('mail.tm'), ('mail.gw'), ('inboxkitten.com'), ('burnermail.io'), ('33mail.com'),
  ('mailsac.com'), ('moakt.com'), ('moakt.cc'), ('tm2mail.com'), ('emltmp.com'), ('vomoto.com'), ('minuteinbox.com'),
  ('linshiyouxiang.net'), ('bccto.me'), ('chacuo.net'), ('027168.com'), ('mailbox52.ga'), ('cuvox.de'),
  ('armyspy.com'), ('dayrep.com'), ('einrot.com'), ('fleckens.hu'), ('gustr.com'), ('jourrapide.com'),
  ('rhyta.com'), ('superrito.com'), ('teleworm.us'), ('byom.de'), ('emailna.co'), ('mailhazard.com'), ('owlymail.com'),
  ('dropmail.me'), ('10mail.org'), ('yomail.info'), ('zetmail.com'), ('wuuvo.com'), ('kzccv.com'), ('qiott.com'),
  ('crazymailing.com'), ('mailinator.us'), ('safetymail.info'), ('tempail.com'), ('tempmail.plus'), ('fexpost.com'),
  ('fexbox.org'), ('rover.info'), ('ezztt.com'), ('eelmail.com'), ('mailnull.com'), ('spamherelots.com')
on conflict (domain) do nothing;

-- Supabase "Before User Created" hook. Input: { "user": { "email", "phone", ... }, ... }.
-- Return {} to allow, or { "error": { "http_code", "message" } } to refuse (the app shows a friendly text for it).
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public, fmbp as $$
declare
  v_email text := lower(trim(coalesce(event -> 'user' ->> 'email', '')));
  v_domain text;
begin
  if v_email = '' then return '{}'::jsonb; end if; -- phone sign-up
  v_domain := split_part(v_email, '@', 2);
  if v_domain = '' or position('.' in v_domain) = 0 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    return jsonb_build_object('error', jsonb_build_object('http_code', 400, 'message', 'This e-mail address is not valid.'));
  end if;
  -- the domain itself or any subdomain of a blocked domain (e.g. x.mailinator.com)
  if exists (select 1 from fmbp.blocked_email_domains b where b.domain = v_domain or v_domain like '%.' || b.domain) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403,
      'message', 'Disposable or temporary e-mail addresses are not allowed. Please use your own e-mail.'));
  end if;
  return '{}'::jsonb;
end;
$$;

-- only Supabase Auth may call it
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
