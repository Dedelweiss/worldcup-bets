-- Participation aux paris fun : qui a parié (sans révéler Oui/Non).

create or replace function public.get_match_fun_market_participation(p_match_id integer)
returns table (
  fun_market_id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_ai boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select distinct on (coalesce(b.fun_market_id, b.market_id), b.user_id)
    coalesce(b.fun_market_id, b.market_id) as fun_market_id,
    b.user_id,
    p.username::text,
    p.display_name::text,
    p.avatar_url::text,
    coalesce(p.is_ai, false) as is_ai
  from public.bets b
  join public.profiles p on p.id = b.user_id
  join public.fun_markets fm
    on fm.id = coalesce(b.fun_market_id, b.market_id)
  where b.match_id = p_match_id
    and fm.match_id = p_match_id
    and b.bet_type = 'fun'
    and b.status in ('pending', 'won', 'lost')
    and auth.uid() is not null
  order by
    coalesce(b.fun_market_id, b.market_id),
    b.user_id,
    b.placed_at asc;
$$;

comment on function public.get_match_fun_market_participation(integer) is
  'Liste les joueurs ayant parié sur chaque marché fun du match, sans exposer Oui/Non.';

grant execute on function public.get_match_fun_market_participation(integer) to authenticated;

notify pgrst, 'reload schema';
