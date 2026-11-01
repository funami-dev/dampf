import { listedGames, loadManifests } from "@dampf/game-kit/node";

/** Alle veröffentlichten Spiele, zur Build-Zeit aus games/*\/game.json gelesen (PORTAL-AK-08). */
export const getGames = () => listedGames(loadManifests(import.meta.env.DAMPF_GAMES_DIR));
