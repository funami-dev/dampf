# Hinweise für Claude

- Sprache im Projekt: Deutsch (Specs, UI-Texte, Antworten). Commit-Messages auf Englisch.
- Spec-driven arbeiten: erst `specs/` anpassen und abnehmen lassen, dann Tests, dann Code
  (siehe `specs/README.md`).
- Vor jedem Push: `npm run lint`, `npm test` und `npm run test:e2e`.
- **Production prüfen:** Nach jedem Merge nach `master` die Live-Seite https://dampf.vercel.app
  prüfen, sobald der Vercel-Deploy durch ist: `npm run test:prod` (E2E-Tests gegen Production).
  Ist die Domain aus der Umgebung nicht erreichbar, den Nutzer darauf hinweisen, statt die
  Prüfung stillschweigend zu überspringen.
