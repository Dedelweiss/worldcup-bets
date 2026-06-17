-- Tout admin peut modifier/supprimer un pari fun ouvert (pas seulement le créateur).

create or replace function public.admin_update_fun_market(
  p_market_id uuid,
  p_question text,
  p_odd_yes numeric,
  p_odd_no numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.fun_markets%rowtype;
  v_question text;
  v_bet record;
  v_expected_odd numeric;
  v_points integer;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  v_question := trim(p_question);
  if char_length(v_question) < 3 then
    raise exception 'Question too short';
  end if;

  if p_odd_yes < 1.01 or p_odd_no < 1.01 then
    raise exception 'Invalid odds';
  end if;

  select * into v_market
  from public.fun_markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Fun market not found';
  end if;

  if v_market.status <> 'open' then
    raise exception 'Only open fun markets can be edited';
  end if;

  update public.fun_markets
  set
    question = v_question,
    odd_yes = p_odd_yes,
    odd_no = p_odd_no
  where id = p_market_id;

  for v_bet in
    select *
    from public.bets
    where bet_type = 'fun'
      and status = 'pending'
      and (
        fun_market_id = p_market_id
        or market_id = p_market_id
      )
    for update
  loop
    v_expected_odd := case
      when (v_bet.selection ->> 'outcome') = 'yes' then p_odd_yes
      when (v_bet.selection ->> 'outcome') = 'no' then p_odd_no
      else null
    end;

    if v_expected_odd is null then
      continue;
    end if;

    v_points := public.points_from_odd(v_expected_odd);

    update public.bets
    set
      odd_at_placement = v_expected_odd,
      potential_payout = v_points
    where id = v_bet.id;
  end loop;
end;
$$;

create or replace function public.admin_delete_fun_market(p_market_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.fun_markets%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_market
  from public.fun_markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Fun market not found';
  end if;

  if v_market.status = 'settled' then
    raise exception 'Settled fun markets cannot be deleted';
  end if;

  delete from public.bets
  where bet_type = 'fun'
    and status = 'pending'
    and (
      fun_market_id = p_market_id
      or market_id = p_market_id
    );

  delete from public.fun_markets where id = p_market_id;
end;
$$;

grant execute on function public.admin_update_fun_market(uuid, text, numeric, numeric) to authenticated;
grant execute on function public.admin_delete_fun_market(uuid) to authenticated;

notify pgrst, 'reload schema';
