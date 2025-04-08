import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { ScanPage } from '@/pages/ScanPage';
import { CredentialsPage } from '@/pages/CredentialsPage';
import { CredentialDetailPage } from '@/pages/CredentialDetailPage';
import { PresentationPage } from '@/pages/PresentationPage';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<Layout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/credentials" element={<CredentialsPage />} />
          <Route path="/credential/:encodedJwt" element={<CredentialDetailPage />} />
          <Route path="/present" element={<PresentationPage />} />
        </Route>
      </Routes>
      
      <Toaster />
    </BrowserRouter>
  );
}

export default App;