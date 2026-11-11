-- MemoryVerse — schedule the Legacy inactivity check every day at 03:00 UTC (pg_cron)
-- Run once in Supabase: SQL Editor → New query → paste → Run

create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'legacy-daily-check';

select cron.schedule('legacy-daily-check', '0 3 * * *', $$ select public._run_legacy_check(); $$);
