import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

const initialForm = {
  productId: '',
  type: 'IN',
  quantity: 1,
  reason: '',
};

const InventoryMovementsPage = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data } = await apiClient.get('/api/products');
        setProducts(data);
        if (data.length > 0) {
          setForm((prev) => ({ ...prev, productId: String(data[0].id) }));
        }
      } catch {
        setError('Could not load products for movements.');
      }
    };

    loadProducts();
  }, []);

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
      setForm((prev) => ({ ...initialForm, productId: prev.productId || '' }));
    } catch {
      setError('Could not create inventory movement.');
    }
  };

  return (
    <section>
      <h2>Inventory Movements</h2>
      <form className="form-grid card" onSubmit={handleSubmit}>
        <label>
          Product
          <select
            value={form.productId}
            onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
            required
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Type
          <select
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
        </label>

        <label>
          Quantity
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
            required
          />
        </label>

        <label>
          Reason
          <input
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Restock / Damaged / Sale adjustment"
            required
          />
        </label>

        <button type="submit" className="btn btn-primary">Save Movement</button>
      </form>

      {message && <div className="status-card success">{message}</div>}
      {error && <div className="status-card error">{error}</div>}
    </section>
  );
};

export default InventoryMovementsPage;
