# Premium Refactor Strategy — WC2026 Pool

Scope of this audit: the actual design system and primary primitives in the repo (`globals.css`, `tailwind.config.ts`, `ui/button.tsx`, `ui/card.tsx`, `dashboard/dashboard-bento.tsx`, `layout/app-shell.tsx`, `ui/motion-reveal.tsx`). Stack confirmed: Next.js 16, React 19, Tailwind v4, shadcn on base-ui, framer-motion v12.

The foundation is genuinely good. This is not a rebuild. It is a tuning pass to remove the handful of choices that read as "themed gamer dashboard" instead of "premium product."

---

## Phase 1: Honest Aesthetic & Architectural Audit

### Aesthetic

**1. The neon is doing too much, and it is always on.** The default button carries a permanent `shadow-lime-400/40` glow, the primary color is full-saturation lime (`#a3e635`) used as a solid fill, and fuchsia is a second loud accent. Apple and Stripe earn their premium feel through restraint: a near-monochrome surface where one accent appears rarely and deliberately. Right now the accent is the loudest thing on every screen, so nothing reads as emphasis because everything is emphasized. The brand identity ("Neon Stadium") is a legitimate choice for a betting product, but premium requires the glow to be earned (hover, live state, win state), not ambient.

**2. Everything levitates.** `Card` applies `md:hover:-translate-y-1` and a lime border on hover to every single card. When the whole page reacts to the cursor, motion stops signalling anything. Premium interfaces move selectively: the thing you can act on moves, the things you are reading stay still.

**3. Glassmorphism is applied uniformly, which is both a look problem and a performance problem.** Every `Card` and the `glass-card` utility stack `backdrop-blur-md`. Layered backdrop-filters are one of the most expensive things you can ask a compositor to do, and on mid-range mobile they cause visible scroll jank. Visually, blur everywhere flattens hierarchy because there is no contrast between a floating surface and a base surface. Reserve real glass for genuinely floating layers (header, sheets, popovers); give content cards a solid, cheap surface.

**4. Typography is under-specified.** Headings get `font-heading tracking-tight` and titles are `font-medium`. There is no type scale, no leading tokens, no deliberate weight contrast, and no letter-spacing discipline at large sizes. Premium type is the single highest-leverage change: a real scale with tighter tracking on large headings, comfortable leading on body, and a clear weight jump between label and value.

**5. Radius inflation.** `--radius` is `1rem` and the scale climbs to `--radius-4xl` at `2.6rem`. Cards use `rounded-2xl` (1.8rem) while their headers/footers declare `rounded-t-xl` / `rounded-b-xl`. The inner radii never match the outer, and several values are large enough to look soft rather than sharp. Pick three radii and stop.

### Architecture

**6. `DashboardBento` mounts `DashboardSummary` twice.** Once inside a `lg:hidden` wrapper and once inside `hidden lg:block`. Both instances mount, both run their client logic, and you pay the full subtree cost twice on every render to switch with CSS. This is the clearest single fix in the codebase: render it once and place it with grid ordering.

**7. The dashboard is a client island that does not need to be.** `DashboardBento` is `"use client"` and receives 12+ props drilled down from the server. Most of its children (summary, leaderboard card, match cards) are presentational. Only the chat and the reveal animation truly need the client boundary. Keeping the whole tree client-side ships more JS than necessary and forces every prop through one giant interface.

**8. Two sources of truth for tokens.** Font families, neon colors, and `bento` radii live in `tailwind.config.ts`; the rest live in `@theme` inside `globals.css`. In Tailwind v4 the CSS-first `@theme` is the canonical home. Splitting them guarantees drift. Consolidate into `globals.css` and delete the config (or reduce it to a near-empty stub).

**9. `MotionReveal` index is used inconsistently.** `index={1}` is passed to three sibling blocks, so the stagger is not actually staggered. Minor, but it is the difference between "choreographed" and "random."

**10. CLS risk on media.** Team flags and avatars rendered inside cards should carry explicit `width`/`height` (or aspect-ratio boxes) so first paint does not reflow. Worth a sweep across `shared/team-flag.tsx` and the leaderboard avatars.

---

## Phase 2: Visual Style Guide Refactor

Drop this into `globals.css` in place of the current `@theme inline` + `:root` block. It keeps your Neon Stadium identity but disciplines it: a real neutral ramp, one primary accent with restraint, a true type scale, and exactly three radii. All tokens live in one place.

```css
@theme {
  /* ---- Neutral ramp (zinc-based, defined once) ---- */
  --color-bg: #08080a;            /* app base */
  --color-surface: #161619;       /* solid card */
  --color-surface-raised: #1d1d21;/* hover / elevated */
  --color-glass: rgb(20 20 24 / 0.62); /* floating layers only */
  --color-line: rgb(255 255 255 / 0.08);
  --color-line-strong: rgb(255 255 255 / 0.14);
  --color-fg: #f5f5f6;
  --color-fg-muted: #a8a8b0;      /* >= 7:1 on bg */
  --color-fg-subtle: #6f6f78;

  /* ---- Accents: lime is primary, used sparingly. fuchsia is reserved for live/special ---- */
  --color-primary: #b6f04a;       /* slightly desaturated vs raw lime */
  --color-primary-strong: #c9f56e;/* hover */
  --color-primary-fg: #0a0f00;
  --color-live: #e879f9;          /* fuchsia, live + golden states only */
  --color-positive: #4ade80;
  --color-negative: #fb7185;
  --color-ring: rgb(182 240 74 / 0.5);

  /* ---- Type scale (clamp = fluid, no layout jumps) ---- */
  --text-xs: 0.75rem;   --leading-xs: 1.4;
  --text-sm: 0.875rem;  --leading-sm: 1.5;
  --text-base: 1rem;    --leading-base: 1.6;
  --text-lg: 1.125rem;  --leading-lg: 1.45;
  --text-xl: clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);   --leading-xl: 1.25;
  --text-2xl: clamp(1.6rem, 1.3rem + 1.2vw, 2.1rem);   --leading-2xl: 1.15;
  --text-3xl: clamp(2.1rem, 1.6rem + 2.2vw, 3rem);     --leading-3xl: 1.05;

  /* Tracking: tighten as size grows, never on small text */
  --tracking-tight: -0.02em;   /* xl and up */
  --tracking-tighter: -0.035em;/* 2xl / 3xl display */
  --tracking-wide: 0.04em;     /* uppercase labels */

  /* Weights: deliberate contrast between label and value */
  --weight-label: 500;
  --weight-body: 400;
  --weight-emphasis: 600;
  --weight-display: 700;

  /* ---- Radius: exactly three ---- */
  --radius-control: 0.625rem; /* buttons, inputs, chips */
  --radius-card: 1.25rem;     /* cards, panels */
  --radius-modal: 1.75rem;    /* sheets, dialogs, hero */

  /* ---- Elevation: layered soft shadows, not glow ---- */
  --shadow-card: 0 1px 0 0 rgb(255 255 255 / 0.04) inset,
                 0 1px 2px rgb(0 0 0 / 0.4),
                 0 8px 24px -12px rgb(0 0 0 / 0.6);
  --shadow-raised: 0 1px 0 0 rgb(255 255 255 / 0.06) inset,
                   0 12px 32px -10px rgb(0 0 0 / 0.7);
  --shadow-glow: 0 0 24px -6px rgb(182 240 74 / 0.45); /* primary actions on hover only */

  /* ---- Motion ---- */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);     /* premium decel */
  --ease-spring: linear(0, 0.6 28%, 1.04 56%, 0.99 76%, 1);
  --dur-fast: 140ms;
  --dur-base: 220ms;
  --dur-slow: 360ms;
}
```

Mapping notes:

- Keep the shadcn aliases (`--primary`, `--card`, etc.) but point them at these tokens so existing components keep working: e.g. `--primary: var(--color-primary); --card: var(--color-surface); --border: var(--color-line);`. That lets you migrate without touching every consumer at once.
- The neutral ramp moves from rgba-on-black toward solid surfaces. Solid surfaces are cheaper to paint and read as more substantial than translucent ones.
- `--color-fg-muted` is lightened to clear 7:1 contrast on the base background (the old `#a1a1aa` was borderline and fails on the translucent card surface).

---

## Phase 3: Component & Layout Rewrite

### 3.1 `ui/button.tsx`

Goal: keep the lime identity, but make the glow a hover reward instead of an ambient default. Add a real pressed state and a spring-friendly transition. Type-safe against base-ui as before.

```tsx
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // base: motion uses tokens, glow is NOT in the base layer
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] " +
    "border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap " +
    "transition-[background-color,box-shadow,transform,border-color] duration-[var(--dur-fast)] " +
    "ease-[var(--ease-out)] outline-none select-none " +
    "focus-visible:ring-3 focus-visible:ring-[var(--color-ring)] focus-visible:border-[var(--color-primary)] " +
    "active:translate-y-px active:duration-75 " +
    "disabled:pointer-events-none disabled:opacity-45 " +
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30 " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary font-semibold text-primary-foreground shadow-[var(--shadow-card)] " +
          "hover:bg-[var(--color-primary-strong)] hover:shadow-[var(--shadow-glow)] hover:-translate-y-px",
        outline:
          "border-[var(--color-line-strong)] bg-[var(--color-surface)] text-foreground " +
          "hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-line-strong)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]",
        ghost:
          "text-muted-foreground hover:bg-[var(--color-surface-raised)] hover:text-foreground",
        destructive:
          "bg-destructive/12 text-destructive hover:bg-destructive/20 " +
          "focus-visible:ring-destructive/25",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3.5",
        xs: "h-7 gap-1 rounded-[calc(var(--radius-control)*0.8)] px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[calc(var(--radius-control)*0.9)] px-3 text-[0.8rem]",
        lg: "h-11 gap-2 px-5 text-[0.95rem]",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

What changed and why: the glow moved from base (always on) to `default:hover` only; default height bumped from `h-8` to a more tappable `h-9` (and `lg` to `h-11`, comfortably above the 44px touch target); transitions now target specific properties with token durations and the premium decel curve instead of `transition-all`; pressed state is explicit and faster than the release.

### 3.2 `ui/card.tsx`

Goal: solid cheap surface by default, blur reserved via an `elevated`/`glass` prop, hover lift becomes opt-in (`interactive`) instead of universal, and inner radii match the outer card.

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

type CardProps = React.ComponentProps<"div"> & {
  size?: "default" | "sm";
  /** opt in to hover lift; use only for cards that are clickable */
  interactive?: boolean;
  /** opt in to real glass; use only for floating layers */
  glass?: boolean;
};

function Card({
  className,
  size = "default",
  interactive = false,
  glass = false,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-[var(--radius-card)]",
        "border border-[var(--color-line)] text-sm text-card-foreground",
        "shadow-[var(--shadow-card)] py-4",
        // surface: solid by default, glass only when asked
        glass
          ? "bg-[var(--color-glass)] backdrop-blur-xl"
          : "bg-[var(--color-surface)]",
        // motion: only interactive cards react to the cursor
        interactive &&
          "transition-[transform,border-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)] " +
            "will-change-transform hover:-translate-y-1 hover:border-[var(--color-line-strong)] hover:shadow-[var(--shadow-raised)] " +
            "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        "has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0",
        "data-[size=sm]:gap-3 data-[size=sm]:py-3",
        "*:[img:first-child]:rounded-t-[var(--radius-card)] *:[img:last-child]:rounded-b-[var(--radius-card)]",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1 px-4",
        "group-data-[size=sm]/card:px-3",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        "[.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-[var(--text-lg)] font-[var(--weight-emphasis)] leading-[var(--leading-lg)] tracking-[var(--tracking-tight)]",
        "group-data-[size=sm]/card:text-base",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground leading-[var(--leading-sm)]", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-[var(--color-line)] bg-black/20 p-4",
        "group-data-[size=sm]/card:p-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
```

Migration: cards that are links or open something get `interactive`. Header/popover/sheet surfaces get `glass`. The default `MatchCard` on the dashboard, since it is clickable, becomes `<Card interactive>`. Static info panels stay plain (and stop levitating).

### 3.3 `dashboard/dashboard-bento.tsx` — kill the double mount

`DashboardSummary` no longer renders twice. It renders once and is placed by grid order: it spans the full width on small screens and sits in the left column on large screens, achieved with `order` utilities rather than two mounted copies. The stagger indices are also made monotonic.

```tsx
"use client";

import Link from "next/link";
import { GlobalLiveChat } from "@/components/chat/global-live-chat";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { ExpertiseRadarCard } from "@/components/dashboard/expertise-radar-card";
import { LeaderboardTopCard } from "@/components/dashboard/leaderboard-top-card";
import { MatchCard } from "@/components/dashboard/match-card";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GlobalLiveChatInitial } from "@/lib/global-live-chat";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import type { ProfileFavoriteTeam } from "@/lib/profile/favorite-team";
import type { DashboardStats } from "@/lib/dashboard-stats";
import type { TournamentConfig } from "@/lib/tournament/config";
import type { ExpertiseRadarData } from "@/lib/dashboard/expertise-radar";
import type { LeaderboardRankNeighbors } from "@/lib/leaderboard";
import type {
  LeaderboardEntry,
  MatchWithTeams,
  Profile,
  TournamentTeam,
} from "@/types/database";

interface DashboardBentoProps {
  profile: Profile;
  stats: DashboardStats;
  teams: TournamentTeam[];
  favorite: ProfileFavoriteTeam | null;
  tournamentConfig: TournamentConfig;
  selectionOpen?: boolean;
  isDemo?: boolean;
  upcomingMatches: MatchWithTeams[];
  betStatuses: Record<number, UserMatchBetStatus>;
  topPlayers: LeaderboardEntry[];
  rankNeighbors: LeaderboardRankNeighbors;
  globalLiveChat: GlobalLiveChatInitial;
  expertiseRadar: ExpertiseRadarData;
}

export function DashboardBento({
  profile,
  stats,
  teams,
  favorite,
  tournamentConfig,
  selectionOpen,
  isDemo,
  upcomingMatches,
  betStatuses,
  topPlayers,
  rankNeighbors,
  globalLiveChat,
  expertiseRadar,
}: DashboardBentoProps) {
  const [featured, ...rest] = upcomingMatches;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
      {/* Summary: rendered ONCE. Full width on mobile, left column on desktop. */}
      <MotionReveal index={0} className="order-1 lg:col-span-8">
        <DashboardSummary
          profile={profile}
          stats={stats}
          teams={teams}
          favorite={favorite}
          tournamentConfig={tournamentConfig}
          selectionOpen={selectionOpen}
          isDemo={isDemo}
        />
      </MotionReveal>

      {/* Right column: leaderboard, chat, radar */}
      <div className="order-3 space-y-4 lg:order-2 lg:col-span-4 lg:row-span-2">
        <MotionReveal index={1}>
          <LeaderboardTopCard
            players={topPlayers}
            isDemo={isDemo}
            userRank={stats.rank}
            totalPlayers={stats.totalPlayers}
            pendingBets={stats.pendingBets}
            rankNeighbors={rankNeighbors}
          />
        </MotionReveal>
        {!isDemo && (
          <MotionReveal index={2}>
            <GlobalLiveChat
              initialMessages={globalLiveChat.messages}
              initialLiveMatchIds={globalLiveChat.liveMatchIds}
            />
          </MotionReveal>
        )}
        <MotionReveal index={3}>
          <ExpertiseRadarCard
            data={expertiseRadar.axes}
            hasData={expertiseRadar.hasData}
            ovr={expertiseRadar.ovr}
            isDemo={isDemo}
          />
        </MotionReveal>
      </div>

      {/* Matches block: under the summary in the left column */}
      <section className="order-2 space-y-3 lg:order-3 lg:col-span-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-heading text-[var(--text-xl)] font-[var(--weight-emphasis)] tracking-[var(--tracking-tight)]">
              Prochain match
            </h2>
            <p className="text-sm text-muted-foreground">
              Coupe du Monde FIFA 2026
            </p>
          </div>
          {!isDemo && (
            <Link
              href="/matches?bets=my"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Mes pronostics
            </Link>
          )}
        </div>

        {featured ? (
          <MotionReveal index={4}>
            <MatchCard match={featured} betStatus={betStatuses[featured.id]} />
          </MotionReveal>
        ) : (
          <div className="rounded-[var(--radius-modal)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)]/40 p-10 text-center text-muted-foreground">
            Aucun match a venir. Les fixtures apparaitront ici.
          </div>
        )}

        {rest.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.slice(0, 4).map((match, i) => (
              <MotionReveal key={match.id} index={5 + i}>
                <MatchCard match={match} betStatus={betStatuses[match.id]} />
              </MotionReveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

Result: one `DashboardSummary` instead of two, monotonic stagger, and the same responsive layout via `order` + column spans. Half the client work for that subtree disappears.

Follow-up architecture move (larger, optional): make this a server component and push `"use client"` down to only `GlobalLiveChat` and a thin `<Reveal>` wrapper. The presentational cards do not need to be client components, which would cut the JS shipped for this route meaningfully.

---

## Phase 4: Motion & Polish Checklist

You already have framer-motion v12 and a `MotionReveal`. The following are precise, low-effort additions. Everything respects `prefers-reduced-motion`.

1. **Upgrade `MotionReveal` to viewport-triggered with a spring.** Replace `animate` with `whileInView` so cards reveal as they scroll into view, not all at mount. Use `viewport={{ once: true, margin: "-10% 0px" }}`, `transition={{ type: "spring", stiffness: 260, damping: 30, delay: index * 0.05 }}`, and wrap the body so reduced-motion users get opacity-only (`useReducedMotion()` to drop the `y`).

2. **Press feedback on every interactive surface.** For framer-motion elements use `whileTap={{ scale: 0.97 }}`. For plain buttons it is already in the rewrite via `active:translate-y-px`. Keep the press duration shorter than the release (`active:duration-75`) so it feels snappy in, soft out.

3. **Card hover is now opt-in (Phase 3).** Pair the lift with `will-change-transform` (already in the rewrite) and the `--ease-out` decel curve. Lift distance of 4px is the ceiling; more reads as cheap.

4. **Live state is where fuchsia earns its keep.** Keep `animate-golden-border` and `animate-live-shimmer`, but gate them strictly to live matches and special cards. Add a subtle `--color-live` pulsing dot on live items (`animate-pulse` on a 6px dot) rather than glowing the whole card.

5. **Number transitions for points and ranks.** Live points and leaderboard rank should count rather than snap. Use framer-motion `useSpring` + `useTransform` on a motion value, or `animate()` from `motion`, formatted through your existing `formatPoints`. This is the single most "premium" micro-interaction for a betting product.

6. **Layout transitions for the leaderboard.** When rank order changes after a result, wrap rows in `<motion.div layout>` (or `LayoutGroup`) so positions animate to their new slot instead of jumping. Pair with `AnimatePresence` for entering/leaving rows.

7. **Skeletons over spinners.** You already have `loading.tsx` files and a `page-loading-skeleton`. Make skeletons match the final card dimensions exactly (same radius, same height) so there is zero layout shift when content swaps in. Add a slow shimmer (`--dur-slow`, low-opacity sweep) rather than a pulsing block.

8. **Confetti restraint.** `canvas-confetti` is great for a won bet, but fire it once, low particle count, and never on page load. Premium celebration is brief.

9. **Page transitions.** You have an `(app)/template.tsx`. A short cross-fade plus 8px rise on route change (`initial/animate` with `--dur-base`) makes navigation feel intentional. Keep it under 250ms so it never feels like waiting.

10. **Honor reduced motion globally.** Add to `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Suggested sequencing

Start with Phase 2 tokens (one file, cascades everywhere), then the `Button` and `Card` rewrites (two files, highest visual leverage), then the `DashboardBento` de-duplication (clear perf win, no visual change), then the motion checklist item by item. Each step is independently shippable and reversible.
