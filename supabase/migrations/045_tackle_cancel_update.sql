-- Tacle Glissé : annulation et changement de cible avant coup d'envoi

create or replace function public.assert_tackle_editable(
  p_tackle_id uuid,
  p_user_id uuid
)
returns public.tackles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tackle public.tackles;
  v_match public.matches%rowtype;
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_tackle
  from public.tackles
  where id = p_tackle_id
  for update;

  if not found then
    raise exception 'Tackle not found';
  end if;

  if v_tackle.attacker_id <> p_user_id then
    raise exception 'Not your tackle';
  end if;

  if v_tackle.is_resolved then
    raise exception 'Tackle already resolved';
  end if;

  select * into v_match
  from public.matches
  where id = v_tackle.match_id;

  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.status <> 'scheduled' then
    raise exception 'Tackle only allowed before match starts';
  end if;

  if v_match.kickoff_at <= now() then
    raise exception 'Tackle closed: kickoff has passed';
  end if;

  return v_tackle;
end;
$$;

create or replace function public.assert_tackle_target_valid(
  p_match_id integer,
  p_attacker_id uuid,
  p_target_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_target_id = p_attacker_id then
    raise exception 'Cannot tackle yourself';
  end if;

  if not exists (
    select 1 from public.bets b
    where b.match_id = p_match_id
      and b.user_id = p_attacker_id
      and b.status = 'pending'
      and b.bet_type in ('match_result', 'exact_score')
  ) then
    raise exception 'You must have a classic bet on this match to tackle';
  end if;

  if not exists (
    select 1 from public.bets b
    where b.match_id = p_match_id
      and b.user_id = p_target_id
      and b.status = 'pending'
      and b.bet_type in ('match_result', 'exact_score')
  ) then
    raise exception 'Target has no classic bet on this match';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- cancel_tackle
-- -----------------------------------------------------------------------------
create or replace function public.cancel_tackle(p_tackle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_tackle_editable(p_tackle_id, auth.uid());

  delete from public.tackles
  where id = p_tackle_id;
end;
$$;

grant execute on function public.cancel_tackle(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- update_tackle : changer la cible
-- -----------------------------------------------------------------------------
create or replace function public.update_tackle(
  p_tackle_id uuid,
  p_target_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tackle public.tackles;
begin
  v_tackle := public.assert_tackle_editable(p_tackle_id, v_user_id);

  if p_target_id = v_tackle.target_id then
    raise exception 'Target unchanged';
  end if;

  perform public.assert_tackle_target_valid(
    v_tackle.match_id,
    v_user_id,
    p_target_id
  );

  update public.tackles
  set target_id = p_target_id
  where id = p_tackle_id;

  return p_tackle_id;
end;
$$;

grant execute on function public.update_tackle(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
