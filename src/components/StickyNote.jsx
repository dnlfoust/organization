import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

const SAVE_DEBOUNCE_MS = 800;

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

export default function StickyNote({ note, onChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  const saveTimer = useRef(null);
  const latestBody = useRef(note.body);

  const editor = useEditor({
    extensions: [StarterKit, Underline, TaskList, TaskItem.configure({ nested: false })],
    content: note.body,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      latestBody.current = html;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onChange(latestBody.current), SAVE_DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function flushSave() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (editor && latestBody.current !== note.body) {
      onChange(latestBody.current);
    }
  }

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

      {editor && (
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
        </div>
      )}

      <EditorContent editor={editor} className="note-editor" onBlur={flushSave} />

      <div className="sticky-note-footer">
        <button className="sticky-note-delete" onClick={() => onDelete(note.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
