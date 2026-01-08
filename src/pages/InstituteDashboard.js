import jsPDF from "jspdf";
import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";

function InstituteDashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [testsMap, setTestsMap] = useState({});
  const [todayAttendance, setTodayAttendance] = useState({});
  const [instituteId, setInstituteId] = useState(null);

  const [branding, setBranding] = useState({ headerText: "", footerText: "" });

  const [editingStudent, setEditingStudent] = useState(null);
  const [guidanceText, setGuidanceText] = useState("");

  const [testForm, setTestForm] = useState({
    subject: "",
    marks: "",
    max: "",
    date: ""
  });

  const [feeForm, setFeeForm] = useState({
    amount: "",
    dueDate: ""
  });

  const [newStudent, setNewStudent] = useState({
    name: "",
    classOrCourse: ""
  });

  const [openStudent, setOpenStudent] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) return;

      const instId = userSnap.data().instituteId;
      setInstituteId(instId);

      const instSnap = await getDoc(doc(db, "institutes", instId));
      if (instSnap.exists()) {
        setBranding(instSnap.data().branding || { headerText: "", footerText: "" });
      }

      const studentsSnap = await getDocs(collection(db, "institutes", instId, "students"));
      setStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const attSnap = await getDocs(collection(db, "institutes", instId, "attendance"));
      const attMap = {};
      attSnap.forEach(d => {
        const a = d.data();
        if (!attMap[a.studentId]) attMap[a.studentId] = { total: 0, present: 0 };
        attMap[a.studentId].total += 1;
        if (a.status === "present") attMap[a.studentId].present += 1;
      });
      setAttendanceMap(attMap);

      const testSnap = await getDocs(collection(db, "institutes", instId, "tests"));
      const tMap = {};
      testSnap.forEach(d => {
        const t = d.data();
        if (!tMap[t.studentId]) tMap[t.studentId] = [];
        tMap[t.studentId].push(t);
      });
      setTestsMap(tMap);

      setLoading(false);
    };

    load();
  }, [user]);

  /* ---------------- HELPERS ---------------- */

  const markToday = (id, status) => {
    setTodayAttendance(prev => ({ ...prev, [id]: status }));
  };

  const saveAttendance = async () => {
    if (!instituteId || saving) return;
    setSaving(true);

    for (const id in todayAttendance) {
      await addDoc(collection(db, "institutes", instituteId, "attendance"), {
        studentId: id,
        date: today,
        status: todayAttendance[id],
        markedAt: new Date()
      });
    }

    window.location.reload();
  };

  const addTest = async student => {
    if (!instituteId || saving) return;
    setSaving(true);

    await addDoc(collection(db, "institutes", instituteId, "tests"), {
      studentId: student.id,
      subject: testForm.subject,
      marksObtained: Number(testForm.marks),
      maxMarks: Number(testForm.max),
      testDate: testForm.date,
      createdAt: new Date()
    });

    window.location.reload();
  };

  const saveFees = async student => {
    if (!instituteId || saving) return;
    setSaving(true);

    await updateDoc(doc(db, "institutes", instituteId, "students", student.id), {
      fees: {
        amount: feeForm.amount,
        nextDueDate: feeForm.dueDate,
        status: "due",
        updatedAt: new Date()
      }
    });

    window.location.reload();
  };

  const saveBranding = async () => {
    if (!instituteId || saving) return;
    setSaving(true);
    await setDoc(doc(db, "institutes", instituteId), { branding }, { merge: true });
    setSaving(false);
  };

  const saveGuidance = async () => {
    if (!editingStudent || saving) return;
    setSaving(true);

    await updateDoc(
      doc(db, "institutes", instituteId, "students", editingStudent.id),
      {
        facultyGuidance: {
          text: guidanceText,
          updatedAt: new Date()
        }
      }
    );

    window.location.reload();
  };

  const addStudent = async () => {
    if (!newStudent.name || !newStudent.classOrCourse || saving) return;
    setSaving(true);

    await addDoc(
      collection(db, "institutes", instituteId, "students"),
      {
        name: newStudent.name,
        classOrCourse: newStudent.classOrCourse,
        createdAt: new Date()
      }
    );

    window.location.reload();
  };

  const deleteStudent = async (studentId) => {
    if (!window.confirm("Delete this student permanently?")) return;
    await updateDoc(
      doc(db, "institutes", instituteId, "students", studentId),
      { deleted: true }
    );
    window.location.reload();
  };

  const calculateInsights = tests => {
    if (!tests || tests.length === 0) return null;

    let total = 0;
    const subjects = {};

    tests.forEach(t => {
      const pct = (t.marksObtained / t.maxMarks) * 100;
      total += pct;
      subjects[t.subject] = pct;
    });

    const avg = total / tests.length;
    const strong = [];
    const weak = [];

    Object.entries(subjects).forEach(([s, p]) => {
      p >= 70 ? strong.push(s) : weak.push(s);
    });

    return {
      avg: avg.toFixed(2),
      category: avg >= 85 ? "Topper" : avg >= 50 ? "Average" : "Needs Improvement",
      strong,
      weak,
      predicted: `${Math.max(avg - 5, 0).toFixed(0)}% to ${(avg + 5).toFixed(0)}%`
    };
  };

  const generateReport = (student, insights) => {
    const pdf = new jsPDF();
    let y = 20;

    pdf.setFontSize(16);
    pdf.text(branding.headerText || "RankBoard", 14, y);
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 150, y);
    y += 14;

    pdf.setFontSize(13);
    pdf.text("Student Profile", 14, y);
    y += 8;
    pdf.setFontSize(11);
    pdf.text(`Name: ${student.name}`, 14, y);
    y += 6;
    pdf.text(`Class: ${student.classOrCourse}`, 14, y);
    y += 10;

    pdf.text("Overall Performance Summary", 14, y);
    y += 8;
    pdf.text(`Category: ${insights.category}`, 14, y);
    y += 6;
    pdf.text(`Average Score: ${insights.avg}%`, 14, y);
    y += 6;
    pdf.text(`Predicted Next Score: ${insights.predicted}`, 14, y);
    y += 10;

    pdf.text("Test Performance", 14, y);
    y += 8;

    testsMap[student.id]?.forEach(t => {
      const pct = ((t.marksObtained / t.maxMarks) * 100).toFixed(0);
      pdf.text(`${t.subject}  ${t.marksObtained}/${t.maxMarks}  ${pct}%`, 14, y);
      y += 6;
    });

    y += 6;
    pdf.text("Subject Insights", 14, y);
    y += 8;
    pdf.text(`Strong: ${insights.strong.join(", ") || "None"}`, 14, y);
    y += 6;
    pdf.text(`Weak: ${insights.weak.join(", ") || "None"}`, 14, y);
    y += 10;

    pdf.text("Faculty Guidance", 14, y);
    y += 8;
    pdf.text(student.facultyGuidance?.text || "No guidance added", 14, y, {
      maxWidth: 180
    });

    pdf.text(branding.footerText || "", 14, 285);
    pdf.save(`${student.name}_Report.pdf`);
  };

  if (loading) {
    return <div style={styles.center}>Loading dashboard</div>;
  }

  /* ---------------- UI ---------------- */

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Institute Dashboard</h2>

      <div style={styles.card}>
        <h3>Report Branding</h3>
        <textarea
          style={styles.input}
          value={branding.headerText}
          onChange={e => setBranding({ ...branding, headerText: e.target.value })}
        />
        <textarea
          style={styles.input}
          value={branding.footerText}
          onChange={e => setBranding({ ...branding, footerText: e.target.value })}
        />
        <button style={styles.primary} onClick={saveBranding}>Save Branding</button>
      </div>

      <div style={styles.card}>
        <h3>Add Student</h3>
        <input
          style={styles.input}
          placeholder="Student Name"
          onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Class / Course"
          onChange={e => setNewStudent({ ...newStudent, classOrCourse: e.target.value })}
        />
        <button style={styles.primary} onClick={addStudent}>
          Add Student
        </button>
      </div>

      {students.map(s => {
        const att = attendanceMap[s.id] || { total: 0, present: 0 };
        const pct = att.total ? Math.round((att.present / att.total) * 100) : 0;
        const insights = calculateInsights(testsMap[s.id]);

        return (
          <div key={s.id} style={styles.card}>
            <div
              style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}
              onClick={() => setOpenStudent(openStudent === s.id ? null : s.id)}
            >
              <h3>{s.name}</h3>
              <span>{openStudent === s.id ? "▲" : "▼"}</span>
            </div>

            {openStudent === s.id && (
              <>
                <p>{s.classOrCourse}</p>
                <p>Attendance {att.present}/{att.total} ({pct}%)</p>

                <button
                  style={todayAttendance[s.id] === "present" ? styles.present : styles.att}
                  onClick={() => markToday(s.id, "present")}
                >P</button>

                <button
                  style={todayAttendance[s.id] === "absent" ? styles.absent : styles.att}
                  onClick={() => markToday(s.id, "absent")}
                >A</button>

                <h4>Add Test</h4>
                <input style={styles.input} placeholder="Subject" onChange={e => setTestForm({ ...testForm, subject: e.target.value })} />
                <input style={styles.input} placeholder="Marks" onChange={e => setTestForm({ ...testForm, marks: e.target.value })} />
                <input style={styles.input} placeholder="Max Marks" onChange={e => setTestForm({ ...testForm, max: e.target.value })} />
                <input style={styles.input} type="date" onChange={e => setTestForm({ ...testForm, date: e.target.value })} />
                <button style={styles.secondary} onClick={() => addTest(s)}>Add Test</button>

                {testsMap[s.id]?.map((t, i) => (
                  <p key={i}>{t.subject}: {t.marksObtained}/{t.maxMarks}</p>
                ))}

                <h4>Fees</h4>
                <input style={styles.input} placeholder="Amount" onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })} />
                <input style={styles.input} type="date" onChange={e => setFeeForm({ ...feeForm, dueDate: e.target.value })} />
                <button style={styles.secondary} onClick={() => saveFees(s)}>Save Fees</button>

                {s.fees && <p>Due ₹{s.fees.amount} on {s.fees.nextDueDate}</p>}

                {insights && (
                  <>
                    <h4>AI Performance Summary</h4>
                    <p>Category: {insights.category}</p>
                    <p>Average: {insights.avg}%</p>
                    <p>Predicted: {insights.predicted}</p>

                    <h4>Subject Insights</h4>
                    <p>Strong: {insights.strong.join(", ") || "None"}</p>
                    <p>Weak: {insights.weak.join(", ") || "None"}</p>
                  </>
                )}

                <button
                  style={styles.secondary}
                  onClick={() => {
                    setEditingStudent(s);
                    setGuidanceText(s.facultyGuidance?.text || "");
                  }}
                >
                  Edit Guidance
                </button>

                <button
                  style={{ ...styles.secondary, borderColor: "#B76E79", color: "#B76E79" }}
                  onClick={() => deleteStudent(s.id)}
                >
                  Delete Student
                </button>

                <button
                  style={styles.secondary}
                  onClick={() => generateReport(s, insights)}
                >
                  Download Report
                </button>
              </>
            )}
          </div>
        );
      })}

      {editingStudent && (
        <div style={styles.card}>
          <h3>Edit Faculty Guidance</h3>
          <p><strong>{editingStudent.name}</strong></p>
          <textarea
            style={styles.input}
            rows={5}
            value={guidanceText}
            onChange={e => setGuidanceText(e.target.value)}
          />
          <button style={styles.primary} onClick={saveGuidance}>
            Save Guidance
          </button>
          <button
            style={styles.secondary}
            onClick={() => {
              setEditingStudent(null);
              setGuidanceText("");
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <button style={styles.primary} onClick={saveAttendance}>Save Attendance</button>
      <button style={styles.logout} onClick={() => signOut(auth)}>Logout</button>
    </div>
  );
}

const styles = {
  page: { padding: 16, background: "#FFF5E1", minHeight: "100vh" },
  heading: { color: "#5A3C0B" },
  card: {
    background: "rgba(235,193,118,0.55)",
    backdropFilter: "blur(12px)",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    boxShadow: "0 10px 25px rgba(90,60,11,0.25)"
  },
  input: {
    width: "100%",
    padding: 10,
    marginTop: 6,
    borderRadius: 8,
    border: "1px solid #C48B28",
    background: "#FFF5E1"
  },
  primary: {
    width: "100%",
    padding: 12,
    marginTop: 10,
    background: "#C48B28",
    color: "#FFF5E1",
    border: "none",
    borderRadius: 10
  },
  secondary: {
    marginTop: 8,
    padding: "6px 10px",
    border: "1px solid #C48B28",
    background: "transparent",
    borderRadius: 8
  },
  att: {
    padding: "6px 12px",
    marginRight: 6,
    borderRadius: 8,
    border: "1px solid #C48B28"
  },
  present: {
    padding: "6px 12px",
    marginRight: 6,
    borderRadius: 8,
    background: "#C48B28",
    color: "#FFF5E1"
  },
  absent: {
    padding: "6px 12px",
    borderRadius: 8,
    background: "#B76E79",
    color: "#FFF5E1"
  },
  logout: {
    marginTop: 24,
    padding: 10,
    background: "#5A3C0B",
    color: "#FFF5E1",
    borderRadius: 8,
    border: "none"
  },
  center: { textAlign: "center", padding: 40 }
};

export default InstituteDashboard;
