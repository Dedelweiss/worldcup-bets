-- Badges fun élargis + choix des badges affichés sur le profil / classement

alter table public.profiles
  add column if not exists profile_badge_ids text[] not null default '{}';

comment on column public.profiles.profile_badge_ids is
  'Badges choisis par le joueur pour l''affichage public (max 5, ordre conservé).';

-- -----------------------------------------------------------------------------
-- Catalogue élargi
-- -----------------------------------------------------------------------------
insert into public.badges (id, name, description, icon_name) values
  ('naze', 'Le Naze', 'A enchaîné 8 paris perdus d''affilée. Autodérision validée.', 'skull'),
  ('galere', 'En galère', '10 défaites consécutives. On pense à toi.', 'anchor'),
  ('poisseux', 'Poissardeux', '20 paris perdus au total. La poisse, c''est un style.', 'cloud-rain'),
  ('pigeon', 'Le Pigeon', '5 paris perdus sur des favoris (cote ≤ 1,50).', 'bird'),
  ('matheux_canape', 'Matheux de canapé', '5 scores exacts ratés. Les maths, c''est pas ton truc.', 'brain'),
  ('clown', 'Le Clown', '5 paris fun perdus. Au moins tu fais rire le groupe.', 'drama'),
  ('oracle_rate', 'L''Oracle à l''envers', '3 scores « presque » (bonne tendance). Presque champion.', 'flip-horizontal'),
  ('tacleur', 'Le Tacleur', '3 tacles réussis. Tu voles les points comme un pro.', 'zap'),
  ('cible', 'La Cible', 'Taclé 3 fois avec perte de points. Tout le monde te vise.', 'target'),
  ('chambreur', 'Le Chambreur', '15 messages sur les murs de match. La chambrerie, c''est toi.', 'message-circle'),
  ('on_fire', 'En Feu', 'A activé le mode On Fire (3 victoires classiques d''affilée).', 'flame'),
  ('match_or', 'Chasseur d''or', 'A gagné sur un Match en Or.', 'gem'),
  ('nuliste', 'Le Nuliste', '5 paris nuls gagnants. Tu sens les matchs sans vainqueur.', 'minus'),
  ('favori_fan', 'Fan des favoris', '8 victoires sur des favoris (cote ≤ 1,60).', 'thumbs-up'),
  ('fun_addict', 'Accro au fun', '15 paris fun placés. Tu ne peux pas t''arrêter.', 'dices'),
  ('debutant', 'Premier pas', 'Premier pari gagné. Bienvenue dans le club.', 'footprints'),
  ('globe_trotter', 'Globe-trotter', 'A parié sur 25 matchs différents.', 'globe'),
  ('muraille', 'La Muraille', '10 paris sur le nul (1N2). Tu y crois dur.', 'shield'),
  ('comeback', 'Le Come-back', 'A gagné juste après 4 défaites d''affilée.', 'refresh-ccw'),
  ('boost_chef', 'Boost Master', 'A gagné avec le joker Boost x2.', 'rocket'),
  ('zebre', 'Le Zèbre', 'Score exact gagnant à une cote ≥ 8,00.', 'sparkles'),
  ('legende', 'La Légende', '200 points au classement.', 'crown'),
  ('patron', 'Le Patron', '300 points. Respect.', 'crown'),
  ('matinal', 'Lève-tôt', 'A parié entre 6h et 8h du matin. Motivé !', 'sun'),
  ('insomniaque', 'L''Insomniaque', 'A parié entre minuit et 5h. Va dormir.', 'moon'),
  ('tifosi', 'Tifosi', '5 victoires avec son équipe favorite sur le terrain.', 'heart'),
  ('pigeon_volant', 'Pigeon voyageur', 'A parié sur l''extérieur à cote ≥ 6 et perdu.', 'bird'),
  ('serial_perdant', 'Serial perdant', '30 paris perdus. Statistiquement impressionnant.', 'ghost'),
  ('roi_du_nul', 'Roi du nul raté', '5 paris nuls perdus. Le 0-0 te hante.', 'laugh'),
  ('chanceux', 'Le Chanceux', '3 victoires à cote ≥ 4,00. Tu joues avec le destin.', 'star')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon_name = excluded.icon_name;

-- -----------------------------------------------------------------------------
-- Vérification des conditions (catalogue complet)
-- -----------------------------------------------------------------------------
create or replace function public.check_user_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak_lost int := 0;
  v_streak_won int := 0;
  v_max_streak_lost int := 0;
  v_points numeric;
  v_prev_lost int := 0;
  r record;
begin
  if p_user_id is null then
    return;
  end if;

  -- Nostradamus
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and bet_type = 'exact_score'
      and status = 'won' and score_precision = 'exact'
  ) >= 3 then
    perform public.award_badge(p_user_id, 'nostradamus');
  end if;

  -- Fun expert
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and bet_type = 'fun' and status = 'won'
  ) >= 5 then
    perform public.award_badge(p_user_id, 'fun_expert');
  end if;

  -- Jackpot
  if exists (
    select 1 from public.bets
    where user_id = p_user_id and status = 'won' and potential_payout >= 50
  ) then
    perform public.award_badge(p_user_id, 'jackpot');
  end if;

  -- Chasseur de cotes
  if exists (
    select 1 from public.bets
    where user_id = p_user_id and status = 'won' and odd_at_placement >= 5
  ) then
    perform public.award_badge(p_user_id, 'chasseur_cotes');
  end if;

  -- Outsider
  if exists (
    select 1 from public.bets
    where user_id = p_user_id and status = 'won' and bet_type = 'match_result'
      and (selection ->> 'selection') = 'away' and odd_at_placement >= 4
  ) then
    perform public.award_badge(p_user_id, 'outsider');
  end if;

  -- Points
  select points into v_points from public.profiles where id = p_user_id;
  if coalesce(v_points, 0) >= 100 then
    perform public.award_badge(p_user_id, 'centurion');
  end if;
  if coalesce(v_points, 0) >= 200 then
    perform public.award_badge(p_user_id, 'legende');
  end if;
  if coalesce(v_points, 0) >= 300 then
    perform public.award_badge(p_user_id, 'patron');
  end if;

  -- Séries gagnées / perdues
  for r in
    select b.status
    from public.bets b
    where b.user_id = p_user_id and b.status in ('won', 'lost')
      and b.settled_at is not null
    order by b.settled_at asc, b.id asc
  loop
    if r.status = 'lost' then
      v_streak_lost := v_streak_lost + 1;
      v_streak_won := 0;
      if v_streak_lost > v_max_streak_lost then
        v_max_streak_lost := v_streak_lost;
      end if;
      if v_streak_lost >= 5 then
        perform public.award_badge(p_user_id, 'chat_noir');
      end if;
      if v_streak_lost >= 8 then
        perform public.award_badge(p_user_id, 'naze');
      end if;
      if v_streak_lost >= 10 then
        perform public.award_badge(p_user_id, 'galere');
      end if;
      v_prev_lost := v_prev_lost + 1;
    else
      if v_prev_lost >= 4 then
        perform public.award_badge(p_user_id, 'comeback');
      end if;
      v_prev_lost := 0;
      v_streak_won := v_streak_won + 1;
      v_streak_lost := 0;
      if v_streak_won >= 5 then
        perform public.award_badge(p_user_id, 'invincible');
      end if;
    end if;
  end loop;

  -- Totaux perdus
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and status = 'lost'
  ) >= 20 then
    perform public.award_badge(p_user_id, 'poisseux');
  end if;

  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and status = 'lost'
  ) >= 30 then
    perform public.award_badge(p_user_id, 'serial_perdant');
  end if;

  -- Pigeon (favoris perdus)
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and status = 'lost'
      and odd_at_placement <= 1.5
  ) >= 5 then
    perform public.award_badge(p_user_id, 'pigeon');
  end if;

  -- Scores exacts ratés
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and bet_type = 'exact_score' and status = 'lost'
  ) >= 5 then
    perform public.award_badge(p_user_id, 'matheux_canape');
  end if;

  -- Fun perdus
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and bet_type = 'fun' and status = 'lost'
  ) >= 5 then
    perform public.award_badge(p_user_id, 'clown');
  end if;

  -- Tendance exact score
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and bet_type = 'exact_score'
      and status = 'won' and score_precision = 'tendance'
  ) >= 3 then
    perform public.award_badge(p_user_id, 'oracle_rate');
  end if;

  -- Tacles
  if (
    select count(*)::int from public.tackles
    where attacker_id = p_user_id and is_resolved and attacker_won = true
  ) >= 3 then
    perform public.award_badge(p_user_id, 'tacleur');
  end if;

  if (
    select count(*)::int from public.tackles
    where target_id = p_user_id and is_resolved and attacker_won = true
  ) >= 3 then
    perform public.award_badge(p_user_id, 'cible');
  end if;

  -- Chambrage
  if (
    select count(*)::int from public.match_comments
    where user_id = p_user_id
  ) >= 15 then
    perform public.award_badge(p_user_id, 'chambreur');
  end if;

  -- Match en or
  if exists (
    select 1 from public.bets b
    join public.matches m on m.id = b.match_id
    where b.user_id = p_user_id and b.status = 'won' and m.is_golden = true
  ) then
    perform public.award_badge(p_user_id, 'match_or');
  end if;

  -- Nuliste
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and status = 'won' and bet_type = 'match_result'
      and (selection ->> 'selection') = 'draw'
  ) >= 5 then
    perform public.award_badge(p_user_id, 'nuliste');
  end if;

  -- Nuls perdus
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and status = 'lost' and bet_type = 'match_result'
      and (selection ->> 'selection') = 'draw'
  ) >= 5 then
    perform public.award_badge(p_user_id, 'roi_du_nul');
  end if;

  -- Favoris gagnants
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and status = 'won' and odd_at_placement <= 1.6
  ) >= 8 then
    perform public.award_badge(p_user_id, 'favori_fan');
  end if;

  -- Fun placés
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and bet_type = 'fun'
  ) >= 15 then
    perform public.award_badge(p_user_id, 'fun_addict');
  end if;

  -- Premier gain
  if exists (
    select 1 from public.bets where user_id = p_user_id and status = 'won'
  ) then
    perform public.award_badge(p_user_id, 'debutant');
  end if;

  -- Matchs distincts
  if (
    select count(distinct match_id)::int from public.bets
    where user_id = p_user_id
  ) >= 25 then
    perform public.award_badge(p_user_id, 'globe_trotter');
  end if;

  -- Paris nuls prédits
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and bet_type = 'match_result'
      and (selection ->> 'selection') = 'draw'
  ) >= 10 then
    perform public.award_badge(p_user_id, 'muraille');
  end if;

  -- Boost gagnant
  if exists (
    select 1 from public.bets
    where user_id = p_user_id and status = 'won' and is_boosted = true
  ) then
    perform public.award_badge(p_user_id, 'boost_chef');
  end if;

  -- Zèbre (score exact haute cote)
  if exists (
    select 1 from public.bets
    where user_id = p_user_id and bet_type = 'exact_score'
      and status = 'won' and odd_at_placement >= 8
  ) then
    perform public.award_badge(p_user_id, 'zebre');
  end if;

  -- Chanceux (3 wins odd >= 4)
  if (
    select count(*)::int from public.bets
    where user_id = p_user_id and status = 'won' and odd_at_placement >= 4
  ) >= 3 then
    perform public.award_badge(p_user_id, 'chanceux');
  end if;

  -- Pigeon voyageur (away high odd lost)
  if exists (
    select 1 from public.bets
    where user_id = p_user_id and status = 'lost' and bet_type = 'match_result'
      and (selection ->> 'selection') = 'away' and odd_at_placement >= 6
  ) then
    perform public.award_badge(p_user_id, 'pigeon_volant');
  end if;

  -- Horaires de pari
  if exists (
    select 1 from public.bets
    where user_id = p_user_id
      and extract(hour from placed_at at time zone 'Europe/Paris') between 0 and 4
  ) then
    perform public.award_badge(p_user_id, 'insomniaque');
  end if;

  if exists (
    select 1 from public.bets
    where user_id = p_user_id
      and extract(hour from placed_at at time zone 'Europe/Paris') between 6 and 7
  ) then
    perform public.award_badge(p_user_id, 'matinal');
  end if;

  -- Tifosi (équipe favorite)
  if (
    select count(*)::int
    from public.bets b
    join public.matches m on m.id = b.match_id
    join public.profiles pr on pr.id = p_user_id
    where b.user_id = p_user_id and b.status = 'won'
      and pr.favorite_team_id is not null
      and pr.favorite_team_id in (m.home_team_id, m.away_team_id)
  ) >= 5 then
    perform public.award_badge(p_user_id, 'tifosi');
  end if;

  -- On Fire (série active ou déjà atteinte)
  if exists (
    select 1 from public.profiles
    where id = p_user_id and (on_fire = true or coalesce(heat_streak, 0) >= 3)
  ) then
    perform public.award_badge(p_user_id, 'on_fire');
  end if;
end;
$$;

-- Badge On Fire à l'activation
create or replace function public.trg_profiles_on_fire_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.on_fire = true and coalesce(OLD.on_fire, false) = false then
    perform public.award_badge(NEW.id, 'on_fire');
  end if;
  if coalesce(NEW.points, 0) >= 100 and coalesce(OLD.points, 0) < 100 then
    perform public.check_user_badges(NEW.id);
  elsif coalesce(NEW.points, 0) >= 200 or coalesce(NEW.points, 0) >= 300 then
    perform public.check_user_badges(NEW.id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_badges_on_update on public.profiles;
create trigger profiles_badges_on_update
  after update of on_fire, points on public.profiles
  for each row
  execute function public.trg_profiles_on_fire_badge();

-- -----------------------------------------------------------------------------
-- RPC : tous les badges débloqués (page profil)
-- -----------------------------------------------------------------------------
create or replace function public.get_user_unlocked_badges(p_user_id uuid default auth.uid())
returns table (
  badge_id text,
  name text,
  description text,
  icon_name text,
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
-- RPC : catalogue complet (profil)
-- -----------------------------------------------------------------------------
create or replace function public.get_all_badges()
returns table (
  badge_id text,
  name text,
  description text,
  icon_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, description, icon_name
  from public.badges
  order by name asc;
$$;

grant execute on function public.get_all_badges() to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : choix des badges affichés
-- -----------------------------------------------------------------------------
create or replace function public.set_profile_badges(p_badge_ids text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_clean text[] := '{}';
  v_id text;
  v_count int := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_badge_ids is null then
    p_badge_ids := '{}';
  end if;

  foreach v_id in array p_badge_ids loop
    if v_id is null or btrim(v_id) = '' then
      continue;
    end if;
    if v_id = any(v_clean) then
      continue;
    end if;
    if not exists (
      select 1 from public.user_badges
      where user_id = v_user_id and badge_id = v_id
    ) then
      raise exception 'Badge non débloqué : %', v_id;
    end if;
    v_count := v_count + 1;
    if v_count > 5 then
      raise exception 'Maximum 5 badges sur le profil';
    end if;
    v_clean := array_append(v_clean, v_id);
  end loop;

  update public.profiles
  set profile_badge_ids = v_clean, updated_at = now()
  where id = v_user_id;

  return v_clean;
end;
$$;

grant execute on function public.set_profile_badges(text[]) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : badges affichés (classement) — choix joueur ou 5 derniers débloqués
-- -----------------------------------------------------------------------------
create or replace function public.get_users_badges(p_user_ids uuid[])
returns table (
  user_id uuid,
  badge_id text,
  name text,
  description text,
  icon_name text,
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
    ranked.unlocked_at
  from ranked
  where ranked.display_rank is not null
    and (
      cardinality(ranked.profile_badge_ids) > 0
      or ranked.display_rank <= 5
    )
  order by ranked.user_id, ranked.display_rank asc;
$$;

-- Rétro-attribution
do $$
declare
  u record;
begin
  for u in select distinct user_id from public.bets where status in ('won', 'lost')
  loop
    perform public.check_user_badges(u.user_id);
  end loop;

  for u in select id as user_id from public.profiles
  loop
    perform public.check_user_badges(u.user_id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
