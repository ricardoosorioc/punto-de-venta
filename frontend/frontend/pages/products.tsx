import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import JsBarcode from "jsbarcode";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { Button } from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddBoxIcon from "@mui/icons-material/AddBox";
import Link from "next/link";

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

// Estructura para "hijos" en un producto compuesto
interface CompositionChild {
  child_product_id: number;
  child_name: string; // lo guardamos para mostrarlo en la tabla
  quantity: number;
  child_cost: number;
}

interface ProductBody {
  name: string;
  description?: string;
  cost: number;
  price: number;
  stock: number;
  barcode?: string;
  is_composite: boolean;
  children?: { child_product_id: number; quantity: number }[];
}

export default function ProductsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [searchText, setSearchText] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Debounce para la barra de búsqueda general
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ----- ESTADOS PARA MODAL CREAR PRODUCTO -----
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createCost, setCreateCost] = useState("0");
  const [createPrice, setCreatePrice] = useState("0");
  const [createStock, setCreateStock] = useState("0");
  const [createIsComposite, setCreateIsComposite] = useState(false);

  // Hijos de un producto composto (nuevo)
  const [createChildren, setCreateChildren] = useState<CompositionChild[]>([]);
  // Autocompletado para agregar hijos
  const [childSearchText, setChildSearchText] = useState("");
  const [childSearchResults, setChildSearchResults] = useState<Product[]>([]);
  const [childQuantity, setChildQuantity] = useState("");
  const [showChildSuggestions, setShowChildSuggestions] = useState(false);

  const childSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ----- ESTADOS PARA MODAL EDITAR PRODUCTO -----
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCost, setEditCost] = useState("0");
  const [editPrice, setEditPrice] = useState("0");
  const [editStock, setEditStock] = useState("0");
  const [editBarcode, setEditBarcode] = useState("");
  const [editIsComposite, setEditIsComposite] = useState(false);

  // ====== Modal para VER BARRA DE BARRAS ======
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);

  // ====== REFERENCIA PARA EL <svg> DONDE DIBUJAMOS EL BARCODE ======
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  const [printQuantity, setPrintQuantity] = useState(1);
  const [printSize, setPrintSize] = useState("small");
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  // Hijos en modo edición
  const [editChildren, setEditChildren] = useState<CompositionChild[]>([]);
  // Autocompletado para hijos (modo edición)
  const [editChildSearchText, setEditChildSearchText] = useState("");
  const [editChildSearchResults, setEditChildSearchResults] = useState<
    Product[]
  >([]);
  const [editChildQuantity, setEditChildQuantity] = useState("");
  const [showEditChildSuggestions, setShowEditChildSuggestions] =
    useState(false);

  const editChildSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. Verificar user logueado ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // Obtener /api/auth/me
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

  // --- 2. Debounce de la barra de búsqueda general (searchText) ---
  useEffect(() => {
    if (!currentUser) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchProducts(searchText);
    }, 600);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, currentUser]);

  // --- 3. Función para obtener productos (lista) ---
  const fetchProducts = async (text: string) => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      let url = "http://localhost:4000/api/products";
      if (text) {
        url += `?search=${encodeURIComponent(text)}`;
      }
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al obtener productos");
      }
      setProducts(data);
    } catch (error) {
  if (error instanceof Error) {
    setError(error.message);
  } else {
    setError("Ocurrió un error desconocido");
  }
}
 finally {
      setLoading(false);
    }
  };

  // =========================================================
  // =============== CREATE PRODUCT (MODAL) ==================
  // =========================================================

  // Lógica para crear un producto (normal o compuesto)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Armamos el body
      // Si es compuesto, agregamos children
      const body: ProductBody = {
        name: createName,
        description: createDescription,
        cost: parseFloat(createCost),
        price: parseFloat(createPrice),
        stock: parseInt(createStock),
        barcode: undefined,
        is_composite: createIsComposite,
      };

      if (createIsComposite) {
        // Mapeamos createChildren para enviar child_product_id y quantity
        body.children = createChildren.map((child) => ({
          child_product_id: child.child_product_id,
          quantity: child.quantity,
        }));
      }

      const res = await fetch("http://localhost:4000/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear producto");
      }

      // Cerrar modal, limpiar estados
      setShowCreateModal(false);
      setCreateName("");
      setCreateDescription("");
      setCreateCost("0");
      setCreatePrice("0");
      setCreateStock("0");
      setCreateIsComposite(false);
      setCreateChildren([]);

      // Refrescar lista
      fetchProducts(searchText);
    } catch (error) {
  if (error instanceof Error) {
    setError(error.message);
  } else {
    setError("Ocurrió un error desconocido");
  }
}

  };

  // Autocompletado para "childSearchText" en crear
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!childSearchText) {
      setChildSearchResults([]);
      setShowChildSuggestions(false);
      return;
    }

    if (childSearchTimeoutRef.current) {
      clearTimeout(childSearchTimeoutRef.current);
    }

    childSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://localhost:4000/api/products?search=${encodeURIComponent(
            childSearchText
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (res.ok) {
          setChildSearchResults(data);
          setShowChildSuggestions(true);
        }
      } catch (err) {
        console.error(err);
      }
    }, 500);

    return () => {
      if (childSearchTimeoutRef.current) {
        clearTimeout(childSearchTimeoutRef.current);
      }
    };
  }, [childSearchText]);

  // Seleccionar un producto hijo
  const handleSelectChildProduct = (prod: Product) => {
    setChildSearchText(prod.name);
    setShowChildSuggestions(false);
  };

  // Agregar un hijo a createChildren
  const handleAddChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childSearchText) {
      alert("Falta seleccionar un producto hijo (autocompletado).");
      return;
    }
    if (!childQuantity) {
      alert("Falta la cantidad.");
      return;
    }

    // Debemos buscar el product en childSearchResults (o un fetch extra)
    const found = childSearchResults.find((p) => p.name === childSearchText);
    if (!found) {
      alert("Producto hijo no válido. Usa la lista sugerida.");
      return;
    }

    const quantityNum = parseInt(childQuantity);

    const costoHijo = found.cost * quantityNum;

    if (quantityNum <= 0) {
      alert("Cantidad inválida");
      return;
    }

    // Agregamos al array
    const newChild: CompositionChild = {
      child_product_id: found.id,
      child_name: found.name,
      quantity: quantityNum,
      child_cost: found.cost,
    };
    setCreateChildren([...createChildren, newChild]);

    // 2. Sumar al cost del padre
    //    createCost es un string, lo convertimos
    let padreCost = parseFloat(createCost);
    padreCost += costoHijo; // sumamos
    setCreateCost(padreCost.toString()); // actualizamos

    // Limpiar campos
    setChildSearchText("");
    setChildSearchResults([]);
    setChildQuantity("");
  };

  // Quitar hijo del array
  const handleRemoveCreateChild = (index: number) => {
    const updated = [...createChildren];
    const child = updated[index];
    // child.child_cost * child.quantity
    let padreCost = parseFloat(createCost);
    padreCost -= child.child_cost * child.quantity;
    setCreateCost(padreCost.toString());

    updated.splice(index, 1);
    setCreateChildren(updated);
  };

  // =========================================================
  // =============== EDIT PRODUCT (MODAL) ====================
  // =========================================================

  // Al abrir modal de edición, necesitamos cargar sus children
  // Recomendable: fetch /api/products/:id para obtener la composición
  // pero si ya la devuelves en getAll, genial (aquí asumo un fetch extra).

  const openEditModal = async (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditDescription(product.description || "");
    setEditCost(product.cost.toString());
    setEditPrice(product.price.toString());
    setEditStock(product.stock.toString());
    setEditBarcode(product.barcode || "");
    setEditIsComposite(product.is_composite);

    // Limpiar la parte de children
    setEditChildren([]);
    setEditChildSearchText("");
    setEditChildSearchResults([]);
    setEditChildQuantity("");

    // Si es_composite, pedimos /api/products/:id para traer children
    if (product.is_composite) {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await fetch(
            `http://localhost:4000/api/products/${product.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await res.json();
          if (res.ok) {
            // data.children = array con (child_product_id, child_name, quantity, etc.)
            if (Array.isArray(data.children)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const mapped = data.children.map((c: any) => ({
                child_product_id: c.child_product_id,
                child_name: c.child_name || "Hijo",
                quantity: c.quantity,
              })) as CompositionChild[];
              setEditChildren(mapped);
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    }

    setShowEditModal(true);
  };

  // Actualizar un producto (PUT)
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Armamos body
      const body: ProductBody = {
        name: editName,
        description: editDescription,
        cost: parseFloat(editCost),
        price: parseFloat(editPrice),
        stock: parseInt(editStock),
        barcode: editBarcode || undefined,
        is_composite: editIsComposite,
      };

      if (editIsComposite) {
        body.children = editChildren.map((child) => ({
          child_product_id: child.child_product_id,
          quantity: child.quantity,
        }));
      }

      const res = await fetch(
        `http://localhost:4000/api/products/${editingProduct.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar producto");
      }
      setShowEditModal(false);
      setEditingProduct(null);
      fetchProducts(searchText);
    } catch (error) {
  if (error instanceof Error) {
    setError(error.message);
  } else {
    setError("Ocurrió un error desconocido");
  }
}

  };

  // Autocompletado en modo edición
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!editChildSearchText) {
      setEditChildSearchResults([]);
      setShowEditChildSuggestions(false);
      return;
    }

    if (editChildSearchTimeoutRef.current) {
      clearTimeout(editChildSearchTimeoutRef.current);
    }

    editChildSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://localhost:4000/api/products?search=${encodeURIComponent(
            editChildSearchText
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (res.ok) {
          setEditChildSearchResults(data);
          setShowEditChildSuggestions(true);
        }
      } catch (err) {
        console.error(err);
      }
    }, 500);

    return () => {
      if (editChildSearchTimeoutRef.current) {
        clearTimeout(editChildSearchTimeoutRef.current);
      }
    };
  }, [editChildSearchText]);

  const handleSelectEditChildProduct = (prod: Product) => {
    setEditChildSearchText(prod.name);
    setShowEditChildSuggestions(false);
  };

  const handleAddEditChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editChildSearchText) {
      alert("Falta seleccionar un producto hijo.");
      return;
    }
    if (!editChildQuantity) {
      alert("Falta la cantidad.");
      return;
    }
    const found = editChildSearchResults.find(
      (p) => p.name === editChildSearchText
    );
    if (!found) {
      alert("Producto hijo no válido (usa la lista sugerida).");
      return;
    }

    const qNum = parseInt(editChildQuantity);
    if (qNum <= 0) {
      alert("Cantidad inválida");
      return;
    }

    const newChild: CompositionChild = {
      child_product_id: found.id,
      child_name: found.name,
      quantity: qNum,
      child_cost: found.cost,
    };
    setEditChildren([...editChildren, newChild]);

    // limpiar
    setEditChildSearchText("");
    setEditChildSearchResults([]);
    setEditChildQuantity("");
  };

  const handleRemoveEditChild = (index: number) => {
    const updated = [...editChildren];
    updated.splice(index, 1);
    setEditChildren(updated);
  };

  // --- DELETE PRODUCT ---
  const handleDeleteProduct = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:4000/api/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar producto");
      }
      fetchProducts(searchText);
    } catch (error) {
  if (error instanceof Error) {
    setError(error.message);
  } else {
    setError("Ocurrió un error desconocido");
  }
}

  };

  // =============== MOSTRAR BARCODE (MODAL) =================
  // =========================================================
  const [barcodeToPrint, setBarcodeToPrint] = useState(""); // valor del "codigo"

  // Abrimos modal de ver barcode
  const handleOpenBarcodeModal = (product: Product) => {
    if (!product.barcode) {
      alert("Este producto no tiene código de barras");
      return;
    }
    setBarcodeProduct(product);
    setBarcodeToPrint(product.barcode);
    setShowBarcodeModal(true);
    console.log("handleOpenBarcodeModal con product:", product.barcode);
  };

  // Generar el barcode en el <svg> usando JsBarcode
  useEffect(() => {
    if (showBarcodeModal && barcodeToPrint && barcodeSvgRef.current) {
      // Limpia el contenido del <svg>
      barcodeSvgRef.current.innerHTML = "";
      try {
        JsBarcode(barcodeSvgRef.current, barcodeToPrint, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 50,
          displayValue: true,
        });
      } catch (err) {
        console.error("Error render barcode:", err);
      }
    }
  }, [showBarcodeModal, barcodeToPrint]);

  const handleGenerateAndPrint = () => {
    if (!barcodeProduct?.barcode) {
      alert("No hay barcode en el producto");
      return;
    }
    if (!printAreaRef.current) return;

    // 1) Limpiar el contenido anterior
    printAreaRef.current.innerHTML = "";

    const code = barcodeProduct.barcode;

    console.log("El codigo que esta ingresando es:", code);

    // Ajustar valores de ancho/alto según 'printSize'
    let widthVal = 2;
    let heightVal = 50;
    if (printSize === "small") {
      widthVal = 1.5;
      heightVal = 40;
    } else if (printSize === "large") {
      widthVal = 3;
      heightVal = 70;
    }
    // (si 'medium' deja los defaults de 2 y 50)

    for (let i = 0; i < printQuantity; i++) {
      // Creamos un contenedor para cada etiqueta
      const div = document.createElement("div");
      div.style.display = "inline-block";
      div.style.margin = "8px";

      // 2) Crear un elemento <svg> como "nodo SVG" real
      const svgElem = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );

      // Lo agregamos al contenedor ANTES de llamar a JsBarcode
      div.appendChild(svgElem);

      // 3) Generar el barcode
      try {
        JsBarcode(svgElem, code, {
          format: "CODE128",
          lineColor: "#000",
          width: widthVal,
          height: heightVal,
          displayValue: true,
        });
      } catch (err) {
        console.error("Error generando barcode:", err);
      }

      // (Opcional) Mostrar nombre del producto
      const label = document.createElement("div");
      label.style.fontSize = "12px";
      label.innerText = barcodeProduct.name || "";
      div.appendChild(label);

      // Insertar en printArea
      printAreaRef.current.appendChild(div);
    }

    // 4) Imprimir
    document.body.classList.add("barcode-mode");
    window.print();
    document.body.classList.remove("barcode-mode");

    // Luego (tras un pequeño delay) limpias
    setTimeout(() => {
      if (printAreaRef.current) {
        printAreaRef.current.innerHTML = "";
      }
    }, 500);
  };  

  // Filtro de bajo stock
  const filteredProducts = products.filter((p) => {
    if (showLowStockOnly) {
      return p.stock < 5;
    }
    return true;
  });

  const isAdmin = currentUser?.role === "admin";

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
        <h2 className="text-xl font-bold text-white">Gestión de Productos</h2>
        <div className="flex gap-1">
          <Link
            href="/dashboard"
            className="flex items-center rounded bg-red-400 py-2 font-semibold text-white hover:bg-red-500"
          >
            <ArrowBackIcon className="mr-1" />
            Volver
          </Link>

          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center rounded bg-blue-600 py-2 font-semibold text-white hover:bg-green-600"
            >
              <AddBoxIcon className="mr-1" />
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

        {/* Barra de búsqueda */}
        <div className="mb-4">
          <label className="block font-semibold text-gray-700">
            Buscar producto:
          </label>
          <input
            type="text"
            className="mt-1 w-full rounded border border-gray-300 p-2"
            placeholder="Escribe nombre del producto..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {/* Checkbox: ver solo bajo stock */}
        <div className="mb-4 flex items-center">
          <input
            id="lowStock"
            type="checkbox"
            className="mr-2"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
          />
          <label htmlFor="lowStock" className="font-semibold text-gray-700">
            Mostrar solo productos con bajo stock
          </label>
        </div>

        {loading ? (
          <p>Cargando productos...</p>
        ) : (
          <div className="overflow-x-auto">
            <TableContainer component={Paper} sx={{ marginTop: 2 }}>
              <Table sx={{ minWidth: 650 }} aria-label="products table">
                <TableHead>
                  <TableRow>
                    <TableCell align="center">ID</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Precio</TableCell>
                    <TableCell>Stock</TableCell>
                    <TableCell>Creado</TableCell>
                    <TableCell>Barcode</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts.map((prod) => {
                    const rowStyle =
                      prod.stock < 5
                        ? { backgroundColor: "#fee2e2" } // color similar a bg-red-100
                        : {};
                    return (
                      <TableRow key={prod.id} sx={rowStyle}>
                        <TableCell align="center">{prod.id}</TableCell>
                        <TableCell>{prod.name}</TableCell>
                        <TableCell>${prod.price}</TableCell>
                        <TableCell>{prod.stock}</TableCell>
                        <TableCell>
                          {new Date(prod.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {prod.barcode || "Generado automático"}
                        </TableCell>
                        <TableCell>
                          {/* Botones con MUI */}
                          {isAdmin && (
                            <>
                              <Button
                                variant="contained"
                                color="success"
                                onClick={() => openEditModal(prod)}
                                sx={{ mr: 1 }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="contained"
                                color="error"
                                onClick={() => handleDeleteProduct(prod.id)}
                                sx={{ mr: 1 }}
                              >
                                Eliminar
                              </Button>
                              {prod.barcode && (
                                <Button
                                  variant="contained"
                                  onClick={() => handleOpenBarcodeModal(prod)}
                                >
                                  Ver Código
                                </Button>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </div>

      {/* =================== MODAL CREAR PRODUCTO =================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 ">
          <div className="w-full max-w-md max-h-[90vh] overflow-auto rounded bg-white p-6 shadow">
            <h3 className="mb-4 text-xl font-bold">Crear Producto</h3>
            <form onSubmit={handleCreateProduct}>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  className="w-full rounded border border-gray-300 p-2"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">
                  Descripción
                </label>
                <textarea
                  className="w-full rounded border border-gray-300 p-2"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">
                    Costo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded border border-gray-300 p-2"
                    value={createCost}
                    onChange={(e) => setCreateCost(e.target.value)}
                    readOnly={createIsComposite}
                  />
                </div>
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">
                    Precio
                  </label>
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
                  <label className="block font-semibold text-gray-700">
                    Stock
                  </label>
                  <input
                    type="number"
                    className="w-full rounded border border-gray-300 p-2"
                    value={createStock}
                    onChange={(e) => setCreateStock(e.target.value)}
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
                <label className="font-semibold text-gray-700">
                  ¿Es producto compuesto (ancheta)?
                </label>
              </div>

              {/* Si es compuesto, permitir agregar hijos */}
              {createIsComposite && (
                <div className="mb-4 border-t pt-2">
                  <h4 className="mb-2 font-semibold text-gray-700">
                    Productos hijos
                  </h4>
                  {/* Mostrar tabla con createChildren */}
                  {createChildren.length > 0 && (
                    <div className="mb-2 overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="border p-2">HijoID</th>
                            <th className="border p-2">Nombre</th>
                            <th className="border p-2">Cantidad</th>
                            <th className="border p-2">Quitar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {createChildren.map((child, idx) => (
                            <tr key={idx}>
                              <td className="border p-2 text-center">
                                {child.child_product_id}
                              </td>
                              <td className="border p-2">{child.child_name}</td>
                              <td className="border p-2 text-center">
                                {child.quantity}
                              </td>
                              <td className="border p-2 text-center">
                                <button
                                  onClick={() => handleRemoveCreateChild(idx)}
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

                  {/* Form para buscar e insertar hijo */}
                  <div>
                    <label className="block font-semibold text-gray-700">
                      Buscar hijo
                    </label>
                    <input
                      type="text"
                      className="mb-2 w-full rounded border border-gray-300 p-2"
                      placeholder="Escribe nombre..."
                      value={childSearchText}
                      onChange={(e) => {
                        setChildSearchText(e.target.value);
                      }}
                      onFocus={() => {
                        if (childSearchResults.length > 0) {
                          setShowChildSuggestions(true);
                        }
                      }}
                    />

                    {/* Sugerencias */}
                    {showChildSuggestions && childSearchResults.length > 0 && (
                      <div className="mb-2 max-h-40 overflow-y-auto rounded border border-gray-300 bg-white">
                        {childSearchResults.map((prod) => (
                          <div
                            key={prod.id}
                            className="cursor-pointer p-2 hover:bg-gray-100"
                            onClick={() => handleSelectChildProduct(prod)}
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
                      className="mb-3 w-full rounded border border-gray-300 p-2"
                      value={childQuantity}
                      onChange={(e) => setChildQuantity(e.target.value)}
                    />

                    <button
                      type="button"
                      className="mb-4 w-full rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                      onClick={handleAddChild}
                    >
                      Agregar Hijo
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateChildren([]);
                  }}
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

      {/* =================== MODAL EDITAR PRODUCTO =================== */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 ">
          <div className="w-full max-w-md max-h-[90vh] overflow-auto rounded bg-white p-6 shadow">
            <h3 className="mb-4 text-xl font-bold">Editar Producto</h3>
            <form onSubmit={handleEditProduct}>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  className="w-full rounded border border-gray-300 p-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">
                  Descripción
                </label>
                <textarea
                  className="w-full rounded border border-gray-300 p-2"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">
                    Costo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded border border-gray-300 p-2"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                  />
                </div>
                <div className="mb-3 w-1/2">
                  <label className="block font-semibold text-gray-700">
                    Precio
                  </label>
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
                  <label className="block font-semibold text-gray-700">
                    Stock
                  </label>
                  <input
                    type="number"
                    className="w-full rounded border border-gray-300 p-2"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
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
                <label className="font-semibold text-gray-700">
                  ¿Es producto compuesto (ancheta)?
                </label>
              </div>

              {/* Si es compuesto, lista los hijos */}
              {editIsComposite && (
                <div className="mb-4 border-t pt-2">
                  <h4 className="mb-2 font-semibold text-gray-700">
                    Productos hijos
                  </h4>
                  {editChildren.length > 0 && (
                    <div className="mb-2 overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="border p-2">HijoID</th>
                            <th className="border p-2">Nombre</th>
                            <th className="border p-2">Cantidad</th>
                            <th className="border p-2">Quitar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editChildren.map((child, idx) => (
                            <tr key={idx}>
                              <td className="border p-2 text-center">
                                {child.child_product_id}
                              </td>
                              <td className="border p-2">{child.child_name}</td>
                              <td className="border p-2 text-center">
                                {child.quantity}
                              </td>
                              <td className="border p-2 text-center">
                                <button
                                  onClick={() => handleRemoveEditChild(idx)}
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

                  {/* Form para agregar hijo */}
                  <div>
                    <label className="block font-semibold text-gray-700">
                      Buscar hijo
                    </label>
                    <input
                      type="text"
                      className="mb-2 w-full rounded border border-gray-300 p-2"
                      placeholder="Escribe nombre..."
                      value={editChildSearchText}
                      onChange={(e) => setEditChildSearchText(e.target.value)}
                      onFocus={() => {
                        if (editChildSearchResults.length > 0) {
                          setShowEditChildSuggestions(true);
                        }
                      }}
                    />

                    {/* Sugerencias */}
                    {showEditChildSuggestions &&
                      editChildSearchResults.length > 0 && (
                        <div className="mb-2 max-h-40 overflow-y-auto rounded border border-gray-300 bg-white">
                          {editChildSearchResults.map((prod) => (
                            <div
                              key={prod.id}
                              className="cursor-pointer p-2 hover:bg-gray-100"
                              onClick={() => handleSelectEditChildProduct(prod)}
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
                      className="mb-3 w-full rounded border border-gray-300 p-2"
                      value={editChildQuantity}
                      onChange={(e) => setEditChildQuantity(e.target.value)}
                    />

                    <button
                      type="button"
                      className="mb-4 w-full rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                      onClick={handleAddEditChild}
                    >
                      Agregar Hijo
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProduct(null);
                    setEditChildren([]);
                  }}
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
      {/* ====== MODAL VER CÓDIGO DE BARRAS ====== */}
      {showBarcodeModal && barcodeProduct && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 p-4 overflow-y-auto">
          <div className="mt-20 w-full max-w-md rounded bg-white p-6 shadow">
            <h3 className="mb-4 text-xl font-bold">
              Imprimir Código: {barcodeProduct.name}
            </h3>

            {/* Sección para elegir cuántas copias y tamaño */}
            <div className="mb-4">
              <label>Cantidad:</label>
              <input
                type="number"
                className="ml-2 w-20 border p-1"
                value={printQuantity}
                onChange={(e) => setPrintQuantity(parseInt(e.target.value))}
              />
            </div>
            <div className="mb-4">
              <label>Tamaño:</label>
              <select
                className="ml-2 border p-1"
                value={printSize}
                onChange={(e) => setPrintSize(e.target.value)}
              >
                <option value="small">Pequeño</option>
                <option value="medium">Mediano</option>
                <option value="large">Grande</option>
              </select>
            </div>

            {/* SVG donde dibujamos el barcode con JsBarcode */}
            <div className="mb-4 flex justify-center">
              <svg ref={barcodeSvgRef} />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleGenerateAndPrint}
                className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Generar e Imprimir
              </button>
              <button
                onClick={() => {
                  setShowBarcodeModal(false);
                  setBarcodeProduct(null);
                }}
                className="rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      <div id="printArea" className="absolute left-0 top-0 hiddenForScreen">
        <div ref={printAreaRef} />
      </div>
    </div>
  );
}
