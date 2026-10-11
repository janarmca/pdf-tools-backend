-- Daily promotion agent (src/promo.js): one row per post, plus an on/off switch.
create table if not exists promo_posts (
  id integer primary key autoincrement,
  tool_id text not null,
  platform text not null,
  status text not null,            -- 'sent' | 'failed'
  message_id text,
  text text,
  error text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists promo_posts_tool on promo_posts (tool_id, created_at);

create table if not exists promo_settings (key text primary key, value text not null);
insert or ignore into promo_settings (key, value) values ('enabled', 'on');
