import { useState } from 'react';
import { use } from 'react';
import { useUsers, useCurrentUser, useCreateUser, useUpdateUser, useResetPassword, useChangePassword } from '../hooks/useUsers';
import { AuthContext } from '../lib/auth-context';
import styles from './UsersPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

export default function UsersPage() {
  usePageTitle('Usuarios');
  const { user: currentUser } = use(AuthContext)!;
  const { data: users, isLoading } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const resetMutation = useResetPassword();

  const [showCreate, setShowCreate] = useState(false);
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
      const result = await createMutation.mutateAsync({ nombre: form.nombre, ficha: Number(form.ficha), rol: form.rol });
      setShowCreate(false);
      setForm({ nombre: '', ficha: '', rol: 'TECNICO' });
      alert(`Usuario creado.\nContraseña temporal: ${result.tempPassword}\nGuárdala, no se mostrará de nuevo.`);
    } catch (err: any) {
      setFormError(err?.message || 'Error al crear usuario');
    }
  }

  async function handleToggleActivo(id: number, activo: boolean) {
    await updateMutation.mutateAsync({ id, activo: !activo });
  }

  async function handleResetPassword(id: number, nombre: string) {
    if (!confirm(`¿Resetear contraseña de ${nombre}? La nueva contraseña será su número de ficha.`)) return;
    await resetMutation.mutateAsync(id);
    alert(`Contraseña reseteada. La nueva contraseña es el número de ficha del usuario.`);
  }

  const { data: me } = useCurrentUser();
  const changeMutation = useChangePassword();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('Las contraseñas no coinciden'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('La contraseña debe tener al menos 6 caracteres'); return; }
    try {
      await changeMutation.mutateAsync({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwSuccess(true);
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => { setShowChangePassword(false); setPwSuccess(false); }, 1500);
    } catch (err: any) {
      setPwError(err?.message || 'Error al cambiar contraseña');
    }
  }

  if (currentUser?.rol !== 'ADMIN') {
    return (
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <h2 className={styles.pageTitle}>Mi Usuario</h2>
        </div>
        {me && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ficha</th>
                  <th>Rol</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.row}>
                  <td className={styles.nombre}>{me.nombre}</td>
                  <td className={styles.ficha}>{me.ficha}</td>
                  <td><span className={styles.rolBadge} data-rol={me.rol}>{me.rol}</span></td>
                  <td className={styles.actions}>
                    <button className={styles.resetBtn} onClick={() => setShowChangePassword(true)}>
                      Cambiar contraseña
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {showChangePassword && (
          <div className={styles.overlay} onClick={() => setShowChangePassword(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>Cambiar contraseña</h3>
              {pwError && <p className={styles.modalError}>{pwError}</p>}
              {pwSuccess && <p style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>Contraseña cambiada correctamente</p>}
              <form onSubmit={handleChangePassword} className={styles.modalForm}>
                <div className={styles.field}>
                  <label className={styles.label}>Contraseña actual</label>
                  <input type="password" className={styles.input} value={pwForm.currentPassword} onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Nueva contraseña</label>
                  <input type="password" className={styles.input} value={pwForm.newPassword} onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Confirmar nueva contraseña</label>
                  <input type="password" className={styles.input} value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} required />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setShowChangePassword(false)}>Cancelar</button>
                  <button type="submit" className={styles.confirmBtn} disabled={changeMutation.isPending}>
                    {changeMutation.isPending ? 'Guardando...' : 'Cambiar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
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
                  <td className={styles.actions}>
                    {u.id === currentUser?.id ? (
                      <button className={styles.resetBtn} onClick={() => setShowChangePassword(true)}>
                        Cambiar contraseña
                      </button>
                    ) : (
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

      {/* Modal cambiar contraseña propia */}
      {showChangePassword && (
        <div className={styles.overlay} onClick={() => setShowChangePassword(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Cambiar contraseña</h3>
            {pwError && <p className={styles.modalError}>{pwError}</p>}
            {pwSuccess && <p style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>Contraseña cambiada correctamente</p>}
            <form onSubmit={handleChangePassword} className={styles.modalForm}>
              <div className={styles.field}>
                <label className={styles.label}>Contraseña actual</label>
                <input type="password" className={styles.input} value={pwForm.currentPassword} onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Nueva contraseña</label>
                <input type="password" className={styles.input} value={pwForm.newPassword} onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirmar nueva contraseña</label>
                <input type="password" className={styles.input} value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} required />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowChangePassword(false)}>Cancelar</button>
                <button type="submit" className={styles.confirmBtn} disabled={changeMutation.isPending}>
                  {changeMutation.isPending ? 'Guardando...' : 'Cambiar'}
                </button>
              </div>
            </form>
          </div>
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
