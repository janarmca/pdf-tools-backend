-- Anonymous funnel counters (no user id, no IP): one row per day + event name.
create table if not exists funnel_events (
  day text not null,
  name text not null,
  n integer not null default 0,
  primary key (day, name)
);
