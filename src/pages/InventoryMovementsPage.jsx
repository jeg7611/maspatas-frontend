import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const initialForm = {
  productId: '',
  type: 'IN',
  quantity: 1,
  reason: '',
};

const InventoryMovementsPage = () => {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  /* ================= LOAD DATA ================= */

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [productsRes, movementsRes] = await Promise.all([
        apiClient.get('/api/products'),
        apiClient.get('/api/inventory/movements'),
      ]);

      const normalizedProducts = productsRes.data.map((p) => ({
        id: String(p.id || p.Id),
        name: p.name || p.Name,
        sku: p.sku || p.Sku,
      }));

      const normalizedMovements = movementsRes.data.map((m) => ({
        id: m.id || m.Id,
        productId: String(m.productId || m.ProductId),
        type: m.type || m.Type,
        quantity: m.quantity || m.Quantity,
        balanceAfter: m.balanceAfter || m.BalanceAfter,
        reason: m.reason || m.Reason,
        userName: m.userName || m.UserName || 'System',
        createdAt: m.createdAt || m.CreatedAt,
      }));

      setProducts(normalizedProducts);
      setMovements(normalizedMovements);

      if (normalizedProducts.length > 0) {
        setForm((prev) => ({
          ...prev,
          productId: normalizedProducts[0].id,
        }));
      }

      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  /* ================= PRODUCT LOOKUP ================= */

  const productsMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  /* ================= SUBMIT ================= */

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await apiClient.post('/api/inventory/movements', {
        ...form,
        quantity: Number(form.quantity),
      });

      setMessage('Movement created successfully.');

      setForm((prev) => ({
        ...initialForm,
        productId: prev.productId,
      }));

      loadInitialData();
    } catch (err) {
      console.error(err);
      setError('Could not create inventory movement.');
    }
  };

  /* ================= FILTER ================= */

  const filteredMovements = useMemo(() => {
    if (!filterProduct) return movements;

    return movements.filter(
      (m) => productsMap[m.productId]?.name === filterProduct
    );
  }, [movements, filterProduct, productsMap]);

  /* ================= STATES ================= */

  if (loading) return <LoadingState label="Loading movements..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <div className="section-header">
        <h2>Inventory Movements</h2>
      </div>

      {/* ================= FORM ================= */}

      <form className="form-grid card" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Product</label>
          <select
            value={form.productId}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                productId: e.target.value,
              }))
            }
            required
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Type</label>
          <select
            value={form.type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                type: e.target.value,
              }))
            }
          >
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
        </div>

        <div className="form-field">
          <label>Quantity</label>
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                quantity: e.target.value,
              }))
            }
            required
          />
        </div>

        <div className="form-field">
          <label>Reason</label>
          <input
            value={form.reason}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                reason: e.target.value,
              }))
            }
            placeholder="Restock / Damaged / Adjustment"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Save Movement
        </button>
      </form>

      {/* ================= STATUS ================= */}

      {message && <div className="status-card success">{message}</div>}
      {error && <div className="status-card error">{error}</div>}

      {/* ================= FILTER ================= */}

      <div className="card">
        <div className="table-header">
          <h3>Movement History</h3>

          <select
            className="filter-select"
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
          >
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="empty-state">
            <p>No movements found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Balance</th>
                  <th>User</th>
                  <th>Reason</th>
                </tr>
              </thead>

              <tbody>
                {filteredMovements.map((m) => {
                  const product = productsMap[m.productId];

                  return (
                    <tr key={m.id}>
                      <td>
                        {new Date(m.createdAt).toLocaleString()}
                      </td>

                      <td className="product-cell">
                        <span className="product-name">
                          {product?.name || 'Unknown product'}
                        </span>
                        <span className="sku">
                          {product?.sku || ''}
                        </span>
                      </td>

                      <td>
                        <span className={`badge badge-${m.type.toLowerCase()}`}>
                          {m.type}
                        </span>
                      </td>

                      <td className={m.type === 'OUT' ? 'qty-out' : 'qty-in'}>
                        {m.type === 'OUT' ? '-' : '+'}
                        {m.quantity}
                      </td>

                      <td>{m.balanceAfter}</td>
                      <td>{m.userName}</td>
                      <td className="notes">{m.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default InventoryMovementsPage;