-- Équipe favorite : choix unique par joueur, bonus si vainqueur de la Coupe du Monde.

alter type public.transaction_type add value if not exists 'favorite_team_bonus';

alter table public.profiles
  add column if not exists favorite_team_id integer references public.teams (id) on delete set null,
  add column if not exists favorite_team_chosen_at timestamptz;

comment on column public.profiles.favorite_team_id is 'Équipe favorite (choix définitif, une seule fois).';
comment on column public.profiles.favorite_team_chosen_at is 'Date du choix de l''équipe favorite.';

create table if not exists public.tournament_config (
  id smallint primary key default 1 check (id = 1),
  world_cup_winner_team_id integer references public.teams (id) on delete set null,
  favorite_team_bonus_points integer not null default 100 check (favorite_team_bonus_points > 0),
  favorite_bonus_settled_at timestamptz
);

insert into public.tournament_config (id)
values (1)
on conflict (id) do nothing;

alter table public.tournament_config enable row level security;

drop policy if exists "Tournament config readable" on public.tournament_config;
create policy "Tournament config readable"
  on public.tournament_config for select to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- Choisir son équipe favorite (une seule fois)
-- -----------------------------------------------------------------------------
create or replace function public.set_favorite_team(p_team_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.teams
    where id = p_team_id and tournament_group_id is not null
  ) then
    raise exception 'Invalid tournament team';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_user_id and favorite_team_id is not null
  ) then
    raise exception 'Favorite team already chosen';
  end if;

  update public.profiles
  set
    favorite_team_id = p_team_id,
    favorite_team_chosen_at = now()
  where id = v_user_id;
end;
$$;

grant execute on function public.set_favorite_team(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Admin : désigner le champion du monde et créditer les joueurs concernés
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_world_cup_winner(
  p_team_id integer,
  p_bonus_points integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.tournament_config%rowtype;
  v_bonus integer;
  v_profile record;
  v_points numeric;
  v_awarded int := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if not exists (
    select 1 from public.teams
    where id = p_team_id and tournament_group_id is not null
  ) then
    raise exception 'Invalid tournament team';
  end if;

  select * into v_config from public.tournament_config where id = 1 for update;

  if v_config.favorite_bonus_settled_at is not null then
    raise exception 'World Cup winner already settled';
  end if;

  v_bonus := coalesce(p_bonus_points, v_config.favorite_team_bonus_points);

  if v_bonus < 1 then
    raise exception 'Bonus points must be at least 1';
  end if;

  update public.tournament_config
  set
    world_cup_winner_team_id = p_team_id,
    favorite_team_bonus_points = v_bonus,
    favorite_bonus_settled_at = now()
  where id = 1;

  for v_profile in
    select id from public.profiles
    where favorite_team_id = p_team_id
  loop
    select points into v_points
    from public.profiles
    where id = v_profile.id
    for update;

    update public.profiles
    set points = points + v_bonus
    where id = v_profile.id;

    insert into public.transactions (user_id, type, amount, balance_after, metadata)
    values (
      v_profile.id,
      'favorite_team_bonus',
      v_bonus,
      v_points + v_bonus,
      jsonb_build_object(
        'unit', 'points',
        'team_id', p_team_id,
        'reason', 'world_cup_winner'
      )
    );

    v_awarded := v_awarded + 1;
  end loop;

  return jsonb_build_object(
    'winner_team_id', p_team_id,
    'bonus_points', v_bonus,
    'players_awarded', v_awarded
  );
end;
$$;

grant execute on function public.admin_set_world_cup_winner(integer, integer) to authenticated;

-- Reset app : équipes favorites + config tournoi
create or replace function public.admin_reset_app(
  p_delete_matches boolean default false,
  p_starting_balance numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bets_deleted bigint;
  v_tx_deleted bigint;
  v_fun_deleted bigint;
  v_comments_deleted bigint;
  v_badges_deleted bigint;
  v_matches_reset bigint;
  v_matches_deleted bigint;
  v_profiles_reset bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_starting_balance < 0 then
    raise exception 'Starting points must be >= 0';
  end if;

  delete from public.transactions where true;
  get diagnostics v_tx_deleted = row_count;

  delete from public.bets where true;
  get diagnostics v_bets_deleted = row_count;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'match_comments'
  ) then
    delete from public.match_comments where true;
    get diagnostics v_comments_deleted = row_count;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'fun_markets'
  ) then
    delete from public.fun_markets where true;
    get diagnostics v_fun_deleted = row_count;
  else
    v_fun_deleted := 0;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'bet_markets'
  ) then
    delete from public.bet_markets where true;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_badges'
  ) then
    delete from public.user_badges where true;
    get diagnostics v_badges_deleted = row_count;
  else
    v_badges_deleted := 0;
  end if;

  if p_delete_matches then
    delete from public.matches where true;
    get diagnostics v_matches_deleted = row_count;
    v_matches_reset := 0;
  else
    update public.matches
    set
      status = 'scheduled',
      home_score = null,
      away_score = null,
      settled_at = null,
      is_golden = false
    where id is not null;
    get diagnostics v_matches_reset = row_count;
    v_matches_deleted := 0;
  end if;

  update public.tournament_config
  set
    world_cup_winner_team_id = null,
    favorite_bonus_settled_at = null
  where id = 1;

  update public.profiles
  set
    points = p_starting_balance,
    boosts_available = 1,
    heat_streak = 0,
    on_fire = false,
    last_heat_match_id = null,
    favorite_team_id = null,
    favorite_team_chosen_at = null
  where id is not null;
  get diagnostics v_profiles_reset = row_count;

  return jsonb_build_object(
    'transactions_deleted', v_tx_deleted,
    'bets_deleted', v_bets_deleted,
    'match_comments_deleted', coalesce(v_comments_deleted, 0),
    'fun_markets_deleted', coalesce(v_fun_deleted, 0),
    'user_badges_deleted', coalesce(v_badges_deleted, 0),
    'matches_reset', v_matches_reset,
    'matches_deleted', v_matches_deleted,
    'profiles_reset', v_profiles_reset,
    'starting_points', p_starting_balance
  );
end;
$$;

notify pgrst, 'reload schema';
