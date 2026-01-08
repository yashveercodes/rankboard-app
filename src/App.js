import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import InstituteDashboard from "./pages/InstituteDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route
            path="/superadmin"
            element={
              <ProtectedRoute allowedRole="superadmin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/institute"
            element={
              <ProtectedRoute allowedRole="admin">
                <InstituteDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
