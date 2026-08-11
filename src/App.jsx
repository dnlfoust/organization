import { useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { dataClient } from "./lib/dataClient";
import Login from "./components/Login";
import StackColumn from "./components/StackColumn";
import AddStackForm from "./components/AddStackForm";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [stacks, setStacks] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    dataClient.getSession().then((session) => setUser(session?.user ?? null));
    const subscription = dataClient.onAuthStateChange((session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([dataClient.listStacks(), dataClient.listNotes()]).then(([s, n]) => {
      setStacks(s);
      setNotes(n);
    });
  }, [user]);

  const notesByStack = useMemo(() => {
    const map = {};
    for (const stack of stacks) {
      map[stack.id] = notes.filter((n) => n.stackId === stack.id).sort((a, b) => a.position - b.position);
    }
    return map;
  }, [stacks, notes]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function findContainer(id) {
    if (stacks.some((s) => s.id === id)) return id;
    return notes.find((n) => n.id === id)?.stackId ?? null;
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

    const overItems = withoutActive.filter((n) => n.stackId === overContainer).sort((a, b) => a.position - b.position);
    const overIndex = overId === overContainer ? overItems.length : overItems.findIndex((n) => n.id === overId);
    const insertAt = overIndex === -1 ? overItems.length : overIndex;
    overItems.splice(insertAt, 0, { ...movedNote, stackId: overContainer });

    const reindexedOver = overItems.map((n, idx) => ({ ...n, position: idx }));
    const reindexedSource =
      activeContainer === overContainer
        ? []
        : withoutActive
            .filter((n) => n.stackId === activeContainer)
            .sort((a, b) => a.position - b.position)
            .map((n, idx) => ({ ...n, position: idx }));

    const changedIds = new Set([...reindexedOver, ...reindexedSource].map((n) => n.id));
    const untouched = notes.filter((n) => !changedIds.has(n.id));

    setNotes([...untouched, ...reindexedOver, ...reindexedSource]);

    Promise.all(
      [...reindexedOver, ...reindexedSource].map((n) =>
        dataClient.updateNote(n.id, { stackId: n.stackId, position: n.position }).catch(console.error)
      )
    );
  }

  async function handleAddNote(stackId) {
    const position = (notesByStack[stackId]?.length ?? 0);
    const stack = stacks.find((s) => s.id === stackId);
    const note = await dataClient.createNote({ stackId, body: "", color: stack.color, position });
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

  async function handleAddStack({ title, color }) {
    const stack = await dataClient.createStack({ title, color, position: stacks.length });
    setStacks((prev) => [...prev, stack]);
  }

  async function handleDeleteStack(stackId) {
    if (!confirm("Delete this stack and all its notes?")) return;
    setStacks((prev) => prev.filter((s) => s.id !== stackId));
    setNotes((prev) => prev.filter((n) => n.stackId !== stackId));
    await dataClient.deleteStack(stackId);
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
          {stacks.map((stack) => (
            <StackColumn
              key={stack.id}
              stack={stack}
              notes={notesByStack[stack.id] ?? []}
              onAddNote={handleAddNote}
              onChangeNote={handleChangeNote}
              onDeleteNote={handleDeleteNote}
              onDeleteStack={handleDeleteStack}
            />
          ))}
          <AddStackForm onAdd={handleAddStack} />
        </div>
      </DndContext>
    </div>
  );
}
