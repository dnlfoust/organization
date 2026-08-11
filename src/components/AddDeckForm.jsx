import { useState } from "react";

const COLORS = ["#fde68a", "#bfdbfe", "#bbf7d0", "#fbcfe8", "#fed7aa", "#ddd6fe"];

export default function AddDeckForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), color });
    setTitle("");
    setColor(COLORS[0]);
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="add-deck-column">
        <button className="add-deck-trigger" onClick={() => setOpen(true)}>
          + Add deck
        </button>
      </div>
    );
  }

  return (
    <div className="add-deck-column">
      <form className="add-deck-form" onSubmit={submit}>
        <input
          type="text"
          autoFocus
          placeholder="Deck name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="color-swatches">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch${c === color ? " selected" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Choose color ${c}`}
            />
          ))}
        </div>
        <button type="submit" className="btn btn-primary">
          Add deck
        </button>
      </form>
    </div>
  );
}
