'use client';
import { useState, useEffect, useCallback } from 'react';
import CalendarPanel from './CalendarPanel';
import TaskPanel from './TaskPanel';
import LoginPage from './LoginPage';
import { today as getToday, getNowHour } from '@/lib/constants';

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function App() {
  const [user,     setUser]     = useState(undefined); // undefined = loading
  const [projects, setProjects] = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [entries,  setEntries]  = useState([]);

  // Check auth on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(u => setUser(u));
  }, []);

  // Load all data (stable reference — setters are stable)
  const loadAllData = useCallback(async () => {
    try {
      const [p, t, e] = await Promise.all([
        apiFetch('/api/projects'),
        apiFetch('/api/tasks'),
        apiFetch('/api/entries'),
      ]);
      setProjects(p); setTasks(t); setEntries(e);
    } catch {}
  }, []);

  // Load all data once authenticated
  useEffect(() => {
    if (!user) return;
    loadAllData();
  }, [user, loadAllData]);

  // Poll every 30 s + refresh when app is foregrounded (PWA support)
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(loadAllData, 30000);
    const onVisible = () => { if (!document.hidden) loadAllData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVisible); };
  }, [user, loadAllData]);

  // SSE connection for push-style refresh events
  useEffect(() => {
    if (!user) return;
    const es = new EventSource('/api/events');
    es.onmessage = () => loadAllData();
    return () => es.close();
  }, [user, loadAllData]);

  // Expiry checker — marks overdue entries as 'pending' via API
  useEffect(() => {
    if (!user) return;
    const check = () => {
      const currentToday = getToday();
      const nowH = getNowHour();
      const expired = entries.filter(en =>
        en.date <= currentToday &&
        (en.date < currentToday || en.endHour <= nowH) &&
        !en.status
      );
      if (!expired.length) return;
      expired.forEach(en => {
        fetch(`/api/entries/${en.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending' }),
        });
      });
      setEntries(prev => prev.map(en =>
        expired.find(e => e.id === en.id) ? { ...en, status: 'pending' } : en
      ));
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [user, entries]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setProjects([]); setTasks([]); setEntries([]);
  };

  // ── Mutations ────────────────────────────────────────────
  const addEntry = async (data) => {
    const entry = await apiFetch('/api/entries', { method: 'POST', body: JSON.stringify(data) });
    setEntries(prev => [...prev, entry]);
  };

  const updateEntry = async (updated) => {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e)); // optimistic
    await fetch(`/api/entries/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startHour: updated.startHour, endHour: updated.endHour, status: updated.status }),
    });
  };

  const removeEntry = async (id) => {
    setEntries(prev => prev.filter(e => e.id !== id)); // optimistic
    await fetch(`/api/entries/${id}`, { method: 'DELETE' });
  };

  const addTask = async (data) => {
    const task = await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
    setTasks(prev => [...prev, task]);
  };

  const updateTask = async (id, data) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t)); // optimistic
    const updated = await apiFetch(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id)); // optimistic
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  };

  const addProject = async (data) => {
    const project = await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(data) });
    setProjects(prev => [...prev, project]);
  };

  const deleteProject = async (id) => {
    setProjects(prev => prev.filter(p => p.id !== id)); // optimistic
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  };

  const handleResolve = async (entryId, resolution) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: resolution } : e));
    await fetch(`/api/entries/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: resolution }),
    });
  };

  const [mobileTab, setMobileTab] = useState('calendar');

  // ── Render ───────────────────────────────────────────────
  if (user === undefined) return null; // loading
  if (!user) return <LoginPage onLogin={setUser} />;

  const calendarTaskIds = new Set(
    entries.filter(e => e.status !== 'failed').map(e => e.taskId)
  );
  const pendingEntries = entries.filter(e => e.status === 'pending');

  return (
    <div className="app">
      <div className={`mobile-panel${mobileTab === 'calendar' ? ' mobile-active' : ''}`}>
        <CalendarPanel
          entries={entries} tasks={tasks} projects={projects}
          onAddEntry={addEntry}
          onUpdateEntry={updateEntry}
          onRemoveEntry={removeEntry}
          onUpdateTask={updateTask}
          username={user.username}
          onLogout={handleLogout}
        />
      </div>
      <div className={`mobile-panel${mobileTab === 'tasks' ? ' mobile-active' : ''}`}>
        <TaskPanel
          projects={projects} tasks={tasks} calendarTaskIds={calendarTaskIds}
          onAddTask={addTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
          pendingEntries={pendingEntries}
          onResolve={handleResolve}
        />
      </div>

      <nav className="mobile-tab-bar" role="tablist">
        <button
          role="tab" aria-selected={mobileTab === 'calendar'}
          className={`mobile-tab${mobileTab === 'calendar' ? ' active' : ''}`}
          onClick={() => setMobileTab('calendar')}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="3" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M3 9h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M7 3v4M15 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <rect x="7" y="13" width="2" height="2" rx=".5" fill="currentColor"/>
            <rect x="11" y="13" width="2" height="2" rx=".5" fill="currentColor"/>
          </svg>
          <span>Calendar</span>
        </button>
        <button
          role="tab" aria-selected={mobileTab === 'tasks'}
          className={`mobile-tab${mobileTab === 'tasks' ? ' active' : ''}`}
          onClick={() => setMobileTab('tasks')}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M9 6h8M9 11h8M9 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M5 6l.01 0M5 11l.01 0M5 16l.01 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Tasks</span>
          {pendingEntries.length > 0 && (
            <span className="tab-badge">{pendingEntries.length}</span>
          )}
        </button>
      </nav>
      {/* Paints over the iOS home-indicator safe area so it matches the tab bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'env(safe-area-inset-bottom, 0px)',
        background: '#0d0d0c',
        zIndex: 9999,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
