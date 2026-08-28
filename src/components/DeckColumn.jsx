import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import StickyNote from "./StickyNote";
import { previewText } from "../lib/text";

const MIN_DECK_WIDTH = 220;
const MAX_DECK_WIDTH = 600;
const MIN_DECK_HEIGHT = 200;
const MAX_DECK_HEIGHT = 1400;

export default function DeckColumn({
  deck,
  notes,
  expanded,
  onToggleExpand,
  onAddNote,
  onChangeNote,
  onDeleteNote,
  onDeleteDeck,
}) {
  const { setNodeRef } = useDroppable({ id: deck.id });
  const noteIds = notes.map((n) => n.id);
  const sorted = notes.slice().sort((a, b) => a.position - b.position);
  const topNote = sorted[0];
  const shadowCount = Math.min(Math.max(notes.length - 1, 0), 2);

  const [customSize, setCustomSize] = useState(null); // { width, height } in px, or null = default

  function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    const column = e.currentTarget.parentElement;
    const startRect = column.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    function onMove(ev) {
      const width = Math.min(MAX_DECK_WIDTH, Math.max(MIN_DECK_WIDTH, startRect.width + (ev.clientX - startX)));
      const height = Math.min(MAX_DECK_HEIGHT, Math.max(MIN_DECK_HEIGHT, startRect.height + (ev.clientY - startY)));
      setCustomSize({ width, height });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function resetSize() {
    setCustomSize(null);
  }

  const columnStyle = customSize
    ? { flex: `0 0 ${customSize.width}px`, maxHeight: `${customSize.height}px` }
    : undefined;

  return (
    <div className="deck-column" style={columnStyle}>
      <div className="deck-column-header">
        <button className="deck-toggle-btn" onClick={onToggleExpand} title={expanded ? "Collapse deck" : "Expand deck"}>
          {expanded ? "▾" : "▸"}
        </button>
        <h2 onClick={onToggleExpand}>
          <span className="deck-color-dot" style={{ background: deck.color }} />
          {deck.title}
          <span className="deck-note-count">{notes.length}</span>
        </h2>
        <button className="deck-delete-btn" onClick={() => onDeleteDeck(deck.id)} title="Delete deck">
          ✕
        </button>
      </div>

      {expanded ? (
        <>
          <div ref={setNodeRef} className="deck-notes">
            <SortableContext items={noteIds} strategy={verticalListSortingStrategy}>
              {sorted.map((note) => (
                <StickyNote
                  key={note.id}
                  note={note}
                  onChangeNote={(patch) => onChangeNote(note.id, patch)}
                  onDelete={onDeleteNote}
                />
              ))}
            </SortableContext>
          </div>

          <button className="deck-add-note" onClick={() => onAddNote(deck.id)}>
            + Add note
          </button>
        </>
      ) : (
        <div ref={setNodeRef} className="deck-stack" onClick={onToggleExpand}>
          {Array.from({ length: shadowCount }).map((_, i) => (
            <div
              key={i}
              className="deck-stack-layer"
              style={{ "--note-color": deck.color, "--layer": i + 1 }}
            />
          ))}
          <div className="deck-stack-top" style={{ "--note-color": deck.color }}>
            {topNote ? (
              <p>{previewText(topNote.title || topNote.items?.[0]?.text || "") || "Untitled note"}</p>
            ) : (
              <p className="deck-stack-empty">No notes yet — click to add one</p>
            )}
          </div>
        </div>
      )}

      {customSize && (
        <button type="button" className="deck-reset-size" title="Reset to default size" onClick={resetSize}>
          ↺
        </button>
      )}
      <div
        className="deck-resize-handle"
        title="Drag to resize deck"
        onPointerDown={startResize}
        onDoubleClick={resetSize}
      >
        ⤡
      </div>
    </div>
  );
}
