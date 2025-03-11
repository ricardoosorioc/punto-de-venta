import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { TextField, Button } from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import Link from "next/link";

interface CurrentUser {
  id: number;
  role: string;
  name: string;
  email: string;
}

interface Product {
  //product: Array<1>;
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
  price: number;
  unit_price?: number; // opcional si deseamos forzar un precio distinto
}

export default function SalesPage() {
  const router = useRouter();
  const { from, to } = router.query;

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Para listar las ventas
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal para ver detalle de una venta
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailSaleId, setDetailSaleId] = useState<number | null>(null);
  const [detailItems, setDetailItems] = useState<SaleItem[]>([]);
  const [saleDetail, setSaleDetail] = useState<Sale | null>(null);

  // Modal para crear venta
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [newSaleItems, setNewSaleItems] = useState<SaleItem[]>([]);

  // Campos temporales para agregar un item a newSaleItems
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemUnitPrice, setItemUnitPrice] = useState("");

  // Estados para autocompletar
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]); // productos encontrados

  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  // Estado para controlar si se muestra la lista de sugerencias
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Campo donde se escribe/escanea el barcode
  const [barcodeInput, setBarcodeInput] = useState("");

  // en tu componente Sales
  const [showTodayOnly, setShowTodayOnly] = useState(false);

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
    fetch("https://punto-venta-backend.onrender.com/api/auth/me", {
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

  

  useEffect(() => {
    if (from) setFromDate(from as string);
    if (to) setToDate(to as string);
  }, [from, to]);

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
          `https://punto-venta-backend.onrender.com/api/products?search=${searchText}`,
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

  // E.g. after finalizing sale:
  useEffect(() => {
    const saleId = router.query.saleId; // supón que pasamos ?saleId=...
    if (saleId) {
      fetchSaleDetails(parseInt(saleId as string));
    }
  }, [router.query.saleId]);

  const fetchSaleDetails = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`https://punto-venta-backend.onrender.com/api/sales/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSales(data.sale);
        setNewSaleItems(data.items);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSales = useCallback(async (customFrom?: string, customTo?: string) => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    
    // Si no se pasan valores, usa el estado actual
    const finalFrom = customFrom !== undefined ? customFrom : fromDate;
    const finalTo = customTo !== undefined ? customTo : toDate;

    let url = "https://punto-venta-backend.onrender.com/api/sales";

    if (finalFrom && finalTo) {
      url += `?from=${finalFrom}&to=${finalTo}`;
    } else if (finalFrom) {
      url += `?from=${finalFrom}`;
    } else if (finalTo) {
      url += `?to=${finalTo}`;
    }

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSales(data);
      } else {
        setError(data.error || "Error al obtener ventas");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router, fromDate, toDate]);

  // 2. Cargar la lista de ventas
  useEffect(() => {
    if (!currentUser) return;
    fetchSales();
  }, [currentUser, fetchSales]);

  const resetFilters = () => {
    setFromDate(null);
    setToDate(null);
    fetchSales("", ""); // Llamar fetchSales inmediatamente después de resetear estados
  };

  // 2.5 Función para calcular total
  const computeTotal = () => {
    return newSaleItems.reduce((acc, item) => {
      const price = item.unit_price || 0;
      return acc + price * item.quantity;
    }, 0);
  };

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setSearchText(prod.name); // para mostrar el nombre en el input
    setShowSuggestions(false);
    // Por defecto, sugiere el precio del producto
    setItemUnitPrice(prod.price.toString());
  };

  // 3. Ver detalle de venta
  const handleViewDetail = async (saleId: number) => {
    setDetailSaleId(saleId);

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`https://punto-venta-backend.onrender.com/api/sales/${saleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al obtener detalle de venta");
      }

      setSaleDetail(data.sale);
      setDetailItems(data.items);
      setShowDetailModal(true);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ocurrió un error desconocido");
      }
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
      const res = await fetch("https://punto-venta-backend.onrender.com/api/sales", {
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
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("Ocurrió un error desconocido");
      }
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

    // Ver si ya existe en items
    const idx = newSaleItems.findIndex(
      (i) => i.product_id === selectedProduct.id
    );
    if (idx >= 0) {
      // Aumentar la quantity
      const updated = [...newSaleItems];
      const quantityNum = parseInt(itemQuantity);
      updated[idx].quantity = updated[idx].quantity + quantityNum;
      setNewSaleItems(updated);

      setSelectedProduct(null);
      setSearchText("");
      setSearchResults([]);
      setItemQuantity("");
      setItemUnitPrice("");
    } else {
      const quantityNum = parseInt(itemQuantity);
      const priceNum = itemUnitPrice
        ? parseFloat(itemUnitPrice)
        : selectedProduct.price;

      const newItem: SaleItem = {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: quantityNum,
        price: selectedProduct.price,
        unit_price: priceNum,
      };

      setNewSaleItems([...newSaleItems, newItem]);

      // Limpia los campos
      setSelectedProduct(null);
      setSearchText("");
      setSearchResults([]);
      setItemQuantity("");
      setItemUnitPrice("");
    }
  };

  // 1. Manejo del "Enter" en el input
  const handleBarcodeKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!barcodeInput) return;
      await lookupProductByBarcode(barcodeInput);
      setBarcodeInput(""); // limpiar para el siguiente
    }
  };

  // 2. Buscar el producto en el backend
  const lookupProductByBarcode = async (code: string) => {
    setError("");
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No hay token, inicia sesión");
      return;
    }

    try {
      const res = await fetch(
        `https://punto-venta-backend.onrender.com/api/products/barcode/${code}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        throw new Error("Producto no encontrado o error en la búsqueda");
      }
      const product: Product = await res.json();

      // Agregarlo al "cart"
      addItemToSale(product);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ocurrió un error desconocido");
      }
    }
  };

  // 3. Agregar item al "cart"
  const addItemToSale = (product: Product) => {
    // Ver si ya existe en items
    const idx = newSaleItems.findIndex((i) => i.product_id === product.id);
    if (idx >= 0) {
      // Aumentar la quantity
      const updated = [...newSaleItems];
      updated[idx].quantity += 1;
      setNewSaleItems(updated);
    } else {
      // Nuevo item
      const newItem: SaleItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.price,
        unit_price: product.price,
      };

      setNewSaleItems([...newSaleItems, newItem]);

      // Limpia los campos
      setSelectedProduct(null);
      setSearchText("");
      setSearchResults([]);
      setItemQuantity("");
      setItemUnitPrice("");
    }
  };

  // Eliminar un item de newSaleItems
  const handleRemoveItem = (index: number) => {
    const updated = [...newSaleItems];
    updated.splice(index, 1);
    setNewSaleItems(updated);
  };

  function isToday(dateString: string): boolean {
    const d = new Date(dateString);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  // al renderizar la lista:
  const displayedSales = showTodayOnly
    ? sales.filter((s) => isToday(s.sale_date))
    : sales;

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-blue-400 p-4">
      {/* Encabezado */}
      <div className="mb-4 flex items-center justify-between bg-blue-950 p-4 shadow">
        <h2 className="text-xl font-bold text-white">Ventas</h2>
        <div className="flex gap-2">
          {/* Botón volver a dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center rounded bg-red-400 py-2 font-semibold text-white hover:bg-red-500"
          >
            <ArrowBackIcon className="mr-1" />
            Volver
          </Link>

          {/* Botón nueva venta */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center rounded bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700"
          >
            <MonetizationOnIcon className="mr-1" />
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
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setShowTodayOnly(!showTodayOnly)}
              sx={{ mb: 2 }}
            >
              {showTodayOnly ? "Mostrar Todas" : "Ventas de Hoy"}
            </Button>
            <div className="flex gap-2 mb-4">
              <TextField
                label="Desde"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={fromDate || ""}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <TextField
                label="Hasta"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={toDate || ""}
                onChange={(e) => setToDate(e.target.value)}
              />
              <Button
                variant="outlined"
                color="secondary"
                onClick={resetFilters}
              >
                Ver Todas
              </Button>
            </div>
            <TableContainer component={Paper} sx={{ marginTop: 2 }}>
              <Table sx={{ minWidth: 650 }} aria-label="sales table">
                <TableHead>
                  <TableRow>
                    <TableCell align="center">ID</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Metodo Pago</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell align="center">{sale.id}</TableCell>
                      <TableCell className="border p-2">
                        {sale.user_name
                          ? sale.user_name
                          : `UserID ${sale.user_id}`}
                      </TableCell>
                      <TableCell className="border p-2">
                        {new Date(sale.sale_date).toLocaleString()}
                      </TableCell>
                      <TableCell>{sale.payment_method}</TableCell>
                      <TableCell>${sale.total}</TableCell>
                      <TableCell className="border p-2">
                        {/* Ver detalle */}

                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => handleViewDetail(sale.id)}
                          sx={{ mr: 1 }}
                        >
                          Ver detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </div>

      {/* MODAL VER DETALLE DE LA VENTA */}
      {showDetailModal && detailSaleId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 ">
          <div className="w-full max-w-lg rounded bg-white p-6 shadow overflow-x-scroll">
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
                    <tr key={item.product_id}>
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
                        ${item.quantity * (item.unit_price ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-4 text-xl font-bold">
              Total: ${saleDetail?.total}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              {/* BOTÓN IMPRIMIR TICKET */}
              <button
                onClick={() =>
                  window.open(`/print/ticket?saleId=${detailSaleId}`, "_blank")
                }
                className="rounded bg-purple-500 px-2 py-1 text-white hover:bg-purple-800"
              >
                Imprimir Ticket
              </button>
              {/* BOTÓN CERRAR */}
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-800"
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
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>

            <label className="block font-semibold text-gray-700">
              Escanear / Teclear Barcode:
            </label>
            <input
              type="text"
              className="mb-4 w-full border p-2"
              placeholder="Escanea aquí..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
            />

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
