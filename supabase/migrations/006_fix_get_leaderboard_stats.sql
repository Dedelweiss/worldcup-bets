-- Recrée get_leaderboard_stats pour le classement enrichi
-- PRÉREQUIS : 004a_add_bet_type_fun.sql doit déjà être exécuté (valeur enum 'fun')
-- Exécuter si erreur "Could not find the function public.get_leaderboard_stats"

drop function if exists public.get_leaderboard_stats();

create or replace function public.get_leaderboard_stats()
returns table (
  id uuid,
  display_name text,
  username text,
  balance numeric,
  classic_won bigint,
  classic_lost bigint,
  fun_won bigint,
  fun_lost bigint,
  total_won bigint,
  total_lost bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    p.username,
    p.balance,
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
    coalesce(sum(case when b.status = 'lost' then 1 else 0 end), 0)::bigint as total_lost
  from public.profiles p
  left join public.bets b on b.user_id = p.id
  group by p.id, p.display_name, p.username, p.balance
  order by p.balance desc;
$$;

grant execute on function public.get_leaderboard_stats() to authenticated;

notify pgrst, 'reload schema';
