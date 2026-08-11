import { useState } from "react";
import { dataClient } from "../lib/dataClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      await dataClient.signInWithOtp(email);
      setStatus("sent");
    } catch (err) {
      setError(err.message);
      setStatus("idle");
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Organization</h1>
        <p>Sign in with your email to see your sticky notes.</p>
        <form onSubmit={submit}>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "sending" || status === "sent"}
          />
          <button className="btn btn-primary" type="submit" disabled={status === "sending" || status === "sent"}>
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>
        {status === "sent" && (
          <p className="login-status">Check your email for a sign-in link.</p>
        )}
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}
