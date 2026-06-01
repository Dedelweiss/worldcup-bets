import Link from "next/link";
import {
  Calendar,
  Flame,
  Heart,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MATCH_RESULT_COPY } from "@/lib/bets/match-result-copy";
import {
  EXACT_SCORE_PERFECT_MIN_BONUS,
  EXACT_SCORE_PERFECT_MULTIPLIER,
} from "@/lib/exact-score";
import { GOLDEN_MATCH_MULTIPLIER } from "@/lib/golden-match";
import {
  ON_FIRE_BONUS_POINTS,
  ON_FIRE_STREAK_REQUIRED,
  ON_FIRE_TOOLTIP,
} from "@/lib/on-fire";
import { POINTS_ODD_MULTIPLIER } from "@/lib/points";
import { DEFAULT_FAVORITE_TEAM_BONUS } from "@/lib/tournament/config";
import { cn } from "@/lib/utils";

const sections = [
  { id: "navigation", label: "Où aller dans l'app" },
  { id: "paris-match", label: "Paris sur les matchs" },
  { id: "score-exact", label: "Score exact" },
  { id: "boost-golden", label: "Boost & Golden Match" },
  { id: "on-fire", label: "On Fire" },
  { id: "paris-fun", label: "Paris fun" },
  { id: "equipe-favorite", label: "Équipe favorite" },
  { id: "classement", label: "Classement & ligues" },
] as const;

function HelpSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="size-5 shrink-0 text-primary" aria-hidden />
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function HelpGuide() {
  return (
    <div className="space-y-8">
      <nav
        aria-label="Sommaire"
        className="rounded-xl border border-dashed bg-muted/30 p-4"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Sommaire
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <HelpSection
        id="navigation"
        icon={Calendar}
        title="Où aller dans l'app"
        description="Les onglets du menu en haut de chaque page."
      >
        <BulletList
          items={[
            <>
              <Link href="/dashboard" className="text-primary hover:underline">
                Paris
              </Link>{" "}
              — matchs à venir et en cours, vos pronostics du jour.
            </>,
            <>
              <Link href="/matches" className="text-primary hover:underline">
                Calendrier
              </Link>{" "}
              — tous les matchs, filtres par phase.
            </>,
            <>
              <Link href="/matches/fun" className="text-primary hover:underline">
                Paris fun
              </Link>{" "}
              — paris annexes (buteur, cartons, etc.) selon les matchs proposés.
            </>,
            <>
              <Link href="/bracket" className="text-primary hover:underline">
                Tournoi
              </Link>{" "}
              — arbre de la phase finale avec dates.
            </>,
            <>
              <Link
                href="/leaderboard"
                className="text-primary hover:underline"
              >
                Classement
              </Link>{" "}
              — général ou par ligue.
            </>,
            <>
              <Link href="/leagues" className="text-primary hover:underline">
                Ligues
              </Link>{" "}
              — créer ou rejoindre un groupe privé.
            </>,
            <>
              <Link href="/bets" className="text-primary hover:underline">
                Mes paris
              </Link>{" "}
              — historique de tous vos pronostics.
            </>,
            <>
              <Link href="/profile" className="text-primary hover:underline">
                Profil
              </Link>{" "}
              — pseudo, évolution des points.
            </>,
          ]}
        />
      </HelpSection>

      <HelpSection
        id="paris-match"
        icon={Target}
        title="Paris sur les matchs"
        description={MATCH_RESULT_COPY.label}
      >
        <p>
          Choisissez <strong>Domicile</strong>, <strong>Nul</strong> ou{" "}
          <strong>Extérieur</strong> avant le coup d&apos;envoi. Les points
          gagnés dépendent de la cote affichée : environ{" "}
          <strong>
            cote × {POINTS_ODD_MULTIPLIER}
          </strong>{" "}
          (arrondi, minimum 1 point).
        </p>
        <BulletList
          items={[
            MATCH_RESULT_COPY.oneChoicePerMatch,
            "Les pronostics se verrouillent au coup d'envoi.",
            MATCH_RESULT_COPY.knockoutBetNote,
            "Pendant un match en direct, les paris classiques sont fermés ; les paris fun restent ouverts si proposés.",
          ]}
        />
      </HelpSection>

      <HelpSection
        id="score-exact"
        icon={Sparkles}
        title="Score exact"
        description="Alternative au résultat simple, un seul des deux par match."
      >
        <p>
          Saisissez le score final (ex. 2-1). Si vous trouvez le bon vainqueur
          (ou le nul) mais pas le score exact, vous gagnez en mode{" "}
          <strong>Tendance</strong> : même barème qu&apos;un pari sur le
          résultat équivalent.
        </p>
        <p>
          Si le score est <strong>tout pile</strong>, la récompense est bien
          plus élevée (au moins ×{EXACT_SCORE_PERFECT_MULTIPLIER} la base, avec
          un bonus minimum de +{EXACT_SCORE_PERFECT_MIN_BONUS} points sur les
          cotes difficiles).
        </p>
        <p className="text-xs">
          Le boost et le Golden Match ne s&apos;appliquent pas aux paris score
          exact — uniquement au résultat simple.
        </p>
      </HelpSection>

      <HelpSection
        id="boost-golden"
        icon={Zap}
        title="Boost ×2 et Golden Match"
      >
        <BulletList
          items={[
            <>
              <strong>Boost ×2</strong> — une fois par tournoi sur un pari{" "}
              <em>résultat simple</em> : double les points si vous gagnez.{" "}
              {MATCH_RESULT_COPY.boostHint}
            </>,
            <>
              <strong>Golden Match</strong> — match mis en avant par
              l&apos;organisateur : tous les gains classiques sur ce match sont
              multipliés par <strong>{GOLDEN_MATCH_MULTIPLIER}</strong> à la
              clôture (cumulable avec le boost sur un pari résultat).
            </>,
          ]}
        />
      </HelpSection>

      <HelpSection
        id="on-fire"
        icon={Flame}
        title="On Fire"
        description="Série de victoires sur les paris classiques."
      >
        <p>{ON_FIRE_TOOLTIP}</p>
        <p>
          Concrètement : après{" "}
          <strong>{ON_FIRE_STREAK_REQUIRED} matchs classiques gagnés</strong>{" "}
          d&apos;affilée, chaque nouvelle victoire classique rapporte{" "}
          <strong>+{ON_FIRE_BONUS_POINTS} point bonus</strong> tant que la série
          continue. Une défaite ou un match sans pari classique gagnant éteint
          la flamme.
        </p>
      </HelpSection>

      <HelpSection
        id="paris-fun"
        icon={Sparkles}
        title="Paris fun"
        description="En plus des paris sur le score ou le résultat."
      >
        <BulletList
          items={[
            "Propositions variables selon le match (buteur, nombre de buts, etc.).",
            "Cotes et règles indiquées sur chaque fiche match.",
            "Peuvent rester ouverts pendant le match, contrairement au résultat simple.",
            "Les points suivent le même principe : cote × multiplicateur du pool.",
          ]}
        />
      </HelpSection>

      <HelpSection
        id="equipe-favorite"
        icon={Heart}
        title="Équipe favorite"
        description="Un choix unique pour tout le tournoi."
      >
        <p>
          Sur le tableau de bord, choisissez l&apos;équipe que vous soutenez
          avant la clôture du choix (définie par l&apos;organisateur). Si elle
          remporte la Coupe du Monde, vous recevez un bonus de points (souvent
          autour de{" "}
          <strong>{DEFAULT_FAVORITE_TEAM_BONUS} pts</strong>, valeur
          configurable par l&apos;admin).
        </p>
        <p>
          Le choix est définitif une fois validé. Suivez l&apos;état sur votre
          dashboard après la finale.
        </p>
      </HelpSection>

      <HelpSection
        id="classement"
        icon={Trophy}
        title="Classement & ligues"
      >
        <BulletList
          items={[
            <>
              <strong>Classement général</strong> — tous les joueurs du pool.
            </>,
            <>
              <strong>Ligues</strong> —{" "}
              <Users className="inline size-3.5 align-text-bottom" /> créez une
              ligue privée ou rejoignez-la avec un code ; le classement filtre
              alors les membres de cette ligue.
            </>,
            "Badges et flamme On Fire apparaissent à côté des pseudos.",
            "Tri possible par points, précision, etc. selon les options affichées.",
          ]}
        />
      </HelpSection>

      <p
        className={cn(
          "rounded-lg border border-dashed px-4 py-3 text-center text-xs text-muted-foreground",
        )}
      >
        Une question ou un bug ? Contactez l&apos;organisateur du pool — seul
        un administrateur peut corriger les scores, réinitialiser l&apos;app ou
        ajuster les règles côté serveur.
      </p>
    </div>
  );
}
