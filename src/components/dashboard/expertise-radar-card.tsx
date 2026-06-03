"use client";

import { Activity } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MOCK_EXPERTISE_RADAR,
  type ExpertiseRadarAxis,
} from "@/lib/dashboard/expertise-radar";
import { cn } from "@/lib/utils";

const NEON_LIME = "#ccff00";

interface ExpertiseRadarCardProps {
  data?: ExpertiseRadarAxis[];
  className?: string;
}

export function ExpertiseRadarCard({
  data = MOCK_EXPERTISE_RADAR,
  className,
}: ExpertiseRadarCardProps) {
  return (
    <Card
      className={cn(
        "rounded-3xl border-white/10 bg-zinc-900/50 backdrop-blur-md md:self-start",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-lg">
          <Activity className="size-5 text-[#ccff00]" aria-hidden />
          Ton Profil de Parieur
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Radar d&apos;expertise — aperçu (données de démonstration)
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[min(16rem,42vw)] min-h-[200px] w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="72%"
              data={data}
              margin={{ top: 8, right: 24, bottom: 8, left: 24 }}
            >
              <PolarGrid stroke="#ffffff20" radialLines={false} />
              <PolarAngleAxis
                dataKey="axis"
                tick={{
                  fill: "#a1a1aa",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "var(--font-heading), ui-sans-serif, system-ui",
                }}
                tickFormatter={(label) => String(label).toUpperCase()}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Profil"
                dataKey="value"
                stroke={NEON_LIME}
                strokeWidth={2}
                fill={NEON_LIME}
                fillOpacity={0.35}
                dot={{ r: 3, fill: NEON_LIME, strokeWidth: 0 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
