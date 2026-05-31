-- Remplace « Le Flambeur » (mises €) par des succès adaptés au système à points

delete from public.user_badges where badge_id = 'flambeur';
delete from public.badges where id = 'flambeur';

insert into public.badges (id, name, description, icon_name) values
  (
    'jackpot',
    'Le Jackpot',
    'A remporté 50 points ou plus sur un seul pari gagnant.',
    'trophy'
  ),
  (
    'chasseur_cotes',
    'Chasseur de cotes',
    'A gagné un pari à une cote ≥ 5,00.',
    'crosshair'
  ),
  (
    'invincible',
    'Invincible',
    'A gagné 5 paris d''affilée.',
    'shield'
  ),
  (
    'centurion',
    'Centurion',
    'A atteint 100 points au classement.',
    'medal'
  ),
  (
    'outsider',
    'L''Outsider',
    'A gagné en pariant sur l''extérieur (2) à une cote ≥ 4,00.',
    'rocket'
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon_name = excluded.icon_name;

-- -----------------------------------------------------------------------------
-- Vérification des conditions (sans mise €)
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
  v_points numeric;
  r record;
begin
  if p_user_id is null then
    return;
  end if;

  if (
    select count(*)::int
    from public.bets
    where user_id = p_user_id
      and bet_type = 'exact_score'
      and status = 'won'
  ) >= 3 then
    perform public.award_badge(p_user_id, 'nostradamus');
  end if;

  if (
    select count(*)::int
    from public.bets
    where user_id = p_user_id
      and bet_type = 'fun'
      and status = 'won'
  ) >= 5 then
    perform public.award_badge(p_user_id, 'fun_expert');
  end if;

  if exists (
    select 1
    from public.bets
    where user_id = p_user_id
      and status = 'won'
      and potential_payout >= 50
  ) then
    perform public.award_badge(p_user_id, 'jackpot');
  end if;

  if exists (
    select 1
    from public.bets
    where user_id = p_user_id
      and status = 'won'
      and odd_at_placement >= 5
  ) then
    perform public.award_badge(p_user_id, 'chasseur_cotes');
  end if;

  if exists (
    select 1
    from public.bets
    where user_id = p_user_id
      and status = 'won'
      and bet_type = 'match_result'
      and (selection ->> 'selection') = 'away'
      and odd_at_placement >= 4
  ) then
    perform public.award_badge(p_user_id, 'outsider');
  end if;

  select points into v_points
  from public.profiles
  where id = p_user_id;

  if coalesce(v_points, 0) >= 100 then
    perform public.award_badge(p_user_id, 'centurion');
  end if;

  for r in
    select b.status
    from public.bets b
    where b.user_id = p_user_id
      and b.status in ('won', 'lost')
      and b.settled_at is not null
    order by b.settled_at asc, b.id asc
  loop
    if r.status = 'lost' then
      v_streak_lost := v_streak_lost + 1;
      if v_streak_lost >= 5 then
        perform public.award_badge(p_user_id, 'chat_noir');
      end if;
      v_streak_won := 0;
    else
      v_streak_won := v_streak_won + 1;
      if v_streak_won >= 5 then
        perform public.award_badge(p_user_id, 'invincible');
      end if;
      v_streak_lost := 0;
    end if;
  end loop;
end;
$$;

create or replace function public.trg_bets_check_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE'
    and OLD.status = 'pending'
    and NEW.status in ('won', 'lost') then
    perform public.check_user_badges(NEW.user_id);
  end if;

  return NEW;
end;
$$;

-- place_bet : sans logique de mise € (stake = 0)
create or replace function public.place_bet(
  p_match_id integer,
  p_bet_type public.bet_type,
  p_selection jsonb,
  p_odd numeric,
  p_stake numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bet_id uuid;
  v_points integer;
  v_match public.matches%rowtype;
  v_selection text;
  v_expected_odd numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.status <> 'scheduled' then
    raise exception 'Betting is closed for this match';
  end if;

  if v_match.kickoff_at <= now() then
    raise exception 'Match has already started';
  end if;

  if p_bet_type = 'match_result' then
    v_selection := p_selection ->> 'selection';
    if v_selection = 'home' then
      v_expected_odd := v_match.odd_home;
    elsif v_selection = 'draw' then
      v_expected_odd := v_match.odd_draw;
    elsif v_selection = 'away' then
      v_expected_odd := v_match.odd_away;
    else
      raise exception 'Invalid selection';
    end if;

    if v_expected_odd is null then
      raise exception 'Odds not available';
    end if;

    if abs(p_odd - v_expected_odd) > 0.01 then
      raise exception 'Odds have changed, please refresh';
    end if;
  end if;

  v_points := public.points_from_odd(p_odd);

  insert into public.bets (
    user_id, match_id, bet_type, selection,
    odd_at_placement, stake, potential_payout
  )
  values (
    v_user_id, p_match_id, p_bet_type, p_selection,
    p_odd, 0, v_points
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

-- Rétro-attribution des nouveaux succès
do $$
declare
  u record;
begin
  for u in select distinct user_id from public.bets where status in ('won', 'lost')
  loop
    perform public.check_user_badges(u.user_id);
  end loop;

  for u in select id as user_id from public.profiles where points >= 100
  loop
    perform public.check_user_badges(u.user_id);
  end loop;
end;
$$;
