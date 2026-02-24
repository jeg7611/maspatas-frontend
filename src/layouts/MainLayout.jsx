import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Products', path: '/products' },
  { label: 'Customers', path: '/customers' },
  { label: 'Inventory', path: '/inventory' },
  { label: 'Inventory Movements', path: '/inventory-movements' },
  { label: 'Sales', path: '/sales' },
];

const MainLayout = ({ children }) => {
  const { logout, user, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2 className="brand">MasPatas</h2>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          {role === 'Admin' && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Users
            </NavLink>
          )}
        </nav>
        <button type="button" className="btn btn-danger sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div>
            <h1>MasPatas</h1>
            <p>Welcome back, {user?.username || user?.email}</p>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
