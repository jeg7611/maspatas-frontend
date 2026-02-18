export const decodeJwt = (token) => {
  try {
    const payload = token.split('.')[1];
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
};

export const getRoleFromPayload = (payload) => {
  if (!payload) return '';

  return (
    payload.role ||
    payload.roles?.[0] ||
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    ''
  );
};
