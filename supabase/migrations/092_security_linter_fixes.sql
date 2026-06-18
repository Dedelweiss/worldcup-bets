-- Corrige les avertissements Supabase Database Linter :
-- - function_search_path_mutable
-- - anon_security_definer_function_executable (anon ne doit pas appeler les RPC)
-- - public_bucket_allows_listing (profile-avatars)

-- -----------------------------------------------------------------------------
-- 1. search_path figé sur toutes les fonctions public sans config
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as func
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (
        p.proconfig is null
        or not exists (
          select 1
          from unnest(p.proconfig) as c
          where c like 'search_path=%'
        )
      )
  loop
    execute format('alter function %s set search_path = public', r.func);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Bucket avatars : pas de policy SELECT large (le bucket reste public)
--    Les URLs directes /object/public/profile-avatars/... suffisent.
-- -----------------------------------------------------------------------------
drop policy if exists "Profile avatars public read" on storage.objects;

-- -----------------------------------------------------------------------------
-- 3. RPC : retirer l'exécution anonyme, puis rétablir les grants utiles
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema public to service_role;

-- Fonctions internes / triggers / cron : pas d'appel PostgREST client
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.handle_new_user() from anon;

revoke execute on function public.trg_bets_check_badges() from authenticated;
revoke execute on function public.trg_bets_check_badges() from anon;

revoke execute on function public.trg_profiles_on_fire_badge() from authenticated;
revoke execute on function public.trg_profiles_on_fire_badge() from anon;

revoke execute on function public.settle_match_internal(integer) from authenticated;
revoke execute on function public.settle_match_internal(integer) from anon;

revoke execute on function public.auto_settle_match(integer) from authenticated;
revoke execute on function public.auto_settle_match(integer) from anon;

revoke execute on function public.sync_live_matches() from authenticated;
revoke execute on function public.sync_live_matches() from anon;

revoke execute on function public.log_app_event(public.app_log_level, text, text, jsonb, uuid) from authenticated;
revoke execute on function public.log_app_event(public.app_log_level, text, text, jsonb, uuid) from anon;

revoke execute on function public.close_due_fun_markets() from authenticated;
revoke execute on function public.close_due_fun_markets() from anon;

revoke execute on function public.apply_tackle_points(uuid, integer, uuid, integer, public.transaction_type) from authenticated;
revoke execute on function public.apply_tackle_points(uuid, integer, uuid, integer, public.transaction_type) from anon;

revoke execute on function public.assert_tackle_editable(uuid, uuid) from authenticated;
revoke execute on function public.assert_tackle_editable(uuid, uuid) from anon;

revoke execute on function public.assert_tackle_target_valid(integer, uuid, uuid) from authenticated;
revoke execute on function public.assert_tackle_target_valid(integer, uuid, uuid) from anon;

revoke execute on function public.resolve_tackles_for_match(integer) from authenticated;
revoke execute on function public.resolve_tackles_for_match(integer) from anon;

revoke execute on function public.reverse_tackles_for_match(integer) from authenticated;
revoke execute on function public.reverse_tackles_for_match(integer) from anon;

revoke execute on function public.match_classic_points_earned(uuid, integer) from authenticated;
revoke execute on function public.match_classic_points_earned(uuid, integer) from anon;

revoke execute on function public.tackle_stake_for_user(uuid, integer) from authenticated;
revoke execute on function public.tackle_stake_for_user(uuid, integer) from anon;

revoke execute on function public.award_badge(uuid, text) from authenticated;
revoke execute on function public.award_badge(uuid, text) from anon;

revoke execute on function public.check_user_badges(uuid) from authenticated;
revoke execute on function public.check_user_badges(uuid) from anon;

revoke execute on function public.campaign_question_satisfied(uuid, text, text) from authenticated;
revoke execute on function public.campaign_question_satisfied(uuid, text, text) from anon;

revoke execute on function public.count_missing_campaign_picks(uuid, text) from authenticated;
revoke execute on function public.count_missing_campaign_picks(uuid, text) from anon;

revoke execute on function public.sync_favorite_team_tournament_pick(uuid, text) from authenticated;
revoke execute on function public.sync_favorite_team_tournament_pick(uuid, text) from anon;

revoke execute on function public.recompute_classic_heat(uuid) from authenticated;
revoke execute on function public.recompute_classic_heat(uuid) from anon;

revoke execute on function public.update_classic_heat(uuid, integer, boolean) from authenticated;
revoke execute on function public.update_classic_heat(uuid, integer, boolean) from anon;

notify pgrst, 'reload schema';
