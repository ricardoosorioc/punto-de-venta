import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface CurrentUser {
  id: number;
  role: string;
  name: string;
  email: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState('');
  
  // Para “ventas”
  const [salesRange, setSalesRange] = useState<'daily'|'weekly'|'monthly'>('daily');
  const [salesData, setSalesData] = useState<any[]>([]);
  
  // Para “utilidades”
  const [profitRange, setProfitRange] = useState<'daily'|'weekly'|'monthly'>('daily');
  const [profitData, setProfitData] = useState<any[]>([]);
  
  // Para “top products”
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topLimit, setTopLimit] = useState(5); // default
  
  // 1. Verificar user
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch('http://localhost:4000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('No se pudo obtener usuario');
      return res.json();
    })
    .then((data: CurrentUser) => {
      setCurrentUser(data);
    })
    .catch(err => {
      console.error(err);
      router.push('/login');
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
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:4000/api/reports/sales?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener reporte de ventas');
      setSalesData(data); // array con { date_label, total_sales }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchProfitReport = async (range: string) => {
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:4000/api/reports/profit?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener reporte de utilidades');
      setProfitData(data); // array con { date_label, income_total, cost_total, profit }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchTopProducts = async (limit: number) => {
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:4000/api/reports/top-products?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener top products');
      setTopProducts(data); // array con { id, name, total_sold }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!currentUser) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-100">Cargando...</div>;
  }
  
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 p-4">
      <div className="mb-4 flex items-center justify-between bg-white p-4 shadow">
        <h2 className="text-xl font-bold">Reportes</h2>
        <a
          href="/dashboard"
          className="rounded bg-gray-400 px-4 py-2 font-semibold text-white hover:bg-gray-500"
        >
          Volver
        </a>
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
              onChange={(e) => setSalesRange(e.target.value as 'daily'|'weekly'|'monthly')}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Fecha</th>
                  <th className="border p-2">Total Ventas</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border p-2">{row.date_label}</td>
                    <td className="border p-2 text-right">
                      ${parseFloat(row.total_sales).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* =============== REPORTE DE UTILIDADES ================ */}
        <section className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">Utilidades (Ingresos - Costos)</h3>
          <div className="mb-4 flex gap-2">
            <label className="font-semibold text-gray-700">Rango:</label>
            <select
              className="rounded border border-gray-300 p-1"
              value={profitRange}
              onChange={(e) => setProfitRange(e.target.value as 'daily'|'weekly'|'monthly')}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Fecha</th>
                  <th className="border p-2">Ingresos</th>
                  <th className="border p-2">Costos</th>
                  <th className="border p-2">Utilidad</th>
                </tr>
              </thead>
              <tbody>
                {profitData.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border p-2">{row.date_label}</td>
                    <td className="border p-2 text-right">
                      ${parseFloat(row.income_total).toFixed(2)}
                    </td>
                    <td className="border p-2 text-right">
                      ${parseFloat(row.cost_total).toFixed(2)}
                    </td>
                    <td className="border p-2 text-right">
                      ${parseFloat(row.profit).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* =============== TOP PRODUCTS ================ */}
        <section className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">Productos más vendidos</h3>
          <div className="mb-4 flex gap-2 items-center">
            <label className="font-semibold text-gray-700">Cantidad a mostrar:</label>
            <input
              type="number"
              className="w-20 rounded border border-gray-300 p-1"
              value={topLimit}
              onChange={(e) => setTopLimit(parseInt(e.target.value))}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Producto</th>
                  <th className="border p-2">Total Vendido</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border p-2">{row.name}</td>
                    <td className="border p-2 text-right">{row.total_sold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
