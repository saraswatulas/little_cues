create extension if not exists "pgcrypto";

create table caregivers (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz not null default now()
);

create table babies (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid references caregivers(id) on delete cascade,
  name text not null,
  date_of_birth date not null,
  timezone text not null default 'America/New_York',
  weight_lbs numeric(5, 2),
  clinical_standard text not null default 'us_aap_cdc',
  created_at timestamptz not null default now()
);

create table feeding_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  occurred_at timestamptz not null,
  age_days integer not null,
  feed_type text,
  side text,
  duration_minutes integer,
  ounces numeric(5, 2),
  formula_brand text,
  pump_brand text,
  raw_text text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table diaper_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  occurred_at timestamptz not null,
  age_days integer not null,
  wet boolean,
  dirty boolean,
  color text,
  texture text,
  raw_text text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table sleep_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  started_at timestamptz,
  ended_at timestamptz,
  occurred_at timestamptz not null,
  age_days integer not null,
  location text,
  raw_text text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  occurred_at timestamptz not null,
  age_days integer not null,
  weight_lbs numeric(5, 2) not null,
  source text,
  raw_text text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table symptom_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  age_days integer not null,
  symptoms text not null,
  temperature_f numeric(5, 2),
  triage text not null check (triage in ('green', 'yellow', 'red')),
  created_at timestamptz not null default now()
);

create table milestone_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  milestone_key text not null,
  observed_on date not null,
  age_days integer not null,
  note text,
  created_at timestamptz not null default now()
);

create table parent_questions (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  question text not null,
  age_days integer not null,
  triage text not null check (triage in ('green', 'yellow', 'red')),
  created_at timestamptz not null default now()
);

create table ai_summaries (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  provider text not null,
  title text not null,
  pasted_response text not null,
  parent_note text,
  age_days integer not null,
  created_at timestamptz not null default now()
);

create table autocomplete_memory (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  field_key text not null,
  value text not null,
  use_count integer not null default 1,
  last_used_at timestamptz not null default now(),
  unique (baby_id, field_key, value)
);

create table planning_activity_states (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  activity_id text not null,
  status text not null check (status in ('planned', 'done', 'skip')),
  note text not null default '',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (baby_id, activity_id)
);

create index feeding_logs_baby_day_idx on feeding_logs (baby_id, age_days, occurred_at desc);
create index diaper_logs_baby_day_idx on diaper_logs (baby_id, age_days, occurred_at desc);
create index sleep_logs_baby_day_idx on sleep_logs (baby_id, age_days, occurred_at desc);
create index symptom_logs_baby_triage_idx on symptom_logs (baby_id, triage, occurred_at desc);
create index autocomplete_memory_lookup_idx on autocomplete_memory (baby_id, field_key, use_count desc);
create index planning_activity_states_baby_idx on planning_activity_states (baby_id, status, updated_at desc);
