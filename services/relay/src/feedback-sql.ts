/** Feedback-Speicher in SQLite (Durable Object `FeedbackStore`, Spec 004). */
import type { Feedback, FeedbackRepo, ListFilter, Status } from "./feedback.ts";

/** Teil der Durable-Object-SQL-API (`ctx.storage.sql`), den wir brauchen */
export interface SqlLike {
  exec(query: string, ...bindings: unknown[]): { toArray(): Record<string, unknown>[] };
}

export class SqlRepo implements FeedbackRepo {
  constructor(private sql: SqlLike) {
    sql.exec(`CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL,
      game TEXT NOT NULL,
      duplicate_of TEXT,
      data TEXT NOT NULL
    )`);
    sql.exec("CREATE INDEX IF NOT EXISTS feedback_status ON feedback (status, created_at)");
  }

  private rows(query: string, ...b: unknown[]): Feedback[] {
    return this.sql
      .exec(query, ...b)
      .toArray()
      .map((r) => JSON.parse(String(r.data)) as Feedback);
  }

  insert(e: Feedback) {
    this.sql.exec(
      "INSERT INTO feedback (id, created_at, updated_at, status, game, duplicate_of, data) VALUES (?, ?, ?, ?, ?, ?, ?)",
      e.id,
      e.createdAt,
      e.updatedAt,
      e.status,
      e.game,
      e.duplicateOf ?? null,
      JSON.stringify(e),
    );
  }
  get(id: string) {
    return this.rows("SELECT data FROM feedback WHERE id = ?", id)[0];
  }
  update(e: Feedback) {
    this.sql.exec(
      "UPDATE feedback SET updated_at = ?, status = ?, duplicate_of = ?, data = ? WHERE id = ?",
      e.updatedAt,
      e.status,
      e.duplicateOf ?? null,
      JSON.stringify(e),
      e.id,
    );
  }
  remove(id: string) {
    const n = this.sql.exec("SELECT COUNT(*) AS n FROM feedback WHERE id = ?", id).toArray()[0]?.n;
    this.sql.exec("DELETE FROM feedback WHERE id = ?", id);
    return Number(n) > 0;
  }
  list(f: ListFilter) {
    const where: string[] = [];
    const b: unknown[] = [];
    const add = (cond: string, value: string | undefined) => {
      if (value === undefined) return;
      where.push(cond);
      b.push(value);
    };
    add("status = ?", f.status);
    add("game = ?", f.game);
    add("created_at >= ?", f.from);
    add("created_at < ?", f.to);
    const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
    return this.rows(
      `SELECT data FROM feedback ${w} ORDER BY created_at, id LIMIT ?`,
      ...b,
      f.limit,
    );
  }
  count() {
    return Number(this.sql.exec("SELECT COUNT(*) AS n FROM feedback").toArray()[0]?.n ?? 0);
  }
  countBy() {
    return this.sql
      .exec("SELECT status, game, COUNT(*) AS n FROM feedback GROUP BY status, game")
      .toArray()
      .map((r) => ({ status: r.status as Status, game: String(r.game), n: Number(r.n) }));
  }
  purge(doneBefore: string, anyBefore: string) {
    const cond =
      "(status IN ('umgesetzt', 'abgelehnt', 'archiviert') AND updated_at < ?) OR created_at < ?";
    const n = this.sql
      .exec(`SELECT COUNT(*) AS n FROM feedback WHERE ${cond}`, doneBefore, anyBefore)
      .toArray()[0]?.n;
    this.sql.exec(`DELETE FROM feedback WHERE ${cond}`, doneBefore, anyBefore);
    return Number(n ?? 0);
  }
  hasDuplicatesOf(id: string) {
    return (
      this.sql.exec("SELECT 1 FROM feedback WHERE duplicate_of = ? LIMIT 1", id).toArray().length >
      0
    );
  }
}
