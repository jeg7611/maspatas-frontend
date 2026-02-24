import { useEffect, useState, useMemo } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { motion } from 'framer-motion';

const getStockStatus = (stock, minimum) => {
  if (stock === 0) return 'out';
  if (stock <= minimum * 0.5) return 'critical';
  if (stock <= minimum) return 'low';
  return 'healthy';
};

const COLORS = {
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const currency = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;

const number = (value) =>
  Number(value || 0).toLocaleString();

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');

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

      setData({
        products: productsRes.data,
        inventory: inventoryRes.data,
        customers: customersRes.data,
        users: usersRes.data,
        movements: movementsRes.data,
        sales: salesRes.data,
      });

      setError('');
    } catch (err) {
      console.error('Dashboard Error:', err);
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const availableYears = useMemo(() => {
    if (!data?.sales) return [];

    const years = data.sales.map(s =>
      new Date(s.createdAt).getFullYear()
    );

    return [...new Set(years)].sort((a, b) => b - a);
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;

    const { products, inventory, customers, users, sales } = data;

    const filteredSales = sales.filter(sale => {
      const date = new Date(sale.createdAt);

      const matchYear = date.getFullYear() === selectedYear;
      const matchMonth =
        selectedMonth === 'all' ||
        date.getMonth() === Number(selectedMonth);

      return matchYear && matchMonth;
    });

    const revenue = filteredSales.reduce(
      (sum, s) => sum + (s.total || 0),
      0
    );

    const salesByDay = filteredSales.reduce((acc, sale) => {
      const date = new Date(sale.createdAt).toLocaleDateString();
      acc[date] = (acc[date] || 0) + (sale.total || 0);
      return acc;
    }, {});

    const salesChart = Object.entries(salesByDay).map(
      ([date, total]) => ({ date, total })
    );

    const revenueByMonth = Array.from({ length: 12 }).map((_, i) => {
      const total = sales
        .filter(s => {
          const d = new Date(s.createdAt);
          return (
            d.getFullYear() === selectedYear &&
            d.getMonth() === i
          );
        })
        .reduce((sum, s) => sum + (s.total || 0), 0);

      return {
        month: new Date(0, i).toLocaleString('default', {
          month: 'short',
        }),
        total,
      };
    });

    const averageTicket =
      filteredSales.length > 0
        ? revenue / filteredSales.length
        : 0;

    const productSalesMap = {};

    filteredSales.forEach(sale => {
      sale.items?.forEach(item => {
        productSalesMap[item.productId] =
          (productSalesMap[item.productId] || 0) +
          item.quantity;
      });
    });

    const topProducts = Object.entries(productSalesMap)
      .map(([productId, qty]) => {
        const product = products.find(p => p.id === productId);
        return {
          name: product?.name || 'Unknown',
          quantity: qty,
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const latestSales = [...filteredSales]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const normalizedInventory = inventory.map(i => ({
      ...i,
      stock: Number(i.stock),
      minimumStock: Number(i.minimumStock),
    }));

    const criticalStock = normalizedInventory
      .filter(i => Number(i.stock) <= Number(i.minimumStock) * 2)
      .sort((a, b) => a.stock - b.stock)
      .map(item => {
        const product = products.find(p => p.id === item.productId);

    return {
      ...item,
      stock: Number(item.stock),
      minimumStock: Number(item.minimumStock),
      productName: product?.name || 'Unknown product',
    };
  });

    return {
      revenue,
      totalSales: filteredSales.length,
      totalCustomers: customers.length,
      totalUsers: users.length,
      totalStock: inventory.reduce((sum, i) => sum + i.stock, 0),
      lowStock: inventory.filter(i => Number(i.stock) <= Number(i.minimumStock)).length,
      averageTicket,
      salesChart,
      revenueByMonth,
      topProducts,
      latestSales,
      criticalStock,
    };
  }, [data, selectedYear, selectedMonth]);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!stats) return null;

  return (
    <section className="dashboard">
      <div className="section-header">
        <div>
          <h2>Dashboard</h2>
          <p className="subtitle">Business overview</p>
        </div>

        <div className="filters">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="all">Full Year</option>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(0, i).toLocaleString('default', {
                  month: 'long',
                })}
              </option>
            ))}
          </select>

          <button className="btn btn-secondary" onClick={loadDashboard}>
            Refresh
          </button>
        </div>
      </div>

      <div className="dashboard-grid kpi-grid">
        <AnimatedCard>
          <Stat label="Revenue" value={currency(stats.revenue)} />
        </AnimatedCard>

        <AnimatedCard>
          <Stat label="Sales" value={number(stats.totalSales)} />
        </AnimatedCard>

        <AnimatedCard>
          <Stat label="Avg Ticket" value={currency(stats.averageTicket)} />
        </AnimatedCard>
      </div>

      <AnimatedCard>
        <h3>Sales Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={stats.salesChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(v) => currency(v)} />
            <Line
              type="monotone"
              dataKey="total"
              stroke={COLORS.primary}
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </AnimatedCard>

      <AnimatedCard>
        <h3>Monthly Revenue</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.revenueByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(v) => currency(v)} />
            <Bar
              dataKey="total"
              fill={COLORS.primary}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </AnimatedCard>

      <AnimatedCard>
        <h3>Top Products</h3>
        {stats.topProducts.map(p => (
          <div key={p.name} className="stat-line">
            <span>{p.name}</span>
            <strong>{p.quantity}</strong>
          </div>
        ))}
      </AnimatedCard>

      <AnimatedCard>
        <h3>Latest Sales</h3>
        {stats.latestSales.map(sale => (
          <div key={sale.id} className="stat-line">
            <span>{sale.id.slice(0, 8)}...</span>
            <strong>{currency(sale.total)}</strong>
          </div>
        ))}
      </AnimatedCard>

     <AnimatedCard>
  <h3>Inventory Alerts</h3>

  {stats.criticalStock.length === 0 ? (
    <p>No critical alerts</p>
  ) : (
    stats.criticalStock.map(item => {
      const status = getStockStatus(item.stock, item.minimumStock);
      const percentage =
  item.minimumStock > 0
    ? Math.min((item.stock / item.minimumStock) * 100, 100)
    : 0;

      return (
        <div key={item.productId ?? item.productName} className="stock-alert">
          <div className="stock-alert-header">
            <span>{item.productName}</span>
            <span className={`badge badge-${status}`}>
              {status === 'out' && 'Out of stock'}
              {status === 'critical' && 'Critical'}
              {status === 'low' && 'Low'}
              {status === 'healthy' && 'Healthy'}
            </span>
          </div>

          <div className="stock-meta">
            <span>Stock: <strong>{item.stock}</strong></span>
            <span>Min: {item.minimumStock}</span>
          </div>

          <div className="stock-bar">
            <div
              className={`stock-fill stock-${status}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      );
    })
  )}
</AnimatedCard>
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

const Stat = ({ label, value, danger }) => (
  <div className={`stat ${danger ? 'stat-danger' : ''}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default DashboardPage;