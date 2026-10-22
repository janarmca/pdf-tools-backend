-- UPDATE_66: Pro / Business plans switched off (credit packs only — every AI use is paid per use),
-- site admin (unlimited credits, usage dashboard) and per-tool usage counters.
delete from pricing_plans where id in ('pro_monthly', 'pro_yearly', 'business');

-- which tools people open: one row per IST day + tool (+ user for signed-in visitors). Counts only, no file names, no IP.
create table if not exists tool_opens (
  day text not null,
  tool_id text not null,
  user_id text not null references users(id) on delete cascade,
  n integer not null default 1,
  primary key (day, tool_id, user_id)
);
create index if not exists tool_opens_day on tool_opens (day);
create table if not exists tool_opens_anon (
  day text not null,
  tool_id text not null,
  n integer not null default 1,
  primary key (day, tool_id)
);
