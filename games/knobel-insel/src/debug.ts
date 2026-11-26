/** Test-Schnittstelle, nur mit ?e2e in der URL */
export const debugEnabled = new URLSearchParams(location.search).has("e2e");
