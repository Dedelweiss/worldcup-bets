import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "flagcdn.com",
  "www.flagcdn.com",
  ".supabase.co",
  ".supabase.in",
];

const PUBLIC_AVATAR_PREFIX = "/avatars/";

function isAllowedImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    return ALLOWED_HOSTS.some(
      (host) =>
        url.hostname === host.replace(/^\./, "") || url.hostname.endsWith(host),
    );
  } catch {
    return false;
  }
}

function isAllowedPublicPath(path: string): boolean {
  return (
    path.startsWith(PUBLIC_AVATAR_PREFIX) &&
    !path.includes("..") &&
    /\.(svg|png|jpe?g|webp)$/i.test(path)
  );
}

function contentTypeForPath(path: string): string {
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  return "image/png";
}

/** Proxy pour inliner avatar / drapeaux dans l'export PNG (CORS + SVG locaux). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pathParam = searchParams.get("path");
  const urlParam = searchParams.get("url");

  if (pathParam) {
    if (!isAllowedPublicPath(pathParam)) {
      return NextResponse.json({ error: "Chemin non autorisé" }, { status: 400 });
    }

    try {
      const filePath = join(process.cwd(), "public", pathParam.slice(1));
      const buffer = await readFile(filePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentTypeForPath(pathParam),
          "Cache-Control": "private, max-age=86400",
        },
      });
    } catch {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    }
  }

  if (!urlParam || !isAllowedImageUrl(urlParam)) {
    return NextResponse.json({ error: "URL non autorisée" }, { status: 400 });
  }

  const upstream = await fetch(urlParam, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json({ error: "Image introuvable" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/png";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
