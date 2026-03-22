import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../lib/auth-context';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [ficha, setFicha] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(parseInt(ficha, 10), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.brandPanel}>
        <h2 className={styles.brandTitle}>PROSEGUIT</h2>
        <p className={styles.brandSubtitle}>
          Sistema de Gestión de Inventario IT
          <br />
          Intendencia de Soriano
        </p>
        <span className={styles.brandBadge}>v2.0</span>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h1>Iniciar Sesión</h1>
            <p>Ingresá tu ficha y contraseña para continuar</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="ficha">Número de Ficha</label>
              <input
                id="ficha"
                type="number"
                placeholder="Ej: 7844"
                value={ficha}
                onChange={(e) => setFicha(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !ficha || !password}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
