// Local seed data used only when Supabase isn't configured yet (see
// supabaseClient.js). Shapes match the `decks`, `notes`, and `items`
// tables exactly, so swapping in real data later is a drop-in.
//
// Each note is a card; its line items live in `initialItems`, keyed by
// `noteId`, and each item can be flipped independently to show/edit its
// own `details`. Notes and items both carry `archived`/`archivedAt` so
// they can be hidden without being deleted.

export const initialDecks = [
  { id: "deck-1", title: "Work", color: "#fde68a", position: 0 },
  { id: "deck-2", title: "Personal Project", color: "#bfdbfe", position: 1 },
  { id: "deck-3", title: "House Project", color: "#bbf7d0", position: 2 },
];

export const initialNotes = [
  { id: "note-1", deckId: "deck-1", color: "#fde68a", position: 0, archived: false, archivedAt: null },
  { id: "note-2", deckId: "deck-1", color: "#fde68a", position: 1, archived: false, archivedAt: null },
  { id: "note-3", deckId: "deck-2", color: "#bfdbfe", position: 0, archived: false, archivedAt: null },
  { id: "note-4", deckId: "deck-2", color: "#bfdbfe", position: 1, archived: false, archivedAt: null },
  { id: "note-5", deckId: "deck-3", color: "#bbf7d0", position: 0, title: "Weekend to-dos", archived: false, archivedAt: null },
];

export const initialItems = [
  {
    id: "item-1",
    noteId: "note-1",
    text: "Finish Q3 portfolio review",
    details: "",
    checked: false,
    archived: false,
    archivedAt: null,
    position: 0,
  },
  {
    id: "item-2",
    noteId: "note-2",
    text: "Reply to compliance email",
    details: "",
    checked: false,
    archived: false,
    archivedAt: null,
    position: 0,
  },
  {
    id: "item-3",
    noteId: "note-3",
    text: "Wire up Supabase auth",
    details: "",
    checked: false,
    archived: false,
    archivedAt: null,
    position: 0,
  },
  {
    id: "item-4",
    noteId: "note-4",
    text: "Pick a color palette",
    details: "",
    checked: false,
    archived: false,
    archivedAt: null,
    position: 0,
  },
  {
    id: "item-5a",
    noteId: "note-5",
    text: "Call plumber about upstairs sink",
    details: "<p>Ask about the quote for re-piping while they're out.</p>",
    checked: false,
    archived: false,
    archivedAt: null,
    position: 0,
  },
  {
    id: "item-5b",
    noteId: "note-5",
    text: "Buy exterior paint",
    details: "",
    checked: false,
    archived: false,
    archivedAt: null,
    position: 1,
  },
  {
    id: "item-5c",
    noteId: "note-5",
    text: "Rake the leaves",
    details: "",
    checked: true,
    archived: true,
    archivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    position: 2,
  },
];
