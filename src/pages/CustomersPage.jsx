import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import Modal from '../components/Modal';

const emptyCustomer = { name: '', email: '', phone: '' };

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/api/customers');

      const normalized = data.map((c) => ({
        id: c.id || c.Id || c._id,
        name: c.name || c.Name,
        email: c.email || c.Email,
        phone: c.phone || c.Phone || '-',
      }));

      setCustomers(normalized);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  /* =========================
     VALIDATION
  ========================= */

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = 'Name is required';

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Invalid email';
    }

    return newErrors;
  };

  /* =========================
     CREATE / UPDATE
  ========================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      if (editingCustomer) {
        await apiClient.put(`/api/customers/${editingCustomer.id}`, form);
      } else {
        await apiClient.post('/api/customers', form);
      }

      closeModal();
      loadCustomers();
    } catch (err) {
      console.error(err);
      setError('Could not save customer.');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone === '-' ? '' : customer.phone,
    });
    setShowModal(true);
  };

  const handleDelete = async (customer) => {
    const confirmed = window.confirm(
      `Delete customer "${customer.name}"?`
    );

    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/customers/${customer.id}`);
      loadCustomers();
    } catch (err) {
      console.error(err);
      setError('Could not delete customer.');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setForm(emptyCustomer);
    setErrors({});
  };

  /* =========================
     SEARCH + SORT
  ========================= */

  const filteredCustomers = useMemo(() => {
    let list = [...customers];

    if (search.trim()) {
      list = list.filter((c) =>
        `${c.name} ${c.email} ${c.phone}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    list.sort((a, b) => {
      const aVal = a[sortKey]?.toLowerCase?.() ?? '';
      const bVal = b[sortKey]?.toLowerCase?.() ?? '';

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [customers, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const getInitials = (name) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  if (loading) return <LoadingState label="Loading customers..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <section>
      <div className="section-header">
        <h2>Customers</h2>

        <div className="header-actions">
          <input
            className="search-input"
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            New Customer
          </button>
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <p>No customers found</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => toggleSort('name')}>Customer</th>
                <th onClick={() => toggleSort('email')}>Email</th>
                <th onClick={() => toggleSort('phone')}>Phone</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-name">{customer.name}</span>
                    </div>
                  </td>

                  <td>{customer.email}</td>
                  <td>{customer.phone}</td>

                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost"
                        onClick={() => handleEdit(customer)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-ghost btn-danger"
                        onClick={() => handleDelete(customer)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editingCustomer ? 'Edit Customer' : 'Create Customer'}
          onClose={closeModal}
        >
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Full name</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                className={errors.name ? 'input-error' : ''}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                className={errors.email ? 'input-error' : ''}
              />
              {errors.email && (
                <span className="field-error">{errors.email}</span>
              )}
            </div>

            <div className="form-field">
              <label>Phone</label>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>

            <button className="btn btn-primary btn-block">
              {editingCustomer ? 'Update Customer' : 'Save Customer'}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default CustomersPage;