-- Lecture/écriture du chat alignée sur post_match_comment (053) :
-- chat ouvert si live/terminé OU coup d'envoi passé (pas report/annulé).
-- Sans ça, messages postés en direct avant le kickoff disparaissent au reload.

drop policy if exists "Read comments after kickoff" on public.match_comments;
drop policy if exists "Users insert own comments after kickoff" on public.match_comments;

create policy "Read comments when chat open"
  on public.match_comments for select to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_comments.match_id
        and m.status not in ('postponed', 'cancelled')
        and (
          m.status in ('live', 'finished')
          or m.kickoff_at <= now()
        )
    )
  );

create policy "Users insert own comments when chat open"
  on public.match_comments for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.matches m
      where m.id = match_id
        and m.status not in ('postponed', 'cancelled')
        and (
          m.status in ('live', 'finished')
          or m.kickoff_at <= now()
        )
    )
  );

notify pgrst, 'reload schema';
