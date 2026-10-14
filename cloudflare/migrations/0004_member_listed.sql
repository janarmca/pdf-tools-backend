-- the administrator can also list approved member-account profiles on the public page (safe fields only)
alter table mat_profiles add column listed integer not null default 0;
