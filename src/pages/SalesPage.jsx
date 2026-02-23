import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import Modal from '../components/Modal';

/* ---------------- HELPERS ---------------- */

const createItem = () => ({
  productId: '',
  quantity: 1,
  unitPrice: 0,
});

const normalizeSales = (data) =>
  data.map((sale) => ({
    id: sale.id,
    customerId: sale.customerId,
    total: Number(sale.totalAmount || 0),
    createdAt: sale.createdAt,
    items: (sale.items || []).map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    })),
  }));

const normalizeProducts = (data) =>
  data.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price || 0),
  }));

/* ---------------- ERROR HANDLER ---------------- */

const handleApiError = (err, fallbackMessage, setError) => {
  const status = err.response?.status;
  const data = err.response?.data;
  const backendMessage = data?.message;
  const validationErrors = data?.errors;

  console.error('? API Error:', {
    status,
    backendMessage,
    validationErrors,
    raw: err,
  });

  let userMessage = fallbackMessage;

  if (!err.response) {
    userMessage = 'Network error. Please check your connection.';
  } else if (status === 400) {
    userMessage = backendMessage || 'Invalid data. Please review the form.';
  } else if (status === 401) {
    userMessage = 'Session expired. Please log in again.';
  } else if (status === 403) {
    userMessage = 'You do not have permission.';
  } else if (status >= 500) {
    userMessage = 'Server error. Please try again later.';
  }

  if (validationErrors) {
    const firstError = Object.values(validationErrors)[0];
    if (Array.isArray(firstError)) {
      userMessage = firstError[0];
    }
  }

  setError(userMessage);
};

/* ---------------- COMPONENT ---------------- */

const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSale, setExpandedSale] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState([createItem()]);
  const [customerId, setCustomerId] = useState('');

  /* ---------------- LOAD DATA ---------------- */

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesRes, productsRes] = await Promise.all([
        apiClient.get('/api/sales'),
        apiClient.get('/api/products'),
      ]);

      setSales(normalizeSales(salesRes.data));
      setProducts(normalizeProducts(productsRes.data));
      setError('');
    } catch (err) {
      handleApiError(err, 'Could not load sales.', setError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ---------------- CALCULOS ---------------- */

  const calculateItemSubtotal = (item) =>
    Number(item.quantity) * Number(item.unitPrice);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0),
    [items]
  );

  /* ---------------- ITEMS ---------------- */

  const addItem = () =>
    setItems((prev) => [...prev, createItem()]);

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (index) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  /* ---------------- PRODUCT SELECT ---------------- */

  const handleProductChange = (index, productId) => {
    const product = products.find((p) => p.id === productId);

    updateItem(index, 'productId', productId);

    if (product) {
      updateItem(index, 'unitPrice', product.price);
    }
  };

  /* ---------------- VALIDACION ---------------- */

  const validateSale = () => {
    if (!items.length) return 'Add at least one item';

    for (const item of items) {
      if (!item.productId) return 'Select a product';
      if (Number(item.quantity) <= 0) return 'Quantity must be greater than 0';
      if (Number(item.unitPrice) < 0) return 'Invalid price';
    }

    return null;
  };

  /* ---------------- CREATE SALE ---------------- */

  const submitSale = async (event) => {
    event.preventDefault();

    const validationError = validateSale();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await apiClient.post('/api/sales', {
        customerId: customerId || null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });

      setShowModal(false);
      setItems([createItem()]);
      setCustomerId('');
      setError('');
      loadData();
    } catch (err) {
      handleApiError(err, 'Could not create sale.', setError);
    }
  };

  /* ---------------- RENDER ---------------- */

  if (loading)
    return <LoadingState label="Loading sales..." />;
  if (error)
    return <ErrorState message={error} />;

  return (
    <section>
      <div className="section-header">
        <h2>Sales</h2>

        <div className="actions">
          <button className="btn btn-secondary" onClick={loadData}>
            Refresh
          </button>

          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            New Sale
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Total</th>
              <th>Items</th>
            </tr>
          </thead>

          <tbody>
            {sales.map((sale) => (
              <>
                <tr
                  key={sale.id}
                  className="clickable-row"
                  onClick={() =>
                    setExpandedSale(expandedSale === sale.id ? null : sale.id)
                  }
                >
                  <td><small>{sale.id.slice(0, 8)}...</small></td>

                  <td>
                    {sale.createdAt
                      ? new Date(sale.createdAt).toLocaleString()
                      : '-'}
                  </td>

                  <td>
                    <strong>${sale.total.toFixed(2)}</strong>
                  </td>

                  <td>{sale.items.length}</td>
                </tr>

                {expandedSale === sale.id && (
                  <tr className="sale-details">
                    <td colSpan="4">
                      <table className="nested-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Unit</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>

                        <tbody>
                          {sale.items.map((item, index) => {
                            const product = products.find(
                              (p) => p.id === item.productId
                            );

                            const subtotal = calculateItemSubtotal(item);

                            return (
                              <tr key={index}>
                                <td>{product?.name || 'Unknown'}</td>
                                <td>{item.quantity}</td>
                                <td>${item.unitPrice.toFixed(2)}</td>
                                <td><strong>${subtotal.toFixed(2)}</strong></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Create Sale" onClose={() => setShowModal(false)}>
          <form className="form-grid" onSubmit={submitSale}>
            <input
              placeholder="Customer ID (optional)"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />

            {items.map((item, index) => {
              const subtotal = calculateItemSubtotal(item);

              return (
                <div key={index} className="sale-item-row">
                  <select
                    value={item.productId}
                    onChange={(e) =>
                      handleProductChange(index, e.target.value)
                    }
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
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, 'quantity', e.target.value)
                    }
                    required
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, 'unitPrice', e.target.value)
                    }
                    required
                  />

                  <div className="item-subtotal">
                    ${subtotal.toFixed(2)}
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => removeItem(index)}
                    >
                      ?
                    </button>
                  )}
                </div>
              );
            })}

            <button type="button" className="btn" onClick={addItem}>
              + Add Item
            </button>

            <div className="sale-total">
              Total: <strong>${total.toFixed(2)}</strong>
            </div>

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