import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [error, setError] = useState('');
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.usernameOrEmail || !form.password) {
      setError('Username/email and password are required.');
      return;
    }

    setError('');
    const result = await login(form);
    if (result.success) {
      navigate('/dashboard');
      return;
    }
    setError(result.message);
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>MasPatas Login</h1>
        <p>Sign in to continue.</p>

        <label htmlFor="usernameOrEmail">Email or Username</label>
        <input
          id="usernameOrEmail"
          name="usernameOrEmail"
          type="text"
          value={form.usernameOrEmail}
          onChange={handleChange}
          placeholder="admin@maspatas.com"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="••••••••"
        />

        {error && <div className="status-card error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
