-- Annulation d'un pari en attente par le joueur (avant coup d'envoi / marché fun ouvert).

create or replace function public.cancel_pending_bet(p_bet_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bet public.bets%rowtype;
  v_match public.matches%rowtype;
  v_fun_status public.fun_market_status;
  v_fun_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_bet
  from public.bets
  where id = p_bet_id
  for update;

  if not found then
    raise exception 'Bet not found';
  end if;

  if v_bet.user_id <> v_user_id then
    raise exception 'Not allowed';
  end if;

  if v_bet.status <> 'pending' then
    raise exception 'Only pending bets can be cancelled';
  end if;

  select * into v_match from public.matches where id = v_bet.match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.status <> 'scheduled' then
    raise exception 'Betting is closed for this match';
  end if;

  if v_match.kickoff_at <= now() then
    raise exception 'Match has already started';
  end if;

  if v_bet.bet_type = 'fun' then
    v_fun_id := coalesce(
      v_bet.fun_market_id,
      v_bet.market_id,
      (v_bet.selection ->> 'fun_market_id')::uuid
    );

    if v_fun_id is null then
      raise exception 'Fun market not found';
    end if;

    select status into v_fun_status
    from public.fun_markets
    where id = v_fun_id;

    if not found or v_fun_status <> 'open' then
      raise exception 'Fun betting is closed';
    end if;
  elsif v_bet.bet_type not in ('match_result', 'exact_score') then
    raise exception 'Unsupported bet type';
  end if;

  if coalesce(v_bet.is_boosted, false) then
    update public.profiles
    set boosts_available = boosts_available + 1
    where id = v_user_id;
  end if;

  delete from public.bets where id = p_bet_id;
end;
$$;

grant execute on function public.cancel_pending_bet(uuid) to authenticated;

notify pgrst, 'reload schema';
