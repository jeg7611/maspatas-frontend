import { useEffect, useState } from 'react';
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
  const [form, setForm] = useState(emptyCustomer);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/api/customers');
      setCustomers(data);
      setError('');
    } catch {
      setError('Could not load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      await apiClient.post('/api/customers', form);
      setShowModal(false);
      setForm(emptyCustomer);
      loadCustomers();
    } catch {
      setError('Could not create customer.');
    }
  };

  return (
    <section>
      <div className="section-header">
        <h2>Customers</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
          New Customer
        </button>
      </div>

      {loading && <LoadingState label="Loading customers..." />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id || customer.email}>
                  <td>{customer.name}</td>
                  <td>{customer.email}</td>
                  <td>{customer.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Create Customer" onClose={() => setShowModal(false)}>
          <form className="form-grid" onSubmit={handleCreate}>
            <input placeholder="Full name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            <button type="submit" className="btn btn-primary">Save</button>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default CustomersPage;
