-- Contexte chat IA : inclure le score exact parié pour rester cohérent avec le prono.

create or replace function public.evaluate_ai_chat(p_match_id integer, p_trigger text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_ai_id uuid := public.ai_player_id();
  v_ai_count int;
  v_last_ai_at timestamptz;
  v_human_since int;
  v_recent jsonb;
  v_ht text;
  v_at text;
  v_ai_bet_home int;
  v_ai_bet_away int;
  v_max_messages constant int := 3;
  v_min_interval interval := interval '15 minutes';
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found then
    return jsonb_build_object('eligible', false, 'reason', 'match_not_found');
  end if;

  if v_match.status in ('postponed', 'cancelled') then
    return jsonb_build_object('eligible', false, 'reason', 'chat_closed');
  end if;

  if v_match.status not in ('live', 'finished') and v_match.kickoff_at > now() then
    return jsonb_build_object('eligible', false, 'reason', 'chat_not_open');
  end if;

  select
    (b.selection ->> 'home')::int,
    (b.selection ->> 'away')::int
  into v_ai_bet_home, v_ai_bet_away
  from public.bets b
  where b.match_id = p_match_id
    and b.user_id = v_ai_id
    and b.bet_type = 'exact_score'
    and b.status in ('pending', 'won', 'lost')
  order by b.created_at desc
  limit 1;

  select count(*), max(created_at)
  into v_ai_count, v_last_ai_at
  from public.match_comments
  where match_id = p_match_id and user_id = v_ai_id;

  if v_ai_count >= v_max_messages then
    return jsonb_build_object('eligible', false, 'reason', 'max_messages', 'ai_count', v_ai_count);
  end if;

  if p_trigger = 'kickoff' then
    if v_ai_count > 0 then
      return jsonb_build_object('eligible', false, 'reason', 'kickoff_already_sent', 'ai_count', v_ai_count);
    end if;
    if v_ai_bet_home is null or v_ai_bet_away is null then
      return jsonb_build_object('eligible', false, 'reason', 'no_ai_bet');
    end if;
  elsif p_trigger = 'ambient' then
    if v_match.status not in ('live', 'finished') then
      return jsonb_build_object('eligible', false, 'reason', 'not_live');
    end if;
    if v_last_ai_at is not null and v_last_ai_at > now() - v_min_interval then
      return jsonb_build_object('eligible', false, 'reason', 'too_soon', 'ai_count', v_ai_count);
    end if;
    select count(*) into v_human_since
    from public.match_comments c
    where c.match_id = p_match_id
      and c.user_id <> v_ai_id
      and c.created_at > coalesce(v_last_ai_at, '1970-01-01'::timestamptz);

    if v_human_since < 2 then
      return jsonb_build_object('eligible', false, 'reason', 'not_enough_human_chat', 'human_since', v_human_since);
    end if;
  else
    return jsonb_build_object('eligible', false, 'reason', 'invalid_trigger');
  end if;

  select ht.name, at.name into v_ht, v_at
  from public.teams ht, public.teams at
  where ht.id = v_match.home_team_id and at.id = v_match.away_team_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'author', coalesce(p.username, p.display_name, 'Joueur'),
      'message', c.message,
      'is_ai', coalesce(p.is_ai, false)
    ) order by c.created_at desc
  ), '[]'::jsonb)
  into v_recent
  from (
    select c.*
    from public.match_comments c
    where c.match_id = p_match_id
    order by c.created_at desc
    limit 6
  ) c
  join public.profiles p on p.id = c.user_id;

  return jsonb_build_object(
    'eligible', true,
    'trigger', p_trigger,
    'ai_count', v_ai_count,
    'match_label', v_ht || ' vs ' || v_at,
    'status', v_match.status,
    'home_score', v_match.home_score,
    'away_score', v_match.away_score,
    'ai_bet_home', v_ai_bet_home,
    'ai_bet_away', v_ai_bet_away,
    'recent_messages', v_recent
  );
end;
$$;

notify pgrst, 'reload schema';
