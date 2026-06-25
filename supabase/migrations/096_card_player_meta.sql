-- Cartes joueurs : categorie + rattachement a une selection nationale.
-- Les cartes joueurs sont generees depuis teams.squad + wc_scorers (faits publics :
-- nom, poste, age, buts). Aucune photo, logo ou marque.

alter table public.cards
  add column if not exists category text,
  add column if not exists team_id integer references public.teams (id) on delete set null;

-- Cartes nation du seed initial (position 'Nation').
update public.cards set category = 'nation'
where category is null and position = 'Nation';

create index if not exists cards_team_idx on public.cards (team_id);
create index if not exists cards_category_idx on public.cards (category);

notify pgrst, 'reload schema';
