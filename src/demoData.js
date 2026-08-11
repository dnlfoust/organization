// Local seed data used only when Supabase isn't configured yet (see
// supabaseClient.js). Shapes match the `stacks` and `notes` tables exactly,
// so swapping in real data later is a drop-in.

export const initialStacks = [
  { id: "stack-1", title: "Work", color: "#fde68a", position: 0 },
  { id: "stack-2", title: "Personal Project", color: "#bfdbfe", position: 1 },
  { id: "stack-3", title: "House Project", color: "#bbf7d0", position: 2 },
];

export const initialNotes = [
  { id: "note-1", stackId: "stack-1", body: "Finish Q3 portfolio review", color: "#fde68a", position: 0 },
  { id: "note-2", stackId: "stack-1", body: "Reply to compliance email", color: "#fde68a", position: 1 },
  { id: "note-3", stackId: "stack-2", body: "Wire up Supabase auth", color: "#bfdbfe", position: 0 },
  { id: "note-4", stackId: "stack-2", body: "Pick a color palette", color: "#bfdbfe", position: 1 },
  { id: "note-5", stackId: "stack-3", body: "Call plumber about upstairs sink", color: "#bbf7d0", position: 0 },
];
