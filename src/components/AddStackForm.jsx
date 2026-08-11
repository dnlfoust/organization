import { useState } from "react";

const COLORS = ["#fde68a", "#bfdbfe", "#bbf7d0", "#fbcfe8", "#fed7aa", "#ddd6fe"];

export default function AddStackForm({ onAdd }) {
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
      <div className="add-stack-column">
        <button className="add-stack-trigger" onClick={() => setOpen(true)}>
          + Add stack
        </button>
      </div>
    );
  }

  return (
    <div className="add-stack-column">
      <form className="add-stack-form" onSubmit={submit}>
        <input
          type="text"
          autoFocus
          placeholder="Stack name"
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
          Add stack
        </button>
      </form>
    </div>
  );
}
