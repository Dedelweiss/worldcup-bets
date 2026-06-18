-- Admin : redonner le boost x2 ou un tacle Glissé à un joueur.

create or replace function public.admin_restore_user_boost(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boosts integer;
  v_unboosted int := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select boosts_available into v_boosts
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User not found';
  end if;

  if v_boosts >= 1 then
    raise exception 'Boost already available';
  end if;

  with updated as (
    update public.bets
    set is_boosted = false
    where user_id = p_user_id
      and status = 'pending'
      and is_boosted = true
      and bet_type in ('match_result', 'exact_score')
    returning id
  )
  select count(*)::int into v_unboosted from updated;

  update public.profiles
  set boosts_available = 1
  where id = p_user_id;

  return jsonb_build_object(
    'user_id', p_user_id,
    'boosts_available', 1,
    'unboosted_bets', v_unboosted
  );
end;
$$;

grant execute on function public.admin_restore_user_boost(uuid) to authenticated;

create or replace function public.admin_restore_user_tackle(
  p_user_id uuid,
  p_phase public.tackle_phase
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tackle public.tackles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found';
  end if;

  select * into v_tackle
  from public.tackles
  where attacker_id = p_user_id and phase = p_phase
  for update;

  if not found then
    raise exception 'No tackle to restore for this phase';
  end if;

  if v_tackle.is_resolved then
    if v_tackle.attacker_delta <> 0 then
      perform public.apply_tackle_points(
        v_tackle.attacker_id,
        -v_tackle.attacker_delta,
        v_tackle.id,
        v_tackle.match_id,
        case
          when v_tackle.attacker_delta > 0 then 'tackle_penalty'::public.transaction_type
          else 'tackle_bonus'::public.transaction_type
        end
      );
    end if;

    if v_tackle.target_delta <> 0 then
      perform public.apply_tackle_points(
        v_tackle.target_id,
        -v_tackle.target_delta,
        v_tackle.id,
        v_tackle.match_id,
        case
          when v_tackle.target_delta > 0 then 'tackle_penalty'::public.transaction_type
          else 'tackle_bonus'::public.transaction_type
        end
      );
    end if;
  end if;

  delete from public.tackles
  where id = v_tackle.id;

  return jsonb_build_object(
    'user_id', p_user_id,
    'phase', p_phase,
    'tackle_id', v_tackle.id,
    'match_id', v_tackle.match_id,
    'was_resolved', v_tackle.is_resolved
  );
end;
$$;

grant execute on function public.admin_restore_user_tackle(uuid, public.tackle_phase) to authenticated;

notify pgrst, 'reload schema';
