'use client';
import { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [mode,     setMode]     = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      onLogin(data);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.logo}>◈</div>
        <h1 style={styles.title}>Task Manager</h1>
        <p style={styles.sub}>
          {mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace'}
        </p>

        <div style={styles.tabs}>
          <button style={{...styles.tab, ...(mode==='login'  ? styles.tabActive : {})}} onClick={()=>{setMode('login');setError('');}}>Sign in</button>
          <button style={{...styles.tab, ...(mode==='register'?styles.tabActive:{})}} onClick={()=>{setMode('register');setError('');}}>Register</button>
        </div>

        <form onSubmit={submit} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Username"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <div style={styles.error}>{error}</div>}
          <button style={{...styles.btn, opacity: loading ? 0.7 : 1}} type="submit" disabled={loading}>
            {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#111110',
  },
  card: {
    background: '#1a1917', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
    padding: '40px 36px', width: 360, textAlign: 'center',
    boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
  },
  logo: {
    fontSize: 36, color: '#8b5cf6', marginBottom: 12, fontFamily: 'monospace',
  },
  title: {
    fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6,
  },
  sub: {
    fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 28,
  },
  tabs: {
    display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10,
    padding: 3, marginBottom: 24, gap: 3,
  },
  tab: {
    flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, fontFamily: 'inherit', background: 'transparent',
    color: 'rgba(255,255,255,0.45)', transition: 'all .15s',
  },
  tabActive: {
    background: 'rgba(255,255,255,0.1)', color: '#fff',
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  input: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#fff',
    fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s',
  },
  error: {
    fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px',
    textAlign: 'left',
  },
  btn: {
    marginTop: 4, padding: '12px', borderRadius: 10, border: 'none',
    background: '#8b5cf6', color: '#fff', fontSize: 14, fontWeight: 600,
    fontFamily: 'inherit', cursor: 'pointer', transition: 'opacity .15s',
  },
};
