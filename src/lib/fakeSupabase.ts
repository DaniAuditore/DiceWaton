type AuthUser = { id: string; email?: string; is_anonymous?: boolean };
type AuthSession = { user: AuthUser };

type Room = { id: string; pin: string; host_id: string };
type Macro = {
  id: string;
  user_id: string;
  name: string;
  dice_expression: string;
  created_at: string;
};

const USERS_KEY = 'dw:e2e:users';
const ROOMS_KEY = 'dw:e2e:rooms';
const MACROS_KEY = 'dw:e2e:macros';

const authListeners = new Set<(event: string, session: AuthSession | null) => void>();

const readJson = <T>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getSession = (): AuthSession | null => {
  const raw = sessionStorage.getItem('dw:e2e:session');
  return raw ? (JSON.parse(raw) as AuthSession) : null;
};

const setSession = (session: AuthSession | null) => {
  if (session) {
    sessionStorage.setItem('dw:e2e:session', JSON.stringify(session));
  } else {
    sessionStorage.removeItem('dw:e2e:session');
  }
  for (const listener of authListeners) {
    listener(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
  }
};

class FakeChannel {
  private bc: BroadcastChannel;
  private channelName: string;
  private handlers: Array<{ type: string; event?: string; cb: (payload?: any) => void }> = [];
  private presence: Record<string, any[]> = {};
  private presenceKey?: string;

  constructor(name: string, presenceKey?: string) {
    this.channelName = name;
    this.presenceKey = presenceKey;
    this.bc = new BroadcastChannel(`dw:e2e:${this.channelName}`);
    this.bc.onmessage = (event) => {
      const message = event.data;

      if (message.type === 'broadcast') {
        this.handlers
          .filter((h) => h.type === 'broadcast' && h.event === message.event)
          .forEach((h) => h.cb({ payload: message.payload }));
      }

      if (message.type === 'presence-track') {
        this.presence[message.key] = [message.payload];
        this.handlers
          .filter((h) => h.type === 'presence' && h.event === 'sync')
          .forEach((h) => h.cb());
      }
    };
  }

  on(type: 'presence' | 'broadcast', filter: { event: string }, cb: (payload?: any) => void) {
    this.handlers.push({ type, event: filter.event, cb });
    return this;
  }

  subscribe(cb: (status: string) => void) {
    setTimeout(() => cb('SUBSCRIBED'), 0);
    return this;
  }

  async track(payload: any) {
    const key = this.presenceKey || payload.id || crypto.randomUUID();
    this.presence[key] = [payload];
    this.bc.postMessage({ type: 'presence-track', key, payload });
  }

  presenceState() {
    return this.presence;
  }

  send(args: { type: 'broadcast'; event: string; payload: any }) {
    this.bc.postMessage({ type: 'broadcast', event: args.event, payload: args.payload });
  }

  close() {
    this.bc.close();
  }
}

class QueryBuilder {
  private eqField?: string;
  private eqValue?: string;
  private insertPayload: any[] = [];
  private updatePayload: any = null;
  private deleteMode = false;
  private table: 'active_rooms' | 'macros';

  constructor(table: 'active_rooms' | 'macros') {
    this.table = table;
  }

  insert(payload: any | any[]) {
    this.insertPayload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  update(payload: any) {
    this.updatePayload = payload;
    return this;
  }

  delete() {
    this.deleteMode = true;
    return this;
  }

  select() {
    return this;
  }

  eq(field: string, value: string) {
    this.eqField = field;
    this.eqValue = value;
    return this;
  }

  async order(field: string, opts: { ascending: boolean }) {
    const rows = this.readRows().slice().sort((a: any, b: any) => {
      const av = a[field] ?? '';
      const bv = b[field] ?? '';
      return opts.ascending ? `${av}`.localeCompare(`${bv}`) : `${bv}`.localeCompare(`${av}`);
    });
    return { data: rows, error: null };
  }

  async single() {
    if (this.insertPayload.length > 0) {
      const inserted = this.insertRows();
      return { data: inserted[0] ?? null, error: null };
    }

    if (this.updatePayload) {
      const updated = this.updateRows();
      return { data: updated[0] ?? null, error: null };
    }

    const rows = this.filterRows(this.readRows());
    if (!rows[0]) {
      return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
    }
    return { data: rows[0], error: null };
  }

  then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
    this.exec().then(resolve).catch(reject);
  }

  private async exec() {
    if (this.insertPayload.length > 0) {
      return { data: this.insertRows(), error: null };
    }

    if (this.updatePayload) {
      return { data: this.updateRows(), error: null };
    }

    if (this.deleteMode) {
      this.deleteRows();
      return { data: null, error: null };
    }

    return { data: this.filterRows(this.readRows()), error: null };
  }

  private filterRows(rows: any[]) {
    if (!this.eqField) return rows;
    return rows.filter((row) => row[this.eqField!] === this.eqValue);
  }

  private readRows() {
    if (this.table === 'active_rooms') return readJson<Room[]>(ROOMS_KEY, []);
    return readJson<Macro[]>(MACROS_KEY, []);
  }

  private writeRows(rows: any[]) {
    if (this.table === 'active_rooms') {
      writeJson(ROOMS_KEY, rows);
      return;
    }
    writeJson(MACROS_KEY, rows);
  }

  private insertRows() {
    const current = this.readRows();
    const now = new Date().toISOString();
    const rows = this.insertPayload.map((item) => ({
      id: crypto.randomUUID(),
      created_at: now,
      ...item,
    }));
    const merged = [...rows, ...current];
    this.writeRows(merged);
    return rows;
  }

  private updateRows() {
    const current = this.readRows();
    const updated = current.map((row: any) => {
      if (this.eqField && row[this.eqField] === this.eqValue) {
        return { ...row, ...this.updatePayload };
      }
      return row;
    });
    this.writeRows(updated);
    return this.filterRows(updated);
  }

  private deleteRows() {
    const current = this.readRows();
    const remaining = this.eqField
      ? current.filter((row: any) => row[this.eqField!] !== this.eqValue)
      : [];
    this.writeRows(remaining);
  }
}

export const fakeSupabase = {
  auth: {
    async getSession() {
      return { data: { session: getSession() } };
    },
    async getUser() {
      return { data: { user: getSession()?.user ?? null } };
    },
    async signInAnonymously() {
      const session = { user: { id: crypto.randomUUID(), is_anonymous: true } };
      setSession(session);
      return { data: { session }, error: null };
    },
    async signUp({ email, password }: { email: string; password: string }) {
      const users = readJson<Array<{ id: string; email: string; password: string }>>(USERS_KEY, []);
      if (users.some((u) => u.email === email)) {
        return { data: null, error: { message: 'User already exists' } };
      }
      users.push({ id: crypto.randomUUID(), email, password });
      writeJson(USERS_KEY, users);
      return { data: null, error: null };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const users = readJson<Array<{ id: string; email: string; password: string }>>(USERS_KEY, []);
      const user = users.find((u) => u.email === email && u.password === password);
      if (!user) {
        return { data: null, error: { message: 'Invalid login credentials' } };
      }
      const session = { user: { id: user.id, email: user.email } };
      setSession(session);
      return { data: { session }, error: null };
    },
    onAuthStateChange(cb: (event: string, session: AuthSession | null) => void) {
      authListeners.add(cb);
      return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
    },
    async signOut() {
      setSession(null);
      return { error: null };
    },
  },
  from(table: 'active_rooms' | 'macros') {
    return new QueryBuilder(table);
  },
  channel(name: string, opts?: { config?: { presence?: { key?: string } } }) {
    return new FakeChannel(name, opts?.config?.presence?.key);
  },
  removeChannel(channel: FakeChannel) {
    channel.close();
  },
};
