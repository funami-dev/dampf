import { z } from "zod";

/** SemVer MAJOR.MINOR.PATCH ohne führende Nullen (MANIFEST-AK-10) */
export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** Vergleich zweier SemVer-Versionen: negativ, 0, positiv */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i]! - pb[i]!;
  return 0;
}

const changelogEntry = z.object({
  version: z.string().regex(SEMVER, "Version im Format MAJOR.MINOR.PATCH, z. B. 1.0.0"),
  date: z.iso.date(),
  /** Uhrzeit (deutsche Zeit) „HH:MM“ – ungefähr wann der Eintrag live ging */
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit im Format HH:MM")
    .optional(),
  items: z.array(z.string().min(1).max(120)).min(1).max(6),
});
export type ChangelogEntry = z.infer<typeof changelogEntry>;

export const gameManifestSchema = z
  .object({
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
    version: z.string().regex(SEMVER, "Version im Format MAJOR.MINOR.PATCH, z. B. 1.0.0"),
    changelog: z.array(changelogEntry).min(1, "mindestens ein Eintrag"),
  })
  .superRefine((m, ctx) => {
    const log = m.changelog;
    if (log[0] && log[0].version !== m.version)
      ctx.addIssue({
        code: "custom",
        path: ["changelog", 0, "version"],
        message: `oberster Eintrag muss die aktuelle Version ${m.version} haben`,
      });
    log.forEach((e, i) => {
      if (e.date < m.addedAt)
        ctx.addIssue({
          code: "custom",
          path: ["changelog", i, "date"],
          message: "Datum liegt vor addedAt",
        });
      const next = log[i + 1];
      if (!next) return;
      if (compareVersions(e.version, next.version) <= 0)
        ctx.addIssue({
          code: "custom",
          path: ["changelog", i + 1, "version"],
          message: "Versionen müssen eindeutig und absteigend sein (neueste zuerst)",
        });
      if (newsDateTime(e) < newsDateTime(next))
        ctx.addIssue({
          code: "custom",
          path: ["changelog", i + 1, "date"],
          message: "Daten müssen absteigend sein (neueste zuerst)",
        });
    });
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

/** Eintrag im Bereich „Neuigkeiten“ */
export interface NewsItem {
  slug: string;
  title: string;
  version: string;
  date: string;
  time?: string;
  items: string[];
}

/** Sortier- und `datetime`-Schlüssel: „2026-11-10T12:52“ bzw. nur das Datum */
export const newsDateTime = (e: { date: string; time?: string }) =>
  e.time ? `${e.date}T${e.time}` : e.date;

/**
 * Neuigkeiten aus den Änderungsprotokollen veröffentlichter Spiele (PORTAL-AK-11):
 * neueste zuerst (nach Datum und Uhrzeit), bei Gleichstand in der Reihenfolge der Startseite;
 * höchstens `limit`.
 */
export function newsEntries(games: readonly GameManifest[], limit = 10): NewsItem[] {
  const listed = listedGames(games);
  return listed
    .flatMap((g, order) =>
      g.changelog.map((e) => ({ order, n: { slug: g.slug, title: g.title, ...e } })),
    )
    .sort((a, b) => {
      const ka = newsDateTime(a.n);
      const kb = newsDateTime(b.n);
      return ka < kb ? 1 : ka > kb ? -1 : a.order - b.order;
    })
    .slice(0, limit)
    .map((x) => x.n);
}

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
/** „2026-11-08“ → „8. November 2026“, mit Uhrzeit „8. November 2026, 14:05 Uhr“ */
export function formatDate(iso: string, time?: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${MONTHS[m! - 1]} ${y}${time ? `, ${time} Uhr` : ""}`;
}
