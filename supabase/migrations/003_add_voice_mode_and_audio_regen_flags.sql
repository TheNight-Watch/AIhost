alter table public.events
  add column if not exists secondary_voice_id text;

alter table public.events
  add column if not exists voice_mode text not null default 'single';

update public.events
set voice_mode = 'single'
where voice_mode is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_voice_mode_check'
  ) then
    alter table public.events
      add constraint events_voice_mode_check
      check (voice_mode in ('single', 'dual_alternate'));
  end if;
end
$$;

alter table public.script_lines
  add column if not exists audio_needs_regen boolean not null default false;

update public.script_lines
set audio_needs_regen = false
where audio_needs_regen is null;
