import { useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { dataClient } from "./lib/dataClient";
import Login from "./components/Login";
import DeckColumn from "./components/DeckColumn";
import AddDeckForm from "./components/AddDeckForm";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [decks, setDecks] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    dataClient.getSession().then((session) => setUser(session?.user ?? null));
    const subscription = dataClient.onAuthStateChange((session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([dataClient.listDecks(), dataClient.listNotes()]).then(([d, n]) => {
      setDecks(d);
      setNotes(n);
    });
  }, [user]);

  const notesByDeck = useMemo(() => {
    const map = {};
    for (const deck of decks) {
      map[deck.id] = notes.filter((n) => n.deckId === deck.id).sort((a, b) => a.position - b.position);
    }
    return map;
  }, [decks, notes]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function findContainer(id) {
    if (decks.some((d) => d.id === id)) return id;
    return notes.find((n) => n.id === id)?.deckId ?? null;
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) ?? overId;
    if (!activeContainer || !overContainer) return;
    if (activeId === overId) return;

    const movedNote = notes.find((n) => n.id === activeId);
    const withoutActive = notes.filter((n) => n.id !== activeId);

    const overItems = withoutActive.filter((n) => n.deckId === overContainer).sort((a, b) => a.position - b.position);
    const overIndex = overId === overContainer ? overItems.length : overItems.findIndex((n) => n.id === overId);
    const insertAt = overIndex === -1 ? overItems.length : overIndex;
    overItems.splice(insertAt, 0, { ...movedNote, deckId: overContainer });

    const reindexedOver = overItems.map((n, idx) => ({ ...n, position: idx }));
    const reindexedSource =
      activeContainer === overContainer
        ? []
        : withoutActive
            .filter((n) => n.deckId === activeContainer)
            .sort((a, b) => a.position - b.position)
            .map((n, idx) => ({ ...n, position: idx }));

    const changedIds = new Set([...reindexedOver, ...reindexedSource].map((n) => n.id));
    const untouched = notes.filter((n) => !changedIds.has(n.id));

    setNotes([...untouched, ...reindexedOver, ...reindexedSource]);

    Promise.all(
      [...reindexedOver, ...reindexedSource].map((n) =>
        dataClient.updateNote(n.id, { deckId: n.deckId, position: n.position }).catch(console.error)
      )
    );
  }

  async function handleAddNote(deckId) {
    const position = (notesByDeck[deckId]?.length ?? 0);
    const deck = decks.find((d) => d.id === deckId);
    const note = await dataClient.createNote({ deckId, body: "", color: deck.color, position });
    setNotes((prev) => [...prev, note]);
  }

  async function handleChangeNote(noteId, body) {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, body } : n)));
    await dataClient.updateNote(noteId, { body });
  }

  async function handleDeleteNote(noteId) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    await dataClient.deleteNote(noteId);
  }

  async function handleAddDeck({ title, color }) {
    const deck = await dataClient.createDeck({ title, color, position: decks.length });
    setDecks((prev) => [...prev, deck]);
  }

  async function handleDeleteDeck(deckId) {
    if (!confirm("Delete this deck and all its notes?")) return;
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
    setNotes((prev) => prev.filter((n) => n.deckId !== deckId));
    await dataClient.deleteDeck(deckId);
  }

  if (user === undefined) {
    return null;
  }

  if (user === null) {
    return <Login />;
  }

  return (
    <div>
      <header className="app-header">
        <div>
          <h1>Organization</h1>
          <div className="subtitle">{user.email}</div>
        </div>
        <div className="header-actions">
          {dataClient.mode === "demo" && (
            <span className="demo-banner">Demo mode — connect Supabase to save real data</span>
          )}
          {dataClient.mode === "supabase" && (
            <button className="btn" onClick={() => dataClient.signOut()}>
              Sign out
            </button>
          )}
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="board">
          {decks.map((deck) => (
            <DeckColumn
              key={deck.id}
              deck={deck}
              notes={notesByDeck[deck.id] ?? []}
              onAddNote={handleAddNote}
              onChangeNote={handleChangeNote}
              onDeleteNote={handleDeleteNote}
              onDeleteDeck={handleDeleteDeck}
            />
          ))}
          <AddDeckForm onAdd={handleAddDeck} />
        </div>
      </DndContext>
    </div>
  );
}
