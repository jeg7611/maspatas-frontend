import { useEffect, useState, useMemo } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, inventoryRes] = await Promise.all([
        apiClient.get('/api/products'),
        apiClient.get('/api/inventory'),
      ]);

      const inventoryMap = new Map();

      inventoryRes.data.forEach(inv => {
        const productId = inv.productId || inv.ProductId;

        inventoryMap.set(productId, {
          stock: Number(inv.stock ?? inv.Stock ?? 0),
          minimumStock: Number(inv.minimumStock ?? inv.MinimumStock ?? 0),
        });
      });

      const merged = productsRes.data.map(prod => {
        const id = prod.id || prod.Id;
        const inv = inventoryMap.get(id);

        return {
          id,
          name: prod.name || prod.Name || 'Unnamed product',
          sku: prod.sku || prod.Sku || '-',
          price: Number(prod.price || prod.Price || 0),
          stock: inv?.stock ?? 0,
          minimumStock: inv?.minimumStock ?? 0,
        };
      });

      setProducts(merged);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ---------------- STOCK LOGIC ---------------- */

  const stockClass = (stock, minimumStock) => {
    if (stock === 0) return 'stock-empty';
    if (minimumStock > 0 && stock <= minimumStock * 0.5) return 'stock-critical';
    if (minimumStock > 0 && stock <= minimumStock) return 'stock-low';
    return 'stock-ok';
  };

  const stockLabel = (stock, minimumStock) => {
    if (stock === 0) return 'Out of Stock';
    if (minimumStock > 0 && stock <= minimumStock * 0.5) return 'Critical';
    if (minimumStock > 0 && stock <= minimumStock) return 'Low Stock';
    return 'Healthy';
  };

  const stockPercentage = (stock, minimumStock) => {
    if (!minimumStock || minimumStock <= 0) return 100;
    return Math.min((stock / minimumStock) * 100, 100);
  };

  /* ---------------- KPI CALCULATIONS ---------------- */

  const stats = useMemo(() => {
    const empty = products.filter(p => p.stock === 0).length;
    const critical = products.filter(
      p => p.minimumStock > 0 && p.stock > 0 && p.stock <= p.minimumStock * 0.5
    ).length;
    const low = products.filter(
      p => p.minimumStock > 0 &&
           p.stock > p.minimumStock * 0.5 &&
           p.stock <= p.minimumStock
    ).length;

    const total = products.length;

    const riskScore = total === 0
      ? 0
      : Math.round(((empty * 3 + critical * 2 + low) / (total * 3)) * 100);

    return { empty, critical, low, total, riskScore };
  }, [products]);

  const alerts = useMemo(() => {
    return products.filter(
      p => p.stock === 0 ||
           (p.minimumStock > 0 && p.stock <= p.minimumStock)
    );
  }, [products]);

  return (
    <section className="inventory-page">

      {/* HEADER */}
      <div className="section-header">
        <div>
          <h2>Inventory Dashboard</h2>
          <p className="subtitle">
            Real-time stock health & risk monitoring
          </p>
        </div>

        <button className="btn btn-secondary" onClick={loadData}>
          Refresh
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="dashboard-grid kpi-grid">
        <div className="card stat">
          <span>Total Products</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="card stat stat-danger">
          <span>Out of Stock</span>
          <strong>{stats.empty}</strong>
        </div>

        <div className="card stat stat-warning">
          <span>Critical Items</span>
          <strong>{stats.critical}</strong>
        </div>

        <div className="card stat stat-highlight">
          <span>Risk Score</span>
          <strong>{stats.riskScore}%</strong>
        </div>
      </div>

      {/* ALERT BANNER */}
      {!loading && !error && alerts.length > 0 && (
        <div className="alert-banner">
          &#9888; {alerts.length} products need attention
        </div>
      )}

      {/* STATES */}
      {loading && <LoadingState label="Loading inventory..." />}
      {error && <ErrorState message={error} />}

      {/* TABLE */}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {products.map(product => {
                const status = stockClass(product.stock, product.minimumStock);
                const percentage = stockPercentage(
                  product.stock,
                  product.minimumStock
                );

                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>

                    <td>{product.sku}</td>

                    <td>${product.price.toFixed(2)}</td>

                    <td>
                      <div className="stock-cell">
                        <span className={`stock-number ${status}`}>
                          {product.stock}
                        </span>

                        <div className="stock-bar">
                          <div
                            className={`stock-fill ${status}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`badge badge-${status}`}>
                        {stockLabel(product.stock, product.minimumStock)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </section>
  );
};

export default ProductsPage;