'use client';
import { useState, useRef } from 'react';
import {
  HOUR_HEIGHT, DAY_START, DAY_END, HOURS,
  DAY_NAMES, MONTH_NAMES,
  formatHour, addDays, parseDate,
  today as getToday, getNowHour, uid,
} from '@/lib/constants';

const formatDuration = (s, e) => {
  const mins = Math.round((e - s) * 60);
  const h = Math.floor(mins / 60), m = mins % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
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

function CalendarTaskBlock({ entry, task, project, layout, onUpdate, onRemove }) {
  const color     = project?.color || '#8b5cf6';
  const top       = (entry.startHour - DAY_START) * HOUR_HEIGHT;
  const height    = Math.max((entry.endHour - entry.startHour) * HOUR_HEIGHT, 28);
  const isSmall   = height < 52;
  const isTiny    = height < 34;
  const { col = 0, numCols = 1 } = layout || {};
  const widthPct  = 100 / numCols;
  const leftPct   = col * widthPct;
  const isResolved = entry.status === 'done' || entry.status === 'failed';

  const handleMoveDown = (e) => {
    if (isResolved) return;
    e.preventDefault();
    const startY = e.clientY, startHour = entry.startHour, dur = entry.endHour - entry.startHour;
    const onMove = ev => {
      const delta = (ev.clientY - startY) / HOUR_HEIGHT;
      const newStart = Math.min(DAY_END - dur, Math.max(DAY_START, startHour + Math.round(delta*4)/4));
      onUpdate({ ...entry, startHour: newStart, endHour: newStart + dur });
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleResizeDown = (e) => {
    if (isResolved) return;
    e.stopPropagation(); e.preventDefault();
    const startY = e.clientY, startEnd = entry.endHour;
    const onMove = ev => {
      const delta = (ev.clientY - startY) / HOUR_HEIGHT;
      const newEnd = Math.min(DAY_END, Math.max(entry.startHour + 0.25, startEnd + Math.round(delta*4)/4));
      onUpdate({ ...entry, endHour: newEnd });
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className={`cal-task-block${entry.status === 'done' ? ' status-done' : entry.status === 'failed' ? ' status-failed' : ''}`}
      style={{ top, height, background: color, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, right: 'auto' }}
      onMouseDown={handleMoveDown}
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
        <button className="cal-task-remove" onMouseDown={e=>e.stopPropagation()} onClick={() => onRemove(entry.id)}>×</button>
        <div className="cal-task-resize" onMouseDown={handleResizeDown} />
      </>}
    </div>
  );
}

function HourGrid({ entries, tasks, projects, selectedDate, onAddEntry, onUpdateEntry, onRemoveEntry }) {
  const gridRef = useRef(null);
  const [ghost, setGhost] = useState(null);
  const currentToday = getToday();
  const isToday = selectedDate === currentToday;
  const nowHour = getNowHour();

  const getHour = (clientY) => {
    const rect = gridRef.current.getBoundingClientRect();
    const raw  = DAY_START + (clientY - rect.top) / HOUR_HEIGHT;
    return Math.min(DAY_END - 1, Math.max(DAY_START, Math.round(raw * 4) / 4));
  };

  const dayEntries = entries.filter(e => e.date === selectedDate);
  const layout = computeLayout(dayEntries);

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
        onAddEntry({ id: uid(), taskId, date: selectedDate, startHour: h, endHour: Math.min(DAY_END, h + 1) });
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
            />
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPanel({ entries, tasks, projects, onAddEntry, onUpdateEntry, onRemoveEntry }) {
  const currentToday = getToday();
  const [selectedDate, setSelectedDate] = useState(currentToday);
  const [weekOffset,   setWeekOffset]   = useState(0);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(currentToday, weekOffset * 7 + i));
  const selD  = parseDate(selectedDate);
  const monthLabel = MONTH_NAMES[selD.getMonth()] + ' ' + selD.getFullYear();

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
        <div className="date-list">
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
          />
        </div>
      </div>
    </div>
  );
}
