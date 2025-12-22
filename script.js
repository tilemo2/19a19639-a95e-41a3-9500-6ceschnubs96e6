// Token Hash
const CORRECT_TOKEN_HASH = "7c86e5eb9c3dfadb03cdebb85032711359458e33fb07de36f253cbdf4afb297f";
let anniversaries = [
    { name: "Unser Jahrestag", date: "2024-02-14", time: "00:00", archived: false, repeating: true, memories: {} }
];
let emptyClickCount = 0, clickResetTimer = null, settingsOpenBuffer = false;
let currentTrailStyle = 'hearts', currentColor = 'red';
let visibleUnits = { days: true, hours: true, minutes: true, seconds: true };
let currentDetailIndex = null, confettiTriggered = {}, isNewAnniversary = false;
let relationshipAnniversaryIndex = null;
let pickerYear = 2024, pickerMonth = 11, pickerDay = 22, pickerHour = 0, pickerMinute = 0;
let photoViewerYears = [], photoViewerCurrentIndex = 0;
const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const monthNamesShort = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const colorSchemes = {
    red: { base: [255, 107, 157], light: [255, 143, 163] },
    pink: { base: [255, 154, 158], light: [254, 207, 239] },
    purple: { base: [161, 140, 209], light: [251, 194, 235] },
    blue: { base: [102, 126, 234], light: [118, 75, 162] },
    gold: { base: [240, 147, 251], light: [245, 87, 108] },
    rainbow: { base: null }
};

async function hashToken(t) {
    const e = new TextEncoder().encode(t);
    const h = await crypto.subtle.digest('SHA-256', e);
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('');
}
async function checkAccess() {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { showError(); return; }
    if (await hashToken(token) === CORRECT_TOKEN_HASH) showContent();
    else showError();
}
function showError() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
}
function showContent() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');
    initApp();
}
function saveAnniversaries() { localStorage.setItem('anniversaries', JSON.stringify(anniversaries)); }
function loadAnniversaries() {
    const s = localStorage.getItem('anniversaries');
    if (s) try { anniversaries = JSON.parse(s).map(a => ({...a, time: a.time || '00:00'})); } catch(e) {}
}
function saveSettings() {
    localStorage.setItem('settings', JSON.stringify({
        trail: currentTrailStyle, color: currentColor, units: visibleUnits,
        font: document.querySelector('input[name="font"]:checked')?.value || 'system',
        theme: document.querySelector('input[name="theme"]:checked')?.value || 'romantic',
        relationshipIndex: relationshipAnniversaryIndex
    }));
}
function loadSettings() {
    const s = localStorage.getItem('settings');
    if (s) try {
        const p = JSON.parse(s);
        if (p.trail) currentTrailStyle = p.trail;
        if (p.color) currentColor = p.color;
        if (p.units) visibleUnits = p.units;
        if (p.font) applyFont(p.font);
        if (p.theme) applyTheme(p.theme);
        if (p.relationshipIndex !== undefined) relationshipAnniversaryIndex = p.relationshipIndex;
        ['trail','color','font','theme'].forEach(n => {
            const r = document.querySelector(`input[name="${n}"][value="${p[n]}"]`);
            if (r) r.checked = true;
        });
        Object.keys(visibleUnits).forEach(u => {
            const c = document.querySelector(`input[data-unit="${u}"]`);
            if (c) c.checked = visibleUnits[u];
        });
        applyVisibleUnits();
    } catch(e) {}
}
function initApp() {
    loadAnniversaries(); loadSettings();
    updateMainCountdown(); renderAllAnniversaries(); updateStatistics();
    setInterval(() => {
        updateMainCountdown(); updateAllCountdowns();
        if (currentDetailIndex !== null) updateDetailCountdown();
        checkForCelebration();
    }, 1000);
    initBackground(); initMouseTrail(); initScrollIndicator(); initEasterEgg();
    initSettingsHandlers(); initDetailInputHandlers();
}
function initScrollIndicator() {
    const si = document.querySelector('.scroll-indicator');
    si?.addEventListener('click', () => document.querySelector('.all-anniversaries-section')?.scrollIntoView({ behavior: 'smooth' }));
    window.addEventListener('scroll', () => si?.classList.toggle('hidden', window.scrollY > 30), { passive: true });
}
function initEasterEgg() {
    document.addEventListener('pointerdown', (e) => {
        if (settingsOpenBuffer) return;
        if (e.target.closest('.anniversary-card:not(.add-card),.scroll-indicator,.settings,.detail-modal,.confirm-modal,.picker-modal,.photo-viewer-modal')) return;
        spawnTrailElement(e.clientX, e.clientY);
        emptyClickCount++;
        if (emptyClickCount >= 15) {
            emptyClickCount = 0; settingsOpenBuffer = true;
            setTimeout(() => settingsOpenBuffer = false, 500);
            openSettings();
        }
        clearTimeout(clickResetTimer);
        clickResetTimer = setTimeout(() => emptyClickCount = 0, 2000);
    });
}
function initSettingsHandlers() {
    document.querySelectorAll('input[name="font"]').forEach(r => r.addEventListener('change', e => { applyFont(e.target.value); saveSettings(); }));
    document.querySelectorAll('input[name="theme"]').forEach(r => r.addEventListener('change', e => { applyTheme(e.target.value); saveSettings(); }));
    document.querySelectorAll('input[name="trail"]').forEach(r => r.addEventListener('change', e => { currentTrailStyle = e.target.value; saveSettings(); }));
    document.querySelectorAll('input[name="color"]').forEach(r => r.addEventListener('change', e => { currentColor = e.target.value; saveSettings(); }));
    document.querySelectorAll('input[data-unit]').forEach(c => c.addEventListener('change', e => { visibleUnits[e.target.dataset.unit] = e.target.checked; applyVisibleUnits(); saveSettings(); }));
}
function initDetailInputHandlers() {
    document.getElementById('detail-name').addEventListener('input', () => {
        if (currentDetailIndex === null) return;
        anniversaries[currentDetailIndex].name = document.getElementById('detail-name').value;
        saveAnniversaries(); renderAllAnniversaries(); updateMainCountdown(); updateStatistics();
    });
}
function applyFont(f) { document.body.classList.remove('font-serif','font-mono'); if (f !== 'system') document.body.classList.add('font-' + f); }
function applyTheme(t) { document.body.setAttribute('data-theme', t); }
function applyVisibleUnits() {
    ['days','hours','minutes','seconds'].forEach(u => {
        document.querySelectorAll(`.countdown-item:has([data-${u}]),.countdown-item:has(#${u})`).forEach(i => i.classList.toggle('unit-hidden', !visibleUnits[u]));
    });
    renderAllAnniversaries();
}
function getTargetDate(a) {
    const [y,m,d] = a.date.split('-').map(Number);
    const [h,min] = (a.time||'00:00').split(':').map(Number);
    if (a.repeating) {
        const now = new Date(), ty = now.getFullYear();
        const thisY = new Date(ty, m-1, d, h, min);
        const nextY = new Date(ty+1, m-1, d, h, min);
        return thisY > now ? thisY : nextY;
    }
    return new Date(y, m-1, d, h, min);
}
function getAllUpcomingAnniversaries() {
    const now = new Date();
    return anniversaries.filter(a => !a.archived).map((a,i) => ({ ...a, targetDate: getTargetDate(a), diff: getTargetDate(a) - now, originalIndex: i })).sort((a,b) => a.diff - b.diff);
}
function updateMainCountdown() {
    const ev = getAllUpcomingAnniversaries().find(e => e.diff > 0);
    if (!ev) { document.getElementById('main-name-scroll').textContent = 'Kein Jahrestag'; return; }
    const diff = ev.targetDate - new Date();
    const days = Math.floor(diff / 86400000), hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000), secs = Math.floor((diff % 60000) / 1000);
    document.getElementById('days').textContent = days.toString().padStart(3,'0');
    document.getElementById('hours').textContent = hours.toString().padStart(2,'0');
    document.getElementById('minutes').textContent = mins.toString().padStart(2,'0');
    document.getElementById('seconds').textContent = secs.toString().padStart(2,'0');
    const n = document.getElementById('main-name-scroll');
    n.textContent = ev.name;
    document.getElementById('event-date').textContent = formatDateDisplay(ev.date, ev.time);
}
function updateAllCountdowns() {
    const cards = document.querySelectorAll('.anniversary-card:not(.add-card)');
    const evs = getAllUpcomingAnniversaries().filter(e => e.diff > 0);
    cards.forEach((c,i) => { if (evs[i+1]) updateCountdownDisplayForCard(c, evs[i+1]); });
}
function updateCountdownDisplayForCard(card, ev) {
    const diff = ev.targetDate - new Date();
    if (diff < 0) return;
    const d = Math.floor(diff/86400000), h = Math.floor((diff%86400000)/3600000);
    const m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
    const el = (sel) => card.querySelector(sel);
    if (el('[data-days]')) el('[data-days]').textContent = d.toString().padStart(3,'0');
    if (el('[data-hours]')) el('[data-hours]').textContent = h.toString().padStart(2,'0');
    if (el('[data-minutes]')) el('[data-minutes]').textContent = m.toString().padStart(2,'0');
    if (el('[data-seconds]')) el('[data-seconds]').textContent = s.toString().padStart(2,'0');
}
function formatDateDisplay(date, time) {
    const [y,m,d] = date.split('-');
    return `${d}.${m}.${y}` + (time && time !== '00:00' ? ` • ${time}` : '');
}
function renderAllAnniversaries() {
    const c = document.getElementById('all-anniversaries');
    const evs = getAllUpcomingAnniversaries().filter(e => e.diff > 0).slice(1);
    c.innerHTML = '';
    evs.forEach((ev,i) => {
        const card = document.createElement('div');
        card.className = 'anniversary-card';
        card.style.animationDelay = `${i*0.1}s`;
        card.onclick = () => openDetail(ev.originalIndex);
        card.innerHTML = `<h2 class="event-name">${ev.name}</h2>
            <div class="countdown">${['days','hours','minutes','seconds'].map((u,j) => `
                <div class="countdown-item ${u==='days'?'countdown-days':''} ${!visibleUnits[u]?'unit-hidden':''}">
                    <span class="countdown-number" data-${u}>${u==='days'?'000':'00'}</span>
                    <span class="countdown-label">${u==='days'?'Tage':u==='hours'?'Std':u==='minutes'?'Min':'Sek'}</span>
                </div>${j<3?`<div class="countdown-separator ${!visibleUnits[['hours','minutes','seconds'][j]]?'sep-hidden':''}">:</div>`:''}`).join('')}
            </div><p class="event-date">${formatDateDisplay(ev.date, ev.time)}</p>`;
        c.appendChild(card);
        updateCountdownDisplayForCard(card, ev);
    });
    const add = document.createElement('div');
    add.className = 'anniversary-card add-card';
    add.innerHTML = '<div class="add-content"><span class="add-plus">+</span><span class="add-text">Jahrestag hinzufügen</span></div>';
    add.onclick = e => { e.stopPropagation(); createNewAnniversary(); };
    c.appendChild(add);
}
function createNewAnniversary() {
    anniversaries.push({ name: "Neuer Jahrestag", date: new Date().toISOString().split('T')[0], time: "00:00", archived: false, repeating: true, memories: {} });
    saveAnniversaries(); renderAllAnniversaries(); updateMainCountdown(); updateStatistics();
    isNewAnniversary = true; openDetail(anniversaries.length - 1);
}
function spawnTrailElement(x, y) {
    if (currentTrailStyle === 'none') return;
    const el = document.createElement('div');
    const size = Math.random() * 16 + 12;
    el.style.cssText = `left:${x-size/2}px;top:${y-size/2}px;font-size:${size}px;--drift:${(Math.random()-0.5)*60}px`;
    if (currentTrailStyle === 'hearts') { el.className = 'heart'; el.innerHTML = '❤'; el.style.color = getTrailColor(); }
    else { el.className = 'spark'; el.style.background = getTrailColor(); }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}
function getTrailColor() {
    if (currentColor === 'rainbow') return `hsl(${Math.random()*360}, 85%, 65%)`;
    const s = colorSchemes[currentColor];
    if (!s) return 'rgba(255,100,150,0.9)';
    const m = Math.random();
    return `rgba(${Math.floor(s.base[0]*(1-m)+s.light[0]*m)},${Math.floor(s.base[1]*(1-m)+s.light[1]*m)},${Math.floor(s.base[2]*(1-m)+s.light[2]*m)},0.9)`;
}
function initMouseTrail() {
    const canvas = document.getElementById('trail-canvas');
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize(); window.addEventListener('resize', resize);
    document.addEventListener('mousemove', e => { if (currentTrailStyle !== 'none') for (let i=0;i<2;i++) setTimeout(() => spawnTrailElement(e.clientX+(Math.random()-0.5)*10, e.clientY+(Math.random()-0.5)*10), i*50); });
}
function initBackground() {
    const canvas = document.getElementById('background-canvas'), ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize(); window.addEventListener('resize', resize);
    (function draw() {
        const g = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
        const cs = getComputedStyle(document.body);
        g.addColorStop(0, cs.getPropertyValue('--bg-start'));
        g.addColorStop(0.5, cs.getPropertyValue('--bg-mid'));
        g.addColorStop(1, cs.getPropertyValue('--bg-end'));
        ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
        requestAnimationFrame(draw);
    })();
}
function closeOnBackdrop(e, id) {
    if (e.target.id === id) {
        document.getElementById(id).classList.add('hidden');
        document.body.classList.remove('modal-open');
        if (id === 'detail-modal') { currentDetailIndex = null; isNewAnniversary = false; document.getElementById('detail-dropdown')?.classList.add('hidden'); }
    }
}
window.closeOnBackdrop = closeOnBackdrop;
function openSettings() { renderArchivedList(); document.getElementById('settings-modal').classList.remove('hidden'); document.body.classList.add('modal-open'); }
function closeSettings() { document.getElementById('settings-modal').classList.add('hidden'); document.body.classList.remove('modal-open'); }
window.openSettings = openSettings; window.closeSettings = closeSettings;
function renderArchivedList() {
    const list = document.getElementById('archived-list');
    const arch = anniversaries.filter(a => a.archived);
    list.innerHTML = arch.length ? arch.map(a => `<div class="archived-item"><div><div style="font-weight:500">${a.name}</div><div style="font-size:13px;color:var(--text-secondary)">${formatDateDisplay(a.date,a.time)}</div></div><button onclick="unarchiveAnniversary(${anniversaries.indexOf(a)})">Wiederherstellen</button></div>`).join('') : '<p class="empty-state">Keine archivierten Jahrestage</p>';
}
function unarchiveAnniversary(i) { anniversaries[i].archived = false; saveAnniversaries(); renderArchivedList(); renderAllAnniversaries(); updateMainCountdown(); updateStatistics(); }
window.unarchiveAnniversary = unarchiveAnniversary;
function openMainDetail() { const ev = getAllUpcomingAnniversaries().find(e => e.diff > 0); if (ev) openDetail(ev.originalIndex); }
window.openMainDetail = openMainDetail;
function openDetail(i) {
    currentDetailIndex = i;
    const a = anniversaries[i];
    document.getElementById('detail-name').value = a.name;
    document.getElementById('repeating-toggle').checked = a.repeating !== false;
    updateDateDisplay();
    document.getElementById('detail-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
    updateDetailCountdown(); renderMemories();
    if (isNewAnniversary) setTimeout(() => { const n = document.getElementById('detail-name'); n.focus(); n.select(); }, 100);
}
window.openDetail = openDetail;
function updateDateDisplay() {
    if (currentDetailIndex === null) return;
    const a = anniversaries[currentDetailIndex], [y,m,d] = a.date.split('-');
    document.getElementById('display-date').textContent = `${d}.${m}.${y}`;
    document.getElementById('display-time').textContent = a.time || '00:00';
}
function closeDetail() { document.getElementById('detail-modal').classList.add('hidden'); document.body.classList.remove('modal-open'); document.getElementById('detail-dropdown')?.classList.add('hidden'); currentDetailIndex = null; isNewAnniversary = false; }
window.closeDetail = closeDetail;
function toggleDetailMenu(e) {
    e.stopPropagation();
    const dd = document.getElementById('detail-dropdown');
    dd.classList.toggle('hidden');
    if (!dd.classList.contains('hidden')) {
        const close = ev => { if (!dd.contains(ev.target) && !ev.target.closest('.menu-dots')) { dd.classList.add('hidden'); document.removeEventListener('click', close); } };
        setTimeout(() => document.addEventListener('click', close), 0);
    }
}
window.toggleDetailMenu = toggleDetailMenu;
function archiveAnniversary() { if (currentDetailIndex === null) return; anniversaries[currentDetailIndex].archived = true; saveAnniversaries(); closeDetail(); renderAllAnniversaries(); updateMainCountdown(); updateStatistics(); }
window.archiveAnniversary = archiveAnniversary;
function deleteAnniversary() { if (currentDetailIndex === null) return; document.getElementById('delete-confirm-input').value = ''; document.getElementById('delete-confirm-input').dataset.expectedName = anniversaries[currentDetailIndex].name; document.getElementById('delete-modal').classList.remove('hidden'); }
window.deleteAnniversary = deleteAnniversary;
function cancelDelete() { document.getElementById('delete-modal').classList.add('hidden'); }
window.cancelDelete = cancelDelete;
function confirmDelete() {
    const inp = document.getElementById('delete-confirm-input');
    if (inp.value.trim() === inp.dataset.expectedName) { anniversaries.splice(currentDetailIndex, 1); saveAnniversaries(); document.getElementById('delete-modal').classList.add('hidden'); closeDetail(); renderAllAnniversaries(); updateMainCountdown(); updateStatistics(); }
    else { inp.style.borderColor = 'var(--danger-color)'; setTimeout(() => inp.style.borderColor = '', 500); }
}
window.confirmDelete = confirmDelete;
function updateDetailCountdown() {
    if (currentDetailIndex === null) return;
    const diff = getTargetDate(anniversaries[currentDetailIndex]) - new Date();
    if (diff < 0) return;
    const cd = document.getElementById('detail-countdown');
    cd.querySelector('[data-days]').textContent = Math.floor(diff/86400000).toString().padStart(3,'0');
    cd.querySelector('[data-hours]').textContent = Math.floor((diff%86400000)/3600000).toString().padStart(2,'0');
    cd.querySelector('[data-minutes]').textContent = Math.floor((diff%3600000)/60000).toString().padStart(2,'0');
    cd.querySelector('[data-seconds]').textContent = Math.floor((diff%60000)/1000).toString().padStart(2,'0');
}
function toggleRepeating() { if (currentDetailIndex === null) return; anniversaries[currentDetailIndex].repeating = document.getElementById('repeating-toggle').checked; saveAnniversaries(); renderMemories(); renderAllAnniversaries(); updateMainCountdown(); updateStatistics(); }
window.toggleRepeating = toggleRepeating;
function openDatePicker() {
    if (currentDetailIndex === null) return;
    const a = anniversaries[currentDetailIndex], [y,m,d] = a.date.split('-').map(Number), [h,min] = (a.time||'00:00').split(':').map(Number);
    pickerYear = y; pickerMonth = m-1; pickerDay = d; pickerHour = h; pickerMinute = min;
    document.getElementById('picker-year').textContent = pickerYear;
    document.getElementById('picker-hour').value = pickerHour;
    document.getElementById('picker-minute').value = pickerMinute;
    renderCalendar();
    document.getElementById('date-picker-modal').classList.remove('hidden');
}
window.openDatePicker = openDatePicker;
function changeYear(d) { pickerYear += d; document.getElementById('picker-year').textContent = pickerYear; renderCalendar(); }
window.changeYear = changeYear;
function changeMonth(d) { pickerMonth += d; if (pickerMonth < 0) { pickerMonth = 11; pickerYear--; } if (pickerMonth > 11) { pickerMonth = 0; pickerYear++; } document.getElementById('picker-year').textContent = pickerYear; renderCalendar(); }
window.changeMonth = changeMonth;
function renderCalendar() {
    document.getElementById('picker-month').textContent = monthNames[pickerMonth];
    const c = document.getElementById('calendar-days'); c.innerHTML = '';
    const first = new Date(pickerYear, pickerMonth, 1), last = new Date(pickerYear, pickerMonth+1, 0);
    const start = (first.getDay()+6)%7, prev = new Date(pickerYear, pickerMonth, 0);
    for (let i = start-1; i >= 0; i--) { const b = document.createElement('button'); b.className = 'calendar-day other-month'; b.textContent = prev.getDate()-i; c.appendChild(b); }
    for (let d = 1; d <= last.getDate(); d++) { const b = document.createElement('button'); b.className = 'calendar-day' + (d===pickerDay?' selected':''); b.textContent = d; b.onclick = () => { pickerDay = d; renderCalendar(); }; c.appendChild(b); }
    for (let i = 1; c.children.length < 42; i++) { const b = document.createElement('button'); b.className = 'calendar-day other-month'; b.textContent = i; c.appendChild(b); }
}
function clampTimeInput(inp, min, max) { let v = parseInt(inp.value)||0; inp.value = Math.max(min, Math.min(max, v)); }
window.clampTimeInput = clampTimeInput;
function confirmDatePicker() {
    if (currentDetailIndex === null) return;
    pickerHour = parseInt(document.getElementById('picker-hour').value)||0;
    pickerMinute = parseInt(document.getElementById('picker-minute').value)||0;
    anniversaries[currentDetailIndex].date = `${pickerYear}-${String(pickerMonth+1).padStart(2,'0')}-${String(pickerDay).padStart(2,'0')}`;
    anniversaries[currentDetailIndex].time = `${String(pickerHour).padStart(2,'0')}:${String(pickerMinute).padStart(2,'0')}`;
    saveAnniversaries(); updateDateDisplay(); renderAllAnniversaries(); updateMainCountdown(); updateStatistics(); renderMemories();
    document.getElementById('date-picker-modal').classList.add('hidden');
}
window.confirmDatePicker = confirmDatePicker;
function renderMemories() {
    if (currentDetailIndex === null) return;
    const a = anniversaries[currentDetailIndex]; if (!a.memories) a.memories = {};
    const c = document.getElementById('memories-container');
    const [startY] = a.date.split('-').map(Number), curY = new Date().getFullYear();
    const years = a.repeating ? Array.from({length: curY-startY+1}, (_,i) => curY-i) : [startY];
    photoViewerYears = years;
    c.innerHTML = years.map(y => {
        const m = a.memories[y] || {};
        return `<div class="memory-thumb" onclick="openPhotoViewer(${y})">${m.image ? `<img src="${m.image}" alt="${y}">` : '<div class="memory-thumb-empty"><span>📷</span><span>Hinzufügen</span></div>'}<div class="memory-thumb-year">${y}${m.note?' 📝':''}</div></div>`;
    }).join('');
}
function openPhotoViewer(y) {
    if (currentDetailIndex === null) return;
    photoViewerCurrentIndex = photoViewerYears.indexOf(y); if (photoViewerCurrentIndex < 0) photoViewerCurrentIndex = 0;
    updatePhotoViewer();
    document.getElementById('photo-viewer-modal').classList.remove('hidden');
}
window.openPhotoViewer = openPhotoViewer;
function updatePhotoViewer() {
    const y = photoViewerYears[photoViewerCurrentIndex], m = anniversaries[currentDetailIndex].memories[y] || {};
    document.getElementById('photo-viewer-year').textContent = y;
    document.getElementById('photo-viewer-note').value = m.note || '';
    const img = document.getElementById('photo-viewer-img');
    if (m.image) { img.src = m.image; img.style.display = 'block'; } else { img.src = ''; img.style.display = 'none'; }
}
function navigatePhoto(d) { photoViewerCurrentIndex = (photoViewerCurrentIndex + d + photoViewerYears.length) % photoViewerYears.length; updatePhotoViewer(); }
window.navigatePhoto = navigatePhoto;
function closePhotoViewer() { document.getElementById('photo-viewer-modal').classList.add('hidden'); renderMemories(); }
window.closePhotoViewer = closePhotoViewer;
function triggerPhotoUpload() { document.getElementById('photo-viewer-upload').click(); }
window.triggerPhotoUpload = triggerPhotoUpload;
function updatePhotoFromViewer() {
    const file = document.getElementById('photo-viewer-upload').files[0];
    if (!file || currentDetailIndex === null) return;
    const y = photoViewerYears[photoViewerCurrentIndex], reader = new FileReader();
    reader.onload = e => {
        if (!anniversaries[currentDetailIndex].memories) anniversaries[currentDetailIndex].memories = {};
        if (!anniversaries[currentDetailIndex].memories[y]) anniversaries[currentDetailIndex].memories[y] = {};
        anniversaries[currentDetailIndex].memories[y].image = e.target.result;
        saveAnniversaries(); updatePhotoViewer(); updateStatistics();
    };
    reader.readAsDataURL(file);
}
window.updatePhotoFromViewer = updatePhotoFromViewer;
function savePhotoNote() {
    if (currentDetailIndex === null) return;
    const y = photoViewerYears[photoViewerCurrentIndex];
    if (!anniversaries[currentDetailIndex].memories) anniversaries[currentDetailIndex].memories = {};
    if (!anniversaries[currentDetailIndex].memories[y]) anniversaries[currentDetailIndex].memories[y] = {};
    anniversaries[currentDetailIndex].memories[y].note = document.getElementById('photo-viewer-note').value;
    saveAnniversaries();
}
window.savePhotoNote = savePhotoNote;
function updateStatistics() {
    const active = anniversaries.filter(a => !a.archived), archived = anniversaries.filter(a => a.archived);
    document.getElementById('total-anniversaries').textContent = active.length;
    document.getElementById('archived-count').textContent = `${archived.length} archiviert`;
    const upcoming = getAllUpcomingAnniversaries().filter(e => e.diff > 0);
    if (upcoming[0]) { document.getElementById('next-anniversary-name').textContent = upcoming[0].name; document.getElementById('next-anniversary-days').textContent = `in ${Math.ceil(upcoming[0].diff/86400000)} Tagen`; }
    let photos = 0, notes = 0;
    anniversaries.forEach(a => { if (a.memories) Object.values(a.memories).forEach(m => { if (m.image) photos++; if (m.note) notes++; }); });
    document.getElementById('total-memories').textContent = photos + notes;
    document.getElementById('memories-detail').textContent = `${photos} Fotos, ${notes} Notizen`;
    updateRelationshipStat();
    const mc = new Array(12).fill(0);
    active.forEach(a => mc[parseInt(a.date.split('-')[1])-1]++);
    const max = Math.max(...mc, 1);
    document.getElementById('month-chart').innerHTML = mc.map((c,i) => `<div class="month-bar"><div class="month-bar-fill" style="height:${c/max*80}px"></div><span class="month-bar-label">${monthNamesShort[i]}</span></div>`).join('');
    const cm = new Date().getMonth(), tm = active.filter(a => parseInt(a.date.split('-')[1])-1 === cm);
    document.getElementById('this-month-count').textContent = tm.length;
    document.getElementById('this-month-names').textContent = tm.slice(0,2).map(a => a.name).join(', ') || '-';
    const seasons = {'Frühling':0,'Sommer':0,'Herbst':0,'Winter':0};
    active.forEach(a => { const m = parseInt(a.date.split('-')[1]); if (m>=3&&m<=5) seasons['Frühling']++; else if (m>=6&&m<=8) seasons['Sommer']++; else if (m>=9&&m<=11) seasons['Herbst']++; else seasons['Winter']++; });
    const top = Object.entries(seasons).sort((a,b) => b[1]-a[1])[0];
    document.getElementById('top-season').textContent = top[0];
    document.getElementById('season-detail').textContent = `${top[1]} Jahrestage`;
    updateMilestones();
}
function updateRelationshipStat() {
    if (relationshipAnniversaryIndex === null || !anniversaries[relationshipAnniversaryIndex]) { document.getElementById('relationship-duration').textContent = 'Nicht konfiguriert'; document.getElementById('relationship-detail').textContent = 'Tippe auf ⚙️'; return; }
    const start = new Date(anniversaries[relationshipAnniversaryIndex].date), days = Math.floor((new Date() - start) / 86400000);
    document.getElementById('relationship-duration').textContent = `${days} Tage`;
    const y = Math.floor(days/365), m = Math.floor((days%365)/30);
    document.getElementById('relationship-detail').textContent = y > 0 ? `${y} Jahre, ${m} Monate` : `${m} Monate`;
}
function updateMilestones() {
    if (relationshipAnniversaryIndex === null || !anniversaries[relationshipAnniversaryIndex]) { document.getElementById('milestones-container').innerHTML = '<span class="empty-state">Beziehungs-Jahrestag konfigurieren</span>'; return; }
    const days = Math.floor((new Date() - new Date(anniversaries[relationshipAnniversaryIndex].date)) / 86400000);
    const ms = [{d:100,l:'100 Tage',i:'💯'},{d:365,l:'1 Jahr',i:'🎂'},{d:500,l:'500 Tage',i:'🌟'},{d:730,l:'2 Jahre',i:'💕'},{d:1000,l:'1000 Tage',i:'🎉'},{d:1095,l:'3 Jahre',i:'💝'},{d:1825,l:'5 Jahre',i:'🏆'},{d:3650,l:'10 Jahre',i:'💎'}];
    document.getElementById('milestones-container').innerHTML = ms.map(m => `<div class="milestone ${days>=m.d?'achieved':''}"><span class="milestone-icon">${m.i}</span><span>${m.l}</span></div>`).join('');
}
function openRelationshipConfig() {
    const list = document.getElementById('anniversary-select-list');
    list.innerHTML = anniversaries.filter(a => !a.archived).map(a => {
        const i = anniversaries.indexOf(a);
        return `<label class="anniversary-select-item ${i===relationshipAnniversaryIndex?'selected':''}" onclick="selectRelationshipAnniversary(${i})"><input type="radio" name="relationship" ${i===relationshipAnniversaryIndex?'checked':''}><div><div style="font-weight:500">${a.name}</div><div style="font-size:13px;color:var(--text-secondary)">${formatDateDisplay(a.date,a.time)}</div></div></label>`;
    }).join('');
    document.getElementById('relationship-modal').classList.remove('hidden');
}
window.openRelationshipConfig = openRelationshipConfig;
function selectRelationshipAnniversary(i) { relationshipAnniversaryIndex = i; saveSettings(); updateStatistics(); document.querySelectorAll('.anniversary-select-item').forEach(el => el.classList.toggle('selected', parseInt(el.getAttribute('onclick').match(/\d+/)[0]) === i)); }
window.selectRelationshipAnniversary = selectRelationshipAnniversary;
function closeRelationshipConfig() { document.getElementById('relationship-modal').classList.add('hidden'); }
window.closeRelationshipConfig = closeRelationshipConfig;
function checkForCelebration() { getAllUpcomingAnniversaries().forEach(ev => { const diff = ev.targetDate - new Date(); if (diff <= 0 && diff > -1000 && !confettiTriggered[ev.name]) { confettiTriggered[ev.name] = true; triggerConfetti(); setTimeout(() => delete confettiTriggered[ev.name], 60000); } }); }
function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas'), ctx = canvas.getContext('2d');
    canvas.width = innerWidth; canvas.height = innerHeight;
    const ps = Array.from({length:150}, () => ({x:Math.random()*canvas.width,y:-20,vx:(Math.random()-0.5)*4,vy:Math.random()*2+2,color:`hsl(${Math.random()*360},70%,60%)`,size:Math.random()*8+4,rot:Math.random()*360,rs:(Math.random()-0.5)*10}));
    (function animate() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        let active = false;
        ps.forEach(p => { p.vy += 0.1; p.y += p.vy; p.x += p.vx; p.rot += p.rs; if (p.y < canvas.height+20) active = true; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180); ctx.fillStyle = p.color; ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size); ctx.restore(); });
        if (active) requestAnimationFrame(animate); else ctx.clearRect(0,0,canvas.width,canvas.height);
    })();
}
window.generateTokenHash = async t => { const h = await hashToken(t); console.log('Token:',t,'Hash:',h); return h; };
document.addEventListener('DOMContentLoaded', () => setTimeout(checkAccess, 500));
console.log('🍎 Anniversary App geladen');
