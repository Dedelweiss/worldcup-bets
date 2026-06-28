import { describe, expect, it } from "vitest";
import { isNavItemActive } from "@/lib/sport/nav-active";
import { resolveActiveSportForPath } from "@/lib/sport/resolve-active-sport-for-path";

describe("isNavItemActive", () => {
  it("highlights only calendrier on f1 sub-routes except meeting pages", () => {
    expect(isNavItemActive("/f1/standings", "/f1")).toBe(false);
    expect(isNavItemActive("/f1/leaderboard", "/f1")).toBe(false);
    expect(isNavItemActive("/f1/standings", "/f1/standings")).toBe(true);
    expect(isNavItemActive("/f1/leaderboard", "/f1/leaderboard")).toBe(true);
    expect(isNavItemActive("/f1/1234", "/f1")).toBe(true);
    expect(isNavItemActive("/f1", "/f1")).toBe(true);
  });
});

describe("resolveActiveSportForPath", () => {
  it("defaults to football on dashboard even if profile prefers f1", () => {
    expect(resolveActiveSportForPath("/dashboard", "f1")).toBe("football");
    expect(resolveActiveSportForPath("/matches", "f1")).toBe("football");
  });

  it("uses f1 on f1 routes", () => {
    expect(resolveActiveSportForPath("/f1/standings", "football")).toBe("f1");
  });

  it("keeps stored sport on shared routes", () => {
    expect(resolveActiveSportForPath("/bets", "f1")).toBe("f1");
    expect(resolveActiveSportForPath("/profile", "football")).toBe("football");
  });
});
