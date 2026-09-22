import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { initialDecks, initialNotes, initialItems } from "../demoData";

// Thin data-access layer so <App> doesn't care whether it's talking to
// Supabase or to the local demo store. Both implementations expose the
// same async shape.
//
// A note ("card") holds a list of line items, each independently
// flippable with its own `details` — see StickyNote.jsx. Items live in
// their own table/collection (foreign-keyed to their note) rather than a
// jsonb array, so `createdAt`/`archivedAt` are real per-item timestamps —
// e.g. for an agent later summarizing "what got done between date X and
// Y" with a plain range query instead of unpacking JSON arrays.
// Both notes and items carry `archived`/`archivedAt` so they can be
// hidden from the active board without deleting them — see
// DeckColumn.jsx / StickyNote.jsx.

const DEMO_KEY = "organization-demo-data";

function loadDemoState() {
  let state;
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) state = JSON.parse(raw);
  } catch {
    // ignore corrupt local storage, fall through to seed data
  }
  if (!state) state = { decks: initialDecks, notes: initialNotes, items: initialItems };
  if (!state.items) {
    // Migrate older demo saves that still nested items on each note.
    state.items = (state.notes ?? []).flatMap((n) => (n.items ?? []).map((it) => ({ ...it, noteId: n.id })));
    state.notes = (state.notes ?? []).map(({ items, ...rest }) => rest);
    saveDemoState(state);
  }
  return state;
}

function saveDemoState(state) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
}

const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

const demoClient = {
  mode: "demo",

  async getSession() {
    return { user: { id: "demo-user", email: "demo@local" } };
  },

  onAuthStateChange(callback) {
    callback({ user: { id: "demo-user", email: "demo@local" } });
    return { unsubscribe() {} };
  },

  async signInWithPassword() {
    throw new Error("Demo mode has no real auth — connect Supabase to enable login.");
  },

  async signOut() {},

  async listDecks() {
    return loadDemoState().decks.slice().sort((a, b) => a.position - b.position);
  },

  async listNotes() {
    return loadDemoState().notes.slice().sort((a, b) => a.position - b.position);
  },

  async listItems() {
    return loadDemoState().items.slice().sort((a, b) => a.position - b.position);
  },

  async createDeck({ title, color }) {
    const state = loadDemoState();
    const deck = { id: uid(), title, color, position: state.decks.length };
    state.decks.push(deck);
    saveDemoState(state);
    return deck;
  },

  async deleteDeck(deckId) {
    const state = loadDemoState();
    state.decks = state.decks.filter((d) => d.id !== deckId);
    const noteIds = new Set(state.notes.filter((n) => n.deckId === deckId).map((n) => n.id));
    state.notes = state.notes.filter((n) => n.deckId !== deckId);
    state.items = state.items.filter((it) => !noteIds.has(it.noteId));
    saveDemoState(state);
  },

  async createNote({ deckId, color, position, title = "" }) {
    const state = loadDemoState();
    const note = { id: uid(), deckId, color, position, title, archived: false, archivedAt: null, createdAt: nowIso() };
    state.notes.push(note);
    saveDemoState(state);
    return note;
  },

  async updateNote(noteId, changes) {
    const state = loadDemoState();
    state.notes = state.notes.map((n) => {
      if (n.id !== noteId) return n;
      const next = { ...n, ...changes };
      if (changes.archived !== undefined && changes.archived !== n.archived) {
        next.archivedAt = changes.archived ? nowIso() : null;
      }
      return next;
    });
    saveDemoState(state);
  },

  async deleteNote(noteId) {
    const state = loadDemoState();
    state.notes = state.notes.filter((n) => n.id !== noteId);
    state.items = state.items.filter((it) => it.noteId !== noteId);
    saveDemoState(state);
  },

  async moveNote(noteId, deckId, position) {
    return this.updateNote(noteId, { deckId, position });
  },

  async createItem({ noteId, text = "", details = "", checked = false, position = 0 }) {
    const state = loadDemoState();
    const item = {
      id: uid(),
      noteId,
      text,
      details,
      checked,
      archived: false,
      archivedAt: null,
      position,
      createdAt: nowIso(),
    };
    state.items.push(item);
    saveDemoState(state);
    return item;
  },

  async updateItem(itemId, changes) {
    const state = loadDemoState();
    state.items = state.items.map((it) => {
      if (it.id !== itemId) return it;
      const next = { ...it, ...changes };
      if (changes.archived !== undefined && changes.archived !== it.archived) {
        next.archivedAt = changes.archived ? nowIso() : null;
      }
      return next;
    });
    saveDemoState(state);
  },

  async deleteItem(itemId) {
    const state = loadDemoState();
    state.items = state.items.filter((it) => it.id !== itemId);
    saveDemoState(state);
  },
};

function mapItemRow(it) {
  return {
    id: it.id,
    noteId: it.note_id,
    text: it.text ?? "",
    details: it.details ?? "",
    checked: it.checked ?? false,
    archived: it.archived ?? false,
    archivedAt: it.archived_at ?? null,
    position: it.position,
    createdAt: it.created_at,
  };
}

const supabaseClient = {
  mode: "supabase",

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthStateChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return data.subscription;
  },

  async signInWithPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async listDecks() {
    const { data, error } = await supabase.from("decks").select("*").order("position");
    if (error) throw error;
    return data.map((d) => ({ id: d.id, title: d.title, color: d.color, position: d.position }));
  },

  async listNotes() {
    const { data, error } = await supabase.from("notes").select("*").order("position");
    if (error) throw error;
    return data.map((n) => ({
      id: n.id,
      deckId: n.deck_id,
      title: n.title ?? "",
      archived: n.archived ?? false,
      archivedAt: n.archived_at ?? null,
      color: n.color,
      position: n.position,
      createdAt: n.created_at,
    }));
  },

  async listItems() {
    const { data, error } = await supabase.from("items").select("*").order("position");
    if (error) throw error;
    return data.map(mapItemRow);
  },

  async createDeck({ title, color, position }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("decks")
      .insert({ title, color, position, user_id: sessionData.session.user.id })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, title: data.title, color: data.color, position: data.position };
  },

  async deleteDeck(deckId) {
    const { error } = await supabase.from("decks").delete().eq("id", deckId);
    if (error) throw error;
  },

  async createNote({ deckId, color, position, title = "" }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("notes")
      .insert({
        deck_id: deckId,
        title,
        color,
        position,
        user_id: sessionData.session.user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      deckId: data.deck_id,
      title: data.title ?? "",
      archived: data.archived ?? false,
      archivedAt: data.archived_at ?? null,
      color: data.color,
      position: data.position,
      createdAt: data.created_at,
    };
  },

  async updateNote(noteId, changes) {
    const patch = {};
    if (changes.title !== undefined) patch.title = changes.title;
    if (changes.archived !== undefined) patch.archived = changes.archived;
    if (changes.color !== undefined) patch.color = changes.color;
    if (changes.position !== undefined) patch.position = changes.position;
    if (changes.deckId !== undefined) patch.deck_id = changes.deckId;
    const { error } = await supabase.from("notes").update(patch).eq("id", noteId);
    if (error) throw error;
  },

  async deleteNote(noteId) {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) throw error;
  },

  async moveNote(noteId, deckId, position) {
    return this.updateNote(noteId, { deckId, position });
  },

  async createItem({ noteId, text = "", details = "", checked = false, position = 0 }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("items")
      .insert({
        note_id: noteId,
        text,
        details,
        checked,
        position,
        user_id: sessionData.session.user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return mapItemRow(data);
  },

  async updateItem(itemId, changes) {
    const patch = {};
    if (changes.text !== undefined) patch.text = changes.text;
    if (changes.details !== undefined) patch.details = changes.details;
    if (changes.checked !== undefined) patch.checked = changes.checked;
    if (changes.archived !== undefined) patch.archived = changes.archived;
    if (changes.position !== undefined) patch.position = changes.position;
    const { error } = await supabase.from("items").update(patch).eq("id", itemId);
    if (error) throw error;
  },

  async deleteItem(itemId) {
    const { error } = await supabase.from("items").delete().eq("id", itemId);
    if (error) throw error;
  },
};

export const dataClient = isSupabaseConfigured ? supabaseClient : demoClient;
