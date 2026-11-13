import type { WordExportRow, WordPlace, WordRegion } from "./api";

export type RegionOption = { value: string; label: string; state: string | null; city: string | null };

/** The region filter: every region, then each state with all its cities, then each city. Most used first. */
export function regionOptions(rows: WordRegion[], labels: { all: string; allCities: (state: string) => string; unknown: string }): RegionOption[] {
  const states = new Map<string, number>();
  for (const r of rows) if (r.state) states.set(r.state, (states.get(r.state) ?? 0) + r.uses);
  return [
    { value: "all", label: labels.all, state: null, city: null },
    ...[...states.entries()].sort((a, b) => b[1] - a[1]).map(([state]) => ({ value: `state:${state}`, label: labels.allCities(state), state, city: null })),
    ...rows.map((r) => ({
      value: `city:${r.state}:${r.city}`,
      label: [r.city, r.state].filter(Boolean).join(", ") || labels.unknown,
      state: r.state, city: r.city,
    })),
  ];
}

/** Where a word was used, for the admin: "Post, form list: Need Skilled Person › Which skill?" or "Post, choosing the type: What do you need?". */
export function placeName(p: WordPlace, hi: boolean, labels: { source: (source: string) => string; section: (section: string) => string }): string {
  const type = hi ? p.type_hi ?? p.type_en : p.type_en;
  const field = hi ? p.field_hi ?? p.field_en : p.field_en;
  const detail = type ? [type, field].filter(Boolean).join(" › ") : p.source === "type_list" && p.section ? labels.section(p.section) : "";
  return detail ? `${labels.source(p.source)}: ${detail}` : labels.source(p.source);
}

/**
 * A spreadsheet of the words. The words were typed by the public, so a cell that a spreadsheet would run as a formula
 * (starting with = + - @) gets a leading ' to keep it plain text (CSV injection).
 */
export function wordsToCsv(rows: WordExportRow[]): string {
  const cell = (v: string | number) => {
    const s = String(v);
    const safe = typeof v === "string" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const header = ["word", "status", "flow", "source", "section", "city", "state", "uses", "found_nothing"];
  return [header, ...rows.map((r) => [r.word, r.status, r.flow, r.source, r.section, r.city, r.state, r.uses, r.found_nothing])].map((line) => line.map(cell).join(",")).join("\n");
}
