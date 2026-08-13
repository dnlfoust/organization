// Local seed data used only when Supabase isn't configured yet (see
// supabaseClient.js). Shapes match the `decks` and `notes` tables exactly,
// so swapping in real data later is a drop-in.

export const initialDecks = [
  { id: "deck-1", title: "Work", color: "#fde68a", position: 0 },
  { id: "deck-2", title: "Personal Project", color: "#bfdbfe", position: 1 },
  { id: "deck-3", title: "House Project", color: "#bbf7d0", position: 2 },
];

export const initialNotes = [
  { id: "note-1", deckId: "deck-1", body: "Finish Q3 portfolio review", details: "", color: "#fde68a", position: 0 },
  { id: "note-2", deckId: "deck-1", body: "Reply to compliance email", details: "", color: "#fde68a", position: 1 },
  { id: "note-3", deckId: "deck-2", body: "Wire up Supabase auth", details: "", color: "#bfdbfe", position: 0 },
  { id: "note-4", deckId: "deck-2", body: "Pick a color palette", details: "", color: "#bfdbfe", position: 1 },
  {
    id: "note-5",
    deckId: "deck-3",
    body: "Call plumber about upstairs sink",
    details: "<p>Ask about the quote for re-piping while they're out.</p>",
    color: "#bbf7d0",
    position: 0,
  },
];
