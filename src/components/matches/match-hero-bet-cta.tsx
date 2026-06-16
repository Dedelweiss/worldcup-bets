"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MatchHeroBetCta() {
  function scrollToBetSlip() {
    document
      .getElementById("mon-pronostic")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Button
      type="button"
      size="sm"
      className="gap-1.5 font-semibold"
      onClick={scrollToBetSlip}
    >
      Placer mon pronostic
      <ChevronDown className="size-4" aria-hidden />
    </Button>
  );
}
