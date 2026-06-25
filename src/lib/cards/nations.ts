/**
 * Correspondance code football-data (TLA 3 lettres) -> ISO alpha-2 + nom français.
 * Sert à afficher le drapeau (libre de droits) et à regrouper l'album par nation.
 * Les codes inconnus retombent sur country_code null (carte sans drapeau).
 */
interface Nation {
  tla: string;
  iso2: string;
  name: string;
}

const NATIONS: Nation[] = [
  { tla: "FRA", iso2: "fr", name: "France" },
  { tla: "BRA", iso2: "br", name: "Brésil" },
  { tla: "ARG", iso2: "ar", name: "Argentine" },
  { tla: "ESP", iso2: "es", name: "Espagne" },
  { tla: "GER", iso2: "de", name: "Allemagne" },
  { tla: "POR", iso2: "pt", name: "Portugal" },
  { tla: "NED", iso2: "nl", name: "Pays-Bas" },
  { tla: "BEL", iso2: "be", name: "Belgique" },
  { tla: "ENG", iso2: "gb", name: "Angleterre" },
  { tla: "CRO", iso2: "hr", name: "Croatie" },
  { tla: "URU", iso2: "uy", name: "Uruguay" },
  { tla: "ITA", iso2: "it", name: "Italie" },
  { tla: "MEX", iso2: "mx", name: "Mexique" },
  { tla: "USA", iso2: "us", name: "États-Unis" },
  { tla: "JPN", iso2: "jp", name: "Japon" },
  { tla: "SEN", iso2: "sn", name: "Sénégal" },
  { tla: "MAR", iso2: "ma", name: "Maroc" },
  { tla: "SUI", iso2: "ch", name: "Suisse" },
  { tla: "DEN", iso2: "dk", name: "Danemark" },
  { tla: "CAN", iso2: "ca", name: "Canada" },
  { tla: "QAT", iso2: "qa", name: "Qatar" },
  { tla: "AUS", iso2: "au", name: "Australie" },
  { tla: "KOR", iso2: "kr", name: "Corée du Sud" },
  { tla: "POL", iso2: "pl", name: "Pologne" },
  { tla: "SRB", iso2: "rs", name: "Serbie" },
  { tla: "GHA", iso2: "gh", name: "Ghana" },
  { tla: "CMR", iso2: "cm", name: "Cameroun" },
  { tla: "ECU", iso2: "ec", name: "Équateur" },
  { tla: "IRN", iso2: "ir", name: "Iran" },
  { tla: "TUN", iso2: "tn", name: "Tunisie" },
  { tla: "KSA", iso2: "sa", name: "Arabie Saoudite" },
  { tla: "NGA", iso2: "ng", name: "Nigéria" },
  { tla: "EGY", iso2: "eg", name: "Égypte" },
  { tla: "COL", iso2: "co", name: "Colombie" },
  { tla: "PER", iso2: "pe", name: "Pérou" },
  { tla: "CHI", iso2: "cl", name: "Chili" },
  { tla: "PAR", iso2: "py", name: "Paraguay" },
  { tla: "ALG", iso2: "dz", name: "Algérie" },
  { tla: "CIV", iso2: "ci", name: "Côte d'Ivoire" },
  { tla: "RSA", iso2: "za", name: "Afrique du Sud" },
  { tla: "NOR", iso2: "no", name: "Norvège" },
  { tla: "SWE", iso2: "se", name: "Suède" },
  { tla: "AUT", iso2: "at", name: "Autriche" },
  { tla: "TUR", iso2: "tr", name: "Turquie" },
  { tla: "UKR", iso2: "ua", name: "Ukraine" },
  { tla: "SCO", iso2: "gb", name: "Écosse" },
  { tla: "WAL", iso2: "gb", name: "Pays de Galles" },
  { tla: "CRC", iso2: "cr", name: "Costa Rica" },
  { tla: "PAN", iso2: "pa", name: "Panama" },
  { tla: "JAM", iso2: "jm", name: "Jamaïque" },
  { tla: "NZL", iso2: "nz", name: "Nouvelle-Zélande" },
];

const BY_TLA = new Map(NATIONS.map((n) => [n.tla.toUpperCase(), n]));
const BY_ISO2 = new Map(NATIONS.map((n) => [n.iso2, n]));

export function tlaToIso2(tla: string | null): string | null {
  if (!tla) return null;
  return BY_TLA.get(tla.toUpperCase())?.iso2 ?? null;
}

export function iso2ToName(iso2: string | null): string | null {
  if (!iso2) return null;
  return BY_ISO2.get(iso2)?.name ?? null;
}
