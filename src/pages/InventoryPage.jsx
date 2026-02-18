import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const { data } = await apiClient.get('/api/inventory');
        setInventory(data);
      } catch {
        setError('Could not load inventory.');
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, []);

  return (
    <section>
      <h2>Inventory</h2>
      {loading && <LoadingState label="Loading inventory..." />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.productId || item.id}>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default InventoryPage;
