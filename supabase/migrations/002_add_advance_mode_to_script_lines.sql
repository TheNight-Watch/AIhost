alter table public.script_lines
  add column if not exists advance_mode text not null default 'listen';

update public.script_lines
set advance_mode = 'listen'
where advance_mode is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'script_lines_advance_mode_check'
  ) then
    alter table public.script_lines
      add constraint script_lines_advance_mode_check
      check (advance_mode in ('listen', 'continue', 'manual'));
  end if;
end
$$;
