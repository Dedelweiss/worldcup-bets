-- Classement : exposer l'URL d'avatar affichable (prédéfini, custom Storage, legacy)

create or replace function public.profile_display_avatar_url(
  p_avatar_id text,
  p_avatar_url text
)
returns text
language sql
stable
as $$
  select case
    when coalesce(p_avatar_id, '') = 'custom' then nullif(trim(p_avatar_url), '')
    when nullif(trim(coalesce(p_avatar_id, '')), '') <> '' then
      public.avatar_url_from_id(p_avatar_id)
    else nullif(trim(p_avatar_url), '')
  end;
$$;

drop function if exists public.get_leaderboard_filtered(uuid, text);

create or replace function public.get_leaderboard_filtered(
  p_league_id uuid default null,
  p_sort_by text default 'points'
)
returns table (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  balance numeric,
  classic_won bigint,
  classic_lost bigint,
  fun_won bigint,
  fun_lost bigint,
  total_won bigint,
  total_lost bigint,
  on_fire boolean,
  heat_streak integer,
  is_ai boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with stats as (
    select
      p.id,
      p.display_name,
      p.username,
      public.profile_display_avatar_url(p.avatar_id, p.avatar_url) as avatar_url,
      p.points as balance,
      coalesce(
        sum(
          case
            when b.bet_type in ('match_result', 'exact_score', 'goalscorer')
              and b.status = 'won'
            then 1
            else 0
          end
        ),
        0
      )::bigint as classic_won,
      coalesce(
        sum(
          case
            when b.bet_type in ('match_result', 'exact_score', 'goalscorer')
              and b.status = 'lost'
            then 1
            else 0
          end
        ),
        0
      )::bigint as classic_lost,
      coalesce(
        sum(case when b.bet_type = 'fun' and b.status = 'won' then 1 else 0 end),
        0
      )::bigint as fun_won,
      coalesce(
        sum(case when b.bet_type = 'fun' and b.status = 'lost' then 1 else 0 end),
        0
      )::bigint as fun_lost,
      coalesce(sum(case when b.status = 'won' then 1 else 0 end), 0)::bigint as total_won,
      coalesce(sum(case when b.status = 'lost' then 1 else 0 end), 0)::bigint as total_lost,
      coalesce(p.on_fire, false) as on_fire,
      coalesce(p.heat_streak, 0) as heat_streak,
      coalesce(p.is_ai, false) as is_ai
    from public.profiles p
    left join public.bets b on b.user_id = p.id
    where
      p_league_id is null
      or p.id in (
        select lm.user_id
        from public.league_members lm
        where lm.league_id = p_league_id
      )
    group by
      p.id,
      p.display_name,
      p.username,
      p.avatar_id,
      p.avatar_url,
      p.points,
      p.on_fire,
      p.heat_streak,
      p.is_ai
  )
  select *
  from stats
  order by
    case coalesce(p_sort_by, 'points')
      when 'classic_won' then classic_won
      when 'fun_won' then fun_won
      else balance
    end desc nulls last,
    balance desc;
$$;

grant execute on function public.get_leaderboard_filtered(uuid, text) to authenticated;

notify pgrst, 'reload schema';
