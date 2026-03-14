-- ============================================================================
-- AIHost MVP — Initial Schema
-- ============================================================================

-- 1. Profiles (extends Supabase auth.users)
-- --------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  locale text not null default 'zh' check (locale in ('zh', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on user sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Events (hosted shows / sessions)
-- --------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'live', 'completed')),
  voice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Users can view their own events"
  on public.events for select
  using (auth.uid() = user_id);

create policy "Users can create their own events"
  on public.events for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own events"
  on public.events for update
  using (auth.uid() = user_id);

create policy "Users can delete their own events"
  on public.events for delete
  using (auth.uid() = user_id);

-- 3. Script Lines (individual lines in a show script)
-- --------------------------------------------------------------------------
create table if not exists public.script_lines (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sort_order integer not null default 0,
  speaker text not null default 'host',
  content text not null,
  audio_url text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.script_lines enable row level security;

create policy "Users can manage script lines of their events"
  on public.script_lines for all
  using (
    exists (
      select 1 from public.events
      where events.id = script_lines.event_id
        and events.user_id = auth.uid()
    )
  );

-- 4. Chat Messages (AI conversation history for script generation)
-- --------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Users can manage chat messages of their events"
  on public.chat_messages for all
  using (
    exists (
      select 1 from public.events
      where events.id = chat_messages.event_id
        and events.user_id = auth.uid()
    )
  );

-- 5. Storage Buckets
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

-- Storage RLS: users can only access their own files
create policy "Users can upload to their own folder"
  on storage.objects for insert
  with check (
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own files"
  on storage.objects for select
  using (
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own files"
  on storage.objects for delete
  using (
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Updated_at trigger helper
-- --------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger set_script_lines_updated_at
  before update on public.script_lines
  for each row execute function public.set_updated_at();

-- ============================================================================
-- P2: Audience Pulse System Tables (PRD v2.0)
-- ============================================================================

-- 7. Audience Polls (created by organizer, tied to script line segments)
-- --------------------------------------------------------------------------
create table if not exists public.audience_polls (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  script_line_id uuid references public.script_lines(id) on delete set null,
  question text not null,
  poll_type text not null default 'single_choice'
    check (poll_type in ('single_choice', 'multiple_choice', 'word_cloud', 'rating')),
  options jsonb, -- ["Option A", "Option B", "Option C"] for choice types
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.audience_polls enable row level security;

-- Organizer can manage their own polls
create policy "Organizers can manage polls of their events"
  on public.audience_polls for all
  using (
    exists (
      select 1 from public.events
      where events.id = audience_polls.event_id
        and events.user_id = auth.uid()
    )
  );

-- Public read: audience members can see active polls (no auth required via anon key)
create policy "Anyone can view active polls"
  on public.audience_polls for select
  using (is_active = true);

-- 8. Audience Votes (individual votes from audience members)
-- --------------------------------------------------------------------------
create table if not exists public.audience_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.audience_polls(id) on delete cascade,
  session_id text not null, -- anonymous browser session ID (no login required)
  selected_option jsonb not null, -- index or value of selected option(s)
  created_at timestamptz not null default now(),
  unique (poll_id, session_id) -- one vote per person per poll
);

alter table public.audience_votes enable row level security;

-- Anyone can insert a vote (audience members are anonymous)
create policy "Anyone can vote"
  on public.audience_votes for insert
  with check (true);

-- Organizer can view votes for their events
create policy "Organizers can view votes of their events"
  on public.audience_votes for select
  using (
    exists (
      select 1 from public.audience_polls
      join public.events on events.id = audience_polls.event_id
      where audience_polls.id = audience_votes.poll_id
        and events.user_id = auth.uid()
    )
  );

-- Audience can read aggregated results (via active poll)
create policy "Anyone can view votes of active polls"
  on public.audience_votes for select
  using (
    exists (
      select 1 from public.audience_polls
      where audience_polls.id = audience_votes.poll_id
        and audience_polls.is_active = true
    )
  );

-- 9. Audience Reactions (lightweight emoji reactions, no poll needed)
-- --------------------------------------------------------------------------
create table if not exists public.audience_reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  session_id text not null,
  reaction_type text not null
    check (reaction_type in ('applause', 'laugh', 'wow', 'heart', 'thinking')),
  created_at timestamptz not null default now()
);

alter table public.audience_reactions enable row level security;

-- Anyone can send a reaction
create policy "Anyone can send reactions"
  on public.audience_reactions for insert
  with check (true);

-- Organizer can view reactions for their events
create policy "Organizers can view reactions of their events"
  on public.audience_reactions for select
  using (
    exists (
      select 1 from public.events
      where events.id = audience_reactions.event_id
        and events.user_id = auth.uid()
    )
  );

-- 10. Audience Questions (submitted by audience members)
-- --------------------------------------------------------------------------
create table if not exists public.audience_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  session_id text not null,
  content text not null,
  is_read boolean not null default false, -- marked true after AI host reads it
  upvotes integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.audience_questions enable row level security;

-- Anyone can submit a question
create policy "Anyone can submit questions"
  on public.audience_questions for insert
  with check (true);

-- Anyone can view questions for active events (for upvoting display)
create policy "Anyone can view questions"
  on public.audience_questions for select
  using (true);

-- Organizer can update questions (mark as read)
create policy "Organizers can update questions of their events"
  on public.audience_questions for update
  using (
    exists (
      select 1 from public.events
      where events.id = audience_questions.event_id
        and events.user_id = auth.uid()
    )
  );

-- Organizer can delete questions
create policy "Organizers can delete questions of their events"
  on public.audience_questions for delete
  using (
    exists (
      select 1 from public.events
      where events.id = audience_questions.event_id
        and events.user_id = auth.uid()
    )
  );

-- Enable Supabase Realtime for audience tables
alter publication supabase_realtime add table public.audience_polls;
alter publication supabase_realtime add table public.audience_votes;
alter publication supabase_realtime add table public.audience_reactions;
alter publication supabase_realtime add table public.audience_questions;
