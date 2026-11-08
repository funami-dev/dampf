import { listedGames, loadManifests, newsEntries } from "@dampf/game-kit/node";

/** Alle veröffentlichten Spiele, zur Build-Zeit aus games/*\/game.json gelesen (PORTAL-AK-08). */
export const getGames = () => listedGames(loadManifests(import.meta.env.DAMPF_GAMES_DIR));

/** Neuigkeiten aus den Änderungsprotokollen (PORTAL-AK-11) */
export const getNews = () => newsEntries(loadManifests(import.meta.env.DAMPF_GAMES_DIR), 10);
