-- Pronostics visibles par tous les joueurs sur les matchs EN DIRECT uniquement.
-- (La policy globale « après coup d'envoi » a été retirée en 049.)

create policy "Users view bets on live matches"
  on public.bets for select to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = bets.match_id
        and m.status = 'live'
    )
  );

notify pgrst, 'reload schema';
