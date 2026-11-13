import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { LoginPage } from './pages/LoginPage';
import { Shell } from './pages/Shell';
import { OpenCasesPage } from './pages/OpenCasesPage';
import { FoundPersonsPage } from './pages/FoundPersonsPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { HandoverPage } from './pages/HandoverPage';
import { ScanPage } from './pages/ScanPage';
import { BroadcastPage } from './pages/BroadcastPage';

export function App() {
  const { token } = useAuth();
  if (!token) return <LoginPage />;

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/cases" replace />} />
        <Route path="/cases" element={<OpenCasesPage />} />
        <Route path="/found" element={<FoundPersonsPage />} />
        <Route path="/map" element={<LiveMapPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/broadcast" element={<BroadcastPage />} />
        <Route path="/handover" element={<HandoverPage />} />
      </Route>
    </Routes>
  );
}
