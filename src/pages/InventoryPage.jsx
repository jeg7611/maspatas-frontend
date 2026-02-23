import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, inventoryRes] = await Promise.all([
        apiClient.get('/api/products'),
        apiClient.get('/api/inventory'),
      ]);

      const productsData = productsRes.data;
      const inventoryData = inventoryRes.data;

      // ?? Crear mapa rápido de inventario (mejor performance)
      const inventoryMap = new Map();

      inventoryData.forEach(inv => {
        const productId = inv.productId || inv.ProductId;
        inventoryMap.set(productId, {
          stock: inv.stock ?? inv.Stock ?? 0,
          minimumStock: inv.minimumStock ?? inv.MinimumStock ?? 0,
        });
      });

      const merged = productsData.map(prod => {
        const id = prod.id || prod.Id;
        const inv = inventoryMap.get(id);

        return {
          id,
          name: prod.name || prod.Name,
          sku: prod.sku || prod.Sku,
          price: prod.price || prod.Price,
          stock: inv?.stock ?? 0,
          minimumStock: inv?.minimumStock ?? 0,
        };
      });

      setProducts(merged);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stockClass = (stock, minimumStock) => {
    if (stock === 0) return 'stock-empty';
    if (stock <= minimumStock) return 'stock-low';
    return 'stock-ok';
  };

  const stockLabel = (stock, minimumStock) => {
    if (stock === 0) return 'Out';
    if (stock <= minimumStock) return 'Low';
    return 'OK';
  };

  return (
    <section>
      <div className="section-header">
        <h2>Products</h2>
        <button className="btn btn-secondary" onClick={loadData}>
          Refresh
        </button>
      </div>

      {loading && <LoadingState label="Loading products..." />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>${Number(product.price).toFixed(2)}</td>

                  <td className={stockClass(product.stock, product.minimumStock)}>
                    {product.stock}
                  </td>

                  <td>
                    <span className={`badge ${stockClass(product.stock, product.minimumStock)}`}>
                      {stockLabel(product.stock, product.minimumStock)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ProductsPage;