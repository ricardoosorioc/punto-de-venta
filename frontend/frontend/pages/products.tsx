import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface CurrentUser {
  id: number;
  role: string;
  name: string;
  email: string;
}

// Estructura de un producto (coincide con tu tabla "products")
interface Product {
  id: number;
  name: string;
  description: string | null;
  cost: number;
  price: number;
  stock: number;
  barcode: string | null;
  is_composite: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProductsPage() {
  const router = useRouter();

  // Info del usuario logueado
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  // Lista de productos
  const [products, setProducts] = useState<Product[]>([]);
  // Control de errores
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados para MODAL de crear producto
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCost, setCreateCost] = useState('0');
  const [createPrice, setCreatePrice] = useState('0');
  const [createStock, setCreateStock] = useState('0');
  const [createBarcode, setCreateBarcode] = useState('');
  const [createIsComposite, setCreateIsComposite] = useState(false);

  // Estados para MODAL de editar producto
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCost, setEditCost] = useState('0');
  const [editPrice, setEditPrice] = useState('0');
  const [editStock, setEditStock] = useState('0');
  const [editBarcode, setEditBarcode] = useState('');
  const [editIsComposite, setEditIsComposite] = useState(false);

  // 1. Verificar si hay token y cargar info del usuario (similar a dashboard)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    // Llamar a /api/auth/me
    fetch('http://localhost:4000/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudo obtener información del usuario');
        return res.json();
      })
      .then((data: CurrentUser) => {
        setCurrentUser(data);
      })
      .catch((err) => {
        console.error(err);
        router.push('/login');
      });
  }, [router]);

  // 2. Una vez tengamos currentUser, cargar la lista de productos
  //    (Se asume que incluso un vendedor puede ver la lista,
  //     pero solo admin puede crear, editar, eliminar)
  useEffect(() => {
    if (!currentUser) return;
    fetchProducts();
  }, [currentUser]);

  const fetchProducts = async () => {
    setError('');
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch('http://localhost:4000/api/products', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener productos');
      }
      setProducts(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- CREATE PRODUCT ---
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('http://localhost:4000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: createName,
          description: createDescription,
          cost: parseFloat(createCost),
          price: parseFloat(createPrice),
          stock: parseInt(createStock),
          barcode: createBarcode || null,
          is_composite: createIsComposite
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear producto');
      }

      setShowCreateModal(false);
      // Limpiar campos
      setCreateName('');
      setCreateDescription('');
      setCreateCost('0');
      setCreatePrice('0');
      setCreateStock('0');
      setCreateBarcode('');
      setCreateIsComposite(false);

      // Refrescar lista
      fetchProducts();
    } catch (error: any) {
      setError(error.message);
    }
  };

  // --- EDIT PRODUCT ---
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditDescription(product.description || '');
    setEditCost(product.cost.toString());
    setEditPrice(product.price.toString());
    setEditStock(product.stock.toString());
    setEditBarcode(product.barcode || '');
    setEditIsComposite(product.is_composite);
    setShowEditModal(true);
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:4000/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          cost: parseFloat(editCost),
          price: parseFloat(editPrice),
          stock: parseInt(editStock),
          barcode: editBarcode || null,
          is_composite: editIsComposite
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar producto');
      }
      setShowEditModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      setError(error.message);
    }
  };

  // --- DELETE PRODUCT ---
  const handleDeleteProduct = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:4000/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar producto');
      }
      fetchProducts();
    } catch (error: any) {
      setError(error.message);
    }
  };

  // --- Permisos UI ---
  const isAdmin = currentUser?.role === 'admin';

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 p-4">
      {/* Encabezado */}
      <div className="mb-4 flex items-center justify-between bg-white p-4 shadow">
        <h2 className="text-xl font-bold">Gestión de Productos</h2>
        <div className="flex gap-2">
          {/* Regresar al Dashboard */}
          <a
            href="/dashboard"
            className="rounded bg-gray-400 px-4 py-2 font-semibold text-white hover:bg-gray-500"
          >
            Volver
          </a>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Crear Producto
            </button>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="mx-auto w-full max-w-4xl bg-white p-4 shadow">
        {error && (
          <div className="mb-4 rounded bg-red-100 p-2 text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <p>Cargando productos...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-center">ID</th>
                  <th className="border p-2">Nombre</th>
                  <th className="border p-2">Precio</th>
                  <th className="border p-2">Stock</th>
                  <th className="border p-2">Creado</th>
                  <th className="border p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => (
                  <tr key={prod.id}>
                    <td className="border p-2 text-center">{prod.id}</td>
                    <td className="border p-2">{prod.name}</td>
                    <td className="border p-2">${prod.price}</td>
                    <td className="border p-2">{prod.stock}</td>
                    <td className="border p-2">
                      {new Date(prod.created_at).toLocaleString()}
                    </td>
                    <td className="border p-2">
                      {/* Solo admin puede Editar/Eliminar */}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => openEditModal(prod)}
                            className="mr-2 rounded bg-green-500 px-2 py-1 text-white hover:bg-green-600"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR PRODUCTO */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="w-full max-w-md rounded bg-white p-6 shadow">
            <h3 className="mb-4 text-xl font-bold">Crear Producto</h3>
            <form onSubmit={handleCreateProduct}>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">Nombre</label>
                <input
                  type="text"
                  className="w-full rounded border border-gray-300 p-2"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">Descripción</label>
                <textarea
                  className="w-full rounded border border-gray-300 p-2"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded border border-gray-300 p-2"
                    value={createCost}
                    onChange={(e) => setCreateCost(e.target.value)}
                  />
                </div>
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded border border-gray-300 p-2"
                    value={createPrice}
                    onChange={(e) => setCreatePrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">Stock</label>
                  <input
                    type="number"
                    className="w-full rounded border border-gray-300 p-2"
                    value={createStock}
                    onChange={(e) => setCreateStock(e.target.value)}
                  />
                </div>
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">Código de barras</label>
                  <input
                    type="text"
                    className="w-full rounded border border-gray-300 p-2"
                    value={createBarcode}
                    onChange={(e) => setCreateBarcode(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-3 flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={createIsComposite}
                  onChange={(e) => setCreateIsComposite(e.target.checked)}
                />
                <label className="font-semibold text-gray-700">¿Es producto compuesto (ancheta)?</label>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="mr-2 rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PRODUCTO */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="w-full max-w-md rounded bg-white p-6 shadow">
            <h3 className="mb-4 text-xl font-bold">Editar Producto</h3>
            <form onSubmit={handleEditProduct}>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">Nombre</label>
                <input
                  type="text"
                  className="w-full rounded border border-gray-300 p-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">Descripción</label>
                <textarea
                  className="w-full rounded border border-gray-300 p-2"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded border border-gray-300 p-2"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                  />
                </div>
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded border border-gray-300 p-2"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">Stock</label>
                  <input
                    type="number"
                    className="w-full rounded border border-gray-300 p-2"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                  />
                </div>
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">Código de barras</label>
                  <input
                    type="text"
                    className="w-full rounded border border-gray-300 p-2"
                    value={editBarcode}
                    onChange={(e) => setEditBarcode(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-3 flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={editIsComposite}
                  onChange={(e) => setEditIsComposite(e.target.checked)}
                />
                <label className="font-semibold text-gray-700">¿Es producto compuesto (ancheta)?</label>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="mr-2 rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
