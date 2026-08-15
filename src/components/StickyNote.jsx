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
const DETAILS_EXTENSIONS = [StarterKit, Underline, TaskList, TaskItem.configure({ nested: false })];

function ToolbarButton({ label, title, active, onToggle, className }) {
  return (
    <button
      type="button"
      className={`note-toolbar-btn${active ? " active" : ""}${className ? ` ${className}` : ""}`}
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

function NoteToolbar({ editor }) {
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
    </div>
  );
}

function ItemRow({ item, autoFocus, onChangeText, onToggleChecked, onDelete, onFlip, onEnter }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  return (
    <div className="item-row">
      <input
        type="checkbox"
        className="item-checkbox"
        checked={item.checked}
        onChange={(e) => onToggleChecked(e.target.checked)}
      />
      <input
        ref={inputRef}
        type="text"
        className={`item-text${item.checked ? " checked" : ""}`}
        value={item.text}
        placeholder="Write a line…"
        onChange={(e) => onChangeText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
      />
      <button type="button" className="item-flip-btn" title="Add details" onClick={onFlip}>
        →
      </button>
      <button type="button" className="item-delete-btn" title="Delete line" onClick={onDelete}>
        ×
      </button>
    </div>
  );
}

export default function StickyNote({ note, onChangeNote, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  const [title, setTitle] = useState(note.title ?? "");
  const [items, setItems] = useState(note.items ?? []);
  const [flippedItemId, setFlippedItemId] = useState(null);
  const [autoFocusId, setAutoFocusId] = useState(null);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const flippedItemIdRef = useRef(flippedItemId);
  useEffect(() => {
    flippedItemIdRef.current = flippedItemId;
  }, [flippedItemId]);

  // Title and items save independently so an in-flight debounce on one
  // field is never cancelled/overwritten by an edit to the other.
  const itemsSaveTimer = useRef(null);
  const titleSaveTimer = useRef(null);

  function commitItems(next, { immediate = false } = {}) {
    setItems(next);
    if (itemsSaveTimer.current) {
      clearTimeout(itemsSaveTimer.current);
      itemsSaveTimer.current = null;
    }
    if (immediate) {
      onChangeNote({ items: next });
    } else {
      itemsSaveTimer.current = setTimeout(() => onChangeNote({ items: next }), SAVE_DEBOUNCE_MS);
    }
  }

  function flushItems() {
    if (itemsSaveTimer.current) {
      clearTimeout(itemsSaveTimer.current);
      itemsSaveTimer.current = null;
      onChangeNote({ items: itemsRef.current });
    }
  }

  function commitTitle(next) {
    setTitle(next);
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    titleSaveTimer.current = setTimeout(() => onChangeNote({ title: next }), SAVE_DEBOUNCE_MS);
  }

  function flushTitle() {
    if (titleSaveTimer.current) {
      clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = null;
      onChangeNote({ title: titleRef.current });
    }
  }

  function handleChangeText(itemId, text) {
    commitItems(itemsRef.current.map((it) => (it.id === itemId ? { ...it, text } : it)));
  }

  function handleToggleChecked(itemId, checked) {
    commitItems(
      itemsRef.current.map((it) => (it.id === itemId ? { ...it, checked } : it)),
      { immediate: true }
    );
  }

  function handleDeleteItem(itemId) {
    commitItems(itemsRef.current.filter((it) => it.id !== itemId), { immediate: true });
  }

  function handleAddItem() {
    const newItem = {
      id: crypto.randomUUID(),
      text: "",
      details: "",
      checked: false,
      position: itemsRef.current.length,
    };
    commitItems([...itemsRef.current, newItem], { immediate: true });
    setAutoFocusId(newItem.id);
  }

  const backEditor = useEditor({
    extensions: DETAILS_EXTENSIONS,
    content: "",
    onUpdate: ({ editor }) => {
      const itemId = flippedItemIdRef.current;
      if (!itemId) return;
      const html = editor.getHTML();
      commitItems(itemsRef.current.map((it) => (it.id === itemId ? { ...it, details: html } : it)));
    },
  });

  function openBack(itemId) {
    const item = itemsRef.current.find((it) => it.id === itemId);
    backEditor?.commands.setContent(item?.details || "", false);
    setFlippedItemId(itemId);
  }

  function closeBack() {
    flushItems();
    setFlippedItemId(null);
  }

  const flippedItem = items.find((it) => it.id === flippedItemId);
  const sorted = items.slice().sort((a, b) => a.position - b.position);

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

      <div className={`note-flip-inner${flippedItemId ? " flipped" : ""}`}>
        <div className="note-face note-face-front">
          <input
            type="text"
            className="note-title-input"
            value={title}
            placeholder="Untitled card"
            onChange={(e) => commitTitle(e.target.value)}
            onBlur={flushTitle}
          />
          <div className="item-list">
            {sorted.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                autoFocus={item.id === autoFocusId}
                onChangeText={(text) => handleChangeText(item.id, text)}
                onToggleChecked={(checked) => handleToggleChecked(item.id, checked)}
                onDelete={() => handleDeleteItem(item.id)}
                onFlip={() => openBack(item.id)}
                onEnter={handleAddItem}
              />
            ))}
          </div>
          <button type="button" className="item-add-btn" onClick={handleAddItem}>
            + Add line
          </button>
          <div className="sticky-note-footer">
            <button className="sticky-note-delete" onClick={() => onDelete(note.id)}>
              Delete card
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
              onClick={closeBack}
            >
              ←
            </button>
            <div className="note-back-title">{previewText(flippedItem?.text || "", 60) || "Untitled line"}</div>
          </div>
          <NoteToolbar editor={backEditor} />
          <EditorContent editor={backEditor} className="note-editor" onBlur={flushItems} />
        </div>
      </div>
    </div>
  );
}
