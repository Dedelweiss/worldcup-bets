"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPoints } from "@/lib/format";
import type { PointsHistoryPoint } from "@/lib/profile/points-history";
import { cn } from "@/lib/utils";

const CHART = {
  width: 480,
  height: 200,
  padX: 36,
  padY: 20,
  padBottom: 28,
} as const;

interface PointsEvolutionChartProps {
  points: PointsHistoryPoint[];
  currentPoints: number;
}

function formatAxisDate(iso: string): string {
  return format(new Date(iso), "d MMM", { locale: fr });
}

function formatTooltipDate(iso: string): string {
  return format(new Date(iso), "EEE d MMM · HH:mm", { locale: fr });
}

export function PointsEvolutionChart({
  points,
  currentPoints,
}: PointsEvolutionChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    const innerW = CHART.width - CHART.padX * 2;
    const innerH = CHART.height - CHART.padY - CHART.padBottom;
    const maxY = Math.max(
      currentPoints,
      ...points.map((p) => p.points),
      1,
    );
    const minY = 0;

    const xAt = (i: number) =>
      points.length <= 1
        ? CHART.padX + innerW / 2
        : CHART.padX + (i / (points.length - 1)) * innerW;

    const yAt = (value: number) =>
      CHART.padY +
      innerH -
      ((value - minY) / (maxY - minY || 1)) * innerH;

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.points)}`)
      .join(" ");

    const areaPath =
      linePath +
      ` L ${xAt(points.length - 1)} ${CHART.padY + innerH} L ${xAt(0)} ${CHART.padY + innerH} Z`;

    const yTicks = [0, Math.round(maxY / 2), maxY].filter(
      (v, i, arr) => arr.indexOf(v) === i,
    );

    const xLabelIndices =
      points.length <= 4
        ? points.map((_, i) => i)
        : [0, Math.floor((points.length - 1) / 2), points.length - 1];

    return {
      innerW,
      innerH,
      maxY,
      xAt,
      yAt,
      linePath,
      areaPath,
      yTicks,
      xLabelIndices,
    };
  }, [points, currentPoints]);

  const active =
    activeIndex != null && points[activeIndex] != null
      ? points[activeIndex]
      : null;

  const hasActivity = points.some((p) => p.kind !== "start" && p.delta !== 0);

  if (!hasActivity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Évolution des points</CardTitle>
          <CardDescription>
            Vos gains apparaîtront ici après la clôture de vos premiers paris.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
            Aucun pari réglé pour le moment
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Évolution des points</CardTitle>
        <CardDescription>
          Cumul après chaque match réglé · survolez un point pour le détail
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="relative w-full"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <svg
            viewBox={`0 0 ${CHART.width} ${CHART.height}`}
            className="h-auto w-full text-primary"
            role="img"
            aria-label="Graphique d'évolution des points"
          >
            {chart.yTicks.map((tick) => {
              const y = chart.yAt(tick);
              return (
                <g key={tick}>
                  <line
                    x1={CHART.padX}
                    x2={CHART.width - CHART.padX}
                    y1={y}
                    y2={y}
                    className="stroke-border"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={CHART.padX - 6}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {formatPoints(tick)}
                  </text>
                </g>
              );
            })}

            <path d={chart.areaPath} className="fill-primary/10" />
            <path
              d={chart.linePath}
              fill="none"
              className="stroke-primary"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((p, i) => {
              const cx = chart.xAt(i);
              const cy = chart.yAt(p.points);
              const isWin = p.kind === "win";
              const isLoss = p.kind === "loss";
              return (
                <g key={`${p.at}-${i}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={14}
                    className="fill-transparent"
                    onMouseEnter={() => setActiveIndex(i)}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={activeIndex === i ? 5 : 3.5}
                    className={cn(
                      "stroke-background stroke-[1.5]",
                      isWin && "fill-primary",
                      isLoss && "fill-muted-foreground",
                      !isWin && !isLoss && "fill-primary/70",
                    )}
                  />
                </g>
              );
            })}

            {chart.xLabelIndices.map((i) => (
              <text
                key={i}
                x={chart.xAt(i)}
                y={CHART.height - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {formatAxisDate(points[i]!.at)}
              </text>
            ))}
          </svg>

          {active && activeIndex != null && (
            <div
              className="pointer-events-none absolute top-0 z-10 max-w-[min(100%,16rem)] rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md"
              style={{
                left: `${(activeIndex / Math.max(points.length - 1, 1)) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              <p className="text-xs text-muted-foreground">
                {formatTooltipDate(active.at)}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug">
                {active.label}
              </p>
              <p className="mt-1 tabular-nums text-sm">
                <span className="font-semibold text-primary">
                  {formatPoints(active.points)} pts
                </span>
                {active.delta > 0 && (
                  <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    +{formatPoints(active.delta)}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            Gain
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground" />
            Pari perdu (points inchangés)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
