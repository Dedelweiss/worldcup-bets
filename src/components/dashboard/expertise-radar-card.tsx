"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExpertiseRadarAxis } from "@/lib/dashboard/expertise-radar";
import { cn } from "@/lib/utils";

const NEON_LIME = "#ccff00";
const CHART_HEIGHT = 220;

interface ExpertiseRadarCardProps {
  data: ExpertiseRadarAxis[];
  hasData: boolean;
  ovr?: number;
  isDemo?: boolean;
  className?: string;
}

function RadarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ExpertiseRadarAxis }>;
}) {
  if (!active || !payload?.[0]?.payload) return null;

  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-left shadow-lg backdrop-blur-sm">
      <p className="text-xs font-semibold text-lime-300">{point.axis}</p>
      <p className="font-heading text-lg font-bold tabular-nums text-foreground">
        {point.value}
        <span className="text-xs font-normal text-muted-foreground"> / 99</span>
      </p>
      <p className="mt-1 max-w-[200px] text-[11px] leading-snug text-zinc-400">
        {point.description}
      </p>
    </div>
  );
}

export function ExpertiseRadarCard({
  data,
  hasData,
  ovr,
  isDemo,
  className,
}: ExpertiseRadarCardProps) {
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    setChartReady(true);
  }, []);

  const showEmpty = !hasData && !isDemo;

  return (
    <Card
      className={cn(
        "rounded-3xl border-white/10 bg-zinc-900/50 backdrop-blur-md md:self-start",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Activity className="size-5 text-[#ccff00]" aria-hidden />
            Ton Profil de Parieur
          </CardTitle>
          {hasData && ovr != null && (
            <span className="shrink-0 rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 font-heading text-sm font-bold tabular-nums text-lime-300">
              OVR {ovr}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isDemo
            ? "Aperçu — connectez Supabase pour vos vraies stats"
            : showEmpty
              ? "Placez vos premiers pronostics pour débloquer votre profil"
              : "Calculé depuis vos paris 1N2 et scores exacts réglés"}
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        {showEmpty ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
            <Activity
              className="size-8 text-white/20"
              strokeWidth={1.5}
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">
              Aucun pari classique pour l&apos;instant.
            </p>
            <p className="max-w-[220px] text-xs text-muted-foreground/80">
              Votre radar se remplira au fur et à mesure de vos pronostics.
            </p>
          </div>
        ) : (
          <>
            <div
              className="w-full min-w-0 [&_.recharts-surface]:outline-none"
              style={{ height: CHART_HEIGHT }}
            >
              {chartReady ? (
                <ResponsiveContainer
                  width="100%"
                  height={CHART_HEIGHT}
                  minWidth={0}
                >
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                    data={data}
                    margin={{ top: 12, right: 28, bottom: 12, left: 28 }}
                  >
                    <PolarGrid stroke="#ffffff20" radialLines={false} />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{
                        fill: "#a1a1aa",
                        fontSize: 10,
                        fontWeight: 600,
                        fontFamily:
                          "var(--font-heading), ui-sans-serif, system-ui",
                      }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 99]}
                      tick={false}
                      axisLine={false}
                    />
                    <Tooltip content={<RadarTooltip />} />
                    <Radar
                      name="Profil"
                      dataKey="value"
                      stroke={NEON_LIME}
                      strokeWidth={2}
                      fill={NEON_LIME}
                      fillOpacity={0.3}
                      dot={{ r: 3, fill: NEON_LIME, strokeWidth: 0 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div
                  className="size-full animate-pulse rounded-xl bg-white/[0.04]"
                  aria-hidden
                />
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {data.map((axis) => (
                <div
                  key={axis.axis}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5"
                >
                  <span className="truncate text-[11px] font-medium text-muted-foreground">
                    {axis.axis}
                  </span>
                  <span className="font-heading text-sm font-bold tabular-nums text-lime-300">
                    {axis.value}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
