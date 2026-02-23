import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { motion } from 'framer-motion';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [
        productsRes,
        inventoryRes,
        customersRes,
        usersRes,
        movementsRes,
        salesRes,
      ] = await Promise.all([
        apiClient.get('/api/products'),
        apiClient.get('/api/inventory'),
        apiClient.get('/api/customers'),
        apiClient.get('/api/auth'),
        apiClient.get('/api/inventory/movements'),
        apiClient.get('/api/sales'),
      ]);

      const products = productsRes.data;
      const inventory = inventoryRes.data;
      const customers = customersRes.data;
      const users = usersRes.data;
      const movements = movementsRes.data;
      const sales = salesRes.data;

      // ?? Products
      const totalProducts = products.length;
      const activeProducts = products.filter(p => p.active).length;

      // ?? Inventory
      const totalStock = inventory.reduce((sum, i) => sum + i.stock, 0);
      const lowStock = inventory.filter(i => i.stock <= i.minimumStock).length;
      const outOfStock = inventory.filter(i => i.stock <= 0).length;

      // ??
      const totalCustomers = customers.length;
      const totalUsers = users.length;

      // ?? Movements
      const movementStats = movements.reduce(
        (acc, mov) => {
          if (mov.type === 'IN') acc.in += mov.quantity;
          if (mov.type === 'OUT') acc.out += mov.quantity;
          return acc;
        },
        { in: 0, out: 0 }
      );

      const movementChart = [
        { name: 'Entries', value: movementStats.in },
        { name: 'Exits', value: movementStats.out },
      ];

      // ?? Sales
      const totalSales = sales.length;
      const revenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);

      // ?? Sales per day
      const salesByDay = sales.reduce((acc, sale) => {
        const date = new Date(sale.createdAt).toLocaleDateString();
        acc[date] = (acc[date] || 0) + (sale.total || 0);
        return acc;
      }, {});

      const salesChart = Object.entries(salesByDay).map(([date, total]) => ({
        date,
        total,
      }));

      setStats({
        totalProducts,
        activeProducts,
        totalStock,
        lowStock,
        outOfStock,
        totalCustomers,
        totalUsers,
        movementChart,
        totalSales,
        revenue,
        salesChart,
      });

      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!stats) return null;

  return (
    <section className="space-y-6">
      <div className="section-header">
        <h2>Dashboard</h2>
        <button className="btn btn-secondary" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      {/* ? KPI Cards */}
      <div className="dashboard-grid">
        <AnimatedCard>
          <Stat label="Products" value={stats.totalProducts} />
          <Stat label="Active" value={stats.activeProducts} />
        </AnimatedCard>

        <AnimatedCard>
          <Stat label="Total Stock" value={stats.totalStock} />
          <Stat label="Low Stock" value={stats.lowStock} warning />
          <Stat label="Out of Stock" value={stats.outOfStock} danger />
        </AnimatedCard>

        <AnimatedCard>
          <Stat label="Customers" value={stats.totalCustomers} />
        </AnimatedCard>

        <AnimatedCard>
          <Stat label="Users" value={stats.totalUsers} />
        </AnimatedCard>

        {/* ?? SALES CARD */}
        <AnimatedCard>
          <Stat label="Sales" value={stats.totalSales} />
          <Stat label="Revenue" value={`$${stats.revenue.toFixed(2)}`} />
        </AnimatedCard>
      </div>

      {/* ? Charts */}
      <div className="dashboard-grid">
        <AnimatedCard className="col-span-2">
          <h3>Inventory Movements</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={stats.movementChart}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedCard>

        <AnimatedCard>
          <h3>Stock Status</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Low', value: stats.lowStock },
                    { name: 'Out', value: stats.outOfStock },
                    {
                      name: 'Healthy',
                      value:
                        stats.totalProducts -
                        stats.lowStock -
                        stats.outOfStock,
                    },
                  ]}
                  dataKey="value"
                  outerRadius={100}
                >
                  <Cell />
                  <Cell />
                  <Cell />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AnimatedCard>
      </div>

      {/* ?? SALES TREND */}
      <div className="dashboard-grid">
        <AnimatedCard className="col-span-3">
          <h3>Sales Trend</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={stats.salesChart}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line dataKey="total" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AnimatedCard>
      </div>
    </section>
  );
};

const AnimatedCard = ({ children, className = '' }) => (
  <motion.div
    className={`card ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    {children}
  </motion.div>
);

const Stat = ({ label, value, danger, warning }) => (
  <div className={`stat ${danger ? 'stat-danger' : ''} ${warning ? 'stat-warning' : ''}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default DashboardPage;
