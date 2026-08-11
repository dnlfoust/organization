import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import StickyNote from "./StickyNote";

export default function DeckColumn({ deck, notes, onAddNote, onChangeNote, onDeleteNote, onDeleteDeck }) {
  const { setNodeRef } = useDroppable({ id: deck.id });
  const noteIds = notes.map((n) => n.id);

  return (
    <div className="deck-column">
      <div className="deck-column-header">
        <h2>
          <span className="deck-color-dot" style={{ background: deck.color }} />
          {deck.title}
          <span className="deck-note-count">{notes.length}</span>
        </h2>
        <button className="deck-delete-btn" onClick={() => onDeleteDeck(deck.id)} title="Delete deck">
          ✕
        </button>
      </div>

      <div ref={setNodeRef} className="deck-notes">
        <SortableContext items={noteIds} strategy={verticalListSortingStrategy}>
          {notes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              onChange={(body) => onChangeNote(note.id, body)}
              onDelete={onDeleteNote}
            />
          ))}
        </SortableContext>
      </div>

      <button className="deck-add-note" onClick={() => onAddNote(deck.id)}>
        + Add note
      </button>
    </div>
  );
}
