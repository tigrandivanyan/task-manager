'use client';
import { useState, useRef } from 'react';
import { uid, formatHour, PRIORITY_META, PROJECT_COLORS, PROJECT_EMOJIS } from '@/lib/constants';

function PriorityBadge({ priority }) {
  const p = PRIORITY_META[priority] || PRIORITY_META[5];
  return <span className="task-priority" style={{ background: p.bg+'22', color: p.bg, border:`1px solid ${p.bg}44` }}>{p.label}</span>;
}

function TaskCard({ task, project }) {
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
            {task.attachments.map((a,i) => <span key={i} className="attachment-chip">📎 {a.name}</span>)}
          </div>
        )}
      </div>
      <div className="drag-handle" title="Drag to calendar">
        <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="4" cy="3" r="1" fill="currentColor"/><circle cx="8" cy="3" r="1" fill="currentColor"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="8" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="9" r="1" fill="currentColor"/><circle cx="8" cy="9" r="1" fill="currentColor"/></svg>
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

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ id: uid(), projectId, title: title.trim(), description: desc.trim(), priority, attachments });
    onCancel();
  };

  return (
    <div className="task-form animate-in">
      <input autoFocus placeholder="Task title…" value={title} onChange={e=>setTitle(e.target.value)}
        onKeyDown={e=>{ if(e.key==='Enter') submit(); if(e.key==='Escape') onCancel(); }} />
      <textarea placeholder="Description (optional)" value={desc} onChange={e=>setDesc(e.target.value)} />
      <div className="task-form-row">
        {[1,2,3,4,5].map(p => {
          const pm = PRIORITY_META[p];
          return <button key={p} className={`priority-btn${priority===p?' active':''}`}
            style={priority===p?{background:pm.bg}:{}} onClick={()=>setPriority(p)}>{pm.label}</button>;
        })}
      </div>
      <div className="task-form-row" style={{ marginBottom: 0 }}>
        <button className="btn-attach" onClick={()=>fileRef.current?.click()}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9.5 5.5L5.5 9.5a2.5 2.5 0 01-3.5-3.5l4-4A1.5 1.5 0 018 3.5L4 7.5a.5.5 0 01-.7-.7L7 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          Attach
        </button>
        <input ref={fileRef} type="file" multiple style={{display:'none'}}
          onChange={e=>setAttachments(prev=>[...prev,...Array.from(e.target.files||[]).map(f=>({name:f.name}))])} />
        {attachments.length > 0 && <span style={{fontSize:11,color:'var(--text-muted)'}}>{attachments.length} file{attachments.length!==1?'s':''}</span>}
        <div style={{flex:1}}/>
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-submit" style={{background:projectColor}} onClick={submit}>Add task</button>
      </div>
    </div>
  );
}

function ProjectGroup({ project, tasks, calendarTaskIds, onAddTask }) {
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);

  const projectTasks = tasks.filter(t => t.projectId === project.id).sort((a,b) => a.priority - b.priority);
  const visibleTasks = projectTasks.filter(t => !calendarTaskIds.has(t.id));

  return (
    <div className="project-group animate-in">
      <div className="project-header" onClick={()=>setExpanded(e=>!e)}>
        <div className="project-emoji" style={{background:project.color+'22',color:project.color}}>{project.emoji}</div>
        <div className="project-name">{project.name}</div>
        <span className="project-count">{visibleTasks.length}</span>
        <div className={`project-chevron${expanded?' open':''}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      {expanded && (
        <div className="project-tasks">
          {visibleTasks.length === 0 && !creating && <div className="empty-tasks">No tasks — add one below</div>}
          {visibleTasks.map(task => <TaskCard key={task.id} task={task} project={project} />)}
          {creating
            ? <CreateTaskForm projectId={project.id} projectColor={project.color} onAdd={onAddTask} onCancel={()=>setCreating(false)} />
            : <button className="btn-add-task" onClick={()=>setCreating(true)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Add task
              </button>
          }
        </div>
      )}
    </div>
  );
}

function CreateProjectForm({ onAdd, onCancel }) {
  const [name,  setName]  = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [emoji, setEmoji] = useState(PROJECT_EMOJIS[0]);

  const submit = () => { if (!name.trim()) return; onAdd({id:uid(),name:name.trim(),color,emoji}); onCancel(); };

  return (
    <div className="new-project-form animate-in">
      <h4>New Project</h4>
      <input className="project-name-input" autoFocus placeholder="Project name…" value={name}
        onChange={e=>setName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') submit(); if(e.key==='Escape') onCancel(); }} />
      <div className="swatch-label">Color</div>
      <div className="color-swatches">
        {PROJECT_COLORS.map(c => <div key={c} className={`color-swatch${color===c?' selected':''}`} style={{background:c}} onClick={()=>setColor(c)} />)}
      </div>
      <div className="swatch-label">Icon</div>
      <div className="emoji-opts" style={{marginBottom:14}}>
        {PROJECT_EMOJIS.map(e2 => (
          <div key={e2} className={`emoji-opt${emoji===e2?' selected':''}`}
            style={{background:emoji===e2?color+'33':'var(--bg)',color:emoji===e2?color:'var(--text-muted)'}}
            onClick={()=>setEmoji(e2)}>{e2}</div>
        ))}
      </div>
      <div className="form-actions">
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-submit" style={{background:color}} onClick={submit}>Create Project</button>
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

export default function TaskPanel({ projects, tasks, calendarTaskIds, onAddTask, onAddProject, pendingEntries, onResolve }) {
  const [creatingProject, setCreatingProject] = useState(false);

  return (
    <div className="task-panel">
      <NotificationBar pendingEntries={pendingEntries} tasks={tasks} projects={projects} onResolve={onResolve} />
      <div className="task-panel-header">
        <div>
          <div className="task-panel-label">Projects</div>
          <div className="task-panel-title">My Tasks</div>
        </div>
        <button className="btn-new-project" onClick={()=>setCreatingProject(true)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          New Project
        </button>
      </div>
      <div className="task-list-scroll">
        {creatingProject && <CreateProjectForm onAdd={onAddProject} onCancel={()=>setCreatingProject(false)} />}
        {projects.length === 0 && !creatingProject && (
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <div className="empty-text">No projects yet</div>
            <div className="empty-sub">Create a project to get started</div>
          </div>
        )}
        {projects.map(project => (
          <ProjectGroup key={project.id} project={project} tasks={tasks}
            calendarTaskIds={calendarTaskIds} onAddTask={onAddTask} />
        ))}
      </div>
    </div>
  );
}
