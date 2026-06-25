-- Seed du catalogue de cartes : equipes nationales (nom + drapeau, libres de droits).
-- Pas de photo ni de nom de joueur reel -> aucun risque de droit a l'image.
-- Le country_code (ISO alpha-2) sert a afficher un drapeau emoji cote client.

insert into public.cards (set_id, code, name, rarity, country_code, position, stats)
select s.id, v.code, v.name, v.rarity::public.card_rarity, v.country_code, 'Nation', '{}'::jsonb
from public.card_sets s
cross join (values
  -- Legendaires
  ('wc2026-br', 'Brésil', 'legendaire', 'br'),
  ('wc2026-fr', 'France', 'legendaire', 'fr'),
  ('wc2026-ar', 'Argentine', 'legendaire', 'ar'),
  -- Epiques
  ('wc2026-es', 'Espagne', 'epique', 'es'),
  ('wc2026-de', 'Allemagne', 'epique', 'de'),
  ('wc2026-pt', 'Portugal', 'epique', 'pt'),
  ('wc2026-nl', 'Pays-Bas', 'epique', 'nl'),
  ('wc2026-be', 'Belgique', 'epique', 'be'),
  -- Rares
  ('wc2026-hr', 'Croatie', 'rare', 'hr'),
  ('wc2026-uy', 'Uruguay', 'rare', 'uy'),
  ('wc2026-it', 'Italie', 'rare', 'it'),
  ('wc2026-mx', 'Mexique', 'rare', 'mx'),
  ('wc2026-us', 'États-Unis', 'rare', 'us'),
  ('wc2026-jp', 'Japon', 'rare', 'jp'),
  ('wc2026-sn', 'Sénégal', 'rare', 'sn'),
  ('wc2026-ma', 'Maroc', 'rare', 'ma'),
  ('wc2026-ch', 'Suisse', 'rare', 'ch'),
  ('wc2026-dk', 'Danemark', 'rare', 'dk'),
  -- Communes
  ('wc2026-ca', 'Canada', 'commune', 'ca'),
  ('wc2026-qa', 'Qatar', 'commune', 'qa'),
  ('wc2026-au', 'Australie', 'commune', 'au'),
  ('wc2026-kr', 'Corée du Sud', 'commune', 'kr'),
  ('wc2026-pl', 'Pologne', 'commune', 'pl'),
  ('wc2026-rs', 'Serbie', 'commune', 'rs'),
  ('wc2026-gh', 'Ghana', 'commune', 'gh'),
  ('wc2026-cm', 'Cameroun', 'commune', 'cm'),
  ('wc2026-ec', 'Équateur', 'commune', 'ec'),
  ('wc2026-ir', 'Iran', 'commune', 'ir'),
  ('wc2026-tn', 'Tunisie', 'commune', 'tn'),
  ('wc2026-sa', 'Arabie Saoudite', 'commune', 'sa'),
  ('wc2026-ng', 'Nigéria', 'commune', 'ng'),
  ('wc2026-eg', 'Égypte', 'commune', 'eg')
) as v(code, name, rarity, country_code)
where s.code = 'wc2026'
on conflict (code) do nothing;
