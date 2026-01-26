import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import TablesView from './pages/TablesView';
import KitchenView from './pages/KitchenView';
import CashierView from './pages/CashierView';
import WaiterOrderView from './pages/WaiterOrderView';
import CategoriesView from './pages/CategoriesView'; // New
import InventoryView from './pages/InventoryView';   // New
import UsersView from './pages/UsersView';           // New
import StaffStatsView from './pages/StaffStatsView'; // New



// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/" />; // Or unauthorized page
  }
  return children;
};

// Route Dispatcher based on Role
const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  switch (user.rol) {
    case 'admin': return <Navigate to="/admin/users" />;
    case 'cocina': return <Navigate to="/kitchen" />;
    case 'caja': return <Navigate to="/cashier" />;
    default: return <Navigate to="/tables" />;
  }
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<DashboardLayout />}>
              <Route path="/" element={<HomeRedirect />} />

              <Route path="/tables" element={
                <ProtectedRoute allowedRoles={['mozo', 'admin']}>
                  <TablesView />
                </ProtectedRoute>
              } />

              <Route path="/order/:tableId" element={
                <ProtectedRoute allowedRoles={['mozo', 'admin']}>
                  <WaiterOrderView />
                </ProtectedRoute>
              } />

              <Route path="/kitchen" element={
                <ProtectedRoute allowedRoles={['cocina', 'admin']}>
                  <KitchenView />
                </ProtectedRoute>
              } />

              <Route path="/cashier" element={
                <ProtectedRoute allowedRoles={['caja', 'admin']}>
                  <CashierView />
                </ProtectedRoute>
              } />

              {/* Admin / Inventory Modules */}
              <Route path="/admin/categories" element={
                <ProtectedRoute allowedRoles={['caja', 'admin']}>
                  <CategoriesView />
                </ProtectedRoute>
              } />

              <Route path="/admin/inventory" element={
                <ProtectedRoute allowedRoles={['caja', 'admin']}>
                  <InventoryView />
                </ProtectedRoute>
              } />



              <Route path="/admin/users" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsersView />
                </ProtectedRoute>
              } />

              <Route path="/admin/staff-stats" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <StaffStatsView />
                </ProtectedRoute>
              } />



            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
