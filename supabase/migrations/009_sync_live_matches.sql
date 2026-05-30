-- Passe les matchs en « live » dès que l'heure de coup d'envoi est atteinte (timestamptz = instant universel)

create or replace function public.sync_live_matches()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.matches
  set
    status = 'live',
    updated_at = now()
  where status = 'scheduled'
    and kickoff_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.sync_live_matches() to authenticated;

notify pgrst, 'reload schema';
