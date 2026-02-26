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
    status: sale.status || 'Pending', // ? NUEVO
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

  let userMessage = fallbackMessage;

  if (!err.response) userMessage = 'Network error.';
  else if (status === 400) userMessage = data?.message || 'Invalid data.';
  else if (status === 401) userMessage = 'Session expired.';
  else if (status >= 500) userMessage = 'Server error.';

  setError(userMessage);
};

/* ---------------- STATUS BADGE ---------------- */

const StatusBadge = ({ status }) => {
  const styles = {
    Paid: 'badge-success',
    Pending: 'badge-warning',
    Cancelled: 'badge-danger',
  };

  return <span className={`badge ${styles[status]}`}>{status}</span>;
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

  const [paySale, setPaySale] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [cancelSale, setCancelSale] = useState(null);

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
      const requestId = crypto.randomUUID();
      await salesApi.sell({
        requestId,
        customerId: customerId || null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          price: Number(item.unitPrice),
        })),
      });

      setShowModal(false);
      setItems([createItem()]);
      setCustomerId('');
      setToast({ type: 'success', message: 'Sale created' });
      loadData();
    } catch (err) {
      handleApiError(err, 'Could not create sale.', setError);
    }
  };

  /* ---------------- PAY ---------------- */

  const submitPayment = async () => {
    try {
      await apiClient.post('/api/sales/pay', {
        saleId: paySale.id,
        paymentMethod,
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
      await apiClient.post('/api/sales/cancel', {
        saleId: cancelSale.id,
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
            ${sales.reduce((sum, s) => sum + s.total, 0).toFixed(2)}
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
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {sales.map((sale) => {
              const customer = customers.find(
                (c) => c.id === sale.customerId
              );

              const isLocked =
                sale.status === 'Paid' || sale.status === 'Cancelled';

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
                      <strong>#{sale.id.slice(0, 6).toUpperCase()}</strong>
                    </td>

                    <td>
                      {customer?.name || (
                        <span className="walkin-badge">Walk-in</span>
                      )}
                    </td>

                    <td>{new Date(sale.createdAt).toLocaleString()}</td>

                    <td>
                      <strong>${sale.total.toFixed(2)}</strong>
                    </td>

                    <td>{sale.items.length}</td>

                    <td>
                      <StatusBadge status={sale.status} />
                    </td>

                    <td className="actions-cell">
                      <button
                        className="btn btn-success btn-sm"
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaySale(sale);
                        }}
                      >
                        Pay
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancelSale(sale);
                        }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>

                  {/* ? DETALLE INTACTO */}
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
                              const product = products.find(
                                (p) => p.id === item.productId
                              );

                              const subtotal =
                                calculateItemSubtotal(item);

                              return (
                                <tr key={index}>
                                  <td>{product?.name || 'Unknown'}</td>
                                  <td>{item.quantity}</td>
                                  <td>${item.unitPrice.toFixed(2)}</td>
                                  <td>
                                    <strong>${subtotal.toFixed(2)}</strong>
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

      {/* CREATE SALE MODAL (igual) */}
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

            <button type="submit" className="btn btn-primary">
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
          <p>Are you sure?</p>

          <div className="confirm-actions">
            <button className="btn btn-secondary" onClick={() => setCancelSale(null)}>
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