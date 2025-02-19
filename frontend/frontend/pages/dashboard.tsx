import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

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
  // Lista de usuarios (solo lo usará admin)
  const [users, setUsers] = useState<User[]>([]);
  // Manejo de errores
  const [error, setError] = useState('');

  // Para editar usuario (solo admin)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');

  // Para cambiar contraseña (admin o si es suya)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // 1. Al montar el componente, revisa si hay token
  //    y llama al endpoint /api/auth/me para saber rol, id, etc.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    // Llamamos a /api/auth/me
    fetch('http://localhost:4000/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('No se pudo obtener información del usuario');
        }
        return res.json();
      })
      .then((data: CurrentUser) => {
        // Guardamos la info en currentUser
        setCurrentUser(data);
      })
      .catch((err) => {
        console.error(err);
        router.push('/login');
      });
  }, [router]);

  // 2. Si resultó ser un admin, cargamos la lista de usuarios
  //    (podrías hacerlo en el mismo fetch, pero lo separamos para mayor claridad)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !currentUser) return;

    if (currentUser.role === 'admin') {
      fetchUsers(token);
    }
  }, [currentUser]);

  // Función para cargar usuarios (solo si admin)
  const fetchUsers = async (token: string) => {
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener usuarios');
      }
      setUsers(data);
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Manejo de logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  // --- FUNCIONES PARA EDITAR USUARIO (solo admin) ---
  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setShowEditModal(true);
    setError('');
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !currentUser) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:4000/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al editar usuario');
      }
      setShowEditModal(false);
      // Refresca lista de usuarios
      if (currentUser.role === 'admin') {
        fetchUsers(token);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  // --- FUNCIONES PARA CAMBIAR CONTRASEÑA ---
  const handleChangePasswordClick = (userId: number) => {
    setPasswordUserId(userId);
    setNewPassword('');
    setShowPasswordModal(true);
    setError('');
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUserId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:4000/api/users/${passwordUserId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al cambiar contraseña');
      }
      setShowPasswordModal(false);
    } catch (error: any) {
      setError(error.message);
    }
  };

  // --- LÓGICA DE UI PARA BOTONES ---

  // Solo admin puede EDITAR. Vendedor NO.
  const canEdit = (rowUserId: number) => {
    if (!currentUser) return false;
    return currentUser.role === 'admin';
  };

  // Cambiar contraseña:
  // - admin puede cambiar de cualquiera
  // - vendedor solo la suya
  const canChangePassword = (rowUserId: number) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') {
      return true;
    } else if (currentUser.role === 'vendedor') {
      return currentUser.id === rowUserId;
    }
    return false;
  };

  // Si aún no cargamos info del usuario, podríamos mostrar un "Cargando..."
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
        <h2 className="text-xl font-bold">Dashboard - Color Explosion</h2>
        <button
          onClick={handleLogout}
          className="rounded bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="mx-auto w-full max-w-4xl bg-white p-4 shadow">
        {error && (
          <div className="mb-4 rounded bg-red-100 p-2 text-red-700">
            {error}
          </div>
        )}

        {/* Si es admin, mostramos la tabla de usuarios */}
        {currentUser.role === 'admin' && (
          <>
            <h3 className="mb-2 text-lg font-semibold">Lista de Usuarios</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2 text-center">ID</th>
                    <th className="border p-2">Nombre</th>
                    <th className="border p-2">Email</th>
                    <th className="border p-2 text-center">Rol</th>
                    <th className="border p-2">Creado</th>
                    <th className="border p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="border p-2 text-center">{u.id}</td>
                      <td className="border p-2">{u.name}</td>
                      <td className="border p-2">{u.email}</td>
                      <td className="border p-2 text-center">{u.role}</td>
                      <td className="border p-2">
                        {new Date(u.created_at).toLocaleString()}
                      </td>
                      <td className="border p-2">
                        {canEdit(u.id) && (
                          <button
                            onClick={() => handleEditClick(u)}
                            className="mr-2 rounded bg-green-500 px-2 py-1 text-white hover:bg-green-600"
                          >
                            Editar
                          </button>
                        )}
                        {canChangePassword(u.id) && (
                          <button
                            onClick={() => handleChangePasswordClick(u.id)}
                            className="rounded bg-purple-500 px-2 py-1 text-white hover:bg-purple-600"
                          >
                            Cambiar Contraseña
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Si es vendedor, podríamos mostrar un mensaje: */}
        {currentUser.role === 'vendedor' && (
          <div>
            <h3 className="text-lg font-semibold">Bienvenido, {currentUser.name}</h3>
            <p className="mt-2 text-gray-600">
              (Eres vendedor, por lo que no tienes acceso a la lista de usuarios.)
            </p>
            <p className="mt-2 text-gray-600">
              Sin embargo, puedes cambiar tu propia contraseña si así lo deseas.
            </p>
            <button
              onClick={() => handleChangePasswordClick(currentUser.id)}
              className="mt-4 rounded bg-purple-500 px-4 py-2 font-semibold text-white hover:bg-purple-600"
            >
              Cambiar mi contraseña
            </button>
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
                <label className="block font-semibold text-gray-700">Nombre</label>
                <input
                  type="text"
                  className="w-full rounded border border-gray-300 p-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="block font-semibold text-gray-700">Email</label>
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
                <label className="block font-semibold text-gray-700">Nueva Contraseña</label>
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
