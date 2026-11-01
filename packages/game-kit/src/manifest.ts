import { z } from "zod";

export const gameManifestSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "nur a-z, 0-9 und Bindestriche"),
  title: z.string().min(1).max(40),
  description: z.string().min(1).max(160),
  thumbnail: z.string().min(1),
  controls: z
    .object({ keyboard: z.boolean(), touch: z.boolean() })
    .refine((c) => c.keyboard || c.touch, "mindestens eine Steuerungsart muss true sein"),
  status: z.enum(["published", "draft"]),
  order: z.number().int().optional(),
  addedAt: z.iso.date(),
});

export type GameManifest = z.infer<typeof gameManifestSchema>;

export class ManifestError extends Error {
  override name = "ManifestError";
}

/** Validiert ein Manifest. Fehler nennen Datei und Feld (BUILD-AK-04, MANIFEST-AK-02). */
export function parseManifest(data: unknown, file: string): GameManifest {
  const result = gameManifestSchema.safeParse(data);
  if (result.success) return result.data;
  const issues = result.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new ManifestError(`Ungültiges Manifest ${file}:\n${issues}`);
}

const collator = new Intl.Collator("de");

/** Spiele für die Startseite: nur veröffentlichte, sortiert nach order, dann title. */
export function listedGames(games: readonly GameManifest[]): GameManifest[] {
  return games
    .filter((g) => g.status === "published")
    .sort(
      (a, b) =>
        (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) ||
        collator.compare(a.title, b.title),
    );
}

export const gameUrl = (slug: string) => `/games/${slug}/`;
