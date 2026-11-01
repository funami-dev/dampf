import { expect, type Page } from "@playwright/test";

/** Sammelt Konsolenfehler, Seitenfehler und fehlgeschlagene Requests (BUILD-AK-03). */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  page.on("requestfailed", (r) => errors.push(`failed: ${r.url()}`));
  return errors;
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) < 600;

export async function expectNoErrors(errors: string[]) {
  expect(errors, errors.join("\n")).toEqual([]);
}
