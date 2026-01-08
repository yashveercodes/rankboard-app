import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../firebase";

function SuperAdminDashboard() {
  const [institutes, setInstitutes] = useState([]);
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchInstitutes = async () => {
    const snap = await getDocs(collection(db, "institutes"));
    setInstitutes(
      snap.docs.map(d => ({ id: d.id, ...d.data() }))
    );
  };

  useEffect(() => {
    fetchInstitutes();
  }, []);

  const createInstitute = async () => {
    if (!name || !adminEmail || !adminPassword || loading) return;

    try {
      setLoading(true);

      const instituteRef = await addDoc(collection(db, "institutes"), {
        name,
        status: "active",
        createdAt: new Date()
      });

      const cred = await createUserWithEmailAndPassword(
        auth,
        adminEmail,
        adminPassword
      );

      await addDoc(collection(db, "users"), {
        uid: cred.user.uid,
        role: "admin",
        instituteId: instituteRef.id,
        email: adminEmail,
        createdAt: new Date()
      });

      setName("");
      setAdminEmail("");
      setAdminPassword("");
      fetchInstitutes();
      alert("Institute created successfully");
    } catch (e) {
      alert("Error creating institute");
    } finally {
      setLoading(false);
    }
  };

  const toggleInstitute = async (id, status) => {
    await updateDoc(doc(db, "institutes", id), {
      status: status === "active" ? "disabled" : "active"
    });
    fetchInstitutes();
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Super Admin Dashboard</h2>
      <p style={styles.subheading}>
        Manage institutes and system access
      </p>

      <div style={styles.glassCard}>
        <h3>Create New Institute</h3>

        <input
          style={styles.input}
          placeholder="Institute Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Admin Email"
          value={adminEmail}
          onChange={e => setAdminEmail(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Admin Password"
          value={adminPassword}
          onChange={e => setAdminPassword(e.target.value)}
        />

        <button
          style={styles.primary}
          onClick={createInstitute}
          disabled={loading}
        >
          {loading ? "Creating Institute" : "Create Institute"}
        </button>
      </div>

      <div style={styles.glassCard}>
        <h3>All Institutes</h3>

        {institutes.length === 0 && (
          <p style={styles.muted}>No institutes found</p>
        )}

        {institutes.map(inst => (
          <div key={inst.id} style={styles.row}>
            <div>
              <strong>{inst.name}</strong>
              <p style={styles.muted}>Status: {inst.status}</p>
            </div>

            <button
              style={
                inst.status === "active"
                  ? styles.disableBtn
                  : styles.enableBtn
              }
              onClick={() => toggleInstitute(inst.id, inst.status)}
            >
              {inst.status === "active" ? "Disable" : "Enable"}
            </button>
          </div>
        ))}
      </div>

      <button style={styles.logout} onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: 16,
    background: "#FFF5E1"
  },
  heading: {
    color: "#5A3C0B",
    marginBottom: 4
  },
  subheading: {
    color: "#7a5a24",
    marginBottom: 20
  },
  glassCard: {
    background: "rgba(235,193,118,0.55)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    boxShadow: "0 12px 30px rgba(90,60,11,0.25)"
  },
  input: {
    width: "100%",
    padding: 12,
    marginTop: 10,
    borderRadius: 10,
    border: "1px solid #C48B28",
    background: "#FFF5E1",
    color: "#5A3C0B"
  },
  primary: {
    width: "100%",
    padding: 14,
    marginTop: 14,
    background: "#C48B28",
    color: "#FFF5E1",
    border: "none",
    borderRadius: 14,
    fontWeight: "bold",
    boxShadow: "0 8px 18px rgba(196,139,40,0.6)"
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,245,225,0.6)"
  },
  muted: {
    fontSize: 13,
    color: "#6b4b1a"
  },
  disableBtn: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: "#B76E79",
    color: "#FFF5E1"
  },
  enableBtn: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: "#C48B28",
    color: "#FFF5E1"
  },
  logout: {
    marginTop: 24,
    width: "100%",
    padding: 12,
    background: "#5A3C0B",
    color: "#FFF5E1",
    borderRadius: 12,
    border: "none"
  }
};

export default SuperAdminDashboard;
