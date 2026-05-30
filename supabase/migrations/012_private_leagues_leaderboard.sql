-- Ligues privées (≠ tournament_groups = poules CDM, ≠ groups legacy)
-- Classement filtré par ligue et tri dynamique

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  slug text unique not null,
  invite_code text unique not null default encode(gen_random_bytes(6), 'hex'),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index league_members_user_id_idx on public.league_members (user_id);
create index leagues_created_by_idx on public.leagues (created_by);

comment on table public.leagues is 'Ligues privées entre amis (code invitation pour rejoindre — futur)';
comment on column public.leagues.invite_code is 'Code à partager pour rejoindre la ligue (join_league_by_code — à venir)';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

create policy "Leagues visible to members and admins"
  on public.leagues for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.league_members lm
      where lm.league_id = leagues.id and lm.user_id = auth.uid()
    )
    or created_by = auth.uid()
  );

create policy "Admins manage leagues"
  on public.leagues for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "League members visible to league peers"
  on public.league_members for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.league_members lm
      where lm.league_id = league_members.league_id and lm.user_id = auth.uid()
    )
  );

create policy "Admins manage league members"
  on public.league_members for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RPC : créer une ligue (admin)
-- -----------------------------------------------------------------------------
create or replace function public.admin_create_league(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
  v_base text;
  v_suffix int := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  v_base := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  if v_base = '' then
    v_base := 'ligue';
  end if;
  v_slug := v_base;

  while exists (select 1 from public.leagues where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  end loop;

  insert into public.leagues (name, slug, created_by)
  values (trim(p_name), v_slug, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.admin_create_league(text) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : remplacer les membres d'une ligue (admin)
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_league_members(
  p_league_id uuid,
  p_user_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if not exists (select 1 from public.leagues where id = p_league_id) then
    raise exception 'League not found';
  end if;

  delete from public.league_members where league_id = p_league_id;

  insert into public.league_members (league_id, user_id)
  select p_league_id, uid
  from unnest(coalesce(p_user_ids, array[]::uuid[])) as uid
  where uid is not null
  on conflict do nothing;

  get diagnostics v_count = row_count;

  return jsonb_build_object('league_id', p_league_id, 'members_count', v_count);
end;
$$;

grant execute on function public.admin_set_league_members(uuid, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : supprimer une ligue (admin)
-- -----------------------------------------------------------------------------
create or replace function public.admin_delete_league(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  delete from public.leagues where id = p_league_id;
end;
$$;

grant execute on function public.admin_delete_league(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : classement filtré (ligue optionnelle + tri)
-- p_sort_by : balance | classic_won | fun_won
-- -----------------------------------------------------------------------------
create or replace function public.get_leaderboard_filtered(
  p_league_id uuid default null,
  p_sort_by text default 'balance'
)
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
  with stats as (
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
    where
      p_league_id is null
      or p.id in (
        select lm.user_id
        from public.league_members lm
        where lm.league_id = p_league_id
      )
    group by p.id, p.display_name, p.username, p.balance
  )
  select *
  from stats
  order by
    case coalesce(p_sort_by, 'balance')
      when 'classic_won' then classic_won
      when 'fun_won' then fun_won
      else balance
    end desc nulls last,
    balance desc,
    total_won desc;
$$;

grant execute on function public.get_leaderboard_filtered(uuid, text) to authenticated;

-- Futur : rejoindre une ligue par code (utilisateur standard)
create or replace function public.join_league_by_invite_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_league_id
  from public.leagues
  where invite_code = lower(trim(p_code));

  if v_league_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.league_members (league_id, user_id)
  values (v_league_id, v_user_id)
  on conflict do nothing;

  return v_league_id;
end;
$$;

grant execute on function public.join_league_by_invite_code(text) to authenticated;

-- Nettoyage suppression utilisateur (complète 008)
create or replace function public.admin_delete_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bets bigint;
  v_tx bigint;
  v_members bigint;
  v_groups bigint;
  v_leagues bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  delete from public.bets where user_id = p_user_id;
  get diagnostics v_bets = row_count;

  delete from public.transactions where user_id = p_user_id;
  get diagnostics v_tx = row_count;

  delete from public.league_members where user_id = p_user_id;
  get diagnostics v_members = row_count;

  delete from public.group_members where user_id = p_user_id;

  delete from public.leagues where created_by = p_user_id;
  get diagnostics v_leagues = row_count;

  delete from public.groups where owner_id = p_user_id;
  get diagnostics v_groups = row_count;

  delete from public.profiles where id = p_user_id;

  return jsonb_build_object(
    'bets_deleted', v_bets,
    'transactions_deleted', v_tx,
    'league_members_deleted', v_members,
    'leagues_deleted', v_leagues,
    'groups_deleted', v_groups
  );
end;
$$;

notify pgrst, 'reload schema';
