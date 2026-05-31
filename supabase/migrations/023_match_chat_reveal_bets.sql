-- Chat par match + révélation des paris après le coup d'envoi

-- -----------------------------------------------------------------------------
-- Table match_comments
-- -----------------------------------------------------------------------------
create table public.match_comments (
  id uuid primary key default gen_random_uuid(),
  match_id integer not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  constraint match_comments_message_length check (
    char_length(trim(message)) between 1 and 500
  )
);

create index match_comments_match_id_created_idx
  on public.match_comments (match_id, created_at asc);

comment on table public.match_comments is
  'Fil de discussion temps réel par match (après coup d''envoi)';

-- -----------------------------------------------------------------------------
-- RLS paris : visibles par tous une fois le match commencé
-- -----------------------------------------------------------------------------
drop policy if exists "Users view bets on live matches" on public.bets;

create policy "Users view bets after kickoff"
  on public.bets for select to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = bets.match_id
        and m.kickoff_at <= now()
    )
  );

-- -----------------------------------------------------------------------------
-- RLS chat
-- -----------------------------------------------------------------------------
alter table public.match_comments enable row level security;

create policy "Read comments after kickoff"
  on public.match_comments for select to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_comments.match_id
        and m.kickoff_at <= now()
    )
  );

create policy "Users insert own comments after kickoff"
  on public.match_comments for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.matches m
      where m.id = match_id
        and m.kickoff_at <= now()
    )
  );

-- -----------------------------------------------------------------------------
-- Envoyer un message (validation serveur)
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

  if v_match.kickoff_at > now() then
    raise exception 'Chat opens when the match starts';
  end if;

  insert into public.match_comments (match_id, user_id, message)
  values (p_match_id, v_user_id, v_message)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.post_match_comment(integer, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
alter table public.match_comments replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.match_comments;
exception
  when duplicate_object then
    null;
end $$;

-- -----------------------------------------------------------------------------
-- Reset app : effacer les commentaires
-- -----------------------------------------------------------------------------
create or replace function public.admin_reset_app(
  p_starting_balance numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bets_deleted bigint;
  v_fun_deleted bigint;
  v_comments_deleted bigint;
  v_profiles_reset bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_starting_balance < 0 then
    raise exception 'Starting points must be >= 0';
  end if;

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
  end if;

  delete from public.transactions where true;

  update public.profiles
  set points = p_starting_balance,
      boosts_available = 1;
  get diagnostics v_profiles_reset = row_count;

  return jsonb_build_object(
    'bets_deleted', v_bets_deleted,
    'match_comments_deleted', coalesce(v_comments_deleted, 0),
    'fun_markets_deleted', coalesce(v_fun_deleted, 0),
    'profiles_reset', v_profiles_reset,
    'starting_points', p_starting_balance
  );
end;
$$;

notify pgrst, 'reload schema';
