-- Mur des chambrages : messages spontanés de l'IA (rate-limited côté app).

-- -----------------------------------------------------------------------------
-- Chat ouvert : live/terminé OU coup d'envoi passé
-- -----------------------------------------------------------------------------
create or replace function public.post_match_comment(
  p_match_id integer,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_message text;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_message := trim(p_message);
  if char_length(v_message) < 1 then
    raise exception 'Message cannot be empty';
  end if;
  if char_length(v_message) > 500 then
    raise exception 'Message too long (max 500 characters)';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.status in ('postponed', 'cancelled') then
    raise exception 'Chat closed for this match';
  end if;

  if v_match.status not in ('live', 'finished') and v_match.kickoff_at > now() then
    raise exception 'Chat opens when the match starts';
  end if;

  insert into public.match_comments (match_id, user_id, message)
  values (p_match_id, v_user_id, v_message)
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Message IA (service role uniquement)
-- -----------------------------------------------------------------------------
create or replace function public.post_ai_match_comment(
  p_match_id integer,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_message text;
  v_id uuid;
  v_ai_id uuid := public.ai_player_id();
begin
  if not exists (select 1 from public.profiles where id = v_ai_id and is_ai) then
    raise exception 'AI player not configured';
  end if;

  v_message := left(trim(p_message), 500);
  if char_length(v_message) < 1 then
    raise exception 'Message cannot be empty';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.status in ('postponed', 'cancelled') then
    raise exception 'Chat closed for this match';
  end if;

  if v_match.status not in ('live', 'finished') and v_match.kickoff_at > now() then
    raise exception 'Chat not open';
  end if;

  insert into public.match_comments (match_id, user_id, message)
  values (p_match_id, v_ai_id, v_message)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.post_ai_match_comment(integer, text) from public;
grant execute on function public.post_ai_match_comment(integer, text) to service_role;

-- -----------------------------------------------------------------------------
-- Évaluation : l'IA peut-elle poster ? (+ contexte pour le LLM)
-- p_trigger : 'kickoff' (1er message) | 'ambient' (réaction occasionnelle)
-- -----------------------------------------------------------------------------
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
    'recent_messages', v_recent
  );
end;
$$;

revoke all on function public.evaluate_ai_chat(integer, text) from public;
grant execute on function public.evaluate_ai_chat(integer, text) to service_role;

-- Matchs live sans message IA de coup d'envoi
create or replace function public.get_matches_needing_ai_kickoff_chat()
returns table (match_id integer)
language sql
stable
security definer
set search_path = public
as $$
  select m.id as match_id
  from public.matches m
  where m.status in ('live', 'finished')
    and m.status not in ('postponed', 'cancelled')
    and (m.status in ('live', 'finished') or m.kickoff_at <= now())
    and not exists (
      select 1
      from public.match_comments c
      where c.match_id = m.id
        and c.user_id = public.ai_player_id()
    );
$$;

revoke all on function public.get_matches_needing_ai_kickoff_chat() from public;
grant execute on function public.get_matches_needing_ai_kickoff_chat() to service_role;

notify pgrst, 'reload schema';
