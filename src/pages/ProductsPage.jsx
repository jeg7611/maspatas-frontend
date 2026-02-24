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
  const [errors, setErrors] = useState({});

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

  const validate = (values = form) => {
    const newErrors = {};

    if (!values.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    if (!values.price || Number(values.price) <= 0) {
      newErrors.price = 'El precio debe ser mayor a 0';
    }

    return newErrors;
  };

  const handleChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    setErrors(validate(updated));
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    try {
      await apiClient.post('/api/products', {
        name: form.name,
        sku: form.sku,
        description: form.description,
        price: Number(form.price),
      });

      setShowModal(false);
      setForm(emptyProduct);
      setErrors({});
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
            
            <div className="form-group">
              <label>Nombre del producto *</label>
              <input
                type="text"
                placeholder="Ej: Concentrado Premium"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
              {errors.name && (
                <span className="field-error">{errors.name}</span>
              )}
            </div>

            <div className="form-group">
              <label>SKU</label>
              <input
                type="text"
                placeholder="Ej: SKU-001"
                value={form.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label>Descripción</label>
              <textarea
                rows="3"
                placeholder="Detalles opcionales del producto"
                value={form.description}
                onChange={(e) =>
                  handleChange('description', e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>Precio *</label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="Ej: 25000"
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
              />

              {form.price && !errors.price && (
                <span className="field-hint">
                  {Number(form.price).toLocaleString('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                  })}
                </span>
              )}

              {errors.price && (
                <span className="field-error">{errors.price}</span>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={Object.keys(errors).length > 0}
              >
                Guardar producto
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default ProductsPage;