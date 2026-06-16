// In-memory mock of the slice of supabase-js the app actually uses, backed by
// localStorage. Active only in guest/demo mode (see ./guest and ./supabase).
//
// Supports: .from(table) with select / insert / update / upsert / delete, the
// filter operators the app uses (eq, neq, gt(e), lt(e), in, is, contains,
// ilike, match), ordering / limit / range, single / maybeSingle, and PostgREST
// to-one embeds (`alias:table(...)`, `!inner`). No network, no real auth.
//
// It is deliberately lenient: unknown operations are no-ops and errors resolve
// to empty results rather than throwing, so a demo never hard-crashes.

import { GUEST_USER, GUEST_SESSION, isGuestMode, exitGuestMode } from './guest';

const LS_KEY = 'workin_guest_db_v1';

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

let cache: Db | null = null;

function loadDb(): Db {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Db;
  } catch {
    cache = {};
  }
  return cache;
}

function persist(): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch {
    /* quota — demo data just won't survive a reload */
  }
}

function table(name: string): Row[] {
  const db = loadDb();
  if (!db[name]) db[name] = [];
  return db[name];
}

function uuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function withDefaults(r: Row): Row {
  return { ...r, id: r.id ?? uuid(), created_at: r.created_at ?? new Date().toISOString() };
}

// ─── Seed helpers (used by guestSeed) ───────────────────────────────────────
export function seedTable(name: string, rows: Row[]): void {
  loadDb()[name] = rows.map(withDefaults);
  persist();
}
export function getRows(name: string): Row[] {
  return [...table(name)];
}
export function isGuestSeeded(): boolean {
  return table('__seeded').length > 0;
}
export function markGuestSeeded(): void {
  loadDb()['__seeded'] = [{ at: new Date().toISOString() }];
  persist();
}
export function resetGuestDb(): void {
  cache = {};
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

// ─── Embedded (to-one) relationships the app selects ────────────────────────
// key: `<queriedTable>:<embeddedTable>` → foreign-key column on the queried row.
const EMBED_FK: Record<string, string> = {
  'set_logs:workout_sessions': 'session_id',
  'set_logs:exercises': 'exercise_id',
  'block_exercises:exercises': 'exercise_id',
};

interface Embed {
  alias: string;
  table: string;
  inner: boolean;
}

function parseEmbeds(sel: string): Embed[] {
  const embeds: Embed[] = [];
  if (!sel) return embeds;
  // `alias:table!inner(` or `table(` — plain scalar columns have no '(' and are ignored.
  const re = /(?:(\w+):)?(\w+)(!inner|!left)?\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sel)) !== null) {
    embeds.push({ alias: m[1] ?? m[2], table: m[2], inner: m[3] === '!inner' });
  }
  return embeds;
}

type FilterKind =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is' | 'contains' | 'ilike';
interface Filter {
  kind: FilterKind;
  col: string;
  val: unknown;
}

type Result = { data: unknown; error: { message: string } | null; count: number | null };

class GuestQuery implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: Row[] = [];
  private filters: Filter[] = [];
  private embeds: Embed[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private rangeFromTo: [number, number] | null = null;
  private singleMode: 'single' | 'maybe' | null = null;
  private returnRows = false;
  private onConflictCols: string[] = ['id'];
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(sel?: string) {
    this.embeds = parseEmbeds(sel ?? '');
    if (this.op !== 'select') this.returnRows = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = 'insert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(patch: Row) {
    this.op = 'update';
    this.payload = [patch];
    return this;
  }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    this.op = 'upsert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    if (opts?.onConflict) this.onConflictCols = opts.onConflict.split(',').map((s) => s.trim());
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }

  eq(col: string, val: unknown) { this.filters.push({ kind: 'eq', col, val }); return this; }
  neq(col: string, val: unknown) { this.filters.push({ kind: 'neq', col, val }); return this; }
  gt(col: string, val: unknown) { this.filters.push({ kind: 'gt', col, val }); return this; }
  gte(col: string, val: unknown) { this.filters.push({ kind: 'gte', col, val }); return this; }
  lt(col: string, val: unknown) { this.filters.push({ kind: 'lt', col, val }); return this; }
  lte(col: string, val: unknown) { this.filters.push({ kind: 'lte', col, val }); return this; }
  in(col: string, vals: unknown[]) { this.filters.push({ kind: 'in', col, val: vals }); return this; }
  is(col: string, val: unknown) { this.filters.push({ kind: 'is', col, val }); return this; }
  contains(col: string, val: unknown) { this.filters.push({ kind: 'contains', col, val }); return this; }
  ilike(col: string, val: string) { this.filters.push({ kind: 'ilike', col, val }); return this; }
  like(col: string, val: string) { this.filters.push({ kind: 'ilike', col, val }); return this; }
  match(obj: Row) {
    for (const [col, val] of Object.entries(obj)) this.filters.push({ kind: 'eq', col, val });
    return this;
  }
  // PostgREST `.or()` is best-effort no-op here — the demo just shows unfiltered results.
  or() { return this; }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  range(from: number, to: number) { this.rangeFromTo = [from, to]; return this; }
  single() { this.singleMode = 'single'; this.returnRows = true; return this; }
  maybeSingle() { this.singleMode = 'maybe'; this.returnRows = true; return this; }

  private passes(row: Row): boolean {
    return this.filters.every((f) => {
      const v = row[f.col] as any;
      switch (f.kind) {
        case 'eq': return v === f.val;
        case 'neq': return v !== f.val;
        case 'gt': return v > (f.val as any);
        case 'gte': return v >= (f.val as any);
        case 'lt': return v < (f.val as any);
        case 'lte': return v <= (f.val as any);
        case 'in': return Array.isArray(f.val) && f.val.includes(v);
        case 'is': return f.val === null ? v === null || v === undefined : v === f.val;
        case 'contains':
          return Array.isArray(v) && Array.isArray(f.val) && f.val.every((x) => (v as unknown[]).includes(x));
        case 'ilike':
          return String(v ?? '').toLowerCase().includes(String(f.val).replace(/%/g, '').toLowerCase());
        default: return true;
      }
    });
  }

  private applyEmbeds(rows: Row[]): Row[] {
    if (this.embeds.length === 0) return rows;
    const out: Row[] = [];
    for (const row of rows) {
      const enriched: Row = { ...row };
      let drop = false;
      for (const emb of this.embeds) {
        const fk = EMBED_FK[`${this.tableName}:${emb.table}`];
        const foreign = fk ? table(emb.table).find((r) => r.id === row[fk]) ?? null : null;
        if (emb.inner && !foreign) { drop = true; break; }
        enriched[emb.alias] = foreign;
      }
      if (!drop) out.push(enriched);
    }
    return out;
  }

  private finalize(rows: Row[]): Result {
    if (this.singleMode) return { data: rows[0] ?? null, error: null, count: rows.length };
    return { data: rows, error: null, count: rows.length };
  }

  private exec(): Result {
    try {
      if (this.op === 'select') {
        let rows = table(this.tableName).filter((r) => this.passes(r));
        rows = this.applyEmbeds(rows);
        if (this.orderCol) {
          const c = this.orderCol;
          const dir = this.orderAsc ? 1 : -1;
          rows = [...rows].sort((a, b) => (a[c] === b[c] ? 0 : (a[c] as any) > (b[c] as any) ? dir : -dir));
        }
        if (this.rangeFromTo) rows = rows.slice(this.rangeFromTo[0], this.rangeFromTo[1] + 1);
        if (this.limitN != null) rows = rows.slice(0, this.limitN);
        return this.finalize(rows);
      }
      if (this.op === 'insert') {
        const inserted = this.payload.map(withDefaults);
        table(this.tableName).push(...inserted);
        persist();
        return this.returnRows ? this.finalize(inserted) : { data: null, error: null, count: inserted.length };
      }
      if (this.op === 'update') {
        const patch = this.payload[0] ?? {};
        const updated: Row[] = [];
        for (const r of table(this.tableName)) {
          if (this.passes(r)) { Object.assign(r, patch); updated.push(r); }
        }
        persist();
        return this.returnRows ? this.finalize(updated) : { data: null, error: null, count: updated.length };
      }
      if (this.op === 'upsert') {
        const t = table(this.tableName);
        const result: Row[] = [];
        for (const r of this.payload) {
          const existing = t.find((x) => this.onConflictCols.every((c) => x[c] === r[c]));
          if (existing) { Object.assign(existing, r); result.push(existing); }
          else { const row = withDefaults(r); t.push(row); result.push(row); }
        }
        persist();
        return this.returnRows ? this.finalize(result) : { data: null, error: null, count: result.length };
      }
      if (this.op === 'delete') {
        const kept: Row[] = [];
        const removed: Row[] = [];
        for (const r of table(this.tableName)) (this.passes(r) ? removed : kept).push(r);
        loadDb()[this.tableName] = kept;
        persist();
        return this.returnRows ? this.finalize(removed) : { data: null, error: null, count: removed.length };
      }
      return { data: null, error: null, count: 0 };
    } catch (err) {
      return { data: this.singleMode ? null : [], error: { message: String((err as Error)?.message ?? err) }, count: null };
    }
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.exec()).then(onfulfilled, onrejected);
  }
}

function makeAuth() {
  return {
    async getSession() {
      return { data: { session: isGuestMode() ? GUEST_SESSION : null }, error: null };
    },
    async getUser() {
      return { data: { user: isGuestMode() ? GUEST_USER : null }, error: null };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async signInWithPassword() {
      return { data: { user: GUEST_USER, session: GUEST_SESSION }, error: null };
    },
    async signUp() {
      return { data: { user: GUEST_USER, session: GUEST_SESSION }, error: null };
    },
    async signInWithOtp() {
      return { data: {}, error: null };
    },
    async signOut() {
      resetGuestDb();
      exitGuestMode();
      return { error: null };
    },
  };
}

export function createGuestClient() {
  return {
    from(tableName: string) {
      return new GuestQuery(tableName);
    },
    auth: makeAuth(),
  };
}
