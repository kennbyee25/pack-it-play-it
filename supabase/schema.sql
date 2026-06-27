-- MVP 5 telemetry — Supabase Postgres schema.
-- Run this in the Supabase SQL editor (or `supabase db push`). The client inserts
-- rows via the REST endpoint using the publishable anon key; RLS makes the table
-- INSERT-ONLY for anon, so the anon key being in the client bundle is safe.

create table if not exists public.traces (
  id          bigint generated always as identity primary key,
  type        text   not null check (type in ('puzzle_started','move','puzzle_ended')),
  session_id  text   not null,           -- anonymous, per-browser
  puzzle_id   text   not null,           -- ties one puzzle's events together
  ts          bigint not null,           -- client epoch ms
  payload     jsonb  not null,           -- the full TraceEvent
  inserted_at timestamptz not null default now()
);

create index if not exists traces_puzzle_id_idx on public.traces (puzzle_id);
create index if not exists traces_type_idx       on public.traces (type);
create index if not exists traces_game_idx       on public.traces ((payload->>'gameId'));

-- Row-level security: anon may INSERT only. No select/update/delete for anon, so
-- nobody can read others' data with the public key. Grant reads to a service role
-- / your analytics user out of band.
alter table public.traces enable row level security;

drop policy if exists "anon can insert traces" on public.traces;
create policy "anon can insert traces"
  on public.traces for insert
  to anon
  with check (true);

-- The difficulty oracle: empirical human success + median solve time per
-- (game, difficulty bucket). Compare success_rate against the calibrated curve
-- (MVP 2) to find mis-calibrated knobs; low buckets flag hard instances.
create or replace view public.difficulty_oracle as
with started as (
  select puzzle_id,
         payload->>'gameId'              as game_id,
         (payload->>'difficulty')::numeric as difficulty
  from public.traces where type = 'puzzle_started'
),
ended as (
  select puzzle_id,
         payload->>'outcome'           as outcome,
         (payload->>'seconds')::numeric as seconds,
         (payload->>'score')::numeric   as score
  from public.traces where type = 'puzzle_ended'
)
select s.game_id,
       (round(s.difficulty / 300) * 300)::int                      as difficulty_bucket,
       count(*)                                                    as attempts,
       avg((e.outcome = 'solved')::int)::numeric(4,3)              as success_rate,
       percentile_cont(0.5) within group (order by e.seconds)      as median_seconds,
       avg(e.score)::numeric(4,3)                                  as mean_score
from started s
join ended e using (puzzle_id)
group by s.game_id, difficulty_bucket
order by s.game_id, difficulty_bucket;
