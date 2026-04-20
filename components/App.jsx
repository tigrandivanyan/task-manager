'use client';
import { useState, useEffect } from 'react';
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

  // Load all data once authenticated
  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch('/api/projects'),
      apiFetch('/api/tasks'),
      apiFetch('/api/entries'),
    ]).then(([p, t, e]) => {
      setProjects(p);
      setTasks(t);
      setEntries(e);
    });
  }, [user]);

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

  const addProject = async (data) => {
    const project = await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(data) });
    setProjects(prev => [...prev, project]);
  };

  const handleResolve = async (entryId, resolution) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: resolution } : e));
    await fetch(`/api/entries/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: resolution }),
    });
  };

  // ── Render ───────────────────────────────────────────────
  if (user === undefined) return null; // loading
  if (!user) return <LoginPage onLogin={setUser} />;

  const calendarTaskIds = new Set(
    entries.filter(e => e.status !== 'failed').map(e => e.taskId)
  );
  const pendingEntries = entries.filter(e => e.status === 'pending');

  return (
    <div className="app">
      <CalendarPanel
        entries={entries} tasks={tasks} projects={projects}
        onAddEntry={addEntry}
        onUpdateEntry={updateEntry}
        onRemoveEntry={removeEntry}
        username={user.username}
        onLogout={handleLogout}
      />
      <TaskPanel
        projects={projects} tasks={tasks} calendarTaskIds={calendarTaskIds}
        onAddTask={addTask}
        onAddProject={addProject}
        pendingEntries={pendingEntries}
        onResolve={handleResolve}
      />
    </div>
  );
}
