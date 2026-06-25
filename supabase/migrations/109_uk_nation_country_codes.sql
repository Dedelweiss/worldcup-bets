-- Distinct country_code for England, Scotland and Wales (was incorrectly collapsed to 'gb').

update public.cards c
set country_code = case upper(t.code)
  when 'GB-ENG' then 'gb-eng'
  when 'GB-SCT' then 'gb-sct'
  when 'GB-WAL' then 'gb-wal'
  else c.country_code
end
from public.teams t
where c.team_id = t.id
  and c.category = 'joueur'
  and upper(t.code) in ('GB-ENG', 'GB-SCT', 'GB-WAL');

notify pgrst, 'reload schema';
