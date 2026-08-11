import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { initialStacks, initialNotes } from "../demoData";

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
  return { stacks: initialStacks, notes: initialNotes };
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

  async signInWithOtp() {
    throw new Error("Demo mode has no real auth — connect Supabase to enable login.");
  },

  async signOut() {},

  async listStacks() {
    return loadDemoState().stacks.slice().sort((a, b) => a.position - b.position);
  },

  async listNotes() {
    return loadDemoState().notes.slice().sort((a, b) => a.position - b.position);
  },

  async createStack({ title, color }) {
    const state = loadDemoState();
    const stack = { id: uid(), title, color, position: state.stacks.length };
    state.stacks.push(stack);
    saveDemoState(state);
    return stack;
  },

  async deleteStack(stackId) {
    const state = loadDemoState();
    state.stacks = state.stacks.filter((s) => s.id !== stackId);
    state.notes = state.notes.filter((n) => n.stackId !== stackId);
    saveDemoState(state);
  },

  async createNote({ stackId, body, color, position }) {
    const state = loadDemoState();
    const note = { id: uid(), stackId, body, color, position };
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

  async moveNote(noteId, stackId, position) {
    return this.updateNote(noteId, { stackId, position });
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

  async signInWithOtp(email) {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async listStacks() {
    const { data, error } = await supabase.from("stacks").select("*").order("position");
    if (error) throw error;
    return data.map((s) => ({ id: s.id, title: s.title, color: s.color, position: s.position }));
  },

  async listNotes() {
    const { data, error } = await supabase.from("notes").select("*").order("position");
    if (error) throw error;
    return data.map((n) => ({
      id: n.id,
      stackId: n.stack_id,
      body: n.body,
      color: n.color,
      position: n.position,
    }));
  },

  async createStack({ title, color, position }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("stacks")
      .insert({ title, color, position, user_id: sessionData.session.user.id })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, title: data.title, color: data.color, position: data.position };
  },

  async deleteStack(stackId) {
    const { error } = await supabase.from("stacks").delete().eq("id", stackId);
    if (error) throw error;
  },

  async createNote({ stackId, body, color, position }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("notes")
      .insert({
        stack_id: stackId,
        body,
        color,
        position,
        user_id: sessionData.session.user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, stackId: data.stack_id, body: data.body, color: data.color, position: data.position };
  },

  async updateNote(noteId, changes) {
    const patch = {};
    if (changes.body !== undefined) patch.body = changes.body;
    if (changes.color !== undefined) patch.color = changes.color;
    if (changes.position !== undefined) patch.position = changes.position;
    if (changes.stackId !== undefined) patch.stack_id = changes.stackId;
    const { error } = await supabase.from("notes").update(patch).eq("id", noteId);
    if (error) throw error;
  },

  async deleteNote(noteId) {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) throw error;
  },

  async moveNote(noteId, stackId, position) {
    return this.updateNote(noteId, { stackId, position });
  },
};

export const dataClient = isSupabaseConfigured ? supabaseClient : demoClient;
