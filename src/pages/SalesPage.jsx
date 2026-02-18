import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import Modal from '../components/Modal';

const createItem = () => ({ productId: '', quantity: 1, unitPrice: 0 });

const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState([createItem()]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0),
    [items]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesRes, productsRes] = await Promise.all([
        apiClient.get('/api/sales'),
        apiClient.get('/api/products'),
      ]);
      setSales(salesRes.data);
      setProducts(productsRes.data);
      setError('');
    } catch {
      setError('Could not load sales data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addItem = () => setItems((prev) => [...prev, createItem()]);

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const submitSale = async (event) => {
    event.preventDefault();
    try {
      await apiClient.post('/api/sales', {
        items: items.map((item) => ({
          ...item,
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        total,
      });
      setShowModal(false);
      setItems([createItem()]);
      loadData();
    } catch {
      setError('Could not create sale.');
    }
  };

  return (
    <section>
      <div className="section-header">
        <h2>Sales</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
          New Sale
        </button>
      </div>

      {loading && <LoadingState label="Loading sales..." />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.id}</td>
                  <td>{sale.createdAt ? new Date(sale.createdAt).toLocaleString() : '-'}</td>
                  <td>${Number(sale.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Create Sale" onClose={() => setShowModal(false)}>
          <form className="form-grid" onSubmit={submitSale}>
            {items.map((item, index) => (
              <div key={`item-${index}`} className="sale-item-row">
                <select
                  value={item.productId}
                  onChange={(e) => updateItem(index, 'productId', e.target.value)}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unit price"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                  required
                />
                {items.length > 1 && (
                  <button type="button" className="btn btn-ghost" onClick={() => removeItem(index)}>
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button type="button" className="btn" onClick={addItem}>
              + Add Item
            </button>
            <div className="sale-total">Total: ${total.toFixed(2)}</div>
            <button type="submit" className="btn btn-primary">
              Save Sale
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default SalesPage;
