-- Participation aux paris classiques par match (sans révéler les pronostics avant le coup d'envoi).

create or replace function public.get_match_betting_participation(p_match_id integer)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  has_bet boolean,
  has_match_result boolean,
  has_exact_score boolean
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
        and b.status = 'pending'
        and b.bet_type in ('match_result', 'exact_score')
    ) as has_bet,
    exists (
      select 1
      from public.bets b
      where b.match_id = p_match_id
        and b.user_id = p.id
        and b.status = 'pending'
        and b.bet_type = 'match_result'
    ) as has_match_result,
    exists (
      select 1
      from public.bets b
      where b.match_id = p_match_id
        and b.user_id = p.id
        and b.status = 'pending'
        and b.bet_type = 'exact_score'
    ) as has_exact_score
  from public.profiles p
  where p.role = 'user'
  order by has_bet desc, coalesce(p.username, p.display_name, p.id::text) asc;
$$;

comment on function public.get_match_betting_participation(integer) is
  'Liste joueurs ayant (ou non) un pari classique en attente sur le match — sans exposer le pronostic.';

grant execute on function public.get_match_betting_participation(integer) to authenticated;

notify pgrst, 'reload schema';
