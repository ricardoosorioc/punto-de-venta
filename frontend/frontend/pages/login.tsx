// pages/login.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // limpiar error

    try {
      const response = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Si el status no es 200-299
        throw new Error(data.error || "Error al iniciar sesión");
      }

      // Si todo va bien, guardamos el token
      if (data.token) {
        localStorage.setItem("token", data.token);
        // Redirigir al dashboard
        router.push("/dashboard");
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-400 p-4">
      {/* Contenedor "card" de login */}
      <div className="w-full max-w-md rounded bg-blue-200 p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Bienvenid@ a
        </h1>
        <div className="flex items-center justify-center my-7">
          <Image
            className="dark:invert text-center "
            src="/colorexplogo.png"
            alt="Color Explosion Logo"
            width={380}
            height={38}
            priority
          />
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-100 p-2 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2 block font-semibold text-black">
              Correo electrónico
            </label>
            <input
              type="email"
              className="w-full rounded border border-gray-300 text-black p-2 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tuemail@ejemplo.com"
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block font-semibold text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded border border-gray-300 text-black p-2 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-blue-600 py-2 px-4 font-semibold text-white hover:bg-blue-700"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
