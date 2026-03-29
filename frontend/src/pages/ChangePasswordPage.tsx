import { useState } from 'react';
import { useNavigate } from 'react-router';
import { use } from 'react';
import { useChangePassword } from '../hooks/useUsers';
import { AuthContext } from '../lib/auth-context';
import styles from './ChangePasswordPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

export default function ChangePasswordPage() {
  usePageTitle('Cambiar contraseña');
  const { user, logout } = use(AuthContext)!;
  const navigate = useNavigate();
  const mutation = useChangePassword();

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isForced = user?.forcePasswordChange;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await mutation.mutateAsync({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err?.message || 'Error al cambiar la contraseña');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {isForced && (
          <div className={styles.alert}>
            Por seguridad, debés cambiar tu contraseña antes de continuar.
          </div>
        )}

        <h2 className={styles.title}>Cambiar Contraseña</h2>
        {user && <p className={styles.subtitle}>Usuario: {user.nombre} (ficha {user.ficha})</p>}

        {success ? (
          <div className={styles.success}>
            Contraseña cambiada exitosamente. Redirigiendo...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label className={styles.label}>Contraseña actual</label>
              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                className={styles.input}
                required
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Nueva contraseña</label>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                className={styles.input}
                required
                minLength={6}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Confirmar nueva contraseña</label>
              <input
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.actions}>
              {!isForced && (
                <button type="button" className={styles.cancelBtn} onClick={() => navigate(-1)}>
                  Cancelar
                </button>
              )}
              {isForced && (
                <button type="button" className={styles.logoutBtn} onClick={logout}>
                  Cerrar sesión
                </button>
              )}
              <button type="submit" className={styles.submitBtn} disabled={mutation.isPending}>
                {mutation.isPending ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
