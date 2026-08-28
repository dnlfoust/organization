// Local seed data used only when Supabase isn't configured yet (see
// supabaseClient.js). Shapes match the `decks` and `notes` tables exactly,
// so swapping in real data later is a drop-in.
//
// Each note is a card holding a list of line items; each item can be
// flipped independently to show/edit its own `details`. Notes and items
// both carry `archived` so they can be hidden without being deleted.

export const initialDecks = [
  { id: "deck-1", title: "Work", color: "#fde68a", position: 0 },
  { id: "deck-2", title: "Personal Project", color: "#bfdbfe", position: 1 },
  { id: "deck-3", title: "House Project", color: "#bbf7d0", position: 2 },
];

export const initialNotes = [
  {
    id: "note-1",
    deckId: "deck-1",
    color: "#fde68a",
    position: 0,
    archived: false,
    items: [{ id: "item-1", text: "Finish Q3 portfolio review", details: "", checked: false, archived: false, position: 0 }],
  },
  {
    id: "note-2",
    deckId: "deck-1",
    color: "#fde68a",
    position: 1,
    archived: false,
    items: [{ id: "item-2", text: "Reply to compliance email", details: "", checked: false, archived: false, position: 0 }],
  },
  {
    id: "note-3",
    deckId: "deck-2",
    color: "#bfdbfe",
    position: 0,
    archived: false,
    items: [{ id: "item-3", text: "Wire up Supabase auth", details: "", checked: false, archived: false, position: 0 }],
  },
  {
    id: "note-4",
    deckId: "deck-2",
    color: "#bfdbfe",
    position: 1,
    archived: false,
    items: [{ id: "item-4", text: "Pick a color palette", details: "", checked: false, archived: false, position: 0 }],
  },
  {
    id: "note-5",
    deckId: "deck-3",
    color: "#bbf7d0",
    position: 0,
    title: "Weekend to-dos",
    archived: false,
    items: [
      {
        id: "item-5a",
        text: "Call plumber about upstairs sink",
        details: "<p>Ask about the quote for re-piping while they're out.</p>",
        checked: false,
        archived: false,
        position: 0,
      },
      {
        id: "item-5b",
        text: "Buy exterior paint",
        details: "",
        checked: false,
        archived: false,
        position: 1,
      },
      {
        id: "item-5c",
        text: "Rake the leaves",
        details: "",
        checked: true,
        archived: true,
        position: 2,
      },
    ],
  },
];
