import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";

interface CurrentUser {
  id: number;
  role: string;
  name: string;
  email: string;
}

interface SalesReport {
  date_label: string;
  total_sales: number;
}

interface ProfitReport {
  date_label: string;
  income_total: number;
  cost_total: number;
  profit: number;
}

interface TopProduct {
  name: string;
  total_sold: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState("");

  // Para “ventas”
  const [salesRange, setSalesRange] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const [salesData, setSalesData] = useState<SalesReport[]>([]);

  // Para “utilidades”
  const [profitRange, setProfitRange] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [profitData, setProfitData] = useState<ProfitReport[]>([]);

  // Para “top products”
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topLimit, setTopLimit] = useState(5); // default

  // 1. Verificar user
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch("https://punto-venta-backend.onrender.com/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo obtener usuario");
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

  // 2. Cargar reporte de ventas cuando salesRange cambia
  useEffect(() => {
    if (!currentUser) return;
    fetchSalesReport(salesRange);
  }, [currentUser, salesRange]);

  // 3. Cargar reporte de utilidades cuando profitRange cambia
  useEffect(() => {
    if (!currentUser) return;
    fetchProfitReport(profitRange);
  }, [currentUser, profitRange]);

  // 4. Cargar top products cuando topLimit cambia
  useEffect(() => {
    if (!currentUser) return;
    fetchTopProducts(topLimit);
  }, [currentUser, topLimit]);

  // Funciones para fetch
  const fetchSalesReport = async (range: string) => {
    setError("");
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(
        `https://punto-venta-backend.onrender.com/api/reports/sales?range=${range}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Error al obtener reporte de ventas");
      setSalesData(data); // array con { date_label, total_sales }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ocurrió un error desconocido");
      }
    }
  };

  const fetchProfitReport = async (range: string) => {
    setError("");
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(
        `https://punto-venta-backend.onrender.com/api/reports/profit?range=${range}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Error al obtener reporte de utilidades");
      setProfitData(data); // array con { date_label, income_total, cost_total, profit }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ocurrió un error desconocido");
      }
    }
  };

  const fetchTopProducts = async (limit: number) => {
    setError("");
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(
        `https://punto-venta-backend.onrender.com/api/reports/top-products?limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Error al obtener top products");
      setTopProducts(data); // array con { id, name, total_sold }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ocurrió un error desconocido");
      }
    }
  };

  const handleDateClick = (date: string) => {
    router.push(`/sales?from=${date}&to=${date}`);
    console.log(`/sales?from=${date}&to=${date}`);
  };

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-blue-400 p-4">
      <div className="mb-4 flex items-center justify-between bg-blue-950 p-4 shadow">
        <h2 className="text-xl font-bold text-white">Reportes</h2>
        <Link
          href="/dashboard"
          className="flex items-center rounded bg-red-400 px-2 py-2 font-semibold text-white hover:bg-red-500"
        >
          <ArrowBackIcon className="mr-1" />
          Volver
        </Link>
      </div>

      <div className="mx-auto w-full max-w-5xl bg-white p-4 shadow">
        {error && (
          <div className="mb-4 rounded bg-red-100 p-2 text-red-700">
            {error}
          </div>
        )}

        {/* =============== REPORTE DE VENTAS ================ */}
        <section className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">Ventas</h3>
          <div className="mb-4 flex gap-2">
            <label className="font-semibold text-gray-700">Rango:</label>
            <select
              className="rounded border border-gray-300 p-1"
              value={salesRange}
              onChange={(e) =>
                setSalesRange(e.target.value as "daily" | "weekly" | "monthly")
              }
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <TableContainer component={Paper} sx={{ marginTop: 2 }}>
              <Table sx={{ minWidth: 650 }} aria-label="reports table">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Total Ventas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell
                        onClick={() => handleDateClick(row.date_label)}
                        style={{ cursor: "pointer", color: "blue" }}
                      >
                        {row.date_label}
                      </TableCell>
                      <TableCell className="border p-2 text-right">
                        ${parseFloat(String(row.total_sales)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </section>

        {/* =============== REPORTE DE UTILIDADES ================ */}
        <section className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">
            Utilidades (Ingresos - Costos)
          </h3>
          <div className="mb-4 flex gap-2">
            <label className="font-semibold text-gray-700">Rango:</label>
            <select
              className="rounded border border-gray-300 p-1"
              value={profitRange}
              onChange={(e) =>
                setProfitRange(e.target.value as "daily" | "weekly" | "monthly")
              }
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <TableContainer component={Paper} sx={{ marginTop: 2 }}>
              <Table sx={{ minWidth: 650 }} aria-label="reports table">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Ingresos</TableCell>
                    <TableCell>Costos</TableCell>
                    <TableCell>Utilidad</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {profitData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="border p-2">{row.date_label}</TableCell>
                      <TableCell className="border p-2 text-right">
                        ${parseFloat(String(row.income_total)).toFixed(2)}
                      </TableCell>
                      <TableCell className="border p-2 text-right">
                        ${parseFloat(String(row.cost_total)).toFixed(2)}
                      </TableCell>
                      <TableCell className="border p-2 text-right">
                        ${parseFloat(String(row.profit)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </section>

        {/* =============== TOP PRODUCTS ================ */}
        <section className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">Productos más vendidos</h3>
          <div className="mb-4 flex gap-2 items-center">
            <label className="font-semibold text-gray-700">
              Cantidad a mostrar:
            </label>
            <input
              type="number"
              className="w-20 rounded border border-gray-300 p-1"
              value={topLimit}
              onChange={(e) => setTopLimit(parseInt(e.target.value))}
            />
          </div>
          <div className="overflow-x-auto">
            <TableContainer component={Paper} sx={{ marginTop: 2 }}>
              <Table sx={{ minWidth: 650 }} aria-label="reports table">
                <TableHead>
                  <TableRow className="bg-gray-200">
                    <TableCell>Producto</TableCell>
                    <TableCell>Total Vendido</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topProducts.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="border p-2">
                        {row.name}
                      </TableCell>
                      <TableCell className="border p-2 text-right">
                        {row.total_sold}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
