-- Lecture des ligues : créateur + admin (évite les 404 si is_admin() ou policies en conflit)

drop policy if exists "Leagues visible to members and admins" on public.leagues;
drop policy if exists "Admins manage leagues" on public.leagues;

create policy "Leagues select for members creators and admins"
  on public.leagues for select to authenticated
  using (
    public.is_admin()
    or created_by = auth.uid()
    or exists (
      select 1 from public.league_members lm
      where lm.league_id = leagues.id and lm.user_id = auth.uid()
    )
  );

create policy "Leagues insert for admins"
  on public.leagues for insert to authenticated
  with check (public.is_admin());

create policy "Leagues update for admins"
  on public.leagues for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Leagues delete for admins"
  on public.leagues for delete to authenticated
  using (public.is_admin());

drop policy if exists "League members visible to league peers" on public.league_members;
drop policy if exists "Admins manage league members" on public.league_members;

create policy "League members select"
  on public.league_members for select to authenticated
  using (
    public.is_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.league_members lm
      where lm.league_id = league_members.league_id and lm.user_id = auth.uid()
    )
  );

create policy "League members insert for admins"
  on public.league_members for insert to authenticated
  with check (public.is_admin());

create policy "League members update for admins"
  on public.league_members for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "League members delete for admins"
  on public.league_members for delete to authenticated
  using (public.is_admin());

notify pgrst, 'reload schema';
