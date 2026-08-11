import { useState } from "react";
import { dataClient } from "../lib/dataClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setStatus("signing-in");
    setError(null);
    try {
      await dataClient.signInWithPassword(email, password);
    } catch (err) {
      setError(err.message);
      setStatus("idle");
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Organization</h1>
        <p>Sign in to see your sticky notes.</p>
        <form onSubmit={submit}>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "signing-in"}
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === "signing-in"}
          />
          <button className="btn btn-primary" type="submit" disabled={status === "signing-in"}>
            {status === "signing-in" ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}
