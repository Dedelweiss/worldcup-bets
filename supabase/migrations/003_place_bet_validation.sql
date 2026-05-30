-- Renforce place_bet : vérifie match ouvert, cote cohérente, mise minimale

create or replace function public.place_bet(
  p_match_id integer,
  p_bet_type public.bet_type,
  p_selection jsonb,
  p_odd numeric,
  p_stake numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_bet_id uuid;
  v_payout numeric;
  v_match public.matches%rowtype;
  v_selection text;
  v_expected_odd numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_stake < 1 then
    raise exception 'Minimum stake is 1';
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

  select balance into v_balance from public.profiles where id = v_user_id for update;
  if v_balance < p_stake then
    raise exception 'Insufficient balance';
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

  v_payout := round(p_stake * p_odd, 2);

  update public.profiles
  set balance = balance - p_stake
  where id = v_user_id;

  insert into public.bets (
    user_id, match_id, bet_type, selection,
    odd_at_placement, stake, potential_payout
  )
  values (
    v_user_id, p_match_id, p_bet_type, p_selection,
    p_odd, p_stake, v_payout
  )
  returning id into v_bet_id;

  insert into public.transactions (user_id, type, amount, balance_after, bet_id)
  values (
    v_user_id,
    'bet_stake',
    -p_stake,
    v_balance - p_stake,
    v_bet_id
  );

  return v_bet_id;
end;
$$;
