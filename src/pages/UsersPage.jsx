import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import Modal from '../components/Modal';

const initialUser = { username: '', email: '', password: '', role: 'Seller' };

/* ? Normalizador Mongo ? UI */
const normalizeUsers = (data) =>
  data.map((u) => ({
    id: u.id || u._id || u.username, // fallback inteligente
    username: u.username || u.Username,
    email: u.email || u.Email || '-', // opcional
    role: u.role || u.Role,
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

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialUser);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/api/auth');

      setUsers(normalizeUsers(data));
      setError('');
    } catch (err) {
      console.error('? Load Users Error:', err);
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
      await apiClient.post('/api/auth/register', {
        username: form.username,
        email: form.email || null,
        password: form.password,
        role: form.role,
      });

      setShowModal(false);
      setForm(initialUser);
      loadUsers();
    } catch (err) {
       handleApiError(err, 'Could not create user.', setError);
    }
  };

  return (
    <section>
      <div className="section-header">
        <h2>Users</h2>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
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
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role?.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Create User" onClose={() => setShowModal(false)}>
          <form className="form-grid" onSubmit={createUser}>
            <input
              placeholder="Username"
              value={form.username}
              onChange={(e) =>
                setForm((p) => ({ ...p, username: e.target.value }))
              }
              required
            />

            <input
              placeholder="Email (optional)"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
            />

            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              required
            />

            <select
              value={form.role}
              onChange={(e) =>
                setForm((p) => ({ ...p, role: e.target.value }))
              }
            >
              <option value="Admin">Admin</option>
              <option value="Seller">Seller</option>
            </select>

            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default UsersPage;