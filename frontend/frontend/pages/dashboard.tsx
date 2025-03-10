import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import GroupIcon from "@mui/icons-material/Group";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutIcon from "@mui/icons-material/Logout";
import Link from "next/link";

// Representa el usuario retornado por /api/auth/me
interface CurrentUser {
  id: number;
  role: string;
  name: string;
  email: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();

  // Guarda info del usuario logueado (obtenida de /api/auth/me)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Manejo de errores
  const [error, setError] = useState("");

  // Lista de usuarios (solo se cargará al dar clic en el botón)
  const [users, setUsers] = useState<User[]>([]);

  // **Nuevo**: Para controlar si mostramos la tabla o no
  const [showUserList, setShowUserList] = useState(false);

  // Para editar usuario (solo admin)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");

  // Para cambiar contraseña (admin o si es suya)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // 1. Al montar el componente, revisa si hay token
  //    y llama al endpoint /api/auth/me para saber rol, id, etc.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // Llamamos a /api/auth/me
    fetch("http://localhost:4000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("No se pudo obtener información del usuario");
        }
        return res.json();
      })
      .then((data: CurrentUser) => {
        // Guardamos la info en currentUser
        setCurrentUser(data);
      })
      .catch((err) => {
        console.error(err);
        router.push("/login");
      });
  }, [router]);

  // 2. Función para cargar usuarios (llamada solo al hacer clic en botón)
  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    if (!token || !currentUser) return;

    setError("");
    try {
      const res = await fetch("http://localhost:4000/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al obtener usuarios");
      }
      setUsers(data);
      // **Activamos** la vista de la tabla
      setShowUserList(true);
    } catch (error) {
  if (error instanceof Error) {
    setError(error.message);
  } else {
    setError("Ocurrió un error desconocido");
  }
}

  };

  // Manejo de logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  // --- FUNCIONES PARA EDITAR USUARIO (solo admin) ---
  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setShowEditModal(true);
    setError("");
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !currentUser) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(
        `http://localhost:4000/api/users/${editingUser.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editName,
            email: editEmail,
            role: editRole,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al editar usuario");
      }
      setShowEditModal(false);
      // Refresca lista de usuarios
      fetchUsers();
    } catch (error) {
  if (error instanceof Error) {
    setError(error.message);
  } else {
    setError("Ocurrió un error desconocido");
  }
}

  };

  // --- FUNCIONES PARA CAMBIAR CONTRASEÑA ---
  const handleChangePasswordClick = (userId: number) => {
    setPasswordUserId(userId);
    setNewPassword("");
    setShowPasswordModal(true);
    setError("");
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUserId) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(
        `http://localhost:4000/api/users/${passwordUserId}/password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newPassword,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al cambiar contraseña");
      }
      setShowPasswordModal(false);
    } catch (error) {
  if (error instanceof Error) {
    setError(error.message);
  } else {
    setError("Ocurrió un error desconocido");
  }
}

  };

  // --- LÓGICA DE UI PARA BOTONES ---
  const canEdit = () => {
    if (!currentUser) return false;
    return currentUser.role === "admin";
  };

  const canChangePassword = (rowUserId: number) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") {
      return true;
    } else if (currentUser.role === "vendedor") {
      return currentUser.id === rowUserId;
    }
    return false;
  };

  // 3. Si aún no cargamos info del usuario, podríamos mostrar un "Cargando..."
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-blue-400 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between bg-blue-950 p-4 shadow">
        <h2 className="text-xl font-bold text-white">
          Dashboard - Color Explosion
        </h2>
        <button
          onClick={handleLogout}
          className="rounded bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600"
        >
          <LogoutIcon className="mr-1" />
          Cerrar sesión
        </button>
      </div>

      <div className="mx-auto w-full max-w-4xl bg-white p-4 shadow">
        {error && (
          <div className="mb-4 rounded bg-red-100 p-2 text-red-700">
            {error}
          </div>
        )}

        {currentUser.role === "admin" && (
          <>
            <h3 className="mb-2 text-lg font-semibold">
              Bienvenido, Admin {currentUser.name}
            </h3>
            <p className="mb-4 text-gray-700">
              A continuación encuentras las acciones que puedes realizar
            </p>
            <div className="flex flex-col items-center">
              {/* BOTÓN "VER USUARIOS" */}
              {!showUserList && (
                <button
                  onClick={fetchUsers}
                  className="mb-4 flex items-center rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  <GroupIcon className="mr-1" />
                  Ver usuarios
                </button>
              )}

              <Link
                href="/products"
                className="flex items-center rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
              >
                <Inventory2Icon className="mr-1" />
                Administrar productos
              </Link>

              <Link
                href="/sales"
                className="flex items-center rounded bg-yellow-600 px-4 py-2 my-4 font-semibold text-white hover:bg-yellow-700"
              >
                <PointOfSaleIcon className="mr-1" />
                Ir a Ventas
              </Link>

              <Link
                href="/reports"
                className="flex items-center rounded bg-pink-600 px-4 py-2 font-semibold text-white hover:bg-pink-700"
              >
                <AssessmentIcon className="mr-1" />
                Ir a Reportes
              </Link>
            </div>

            {/* Tabla de usuarios SI showUserList es true */}
            {showUserList && (
              <>
                <h3 className="mb-2 text-lg font-semibold">
                  Lista de Usuarios
                </h3>
                <div className="overflow-x-auto">
                  <TableContainer component={Paper} sx={{ marginTop: 2 }}>
                    <Table sx={{ minWidth: 650 }} aria-label="products table">
                      <TableHead>
                        <TableRow>
                          <TableCell className="border p-2 text-center">
                            ID
                          </TableCell>
                          <TableCell className="border p-2">Nombre</TableCell>
                          <TableCell className="border p-2">Email</TableCell>
                          <TableCell className="border p-2 text-center">
                            Rol
                          </TableCell>
                          <TableCell className="border p-2">Creado</TableCell>
                          <TableCell className="border p-2">Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="border p-2 text-center">
                              {u.id}
                            </TableCell>
                            <TableCell className="border p-2">
                              {u.name}
                            </TableCell>
                            <TableCell className="border p-2">
                              {u.email}
                            </TableCell>
                            <TableCell className="border p-2 text-center">
                              {u.role}
                            </TableCell>
                            <TableCell className="border p-2">
                              {new Date(u.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="border p-2">
                              {canEdit() && (
                                <button
                                  onClick={() => handleEditClick(u)}
                                  className="mr-2 rounded bg-green-500 px-2 py-1 text-white hover:bg-green-600"
                                >
                                  Editar
                                </button>
                              )}
                              {canChangePassword(u.id) && (
                                <button
                                  onClick={() =>
                                    handleChangePasswordClick(u.id)
                                  }
                                  className="rounded bg-purple-500 px-2 py-1 text-white hover:bg-purple-600"
                                >
                                  Cambiar Contraseña
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              </>
            )}
          </>
        )}

        {currentUser.role === "vendedor" && (
          <div>
            <h3 className="text-lg font-semibold">
              Bienvenido, Vendedor {currentUser.name}
            </h3>

            <p className="mt-2 text-gray-600">
              A continuación encuentras las acciones que puedes realizar
            </p>
            <div className="flex flex-col items-center px-3 py-3 my-3">
              <button
                onClick={() => handleChangePasswordClick(currentUser.id)}
                className="mt-4 rounded bg-purple-500 px-4 py-2 my-4 font-semibold text-white hover:bg-purple-600"
              >
                Cambiar mi contraseña
              </button>
              <Link
                href="/products"
                className="rounded bg-green-600 px-4 py-2 my-4 font-semibold text-white hover:bg-green-700"
              >
                Ver Productos
              </Link>
              <Link
                href="/sales"
                className="rounded bg-yellow-600 px-4 py-2 my-4 font-semibold text-white hover:bg-yellow-700"
              >
                Ir a Ventas
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* MODAL Editar Usuario */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <div className="w-full max-w-md rounded bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">Editar Usuario</h2>
            <form onSubmit={handleEditUserSubmit}>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  className="w-full rounded border border-gray-300 p-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full rounded border border-gray-300 p-2"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">Rol</label>
                <select
                  className="w-full rounded border border-gray-300 p-2"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  <option value="admin">admin</option>
                  <option value="vendedor">vendedor</option>
                </select>
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

      {/* MODAL Cambiar Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <div className="w-full max-w-md rounded bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">Cambiar Contraseña</h2>
            <form onSubmit={handleChangePasswordSubmit}>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  className="w-full rounded border border-gray-300 p-2"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Escribe la nueva contraseña"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="mr-2 rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
