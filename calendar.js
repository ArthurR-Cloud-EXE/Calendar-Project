// Modern calendar with day-level tasks stored in localStorage (ISO date keys)
const weekdaysEl = document.getElementById('weekdays');
const daysEl = document.getElementById('days');
const monthLabel = document.getElementById('monthLabel');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const dayPanel = document.getElementById('dayPanel');
const dayTitle = document.getElementById('dayTitle');
const tasksList = document.getElementById('tasksList');
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskStartTimeInput = document.getElementById('taskStartTime');
const taskEndTimeInput = document.getElementById('taskEndTime');
const taskNoteInput = document.getElementById('taskNoteInput');
const taskCourierSelect = document.getElementById('taskCourierSelect');
const taskTrackingInput = document.getElementById('taskTrackingInput');
const closePanel = document.getElementById('closePanel');

const taskTagsContainer = document.getElementById('taskTagsContainer');

const ALL_TAGS = ['Personal', 'Birthday', 'Appointment', 'Reminder', 'Shopping', 'Bills', 'Health', 'Travel', 'Social', 'URGENT Task'];

const TAG_COLORS = {
  'Personal': { bg: '#e0f2fe', fg: '#0369a1', darkBg: 'rgba(14, 165, 233, 0.15)', darkFg: '#7dd3fc' },
  'Birthday': { bg: '#fce7f3', fg: '#be185d', darkBg: 'rgba(236, 72, 153, 0.15)', darkFg: '#f9a8d4' },
  'Appointment': { bg: '#e0e7ff', fg: '#4338ca', darkBg: 'rgba(99, 102, 241, 0.15)', darkFg: '#a5b4fc' },
  'Reminder': { bg: '#f1f5f9', fg: '#475569', darkBg: 'rgba(148, 163, 184, 0.15)', darkFg: '#cbd5e1' },
  'Shopping': { bg: '#dcfce7', fg: '#15803d', darkBg: 'rgba(34, 197, 94, 0.15)', darkFg: '#86efac' },
  'Bills': { bg: '#ffedd5', fg: '#ea580c', darkBg: 'rgba(234, 88, 12, 0.15)', darkFg: '#fed7aa', border: '1px solid #ea580c' },
  'Health': { bg: '#ccfbf1', fg: '#0f766e', darkBg: 'rgba(20, 184, 166, 0.15)', darkFg: '#99f6e4' },
  'Travel': { bg: '#f3e8ff', fg: '#6b21a8', darkBg: 'rgba(168, 85, 247, 0.15)', darkFg: '#d8b4fe' },
  'Social': { bg: '#fae8ff', fg: '#a21caf', darkBg: 'rgba(217, 70, 239, 0.15)', darkFg: '#f5d0fe', border: '1px solid #d946ef' },
  'URGENT Task': { bg: '#fee2e2', fg: '#b91c1c', darkBg: 'rgba(239, 68, 68, 0.2)', darkFg: '#fca5a5', border: '1px solid #ef4444' }
};

let selectedAddTags = new Set();

function renderAddTags() {
  if (!taskTagsContainer) return;
  taskTagsContainer.innerHTML = '';
  ALL_TAGS.forEach(tag => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tag-toggle-btn';
    if (selectedAddTags.has(tag)) {
      btn.classList.add('active');
    }
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      if (selectedAddTags.has(tag)) {
        selectedAddTags.delete(tag);
      } else {
        selectedAddTags.add(tag);
      }
      renderAddTags();
    });
    taskTagsContainer.appendChild(btn);
  });
}

const COURIERS = {
  'Star Track': {
    name: 'Star Track',
    url: (no) => `https://startrack.com.au/track/details/${encodeURIComponent(no)}`
  },
  'Australia Post': {
    name: 'Australia Post',
    url: (no) => `https://auspost.com.au/mypost/track/#/details/${encodeURIComponent(no)}`
  },
  'Toll': {
    name: 'Toll',
    url: (no) => `https://www.mytoll.com/track?consignmentNumber=${encodeURIComponent(no)}`
  },
  'TNT': {
    name: 'TNT',
    url: (no) => `https://www.tnt.com/express/en_au/site/shipping-tools/tracking.html?cons=${encodeURIComponent(no)}`
  },
  'DHL': {
    name: 'DHL',
    url: (no) => `https://www.dhl.com/au-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(no)}`
  },
  'FedEx': {
    name: 'FedEx',
    url: (no) => `https://www.fedex.com/apps/fedextrack/?tracknumbers=${encodeURIComponent(no)}`
  },
  'CouriersPlease': {
    name: 'CouriersPlease',
    url: (no) => `https://www.couriersplease.com.au/Tools/Track/Tracking-Results?consignment=${encodeURIComponent(no)}`
  },
  'Aramex': {
    name: 'Aramex',
    url: (no) => `https://www.aramex.com.au/tools/track/?l=${encodeURIComponent(no)}`
  }
};
const themeToggle = document.getElementById('themeToggle');
const formDayLabel = document.getElementById('formDayLabel');

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.body.classList.add('dark-mode');
}

let view = new Date();
let selectedDate = isoDate(view); // Initialize to today's date
let editingNoteIndex = null;

// LocalStorage helpers
function getTasksMap(){
  return JSON.parse(localStorage.getItem('tasksMap')||'{}');
}
function saveTasksMap(m){ localStorage.setItem('tasksMap', JSON.stringify(m)); }

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const hrs = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  if (isNaN(hrs) || isNaN(mins)) return null;
  return hrs * 60 + mins;
}

function getClashingTaskIndices(dayTasks) {
  const clashingIndices = new Set();
  const timeTasks = [];

  dayTasks.forEach((t, index) => {
    if (t.isReport || !t.startTime) return;
    const start = timeToMinutes(t.startTime);
    if (start === null) return;
    
    // Default duration is 60 minutes if endTime is not set
    const end = t.endTime ? timeToMinutes(t.endTime) : start + 60;
    if (end === null) return;

    timeTasks.push({ index, start, end });
  });

  // Compare each pair for overlap (start_A < end_B && start_B < end_A)
  for (let i = 0; i < timeTasks.length; i++) {
    for (let j = i + 1; j < timeTasks.length; j++) {
      const a = timeTasks[i];
      const b = timeTasks[j];
      if (a.start < b.end && b.start < a.end) {
        clashingIndices.add(a.index);
        clashingIndices.add(b.index);
      }
    }
  }
  return clashingIndices;
}

function parseTimestamp(tsStr) {
  if (!tsStr) return new Date(0);
  const currentYear = new Date().getFullYear();
  const parsed = Date.parse(`${tsStr} ${currentYear}`);
  return isNaN(parsed) ? new Date(0) : new Date(parsed);
}

function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T' + (timeStr || '00:00') + ':00');
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function migrateTrackingAddedAt() {
  const m = getTasksMap();
  let modified = false;
  
  for (const dateStr in m) {
    if (Array.isArray(m[dateStr])) {
      m[dateStr].forEach(task => {
        if (task && typeof task === 'object') {
          if (task.trackingNo && !task.trackingAddedAt) {
            let timeStr = task.startTime || '09:00';
            task.trackingAddedAt = formatDateTime(dateStr, timeStr);
            modified = true;
          }
        }
      });
    }
  }
  
  if (modified) {
    saveTasksMap(m);
  }
}
migrateTrackingAddedAt();

function formatJourneyDate(d) {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const w = weekdays[d.getDay()];
  const day = d.getDate();
  const m = months[d.getMonth()];
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  
  return `${w} ${day} ${m}, ${hours}.${minutes}${ampm}`;
}

function getTrackingJourney(task, taskDateStr) {
  const courier = (task.courier || 'Star Track').trim();
  const trackingNo = task.trackingNo;
  if (!trackingNo) return [];

  let baseDate = new Date(taskDateStr + 'T00:00:00');
  if (task.trackingAddedAt) {
    const parsed = parseTimestamp(task.trackingAddedAt);
    if (parsed && parsed.getTime() > 0) {
      baseDate = parsed;
      baseDate.setHours(0, 0, 0, 0);
    }
  }

  function setTime(date, h, m) {
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  let rawMilestones = [];

  // ── Star Track ─────────────────────────────────────────────────────────────
  if (courier === 'Star Track') {
    rawMilestones = [
      {
        stage: 'sender',
        status: 'Label created by sender',
        details: 'Shipping information received by Star Track',
        time: setTime(baseDate, 9, 53)
      },
      {
        stage: 'sender',
        status: 'Label created by sender',
        details: 'Shipping information approved by Star Track',
        time: setTime(baseDate, 10, 0)
      },
      {
        stage: 'got_it',
        status: "We've got it",
        details: 'Picked up from Sender – SILVERWATER NSW',
        time: setTime(baseDate, 11, 38)
      },
      {
        stage: 'transit',
        status: "It's on its way",
        details: 'In transit – CHULLORA NSW',
        time: setTime(baseDate, 12, 0)
      },
      {
        stage: 'transit',
        status: "It's on its way",
        details: 'Item processed at sorting facility – SYDNEY NSW',
        time: setTime(baseDate, 15, 12)
      },
      {
        stage: 'transit',
        status: "It's on its way",
        details: 'Item processed at sorting facility – SYDNEY NSW',
        time: setTime(baseDate, 15, 14)
      },
      {
        stage: 'transit',
        status: "It's on its way",
        details: 'Item processed at sorting facility – BRISBANE QLD',
        time: setTime(addDays(baseDate, 1), 8, 36)
      },
      {
        stage: 'today',
        status: "It's coming today",
        details: 'Onboard for delivery – DARRA QLD',
        time: setTime(addDays(baseDate, 1), 10, 17)
      },
      {
        stage: 'delivered',
        status: 'Delivered',
        details: 'Delivered – MOUNT OMMANEY QLD',
        time: setTime(addDays(baseDate, 1), 11, 35)
      }
    ];

  // ── Australia Post ─────────────────────────────────────────────────────────
  } else if (courier === 'Australia Post') {
    rawMilestones = [
      {
        stage: 'sender',
        status: 'Shipping label created',
        details: 'Sender has created a shipping label for this item',
        time: setTime(baseDate, 9, 41)
      },
      {
        stage: 'got_it',
        status: 'Parcel received',
        details: 'We have received your parcel – SYDNEY NSW',
        time: setTime(baseDate, 11, 15)
      },
      {
        stage: 'transit',
        status: 'Your parcel is on its way',
        details: 'Parcel processed at Australia Post facility – SYDNEY NSW',
        time: setTime(baseDate, 13, 22)
      },
      {
        stage: 'transit',
        status: 'Your parcel is on its way',
        details: 'In transit to next facility – STRATHFIELD NSW',
        time: setTime(baseDate, 16, 5)
      },
      {
        stage: 'transit',
        status: 'Your parcel is on its way',
        details: 'Parcel processed at Australia Post facility – BRISBANE QLD',
        time: setTime(addDays(baseDate, 1), 7, 48)
      },
      {
        stage: 'transit',
        status: 'Your parcel is on its way',
        details: 'In transit to delivery facility – ARCHERFIELD QLD',
        time: setTime(addDays(baseDate, 1), 9, 10)
      },
      {
        stage: 'today',
        status: 'Out for delivery',
        details: 'Your parcel is with our delivery driver – DARRA QLD',
        time: setTime(addDays(baseDate, 1), 10, 33)
      },
      {
        stage: 'delivered',
        status: 'Delivered',
        details: 'Your parcel has been delivered – MOUNT OMMANEY QLD',
        time: setTime(addDays(baseDate, 1), 11, 51)
      }
    ];

  // ── Generic fallback (Toll, TNT, DHL, FedEx, etc.) ─────────────────────────
  } else {
    rawMilestones = [
      {
        stage: 'sender',
        status: 'Shipment booked',
        details: `Shipment booked with ${courier}`,
        time: setTime(baseDate, 9, 30)
      },
      {
        stage: 'got_it',
        status: 'Collected',
        details: `Parcel collected by ${courier} – SYDNEY NSW`,
        time: setTime(baseDate, 11, 0)
      },
      {
        stage: 'transit',
        status: 'In transit',
        details: `In transit – ${courier} facility – SYDNEY NSW`,
        time: setTime(baseDate, 14, 0)
      },
      {
        stage: 'transit',
        status: 'In transit',
        details: `In transit – ${courier} facility – BRISBANE QLD`,
        time: setTime(addDays(baseDate, 1), 8, 0)
      },
      {
        stage: 'today',
        status: 'Out for delivery',
        details: `With delivery driver – DARRA QLD`,
        time: setTime(addDays(baseDate, 1), 10, 0)
      },
      {
        stage: 'delivered',
        status: 'Delivered',
        details: `Delivered – MOUNT OMMANEY QLD`,
        time: setTime(addDays(baseDate, 1), 11, 30)
      }
    ];
  }

  const now = new Date();
  return rawMilestones.map(m => {
    const isUnlocked = now.getTime() >= m.time.getTime();
    return {
      stage: m.stage,
      status: m.status,
      details: m.details,
      timestamp: m.time,
      formattedTime: formatJourneyDate(m.time),
      unlocked: isUnlocked
    };
  });
}

function renderJourneyUI(container, task, dateStr) {
  const courierName   = (task.courier || 'Star Track').trim();
  const trackingNo    = (task.trackingNo || '').trim();
  const courierConfig = COURIERS[courierName] || COURIERS['Star Track'];
  const trackingUrl   = courierConfig.url(trackingNo);

  // Courier-specific colours & icons
  const courierMeta = {
    'Star Track':      { icon: '⭐', color: '#e50000', lightBg: '#fff1f1', darkBg: 'rgba(229,0,0,0.12)' },
    'Australia Post':  { icon: '🇦🇺', color: '#e8182a', lightBg: '#fff1f1', darkBg: 'rgba(232,24,42,0.12)' },
    'Toll':            { icon: '🚛', color: '#f5821f', lightBg: '#fff7ee', darkBg: 'rgba(245,130,31,0.12)' },
    'TNT':             { icon: '📦', color: '#ff6200', lightBg: '#fff4ee', darkBg: 'rgba(255,98,0,0.12)' },
    'DHL':             { icon: '📫', color: '#ffcc00', lightBg: '#fffbee', darkBg: 'rgba(255,204,0,0.12)' },
    'FedEx':           { icon: '📮', color: '#4d148c', lightBg: '#f5f0ff', darkBg: 'rgba(77,20,140,0.12)' },
    'CouriersPlease':  { icon: '🚚', color: '#0072bc', lightBg: '#eef6ff', darkBg: 'rgba(0,114,188,0.12)' },
    'Aramex':          { icon: '🌐', color: '#e10014', lightBg: '#fff1f1', darkBg: 'rgba(225,0,20,0.12)' },
  };
  const meta = courierMeta[courierName] || { icon: '🚚', color: 'var(--primary)', lightBg: 'var(--primary-light)', darkBg: 'rgba(79,70,229,0.12)' };

  container.innerHTML = `
    <div class="tracking-card">
      <div class="tracking-card-icon" style="background:${meta.lightBg}; color:${meta.color};">${meta.icon}</div>
      <div class="tracking-card-body">
        <div class="tracking-card-courier">${courierName}</div>
        <div class="tracking-card-number">${trackingNo}</div>
        <button class="tracking-card-btn" id="trackOpenBtn" style="background:${meta.color};">
          🌐 Open Tracking Page
        </button>
        <div class="tracking-card-hint">Opens the live tracking page in your browser</div>
      </div>
    </div>
  `;

  container.querySelector('#trackOpenBtn').addEventListener('click', () => {
    window.open(trackingUrl, '_blank', 'noopener,noreferrer');
  });
}

const monthsList = [

  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function initNavSelects() {
  const monthSelect = document.getElementById('monthSelect');
  const yearSelect = document.getElementById('yearSelect');
  if (!monthSelect || !yearSelect) return;

  // Populate months
  monthSelect.innerHTML = '';
  monthsList.forEach((m, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = m;
    monthSelect.appendChild(opt);
  });

  // Populate years (e.g. 2020 to 2035)
  yearSelect.innerHTML = '';
  for (let y = 2020; y <= 2035; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }

  // Add event listeners
  monthSelect.addEventListener('change', () => {
    view.setMonth(parseInt(monthSelect.value, 10));
    renderCalendar(view);
  });

  yearSelect.addEventListener('change', () => {
    view.setFullYear(parseInt(yearSelect.value, 10));
    renderCalendar(view);
  });
}

function tasksFor(dateStr){
  const m=getTasksMap();
  const raw = m[dateStr]||[];
  // Normalize string-only tasks to objects for backward compatibility
  const normalized = raw.map(item => {
    if (typeof item === 'string') {
      return { text: item, completed: false, note: '', courier: 'Star Track', trackingNo: '', subtasks: [], startTime: '', endTime: '', tags: [], isReport: false, incidents: [] };
    }
    if (item && typeof item === 'object') {
      if (!('note' in item)) item.note = '';
      if (!('courier' in item)) item.courier = 'Star Track';
      if (!('trackingNo' in item)) item.trackingNo = '';
      if (!('subtasks' in item)) {
        item.subtasks = [];
      } else {
        item.subtasks.forEach(st => {
          if (st && typeof st === 'object') {
            if (!('completedAt' in st)) st.completedAt = '';
          }
        });
      }
      if (!('startTime' in item)) item.startTime = '';
      if (!('endTime' in item)) item.endTime = '';
      if (!('tags' in item)) item.tags = [];
      if (!('isReport' in item)) item.isReport = false;
      if (!('incidents' in item)) item.incidents = [];
    }
    return item;
  });

  // Sort tasks: Urgent tasks first, then chronologically by start time. Tasks without a start time go last.
  normalized.sort((a, b) => {
    const isUrgentA = a.tags && a.tags.includes('URGENT Task') ? 1 : 0;
    const isUrgentB = b.tags && b.tags.includes('URGENT Task') ? 1 : 0;
    if (isUrgentA !== isUrgentB) {
      return isUrgentB - isUrgentA;
    }
    const timeA = a.startTime || '';
    const timeB = b.startTime || '';
    if (timeA && timeB) {
      return timeA.localeCompare(timeB);
    }
    if (timeA) return -1;
    if (timeB) return 1;
    return 0;
  });

  return normalized;
}

function setTasksFor(dateStr, arr){
  if (arr && arr.length > 0) {
    arr.sort((a, b) => {
      const isUrgentA = a.tags && a.tags.includes('URGENT Task') ? 1 : 0;
      const isUrgentB = b.tags && b.tags.includes('URGENT Task') ? 1 : 0;
      if (isUrgentA !== isUrgentB) {
        return isUrgentB - isUrgentA;
      }
      const timeA = a.startTime || '';
      const timeB = b.startTime || '';
      if (timeA && timeB) {
        return timeA.localeCompare(timeB);
      }
      if (timeA) return -1;
      if (timeB) return 1;
      return 0;
    });
  }
  const m=getTasksMap();
  m[dateStr]=arr;
  saveTasksMap(m);
}

function isoDate(d){
  // Generate date string in local timezone YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function renderCalendar(date){
  weekdaysEl.innerHTML='';
  daysEl.innerHTML='';
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthSelect = document.getElementById('monthSelect');
  const yearSelect = document.getElementById('yearSelect');
  if (monthSelect) monthSelect.value = month;
  if (yearSelect) {
    let exists = false;
    for (let i = 0; i < yearSelect.options.length; i++) {
      if (parseInt(yearSelect.options[i].value, 10) === year) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = year;
      opt.textContent = year;
      let inserted = false;
      for (let i = 0; i < yearSelect.options.length; i++) {
        if (parseInt(yearSelect.options[i].value, 10) > year) {
          yearSelect.add(opt, i);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        yearSelect.appendChild(opt);
      }
    }
    yearSelect.value = year;
  }
  
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0 (Sun) - 6
  const daysInMonth = new Date(year, month+1,0).getDate();
  
  // Header for weekdays
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  weekdays.forEach(w=>{
    const c=document.createElement('div');
    c.className='cell head';
    c.textContent=w;
    weekdaysEl.appendChild(c);
  });
  
  // Fill leading blank days
  for(let i=0;i<startDay;i++){
    const c=document.createElement('div');
    c.className='cell empty';
    daysEl.appendChild(c);
  }
  
  const todayKey = isoDate(new Date());
  
  // Render days of the month
  for(let day=1; day<=daysInMonth; day++){
    const c=document.createElement('div');
    c.className='cell day';
    const d=new Date(year,month,day);
    const key=isoDate(d);
    c.dataset.date=key;
    
    // Highlight states
    if(key === selectedDate) {
      c.classList.add('selected');
    }
    if(key === todayKey) {
      c.classList.add('today');
    }
    
    const dayTasks = tasksFor(key);
    
    // Cell Header (holds date number and urgent flag)
    const cellHeader = document.createElement('div');
    cellHeader.className = 'cell-header';
    
    const title=document.createElement('div');
    title.className='date-num';
    title.textContent=day;
    cellHeader.appendChild(title);
    
    // Check for urgent and clashing tasks count
    const urgentCount = dayTasks.filter(t => !t.isReport && t.tags && t.tags.includes('URGENT Task')).length;
    const clashingIndices = getClashingTaskIndices(dayTasks);
    const clashCount = clashingIndices.size;
    if (urgentCount > 0 || clashCount > 0) {
      const group = document.createElement('div');
      group.className = 'indicators-group';

      if (urgentCount > 0) {
        const flag = document.createElement('span');
        flag.className = 'urgent-flag';
        flag.innerHTML = `🚩 <span class="urgent-count-badge">${urgentCount}</span>`;
        flag.title = `${urgentCount} Urgent Task(s)`;
        group.appendChild(flag);
      }

      if (clashCount > 0) {
        const clashBadge = document.createElement('span');
        clashBadge.className = 'clash-badge';
        clashBadge.innerHTML = `↔️ <span class="clash-count-badge">${clashCount}</span>`;
        clashBadge.title = `${clashCount} Task Clash(es)`;
        group.appendChild(clashBadge);
      }
      
      cellHeader.appendChild(group);
    }
    c.appendChild(cellHeader);
    
    // Dots container for tasks indicators
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'dots-container';
    dayTasks.forEach(t => {
      const dot = document.createElement('div');
      dot.className = 'dot' + (t.completed ? ' completed' : '');
      dotsContainer.appendChild(dot);
    });
    c.appendChild(dotsContainer);
    
    c.addEventListener('click', ()=> openDay(key));
    daysEl.appendChild(c);
  }
}

function openDay(dateStr){
  selectedDate=dateStr;
  
  // Display structured and styled title
  const formattedDate = new Date(dateStr + 'T00:00:00');
  const dayStrFormatted = formattedDate.toLocaleDateString(undefined, { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
  
  dayTitle.textContent = dayStrFormatted;
  formDayLabel.textContent = dayStrFormatted;
  
  renderTasks();
  renderCalendar(view);
  dayPanel.classList.remove('hidden');
}

function closeDay(){
  // Only closes the sliding panel on mobile
  dayPanel.classList.add('hidden');
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const min = minStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12; // the hour '0' should be '12'
  return `${hour}:${min} ${ampm}`;
}

function renderTasks(){
  tasksList.innerHTML='';
  if(!selectedDate) {
    tasksList.innerHTML = `
      <div class="tasks-empty">
        <p>Select a date to view tasks</p>
      </div>
    `;
    return;
  }
  
  const tasks=tasksFor(selectedDate);
  const clashingIndices = getClashingTaskIndices(tasks);
  if(tasks.length === 0) {
    tasksList.innerHTML = `
      <div class="tasks-empty">
        <svg class="tasks-empty-icon" viewBox="0 0 24 24" width="48" height="48">
          <path fill="none" stroke="currentColor" stroke-width="2" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4"/>
        </svg>
        <p>No tasks for this day</p>
      </div>
    `;
    return;
  }
  
  tasks.forEach((t, i)=>{
    if (t.isReport) {
      const r = document.createElement('div');
      r.className = 'task report-entry';
      
      const details = document.createElement('div');
      details.className = 'task-details';
      
      const txt = document.createElement('div');
      txt.className = 'task-text report-text';
      txt.textContent = t.text;
      details.appendChild(txt);
      
      r.appendChild(details);
      
      const actions = document.createElement('div');
      actions.className = 'task-actions';
      const del = document.createElement('button');
      del.className = 'btn-delete';
      del.title = 'Delete log';
      del.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/></svg>`;
      del.addEventListener('click', () => deleteTask(i));
      actions.appendChild(del);
      r.appendChild(actions);
      
      tasksList.appendChild(r);
      return;
    }

    const r=document.createElement('div');
    const isUrgent = t.tags && t.tags.includes('URGENT Task');
    const isClash = clashingIndices.has(i);
    r.className='task' + (t.completed ? ' completed' : '') + (isUrgent ? ' urgent' : '') + (isClash ? ' clash' : '');
    
    // Checkbox toggle
    const chkWrapper = document.createElement('div');
    chkWrapper.className = 'task-checkbox-wrapper';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'task-checkbox';
    chk.checked = t.completed;
    chk.addEventListener('change', () => toggleTask(i));
    chkWrapper.appendChild(chk);
    
    // Task Content
    const details = document.createElement('div');
    details.className = 'task-details';
    
    const txt=document.createElement('div');
    txt.className='task-text';
    if (t.startTime) {
      const timeBadge = document.createElement('span');
      timeBadge.className = 'task-time-badge';
      timeBadge.textContent = t.endTime ? `🕒 ${formatTime(t.startTime)} - ${formatTime(t.endTime)}` : `🕒 ${formatTime(t.startTime)}`;
      txt.appendChild(timeBadge);
      
      const txtSpan = document.createElement('span');
      txtSpan.textContent = t.text;
      txt.appendChild(txtSpan);
    } else {
      txt.textContent=t.text;
    }
    details.appendChild(txt);
    
    // Check if we are currently editing this task's note and references
    if (editingNoteIndex === i) {
      const editor = document.createElement('div');
      editor.className = 'task-note-editor';
      
      const noteInput = document.createElement('textarea');
      noteInput.className = 'task-note-input';
      noteInput.value = t.note || '';
      noteInput.placeholder = 'Add or edit note... (Ctrl+Enter to save)';
      noteInput.rows = 4;
      editor.appendChild(noteInput);
      
      const trackingRow = document.createElement('div');
      trackingRow.className = 'task-editor-tracking-row';
      
      const courierSelect = document.createElement('select');
      courierSelect.className = 'task-courier-select';
      courierSelect.title = 'Courier Company';
      const couriersList = ['Star Track', 'Australia Post', 'Toll', 'TNT', 'DHL', 'FedEx', 'CouriersPlease', 'Aramex'];
      couriersList.forEach(cOpt => {
        const opt = document.createElement('option');
        opt.value = cOpt;
        opt.textContent = cOpt;
        if ((t.courier || 'Star Track') === cOpt) {
          opt.selected = true;
        }
        courierSelect.appendChild(opt);
      });
      
      const trInput = document.createElement('input');
      trInput.type = 'text';
      trInput.className = 'task-tracking-input';
      trInput.value = t.trackingNo || '';
      trInput.placeholder = 'Tracking #...';
      
      trackingRow.appendChild(courierSelect);
      trackingRow.appendChild(trInput);
      editor.appendChild(trackingRow);
      
      // Inline Editor Tags Selection
      const editTagsContainer = document.createElement('div');
      editTagsContainer.className = 'tags-selection-container edit-mode';

      let selectedEditTags = new Set(t.tags || []);

      function renderEditTags() {
        editTagsContainer.innerHTML = '';
        ALL_TAGS.forEach(tag => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tag-toggle-btn';
          if (selectedEditTags.has(tag)) {
            btn.classList.add('active');
          }
          btn.textContent = tag;
          btn.addEventListener('click', () => {
            if (selectedEditTags.has(tag)) {
              selectedEditTags.delete(tag);
            } else {
              selectedEditTags.add(tag);
            }
            renderEditTags();
          });
          editTagsContainer.appendChild(btn);
        });
      }
      renderEditTags();

      editor.appendChild(editTagsContainer);

      const timeDateEditor = document.createElement('div');
      timeDateEditor.className = 'task-editor-time-date';

      const dateLabel = document.createElement('label');
      dateLabel.textContent = 'Date';
      const targetDateInput = document.createElement('input');
      targetDateInput.type = 'date';
      targetDateInput.value = selectedDate;
      dateLabel.appendChild(targetDateInput);

      const startLabel = document.createElement('label');
      startLabel.textContent = 'Start';
      const startTimeInput = document.createElement('input');
      startTimeInput.type = 'time';
      startTimeInput.value = t.startTime || '';
      startLabel.appendChild(startTimeInput);

      const endLabel = document.createElement('label');
      endLabel.textContent = 'End';
      const endTimeInput = document.createElement('input');
      endTimeInput.type = 'time';
      endTimeInput.value = t.endTime || '';
      endLabel.appendChild(endTimeInput);

      timeDateEditor.appendChild(dateLabel);
      timeDateEditor.appendChild(startLabel);
      timeDateEditor.appendChild(endLabel);
      editor.appendChild(timeDateEditor);
      
      const noteActions = document.createElement('div');
      noteActions.className = 'task-note-actions';
      
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-save-note';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => {
        const tTags = Array.from(selectedEditTags);
        saveTaskDetails(i, noteInput.value.trim(), courierSelect.value, trInput.value.trim(), startTimeInput.value, endTimeInput.value, targetDateInput.value, tTags);
      });
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-cancel-note';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => {
        editingNoteIndex = null;
        renderTasks();
      });
      
      noteActions.appendChild(cancelBtn);
      noteActions.appendChild(saveBtn);
      editor.appendChild(noteActions);
      details.appendChild(editor);
      
      setTimeout(() => noteInput.focus(), 0);
      
      noteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
          e.preventDefault();
          const tTags = Array.from(selectedEditTags);
          saveTaskDetails(i, noteInput.value.trim(), courierSelect.value, trInput.value.trim(), startTimeInput.value, endTimeInput.value, targetDateInput.value, tTags);
        } else if (e.key === 'Escape') {
          editingNoteIndex = null;
          renderTasks();
        }
      });
      
      const onKeySingleLine = (e) => {
        if (e.key === 'Enter') {
          const tTags = Array.from(selectedEditTags);
          saveTaskDetails(i, noteInput.value.trim(), courierSelect.value, trInput.value.trim(), startTimeInput.value, endTimeInput.value, targetDateInput.value, tTags);
        } else if (e.key === 'Escape') {
          editingNoteIndex = null;
          renderTasks();
        }
      };
      courierSelect.addEventListener('keydown', onKeySingleLine);
      trInput.addEventListener('keydown', onKeySingleLine);
      targetDateInput.addEventListener('keydown', onKeySingleLine);
      startTimeInput.addEventListener('keydown', onKeySingleLine);
      endTimeInput.addEventListener('keydown', onKeySingleLine);
    } else {
      if (t.note) {
        const note = document.createElement('div');
        note.className = 'task-note';
        note.textContent = t.note;
        note.title = 'Click to edit';
        note.addEventListener('click', () => {
          editingNoteIndex = i;
          renderTasks();
        });
        details.appendChild(note);
      }
      
      // Render tags if present
      if (t.tags && t.tags.length > 0) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'task-tags-badges';
        tagsContainer.style.display = 'flex';
        tagsContainer.style.flexWrap = 'wrap';
        tagsContainer.style.gap = '4px';
        tagsContainer.style.marginTop = '4px';
        tagsContainer.style.marginBottom = '4px';
        
        t.tags.forEach(tag => {
          const badge = document.createElement('span');
          badge.className = 'tag-badge';
          badge.textContent = tag;
          
          const colors = TAG_COLORS[tag];
          if (colors) {
            badge.style.backgroundColor = document.body.classList.contains('dark-mode') ? colors.darkBg : colors.bg;
            badge.style.color = document.body.classList.contains('dark-mode') ? colors.darkFg : colors.fg;
            if (colors.border) badge.style.border = colors.border;
          }
          tagsContainer.appendChild(badge);
        });
        details.appendChild(tagsContainer);
      }
      
      // Render tracking info if present
      if (t.trackingNo) {
        const refsContainer = document.createElement('div');
        refsContainer.className = 'task-refs-container';

        // Declare journey container at this scope so it can be appended after refs
        let journeyContainer = null;
        
        if (t.trackingNo) {
          const trLink = document.createElement('a');
          const courierName = t.courier || 'Star Track';
          const courierConfig = COURIERS[courierName] || COURIERS['Star Track'];
          trLink.href = courierConfig.url(t.trackingNo.trim());
          trLink.target = '_blank';
          trLink.rel = 'noopener noreferrer';
          trLink.className = 'ref-link ref-tracking';
          trLink.innerHTML = `🚚 ${courierName}: ${t.trackingNo.trim()}`;
          refsContainer.appendChild(trLink);

          const copyTemplateBtn = document.createElement('button');
          copyTemplateBtn.className = 'ref-link ref-copy-template';
          copyTemplateBtn.title = 'Copy Delivery Template to Clipboard';
          copyTemplateBtn.innerHTML = `📋 Copy Template`;
          copyTemplateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const trackingLink = t.trackingNo ? courierConfig.url(t.trackingNo.trim()) : 'N/A';
            const carrier = t.courier || 'Star Track';
            const trackingNo = t.trackingNo || 'N/A';

            const textToCopy = `Dear Customer,\nGood news! Your order has been packaged.\n\n📦 Delivery Details\nDelivered to: \nCarrier: ${carrier}\nTracking Number: ${trackingNo}\nTracking link: ${trackingLink}`;

            navigator.clipboard.writeText(textToCopy).then(() => {
              const originalHTML = copyTemplateBtn.innerHTML;
              copyTemplateBtn.innerHTML = `✅ Copied!`;
              copyTemplateBtn.style.backgroundColor = 'var(--accent)';
              copyTemplateBtn.style.color = '#ffffff';
              setTimeout(() => {
                copyTemplateBtn.innerHTML = originalHTML;
                copyTemplateBtn.style.backgroundColor = '';
                copyTemplateBtn.style.color = '';
              }, 2000);
            }).catch(err => {
              console.error('Failed to copy: ', err);
            });
          });
          refsContainer.appendChild(copyTemplateBtn);

          // Add Track Journey button
          const trackBtn = document.createElement('button');
          trackBtn.className = 'ref-link ref-track-journey';
          trackBtn.title = 'View Real-Time Tracking Progress';
          trackBtn.innerHTML = `🚚 Track Shipment`;

          // Journey panel element
          journeyContainer = document.createElement('div');
          journeyContainer.className = 'tracking-journey-container hidden';

          trackBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = journeyContainer.classList.toggle('hidden');
            trackBtn.innerHTML = isHidden ? `🚚 Track Shipment` : `🔼 Hide Tracking`;
            if (!isHidden) {
              renderJourneyUI(journeyContainer, t, selectedDate);
            }
          });

          refsContainer.appendChild(trackBtn);
        }

        details.appendChild(refsContainer);

        // Journey panel sits BELOW the refs row so it expands beneath the button
        if (journeyContainer) {
          details.appendChild(journeyContainer);
        }
      }
    }

    // Render Subtasks Section
    const subtasksSec = document.createElement('div');
    subtasksSec.className = 'subtasks-section';

    const subtasks = t.subtasks || [];
    const totalSub = subtasks.length;
    const completedSub = subtasks.filter(s => s.completed).length;

    // Progress bar/fraction
    if (totalSub > 0) {
      const progWrapper = document.createElement('div');
      progWrapper.className = 'subtasks-progress-wrapper';
      
      const progText = document.createElement('span');
      progText.textContent = `${completedSub}/${totalSub} subtasks`;
      progWrapper.appendChild(progText);

      const progBar = document.createElement('div');
      progBar.className = 'subtasks-progress-bar';
      const progFill = document.createElement('div');
      progFill.className = 'subtasks-progress-fill';
      progFill.style.width = `${(completedSub / totalSub) * 100}%`;
      progBar.appendChild(progFill);
      
      progWrapper.appendChild(progBar);
      subtasksSec.appendChild(progWrapper);
    }

    // List of subtasks
    const subList = document.createElement('div');
    subList.className = 'subtasks-list';
    subtasks.forEach((st, si) => {
      const stEl = document.createElement('div');
      stEl.className = 'subtask-item' + (st.completed ? ' completed' : '');

      const left = document.createElement('div');
      left.className = 'subtask-left';

      const stChk = document.createElement('input');
      stChk.type = 'checkbox';
      stChk.className = 'subtask-checkbox';
      stChk.checked = st.completed;
      stChk.addEventListener('change', () => toggleSubtask(i, si));
      left.appendChild(stChk);

      const stTxt = document.createElement('span');
      stTxt.className = 'subtask-text';
      stTxt.textContent = st.text;
      left.appendChild(stTxt);

      if (st.completed && st.completedAt) {
        const completedBadge = document.createElement('span');
        completedBadge.className = 'incident-timestamp';
        completedBadge.style.backgroundColor = 'var(--accent-light)';
        completedBadge.style.color = 'var(--accent)';
        completedBadge.style.marginLeft = '6px';
        completedBadge.textContent = `Completed: ${st.completedAt}`;
        left.appendChild(completedBadge);
      }

      stEl.appendChild(left);

      if (editingNoteIndex === i) {
        const delSt = document.createElement('button');
        delSt.className = 'btn-delete-subtask';
        delSt.title = 'Delete subtask';
        delSt.textContent = '×';
        delSt.addEventListener('click', () => deleteSubtask(i, si));
        stEl.appendChild(delSt);
      }

      subList.appendChild(stEl);
    });
    subtasksSec.appendChild(subList);

    if (editingNoteIndex === i) {
      // Form to add subtask
      const subForm = document.createElement('form');
      subForm.className = 'subtask-form';
      
      const subInput = document.createElement('input');
      subInput.type = 'text';
      subInput.placeholder = 'Add subtask...';
      subInput.className = 'subtask-input';
      subInput.required = true;
      subInput.autocomplete = 'off';
      
      const subAddBtn = document.createElement('button');
      subAddBtn.type = 'submit';
      subAddBtn.className = 'btn-add-subtask';
      subAddBtn.textContent = '+';
      
      subForm.appendChild(subInput);
      subForm.appendChild(subAddBtn);
      
      subForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = subInput.value.trim();
        if (val) {
          addSubtask(i, val);
          subInput.value = '';
        }
      });

      subtasksSec.appendChild(subForm);
    }

    if (totalSub > 0 || editingNoteIndex === i) {
      details.appendChild(subtasksSec);
    }

    // Render Incidents Section
    const incidentsSec = document.createElement('div');
    incidentsSec.className = 'incidents-section';

    const incidents = t.incidents || [];
    const totalInc = incidents.length;

    // List of incidents
    const incList = document.createElement('div');
    incList.className = 'incidents-list';
    incidents.forEach((inc, incIdx) => {
      const incEl = document.createElement('div');
      incEl.className = 'incident-item' + (inc.solved ? ' solved' : '');

      const left = document.createElement('div');
      left.className = 'incident-left';

      const incChk = document.createElement('input');
      incChk.type = 'checkbox';
      incChk.className = 'incident-checkbox';
      incChk.checked = inc.solved;
      incChk.title = inc.solved ? 'Mark as Unsolved' : 'Mark as Solved';
      incChk.addEventListener('change', () => toggleIncident(i, incIdx));
      left.appendChild(incChk);

      const incTxt = document.createElement('span');
      incTxt.className = 'incident-text';
      incTxt.textContent = inc.text;
      left.appendChild(incTxt);

      const incTime = document.createElement('span');
      incTime.className = 'incident-timestamp';
      incTime.style.marginLeft = '6px';
      incTime.textContent = inc.solved ? `Solved: ${inc.timestamp}` : `Reported: ${inc.timestamp}`;
      left.appendChild(incTime);

      incEl.appendChild(left);

      if (editingNoteIndex === i) {
        const delInc = document.createElement('button');
        delInc.className = 'btn-delete-incident';
        delInc.title = 'Delete incident';
        delInc.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/></svg>`;
        delInc.addEventListener('click', () => deleteIncident(i, incIdx));
        incEl.appendChild(delInc);
      }

      incList.appendChild(incEl);
    });
    incidentsSec.appendChild(incList);

    if (editingNoteIndex === i) {
      // Form to add incident
      const incForm = document.createElement('form');
      incForm.className = 'incident-form';
      
      const incInput = document.createElement('input');
      incInput.type = 'text';
      incInput.placeholder = 'Report incident...';
      incInput.className = 'incident-input';
      incInput.required = true;
      incInput.autocomplete = 'off';
      
      const incAddBtn = document.createElement('button');
      incAddBtn.type = 'submit';
      incAddBtn.className = 'btn-add-incident';
      incAddBtn.textContent = '+';
      
      incForm.appendChild(incInput);
      incForm.appendChild(incAddBtn);
      
      incForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = incInput.value.trim();
        if (val) {
          addIncident(i, val);
          incInput.value = '';
        }
      });

      incidentsSec.appendChild(incForm);
    }

    if (totalInc > 0 || editingNoteIndex === i) {
      details.appendChild(incidentsSec);
    }

    // Actions Panel
    const actions=document.createElement('div');
    actions.className='task-actions';
    
    // Edit/Add Note button
    const editNote=document.createElement('button');
    editNote.className = 'btn-note';
    editNote.title = t.note ? 'Edit details' : 'Add details';
    editNote.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    editNote.addEventListener('click', () => {
      editingNoteIndex = i;
      renderTasks();
    });
    actions.appendChild(editNote);

    // Incident & Activity PDF report button
    if ((t.incidents && t.incidents.length > 0) || (t.subtasks && t.subtasks.length > 0) || t.trackingNo) {
      const pdfBtn = document.createElement('button');
      pdfBtn.className = 'btn-pdf';
      pdfBtn.title = 'Generate Incident & Activity Report PDF';
      pdfBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8m8 4H8m4-8H8"/></svg>`;
      pdfBtn.addEventListener('click', () => openIncidentReport(i));
      actions.appendChild(pdfBtn);
    }
    
    // Move to next day
    const move=document.createElement('button');
    move.className = 'btn-move';
    move.title = 'Move to next day';
    move.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    move.addEventListener('click', ()=> moveToNext(i));
    
    // Delete task
    const del=document.createElement('button');
    del.className = 'btn-delete';
    del.title = 'Delete task';
    del.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/></svg>`;
    del.addEventListener('click', ()=> deleteTask(i));
    
    actions.appendChild(move);
    actions.appendChild(del);
    
    r.appendChild(chkWrapper);
    r.appendChild(details);
    r.appendChild(actions);
    tasksList.appendChild(r);
  });
}

function addTask(text, noteText, courier, trackingNo, startTime, endTime, tags){
  if(!selectedDate) return;
  const arr=tasksFor(selectedDate);
  const now = new Date();
  const timestamp = now.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  arr.push({
    text: text,
    completed: false,
    note: noteText || '',
    courier: courier || 'Star Track',
    trackingNo: trackingNo || '',
    subtasks: [],
    startTime: startTime || '',
    endTime: endTime || '',
    tags: tags || [],
    incidents: [],
    trackingAddedAt: trackingNo ? timestamp : ''
  });
  setTasksFor(selectedDate, arr);

  renderTasks();
  renderCalendar(view);
}

function saveTaskDetails(index, noteText, courier, trackingNo, startTime, endTime, targetDate, tags) {
  const arr = tasksFor(selectedDate);
  const task = arr[index];
  const originalDate = selectedDate;
  const isMoving = targetDate && targetDate !== selectedDate;

  const isCurrentlyUrgent = task.tags && task.tags.includes('URGENT Task');

  if (isCurrentlyUrgent && isMoving) {
    const reason = prompt(`Enter reason for moving urgent task "${task.text}" to ${targetDate}:`) || 'Conflict/Issue';
    arr.push({
      text: `📋 Urgent task moved: "${task.text}" was moved to ${targetDate}. Reason: ${reason}`,
      completed: true,
      isReport: true,
      note: '',
      courier: 'Star Track',
      trackingNo: '',
      tags: [],
      subtasks: []
    });
  }

  const now = new Date();
  const timestamp = now.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const oldTrackingNo = task.trackingNo || '';
  const newTrackingNo = trackingNo || '';
  if (newTrackingNo !== oldTrackingNo) {
    task.trackingAddedAt = newTrackingNo ? timestamp : '';
  } else if (newTrackingNo && !task.trackingAddedAt) {
    task.trackingAddedAt = timestamp;
  }

  task.note = noteText;
  task.courier = courier || 'Star Track';
  task.trackingNo = trackingNo;
  task.startTime = startTime || '';
  task.endTime = endTime || '';
  task.tags = tags || [];

  if (isMoving) {
    // Remove from current date
    arr.splice(index, 1);
    setTasksFor(originalDate, arr);

    // Add to target date
    const targetArr = tasksFor(targetDate);
    targetArr.push(task);
    setTasksFor(targetDate, targetArr);
  } else {
    setTasksFor(originalDate, arr);
  }
  editingNoteIndex = null;
  renderTasks();
}

function deleteTask(index){
  const arr=tasksFor(selectedDate);
  arr.splice(index,1);
  setTasksFor(selectedDate, arr);
  renderTasks();
  renderCalendar(view);
}

function toggleTask(index) {
  const arr=tasksFor(selectedDate);
  arr[index].completed = !arr[index].completed;
  if (arr[index].subtasks) {
    arr[index].subtasks.forEach(st => {
      st.completed = arr[index].completed;
    });
  }
  setTasksFor(selectedDate, arr);
  renderTasks();
  renderCalendar(view);
}

function addSubtask(taskIndex, text) {
  if (!text) return;
  const arr = tasksFor(selectedDate);
  const task = arr[taskIndex];
  if (!task.subtasks) {
    task.subtasks = [];
  }
  task.subtasks.push({ text: text, completed: false, completedAt: '' });
  task.completed = false; // reset parent task completion since a new open subtask is added
  setTasksFor(selectedDate, arr);
  renderTasks();
  renderCalendar(view);
}

function toggleSubtask(taskIndex, subtaskIndex) {
  const arr = tasksFor(selectedDate);
  const task = arr[taskIndex];
  const st = task.subtasks[subtaskIndex];
  st.completed = !st.completed;
  
  if (st.completed) {
    const now = new Date();
    st.completedAt = now.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } else {
    st.completedAt = '';
  }
  
  // Update parent task: completed if all subtasks are checked
  task.completed = task.subtasks.every(st => st.completed);
  
  setTasksFor(selectedDate, arr);
  renderTasks();
  renderCalendar(view);
}

function deleteSubtask(taskIndex, subtaskIndex) {
  const arr = tasksFor(selectedDate);
  const task = arr[taskIndex];
  task.subtasks.splice(subtaskIndex, 1);
  
  if (task.subtasks.length > 0) {
    task.completed = task.subtasks.every(st => st.completed);
  }
  
  setTasksFor(selectedDate, arr);
  renderTasks();
  renderCalendar(view);
}

function addIncident(taskIndex, text) {
  if (!text) return;
  const arr = tasksFor(selectedDate);
  const task = arr[taskIndex];
  if (!task.incidents) {
    task.incidents = [];
  }
  
  const now = new Date();
  const timestamp = now.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  task.incidents.push({ text: text, timestamp: timestamp, solved: false });
  setTasksFor(selectedDate, arr);
  renderTasks();
}

function toggleIncident(taskIndex, incidentIndex) {
  const arr = tasksFor(selectedDate);
  const task = arr[taskIndex];
  task.incidents[incidentIndex].solved = !task.incidents[incidentIndex].solved;
  setTasksFor(selectedDate, arr);
  renderTasks();
}

function deleteIncident(taskIndex, incidentIndex) {
  const arr = tasksFor(selectedDate);
  const task = arr[taskIndex];
  task.incidents.splice(incidentIndex, 1);
  setTasksFor(selectedDate, arr);
  renderTasks();
}

function openIncidentReport(taskIndex) {
  const task = tasksFor(selectedDate)[taskIndex];
  if (!task) return;

  const printModal = document.getElementById('printModal');
  const printReportArea = document.getElementById('printReportArea');
  
  const reportDateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const taskDateStr = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const courierVal = task.trackingNo ? `${task.courier || 'Star Track'} (${task.trackingNo})` : 'N/A';
  const tagsVal = (task.tags && task.tags.length > 0) ? task.tags.join(', ') : 'N/A';


  // Combine subtasks, incidents, and tracking events into a single list
  const events = [];

  if (task.subtasks) {
    task.subtasks.forEach(st => {
      events.push({
        type: 'Subtask',
        text: st.text,
        timestamp: st.completedAt || '',
        sortTime: st.completedAt ? parseTimestamp(st.completedAt).getTime() : Infinity,
        status: st.completed ? 'COMPLETED' : 'PENDING',
        badgeClass: st.completed ? 'status-completed' : 'status-pending'
      });
    });
  }

  if (task.incidents) {
    task.incidents.forEach(inc => {
      events.push({
        type: 'Incident',
        text: inc.text,
        timestamp: inc.timestamp || '',
        sortTime: inc.timestamp ? parseTimestamp(inc.timestamp).getTime() : Infinity,
        status: inc.solved ? 'SOLVED' : 'PENDING',
        badgeClass: inc.solved ? 'status-solved' : 'status-pending'
      });
    });
  }

  if (task.trackingNo) {
    const journey = getTrackingJourney(task, selectedDate);
    journey.forEach(ev => {
      if (ev.unlocked) {
        events.push({
          type: 'Tracking',
          text: ev.details,
          timestamp: ev.formattedTime,
          sortTime: ev.timestamp.getTime(),
          status: ev.stage === 'delivered' ? 'DELIVERED' : 'DISPATCHED',
          badgeClass: ev.stage === 'delivered' ? 'status-solved' : 'status-dispatched'
        });
      }
    });
  }

  // Sort chronological order (oldest first, pending/empty timestamp at the end)
  events.sort((a, b) => {
    const timeA = a.sortTime;
    const timeB = b.sortTime;
    if (timeA === Infinity && timeB === Infinity) return 0;
    if (timeA === Infinity) return 1;
    if (timeB === Infinity) return -1;
    return timeA - timeB;
  });

  let eventsHtml = '';
  if (events.length > 0) {
    eventsHtml = `
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 25%;">Date & Time</th>
            <th style="width: 15%;">Event Type</th>
            <th style="width: 45%;">Description</th>
            <th style="width: 15%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${events.map(ev => `
            <tr>
              <td><strong>${ev.timestamp || 'Pending'}</strong></td>
              <td><span style="font-weight: 600; font-size: 11px; text-transform: uppercase; color: #475569;">${ev.type}</span></td>
              <td>${ev.text}</td>
              <td>
                <span class="report-status-badge ${ev.badgeClass}">
                  ${ev.status}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    eventsHtml = '<p>No subtasks or incidents reported on this task.</p>';
  }

  printReportArea.innerHTML = `
    <div class="report-header">
      <div>
        <h2>ACTIVITY REPORT</h2>
        <p style="font-size: 14px; font-weight: 500; margin-top: 4px; color: #475569;">WorkFlow Calendar</p>
      </div>
      <div class="report-header-meta">
        <p><strong>Report Date:</strong> ${reportDateStr}</p>
        <p><strong>Task Date:</strong> ${taskDateStr}</p>
      </div>
    </div>

    <div class="report-section">
      <div class="report-section-title">Task Metadata</div>
      <div class="report-grid">
        <div class="report-grid-item">
          <p><strong>Tags:</strong> ${tagsVal}</p>
        </div>
        <div class="report-grid-item">
          <p><strong>Courier details:</strong> ${courierVal}</p>
        </div>
      </div>
    </div>

    <div class="report-section">
      <div class="report-section-title">Task Description</div>
      <div class="report-task-details">
        <div class="report-task-title">${task.text}</div>
        ${task.startTime ? `<p><strong>Scheduled Time:</strong> ${formatTime(task.startTime)}${task.endTime ? ` - ${formatTime(task.endTime)}` : ''}</p>` : ''}
        ${task.note ? `<p style="margin-top: 8px; font-style: italic;"><strong>Note:</strong> ${task.note}</p>` : ''}
      </div>
    </div>

    <div class="report-section">
      <div class="report-section-title">Subtasks & Incident Log</div>
      ${eventsHtml}
    </div>

    <div class="report-signatures">
      <div>
        <div class="report-signature-line">Reported By (Print Name & Sign)</div>
      </div>
      <div>
        <div class="report-signature-line">Date</div>
      </div>
    </div>
  `;

  printModal.classList.remove('hidden');
}

function moveToNext(index){
  const curr = tasksFor(selectedDate);
  const item = curr[index];
  const originalDate = selectedDate;
  
  const nextDate = new Date(originalDate + 'T00:00:00');
  nextDate.setDate(nextDate.getDate()+1);
  const key = isoDate(nextDate);
  
  if (item.tags && item.tags.includes('URGENT Task')) {
    const reason = prompt(`Enter reason for moving urgent task "${item.text}" to tomorrow:`) || 'Conflict/Issue';
    curr.push({
      text: `📋 Urgent task moved: "${item.text}" was moved to ${key}. Reason: ${reason}`,
      completed: true,
      isReport: true,
      note: '',
      courier: 'Star Track',
      trackingNo: '',
      tags: [],
      subtasks: []
    });
  }

  const removedItem = curr.splice(index, 1)[0];

  setTasksFor(originalDate, curr);

  const nextArr = tasksFor(key);
  nextArr.push(removedItem);

  setTasksFor(key, nextArr);
  
  renderTasks();
  renderCalendar(view);
}

taskForm.addEventListener('submit', e=>{
  e.preventDefault();
  const v=taskInput.value.trim();
  const st=taskStartTimeInput.value;
  const et=taskEndTimeInput.value;
  const n=taskNoteInput.value.trim();
  const tc=taskCourierSelect.value;
  const tr=taskTrackingInput.value.trim();
  const tagsList = Array.from(selectedAddTags);
  if(!v) return;
  addTask(v, n, tc, tr, st, et, tagsList);
  taskInput.value='';
  taskStartTimeInput.value='';
  taskEndTimeInput.value='';
  taskNoteInput.value='';
  taskCourierSelect.value='Star Track';
  taskTrackingInput.value='';
  selectedAddTags.clear();
  renderAddTags();
});

closePanel.addEventListener('click', closeDay);
prevBtn.addEventListener('click', ()=>{
  view.setMonth(view.getMonth()-1);
  renderCalendar(view);
});
nextBtn.addEventListener('click', ()=>{
  view.setMonth(view.getMonth()+1);
  renderCalendar(view);
});

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Initial load
initNavSelects();
renderAddTags();
openDay(selectedDate);

// Wire print modal buttons
document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});

document.getElementById('closePrintBtn').addEventListener('click', () => {
  document.getElementById('printModal').classList.add('hidden');
});

// Expose helper for debugging in console
window._tasksMap = getTasksMap;
