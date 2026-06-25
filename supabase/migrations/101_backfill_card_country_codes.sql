-- Backfill country_code sur les cartes joueurs (codes équipe internes FR, US…).

update public.cards c
set country_code = case
  when upper(t.code) in ('GB-ENG', 'GB-SCT', 'GB-WAL') then 'gb'
  when length(trim(t.code)) = 2 then lower(trim(t.code))
  else c.country_code
end
from public.teams t
where c.team_id = t.id
  and c.category = 'joueur'
  and (c.country_code is null or trim(c.country_code) = '');

notify pgrst, 'reload schema';
