alter table public.script_lines
  add column if not exists silence_duration integer not null default 0;

update public.script_lines
set silence_duration = 0
where silence_duration is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'script_lines_silence_duration_check'
  ) then
    alter table public.script_lines
      add constraint script_lines_silence_duration_check
      check (silence_duration >= 0 and silence_duration <= 30000);
  end if;
end
$$;
