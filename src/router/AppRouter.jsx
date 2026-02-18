import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import CustomersPage from '../pages/CustomersPage';
import DashboardPage from '../pages/DashboardPage';
import InventoryMovementsPage from '../pages/InventoryMovementsPage';
import InventoryPage from '../pages/InventoryPage';
import LoginPage from '../pages/LoginPage';
import ProductsPage from '../pages/ProductsPage';
import SalesPage from '../pages/SalesPage';
import UsersPage from '../pages/UsersPage';

const WithLayout = ({ children }) => <MainLayout>{children}</MainLayout>;

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={
            <WithLayout>
              <DashboardPage />
            </WithLayout>
          }
        />
        <Route
          path="/products"
          element={
            <WithLayout>
              <ProductsPage />
            </WithLayout>
          }
        />
        <Route
          path="/customers"
          element={
            <WithLayout>
              <CustomersPage />
            </WithLayout>
          }
        />
        <Route
          path="/inventory"
          element={
            <WithLayout>
              <InventoryPage />
            </WithLayout>
          }
        />
        <Route
          path="/inventory-movements"
          element={
            <WithLayout>
              <InventoryMovementsPage />
            </WithLayout>
          }
        />
        <Route
          path="/sales"
          element={
            <WithLayout>
              <SalesPage />
            </WithLayout>
          }
        />
      </Route>

      <Route element={<ProtectedRoute requiredRole="Admin" />}>
        <Route
          path="/users"
          element={
            <WithLayout>
              <UsersPage />
            </WithLayout>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRouter;
