alter table public.script_lines
  add column if not exists speech_rate integer not null default 0;

update public.script_lines
set speech_rate = 0
where speech_rate is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'script_lines_speech_rate_check'
  ) then
    alter table public.script_lines
      add constraint script_lines_speech_rate_check
      check (speech_rate >= -50 and speech_rate <= 100);
  end if;
end
$$;
