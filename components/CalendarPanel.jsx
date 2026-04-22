'use client';
import { useState, useEffect, useRef } from 'react';
import {
  HOUR_HEIGHT, DAY_START, DAY_END, HOURS,
  DAY_NAMES, MONTH_NAMES, PRIORITY_META,
  formatHour, addDays, parseDate,
  today as getToday, getNowHour,
} from '@/lib/constants';

const formatDuration = (s, e) => {
  const mins = Math.round((e - s) * 60);
  const h = Math.floor(mins / 60), m = mins % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function computeLayout(dayEntries) {
  if (!dayEntries.length) return {};
  const sorted = [...dayEntries].sort((a,b) => a.startHour - b.startHour);
  const colEnd = [];
  const entryToCol = {};
  for (const en of sorted) {
    let placed = false;
    for (let i = 0; i < colEnd.length; i++) {
      if (colEnd[i] <= en.startHour + 0.01) {
        colEnd[i] = en.endHour; entryToCol[en.id] = i; placed = true; break;
      }
    }
    if (!placed) { entryToCol[en.id] = colEnd.length; colEnd.push(en.endHour); }
  }
  const result = {};
  for (const en of dayEntries) {
    const overlapping = dayEntries.filter(o => o.id !== en.id && o.startHour < en.endHour && o.endHour > en.startHour);
    const maxCol = Math.max(entryToCol[en.id], ...overlapping.map(o => entryToCol[o.id] ?? 0));
    result[en.id] = { col: entryToCol[en.id], numCols: maxCol + 1 };
  }
  return result;
}

/* ── Task detail modal ─────────────────────────────────────── */
function TaskDetailModal({ entry, task, project, onClose, onUpdateTask }) {
  const color = project?.color || '#8b5cf6';

  const [editing,     setEditing]     = useState(false);
  const [title,       setTitle]       = useState(task?.title || '');
  const [desc,        setDesc]        = useState(task?.description || '');
  const [priority,    setPriority]    = useState(task?.priority || 3);
  const [attachments, setAttachments] = useState(
    () => (task?.attachments || []).map((a, i) => ({ ...a, _key: `e${i}` }))
  );
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const handleFiles = async (files) => {
    const incoming = Array.from(files);
    const placeholders = incoming.map(f => ({
      _key: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name, uploading: true, error: null,
    }));
    setAttachments(prev => [...prev, ...placeholders]);
    await Promise.all(incoming.map(async (file, idx) => {
      const key = placeholders[idx]._key;
      try {
        const form = new FormData();
        form.append('file', file);
        const res  = await fetch('/api/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        setAttachments(prev => prev.map(a =>
          a._key === key ? { _key: key, name: data.name, url: data.url, size: data.size, uploading: false, error: null } : a
        ));
      } catch (err) {
        setAttachments(prev => prev.map(a =>
          a._key === key ? { ...a, uploading: false, error: err.message } : a
        ));
      }
    }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAttachment = async (key) => {
    const att = attachments.find(a => a._key === key);
    setAttachments(prev => prev.filter(a => a._key !== key));
    if (att?.url) {
      const filename = att.url.split('/').pop();
      await fetch(`/api/upload/${filename}`, { method: 'DELETE' });
    }
  };

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    const ready = attachments
      .filter(a => !a.uploading && !a.error && a.url)
      .map(({ name, url, size }) => ({ name, url, size }));
    await onUpdateTask(task.id, { title: title.trim(), description: desc.trim(), priority, attachments: ready });
    setSaving(false);
    setEditing(false);
  };

  const cancelEdit = () => {
    setTitle(task?.title || '');
    setDesc(task?.description || '');
    setPriority(task?.priority || 3);
    setAttachments((task?.attachments || []).map((a, i) => ({ ...a, _key: `e${i}` })));
    setEditing(false);
  };

  const uploading = attachments.some(a => a.uploading);
  const pm = PRIORITY_META[editing ? priority : (task?.priority || 3)] || PRIORITY_META[5];

  return (
    <div className="modal-overlay" onClick={editing ? undefined : onClose}>
      <div
        className="modal-box animate-in"
        onClick={e => e.stopPropagation()}
        style={{ width: 460, maxWidth: '92vw', textAlign: 'left', padding: 28 }}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:18 }}>
          {project?.iconUrl
            ? <img src={project.iconUrl} alt="" style={{ width:34, height:34, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
            : <div style={{ width:34, height:34, borderRadius:8, background:color+'22', color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0, fontFamily:'monospace' }}>
                {project?.emoji || '◈'}
              </div>
          }
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{project?.name}</div>
            {editing
              ? <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancelEdit(); }}
                  style={{ width:'100%', background:'var(--bg)', border:'1px solid rgba(0,0,0,0.15)', borderRadius:8, padding:'7px 10px', fontSize:15, fontWeight:700, fontFamily:'inherit', color:'var(--text)', outline:'none' }}
                />
              : <div style={{ fontSize:18, fontWeight:700, color:'var(--text)', lineHeight:1.25 }}>{task?.title}</div>
            }
          </div>
          <div style={{ display:'flex', gap:4, flexShrink:0, marginTop:-2 }}>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                title="Edit task"
                style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:7, cursor:'pointer', padding:'5px 8px', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', transition:'color .12s, background .12s' }}
                onMouseEnter={e => { e.currentTarget.style.color='var(--text)'; e.currentTarget.style.background='#eeede9'; }}
                onMouseLeave={e => { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='var(--bg)'; }}
              >
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                  <path d="M8.5 1.5a1.207 1.207 0 011.707 1.707L3.5 9.914 1 10.5l.586-2.5L8.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <button onClick={editing ? cancelEdit : onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'var(--text-muted)', padding:'0 2px', lineHeight:1 }}>×</button>
          </div>
        </div>

        {/* Meta chips */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          <span style={{ fontSize:12, color:'var(--text-muted)', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, padding:'3px 9px' }}>
            {formatHour(entry.startHour)} – {formatHour(entry.endHour)} · {formatDuration(entry.startHour, entry.endHour)}
          </span>
          {editing
            ? [1,2,3,4,5].map(p => {
                const m = PRIORITY_META[p];
                return (
                  <button key={p}
                    onClick={() => setPriority(p)}
                    style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:6, border:`1px solid ${m.bg}44`, cursor:'pointer', fontFamily:'inherit', transition:'all .12s',
                      background: priority === p ? m.bg : m.bg+'22', color: priority === p ? '#fff' : m.bg }}
                  >{m.label}</button>
                );
              })
            : <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:6, background:pm.bg+'22', color:pm.bg, border:`1px solid ${pm.bg}44` }}>{pm.label}</span>
          }
          {!editing && entry.status === 'done' && (
            <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:6, background:'#d1fae5', color:'#059669', border:'1px solid #a7f3d0' }}>✓ Completed</span>
          )}
          {!editing && entry.status === 'failed' && (
            <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:6, background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }}>✕ Not completed</span>
          )}
        </div>

        {/* Description */}
        {editing
          ? <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Add a description…"
              style={{ width:'100%', background:'var(--bg)', border:'1px solid rgba(0,0,0,0.12)', borderRadius:8, padding:'9px 12px', fontSize:13, fontFamily:'inherit', color:'var(--text)', outline:'none', resize:'none', height:80, marginBottom:14 }}
            />
          : task?.description && (
              <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.65, marginBottom:18, background:'var(--bg)', borderRadius:8, padding:'10px 13px', border:'1px solid var(--border)' }}>
                {task.description}
              </div>
            )
        }

        {/* Attachments */}
        {editing ? (
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8 }}>Attachments</div>
            {attachments.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:8 }}>
                {attachments.map(a => (
                  <div key={a._key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:9, background:'var(--bg)', border:`1px solid ${a.error ? '#fca5a5' : 'var(--border)'}`, fontSize:13 }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>
                      {a.uploading ? <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>↻</span> : a.error ? '✕' : '📎'}
                    </span>
                    <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: a.error ? '#ef4444' : 'var(--text)' }}>
                      {a.error ? a.error : a.name}
                    </span>
                    {a.size && !a.uploading && !a.error && <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{formatSize(a.size)}</span>}
                    {!a.uploading && (
                      <button onClick={() => removeAttachment(a._key)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'0 2px', fontSize:16, lineHeight:1, flexShrink:0 }}>×</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'1.5px dashed rgba(0,0,0,0.1)', borderRadius:8, padding:'7px 12px', fontSize:12, color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit', transition:'border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(0,0,0,0.2)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='rgba(0,0,0,0.1)'}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9.5 5.5L5.5 9.5a2.5 2.5 0 01-3.5-3.5l4-4A1.5 1.5 0 018 3.5L4 7.5a.5.5 0 01-.7-.7L7 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              Attach file
            </button>
            <input ref={fileRef} type="file" multiple style={{ display:'none' }} onChange={e => handleFiles(e.target.files)} />
          </div>
        ) : task?.attachments?.length > 0 && (
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8 }}>Attachments</div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {task.attachments.map((a, i) =>
                a.url
                  ? <a key={i} href={a.url} download={a.name} target="_blank" rel="noopener noreferrer"
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, background:'var(--bg)', border:'1px solid var(--border)', textDecoration:'none', color:'var(--text)', fontSize:13, transition:'background .12s, border-color .12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background='#eeede9'; e.currentTarget.style.borderColor='rgba(0,0,0,0.13)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='var(--bg)'; e.currentTarget.style.borderColor='var(--border)'; }}
                    >
                      <span style={{ fontSize:18, flexShrink:0 }}>📎</span>
                      <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500 }}>{a.name}</span>
                      {a.size && <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{formatSize(a.size)}</span>}
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink:0, color:'var(--text-muted)' }}>
                        <path d="M6.5 1v7M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M1 10v1.5A.5.5 0 001.5 12h10a.5.5 0 00.5-.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </a>
                  : <span key={i} style={{ padding:'9px 12px', borderRadius:9, background:'var(--bg)', border:'1px solid var(--border)', fontSize:13, color:'var(--text-muted)' }}>
                      📎 {a.name}
                    </span>
              )}
            </div>
          </div>
        )}

        {!editing && !task?.description && !task?.attachments?.length && (
          <div style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', padding:'8px 0' }}>No description or attachments</div>
        )}

        {/* Edit mode save/cancel */}
        {editing && (
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
            <button className="btn-cancel" onClick={cancelEdit}>Cancel</button>
            <button
              className="btn-submit"
              style={{ background: color, opacity: (uploading || saving) ? 0.6 : 1 }}
              onClick={save}
              disabled={uploading || saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Calendar task block ───────────────────────────────────── */
function CalendarTaskBlock({ entry, task, project, layout, onUpdate, onRemove, onShowDetail }) {
  const moveRef    = useRef({ moved: false, startX: 0, startY: 0 });
  const color      = project?.color || '#8b5cf6';
  const top        = (entry.startHour - DAY_START) * HOUR_HEIGHT;
  const height     = Math.max((entry.endHour - entry.startHour) * HOUR_HEIGHT, 20);
  const isSmall    = height < 52;
  const isTiny     = height < 28;
  const { col = 0, numCols = 1 } = layout || {};
  const widthPct   = 100 / numCols;
  const leftPct    = col * widthPct;
  const isResolved = entry.status === 'done' || entry.status === 'failed';

  const handleMouseDown = (e) => {
    e.preventDefault();
    moveRef.current = { moved: false, startX: e.clientX, startY: e.clientY };

    const startHour = entry.startHour;
    const dur       = entry.endHour - entry.startHour;

    const onMove = ev => {
      const dx = Math.abs(ev.clientX - moveRef.current.startX);
      const dy = Math.abs(ev.clientY - moveRef.current.startY);
      if (dx > 5 || dy > 5) moveRef.current.moved = true;
      // Only drag-move for non-resolved tasks
      if (!moveRef.current.moved || isResolved) return;
      const delta    = (ev.clientY - moveRef.current.startY) / HOUR_HEIGHT;
      const newStart = Math.min(DAY_END - dur, Math.max(DAY_START, startHour + Math.round(delta * 4) / 4));
      onUpdate({ ...entry, startHour: newStart, endHour: newStart + dur });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!moveRef.current.moved) onShowDetail(entry.id);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleResizeDown = (e) => {
    if (isResolved) return;
    e.stopPropagation(); e.preventDefault();
    const startY   = e.clientY;
    const startEnd = entry.endHour;
    const onMove   = ev => {
      const delta  = (ev.clientY - startY) / HOUR_HEIGHT;
      const newEnd = Math.min(DAY_END, Math.max(entry.startHour + 0.25, startEnd + Math.round(delta * 4) / 4));
      onUpdate({ ...entry, endHour: newEnd });
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className={`cal-task-block${entry.status === 'done' ? ' status-done' : entry.status === 'failed' ? ' status-failed' : ''}${isTiny ? ' tiny' : ''}`}
      style={{ top, height, background: color, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, right: 'auto', cursor: isResolved ? 'pointer' : 'grab' }}
      onMouseDown={handleMouseDown}
    >
      <div className="cal-task-title" style={{ fontSize: isTiny ? 9 : isSmall ? 10 : 12 }}>{task?.title}</div>
      {!isTiny && (
        <div className="cal-task-time">
          {formatHour(entry.startHour)} – {formatHour(entry.endHour)}
          <span className="cal-task-dur"> · {formatDuration(entry.startHour, entry.endHour)}</span>
        </div>
      )}
      {entry.status === 'done'   && <div className="cal-task-badge cal-task-badge-done">✓</div>}
      {entry.status === 'failed' && <div className="cal-task-badge cal-task-badge-fail">✕</div>}
      {!isResolved && <>
        <button className="cal-task-remove" onMouseDown={e => e.stopPropagation()} onClick={() => onRemove(entry.id)}>×</button>
        <div className="cal-task-resize" onMouseDown={handleResizeDown} />
      </>}
    </div>
  );
}

/* ── Hour grid ─────────────────────────────────────────────── */
function HourGrid({ entries, tasks, projects, selectedDate, onAddEntry, onUpdateEntry, onRemoveEntry, onShowDetail }) {
  const gridRef = useRef(null);
  const [ghost, setGhost] = useState(null);
  const [nowHour, setNowHour] = useState(getNowHour);
  const currentToday = getToday();
  const isToday  = selectedDate === currentToday;

  useEffect(() => {
    const iv = setInterval(() => setNowHour(getNowHour()), 60000);
    return () => clearInterval(iv);
  }, []);

  const getHour = (clientY) => {
    const rect = gridRef.current.getBoundingClientRect();
    const raw  = DAY_START + (clientY - rect.top) / HOUR_HEIGHT;
    return Math.min(DAY_END - 1, Math.max(DAY_START, Math.round(raw * 4) / 4));
  };

  const dayEntries = entries.filter(e => e.date === selectedDate);
  const layout     = computeLayout(dayEntries);

  return (
    <div
      className="hour-grid-wrap"
      ref={gridRef}
      style={{ minHeight: (DAY_END - DAY_START) * HOUR_HEIGHT }}
      onDragOver={e => { e.preventDefault(); setGhost({ startHour: getHour(e.clientY), endHour: getHour(e.clientY) + 1 }); }}
      onDragLeave={() => setGhost(null)}
      onDrop={e => {
        e.preventDefault(); setGhost(null);
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;
        if (entries.some(en => en.taskId === taskId)) return;
        const h = getHour(e.clientY);
        onAddEntry({ taskId, date: selectedDate, startHour: h, endHour: Math.min(DAY_END, h + 1) });
      }}
    >
      {isToday && nowHour >= DAY_START && nowHour <= DAY_END && (
        <div className="now-line" style={{ top: (nowHour - DAY_START) * HOUR_HEIGHT }}>
          <div className="now-dot" />
        </div>
      )}
      {HOURS.map(h => (
        <div key={h} className="hour-row">
          <div className="hour-label">{String(h).padStart(2,'0')}:00</div>
          <div className="hour-slot" />
        </div>
      ))}
      {ghost && (
        <div className="drop-ghost" style={{
          top: (ghost.startHour - DAY_START) * HOUR_HEIGHT,
          height: (ghost.endHour - ghost.startHour) * HOUR_HEIGHT,
          left: 48, right: 4,
        }} />
      )}
      <div className="cal-events-layer">
        {dayEntries.map(en => {
          const task    = tasks.find(t => t.id === en.taskId);
          const project = projects.find(p => p.id === task?.projectId);
          return (
            <CalendarTaskBlock
              key={en.id} entry={en} task={task} project={project}
              layout={layout[en.id]}
              onUpdate={onUpdateEntry} onRemove={onRemoveEntry}
              onShowDetail={onShowDetail}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── Calendar panel ────────────────────────────────────────── */
export default function CalendarPanel({ entries, tasks, projects, onAddEntry, onUpdateEntry, onRemoveEntry, onUpdateTask, username, onLogout }) {
  const currentToday = getToday();
  const [selectedDate,   setSelectedDate]   = useState(currentToday);
  const [weekOffset,     setWeekOffset]     = useState(0);
  const [detailEntryId,  setDetailEntryId]  = useState(null);

  const dates     = Array.from({ length: 7 }, (_, i) => addDays(currentToday, weekOffset * 7 + i));
  const selD      = parseDate(selectedDate);
  const monthLabel = MONTH_NAMES[selD.getMonth()] + ' ' + selD.getFullYear();

  // Resolve detail data
  const detailEntry   = detailEntryId ? entries.find(e => e.id === detailEntryId) : null;
  const detailTask    = detailEntry   ? tasks.find(t => t.id === detailEntry.taskId) : null;
  const detailProject = detailTask    ? projects.find(p => p.id === detailTask.projectId) : null;

  return (
    <div className="calendar-panel">
      {/* Date selector column */}
      <div className="date-column">
        <div className="cal-header">
          <div className="cal-label">Schedule</div>
          <div className="month-nav">
            <span className="month-name">{monthLabel}</span>
            <div className="nav-btns">
              <button className="nav-btn" onClick={() => setWeekOffset(w => w - 1)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 9.5L4 6l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="nav-btn" onClick={() => { setWeekOffset(0); setSelectedDate(currentToday); }}>Now</button>
              <button className="nav-btn" onClick={() => setWeekOffset(w => w + 1)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="date-list" style={{ flex: 1 }}>
          {dates.map(dateStr => {
            const d      = parseDate(dateStr);
            const dow    = d.getDay();
            const isWknd = dow === 0 || dow === 6;
            const count  = entries.filter(e => e.date === dateStr).length;
            const colors = [...new Set(
              entries.filter(e => e.date === dateStr)
                .map(e => projects.find(p => p.id === tasks.find(t => t.id === e.taskId)?.projectId)?.color)
                .filter(Boolean)
            )].slice(0, 4);

            return (
              <div
                key={dateStr}
                className={`date-item${dateStr === selectedDate ? ' selected' : ''}${isWknd ? ' weekend' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <div className={`date-num${dateStr === currentToday ? ' today-num' : ''}`}>{d.getDate()}</div>
                <div className="date-day">
                  {DAY_NAMES[dow]}
                  {dateStr === currentToday && <span style={{display:'block',fontSize:8,letterSpacing:'.04em',color:'#8b5cf6',fontWeight:700}}>TODAY</span>}
                </div>
                {count > 0 && <div className="date-tasks">{count} task{count !== 1 ? 's' : ''}</div>}
                {colors.length > 0 && <div className="date-dots">{colors.map((c,i) => <div key={i} className="date-dot" style={{background:c}} />)}</div>}
              </div>
            );
          })}
        </div>

        {/* User section */}
        <div className="cal-user-section" style={{ borderTop:'1px solid rgba(255,255,255,0.07)', padding:'12px 10px', flexShrink:0 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.35)', marginBottom:7, paddingLeft:4, letterSpacing:'.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {username}
          </div>
          <button onClick={onLogout} style={{
            display:'flex', alignItems:'center', gap:6, width:'100%',
            background:'none', border:'none', cursor:'pointer', padding:'6px 4px',
            borderRadius:7, color:'rgba(255,255,255,0.35)', fontSize:12, fontFamily:'inherit',
            fontWeight:500, transition:'background .12s, color .12s', textAlign:'left',
          }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(255,255,255,0.75)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='rgba(255,255,255,0.35)'; }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5h8M7 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 2H2a.5.5 0 00-.5.5v8A.5.5 0 002 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            Sign out
          </button>
        </div>
      </div>

      {/* Hour grid column */}
      <div className="grid-column">
        <div className="cal-day-label">
          {DAY_NAMES[selD.getDay()]} · {MONTH_NAMES[selD.getMonth()].slice(0,3)} {selD.getDate()}
        </div>
        <div className="hour-grid-container">
          <HourGrid
            entries={entries} tasks={tasks} projects={projects}
            selectedDate={selectedDate}
            onAddEntry={onAddEntry} onUpdateEntry={onUpdateEntry} onRemoveEntry={onRemoveEntry}
            onShowDetail={setDetailEntryId}
          />
        </div>
      </div>

      {/* Task detail modal */}
      {detailEntry && detailTask && (
        <TaskDetailModal
          entry={detailEntry} task={detailTask} project={detailProject}
          onClose={() => setDetailEntryId(null)}
          onUpdateTask={onUpdateTask}
        />
      )}
    </div>
  );
}
