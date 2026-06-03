-- Inclure les admins dans la participation aux paris (ils jouent aussi).

drop function if exists public.get_match_betting_participation(integer);

create or replace function public.get_match_betting_participation(p_match_id integer)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  has_bet boolean,
  has_match_result boolean,
  has_exact_score boolean,
  is_ai boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id as user_id,
    p.username::text,
    p.display_name::text,
    p.avatar_url::text,
    exists (
      select 1
      from public.bets b
      where b.match_id = p_match_id
        and b.user_id = p.id
        and b.status in ('pending', 'won', 'lost')
        and b.bet_type in ('match_result', 'exact_score')
    ) as has_bet,
    exists (
      select 1
      from public.bets b
      where b.match_id = p_match_id
        and b.user_id = p.id
        and b.status in ('pending', 'won', 'lost')
        and b.bet_type = 'match_result'
    ) as has_match_result,
    exists (
      select 1
      from public.bets b
      where b.match_id = p_match_id
        and b.user_id = p.id
        and b.status in ('pending', 'won', 'lost')
        and b.bet_type = 'exact_score'
    ) as has_exact_score,
    coalesce(p.is_ai, false) as is_ai
  from public.profiles p
  cross join lateral (
    select m.kickoff_at
    from public.matches m
    where m.id = p_match_id
  ) match_info
  where
    (p.role in ('user', 'admin') and not coalesce(p.is_ai, false))
    or (
      coalesce(p.is_ai, false)
      and match_info.kickoff_at <= now()
    )
  order by is_ai desc, has_bet desc, coalesce(p.username, p.display_name, p.id::text) asc;
$$;

grant execute on function public.get_match_betting_participation(integer) to authenticated;

notify pgrst, 'reload schema';
