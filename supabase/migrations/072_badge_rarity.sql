-- Raretés de badges (common, rare, epic, legendary)

alter table public.badges
  add column if not exists rarity text not null default 'common';

alter table public.badges
  drop constraint if exists badges_rarity_check;

alter table public.badges
  add constraint badges_rarity_check
  check (rarity in ('common', 'rare', 'epic', 'legendary'));

comment on column public.badges.rarity is
  'Rareté visuelle : common, rare, epic, legendary.';

-- -----------------------------------------------------------------------------
-- Attribution des raretés
-- -----------------------------------------------------------------------------
update public.badges set rarity = 'common' where id in (
  'debutant', 'fun_expert', 'nuliste', 'muraille', 'fun_addict',
  'globe_trotter', 'matinal', 'insomniaque', 'pigeon_volant', 'roi_du_nul',
  'clown', 'matheux_canape', 'oracle_rate', 'chat_noir', 'tifosi', 'favori_fan'
);

update public.badges set rarity = 'rare' where id in (
  'chambreur', 'on_fire', 'tacleur', 'cible', 'comeback', 'boost_chef',
  'chasseur_cotes', 'outsider', 'centurion', 'invincible', 'match_or',
  'pigeon', 'poisseux', 'galere'
);

update public.badges set rarity = 'epic' where id in (
  'nostradamus', 'jackpot', 'zebre', 'chanceux', 'legende', 'naze'
);

update public.badges set rarity = 'legendary' where id in (
  'patron', 'serial_perdant'
);

-- -----------------------------------------------------------------------------
-- RPC : catalogue complet
-- -----------------------------------------------------------------------------
drop function if exists public.get_all_badges();

create or replace function public.get_all_badges()
returns table (
  badge_id text,
  name text,
  description text,
  icon_name text,
  rarity text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, description, icon_name, rarity
  from public.badges
  order by
    case rarity
      when 'legendary' then 0
      when 'epic' then 1
      when 'rare' then 2
      else 3
    end,
    name asc;
$$;

grant execute on function public.get_all_badges() to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : badges débloqués (profil)
-- -----------------------------------------------------------------------------
drop function if exists public.get_user_unlocked_badges(uuid);

create or replace function public.get_user_unlocked_badges(p_user_id uuid default auth.uid())
returns table (
  badge_id text,
  name text,
  description text,
  icon_name text,
  rarity text,
  unlocked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id as badge_id,
    b.name,
    b.description,
    b.icon_name,
    b.rarity,
    ub.unlocked_at
  from public.user_badges ub
  join public.badges b on b.id = ub.badge_id
  where p_user_id is not null
    and ub.user_id = p_user_id
    and (p_user_id = auth.uid() or auth.uid() is not null)
  order by ub.unlocked_at desc;
$$;

grant execute on function public.get_user_unlocked_badges(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : badges affichés (classement)
-- -----------------------------------------------------------------------------
drop function if exists public.get_users_badges(uuid[]);

create or replace function public.get_users_badges(p_user_ids uuid[])
returns table (
  user_id uuid,
  badge_id text,
  name text,
  description text,
  icon_name text,
  rarity text,
  unlocked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      ub.user_id,
      b.id as badge_id,
      b.name,
      b.description,
      b.icon_name,
      b.rarity,
      ub.unlocked_at,
      p.profile_badge_ids,
      case
        when cardinality(p.profile_badge_ids) > 0 then
          array_position(p.profile_badge_ids, b.id)
        else
          row_number() over (
            partition by ub.user_id
            order by ub.unlocked_at desc
          )::int
      end as display_rank
    from public.user_badges ub
    join public.badges b on b.id = ub.badge_id
    join public.profiles p on p.id = ub.user_id
    where p_user_ids is not null
      and cardinality(p_user_ids) > 0
      and ub.user_id = any(p_user_ids)
      and (
        cardinality(p.profile_badge_ids) = 0
        or b.id = any(p.profile_badge_ids)
      )
  )
  select
    ranked.user_id,
    ranked.badge_id,
    ranked.name,
    ranked.description,
    ranked.icon_name,
    ranked.rarity,
    ranked.unlocked_at
  from ranked
  where ranked.display_rank is not null
    and (
      cardinality(ranked.profile_badge_ids) > 0
      or ranked.display_rank <= 5
    )
  order by ranked.user_id, ranked.display_rank asc;
$$;

grant execute on function public.get_users_badges(uuid[]) to authenticated;

notify pgrst, 'reload schema';
