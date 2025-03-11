import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

interface Sale {
  id: number;
  sale_date: string;
  payment_method: string;
  total: number;
}

interface SaleItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export default function PrintTicketPage() {
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    const { saleId } = router.query;
    console.log(saleId);
    if (saleId) {
      fetchSaleDetail(parseInt(saleId as string));
    }
  }, [router.query]);

  const fetchSaleDetail = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`https://punto-venta-backend.onrender.com/api/sales/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      setSale(data.sale);
      setItems(data.items);
    }
  };

  // Autoimprimir al cargar
  useEffect(() => {
    if (sale) {
      // Al estar lista la venta
      // 1) Set onafterprint
      const handleAfterPrint = () => {
        window.close(); // cierra la pestaña
      };
      window.onafterprint = handleAfterPrint;

      // 2) Llamamos print
      window.print();

      // 3) Limpia onafterprint al desmontar
      return () => {
        window.onafterprint = null;
      };
    }
  }, [sale]);

  if (!sale) {
    return <div>Cargando...</div>;
  }

  return (
    <>
      <Head>
        {/* Inserta un style global */}
        <style jsx global>{`
          @media print {
            /* 
               Fuerza a mostrar TODOS los elementos,
               ignorando la regla global que oculta body * 
            */
            body * {
              visibility: visible !important;
              display: block !important;
            }
            /* Ajustamos márgenes, etc. */
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              color: #000 !important;
            }
          }
        `}</style>
      </Head>

      <div
        style={{
          width: "80mm",
          margin: "0 auto",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            margin: 0,
            padding: 0,
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          Color Explosion
        </h1>
        <p style={{ textAlign: "center", margin: "4px 0" }}>
          <strong>NIT:</strong> 43472470-1
        </p>
        <p style={{ textAlign: "center", margin: "4px 0" }}>
          <strong>Dirección:</strong> Calle 12 #10-19
        </p>
        <hr />
        <p style={{ textAlign: "center", margin: "4px 0" }}>
          <strong>FACTURA DE VENTA</strong>
        </p>
        <p style={{ textAlign: "center", margin: "4px 0" }}>
          Fecha: {new Date(sale.sale_date).toLocaleString()}
        </p>
        <p style={{ textAlign: "center", margin: "4px 0" }}>
          Metodo de Pago: {sale.payment_method}
        </p>
        <hr />

        <table style={{ width: "100%", marginBottom: "6px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>Cant</th>
              <th style={{ textAlign: "left" }}>Producto</th>
              <th
                style={{
                  textAlign: "right",
                  fontWeight: "bold",
                }}
              >
                Unitario
              </th>
              <th style={{ textAlign: "right" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: SaleItem) => {
              const subtotal = item.quantity * item.unit_price;
              return (
                <tr key={item.id}>
                  <td style={{ textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ textAlign: "left" }}>{item.product_name}</td>
                  <td style={{ textAlign: "right" }}>${item.unit_price}</td>
                  <td style={{ textAlign: "right" }}>${subtotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <hr />
        <div
          style={{
            textAlign: "right",
            fontWeight: "bold",
            marginBottom: "4px",
          }}
        >
          TOTAL: ${sale.total}
        </div>
        <p style={{ textAlign: "center", margin: 0 }}>
          ¡Gracias por su compra!
        </p>
        <p style={{ textAlign: "center", margin: 0 }}>Vuelva pronto</p>
      </div>
    </>
  );
}
