import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import Modal from '../components/Modal';

const emptyProduct = { name: '', sku: '', price: '', stock: '' };

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyProduct);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/api/products');
      setProducts(data);
      setError('');
    } catch {
      setError('Could not load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    if (!form.name || !form.price) return;

    try {
      await apiClient.post('/api/products', {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock || 0),
      });
      setShowModal(false);
      setForm(emptyProduct);
      loadProducts();
    } catch {
      setError('Could not create product. Please verify form data.');
    }
  };

  return (
    <section>
      <div className="section-header">
        <h2>Products</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
          New Product
        </button>
      </div>

      {loading && <LoadingState label="Loading products..." />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id || product.sku}>
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>${Number(product.price || 0).toFixed(2)}</td>
                  <td>{product.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Create Product" onClose={() => setShowModal(false)}>
          <form className="form-grid" onSubmit={handleCreateProduct}>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <input placeholder="SKU" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} required />
            <input placeholder="Price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
            <input placeholder="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))} />
            <button type="submit" className="btn btn-primary">Save</button>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default ProductsPage;
