import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";

interface CurrentUser {
  id: number;
  role: string;
  name: string;
  email: string;
}

interface Sale {
  id: number;
  user_id: number;
  user_name?: string; // lo traemos con LEFT JOIN
  sale_date: string;
  payment_method: string;
  total: number;
}

interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price?: number; // opcional si deseamos forzar un precio distinto
}

export default function SalesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Para listar las ventas
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal para ver detalle de una venta
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailSaleId, setDetailSaleId] = useState<number | null>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);

  // Modal para crear venta
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [newSaleItems, setNewSaleItems] = useState<SaleItem[]>([]);

  // Campos temporales para agregar un item a newSaleItems
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemUnitPrice, setItemUnitPrice] = useState("");

  // Estados para autocompletar
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]); // productos encontrados

  // Estado para controlar si se muestra la lista de sugerencias
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Referencia para almacenar el ID del setTimeout
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Verificar usuario logueado
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // Obtener info de /api/auth/me
    fetch("http://localhost:4000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo obtener info del usuario");
        return res.json();
      })
      .then((data: CurrentUser) => {
        setCurrentUser(data);
      })
      .catch((err) => {
        console.error(err);
        router.push("/login");
      });
  }, [router]);

  // 2. Cargar la lista de ventas
  useEffect(() => {
    if (!currentUser) return;
    fetchSales();
  }, [currentUser]);


  // Efecto: cada vez que searchText cambie
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Si no hay texto, limpiamos resultados
    if (!searchText) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    // Limpiar timeouts previos
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Crear nuevo timeout
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://localhost:4000/api/products?search=${searchText}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (res.ok) {
          setSearchResults(data);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error(err);
      }
    }, 600); // 600ms de debounce

    // Limpieza del effect
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
    };
  }, [searchText]);

  const fetchSales = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch("http://localhost:4000/api/sales", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al obtener ventas");
      }
      setSales(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2.5 Función para calcular total
  const computeTotal = () => {
    return newSaleItems.reduce((acc, item) => {
      const price = item.unit_price || 0;
      return acc + price * item.quantity;
    }, 0);
  };

  const handleSelectProduct = (prod: any) => {
    setSelectedProduct(prod);
    setSearchText(prod.name); // para mostrar el nombre en el input
    setShowSuggestions(false);
    // Por defecto, sugiere el precio del producto
    setItemUnitPrice(prod.price.toString());
  };

  // 3. Ver detalle de venta
  const handleViewDetail = async (saleId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:4000/api/sales/${saleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al obtener detalle de venta");
      }
      setDetailSaleId(saleId);
      setDetailItems(data.items || []);
      setShowDetailModal(true);
    } catch (error: any) {
      setError(error.message);
    }
  };

  // 4. Crear venta
  //    newSaleItems = [ { product_id, quantity, unit_price? }, ... ]
  const handleCreateSale = async () => {
    if (newSaleItems.length === 0) {
      alert("No hay items en la venta");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const body = {
        payment_method: paymentMethod,
        items: newSaleItems,
      };
      const res = await fetch("http://localhost:4000/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear la venta");
      }
      // Exito
      setShowCreateModal(false);
      setNewSaleItems([]);
      fetchSales(); // recarga la lista de ventas
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Agregar item temporal a la lista newSaleItems
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert("Selecciona un producto");
      return;
    }
    if (!itemQuantity) {
      alert("Falta cantidad");
      return;
    }

    const quantityNum = parseInt(itemQuantity);
    const priceNum = itemUnitPrice
      ? parseFloat(itemUnitPrice)
      : selectedProduct.price;

    const newItem: SaleItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: quantityNum,
      unit_price: priceNum,
    };

    setNewSaleItems([...newSaleItems, newItem]);

    // Limpia los campos
    setSelectedProduct(null);
    setSearchText("");
    setSearchResults([]);
    setItemQuantity("");
    setItemUnitPrice("");
  };

  // Eliminar un item de newSaleItems
  const handleRemoveItem = (index: number) => {
    const updated = [...newSaleItems];
    updated.splice(index, 1);
    setNewSaleItems(updated);
  };

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
        <h2 className="text-xl font-bold">Ventas</h2>
        <div className="flex gap-2">
          {/* Botón volver a dashboard */}
          <a
            href="/dashboard"
            className="rounded bg-gray-400 px-4 py-2 font-semibold text-white hover:bg-gray-500"
          >
            Volver
          </a>
          {/* Botón nueva venta */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Nueva Venta
          </button>
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
          <p>Cargando ventas...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-center">ID</th>
                  <th className="border p-2">Usuario</th>
                  <th className="border p-2">Fecha</th>
                  <th className="border p-2">Método Pago</th>
                  <th className="border p-2">Total</th>
                  <th className="border p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="border p-2 text-center">{sale.id}</td>
                    <td className="border p-2">
                      {sale.user_name
                        ? sale.user_name
                        : `UserID ${sale.user_id}`}
                    </td>
                    <td className="border p-2">
                      {new Date(sale.sale_date).toLocaleString()}
                    </td>
                    <td className="border p-2">{sale.payment_method}</td>
                    <td className="border p-2">${sale.total}</td>
                    <td className="border p-2">
                      {/* Ver detalle */}
                      <button
                        onClick={() => handleViewDetail(sale.id)}
                        className="rounded bg-green-500 px-2 py-1 text-white hover:bg-green-600"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL VER DETALLE DE LA VENTA */}
      {showDetailModal && detailSaleId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="w-full max-w-lg rounded bg-white p-6 shadow">
            <h3 className="mb-4 text-xl font-bold">
              Detalle de Venta #{detailSaleId}
            </h3>
            {detailItems.length === 0 ? (
              <p>No hay items.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2">Producto</th>
                    <th className="border p-2">Cantidad</th>
                    <th className="border p-2">Precio Unit.</th>
                    <th className="border p-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detailItems.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-2">
                        {item.product_name || `ID ${item.product_id}`}
                      </td>
                      <td className="border p-2 text-center">
                        {item.quantity}
                      </td>
                      <td className="border p-2 text-right">
                        ${item.unit_price}
                      </td>
                      <td className="border p-2 text-right">
                        ${item.quantity * item.unit_price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="rounded bg-gray-400 px-4 py-2 text-white hover:bg-gray-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR VENTA */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="w-full max-w-md rounded bg-white p-6 shadow">
            <div className="flex flex-row justify-between">
              <h3 className="mb-4 text-xl font-bold">Nueva Venta</h3>

              {/* Mostrar el total acumulado */}
              <div className="mb-4 text-2xl font-semibold border-yellow-400 px-7 py-7 bg-slate-200 text-blue-700">
                Total: ${computeTotal()}
              </div>
            </div>

            {/* Seleccionar método de pago */}
            <div className="mb-3">
              <label className="mb-1 block font-semibold text-gray-700">
                Método de Pago:
              </label>
              <select
                className="w-full rounded border border-gray-300 p-2"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>

            {/* Lista de items de la venta */}
            {newSaleItems.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2">ProductoID</th>
                      <th className="border p-2">Nombre</th>
                      <th className="border p-2">Cantidad</th>
                      <th className="border p-2">PrecioUnit</th>
                      <th className="border p-2">Quitar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newSaleItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border p-2 text-center">
                          {item.product_id}
                        </td>
                        <td className="border p-2 text-center">
                          {item.product_name}
                        </td>
                        <td className="border p-2 text-center">
                          {item.quantity}
                        </td>
                        <td className="border p-2 text-center">
                          {item.unit_price}
                        </td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Form para agregar un item, con autocompletado */}
            <form onSubmit={handleAddItem}>
              <label className="block font-semibold text-gray-700">
                Buscar producto
              </label>
              <input
                type="text"
                className="mb-2 w-full rounded border border-gray-300 p-2"
                placeholder="Escribe nombre del producto..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setSelectedProduct(null);
                }}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSuggestions(true);
                }}
              />

              {/* Sugerencias */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="mb-2 max-h-40 overflow-y-auto rounded border border-gray-300 bg-white">
                  {searchResults.map((prod) => (
                    <div
                      key={prod.id}
                      className="cursor-pointer p-2 hover:bg-gray-100"
                      onClick={() => handleSelectProduct(prod)}
                    >
                      {prod.name} - ${prod.price}
                    </div>
                  ))}
                </div>
              )}

              <label className="block font-semibold text-gray-700">
                Cantidad
              </label>
              <input
                type="number"
                className="mb-2 w-full rounded border border-gray-300 p-2"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(e.target.value)}
              />

              <label className="block font-semibold text-gray-700">
                PrecioUnit (opcional)
              </label>
              <input
                type="number"
                step="0.01"
                className="mb-3 w-full rounded border border-gray-300 p-2"
                value={itemUnitPrice}
                onChange={(e) => setItemUnitPrice(e.target.value)}
              />

              <button
                type="submit"
                className="mb-4 w-full rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
              >
                Agregar Item
              </button>
            </form>

            {/* Botones finales */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="mr-2 rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSale}
                className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Finalizar Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
