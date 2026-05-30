-- Realtime : notifier les joueurs lors de la création d'un pari fun (INSERT fun_markets)

alter table public.fun_markets replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.fun_markets;
exception
  when duplicate_object then
    null;
end $$;

notify pgrst, 'reload schema';
