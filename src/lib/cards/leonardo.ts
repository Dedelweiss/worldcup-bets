import "server-only";

const LEONARDO_API = "https://cloud.leonardo.ai/api/rest/v1";

/** Lucid Origin — défaut sans Alchemy (Kino 2.x, Lucid, etc.). */
const DEFAULT_MODEL_ID = "7b592283-e8a7-4c5a-9ba6-d18c31f258b9";

/** SDXL models that support Alchemy + presetStyle (Leonardo docs). */
const SDXL_ALCHEMY_MODEL_IDS = new Set([
  "aa77f04e-3eec-4034-9c07-d0f619684628", // Leonardo Kino XL
  "5c232a9e-9061-4777-980a-ddc8e65647c6", // Leonardo Vision XL
  "1e60896f-3c26-4296-8ecc-53e2afecc132", // Leonardo Diffusion XL
  "e71a1c2f-4f80-4800-934f-2c68979d8cc8", // Leonardo Anime XL
  "b24e16ff-06e3-43eb-8d33-4416c2d75876", // Leonardo Lightning XL
  "16e7060a-803e-4df3-97ee-edcfa5dc9cc8", // SDXL 1.0
  "b63f7119-31dc-4540-969b-2a9df997e173", // SDXL 0.9
  "2067ae52-33fd-4a82-bb92-c2c55e7d2786", // AlbedoBase XL
]);

/** Illustration preset for styleUUID-based models (Lucid, Kino 2.x, Flux, …). */
const ILLUSTRATION_STYLE_UUID = "645e4195-f63d-4715-a3f2-3fb1e6eb8c70";

function leonardoUseAlchemy(modelId: string): boolean {
  const override = process.env.LEONARDO_USE_ALCHEMY?.trim().toLowerCase();
  if (override === "true" || override === "1") return true;
  if (override === "false" || override === "0") return false;
  return SDXL_ALCHEMY_MODEL_IDS.has(modelId);
}

function buildLeonardoPayload(
  prompt: string,
  modelId: string,
  negativePrompt?: string,
): Record<string, unknown> {
  const useAlchemy = leonardoUseAlchemy(modelId);
  const isSdxl = SDXL_ALCHEMY_MODEL_IDS.has(modelId);

  const payload: Record<string, unknown> = {
    prompt,
    modelId,
    width: 768,
    height: 1024,
    num_images: 1,
  };

  if (negativePrompt?.trim()) {
    payload.negative_prompt = negativePrompt.trim();
  }

  if (useAlchemy) {
    payload.alchemy = true;
    payload.presetStyle = "ILLUSTRATION";
  } else if (isSdxl) {
    payload.presetStyle = "ILLUSTRATION";
  } else {
    // Kino 2.x, Lucid Origin/Realism, Flux, Phoenix, etc.
    payload.contrast = 3.5;
    payload.styleUUID = ILLUSTRATION_STYLE_UUID;
  }

  return payload;
}

export function isLeonardoConfigured(): boolean {
  return Boolean(process.env.LEONARDO_API_KEY?.trim());
}

function leonardoHeaders(): HeadersInit {
  const key = process.env.LEONARDO_API_KEY?.trim();
  if (!key) {
    throw new Error("LEONARDO_API_KEY manquant dans .env.local");
  }
  return {
    Authorization: `Bearer ${key}`,
    accept: "application/json",
    "Content-Type": "application/json",
  };
}

export async function createLeonardoGeneration(
  prompt: string,
  options?: { negativePrompt?: string },
): Promise<string> {
  const modelId = process.env.LEONARDO_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  const payload = buildLeonardoPayload(
    prompt,
    modelId,
    options?.negativePrompt,
  );

  const res = await fetch(`${LEONARDO_API}/generations`, {
    method: "POST",
    headers: leonardoHeaders(),
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (body.error as string | undefined) ??
      (body.message as string | undefined) ??
      `Leonardo HTTP ${res.status}`;
    throw new Error(msg);
  }

  const job = body.sdGenerationJob as { generationId?: string } | undefined;
  const generationId =
    job?.generationId ??
    (body.generationId as string | undefined) ??
    (body.generation_id as string | undefined);

  if (!generationId) {
    throw new Error("Réponse Leonardo sans generationId");
  }

  return generationId;
}

export type LeonardoGenerationState =
  | { status: "pending" }
  | { status: "complete"; imageUrl: string }
  | { status: "failed"; message: string };

export async function fetchLeonardoGeneration(
  generationId: string,
): Promise<LeonardoGenerationState> {
  const res = await fetch(`${LEONARDO_API}/generations/${generationId}`, {
    headers: leonardoHeaders(),
    cache: "no-store",
  });

  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (body.error as string | undefined) ??
      (body.message as string | undefined) ??
      `Leonardo HTTP ${res.status}`;
    throw new Error(msg);
  }

  const pk = body.generations_by_pk as
    | {
        status?: string;
        generated_images?: { url?: string }[];
      }
    | undefined;

  const status = (pk?.status ?? "").toUpperCase();

  if (status === "FAILED") {
    return { status: "failed", message: "Génération Leonardo échouée" };
  }

  if (status !== "COMPLETE") {
    return { status: "pending" };
  }

  const imageUrl = pk?.generated_images?.[0]?.url;
  if (!imageUrl) {
    return { status: "pending" };
  }

  return { status: "complete", imageUrl };
}
