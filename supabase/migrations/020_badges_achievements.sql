-- Badges / succès virtuels (voir 021 pour remplacement Flambeur → succès points)

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.badges (
  id text primary key,
  name text not null,
  description text not null,
  icon_name text not null
);

comment on table public.badges is 'Catalogue des trophées débloquables';

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null references public.badges (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

comment on table public.user_badges is 'Badges débloqués par joueur';

create index user_badges_user_id_idx on public.user_badges (user_id);
create index user_badges_badge_id_idx on public.user_badges (badge_id);

insert into public.badges (id, name, description, icon_name) values
  (
    'nostradamus',
    'Nostradamus',
    'A gagné 3 paris « Score exact ».',
    'sparkles'
  ),
  (
    'chat_noir',
    'Le Chat Noir',
    'A perdu 5 paris d''affilée.',
    'cat'
  ),
  (
    'fun_expert',
    'L''Expert du Fun',
    'A remporté 5 paris fun.',
    'party-popper'
  );

-- -----------------------------------------------------------------------------
-- Attribution idempotente
-- -----------------------------------------------------------------------------
create or replace function public.award_badge(p_user_id uuid, p_badge_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_badge_id is null then
    return;
  end if;

  insert into public.user_badges (user_id, badge_id, unlocked_at)
  values (p_user_id, p_badge_id, now())
  on conflict (user_id, badge_id) do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- Vérification des conditions après clôture d'un pari
-- -----------------------------------------------------------------------------
create or replace function public.check_user_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak int := 0;
  r record;
begin
  if p_user_id is null then
    return;
  end if;

  if (
    select count(*)::int
    from public.bets
    where user_id = p_user_id
      and bet_type = 'exact_score'
      and status = 'won'
  ) >= 3 then
    perform public.award_badge(p_user_id, 'nostradamus');
  end if;

  if (
    select count(*)::int
    from public.bets
    where user_id = p_user_id
      and bet_type = 'fun'
      and status = 'won'
  ) >= 5 then
    perform public.award_badge(p_user_id, 'fun_expert');
  end if;

  for r in
    select b.status
    from public.bets b
    where b.user_id = p_user_id
      and b.status in ('won', 'lost')
      and b.settled_at is not null
    order by b.settled_at asc, b.id asc
  loop
    if r.status = 'lost' then
      v_streak := v_streak + 1;
      if v_streak >= 5 then
        perform public.award_badge(p_user_id, 'chat_noir');
        exit;
      end if;
    else
      v_streak := 0;
    end if;
  end loop;
end;
$$;

create or replace function public.trg_bets_check_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE'
    and OLD.status = 'pending'
    and NEW.status in ('won', 'lost') then
    perform public.check_user_badges(NEW.user_id);
  end if;

  return NEW;
end;
$$;

drop trigger if exists bets_check_badges on public.bets;

create trigger bets_check_badges
  after insert or update of status on public.bets
  for each row
  execute function public.trg_bets_check_badges();

-- -----------------------------------------------------------------------------
-- RPC : badges par joueurs (classement)
-- -----------------------------------------------------------------------------
create or replace function public.get_users_badges(p_user_ids uuid[])
returns table (
  user_id uuid,
  badge_id text,
  name text,
  description text,
  icon_name text,
  unlocked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ub.user_id,
    b.id as badge_id,
    b.name,
    b.description,
    b.icon_name,
    ub.unlocked_at
  from public.user_badges ub
  join public.badges b on b.id = ub.badge_id
  where p_user_ids is not null
    and cardinality(p_user_ids) > 0
    and ub.user_id = any (p_user_ids)
  order by ub.user_id, ub.unlocked_at asc;
$$;

grant execute on function public.get_users_badges(uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create policy "Authenticated read badges"
  on public.badges for select to authenticated
  using (true);

create policy "Authenticated read user badges"
  on public.user_badges for select to authenticated
  using (true);

-- Rétro-attribution pour les paris déjà réglés
do $$
declare
  u record;
begin
  for u in select distinct user_id from public.bets where status in ('won', 'lost')
  loop
    perform public.check_user_badges(u.user_id);
  end loop;
end;
$$;
