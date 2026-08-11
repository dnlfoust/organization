import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { initialDecks, initialNotes } from "../demoData";

// Thin data-access layer so <App> doesn't care whether it's talking to
// Supabase or to the local demo store. Both implementations expose the
// same async shape.

const DEMO_KEY = "organization-demo-data";

function loadDemoState() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupt local storage, fall through to seed data
  }
  return { decks: initialDecks, notes: initialNotes };
}

function saveDemoState(state) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
}

const uid = () => crypto.randomUUID();

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
    state.notes = state.notes.filter((n) => n.deckId !== deckId);
    saveDemoState(state);
  },

  async createNote({ deckId, body, color, position }) {
    const state = loadDemoState();
    const note = { id: uid(), deckId, body, color, position };
    state.notes.push(note);
    saveDemoState(state);
    return note;
  },

  async updateNote(noteId, changes) {
    const state = loadDemoState();
    state.notes = state.notes.map((n) => (n.id === noteId ? { ...n, ...changes } : n));
    saveDemoState(state);
  },

  async deleteNote(noteId) {
    const state = loadDemoState();
    state.notes = state.notes.filter((n) => n.id !== noteId);
    saveDemoState(state);
  },

  async moveNote(noteId, deckId, position) {
    return this.updateNote(noteId, { deckId, position });
  },
};

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
      body: n.body,
      color: n.color,
      position: n.position,
    }));
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

  async createNote({ deckId, body, color, position }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("notes")
      .insert({
        deck_id: deckId,
        body,
        color,
        position,
        user_id: sessionData.session.user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, deckId: data.deck_id, body: data.body, color: data.color, position: data.position };
  },

  async updateNote(noteId, changes) {
    const patch = {};
    if (changes.body !== undefined) patch.body = changes.body;
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
};

export const dataClient = isSupabaseConfigured ? supabaseClient : demoClient;
