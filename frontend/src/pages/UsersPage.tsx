import { useState } from 'react';
import { use } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useResetPassword } from '../hooks/useUsers';
import { AuthContext } from '../lib/auth-context';
import styles from './UsersPage.module.css';

export default function UsersPage() {
  const { user: currentUser } = use(AuthContext);
  const { data: users, isLoading } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const resetMutation = useResetPassword();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: '', ficha: '', rol: 'TECNICO' as 'ADMIN' | 'TECNICO' });
  const [formError, setFormError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.ficha) { setFormError('Nombre y ficha son obligatorios'); return; }
    try {
      await createMutation.mutateAsync({ nombre: form.nombre, ficha: Number(form.ficha), rol: form.rol });
      setShowCreate(false);
      setForm({ nombre: '', ficha: '', rol: 'TECNICO' });
    } catch (err: any) {
      setFormError(err?.message || 'Error al crear usuario');
    }
  }

  async function handleToggleActivo(id: number, activo: boolean) {
    await updateMutation.mutateAsync({ id, activo: !activo });
  }

  async function handleResetPassword(id: number, nombre: string) {
    if (!confirm(`¿Resetear contraseña de ${nombre}? Se usará su ficha como nueva contraseña.`)) return;
    await resetMutation.mutateAsync(id);
  }

  if (currentUser?.rol !== 'ADMIN') {
    return <div className={styles.denied}>Solo los administradores pueden gestionar usuarios.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <h2 className={styles.pageTitle}>Usuarios</h2>
        <button className={styles.addBtn} onClick={() => setShowCreate(true)}>
          + Nuevo Usuario
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Cargando usuarios...</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ficha</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Contraseña</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className={styles.row} data-inactive={!u.activo}>
                  <td className={styles.nombre}>{u.nombre}</td>
                  <td className={styles.ficha}>{u.ficha}</td>
                  <td>
                    <span className={styles.rolBadge} data-rol={u.rol}>
                      {u.rol}
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.toggleBtn}
                      data-active={u.activo}
                      onClick={() => handleToggleActivo(u.id, u.activo)}
                      disabled={u.id === currentUser?.id}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    {u.forcePasswordChange && (
                      <span className={styles.pendingBadge}>Pendiente de cambio</span>
                    )}
                  </td>
                  <td className={styles.actions}>
                    {u.id !== currentUser?.id && (
                      <button
                        className={styles.resetBtn}
                        onClick={() => handleResetPassword(u.id, u.nombre)}
                        disabled={resetMutation.isPending}
                        title="Resetear contraseña a la ficha"
                      >
                        Resetear clave
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear usuario */}
      {showCreate && (
        <div className={styles.overlay} onClick={() => setShowCreate(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Nuevo Usuario</h3>
            <p className={styles.modalHint}>La contraseña inicial será el número de ficha.</p>

            {formError && <p className={styles.modalError}>{formError}</p>}

            <form onSubmit={handleCreate} className={styles.modalForm}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre completo *</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} className={styles.input} placeholder="Ej: Juan Pérez" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Ficha *</label>
                <input name="ficha" type="number" value={form.ficha} onChange={handleChange} className={styles.input} placeholder="Número de ficha" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Rol</label>
                <select name="rol" value={form.rol} onChange={handleChange} className={styles.select}>
                  <option value="TECNICO">Técnico</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowCreate(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
