export const HOUR_HEIGHT = 80;
export const DAY_START = 7;
export const DAY_END = 22;
export const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
export const PROJECT_COLORS = ['#8b5cf6','#f59e0b','#10b981','#ef4444','#0ea5e9','#f97316','#ec4899','#14b8a6'];
export const PROJECT_EMOJIS = ['✦','◈','⬡','◉','▲','◆','●','★'];
export const PRIORITY_META = {
  1:{bg:'#ef4444',label:'P1'}, 2:{bg:'#f97316',label:'P2'},
  3:{bg:'#f59e0b',label:'P3'}, 4:{bg:'#10b981',label:'P4'}, 5:{bg:'#6b7280',label:'P5'}
};
export const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const uid        = () => Math.random().toString(36).slice(2,9);
export const formatDate = d => { const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; };
export const parseDate  = s => new Date(s+'T12:00:00');
export const addDays    = (s,n) => { const d=parseDate(s); d.setDate(d.getDate()+n); return formatDate(d); };
export const formatHour = h => { const hh=Math.floor(h),mm=Math.round((h-hh)*60); return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; };
export const today      = () => formatDate(new Date());
export const getNowHour = () => { const n=new Date(); return n.getHours()+n.getMinutes()/60; };
export const load       = (k,fb) => { try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{return fb;} };

export const INIT_PROJECTS = [
  {id:'p1',name:'Design System',color:'#8b5cf6',emoji:'✦'},
  {id:'p2',name:'Frontend Dev', color:'#f59e0b',emoji:'⬡'},
  {id:'p3',name:'Marketing',    color:'#10b981',emoji:'◈'},
];
export const INIT_TASKS = [
  {id:'t1',projectId:'p1',title:'Token audit',         description:'Review all design tokens across components',priority:1,attachments:[]},
  {id:'t2',projectId:'p1',title:'Component lib update',description:'Bump versions, fix deprecations',          priority:2,attachments:[]},
  {id:'t3',projectId:'p2',title:'Fix nav bug',         description:'Nav menu closes unexpectedly on hover',    priority:1,attachments:[]},
  {id:'t4',projectId:'p2',title:'API integration',     description:'Connect to new REST endpoints',            priority:3,attachments:[]},
  {id:'t5',projectId:'p3',title:'Write Q2 blog post',  description:'Product update and roadmap teaser',        priority:2,attachments:[]},
];
