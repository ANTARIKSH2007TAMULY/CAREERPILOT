import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import LoadingState from './components/ui/LoadingState';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobDetails from './pages/JobDetails';
import SavedJobs from './pages/SavedJobs';
import Applications from './pages/Applications';
import Resume from './pages/Resume';
import Analytics from './pages/Analytics';
import AICoach from './pages/AICoach';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState label="Restoring session…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/saved-jobs" element={<SavedJobs />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/ai-coach" element={<AICoach />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
