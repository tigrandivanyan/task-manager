'use client';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { PRIORITY_META, addDays, parseDate, formatDate, formatDuration, MONTH_NAMES, today as getToday } from '@/lib/constants';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ── Status palette (fixed — never themed) ──
const COLOR_DONE      = '#0ca30c'; // good
const COLOR_PENDING   = '#fab219'; // warning
const COLOR_FAILED    = '#d03b3b'; // critical
const COLOR_NEUTRAL   = '#b0ada6'; // unscheduled / not-done (app's --text-light token)
const COLOR_ACTUAL    = '#8b5cf6'; // app brand accent — actual time worked
const INK_MUTED       = '#9b9890';
const INK_SECONDARY   = '#52514e';
const GRID_LINE       = '#e6e4de';

const FONT = 'inherit';

const RANGE_PRESETS = [
  { key: '7d',  label: '7 days'  },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'all', label: 'All time' },
];

function rangeToDates(preset, customStart, customEnd) {
  if (preset === 'custom') return { start: customStart, end: customEnd };
  const end = getToday();
  if (preset === 'all') return { start: '0000-01-01', end };
  const days = preset === '7d' ? 6 : preset === '30d' ? 29 : 89;
  return { start: addDays(end, -days), end };
}

function compactNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function formatHours(h) {
  if (!h) return '0h';
  return formatDuration(0, h);
}

// Planned block length, regardless of outcome
function plannedDuration(e) {
  return Math.max(0, e.endHour - e.startHour);
}

// Actual time worked — the confirmed actual span if recorded, else the
// planned span for older/quick-resolved done entries, else 0 (not done yet)
function actualDuration(e) {
  if (e.status !== 'done') return 0;
  if (e.actualStartHour != null && e.actualEndHour != null) {
    return Math.max(0, e.actualEndHour - e.actualStartHour);
  }
  return plannedDuration(e);
}

// Day/week/month bucketing — adapts to the selected range so a 7-day view
// reads day-by-day while an all-time view reads month-by-month
function getGranularity(startStr, endStr) {
  const spanDays = (parseDate(endStr) - parseDate(startStr)) / 86400000;
  if (spanDays <= 31) return 'day';
  if (spanDays <= 180) return 'week';
  return 'month';
}

function bucketKey(dateStr, granularity) {
  if (granularity === 'day') return dateStr;
  if (granularity === 'month') return dateStr.slice(0, 7);
  const d = parseDate(dateStr);
  const diffToMonday = (d.getDay() + 6) % 7; // days since most recent Monday
  d.setDate(d.getDate() - diffToMonday);
  return formatDate(d);
}

function bucketLabel(key, granularity) {
  if (granularity === 'day') return key.slice(5);
  if (granularity === 'week') return key.slice(5);
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[Number(m) - 1].slice(0, 3)} ${y}`;
}

function StatTile({ label, value, sub, accent }) {
  return (
    <div className="dash-stat-tile">
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children, legend, wide }) {
  return (
    <div className={`dash-card${wide ? ' dash-card-wide' : ''}`}>
      <div className="dash-card-head">
        <div>
          <div className="dash-card-title">{title}</div>
          {subtitle && <div className="dash-card-subtitle">{subtitle}</div>}
        </div>
        {legend && <div className="dash-legend">{legend}</div>}
      </div>
      {children}
    </div>
  );
}

function LegendSwatch({ color, label }) {
  return (
    <span className="dash-legend-item">
      <span className="dash-legend-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function Dashboard({ tasks, users, entries, onClose }) {
  const [preset, setPreset] = useState('30d');
  const [customStart, setCustomStart] = useState(addDays(getToday(), -29));
  const [customEnd, setCustomEnd] = useState(getToday());

  const { start, end } = useMemo(
    () => rangeToDates(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );

  const filteredEntries = useMemo(
    () => entries.filter(e => e.date >= start && e.date <= end),
    [entries, start, end]
  );

  const taskById = useMemo(() => {
    const m = new Map();
    tasks.forEach(t => m.set(t.id, t));
    return m;
  }, [tasks]);

  const userById = useMemo(() => {
    const m = new Map();
    users.forEach(u => m.set(u.id, u));
    return m;
  }, [users]);

  // ── KPIs ──
  const doneEntries    = filteredEntries.filter(e => e.status === 'done');
  const failedEntries  = filteredEntries.filter(e => e.status === 'failed');
  const pendingEntries = filteredEntries.filter(e => e.status !== 'done' && e.status !== 'failed');
  const resolvedCount  = doneEntries.length + failedEntries.length;
  const completionRate = resolvedCount ? Math.round((doneEntries.length / resolvedCount) * 100) : null;

  // ── Status breakdown donut ──
  const donutSeries = [doneEntries.length, pendingEntries.length, failedEntries.length];
  const donutHasData = donutSeries.some(v => v > 0);

  // ── Priority breakdown (stacked bar) ──
  const priorityStats = useMemo(() => {
    const stats = { 1: { done: 0, notDone: 0 }, 2: { done: 0, notDone: 0 }, 3: { done: 0, notDone: 0 }, 4: { done: 0, notDone: 0 }, 5: { done: 0, notDone: 0 } };
    filteredEntries.forEach(e => {
      const t = taskById.get(e.taskId);
      if (!t) return;
      const p = stats[t.priority] ? t.priority : 5;
      if (e.status === 'done') stats[p].done += 1;
      else stats[p].notDone += 1;
    });
    return stats;
  }, [filteredEntries, taskById]);
  const priorityLabels = [1, 2, 3, 4, 5].map(p => PRIORITY_META[p].label);
  const priorityHasData = Object.values(priorityStats).some(s => s.done + s.notDone > 0);

  // ── Assignee leaderboard ──
  const assigneeStats = useMemo(() => {
    const stats = new Map();
    filteredEntries.forEach(e => {
      const t = taskById.get(e.taskId);
      if (!t || !t.assigneeIds?.length) return;
      t.assigneeIds.forEach(uid => {
        if (!stats.has(uid)) stats.set(uid, { done: 0, notDone: 0 });
        const s = stats.get(uid);
        if (e.status === 'done') s.done += 1;
        else s.notDone += 1;
      });
    });
    return [...stats.entries()]
      .map(([uid, s]) => ({ uid, name: userById.get(uid)?.username || 'Unknown', ...s, total: s.done + s.notDone }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredEntries, taskById, userById]);

  // ── Completion trend over range ──
  const trend = useMemo(() => {
    const days = [];
    // cap trend to at most 120 points for readability
    const startDate = preset === 'all'
      ? (filteredEntries.map(e => e.date).sort()[0] || end)
      : start;
    let cur = startDate;
    let guard = 0;
    while (cur <= end && guard < 120) {
      days.push(cur);
      cur = addDays(cur, 1);
      guard++;
    }
    const countByDay = new Map();
    doneEntries.forEach(e => countByDay.set(e.date, (countByDay.get(e.date) || 0) + 1));
    return days.map(dt => ({ date: dt, count: countByDay.get(dt) || 0 }));
  }, [start, end, preset, filteredEntries, doneEntries]);

  // ── Time spent vs. planned ──
  const totalPlannedHours = filteredEntries.reduce((sum, e) => sum + plannedDuration(e), 0);
  const totalActualHours  = filteredEntries.reduce((sum, e) => sum + actualDuration(e), 0);
  const timeEfficiencyPct = totalPlannedHours ? Math.round((totalActualHours / totalPlannedHours) * 100) : null;

  const timeGranularity = useMemo(() => getGranularity(start, end), [start, end]);

  const timeSeries = useMemo(() => {
    const buckets = new Map(); // key -> { planned, actual }
    filteredEntries.forEach(e => {
      const key = bucketKey(e.date, timeGranularity);
      if (!buckets.has(key)) buckets.set(key, { planned: 0, actual: 0 });
      const b = buckets.get(key);
      b.planned += plannedDuration(e);
      b.actual  += actualDuration(e);
    });
    return [...buckets.keys()]
      .sort()
      .slice(-60) // cap for readability on very wide ranges
      .map(key => ({ key, label: bucketLabel(key, timeGranularity), ...buckets.get(key) }));
  }, [filteredEntries, timeGranularity]);
  const timeSeriesHasData = timeSeries.some(t => t.planned + t.actual > 0);

  // ── Daily time worked — always per-day (unlike the adaptive chart above),
  // so short and long ranges alike answer "how much did I work on day X" ──
  const dailyTime = useMemo(() => {
    const days = [];
    const startDate = preset === 'all'
      ? (filteredEntries.map(e => e.date).sort()[0] || end)
      : start;
    let cur = startDate;
    let guard = 0;
    while (cur <= end && guard < 120) {
      days.push(cur);
      cur = addDays(cur, 1);
      guard++;
    }
    const hoursByDay = new Map();
    filteredEntries.forEach(e => hoursByDay.set(e.date, (hoursByDay.get(e.date) || 0) + actualDuration(e)));
    return days.map(dt => ({ date: dt, hours: hoursByDay.get(dt) || 0 }));
  }, [start, end, preset, filteredEntries]);
  const workingDays = dailyTime.filter(d => d.hours > 0);
  const avgHoursPerWorkingDay = workingDays.length
    ? workingDays.reduce((sum, d) => sum + d.hours, 0) / workingDays.length
    : null;

  const totalTasks = tasks.length;

  return (
    <div className="dash-overlay">
      <div className="dash-header">
        <div>
          <div className="dash-eyebrow">Overview</div>
          <div className="dash-title">Dashboard</div>
        </div>
        <button className="dash-close" onClick={onClose} aria-label="Close dashboard">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 1.5l12 12M13.5 1.5l-12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div className="dash-body">
        {/* Filter row */}
        <div className="dash-filter-row">
          <div className="dash-presets">
            {RANGE_PRESETS.map(p => (
              <button key={p.key} className={`dash-preset-btn${preset === p.key ? ' active' : ''}`} onClick={() => setPreset(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="dash-custom-range">
            <input type="date" value={customStart} max={customEnd}
              onChange={e => { setCustomStart(e.target.value); setPreset('custom'); }} />
            <span className="dash-range-sep">–</span>
            <input type="date" value={customEnd} min={customStart} max={getToday()}
              onChange={e => { setCustomEnd(e.target.value); setPreset('custom'); }} />
          </div>
        </div>

        {/* KPI row */}
        <div className="dash-kpi-row">
          <StatTile label="Total tasks (all time)" value={compactNumber(totalTasks)} />
          <StatTile label="Completed" value={compactNumber(doneEntries.length)} accent={COLOR_DONE} sub={`in selected range`} />
          <StatTile label="Not completed" value={compactNumber(pendingEntries.length + failedEntries.length)} sub={`${pendingEntries.length} pending · ${failedEntries.length} failed`} />
          <StatTile label="Completion rate" value={completionRate === null ? '—' : `${completionRate}%`} sub="of resolved tasks" />
        </div>

        {/* Time KPI row */}
        <div className="dash-kpi-row dash-kpi-row-last">
          <StatTile label="Time planned" value={formatHours(totalPlannedHours)} sub="scheduled block length" />
          <StatTile label="Time spent" value={formatHours(totalActualHours)} accent={COLOR_ACTUAL} sub="on completed tasks" />
          <StatTile
            label="Time efficiency"
            value={timeEfficiencyPct === null ? '—' : `${timeEfficiencyPct}%`}
            accent={timeEfficiencyPct === null ? undefined : (timeEfficiencyPct <= 100 ? COLOR_DONE : COLOR_FAILED)}
            sub="actual vs. planned time"
          />
          <StatTile
            label="Avg. time / working day"
            value={avgHoursPerWorkingDay === null ? '—' : formatHours(avgHoursPerWorkingDay)}
            accent={avgHoursPerWorkingDay === null ? undefined : COLOR_ACTUAL}
            sub={workingDays.length ? `across ${workingDays.length} working day${workingDays.length === 1 ? '' : 's'}` : 'no working days in range'}
          />
        </div>

        {/* Charts */}
        <div className="dash-chart-grid">
          <ChartCard
            title="Status breakdown"
            subtitle="Scheduled tasks in range, by outcome"
            legend={<>
              <LegendSwatch color={COLOR_DONE} label="Done" />
              <LegendSwatch color={COLOR_PENDING} label="Pending" />
              <LegendSwatch color={COLOR_FAILED} label="Failed" />
            </>}
          >
            {donutHasData ? (
              <Chart
                type="donut"
                height={260}
                series={donutSeries}
                options={{
                  labels: ['Done', 'Pending', 'Failed'],
                  colors: [COLOR_DONE, COLOR_PENDING, COLOR_FAILED],
                  legend: { show: false },
                  dataLabels: { enabled: true, style: { fontFamily: FONT, fontWeight: 600 }, dropShadow: { enabled: false } },
                  stroke: { width: 2, colors: ['#fff'] },
                  plotOptions: { pie: { donut: { size: '68%', labels: {
                    show: true,
                    total: { show: true, label: 'Total', fontFamily: FONT, color: INK_MUTED,
                      formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0) },
                    value: { fontFamily: FONT, fontWeight: 700 },
                  } } } },
                  tooltip: { y: { formatter: (v) => `${v} task${v === 1 ? '' : 's'}` } },
                  chart: { fontFamily: FONT },
                }}
              />
            ) : <EmptyChart text="No scheduled tasks in this range" />}
          </ChartCard>

          <ChartCard
            title="Tasks by priority"
            subtitle="Done vs. not done, per priority level"
            legend={<>
              <LegendSwatch color={COLOR_DONE} label="Done" />
              <LegendSwatch color={COLOR_NEUTRAL} label="Not done" />
            </>}
          >
            {priorityHasData ? (
              <Chart
                type="bar"
                height={260}
                series={[
                  { name: 'Done', data: [1, 2, 3, 4, 5].map(p => priorityStats[p].done) },
                  { name: 'Not done', data: [1, 2, 3, 4, 5].map(p => priorityStats[p].notDone) },
                ]}
                options={{
                  chart: { stacked: true, toolbar: { show: false }, fontFamily: FONT },
                  colors: [COLOR_DONE, COLOR_NEUTRAL],
                  plotOptions: { bar: { columnWidth: '46%', borderRadius: 4, borderRadiusApplication: 'end' } },
                  xaxis: { categories: priorityLabels, axisBorder: { color: GRID_LINE }, axisTicks: { show: false }, labels: { style: { colors: INK_MUTED, fontFamily: FONT } } },
                  yaxis: { labels: { style: { colors: INK_MUTED, fontFamily: FONT } } },
                  grid: { borderColor: GRID_LINE, strokeDashArray: 0, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
                  legend: { show: false },
                  dataLabels: { enabled: false },
                  tooltip: { y: { formatter: (v) => `${v} task${v === 1 ? '' : 's'}` } },
                }}
              />
            ) : <EmptyChart text="No scheduled tasks in this range" />}
          </ChartCard>

          <ChartCard
            title="Who's doing more"
            subtitle="Completed tasks per assignee, in range"
            legend={<>
              <LegendSwatch color={COLOR_DONE} label="Done" />
              <LegendSwatch color={COLOR_NEUTRAL} label="Not done" />
            </>}
          >
            {assigneeStats.length ? (
              <Chart
                type="bar"
                height={Math.max(180, assigneeStats.length * 42)}
                series={[
                  { name: 'Done', data: assigneeStats.map(a => a.done) },
                  { name: 'Not done', data: assigneeStats.map(a => a.notDone) },
                ]}
                options={{
                  chart: { stacked: true, toolbar: { show: false }, fontFamily: FONT },
                  colors: [COLOR_DONE, COLOR_NEUTRAL],
                  plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 4, borderRadiusApplication: 'end' } },
                  xaxis: { categories: assigneeStats.map(a => a.name), axisBorder: { color: GRID_LINE }, axisTicks: { show: false }, labels: { style: { colors: INK_MUTED, fontFamily: FONT } } },
                  yaxis: { labels: { style: { colors: INK_SECONDARY, fontFamily: FONT, fontWeight: 500 } } },
                  grid: { borderColor: GRID_LINE, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
                  legend: { show: false },
                  dataLabels: { enabled: false },
                  tooltip: { y: { formatter: (v) => `${v} task${v === 1 ? '' : 's'}` } },
                }}
              />
            ) : <EmptyChart text="No assigned tasks in this range" />}
          </ChartCard>

          <ChartCard
            title="Completions over time"
            subtitle="Tasks marked done, per day"
          >
            {trend.some(t => t.count > 0) ? (
              <Chart
                type="area"
                height={260}
                series={[{ name: 'Completed', data: trend.map(t => t.count) }]}
                options={{
                  chart: { toolbar: { show: false }, fontFamily: FONT, zoom: { enabled: false } },
                  colors: [COLOR_DONE],
                  stroke: { width: 2, curve: 'smooth' },
                  fill: { type: 'gradient', gradient: { opacityFrom: 0.22, opacityTo: 0 } },
                  markers: { size: 0 },
                  xaxis: {
                    categories: trend.map(t => t.date),
                    type: 'category',
                    labels: { style: { colors: INK_MUTED, fontFamily: FONT }, rotate: 0,
                      formatter: (v) => v ? v.slice(5) : v },
                    tickAmount: Math.min(8, trend.length - 1),
                    axisBorder: { color: GRID_LINE }, axisTicks: { show: false },
                  },
                  yaxis: { labels: { style: { colors: INK_MUTED, fontFamily: FONT } }, forceNiceScale: true, min: 0 },
                  grid: { borderColor: GRID_LINE, xaxis: { lines: { show: false } } },
                  dataLabels: { enabled: false },
                  tooltip: { x: { format: 'yyyy-MM-dd' }, y: { formatter: (v) => `${v} completed` } },
                }}
              />
            ) : <EmptyChart text="No completions in this range" />}
          </ChartCard>

          <ChartCard
            title="Daily time worked"
            subtitle={
              workingDays.length
                ? `Actual hours logged per day — avg ${formatHours(avgHoursPerWorkingDay)} on working days`
                : 'Actual hours logged per day'
            }
            wide
          >
            {workingDays.length ? (
              <Chart
                type="area"
                height={260}
                series={[{ name: 'Hours worked', data: dailyTime.map(d => Number(d.hours.toFixed(2))) }]}
                options={{
                  chart: { toolbar: { show: false }, fontFamily: FONT, zoom: { enabled: false } },
                  colors: [COLOR_ACTUAL],
                  stroke: { width: 2, curve: 'smooth' },
                  fill: { type: 'gradient', gradient: { opacityFrom: 0.22, opacityTo: 0 } },
                  markers: { size: 0 },
                  xaxis: {
                    categories: dailyTime.map(d => d.date),
                    type: 'category',
                    labels: { style: { colors: INK_MUTED, fontFamily: FONT }, rotate: 0,
                      formatter: (v) => v ? v.slice(5) : v },
                    tickAmount: Math.min(10, dailyTime.length - 1),
                    axisBorder: { color: GRID_LINE }, axisTicks: { show: false },
                  },
                  yaxis: { labels: { style: { colors: INK_MUTED, fontFamily: FONT }, formatter: (v) => `${v}h` }, forceNiceScale: true, min: 0 },
                  grid: { borderColor: GRID_LINE, xaxis: { lines: { show: false } } },
                  dataLabels: { enabled: false },
                  tooltip: { x: { format: 'yyyy-MM-dd' }, y: { formatter: (v) => formatHours(v) } },
                }}
              />
            ) : <EmptyChart text="No time logged in this range" />}
          </ChartCard>

          <ChartCard
            title="Time spent vs. planned"
            subtitle={
              totalPlannedHours
                ? `Planned ${formatHours(totalPlannedHours)} — actual ${formatHours(totalActualHours)} (${timeEfficiencyPct}% of planned), by ${timeGranularity}`
                : `No scheduled time in this range, by ${timeGranularity}`
            }
            legend={<>
              <LegendSwatch color={COLOR_NEUTRAL} label="Planned" />
              <LegendSwatch color={COLOR_ACTUAL} label="Actual" />
            </>}
            wide
          >
            {timeSeriesHasData ? (
              <Chart
                type="bar"
                height={280}
                series={[
                  { name: 'Planned', data: timeSeries.map(t => Number(t.planned.toFixed(2))) },
                  { name: 'Actual', data: timeSeries.map(t => Number(t.actual.toFixed(2))) },
                ]}
                options={{
                  chart: { toolbar: { show: false }, fontFamily: FONT },
                  colors: [COLOR_NEUTRAL, COLOR_ACTUAL],
                  plotOptions: { bar: { columnWidth: '55%', borderRadius: 4, borderRadiusApplication: 'end' } },
                  xaxis: { categories: timeSeries.map(t => t.label), axisBorder: { color: GRID_LINE }, axisTicks: { show: false }, labels: { style: { colors: INK_MUTED, fontFamily: FONT }, rotate: 0 } },
                  yaxis: { labels: { style: { colors: INK_MUTED, fontFamily: FONT }, formatter: (v) => `${v}h` } },
                  grid: { borderColor: GRID_LINE, strokeDashArray: 0, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
                  legend: { show: false },
                  dataLabels: { enabled: false },
                  tooltip: { y: { formatter: (v) => formatHours(v) } },
                }}
              />
            ) : <EmptyChart text="No scheduled time in this range" />}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ text }) {
  return <div className="dash-empty">{text}</div>;
}
