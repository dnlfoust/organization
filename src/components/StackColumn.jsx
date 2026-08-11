import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import StickyNote from "./StickyNote";

export default function StackColumn({ stack, notes, onAddNote, onChangeNote, onDeleteNote, onDeleteStack }) {
  const { setNodeRef } = useDroppable({ id: stack.id });
  const noteIds = notes.map((n) => n.id);

  return (
    <div className="stack-column">
      <div className="stack-column-header">
        <h2>
          <span className="stack-color-dot" style={{ background: stack.color }} />
          {stack.title}
          <span className="stack-note-count">{notes.length}</span>
        </h2>
        <button className="stack-delete-btn" onClick={() => onDeleteStack(stack.id)} title="Delete stack">
          ✕
        </button>
      </div>

      <div ref={setNodeRef} className="stack-notes">
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

      <button className="stack-add-note" onClick={() => onAddNote(stack.id)}>
        + Add note
      </button>
    </div>
  );
}
