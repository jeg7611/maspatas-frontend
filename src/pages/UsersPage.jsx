import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import Modal from '../components/Modal';

const initialUser = { username: '', email: '', password: '', role: 'Seller' };

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialUser);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/api/users');
      setUsers(data);
      setError('');
    } catch {
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (event) => {
    event.preventDefault();
    try {
      await apiClient.post('/api/users', form);
      setShowModal(false);
      setForm(initialUser);
      loadUsers();
    } catch {
      setError('Could not create user.');
    }
  };

  return (
    <section>
      <div className="section-header">
        <h2>Users</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
          New User
        </button>
      </div>

      {loading && <LoadingState label="Loading users..." />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id || user.email}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Create User" onClose={() => setShowModal(false)}>
          <form className="form-grid" onSubmit={createUser}>
            <input placeholder="Username" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
            <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="Admin">Admin</option>
              <option value="Seller">Seller</option>
            </select>
            <button type="submit" className="btn btn-primary">Save</button>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default UsersPage;
