import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role === "superadmin") navigate("/superadmin");
    if (user && role === "admin") navigate("/institute");
  }, [user, role, navigate]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.glassCard}>
        <h2 style={styles.title}>RankBoard</h2>
        <p style={styles.subtitle}>Institute Login</p>

        <input
          style={styles.input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={styles.primary}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: "#FFF5E1"
  },
  glassCard: {
    width: "100%",
    maxWidth: 380,
    padding: 28,
    borderRadius: 22,
    background: "rgba(235,193,118,0.55)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 14px 40px rgba(90,60,11,0.35)"
  },
  title: {
    textAlign: "center",
    color: "#5A3C0B",
    marginBottom: 4
  },
  subtitle: {
    textAlign: "center",
    color: "#7a5a24",
    marginBottom: 22,
    fontSize: 14
  },
  input: {
    width: "100%",
    padding: 14,
    marginBottom: 14,
    borderRadius: 12,
    border: "1px solid #C48B28",
    background: "#FFF5E1",
    color: "#5A3C0B",
    fontSize: 15
  },
  primary: {
    width: "100%",
    padding: 14,
    borderRadius: 16,
    border: "none",
    background: "#C48B28",
    color: "#FFF5E1",
    fontSize: 16,
    fontWeight: "bold",
    boxShadow: "0 8px 20px rgba(196,139,40,0.6)"
  },
  error: {
    color: "#8B3A3A",
    textAlign: "center",
    marginBottom: 12,
    fontSize: 14
  }
};

export default Login;
