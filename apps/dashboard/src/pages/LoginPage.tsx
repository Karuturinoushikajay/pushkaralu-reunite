import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';

export function LoginPage() {
  const { login } = useAuth();
  const [loginUid, setLoginUid] = useState('BOOTH07-OFFICER');
  const [password, setPassword] = useState('booth07pass');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(loginUid, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <img
          src="/logo.png"
          alt="Pushkaralu Reunite"
          style={{ display: 'block', width: 'min(220px, 70%)', height: 'auto', margin: '0 auto 8px' }}
        />
        <p className="muted">Police / booth officer login</p>
        <div className="field">
          <label htmlFor="uid">Officer ID</label>
          <input
            id="uid"
            value={loginUid}
            onChange={(e) => setLoginUid(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-amber" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </div>
  );
}
