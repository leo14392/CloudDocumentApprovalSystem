import { useState, type FormEvent } from "react";
import type { Role } from "../../types";
import { Button, Icon, Logo } from "../../components/ui";

export function LoginPage({ onLogin }: { onLogin: (role: Role) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.endsWith("@g.msuiit.edu.ph") || !password) setError(true);
    else onLogin(email.includes("approver") ? "approver" : "student");
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="story-overlay" />
        <div className="story-content">
          <Logo light />
          <div className="story-copy">
            <span className="eyebrow light">
              A better way to move documents forward
            </span>
            <h1>Approvals, made simpler.</h1>
            <p>
              Submit university documents, follow every approval, and keep your
              academic requests moving—wherever you are.
            </p>
            <div className="trust-row">
              <span>
                <Icon name="check" size={16} /> Transparent tracking
              </span>
              <span>
                <Icon name="check" size={16} /> Secure e-signatures
              </span>
            </div>
          </div>
          <small className="copyright">
            © 2025 Mindanao State University – Iligan Institute of Technology
          </small>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-box">
          <div className="mobile-logo">
            <Logo />
          </div>
          <span className="eyebrow">Welcome to Document Services</span>
          <h2>Sign in to your account</h2>
          <p className="muted">
            Use your official MSU-IIT university credentials.
          </p>
          <form onSubmit={submit}>
            <label>University email</label>
            <div className={`field-icon ${error ? "field-error" : ""}`}>
              <Icon name="mail" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(false);
                }}
                placeholder="name@g.msuiit.edu.ph"
              />
            </div>
            {error && (
              <div className="error-text">
                Enter a valid MSU-IIT email and password.
              </div>
            )}
            <div className="label-row">
              <label>Password</label>
              <button type="button">Forgot password?</button>
            </div>
            <div className="field-icon">
              <Icon name="user" size={18} />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="show-pass"
                onClick={() => setShow(!show)}
              >
                <Icon name="eye" size={18} />
              </button>
            </div>
            <Button type="submit" className="full">
              Sign in <Icon name="arrow" size={17} />
            </Button>
          </form>
          <div className="divider">
            <span>Prototype access</span>
          </div>
          <div className="demo-buttons">
            <Button variant="secondary" onClick={() => onLogin("student")}>
              <Icon name="user" size={17} /> Preview Student
            </Button>
            <Button variant="secondary" onClick={() => onLogin("approver")}>
              <Icon name="file" size={17} /> Preview Approver
            </Button>
          </div>
          <p className="privacy">
            By signing in, you agree to the university's acceptable use and data
            privacy policies.
          </p>
        </div>
      </section>
    </div>
  );
}
