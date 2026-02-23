import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import Modal from '../components/Modal';

const emptyProduct = {
  name: '',
  sku: '',
  description: '',
  price: '',
};

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

      const normalized = data.map((p) => ({
        id: p.id || p.Id || p._id,
        name: p.name || p.Name,
        sku: p.sku || p.Sku || '-',
        description: p.description || p.Description || '',
        price: Number(p.price ?? p.Price ?? 0),
        active: p.active ?? p.Active ?? true,
      }));

      setProducts(normalized);
      setError('');
    } catch (err) {
      console.error(err);
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

    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      setError('Price must be greater than 0.');
      return;
    }

    try {
      await apiClient.post('/api/products', {
        name: form.name,
        sku: form.sku,
        description: form.description,
        price: Number(form.price),
      });

      setShowModal(false);
      setForm(emptyProduct);
      loadProducts();
    } catch (err) {
      console.error(err);
      setError('Could not create product.');
    }
  };

  if (loading) return <LoadingState label="Loading products..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <div className="section-header">
        <h2>Products</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          New Product
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Description</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.sku}</td>

                <td className="description-cell">
                  {product.description || '-'}
                </td>

                <td>
                  {product.price.toLocaleString('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                  })}
                </td>

                <td>
                  <span
                    className={`badge ${
                      product.active ? 'badge-active' : 'badge-inactive'
                    }`}
                  >
                    {product.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Create Product" onClose={() => setShowModal(false)}>
          <form className="form-grid" onSubmit={handleCreateProduct}>
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
              required
            />

            <input
              placeholder="SKU"
              value={form.sku}
              onChange={(e) =>
                setForm((p) => ({ ...p, sku: e.target.value }))
              }
            />

            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
            />

            <input
              placeholder="Price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) =>
                setForm((p) => ({ ...p, price: e.target.value }))
              }
              required
            />

            <button type="submit" className="btn btn-primary">
              Save Product
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default ProductsPage;
