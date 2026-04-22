'use client';
import { useState, useRef } from 'react';
import { formatHour, PRIORITY_META, PROJECT_COLORS, PROJECT_EMOJIS } from '@/lib/constants';

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function PriorityBadge({ priority }) {
  const p = PRIORITY_META[priority] || PRIORITY_META[5];
  return <span className="task-priority" style={{ background: p.bg+'22', color: p.bg, border:`1px solid ${p.bg}44` }}>{p.label}</span>;
}

function TaskCard({ task, project, onEdit, onDelete }) {
  return (
    <div
      className="task-card"
      draggable
      style={{ borderLeftColor: project?.color || '#ccc' }}
      onDragStart={e => { e.dataTransfer.setData('taskId', task.id); e.dataTransfer.effectAllowed = 'move'; }}
    >
      <PriorityBadge priority={task.priority} />
      <div style={{ flex:1, minWidth:0 }}>
        <div className="task-title">{task.title}</div>
        {task.description && <div className="task-desc">{task.description}</div>}
        {task.attachments?.length > 0 && (
          <div className="task-attachments">
            {task.attachments.map((a, i) =>
              a.url
                ? <a key={i} className="attachment-chip" href={a.url} download={a.name} target="_blank" rel="noopener noreferrer"
                    style={{ textDecoration:'none', cursor:'pointer' }}>
                    📎 {a.name}{a.size ? ` · ${formatSize(a.size)}` : ''}
                  </a>
                : <span key={i} className="attachment-chip">📎 {a.name}</span>
            )}
          </div>
        )}
      </div>
      <div className="task-card-actions">
        <button
          className="task-action-btn"
          title="Edit task"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onEdit(task); }}
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path d="M8.5 1.5a1.207 1.207 0 011.707 1.707L3.5 9.914 1 10.5l.586-2.5L8.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          className="task-action-btn task-action-btn-delete"
          title="Delete task"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${task.title}"?`)) onDelete(task.id); }}
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.5 6.5a.5.5 0 00.5.5h4a.5.5 0 00.5-.5L9 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="drag-handle" title="Drag to calendar">
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="4" cy="3" r="1" fill="currentColor"/><circle cx="8" cy="3" r="1" fill="currentColor"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="8" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="9" r="1" fill="currentColor"/><circle cx="8" cy="9" r="1" fill="currentColor"/></svg>
        </div>
      </div>
    </div>
  );
}

function EditTaskModal({ task, projectColor, onSave, onClose }) {
  const [title,    setTitle]    = useState(task.title);
  const [desc,     setDesc]     = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 3);

  const submit = () => {
    if (!title.trim()) return;
    onSave(task.id, { title: title.trim(), description: desc.trim(), priority });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box animate-in" onClick={e => e.stopPropagation()}
        style={{ width: 440, maxWidth: '92vw', padding: 28, textAlign: 'left' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>Edit Task</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'var(--text-muted)', padding:'0 2px', lineHeight:1 }}>×</button>
        </div>

        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:6 }}>Title</div>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); }}
            style={{ width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', fontSize:14, fontFamily:'inherit', color:'var(--text)', outline:'none' }}
          />
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:6 }}>Description</div>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Add a description…"
            style={{ width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', fontSize:13, fontFamily:'inherit', color:'var(--text)', outline:'none', resize:'none', height:80 }}
          />
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8 }}>Priority</div>
          <div style={{ display:'flex', gap:6 }}>
            {[1,2,3,4,5].map(p => {
              const pm = PRIORITY_META[p];
              return (
                <button key={p}
                  className={`priority-btn${priority === p ? ' active' : ''}`}
                  style={priority === p ? { background: pm.bg } : {}}
                  onClick={() => setPriority(p)}>
                  {pm.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-submit" style={{ background: projectColor || 'var(--text)' }} onClick={submit}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

function CreateTaskForm({ projectId, projectColor, onAdd, onCancel }) {
  const [title,       setTitle]       = useState('');
  const [desc,        setDesc]        = useState('');
  const [priority,    setPriority]    = useState(3);
  const [attachments, setAttachments] = useState([]);
  const fileRef = useRef(null);

  const handleFiles = async (files) => {
    const incoming = Array.from(files);
    const placeholders = incoming.map(f => ({
      _key: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name, uploading: true, error: null,
    }));
    setAttachments(prev => [...prev, ...placeholders]);

    await Promise.all(incoming.map(async (file, i) => {
      const key = placeholders[i]._key;
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

  const submit = () => {
    if (!title.trim()) return;
    const ready = attachments
      .filter(a => !a.uploading && !a.error && a.url)
      .map(({ name, url, size }) => ({ name, url, size }));
    onAdd({ projectId, title: title.trim(), description: desc.trim(), priority, attachments: ready });
    onCancel();
  };

  const uploading = attachments.some(a => a.uploading);

  return (
    <div className="task-form animate-in">
      <input autoFocus placeholder="Task title…" value={title} onChange={e=>setTitle(e.target.value)}
        onKeyDown={e=>{ if(e.key==='Enter' && !uploading) submit(); if(e.key==='Escape') onCancel(); }} />
      <textarea placeholder="Description (optional)" value={desc} onChange={e=>setDesc(e.target.value)} />
      <div className="task-form-row">
        {[1,2,3,4,5].map(p => {
          const pm = PRIORITY_META[p];
          return <button key={p} className={`priority-btn${priority===p?' active':''}`}
            style={priority===p?{background:pm.bg}:{}} onClick={()=>setPriority(p)}>{pm.label}</button>;
        })}
      </div>

      {attachments.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:7 }}>
          {attachments.map(a => (
            <span key={a._key} style={{
              display:'inline-flex', alignItems:'center', gap:4,
              fontSize:11, borderRadius:5, padding:'3px 7px',
              background: a.error ? '#fef2f2' : 'var(--bg)',
              border: `1px solid ${a.error ? '#fca5a5' : 'var(--border)'}`,
              color: a.error ? '#ef4444' : 'var(--text-muted)',
              maxWidth: 180, overflow:'hidden',
            }}>
              {a.uploading
                ? <span style={{ fontSize:10, animation:'spin 1s linear infinite', display:'inline-block' }}>↻</span>
                : a.error ? '✕' : '📎'}
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                {a.error ? a.error : a.name}
              </span>
              {a.size && !a.uploading && !a.error && (
                <span style={{ color:'var(--text-light)', flexShrink:0 }}>{formatSize(a.size)}</span>
              )}
              {!a.uploading && (
                <button onClick={() => removeAttachment(a._key)} style={{
                  background:'none', border:'none', cursor:'pointer', color:'var(--text-light)',
                  padding:0, fontSize:13, lineHeight:1, flexShrink:0, display:'flex',
                }}>×</button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="task-form-row" style={{ marginBottom: 0 }}>
        <button className="btn-attach" onClick={() => fileRef.current?.click()}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9.5 5.5L5.5 9.5a2.5 2.5 0 01-3.5-3.5l4-4A1.5 1.5 0 018 3.5L4 7.5a.5.5 0 01-.7-.7L7 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          Attach
        </button>
        <input ref={fileRef} type="file" multiple style={{ display:'none' }}
          onChange={e => handleFiles(e.target.files)} />
        <div style={{ flex:1 }} />
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-submit" style={{ background: projectColor, opacity: uploading ? 0.6 : 1 }}
          onClick={submit} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Add task'}
        </button>
      </div>
    </div>
  );
}

function ProjectGroup({ project, tasks, calendarTaskIds, onAddTask, onUpdateTask, onDeleteTask, onDeleteProject }) {
  const storageKey = `project-expanded-${project.id}`;
  const [expanded,    setExpanded]    = useState(() => {
    try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
  });
  const [creating,    setCreating]    = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const toggleExpanded = (val) => {
    const next = typeof val === 'function' ? val(expanded) : val;
    setExpanded(next);
    try { localStorage.setItem(storageKey, String(next)); } catch {}
  };

  const projectTasks  = tasks.filter(t => t.projectId === project.id).sort((a,b) => a.priority - b.priority);
  const visibleTasks  = projectTasks.filter(t => !calendarTaskIds.has(t.id));

  return (
    <div className="project-group animate-in">
      <div className="project-header" onClick={() => toggleExpanded(e => !e)}>
        {project.iconUrl
          ? <img src={project.iconUrl} alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
          : <div className="project-emoji" style={{ background:project.color+'22', color:project.color }}>{project.emoji || '◈'}</div>
        }
        <div className="project-name">{project.name}</div>
        <span className="project-count">{visibleTasks.length}</span>
        <button
          className="project-delete-btn"
          title="Delete project"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation();
            if (window.confirm(`Delete project "${project.name}" and all its tasks?`)) {
              onDeleteProject(project.id);
            }
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 3.5h9M5.5 3.5V2.5h2v1M4.5 5.5v4.5M8.5 5.5v4.5M3 3.5l.5 7a.5.5 0 00.5.5h5a.5.5 0 00.5-.5l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={`project-chevron${expanded ? ' open' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      {expanded && (
        <div className="project-tasks">
          {visibleTasks.length === 0 && !creating && <div className="empty-tasks">No tasks — add one below</div>}
          {visibleTasks.map(task => (
            <TaskCard
              key={task.id} task={task} project={project}
              onEdit={setEditingTask}
              onDelete={onDeleteTask}
            />
          ))}
          {creating
            ? <CreateTaskForm projectId={project.id} projectColor={project.color} onAdd={onAddTask} onCancel={() => setCreating(false)} />
            : <button className="btn-add-task" onClick={() => setCreating(true)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Add task
              </button>
          }
        </div>
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          projectColor={project.color}
          onSave={onUpdateTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

function CreateProjectForm({ onAdd, onCancel }) {
  const [name,          setName]          = useState('');
  const [color,         setColor]         = useState(PROJECT_COLORS[0]);
  const [emoji,         setEmoji]         = useState(PROJECT_EMOJIS[0]);
  const [iconMode,      setIconMode]      = useState('emoji');
  const [iconUrl,       setIconUrl]       = useState(null);
  const [iconUploading, setIconUploading] = useState(false);
  const [iconError,     setIconError]     = useState('');
  const iconFileRef = useRef(null);

  const handleIconFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconError(''); setIconUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res  = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setIconUrl(data.url);
    } catch (err) {
      setIconError(err.message);
    } finally {
      setIconUploading(false);
      if (iconFileRef.current) iconFileRef.current.value = '';
    }
  };

  const removeIcon = async () => {
    if (iconUrl) {
      const filename = iconUrl.split('/').pop();
      await fetch(`/api/upload/${filename}`, { method: 'DELETE' });
    }
    setIconUrl(null); setIconError('');
  };

  const submit = () => {
    if (!name.trim() || iconUploading) return;
    onAdd({ name: name.trim(), color, emoji, iconUrl: iconMode === 'image' ? (iconUrl || null) : null });
    onCancel();
  };

  return (
    <div className="new-project-form animate-in">
      <h4>New Project</h4>
      <input className="project-name-input" autoFocus placeholder="Project name…" value={name}
        onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }} />

      <div className="swatch-label">Color</div>
      <div className="color-swatches">
        {PROJECT_COLORS.map(c => <div key={c} className={`color-swatch${color===c?' selected':''}`} style={{ background:c }} onClick={() => setColor(c)} />)}
      </div>

      <div className="swatch-label">Icon</div>
      <div style={{ display:'flex', background:'var(--bg)', borderRadius:8, padding:3, gap:3, marginBottom:12 }}>
        {['emoji','image'].map(m => (
          <button key={m} onClick={() => setIconMode(m)} style={{
            flex:1, padding:'5px 0', borderRadius:6, border:'none', cursor:'pointer',
            fontSize:11, fontWeight:600, fontFamily:'inherit', transition:'all .12s',
            background: iconMode===m ? '#fff' : 'transparent',
            color: iconMode===m ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: iconMode===m ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
          }}>
            {m === 'emoji' ? 'Symbol' : 'Image'}
          </button>
        ))}
      </div>

      {iconMode === 'emoji' ? (
        <div className="emoji-opts" style={{ marginBottom:14 }}>
          {PROJECT_EMOJIS.map(e2 => (
            <div key={e2} className={`emoji-opt${emoji===e2?' selected':''}`}
              style={{ background: emoji===e2 ? color+'33' : 'var(--bg)', color: emoji===e2 ? color : 'var(--text-muted)' }}
              onClick={() => setEmoji(e2)}>{e2}</div>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom:14 }}>
          {iconUrl ? (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <img src={iconUrl} alt="icon preview" style={{ width:48, height:48, borderRadius:10, objectFit:'cover', border:'1px solid var(--border)' }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:'var(--text)', fontWeight:500, marginBottom:4 }}>Icon uploaded</div>
                <button onClick={removeIcon} style={{ fontSize:11, color:'#ef4444', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>Remove</button>
              </div>
            </div>
          ) : (
            <button onClick={() => iconFileRef.current?.click()} disabled={iconUploading} style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:7,
              width:'100%', padding:'28px 0', borderRadius:10,
              border:'1.5px dashed var(--border)', background:'var(--bg)',
              cursor: iconUploading ? 'default' : 'pointer', color:'var(--text-muted)',
              fontSize:13, fontFamily:'inherit', transition:'border-color .15s',
            }}>
              {iconUploading
                ? <><span style={{ fontSize:14, animation:'spin 1s linear infinite', display:'inline-block' }}>↻</span> Uploading…</>
                : <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> Upload image</>
              }
            </button>
          )}
          <input ref={iconFileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleIconFile} />
          {iconError && <div style={{ fontSize:11, color:'#ef4444', marginTop:6 }}>{iconError}</div>}
        </div>
      )}

      <div className="form-actions">
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-submit" style={{ background:color, opacity: iconUploading ? 0.6 : 1 }}
          onClick={submit} disabled={iconUploading}>
          Create Project
        </button>
      </div>
    </div>
  );
}

function NotificationBar({ pendingEntries, tasks, projects, onResolve }) {
  if (!pendingEntries.length) return null;
  return (
    <div className="notif-bar visible">
      <div className="notif-header">
        <div className="notif-header-icon">⏰</div>
        <div className="notif-header-text">Tasks awaiting review</div>
        <div className="notif-header-count">{pendingEntries.length}</div>
      </div>
      <div className="notif-list">
        {pendingEntries.map(en => {
          const task    = tasks.find(t => t.id === en.taskId);
          const project = projects.find(p => p.id === task?.projectId);
          return (
            <div key={en.id} className="notif-item">
              <div className="notif-dot" style={{ background: project?.color || '#ccc' }} />
              <div className="notif-title">{task?.title || 'Unknown task'}</div>
              <div className="notif-time">{formatHour(en.startHour)}–{formatHour(en.endHour)}</div>
              <div className="notif-btns">
                <button className="notif-btn-done" onClick={() => onResolve(en.id, 'done')}>✓ Done</button>
                <button className="notif-btn-fail" onClick={() => onResolve(en.id, 'failed')}>✕ Not done</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TaskPanel({ projects, tasks, calendarTaskIds, onAddTask, onUpdateTask, onDeleteTask, onAddProject, onDeleteProject, pendingEntries, onResolve }) {
  const [creatingProject, setCreatingProject] = useState(false);

  return (
    <div className="task-panel">
      <NotificationBar pendingEntries={pendingEntries} tasks={tasks} projects={projects} onResolve={onResolve} />
      <div className="task-panel-header">
        <div>
          <div className="task-panel-label">Projects</div>
          <div className="task-panel-title">My Tasks</div>
        </div>
        <button className="btn-new-project" onClick={() => setCreatingProject(true)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          New Project
        </button>
      </div>
      <div className="task-list-scroll">
        {creatingProject && <CreateProjectForm onAdd={onAddProject} onCancel={() => setCreatingProject(false)} />}
        {projects.length === 0 && !creatingProject && (
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <div className="empty-text">No projects yet</div>
            <div className="empty-sub">Create a project to get started</div>
          </div>
        )}
        {projects.map(project => (
          <ProjectGroup
            key={project.id}
            project={project} tasks={tasks} calendarTaskIds={calendarTaskIds}
            onAddTask={onAddTask} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask}
            onDeleteProject={onDeleteProject}
          />
        ))}
      </div>
    </div>
  );
}
