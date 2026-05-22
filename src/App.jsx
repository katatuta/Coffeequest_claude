import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MenuManagement from './pages/MenuManagement';
import AddPurchase from './pages/AddPurchase';
import Statistics from './pages/Statistics';
import PurchaseHistory from './pages/PurchaseHistory';
import Marketplace from './pages/Marketplace';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute>
          <Signup />
        </PublicRoute>
      } />

      {/* Private Routes */}
      <Route path="/" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />
      <Route path="/menus" element={
        <PrivateRoute>
          <MenuManagement />
        </PrivateRoute>
      } />
      <Route path="/purchase" element={
        <PrivateRoute>
          <AddPurchase />
        </PrivateRoute>
      } />
      <Route path="/statistics" element={
        <PrivateRoute>
          <Statistics />
        </PrivateRoute>
      } />
      <Route path="/history" element={
        <PrivateRoute>
          <PurchaseHistory />
        </PrivateRoute>
      } />
      <Route path="/marketplace" element={
        <PrivateRoute>
          <Marketplace />
        </PrivateRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}