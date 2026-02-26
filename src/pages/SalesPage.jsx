import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';
import salesApi from '../api/salesApi';
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

const normalizeCustomers = (data) =>
  data.map((c) => ({
    id: c.id,
    name: c.name || c.fullName || c.email || c.id,
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
  const [customers, setCustomers] = useState([]);
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
      const [salesRes, productsRes, customersRes] = await Promise.all([ // ? CAMBIO
        salesApi.getSales(),
        apiClient.get('/api/products'),
        apiClient.get('/api/customers'), // ? NUEVO
      ]);

      setSales(normalizeSales(salesRes));
      setProducts(normalizeProducts(productsRes.data));
      setCustomers(normalizeCustomers(customersRes.data));
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
      const requestId = crypto.randomUUID();
      await salesApi.sell({
        requestId,
        customerId: customerId || null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          price: Number(item.unitPrice), // ? FIX
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

      <div className="sales-totals">
        <div className="totals-card">
          <span>Total Sales</span>
          <strong>{sales.length}</strong>
        </div>

        <div className="totals-card">
          <span>Total Revenue</span>
          <strong>
            $
            {sales
              .reduce((sum, s) => sum + s.total, 0)
              .toFixed(2)}
          </strong>
        </div>

        <div className="totals-card">
          <span>Total Items Sold</span>
          <strong>
            {sales.reduce((sum, s) => sum + s.items.length, 0)}
          </strong>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sale</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Items</th>
            </tr>
          </thead>

          <tbody>
            {sales.map((sale) => {
              const customer = customers.find(
                (c) => c.id === sale.customerId
              );

              const formattedDate = sale.createdAt
                ? new Date(sale.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }) +
                ' ' +
                new Date(sale.createdAt).toLocaleTimeString()
                : '-';

              return (
                <React.Fragment key={sale.id}>
                  <tr
                    className="clickable-row"
                    onClick={() =>
                      setExpandedSale(
                        expandedSale === sale.id ? null : sale.id
                      )
                    }
                  >
                    {/* ? ID más bonito */}
                    <td>
                      <strong>
                        #{sale.id.slice(0, 6).toUpperCase()}
                      </strong>
                    </td>

                    {/* ? Cliente */}
                    <td>
                      {customer?.name || (
                        <span className="walkin-badge">
                          Walk-in
                        </span>
                      )}
                    </td>

                    {/* ? Fecha formateada */}
                    <td>{formattedDate}</td>

                    {/* ? Total */}
                    <td>
                      <strong>${sale.total.toFixed(2)}</strong>
                    </td>

                    {/* ? Items */}
                    <td>{sale.items.length}</td>
                  </tr>

                  {expandedSale === sale.id && (
                    <tr className="sale-details">
                      <td colSpan="5">
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

                              const subtotal =
                                calculateItemSubtotal(item);

                              return (
                                <tr key={index}>
                                  <td>
                                    {product?.name || 'Unknown'}
                                  </td>
                                  <td>{item.quantity}</td>
                                  <td>
                                    ${item.unitPrice.toFixed(2)}
                                  </td>
                                  <td>
                                    <strong>
                                      ${subtotal.toFixed(2)}
                                    </strong>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {showModal && (
        <Modal title="Create Sale" onClose={() => setShowModal(false)}>
          <form className="form-grid" onSubmit={submitSale}>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Walk-in customer (optional)</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>

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