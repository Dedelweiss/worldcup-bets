-- Annonce affichée sur le tableau de bord (activable par l'admin).

alter table public.tournament_config
  add column if not exists dashboard_announcement_enabled boolean not null default false,
  add column if not exists dashboard_announcement_message text not null default '';

comment on column public.tournament_config.dashboard_announcement_enabled is
  'Si true, le message d''annonce est visible sur le dashboard.';
comment on column public.tournament_config.dashboard_announcement_message is
  'Texte de l''annonce (markdown non interprété, texte brut).';

create or replace function public.admin_set_dashboard_announcement(
  p_enabled boolean,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text := trim(coalesce(p_message, ''));
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if char_length(v_message) > 500 then
    raise exception 'Message trop long (500 caractères max)';
  end if;

  if coalesce(p_enabled, false) and v_message = '' then
    raise exception 'Un message est requis pour activer l''annonce';
  end if;

  update public.tournament_config
  set
    dashboard_announcement_enabled = coalesce(p_enabled, false),
    dashboard_announcement_message = v_message
  where id = 1;

  return jsonb_build_object(
    'enabled', coalesce(p_enabled, false),
    'message', v_message
  );
end;
$$;

grant execute on function public.admin_set_dashboard_announcement(boolean, text)
  to authenticated;

notify pgrst, 'reload schema';
