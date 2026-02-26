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
  (data || [])
    .map((sale) => ({
      id: sale.id,
      customerId: sale.customerId,
      total: Number(sale.totalAmount || 0),
      createdAt: sale.createdAt,
      status: sale.status || 'Pending',
      items: (sale.items || []).map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      })),
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const normalizeProducts = (data) =>
  (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price || 0),
  }));

const normalizeCustomers = (data) =>
  (data || []).map((c) => ({
    id: c.id,
    name: c.name || c.fullName || c.email || c.id,
  }));

/* ---------------- ERROR HANDLER ---------------- */

const handleApiError = (err, fallbackMessage, setError) => {
  const status = err.response?.status;
  const data = err.response?.data;

  let userMessage = fallbackMessage;

  if (!err.response) userMessage = 'Network error.';
  else if (status === 400) userMessage = data?.message || 'Invalid data.';
  else if (status === 401) userMessage = 'Session expired.';
  else if (status >= 500) userMessage = 'Server error.';

  setError(userMessage);
};

/* ---------------- STATUS BADGE ---------------- */
const StatusBadge = ({ status }) => {
  const statusMap = {
    1: {
      label: 'Pending',
      className: 'badge-status-pending',
    },
    2: {
      label: 'Paid',
      className: 'badge-status-paid',
    },
    3: {
      label: 'Cancelled',
      className: 'badge-status-cancelled',
    },
  };

  const config = statusMap[Number(status)] || {
    label: 'Unknown',
    className: 'badge-status-unknown',
  };

  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  );
};
/* ---------------- TOAST ---------------- */

const Toast = ({ toast }) =>
  toast ? (
    <div className={`toast toast-${toast.type}`}>
      {toast.message}
    </div>
  ) : null;

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

  const [toast, setToast] = useState(null);

  const [payNow, setPayNow] = useState(false);
  const [payNowMethod, setPayNowMethod] = useState('Cash');
  const [paySale, setPaySale] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [cancelSale, setCancelSale] = useState(null);

  /* ---------------- AUTOHIDE TOAST ---------------- */

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ---------------- LOAD DATA ---------------- */

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesRes, productsRes, customersRes] = await Promise.all([
        salesApi.getSales(),
        apiClient.get('/api/products'),
        apiClient.get('/api/customers'),
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

  /* ---------------- MAPS (OPTIMIZACI�N) ---------------- */

  const productMap = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products]
  );

  const customerMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers]
  );

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  /* ---------------- CALCULOS ---------------- */

  const calculateItemSubtotal = (item) =>
    Number(item.quantity || 0) * Number(item.unitPrice || 0);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0),
    [items]
  );

  const totalRevenue = useMemo(
    () => sales.reduce((sum, s) => sum + Number(s.total || 0), 0),
    [sales]
  );

  /* ---------------- ITEMS ---------------- */

  const addItem = () => setItems((prev) => [...prev, createItem()]);

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
    const product = productMap[productId];

    updateItem(index, 'productId', productId);
    if (product) updateItem(index, 'unitPrice', product.price);
  };

  /* ---------------- VALIDACION ---------------- */

  const validateSale = () => {
    if (!items.length) return 'Add at least one item';

    for (const item of items) {
      if (!item.productId) return 'Select a product';
      if (Number(item.quantity) <= 0) return 'Invalid quantity';
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
      // 1️⃣ Crear venta
      const createdSale = await salesApi.sell({
        requestId: crypto.randomUUID(),
        customerId: customerId || null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          price: Number(item.unitPrice),
        })),
      });

      // 2️⃣ Si está marcado pagar ahora
      if (payNow) {
        await salesApi.pay({
          saleId: createdSale.id,
          paymentMethod: payNowMethod,
          amount: Number(total || 0),
          requestId: crypto.randomUUID(),
        });
      }

      setShowModal(false);
      setItems([createItem()]);
      setCustomerId('');
      setPayNow(false);
      setPayNowMethod('Cash');

      setToast({
        type: 'success',
        message: payNow
          ? `Sale created and paid via ${payNowMethod}`
          : 'Sale created',
      });

      loadData();
    } catch (err) {
      handleApiError(err, 'Could not create sale.', setError);
    }
  };

  /* ---------------- PAY ---------------- */

  const submitPayment = async () => {
    try {
      const requestId = crypto.randomUUID();

      await salesApi.pay({
        saleId: paySale.id,
        paymentMethod,
        amount: Number(paySale.total || 0),
        requestId,
      });

      setToast({
        type: 'success',
        message: `Paid via ${paymentMethod}`,
      });

      setPaySale(null);
      loadData();
    } catch (err) {
      handleApiError(err, 'Payment failed.', setError);
    }
  };

  /* ---------------- CANCEL ---------------- */

  const submitCancel = async () => {
    try {
      const requestId = crypto.randomUUID();

      await apiClient.post('/api/sales/cancel', {
        saleId: cancelSale.id,
        requestId,
      });

      setToast({ type: 'warning', message: 'Sale cancelled' });
      setCancelSale(null);
      loadData();
    } catch (err) {
      handleApiError(err, 'Cancel failed.', setError);
    }
  };

  /* ---------------- RENDER ---------------- */

  if (loading) return <LoadingState label="Loading sales..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <Toast toast={toast} />

      <div className="section-header">
        <h2>Sales</h2>

        <div className="actions">
          <button className="btn btn-secondary" onClick={loadData}>
            Refresh
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
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
          <strong>{formatCurrency(totalRevenue)}</strong>
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
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {sales.map((sale) => {
              const customer = customerMap[sale.customerId];

              const isLocked =
                sale.status === 2 || sale.status === 3;

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
                    <td>
                      <strong>
                        #{sale.id.slice(0, 6).toUpperCase()}
                      </strong>
                    </td>

                    <td>
                      {customer?.name || (
                        <span className="walkin-badge">Walk-in</span>
                      )}
                    </td>

                    <td>
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>

                    <td>
                      <strong>{formatCurrency(sale.total)}</strong>
                    </td>

                    <td>{sale.items.length}</td>

                    <td>
                      <StatusBadge status={sale.status} />
                    </td>

                    <td
                      className="actions-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn btn-success btn-sm"
                        disabled={isLocked}
                        onClick={() => setPaySale(sale)}
                      >
                        Pay
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        disabled={isLocked}
                        onClick={() => setCancelSale(sale)}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>

                  {expandedSale === sale.id && (
                    <tr className="sale-details">
                      <td colSpan="7">
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
                              const product =
                                productMap[item.productId];

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

      {/* CREATE SALE MODAL */}
      {showModal && (
        <Modal title="Create Sale" onClose={() => setShowModal(false)}>
          <form className="sale-form" onSubmit={submitSale}>

            {/* Customer */}
            <div className="form-group">
              <label>Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Walk-in Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Items */}
            <div className="items-section">
              <div className="items-header">
                <span>Product</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span>Subtotal</span>
                <span></span>
              </div>

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
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                      required
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, "unitPrice", e.target.value)
                      }
                      required
                    />

                    <div className="item-subtotal">
                      {formatCurrency(subtotal)}
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeItem(index)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}

              <button type="button" className="btn-add" onClick={addItem}>
                + Add Product
              </button>
            </div>

            {/* Summary */}
            <div className="sale-summary">
              <div className="sale-total">
                <span>Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>

              <label className="pay-now-toggle">
                <input
                  type="checkbox"
                  checked={payNow}
                  onChange={(e) => setPayNow(e.target.checked)}
                />
                <span>Mark as paid</span>
              </label>

              {payNow && (
                <div className="payment-section">
                  <label>Payment Method</label>
                  <select
                    value={payNowMethod}
                    onChange={(e) => setPayNowMethod(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Transfer">Bank Transfer</option>
                    <option value="Nequi">Nequi</option>
                  </select>

                  <div className="payment-indicator">
                    This sale will be recorded as paid via{" "}
                    <strong>{payNowMethod}</strong>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary full-width">
              Save Sale
            </button>
          </form>
        </Modal>
      )}
      {/* PAY MODAL */}
      {paySale && (
        <Modal title="Register Payment" onClose={() => setPaySale(null)}>
          <div className="form-grid">
            <label>Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option>Cash</option>
              <option>Card</option>
              <option>Transfer</option>
              <option>Nequi</option>
            </select>

            <button className="btn btn-success" onClick={submitPayment}>
              Confirm Payment
            </button>
          </div>
        </Modal>
      )}

      {/* CANCEL MODAL */}
      {cancelSale && (
        <Modal title="Cancel Sale" onClose={() => setCancelSale(null)}>
          <p>Are you sure you want to cancel this sale?</p>

          <div className="confirm-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setCancelSale(null)}
            >
              No
            </button>
            <button className="btn btn-danger" onClick={submitCancel}>
              Yes, Cancel
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
};

export default SalesPage;