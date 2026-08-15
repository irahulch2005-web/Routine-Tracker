/* ===========================================================
   ROUTINE OS — core app
   Plain JS, localStorage-backed. No build step.
=========================================================== */

const STORAGE_KEY = 'routineOS_v1';
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_NAMES_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const HABITS_DEF = [
  {id:'wake',       name:'Wake up',                 target:'8:00 AM',              icon:'⏰', category:'sleep'},
  {id:'pushups',    name:'Push-ups + skipping',     target:'10 min · min 10 min',  icon:'💪', category:'health'},
  {id:'college',    name:'College',                 target:'attend',               icon:'🎓', category:'academics', collegeOnly:true},
  {id:'study',      name:'Semester study',          target:'daily',                icon:'📖', category:'academics'},
  {id:'coding',     name:'Coding',                  target:'4x/wk · min 20 min',   icon:'💻', category:'coding'},
  {id:'genAlpha',   name:'Gen Alpha',                target:'3x/wk · min 10 min',  icon:'🎯', category:'content'},
  {id:'memestiano', name:'Memestiano',               target:'2x/wk · min 10 min',  icon:'😂', category:'content'},
  {id:'gym',        name:'Gym',                      target:'7x/wk · min 10 min',  icon:'🏋️', category:'health'},
  {id:'steps',      name:'5,000 steps',              target:'daily',               icon:'👣', category:'health'},
  {id:'reading',    name:'Reading',                  target:'daily · min 1 page',  icon:'📚', category:'reading'},
  {id:'sleep',      name:'Sleep ~12:00 AM',          target:'consistency',         icon:'🌙', category:'sleep'},
];

const CATEGORY_COLOR = {
  health:'var(--cat-health)', academics:'var(--cat-academics)', coding:'var(--cat-coding)',
  content:'var(--cat-content)', reading:'var(--cat-reading)', sleep:'var(--cat-sleep)'
};
const CATEGORY_COLOR_DIM = {
  health:'var(--cat-health-dim)', academics:'var(--cat-academics-dim)', coding:'var(--cat-coding-dim)',
  content:'var(--cat-content-dim)', reading:'var(--cat-reading-dim)', sleep:'var(--cat-sleep-dim)'
};

const STATUS_ORDER = ['complete','minimum','partial','skipped'];
const STATUS_LABEL = {complete:'Done', minimum:'Min', partial:'Partial', skipped:'Skip'};
const STATUS_POINTS = {complete:100, minimum:60, partial:30, skipped:0};

const CATEGORY_WEIGHTS = {health:25, academics:25, coding:15, content:15, reading:10, sleep:10};
const CATEGORY_LABEL = {health:'Health/Fitness', academics:'College/Academics', coding:'Coding', content:'Content', reading:'Reading', sleep:'Sleep/routine'};

function defaultBlocks(type){
  if(type === 'college'){
    return [
      {t:'08:00', a:'Wake up + water/bathroom'},
      {t:'08:10', a:'Push-ups + skipping'},
      {t:'08:20', a:'Shower + get ready'},
      {t:'08:50', a:'Leave / reach college'},
      {t:'09:00', a:'College'},
      {t:'16:00', a:'Food + rest/decompress'},
      {t:'17:00', a:'Semester study'},
      {t:'18:00', a:'Coding / Gen Alpha / Memestiano'},
      {t:'19:00', a:'Free time + gym prep'},
      {t:'20:00', a:'Gym'},
      {t:'21:00', a:'Dinner'},
      {t:'21:30', a:'Night walk / steps'},
      {t:'22:15', a:'Reading'},
      {t:'22:30', a:'Free time / entertainment'},
      {t:'23:30', a:'Wind down'},
      {t:'00:00', a:'Sleep'},
    ];
  }
  return [
    {t:'08:00', a:'Wake up + water/bathroom'},
    {t:'08:10', a:'Push-ups + skipping'},
    {t:'08:20', a:'Shower + get ready'},
    {t:'09:00', a:'Breakfast'},
    {t:'09:30', a:'Semester deep study'},
    {t:'11:00', a:'Break'},
    {t:'11:30', a:'Coding'},
    {t:'12:30', a:'Movie / entertainment'},
    {t:'13:30', a:'Lunch'},
    {t:'14:15', a:'Rest / nap'},
    {t:'15:00', a:'Gen Alpha / Memestiano'},
    {t:'16:00', a:'Free time'},
    {t:'17:00', a:'Revision / assignments'},
    {t:'18:00', a:'Free time / movie / friends'},
    {t:'19:15', a:'Gym prep'},
    {t:'20:00', a:'Gym'},
    {t:'21:00', a:'Dinner'},
    {t:'21:30', a:'Night walk / steps'},
    {t:'22:15', a:'Reading'},
    {t:'22:30', a:'Movie/entertainment/free time'},
    {t:'00:00', a:'Sleep'},
  ];
}

function defaultState(){
  return {
    version: 1,
    settings:{
      stepTarget: 5000,
      weeklyTargets:{gym:7, genAlpha:3, memestiano:2, coding:4, reading:7, steps:7, pushups:7}
    },
    routines:{
      college: defaultBlocks('college').map((b,i)=>({id:'c'+i, time:b.t, activity:b.a})),
      nonCollege: defaultBlocks('nonCollege').map((b,i)=>({id:'n'+i, time:b.t, activity:b.a})),
    },
    weekPlan:{Sunday:'nonCollege', Monday:'college', Tuesday:'college', Wednesday:'college', Thursday:'college', Friday:'college', Saturday:'nonCollege'},
    dayOverrides:{},
    days:{},
    subjects:[],
    books:{current:null, completed:[]},
    content:{
      genAlpha:{tasks:[]},
      memestiano:{tasks:[]}
    },
    reflections:{}
  };
}

let STATE = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // merge with defaults to survive schema growth
    const base = defaultState();
    return Object.assign(base, parsed, {
      settings: Object.assign(base.settings, parsed.settings||{}),
      routines: parsed.routines || base.routines,
      weekPlan: Object.assign(base.weekPlan, parsed.weekPlan||{}),
      content: Object.assign(base.content, parsed.content||{}),
      books: parsed.books || base.books,
    });
  }catch(e){
    console.error('Failed to load state', e);
    return defaultState();
  }
}

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
  }catch(e){
    console.error('Failed to save state', e);
    showToast('Could not save — storage may be full');
  }
}

/* ============ DATE HELPERS ============ */
function pad(n){ return n<10 ? '0'+n : ''+n; }
function dateKey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function todayKey(){ return dateKey(new Date()); }
function weekdayName(d){ return DAY_NAMES[d.getDay()]; }

function startOfWeek(d){
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1-day; // week starts Monday
  copy.setDate(copy.getDate()+diff);
  copy.setHours(0,0,0,0);
  return copy;
}
function weekDatesFor(d){
  const start = startOfWeek(d);
  const arr = [];
  for(let i=0;i<7;i++){
    const dd = new Date(start);
    dd.setDate(start.getDate()+i);
    arr.push(dd);
  }
  return arr;
}
function weekKeyFor(d){
  const start = startOfWeek(d);
  return dateKey(start);
}

function getRoutineTypeForDate(dstr){
  if(STATE.dayOverrides[dstr]) return STATE.dayOverrides[dstr];
  const d = new Date(dstr+'T00:00:00');
  return STATE.weekPlan[weekdayName(d)] || 'college';
}

function ensureDay(dstr){
  if(!STATE.days[dstr]){
    const habits = {};
    HABITS_DEF.forEach(h=>{ habits[h.id] = {status:null, note:''}; });
    STATE.days[dstr] = {
      habits,
      steps: 0,
      gymNotes:'',
      entertainment: [],
      codingLogs: [],
      readingPagesLogged: 0,
    };
  }
  return STATE.days[dstr];
}

function timeToMinutes(t){
  const [h,m] = t.split(':').map(Number);
  return h*60+m;
}
function minutesToLabel(mins){
  mins = ((mins%1440)+1440)%1440;
  let h = Math.floor(mins/60), m = mins%60;
  const ampm = h>=12 ? 'PM' : 'AM';
  let h12 = h%12; if(h12===0) h12=12;
  return h12+':'+pad(m)+' '+ampm;
}
function durationLabel(mins){
  if(mins<60) return mins+' min';
  const h = Math.floor(mins/60), m = mins%60;
  return h+'h'+(m?' '+m+'m':'');
}

/* ============ TOAST ============ */
let toastTimer;
function showToast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('is-visible'), 2200);
}

/* ============ SCORING ============ */
function dayCategoryPoints(dstr){
  const day = ensureDay(dstr);
  const type = getRoutineTypeForDate(dstr);
  const applicable = HABITS_DEF.filter(h => !(h.collegeOnly && type!=='college'));
  const byCat = {};
  applicable.forEach(h=>{
    const st = day.habits[h.id] && day.habits[h.id].status;
    const pts = st ? STATUS_POINTS[st] : 0;
    if(!byCat[h.category]) byCat[h.category] = [];
    byCat[h.category].push(pts);
  });
  const avg = {};
  Object.keys(CATEGORY_WEIGHTS).forEach(cat=>{
    const arr = byCat[cat] || [];
    avg[cat] = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  });
  return avg;
}

function overallScoreFromCategories(cats){
  let total = 0;
  Object.keys(CATEGORY_WEIGHTS).forEach(cat=>{
    total += (cats[cat]||0) * (CATEGORY_WEIGHTS[cat]/100);
  });
  return Math.round(total);
}

function weeklyCategoryPoints(dates){
  const sums = {}; Object.keys(CATEGORY_WEIGHTS).forEach(c=>sums[c]=[]);
  dates.forEach(d=>{
    const dstr = dateKey(d);
    if(!STATE.days[dstr]) return;
    const cats = dayCategoryPoints(dstr);
    Object.keys(CATEGORY_WEIGHTS).forEach(c=> sums[c].push(cats[c]));
  });
  const avg = {};
  Object.keys(CATEGORY_WEIGHTS).forEach(c=>{
    avg[c] = sums[c].length ? sums[c].reduce((a,b)=>a+b,0)/sums[c].length : 0;
  });
  return avg;
}

/* ============ NAVIGATION ============ */
const SECTION_TITLES = {
  dashboard:'Dashboard', steps:'Steps', gym:'Gym', coding:'Coding', study:'Semester study',
  genalpha:'Gen Alpha', memestiano:'Memestiano', reading:'Reading', entertainment:'Entertainment',
  calendar:'This week', review:'Weekly review', settings:'Settings'
};

function switchSection(sec){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('is-active'));
  document.getElementById('view-'+sec).classList.add('is-active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('is-active', n.dataset.section===sec));
  document.getElementById('topbarTitle').textContent = SECTION_TITLES[sec] || sec;
  closeSidebar();
  renderAll();
}

function openSidebar(){
  document.getElementById('sidebar').classList.add('is-open');
  document.getElementById('sidebarScrim').classList.add('is-visible');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('is-open');
  document.getElementById('sidebarScrim').classList.remove('is-visible');
}

/* ============ DAY TYPE TOGGLES ============ */
function setDayType(type){
  STATE.dayOverrides[todayKey()] = type;
  saveState();
  syncDayTypeToggles();
  renderAll();
}
function syncDayTypeToggles(){
  const type = getRoutineTypeForDate(todayKey());
  document.querySelectorAll('.daytype-toggle').forEach(group=>{
    if(group.id === 'settingsRoutinePicker') return; // independent, driven separately
    group.querySelectorAll('.daytype-btn').forEach(btn=>{
      btn.classList.toggle('is-active', btn.dataset.type===type);
    });
  });
}

/* ============ RIGHT NOW / TIMELINE ============ */
function computeRightNow(){
  const type = getRoutineTypeForDate(todayKey());
  const blocks = STATE.routines[type].slice().sort((a,b)=>timeToMinutes(a.time)-timeToMinutes(b.time));
  const now = new Date();
  const nowMin = now.getHours()*60 + now.getMinutes();

  let currentIdx = -1;
  for(let i=0;i<blocks.length;i++){
    if(timeToMinutes(blocks[i].time) <= nowMin) currentIdx = i;
  }
  if(currentIdx === -1) currentIdx = blocks.length-1; // wraps from previous day (e.g. Sleep block)

  const current = blocks[currentIdx];
  const nextIdx = (currentIdx+1) % blocks.length;
  const next = blocks[nextIdx];

  let nextStart = timeToMinutes(next.time);
  let diff = nextStart - nowMin;
  if(diff <= 0) diff += 1440;

  return {type, blocks, current, next, nowMin, minsUntilNext:diff};
}

function renderRightNow(){
  const {type, current, next, minsUntilNext, blocks} = computeRightNow();
  const now = new Date();
  document.getElementById('rnDate').textContent = now.toLocaleDateString('en-US', {weekday:'long', month:'short', day:'numeric'});
  document.getElementById('rnActivity').textContent = current.activity;
  document.getElementById('rnSub').textContent = 'since ' + minutesToLabel(timeToMinutes(current.time));
  document.getElementById('rnNextActivity').textContent = next.activity;
  document.getElementById('rnNextTime').textContent = minutesToLabel(timeToMinutes(next.time)) + ' · in ' + durationLabel(minsUntilNext);
  document.getElementById('sidebarDate').textContent = now.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'}) + ' · ' + (type==='college'?'College Day':'Non-College Day');

  // timeline: continuous loop anchored at 08:00
  const anchor = 8*60;
  let nowMapped = now.getHours()*60+now.getMinutes();
  if(nowMapped < anchor) nowMapped += 1440;
  const pct = ((nowMapped-anchor)/1440)*100;
  document.getElementById('timelineTrack').style.width = Math.max(0,Math.min(100,pct))+'%';
  document.getElementById('timelineMarker').style.left = Math.max(0,Math.min(100,pct))+'%';

  syncDayTypeToggles();
}

/* ============ HABIT GRID (dashboard) ============ */
function makeStatusButtons(dstr, habitId, extraClass){
  const wrap = document.createElement('div');
  wrap.className = 'status-btns' + (extraClass?' '+extraClass:'');
  const day = ensureDay(dstr);
  const current = day.habits[habitId] ? day.habits[habitId].status : null;
  STATUS_ORDER.forEach(st=>{
    const btn = document.createElement('button');
    btn.className = 'status-btn' + (current===st ? ' is-selected' : '');
    btn.dataset.state = st;
    btn.textContent = STATUS_LABEL[st];
    btn.addEventListener('click', ()=>{
      const d = ensureDay(dstr);
      if(!d.habits[habitId]) d.habits[habitId] = {status:null, note:''};
      d.habits[habitId].status = (d.habits[habitId].status === st) ? null : st;
      saveState();
      renderAll();
      if(d.habits[habitId].status){
        showToast(niceStatusMessage(habitId, d.habits[habitId].status));
      }
    });
    wrap.appendChild(btn);
  });
  return wrap;
}

function niceStatusMessage(habitId, status){
  const h = HABITS_DEF.find(x=>x.id===habitId);
  const name = h ? h.name : habitId;
  if(status==='complete') return name+' — done.';
  if(status==='minimum') return name+' — minimum version completed.';
  if(status==='partial') return name+' — partial, logged.';
  return name+' — not completed today. Continue tomorrow.';
}

function renderHabitGrid(){
  const grid = document.getElementById('habitGrid');
  grid.innerHTML = '';
  const dstr = todayKey();
  const type = getRoutineTypeForDate(dstr);
  const habits = HABITS_DEF.filter(h => !(h.collegeOnly && type!=='college'));
  let doneWeight = 0, totalWeight = habits.length;
  const day = ensureDay(dstr);

  habits.forEach(h=>{
    const card = document.createElement('div');
    card.className = 'habit-card';
    card.style.setProperty('--cat-color', CATEGORY_COLOR[h.category]);
    card.style.setProperty('--cat-color-dim', CATEGORY_COLOR_DIM[h.category]);
    const st = day.habits[h.id] ? day.habits[h.id].status : null;
    if(st) card.dataset.status = st;
    if(st) doneWeight += (STATUS_POINTS[st]/100);

    const top = document.createElement('div');
    top.className = 'habit-top';
    top.innerHTML = `<div class="habit-icon">${h.icon}</div><div class="habit-name">${h.name}</div>`;
    const target = document.createElement('div');
    target.className = 'habit-target';
    target.textContent = h.target;
    top.appendChild(target);
    card.appendChild(top);

    card.appendChild(makeStatusButtons(dstr, h.id));

    const noteBtn = document.createElement('button');
    noteBtn.className = 'habit-note-toggle';
    const hasNote = day.habits[h.id] && day.habits[h.id].note;
    noteBtn.textContent = hasNote ? '✎ note added' : '+ note';
    const noteInput = document.createElement('textarea');
    noteInput.className = 'habit-note-input';
    noteInput.style.display = hasNote ? 'block' : 'none';
    noteInput.value = day.habits[h.id] ? (day.habits[h.id].note||'') : '';
    noteInput.placeholder = 'Optional note...';
    noteBtn.addEventListener('click', ()=>{
      noteInput.style.display = noteInput.style.display==='none' ? 'block' : 'none';
    });
    noteInput.addEventListener('change', ()=>{
      const d = ensureDay(dstr);
      if(!d.habits[h.id]) d.habits[h.id] = {status:null, note:''};
      d.habits[h.id].note = noteInput.value;
      saveState();
    });
    card.appendChild(noteBtn);
    card.appendChild(noteInput);

    grid.appendChild(card);
  });

  const pct = totalWeight ? Math.round((doneWeight/totalWeight)*100) : 0;
  document.getElementById('todayProgress').textContent = pct+'% today';
}

/* ============ STEPS ============ */
function setSteps(val){
  const dstr = todayKey();
  const d = ensureDay(dstr);
  d.steps = Math.max(0, Math.round(val));
  const target = STATE.settings.stepTarget;
  if(!d.habits.steps) d.habits.steps = {status:null, note:''};
  if(d.steps >= target) d.habits.steps.status = 'complete';
  else if(d.steps >= target*0.5) d.habits.steps.status = 'minimum';
  else if(d.steps > 0) d.habits.steps.status = 'partial';
  else d.habits.steps.status = null;
  saveState();
  renderAll();
}

function renderSteps(){
  const dstr = todayKey();
  const d = ensureDay(dstr);
  const target = STATE.settings.stepTarget;
  const pct = Math.min(1, d.steps/target);

  [['stepsRing','stepsValue',326.7],['stepsRingFull','stepsValueFull',439.8]].forEach(([ringId,valId,circumference])=>{
    const ring = document.getElementById(ringId);
    if(!ring) return;
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference*(1-pct);
    document.getElementById(valId).textContent = d.steps.toLocaleString();
  });

  // history: last 7 days
  const histEl = document.getElementById('stepsHistory');
  if(histEl){
    histEl.innerHTML = '';
    const days = lastNDates(7);
    days.forEach(dt=>{
      const ds = dateKey(dt);
      const steps = STATE.days[ds] ? STATE.days[ds].steps : 0;
      const col = document.createElement('div');
      col.className = 'bar-col';
      const h = Math.max(3, Math.round((steps/target)*60));
      col.innerHTML = `<div class="bar-fill" style="height:${h}px"></div><div class="bar-day-label">${DAY_NAMES_SHORT[dt.getDay()]}</div>`;
      histEl.appendChild(col);
    });
  }
}

function lastNDates(n){
  const arr = [];
  const now = new Date();
  for(let i=n-1;i>=0;i--){
    const dd = new Date(now);
    dd.setDate(now.getDate()-i);
    arr.push(dd);
  }
  return arr;
}

/* ============ GYM ============ */
function renderGym(){
  const dstr = todayKey();
  const btnsWrap = document.getElementById('gymStatusBtns');
  if(btnsWrap){
    btnsWrap.innerHTML = '';
    btnsWrap.appendChild(makeStatusButtons(dstr, 'gym'));
  }
  const notesEl = document.getElementById('gymNotes');
  if(notesEl){
    const d = ensureDay(dstr);
    notesEl.value = d.gymNotes || '';
    notesEl.oninput = ()=>{ ensureDay(dstr).gymNotes = notesEl.value; saveState(); };
  }

  const week = weekDatesFor(new Date());
  let count = 0, streak = 0;
  week.forEach(dt=>{
    const ds = dateKey(dt);
    const st = STATE.days[ds] && STATE.days[ds].habits.gym && STATE.days[ds].habits.gym.status;
    if(st && st!=='skipped') count++;
  });
  // streak counting backward from today
  let cursor = new Date();
  while(true){
    const ds = dateKey(cursor);
    const st = STATE.days[ds] && STATE.days[ds].habits.gym && STATE.days[ds].habits.gym.status;
    if(st && st!=='skipped'){ streak++; cursor.setDate(cursor.getDate()-1); }
    else break;
  }
  const gwc = document.getElementById('gymWeekCount');
  if(gwc) gwc.textContent = count+'/'+STATE.settings.weeklyTargets.gym;
  const gs = document.getElementById('gymStreak');
  if(gs) gs.textContent = streak;

  const histEl = document.getElementById('gymHistory');
  if(histEl){
    histEl.innerHTML = '';
    lastNDates(7).forEach(dt=>{
      const ds = dateKey(dt);
      const st = STATE.days[ds] && STATE.days[ds].habits.gym && STATE.days[ds].habits.gym.status;
      const h = st ? Math.max(6, STATUS_POINTS[st]*0.6) : 3;
      const col = document.createElement('div');
      col.className = 'bar-col';
      col.innerHTML = `<div class="bar-fill" style="height:${h}px; background:${st?'var(--teal)':'var(--surface-2)'}"></div><div class="bar-day-label">${DAY_NAMES_SHORT[dt.getDay()]}</div>`;
      histEl.appendChild(col);
    });
  }
}

/* ============ CODING ============ */
function renderCoding(){
  const dstr = todayKey();
  const btnsWrap = document.getElementById('codingStatusBtns');
  if(btnsWrap){ btnsWrap.innerHTML=''; btnsWrap.appendChild(makeStatusButtons(dstr,'coding')); }

  const saveBtn = document.getElementById('codingSave');
  if(saveBtn && !saveBtn._bound){
    saveBtn._bound = true;
    saveBtn.addEventListener('click', ()=>{
      const topic = document.getElementById('codingTopic').value.trim();
      const duration = parseInt(document.getElementById('codingDuration').value)||0;
      const project = document.getElementById('codingProject').value.trim();
      const learned = document.getElementById('codingLearned').value.trim();
      if(!topic && !duration){ showToast('Add a topic or duration first'); return; }
      const d = ensureDay(dstr);
      d.codingLogs.push({topic, duration, project, learned, ts:Date.now()});
      if(!d.habits.coding) d.habits.coding = {status:null,note:''};
      if(duration >= 20 && !d.habits.coding.status) d.habits.coding.status = duration>=45?'complete':'minimum';
      document.getElementById('codingTopic').value='';
      document.getElementById('codingDuration').value='';
      document.getElementById('codingProject').value='';
      document.getElementById('codingLearned').value='';
      saveState();
      renderAll();
      showToast('Session saved');
    });
  }

  const logEl = document.getElementById('codingLog');
  if(logEl){
    logEl.innerHTML = '';
    const d = ensureDay(dstr);
    const all = [];
    lastNDates(7).forEach(dt=>{
      const ds = dateKey(dt);
      (STATE.days[ds]?STATE.days[ds].codingLogs:[]||[]).forEach(l=> all.push(Object.assign({date:ds},l)));
    });
    all.sort((a,b)=>b.ts-a.ts);
    if(!all.length){ logEl.innerHTML = '<div class="log-empty">No sessions logged yet.</div>'; }
    all.slice(0,10).forEach(l=>{
      const item = document.createElement('div');
      item.className = 'log-item';
      item.innerHTML = `<div class="log-item-top"><span>${l.topic||'Coding session'}</span><span>${l.duration?l.duration+' min':''}</span></div>
        <div class="log-item-meta">${l.date}${l.project?' · '+l.project:''}</div>
        ${l.learned?`<div style="margin-top:4px;">${escapeHtml(l.learned)}</div>`:''}`;
      logEl.appendChild(item);
    });
  }
}

function escapeHtml(s){
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/* ============ STUDY / SUBJECTS ============ */
function renderStudy(){
  const grid = document.getElementById('subjectGrid');
  if(!grid) return;
  grid.innerHTML = '';
  if(!STATE.subjects.length){
    grid.innerHTML = '<div class="log-empty">No subjects yet — add one to start tracking sessions.</div>';
  }
  STATE.subjects.forEach(s=>{
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `
      <div class="subject-top">
        <div class="subject-name">${escapeHtml(s.name)}</div>
        <button class="subject-del" title="Delete">✕</button>
      </div>
      <div class="subject-meta">
        <span class="tag">${s.difficulty}</span>
        <span class="tag">${s.priority} priority</span>
        <span class="tag">${s.assignedDay}</span>
      </div>
      <div class="subject-stats">
        <div>Sessions <b>${s.sessionsCompleted}</b></div>
        <div>Time <b>${durationLabel(s.totalTime)}</b></div>
      </div>
      <select class="revision-select full-input">
        <option ${s.revisionStatus==='Not started'?'selected':''}>Not started</option>
        <option ${s.revisionStatus==='In progress'?'selected':''}>In progress</option>
        <option ${s.revisionStatus==='Revised'?'selected':''}>Revised</option>
      </select>
      <textarea class="notes-input subj-notes" placeholder="Notes...">${escapeHtml(s.notes||'')}</textarea>
      <div class="form-row">
        <input type="number" class="log-minutes" placeholder="Minutes studied">
        <button class="btn btn--primary log-session-btn">Log session</button>
      </div>
    `;
    card.querySelector('.subject-del').addEventListener('click', ()=>{
      if(confirm('Delete '+s.name+'?')){
        STATE.subjects = STATE.subjects.filter(x=>x.id!==s.id);
        saveState(); renderAll();
      }
    });
    card.querySelector('.revision-select').addEventListener('change', e=>{
      s.revisionStatus = e.target.value; saveState();
    });
    card.querySelector('.subj-notes').addEventListener('change', e=>{
      s.notes = e.target.value; saveState();
    });
    card.querySelector('.log-session-btn').addEventListener('click', ()=>{
      const mins = parseInt(card.querySelector('.log-minutes').value)||0;
      if(mins<=0){ showToast('Enter minutes first'); return; }
      s.sessionsCompleted++;
      s.totalTime += mins;
      card.querySelector('.log-minutes').value='';
      const dstr = todayKey();
      const d = ensureDay(dstr);
      if(!d.habits.study) d.habits.study = {status:null,note:''};
      d.habits.study.status = mins>=45 ? 'complete' : (mins>=20 ? 'minimum' : 'partial');
      saveState(); renderAll();
      showToast('Session logged for '+s.name);
    });
    grid.appendChild(card);
  });
}

document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'addSubjectBtn'){
    const name = prompt('Subject name?');
    if(!name) return;
    const difficulty = prompt('Difficulty (Easy / Medium / Hard)?','Medium') || 'Medium';
    const priority = prompt('Priority (Low / Medium / High)?','Medium') || 'Medium';
    const assignedDay = prompt('Assign to which day? (e.g. Monday)','Monday') || 'Monday';
    STATE.subjects.push({
      id:'s'+Date.now(), name, difficulty, priority, assignedDay,
      sessionsCompleted:0, totalTime:0, notes:'', revisionStatus:'Not started'
    });
    saveState(); renderAll();
  }
});

/* ============ CONTENT (Gen Alpha / Memestiano) ============ */
function weeklySessionCount(habitId){
  const week = weekDatesFor(new Date());
  let count = 0;
  week.forEach(dt=>{
    const ds = dateKey(dt);
    const st = STATE.days[ds] && STATE.days[ds].habits[habitId] && STATE.days[ds].habits[habitId].status;
    if(st && st!=='skipped') count++;
  });
  return count;
}

function renderContentProject(key, tasksElId, targetElId, targetVal, stageSelectId, taskTextId, addBtnId, habitId){
  const tasksEl = document.getElementById(tasksElId);
  const count = weeklySessionCount(habitId);
  document.getElementById(targetElId).textContent = count+'/'+targetVal+' this week';

  tasksEl.innerHTML = '';
  const tasks = STATE.content[key].tasks;
  if(!tasks.length){ tasksEl.innerHTML = '<div class="log-empty">No tasks yet.</div>'; }
  tasks.slice().reverse().forEach(t=>{
    const row = document.createElement('div');
    row.className = 'task-row';
    row.innerHTML = `
      <span class="task-stage">${t.stage}</span>
      <span class="task-text ${t.done?'is-done':''}">${escapeHtml(t.text)}</span>
      <button class="task-check ${t.done?'is-checked':''}"></button>
      <button class="task-del">✕</button>
    `;
    row.querySelector('.task-check').addEventListener('click', ()=>{
      t.done = !t.done;
      saveState(); renderAll();
    });
    row.querySelector('.task-del').addEventListener('click', ()=>{
      STATE.content[key].tasks = STATE.content[key].tasks.filter(x=>x.id!==t.id);
      saveState(); renderAll();
    });
    tasksEl.appendChild(row);
  });

  const addBtn = document.getElementById(addBtnId);
  if(addBtn && !addBtn._bound){
    addBtn._bound = true;
    addBtn.addEventListener('click', ()=>{
      const text = document.getElementById(taskTextId).value.trim();
      if(!text) return;
      const stage = document.getElementById(stageSelectId).value;
      STATE.content[key].tasks.push({id:'t'+Date.now(), stage, text, done:false});
      document.getElementById(taskTextId).value='';
      saveState(); renderAll();
    });
  }
}

/* ============ READING ============ */
function renderReading(){
  const dstr = todayKey();
  const book = STATE.books.current;
  const display = document.getElementById('currentBookDisplay');
  const pagesRow = document.getElementById('pagesTodayRow');

  if(book){
    display.innerHTML = `<div style="margin-top:8px; font-weight:600;">${escapeHtml(book.title)}</div>
      <div class="hint" style="margin:4px 0 0; text-align:left;">${book.currentPage} / ${book.totalPages} pages</div>`;
    pagesRow.style.display = 'flex';
  } else {
    display.innerHTML = '<div class="log-empty">No current book set.</div>';
    pagesRow.style.display = 'none';
  }

  const setBtn = document.getElementById('setCurrentBook');
  if(setBtn && !setBtn._bound){
    setBtn._bound = true;
    setBtn.addEventListener('click', ()=>{
      const title = document.getElementById('bookTitle').value.trim();
      const totalPages = parseInt(document.getElementById('bookTotalPages').value)||0;
      if(!title){ showToast('Enter a title'); return; }
      STATE.books.current = {title, totalPages: totalPages||0, currentPage:0};
      document.getElementById('bookTitle').value='';
      document.getElementById('bookTotalPages').value='';
      saveState(); renderAll();
    });
  }

  const logBtn = document.getElementById('logPagesBtn');
  if(logBtn && !logBtn._bound){
    logBtn._bound = true;
    logBtn.addEventListener('click', ()=>{
      const pages = parseInt(document.getElementById('pagesToday').value)||0;
      if(pages<=0){ showToast('Enter pages read'); return; }
      const d = ensureDay(dstr);
      d.readingPagesLogged += pages;
      if(!d.habits.reading) d.habits.reading = {status:null,note:''};
      d.habits.reading.status = pages>=10 ? 'complete' : 'minimum';
      if(STATE.books.current){
        STATE.books.current.currentPage += pages;
        if(STATE.books.current.totalPages && STATE.books.current.currentPage >= STATE.books.current.totalPages){
          STATE.books.completed.push({title:STATE.books.current.title, dateCompleted: dstr});
          STATE.books.current = null;
          showToast('Book completed — ' + STATE.books.completed[STATE.books.completed.length-1].title);
        }
      }
      document.getElementById('pagesToday').value='';
      saveState(); renderAll();
    });
  }

  // streak
  let streak = 0, cursor = new Date();
  while(true){
    const ds = dateKey(cursor);
    const st = STATE.days[ds] && STATE.days[ds].habits.reading && STATE.days[ds].habits.reading.status;
    if(st && st!=='skipped'){ streak++; cursor.setDate(cursor.getDate()-1); } else break;
  }
  document.getElementById('readingStreak').textContent = streak;
  document.getElementById('booksCompleted').textContent = STATE.books.completed.length;

  const booksLog = document.getElementById('booksLog');
  booksLog.innerHTML = '';
  if(!STATE.books.completed.length){ booksLog.innerHTML = '<div class="log-empty">None yet.</div>'; }
  STATE.books.completed.slice().reverse().forEach(b=>{
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `<div class="log-item-top"><span>${escapeHtml(b.title)}</span></div><div class="log-item-meta">${b.dateCompleted}</div>`;
    booksLog.appendChild(item);
  });
}

/* ============ ENTERTAINMENT ============ */
function renderEntertainment(){
  const dstr = todayKey();
  const addBtn = document.getElementById('entAdd');
  if(addBtn && !addBtn._bound){
    addBtn._bound = true;
    addBtn.addEventListener('click', ()=>{
      const type = document.getElementById('entType').value;
      const minutes = parseInt(document.getElementById('entMinutes').value)||0;
      const notes = document.getElementById('entNotes').value.trim();
      if(minutes<=0){ showToast('Enter minutes'); return; }
      const d = ensureDay(dstr);
      d.entertainment.push({type, minutes, notes, ts:Date.now()});
      document.getElementById('entMinutes').value='';
      document.getElementById('entNotes').value='';
      saveState(); renderAll();
    });
  }

  const logEl = document.getElementById('entLog');
  const d = ensureDay(dstr);
  logEl.innerHTML = '';
  if(!d.entertainment.length){ logEl.innerHTML = '<div class="log-empty">Nothing logged today yet.</div>'; }
  d.entertainment.slice().reverse().forEach(e=>{
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `<div class="log-item-top"><span>${e.type}</span><span>${durationLabel(e.minutes)}</span></div>${e.notes?`<div class="log-item-meta">${escapeHtml(e.notes)}</div>`:''}`;
    logEl.appendChild(item);
  });

  let weekMins = 0;
  weekDatesFor(new Date()).forEach(dt=>{
    const ds = dateKey(dt);
    if(STATE.days[ds]) weekMins += STATE.days[ds].entertainment.reduce((a,x)=>a+x.minutes,0);
  });
  document.getElementById('entWeekTotal').textContent = (weekMins/60).toFixed(1)+'h';
}

/* ============ CALENDAR ============ */
function renderCalendar(){
  const grid = document.getElementById('weekGrid');
  if(!grid) return;
  grid.innerHTML = '';
  const week = weekDatesFor(new Date());
  const todayStr = todayKey();

  week.forEach(dt=>{
    const ds = dateKey(dt);
    const dayName = weekdayName(dt);
    const type = getRoutineTypeForDate(ds);
    const col = document.createElement('div');
    col.className = 'week-day' + (ds===todayStr?' is-today':'');

    const assignedSubject = STATE.subjects.find(s=>s.assignedDay===dayName);

    col.innerHTML = `
      <div class="week-day-name">${DAY_NAMES_SHORT[dt.getDay()]} <span style="color:var(--text-faint); font-weight:400;">${dt.getDate()}</span></div>
      <div class="week-day-type">${type==='college'?'College':'No college'}</div>
      <div class="week-day-field"><label>Study subject</label><div>${assignedSubject?escapeHtml(assignedSubject.name):'—'}</div></div>
    `;
    col.querySelector('.week-day-type').addEventListener('click', ()=>{
      STATE.dayOverrides[ds] = type==='college' ? 'nonCollege' : 'college';
      saveState(); renderAll();
    });
    grid.appendChild(col);
  });
}

/* ============ WEEKLY REVIEW ============ */
function renderReview(){
  const grid = document.getElementById('reviewGrid');
  if(!grid) return;
  const week = weekDatesFor(new Date());
  const cats = weeklyCategoryPoints(week);
  const overall = overallScoreFromCategories(cats);

  let completed=0, minimum=0, missed=0, gym=0, study=0, coding=0, genAlpha=0, memestiano=0, readingDays=0, stepDays=0, dailyScores=[], focusedMins=0, entMins=0;

  week.forEach(dt=>{
    const ds = dateKey(dt);
    const day = STATE.days[ds];
    if(!day) { dailyScores.push(0); return; }
    const type = getRoutineTypeForDate(ds);
    const applicable = HABITS_DEF.filter(h => !(h.collegeOnly && type!=='college'));
    applicable.forEach(h=>{
      const st = day.habits[h.id] && day.habits[h.id].status;
      if(st==='complete') completed++;
      else if(st==='minimum') minimum++;
      else if(!st || st==='skipped') missed++;
    });
    if(day.habits.gym && day.habits.gym.status && day.habits.gym.status!=='skipped') gym++;
    if(day.habits.study && day.habits.study.status && day.habits.study.status!=='skipped') study++;
    if(day.habits.coding && day.habits.coding.status && day.habits.coding.status!=='skipped') coding++;
    if(day.habits.genAlpha && day.habits.genAlpha.status && day.habits.genAlpha.status!=='skipped') genAlpha++;
    if(day.habits.memestiano && day.habits.memestiano.status && day.habits.memestiano.status!=='skipped') memestiano++;
    if(day.habits.reading && day.habits.reading.status && day.habits.reading.status!=='skipped') readingDays++;
    if(day.steps >= STATE.settings.stepTarget) stepDays++;
    dailyScores.push(overallScoreFromCategories(dayCategoryPoints(ds)));
    focusedMins += (day.codingLogs||[]).reduce((a,x)=>a+(x.duration||0),0);
    entMins += (day.entertainment||[]).reduce((a,x)=>a+x.minutes,0);
  });
  STATE.subjects.forEach(s=>{}); // subjects time already counted separately if desired

  const avgDaily = Math.round(dailyScores.reduce((a,b)=>a+b,0)/dailyScores.length);

  const items = [
    ['Overall consistency', overall+'%'],
    ['Avg daily completion', avgDaily+'%'],
    ['Habits completed', completed],
    ['Minimum completed', minimum],
    ['Missed', missed],
    ['Gym sessions', gym+'/'+STATE.settings.weeklyTargets.gym],
    ['Study sessions', study],
    ['Coding sessions', coding+'/'+STATE.settings.weeklyTargets.coding],
    ['Gen Alpha sessions', genAlpha+'/'+STATE.settings.weeklyTargets.genAlpha],
    ['Memestiano sessions', memestiano+'/'+STATE.settings.weeklyTargets.memestiano],
    ['Reading days', readingDays+'/7'],
    ['5k-step days', stepDays+'/7'],
    ['Focused work time', durationLabel(focusedMins)],
    ['Entertainment time', (entMins/60).toFixed(1)+'h'],
  ];
  grid.innerHTML = '';
  items.forEach(([label,val])=>{
    const el = document.createElement('div');
    el.className = 'review-stat';
    el.innerHTML = `<div class="review-stat-num">${val}</div><div class="review-stat-label">${label}</div>`;
    grid.appendChild(el);
  });

  // reflection
  const wk = weekKeyFor(new Date());
  const existing = STATE.reflections[wk] || {good:'',struggle:'',change:'',protect:''};
  document.getElementById('reflectGood').value = existing.good;
  document.getElementById('reflectStruggle').value = existing.struggle;
  document.getElementById('reflectChange').value = existing.change;
  document.getElementById('reflectProtect').value = existing.protect;

  const saveBtn = document.getElementById('saveReflection');
  if(saveBtn && !saveBtn._bound){
    saveBtn._bound = true;
    saveBtn.addEventListener('click', ()=>{
      const key = weekKeyFor(new Date());
      STATE.reflections[key] = {
        good: document.getElementById('reflectGood').value,
        struggle: document.getElementById('reflectStruggle').value,
        change: document.getElementById('reflectChange').value,
        protect: document.getElementById('reflectProtect').value,
      };
      saveState();
      showToast('Reflection saved');
    });
  }
}

/* ============ SIDE PANEL: score + weeksnap ============ */
function renderSidePanels(){
  const dstr = todayKey();
  const cats = dayCategoryPoints(dstr);
  const overall = overallScoreFromCategories(cats);
  const scoreBig = document.getElementById('scoreBig');
  if(scoreBig) scoreBig.textContent = overall+'%';

  const barsEl = document.getElementById('scoreBars');
  if(barsEl){
    barsEl.innerHTML = '';
    Object.keys(CATEGORY_WEIGHTS).forEach(cat=>{
      const row = document.createElement('div');
      row.className = 'score-bar-row';
      row.innerHTML = `<div class="score-bar-label">${CATEGORY_LABEL[cat]}</div>
        <div class="score-bar-track"><div class="score-bar-fill" style="width:${Math.round(cats[cat])}%; background:${CATEGORY_COLOR[cat]}"></div></div>
        <div class="score-bar-pct">${Math.round(cats[cat])}%</div>`;
      barsEl.appendChild(row);
    });
  }

  const snapEl = document.getElementById('weekSnap');
  if(snapEl){
    snapEl.innerHTML = '';
    const rows = [
      ['Gym', weeklySessionCount('gym'), STATE.settings.weeklyTargets.gym],
      ['Gen Alpha', weeklySessionCount('genAlpha'), STATE.settings.weeklyTargets.genAlpha],
      ['Memestiano', weeklySessionCount('memestiano'), STATE.settings.weeklyTargets.memestiano],
      ['Coding', weeklySessionCount('coding'), STATE.settings.weeklyTargets.coding],
      ['Reading', weeklySessionCount('reading'), 7],
      ['5k steps', weeklySessionCount('steps'), 7],
    ];
    rows.forEach(([label,val,target])=>{
      const row = document.createElement('div');
      row.className = 'weeksnap-row';
      row.innerHTML = `<span class="weeksnap-label">${label}</span><span class="weeksnap-val">${val}/${target}</span>`;
      snapEl.appendChild(row);
    });
  }
}

/* ============ SETTINGS ============ */
let settingsRoutineType = 'college';

function renderSettings(){
  const editor = document.getElementById('scheduleEditor');
  if(!editor) return;
  editor.innerHTML = '';
  const blocks = STATE.routines[settingsRoutineType].slice().sort((a,b)=>timeToMinutes(a.time)-timeToMinutes(b.time));
  blocks.forEach(b=>{
    const row = document.createElement('div');
    row.className = 'schedule-row';
    row.innerHTML = `<input type="time" class="time-input" value="${b.time}">
      <input type="text" class="activity-input" value="${escapeHtml(b.activity)}">
      <button title="Delete">✕</button>`;
    row.querySelector('.time-input').addEventListener('change', e=>{ b.time = e.target.value; saveState(); renderAll(); });
    row.querySelector('.activity-input').addEventListener('change', e=>{ b.activity = e.target.value; saveState(); renderAll(); });
    row.querySelector('button').addEventListener('click', ()=>{
      STATE.routines[settingsRoutineType] = STATE.routines[settingsRoutineType].filter(x=>x.id!==b.id);
      saveState(); renderAll();
    });
    editor.appendChild(row);
  });

  document.getElementById('settingsStepTarget').value = STATE.settings.stepTarget;

  const targetsEl = document.getElementById('targetsEditor');
  if(targetsEl && !targetsEl._built){
    targetsEl._built = true;
    const labels = {gym:'Gym', genAlpha:'Gen Alpha', memestiano:'Memestiano', coding:'Coding', reading:'Reading', steps:'Steps', pushups:'Push-ups/skipping'};
    targetsEl.innerHTML = '';
    Object.keys(labels).forEach(key=>{
      const row = document.createElement('div');
      row.className = 'target-row';
      row.innerHTML = `<span>${labels[key]} (per week)</span><input type="number" data-key="${key}" value="${STATE.settings.weeklyTargets[key]}">`;
      row.querySelector('input').addEventListener('change', e=>{
        STATE.settings.weeklyTargets[key] = parseInt(e.target.value)||0;
        saveState(); renderAll();
      });
      targetsEl.appendChild(row);
    });
  }
}

/* ============ MASTER RENDER ============ */
function renderAll(){
  renderRightNow();
  renderHabitGrid();
  renderSteps();
  renderSidePanels();
  renderGym();
  renderCoding();
  renderStudy();
  renderContentProject('genAlpha','genAlphaTasks','genAlphaTarget',STATE.settings.weeklyTargets.genAlpha,'genAlphaStage','genAlphaTaskText','genAlphaAdd','genAlpha');
  renderContentProject('memestiano','memestianoTasks','memestianoTarget',STATE.settings.weeklyTargets.memestiano,'memestianoStage','memestianoTaskText','memestianoAdd','memestiano');
  renderReading();
  renderEntertainment();
  renderCalendar();
  renderReview();
  renderSettings();
}

/* ============ EXPORT / IMPORT ============ */
function exportData(){
  const blob = new Blob([JSON.stringify(STATE,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'routine-os-backup-'+todayKey()+'.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exported');
}
function importData(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      STATE = Object.assign(defaultState(), parsed);
      saveState();
      renderAll();
      showToast('Backup imported');
    }catch(e){
      showToast('Invalid backup file');
    }
  };
  reader.readAsText(file);
}

/* ============ WIRE UP ============ */
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=> switchSection(btn.dataset.section));
  });
  document.getElementById('hamburger').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('sidebarScrim').addEventListener('click', closeSidebar);

  document.querySelectorAll('#daytypeToggleSidebar .daytype-btn, #daytypeToggleMain .daytype-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> setDayType(btn.dataset.type));
  });

  document.getElementById('settingsRoutinePicker').querySelectorAll('.daytype-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      settingsRoutineType = btn.dataset.type;
      document.getElementById('settingsRoutinePicker').querySelectorAll('.daytype-btn').forEach(b=>b.classList.toggle('is-active', b===btn));
      renderSettings();
    });
  });

  document.getElementById('addBlockBtn').addEventListener('click', ()=>{
    const id = (settingsRoutineType==='college'?'c':'n')+Date.now();
    STATE.routines[settingsRoutineType].push({id, time:'12:00', activity:'New block'});
    saveState(); renderAll();
  });

  document.getElementById('settingsStepTarget').addEventListener('change', e=>{
    STATE.settings.stepTarget = parseInt(e.target.value)||5000;
    saveState(); renderAll();
  });

  // steps quick add (both mini + full cards)
  document.querySelectorAll('.steps-quickadd button[data-add]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const dstr = todayKey();
      const d = ensureDay(dstr);
      const add = parseInt(btn.dataset.add);
      if(btn.textContent.startsWith('Set')) setSteps(add);
      else setSteps(d.steps + add);
    });
  });
  document.getElementById('stepsManualSet').addEventListener('click', ()=>{
    const val = parseInt(document.getElementById('stepsManualInput').value)||0;
    setSteps(val);
    document.getElementById('stepsManualInput').value='';
  });
  document.getElementById('stepsReset').addEventListener('click', ()=> setSteps(0));

  // export/import (both topbar + settings)
  [document.getElementById('exportBtn'), document.getElementById('exportBtn2')].forEach(b=> b && b.addEventListener('click', exportData));
  [document.getElementById('importBtn'), document.getElementById('importBtn2')].forEach(b=> b && b.addEventListener('click', ()=> document.getElementById('importFile').click()));
  document.getElementById('importFile').addEventListener('change', e=>{
    if(e.target.files[0]) importData(e.target.files[0]);
  });

  document.getElementById('resetAllBtn').addEventListener('click', ()=>{
    if(confirm('This clears all data on this device. Continue?')){
      STATE = defaultState();
      saveState();
      renderAll();
      showToast('All data reset');
    }
  });

  renderAll();
  setInterval(renderRightNow, 30000); // keep "right now" live
});
