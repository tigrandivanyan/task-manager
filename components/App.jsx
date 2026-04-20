'use client';
import { useState, useEffect } from 'react';
import CalendarPanel from './CalendarPanel';
import TaskPanel from './TaskPanel';
import { load, today as getToday, getNowHour, INIT_PROJECTS, INIT_TASKS } from '@/lib/constants';

export default function App() {
  const [projects, setProjects] = useState(null);
  const [tasks,    setTasks]    = useState(null);
  const [entries,  setEntries]  = useState(null);

  // Hydrate from localStorage on client only
  useEffect(() => {
    setProjects(load('ptm_projects', INIT_PROJECTS));
    setTasks(load('ptm_tasks',    INIT_TASKS));
    setEntries(load('ptm_entries', []));
  }, []);

  useEffect(() => { if (projects !== null) localStorage.setItem('ptm_projects', JSON.stringify(projects)); }, [projects]);
  useEffect(() => { if (tasks    !== null) localStorage.setItem('ptm_tasks',    JSON.stringify(tasks));    }, [tasks]);
  useEffect(() => { if (entries  !== null) localStorage.setItem('ptm_entries',  JSON.stringify(entries));  }, [entries]);

  // Mark expired entries as pending
  useEffect(() => {
    if (!entries) return;
    const check = () => {
      const currentToday = getToday();
      const nowH = getNowHour();
      setEntries(prev => prev.map(en => {
        if (en.date <= currentToday && (en.date < currentToday || en.endHour <= nowH) && !en.status)
          return { ...en, status: 'pending' };
        return en;
      }));
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [entries !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!projects || !tasks || !entries) return null;

  const calendarTaskIds = new Set(
    entries.filter(e => e.status !== 'failed').map(e => e.taskId)
  );
  const pendingEntries = entries.filter(e => e.status === 'pending');

  const handleResolve = (entryId, resolution) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: resolution } : e));
  };

  return (
    <div className="app">
      <CalendarPanel
        entries={entries} tasks={tasks} projects={projects}
        onAddEntry={en => setEntries(prev => [...prev, en])}
        onUpdateEntry={en => setEntries(prev => prev.map(e => e.id === en.id ? en : e))}
        onRemoveEntry={id => setEntries(prev => prev.filter(e => e.id !== id))}
      />
      <TaskPanel
        projects={projects} tasks={tasks} calendarTaskIds={calendarTaskIds}
        onAddTask={t => setTasks(prev => [...prev, t])}
        onAddProject={p => setProjects(prev => [...prev, p])}
        pendingEntries={pendingEntries}
        onResolve={handleResolve}
      />
    </div>
  );
}
