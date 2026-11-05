import { useEffect, useState } from 'react';
import { apiRequest, UNAUTHORIZED_EVENT } from './lib/api';
import EmployeeDashboard from './EmployeeDashboard';

/**
 * Entry khusus employee, dibuka lewat /#employee.
 *
 * Dipisah dari App.jsx supaya alur admin/super admin tidak berubah. Role lain
 * ditolak di sini dan diarahkan kembali ke halaman utama.
 */
export default function EmployeeApp() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      setPassword('');
      setError('Sesi Anda berakhir. Silakan masuk lagi.');
      setChecking(false);
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('stopmeter_token');

    if (!token) {
      setChecking(false);
      return;
    }

    apiRequest('/user')
      .then(response => {
        const account = response.user || response.data?.user || response.data;

        if (account?.role === 'employee') {
          setUser(account);
          return;
        }

        localStorage.removeItem('stopmeter_token');
      })
      .catch(() => localStorage.removeItem('stopmeter_token'))
      .finally(() => setChecking(false));
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!response.token || !response.user) {
        throw new Error('Format respons login tidak sesuai.');
      }

      if (response.user.role !== 'employee') {
        throw new Error('Halaman ini hanya untuk akun employee.');
      }

      localStorage.setItem('stopmeter_token', response.token);
      setUser(response.user);
      setPassword('');
    } catch (err) {
      setError(err.message || 'Login gagal.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await apiRequest('/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout API:', err.message);
    } finally {
      localStorage.removeItem('stopmeter_token');
      setUser(null);
    }
  }

  if (checking) {
    return (
      <div className="emp-page">
        <div className="emp-shell">
          <p className="emp-muted">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <EmployeeDashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="emp-page">
      <div className="emp-shell">
        <form className="emp-card emp-login" onSubmit={handleLogin}>
          <div>
            <p className="emp-eyebrow emp-eyebrow-dark">STOPMETER / EMPLOYEE</p>
            <h2>Masuk</h2>
            <p className="emp-muted">Pakai akun employee yang diberikan Admin.</p>
          </div>

          <label className="emp-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email akun"
              autoComplete="username"
              required
            />
          </label>

          <label className="emp-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="emp-note emp-note-error">{error}</p>}

          <button type="submit" className="emp-btn emp-btn-primary" disabled={submitting}>
            {submitting ? 'Memproses...' : 'Masuk'}
          </button>

          <p className="emp-muted">
            Admin atau Super Admin? Buka <a href="./">halaman utama</a>.
          </p>
        </form>
      </div>
    </div>
  );
}
