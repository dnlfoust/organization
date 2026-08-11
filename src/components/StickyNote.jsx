import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function StickyNote({ note, onChange, onDelete }) {
  const [body, setBody] = useState(note.body);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    "--note-color": note.color,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sticky-note${isDragging ? " dragging" : ""}`}
    >
      <div className="sticky-note-handle" {...attributes} {...listeners} aria-label="Drag note">
        ⠿
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => {
          if (body !== note.body) onChange(body);
        }}
        placeholder="Write a note…"
      />
      <div className="sticky-note-footer">
        <button className="sticky-note-delete" onClick={() => onDelete(note.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
