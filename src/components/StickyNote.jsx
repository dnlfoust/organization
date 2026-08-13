import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { previewText } from "../lib/text";

const SAVE_DEBOUNCE_MS = 800;

function useDebouncedSave(committedValue, onSave, delay = SAVE_DEBOUNCE_MS) {
  const timer = useRef(null);
  const latest = useRef(committedValue);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function update(value) {
    latest.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave(latest.current), delay);
  }

  function flush() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (latest.current !== committedValue) {
      onSave(latest.current);
    }
  }

  return { update, flush };
}

function ToolbarButton({ label, title, active, onToggle, className }) {
  return (
    <button
      type="button"
      className={`note-toolbar-btn${active ? " active" : ""}${className ? ` ${className}` : ""}`}
      title={title}
      // Prevent the button from stealing focus away from the editor before
      // the click is registered, which would otherwise cancel the toggle.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

function NoteToolbar({ editor, trailing }) {
  if (!editor) return null;
  return (
    <div className="note-toolbar">
      <ToolbarButton
        label="B"
        title="Bold"
        className="note-toolbar-bold"
        active={editor.isActive("bold")}
        onToggle={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="I"
        title="Italic"
        className="note-toolbar-italic"
        active={editor.isActive("italic")}
        onToggle={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="U"
        title="Underline"
        className="note-toolbar-underline"
        active={editor.isActive("underline")}
        onToggle={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        label="S"
        title="Strikethrough"
        className="note-toolbar-strike"
        active={editor.isActive("strike")}
        onToggle={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        label="List"
        title="Bulleted list"
        active={editor.isActive("bulletList")}
        onToggle={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="Todo"
        title="Checklist"
        active={editor.isActive("taskList")}
        onToggle={() => editor.chain().focus().toggleTaskList().run()}
      />
      {trailing}
    </div>
  );
}

const EDITOR_EXTENSIONS = [StarterKit, Underline, TaskList, TaskItem.configure({ nested: false })];

export default function StickyNote({ note, onChange, onChangeDetails, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });
  const [flipped, setFlipped] = useState(false);

  const bodySave = useDebouncedSave(note.body, onChange);
  const frontEditor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: note.body,
    onUpdate: ({ editor }) => bodySave.update(editor.getHTML()),
  });

  const detailsSave = useDebouncedSave(note.details, onChangeDetails);
  const backEditor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: note.details,
    onUpdate: ({ editor }) => detailsSave.update(editor.getHTML()),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    "--note-color": note.color,
  };

  return (
    <div ref={setNodeRef} style={style} className={`sticky-note${isDragging ? " dragging" : ""}`}>
      <div className="sticky-note-handle" {...attributes} {...listeners} aria-label="Drag note">
        ⠿
      </div>

      <div className={`note-flip-inner${flipped ? " flipped" : ""}`}>
        <div className="note-face note-face-front">
          <NoteToolbar
            editor={frontEditor}
            trailing={
              <button
                type="button"
                className="note-flip-btn"
                title="Add details"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFlipped(true)}
              >
                →
              </button>
            }
          />
          <EditorContent editor={frontEditor} className="note-editor" onBlur={bodySave.flush} />
          <div className="sticky-note-footer">
            <button className="sticky-note-delete" onClick={() => onDelete(note.id)}>
              Delete
            </button>
          </div>
        </div>

        <div className="note-face note-face-back">
          <div className="note-back-header">
            <button
              type="button"
              className="note-flip-btn"
              title="Back to note"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setFlipped(false)}
            >
              ←
            </button>
            <div className="note-back-title">{previewText(note.body, 60) || "Untitled note"}</div>
          </div>
          <NoteToolbar editor={backEditor} />
          <EditorContent editor={backEditor} className="note-editor" onBlur={detailsSave.flush} />
        </div>
      </div>
    </div>
  );
}
