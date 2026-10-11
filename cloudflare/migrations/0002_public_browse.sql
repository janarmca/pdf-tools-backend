-- Public sign-ups can be listed (after the admin approves) so everybody can browse the safe fields,
-- the horoscope picture is kept for the admin, and visitors can ask the admin to arrange contact.
alter table mat_submissions add column listed integer not null default 0;
alter table mat_submissions add column horoscope text;

create table if not exists mat_contact_requests (
  id text primary key,
  target_id text not null,
  target_name text,
  from_name text not null,
  from_phone text not null,
  note text,
  status text not null default 'new',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists mat_contact_requests_created on mat_contact_requests (created_at);
