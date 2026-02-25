# MasPatas.Frontend

Modern React + Vite admin frontend prepared to consume an existing ASP.NET Core Web API.

## Stack
- React (functional components + hooks)
- Vite
- React Router DOM
- Axios
- Context API for auth state
- JWT authentication

## Run locally
```bash
npm install
npm run dev
```

> Configure backend URL with `.env` from `.env.example`.

## Folder structure
```text
src/
  api/
    apiClient.js          # Axios instance + token interceptors
  components/
    ErrorState.jsx
    LoadingState.jsx
    Modal.jsx
    ProtectedRoute.jsx
  context/
    AuthContext.jsx       # login/logout/user/token/role state
  layouts/
    MainLayout.jsx        # Navbar + Sidebar + content wrapper
  pages/
    LoginPage.jsx
    DashboardPage.jsx
    ProductsPage.jsx
    CustomersPage.jsx
    InventoryPage.jsx
    InventoryMovementsPage.jsx
    SalesPage.jsx
    UsersPage.jsx
  router/
    AppRouter.jsx         # Public + private + role-based routes
  styles/
    global.css            # Responsive clean admin styling
  utils/
    jwt.js                # JWT decode helpers
```

## Key implementation details
- `apiClient` attaches JWT from `localStorage` automatically and redirects to `/login` on unauthorized responses.
- `AuthContext` exposes: `login()`, `logout()`, `user`, `token`, and `role`, plus `isAuthenticated` and loading state.
- `ProtectedRoute` blocks pages without token and supports `requiredRole` for admin-only routes.
- Sidebar includes all required menu options and shows **Users** only when role is `Admin`.
- CRUD pages include loading, error handling, and basic form validation.
- Sales page supports multiple line items and auto-calculates total before submit.

## API endpoints used
- `POST /api/auth/login`
- `GET/POST /api/products`
- `GET/POST /api/customers`
- `GET /api/inventory`
- `POST /api/inventory/movements`
- `GET /api/sales`
- `POST /api/sales/sell`
- `POST /api/sales/pay`
- `POST /api/sales/cancel`
- `GET/POST /api/users`

## Notes
- Expected login response should contain `token` (or `accessToken`).
- JWT role claim can be read from standard ASP.NET role claim URI or `role` field.
