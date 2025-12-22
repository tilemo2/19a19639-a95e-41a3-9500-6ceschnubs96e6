// Token Hash
const CORRECT_TOKEN_HASH = "7c86e5eb9c3dfadb03cdebb85032711359458e33fb07de36f253cbdf4afb297f";

// Data
let anniversaries = [
    { name: "Unser Jahrestag", date: "2024-02-14", archived: false, repeating: true, memories: {} },
    { name: "Erstes Date", date: "2024-06-15", archived: false, repeating: true, memories: {} },
    { name: "Zusammengezogen", date: "2024-12-25", archived: false, repeating: true, memories: {} }
];

// State
let emptyClickCount = 0;
let clickResetTimer = null;
let currentTrailStyle = 'hearts';
let currentColor = 'red';
let visibleUnits = { days: true, hours: true, minutes: true, seconds: true };
let currentDetailIndex = null;
let confettiTriggered = {};

// Color Schemes
const colorSchemes = {
    red: { base: [255, 107, 157], light: [255, 143, 163] },
    pink: { base: [255, 154, 158], light: [254, 207, 239] },
    purple: { base: [161, 140, 209], light: [251, 194, 235] },
    blue: { base: [102, 126, 234], light: [118, 75, 162] },
    gold: { base: [240, 147, 251], light: [245, 87, 108] },
    rainbow: { base: null }
};

// Token Check
async function hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkAccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (!token) { showError(); return false; }
    const tokenHash = await hashToken(token);
    if (tokenHash === CORRECT_TOKEN_HASH) { showContent(); return true; }
    else { showError(); return false; }
}

function showError() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('content').classList.add('hidden');
}

function showContent() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');
    initApp();
}

// LocalStorage
function saveAnniversaries() { localStorage.setItem('anniversaries', JSON.stringify(anniversaries)); }
function loadAnniversaries() {
    const saved = localStorage.getItem('anniversaries');
    if (saved) { try { anniversaries = JSON.parse(saved); } catch (e) { console.error('Load error'); } }
}

function saveSettings() {
    const settings = {
        trail: currentTrailStyle,
        color: currentColor,
        units: visibleUnits,
        font: document.querySelector('input[name="font"]:checked')?.value || 'system',
        theme: document.querySelector('input[name="theme"]:checked')?.value || 'romantic'
    };
    localStorage.setItem('settings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('settings');
    if (saved) {
        try {
            const s = JSON.parse(saved);
            if (s.trail) currentTrailStyle = s.trail;
            if (s.color) currentColor = s.color;
            if (s.units) visibleUnits = s.units;
            if (s.font) applyFont(s.font);
            if (s.theme) applyTheme(s.theme);
            
            const trailRadio = document.querySelector(`input[name="trail"][value="${s.trail}"]`);
            if (trailRadio) trailRadio.checked = true;
            const colorRadio = document.querySelector(`input[name="color"][value="${s.color}"]`);
            if (colorRadio) colorRadio.checked = true;
            const fontRadio = document.querySelector(`input[name="font"][value="${s.font}"]`);
            if (fontRadio) fontRadio.checked = true;
            const themeRadio = document.querySelector(`input[name="theme"][value="${s.theme}"]`);
            if (themeRadio) themeRadio.checked = true;
            
            Object.keys(visibleUnits).forEach(unit => {
                const checkbox = document.querySelector(`input[data-unit="${unit}"]`);
                if (checkbox) checkbox.checked = visibleUnits[unit];
            });
            applyVisibleUnits();
        } catch (e) { console.error('Settings load error'); }
    }
}

// Init
function initApp() {
    loadAnniversaries();
    loadSettings();
    updateMainCountdown();
    renderAllAnniversaries();
    setInterval(() => {
        updateMainCountdown();
        updateAllCountdowns();
        if (currentDetailIndex !== null) updateDetailCountdown();
        checkForCelebration();
    }, 1000);
    initBackground();
    initMouseTrail();
    initScrollIndicator();
    initEasterEgg();
    initSettingsHandlers();
}

function initScrollIndicator() {
    const scrollIndicator = document.querySelector('.scroll-indicator');
    scrollIndicator?.addEventListener('click', () => {
        document.querySelector('.all-anniversaries-section')?.scrollIntoView({ behavior: 'smooth' });
    });
    function updateScrollIndicator() {
        if (window.scrollY > 30) scrollIndicator?.classList.add('hidden');
        else scrollIndicator?.classList.remove('hidden');
    }
    window.addEventListener('scroll', updateScrollIndicator, { passive: true });
}

function initEasterEgg() {
    document.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.anniversary-card:not(.add-card)')) return;
        if (e.target.closest('.scroll-indicator')) return;
        if (e.target.closest('.settings')) return;
        if (e.target.closest('.detail-modal')) return;
        if (e.target.closest('.confirm-modal')) return;
        
        spawnTrailElement(e.clientX, e.clientY);
        emptyClickCount++;
        if (emptyClickCount >= 15) {
            emptyClickCount = 0;
            openSettings();
        }
        clearTimeout(clickResetTimer);
        clickResetTimer = setTimeout(() => { emptyClickCount = 0; }, 2000);
    });
}

function initSettingsHandlers() {
    document.querySelectorAll('input[name="font"]').forEach(radio => {
        radio.addEventListener('change', (e) => { applyFont(e.target.value); saveSettings(); });
    });
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', (e) => { applyTheme(e.target.value); saveSettings(); });
    });
    document.querySelectorAll('input[name="trail"]').forEach(radio => {
        radio.addEventListener('change', (e) => { currentTrailStyle = e.target.value; saveSettings(); });
    });
    document.querySelectorAll('input[name="color"]').forEach(radio => {
        radio.addEventListener('change', (e) => { currentColor = e.target.value; saveSettings(); });
    });
    document.querySelectorAll('input[data-unit]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            visibleUnits[e.target.dataset.unit] = e.target.checked;
            applyVisibleUnits();
            saveSettings();
        });
    });
}

function applyFont(font) {
    document.body.classList.remove('font-serif', 'font-mono');
    if (font === 'serif') document.body.classList.add('font-serif');
    else if (font === 'mono') document.body.classList.add('font-mono');
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
}

function applyVisibleUnits() {
    const units = ['days', 'hours', 'minutes', 'seconds'];
    units.forEach((unit) => {
        const items = document.querySelectorAll(`.countdown-item:has([data-${unit}]), .countdown-item:has(#${unit})`);
        items.forEach(item => {
            if (visibleUnits[unit]) item.classList.remove('unit-hidden');
            else item.classList.add('unit-hidden');
        });
    });
    renderAllAnniversaries();
}

// Helper
window.generateTokenHash = async function(token) {
    const hash = await hashToken(token);
    console.log('Token:', token);
    console.log('Hash:', hash);
    return hash;
};

// Init on load
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => { await checkAccess(); }, 500);
});

console.log('🍎 Anniversary App geladen');
// Countdown Logic
function getAllUpcomingAnniversaries() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = anniversaries.filter(a => !a.archived).map(anniversary => {
        const eventDate = new Date(anniversary.date);
        const thisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        const nextYear = new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
        let targetDate = anniversary.repeating ? (thisYear >= today ? thisYear : nextYear) : new Date(anniversary.date);
        const diff = targetDate - today;
        return { ...anniversary, targetDate, diff };
    });
    return upcoming.sort((a, b) => a.diff - b.diff);
}

function updateMainCountdown() {
    const upcomingEvents = getAllUpcomingAnniversaries();
    const nextEvent = upcomingEvents[0];
    if (!nextEvent) {
        document.getElementById('event-name').textContent = 'Kein Jahrestag eingetragen';
        return;
    }
    const now = new Date();
    const diff = nextEvent.targetDate - now;
    if (diff < 0) return;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    document.getElementById('days').textContent = days.toString().padStart(3, '0');
    document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
    const nameEl = document.getElementById('main-name-scroll');
    nameEl.textContent = nextEvent.name;
    if (nameEl.scrollWidth > nameEl.parentElement.clientWidth) {
        nameEl.classList.add('scroll');
        nameEl.innerHTML = nextEvent.name + ' • ' + nextEvent.name;
    } else {
        nameEl.classList.remove('scroll');
        nameEl.textContent = nextEvent.name;
    }
    document.getElementById('event-date').textContent = formatDate(nextEvent.date);
}

function updateAllCountdowns() {
    const cards = document.querySelectorAll('.anniversary-card:not(.add-card)');
    const upcomingEvents = getAllUpcomingAnniversaries();
    cards.forEach((card, index) => {
        if (upcomingEvents[index + 1]) updateCountdownDisplayForCard(card, upcomingEvents[index + 1]);
    });
}

function updateCountdownDisplayForCard(card, event) {
    const now = new Date();
    const diff = event.targetDate - now;
    if (diff < 0) return;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const daysEl = card.querySelector('[data-days]');
    const hoursEl = card.querySelector('[data-hours]');
    const minutesEl = card.querySelector('[data-minutes]');
    const secondsEl = card.querySelector('[data-seconds]');
    if (daysEl) daysEl.textContent = days.toString().padStart(3, '0');
    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
    if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
    if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('de-DE', options);
}

// Render
function renderAllAnniversaries() {
    const container = document.getElementById('all-anniversaries');
    const upcomingEvents = getAllUpcomingAnniversaries();
    const eventsToShow = upcomingEvents.slice(1);
    container.innerHTML = '';
    eventsToShow.forEach((event, index) => {
        const actualIndex = anniversaries.findIndex(a => a.name === event.name && a.date === event.date && !a.archived);
        const card = document.createElement('div');
        card.className = 'anniversary-card';
        card.style.animationDelay = `${index * 0.1}s`;
        card.onclick = () => openDetail(actualIndex);
        const unitsHTML = ['days', 'hours', 'minutes', 'seconds'].map((unit, i) => {
            const hidden = !visibleUnits[unit] ? 'unit-hidden' : '';
            const minWidth = unit === 'days' ? 'countdown-days' : '';
            const sepHidden = i < 3 && !visibleUnits[['hours', 'minutes', 'seconds'][i]] ? 'sep-hidden' : '';
            return `
                <div class="countdown-item ${minWidth} ${hidden}">
                    <span class="countdown-number" data-${unit}>${unit === 'days' ? '000' : '00'}</span>
                    <span class="countdown-label">${unit === 'days' ? 'Tage' : unit === 'hours' ? 'Std' : unit === 'minutes' ? 'Min' : 'Sek'}</span>
                </div>
                ${i < 3 ? `<div class="countdown-separator ${sepHidden}">:</div>` : ''}
            `;
        }).join('');
        card.innerHTML = `
            <h2 class="event-name">${event.name}</h2>
            <div class="countdown">${unitsHTML}</div>
            <p class="event-date">${formatDate(event.date)}</p>
        `;
        container.appendChild(card);
        updateCountdownDisplayForCard(card, event);
    });
    const addCard = document.createElement('div');
    addCard.className = 'anniversary-card add-card';
    addCard.innerHTML = `<div class="add-content"><span class="add-plus">+</span><span class="add-text">Jahrestag hinzufügen</span></div>`;
    addCard.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = prompt('Name des Jahrestags:');
        if (!name) return;
        const date = prompt('Datum (YYYY-MM-DD):');
        if (!date) return;
        anniversaries.push({ name, date, archived: false, repeating: true, memories: {} });
        saveAnniversaries();
        renderAllAnniversaries();
    });
    container.appendChild(addCard);
}

// Trail
function spawnTrailElement(x, y) {
    if (currentTrailStyle === 'none') return;
    const element = document.createElement('div');
    const size = Math.random() * 16 + 12;
    const drift = (Math.random() - 0.5) * 60;
    element.style.left = `${x - size / 2}px`;
    element.style.top = `${y - size / 2}px`;
    element.style.fontSize = `${size}px`;
    element.style.setProperty('--drift', `${drift}px`);
    if (currentTrailStyle === 'hearts') {
        element.className = 'heart';
        element.innerHTML = '❤';
        element.style.color = getTrailColor();
    } else if (currentTrailStyle === 'sparks') {
        element.className = 'spark';
        element.style.background = getTrailColor();
        element.style.boxShadow = `0 0 ${size}px ${getTrailColor()}`;
    }
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 2500);
}

function getTrailColor() {
    if (currentColor === 'rainbow') {
        const hue = Math.random() * 360;
        return `hsl(${hue}, 85%, 65%)`;
    }
    const scheme = colorSchemes[currentColor];
    if (!scheme) return 'rgba(255, 100, 150, 0.9)';
    const mix = Math.random();
    const r = Math.floor(scheme.base[0] * (1 - mix) + scheme.light[0] * mix);
    const g = Math.floor(scheme.base[1] * (1 - mix) + scheme.light[1] * mix);
    const b = Math.floor(scheme.base[2] * (1 - mix) + scheme.light[2] * mix);
    return `rgba(${r}, ${g}, ${b}, 0.9)`;
}

function initMouseTrail() {
    const canvas = document.getElementById('trail-canvas');
    const ctx = canvas.getContext('2d');
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    let lastMoveTime = 0;
    document.addEventListener('mousemove', (e) => {
        if (currentTrailStyle === 'none') return;
        for (let i = 0; i < 2; i++) {
            setTimeout(() => {
                spawnTrailElement(e.clientX + (Math.random() - 0.5) * 10, e.clientY + (Math.random() - 0.5) * 10);
            }, i * 50);
        }
    });
    let touchTimeout;
    document.addEventListener('touchmove', (e) => {
        if (currentTrailStyle === 'none') return;
        clearTimeout(touchTimeout);
        touchTimeout = setTimeout(() => {
            const touch = e.touches[0];
            spawnTrailElement(touch.clientX, touch.clientY);
        }, 100);
    }, { passive: true });
}

// Background
function initBackground() {
    const canvas = document.getElementById('background-canvas');
    const ctx = canvas.getContext('2d');
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    let hue = 0;
    function draw() {
        const theme = document.body.getAttribute('data-theme') || 'romantic';
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        const start = getComputedStyle(document.body).getPropertyValue('--bg-start');
        const mid = getComputedStyle(document.body).getPropertyValue('--bg-mid');
        const end = getComputedStyle(document.body).getPropertyValue('--bg-end');
        gradient.addColorStop(0, start);
        gradient.addColorStop(0.5, mid);
        gradient.addColorStop(1, end);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
    }
    draw();
}
// Modals
function closeOnBackdrop(event, modalId) {
    if (event.target.id === modalId) {
        document.getElementById(modalId).classList.add('hidden');
        if (modalId === 'detail-modal') {
            currentDetailIndex = null;
            document.querySelector('.detail-dropdown')?.classList.add('hidden');
        }
    }
}
window.closeOnBackdrop = closeOnBackdrop;

function openSettings() {
    renderArchivedList();
    document.getElementById('settings-modal').classList.remove('hidden');
}
function closeSettings() { document.getElementById('settings-modal').classList.add('hidden'); }
window.openSettings = openSettings;
window.closeSettings = closeSettings;

function renderArchivedList() {
    const list = document.getElementById('archived-list');
    const archived = anniversaries.filter(a => a.archived);
    if (archived.length === 0) {
        list.innerHTML = '<p class="empty-state">Keine archivierten Jahrestage</p>';
        return;
    }
    list.innerHTML = archived.map((item, index) => `
        <div class="archived-item glass">
            <div><div style="font-weight:500;">${item.name}</div><div style="font-size:13px;color:var(--text-secondary);">${formatDate(item.date)}</div></div>
            <button onclick="unarchiveAnniversary(${anniversaries.indexOf(item)})">Wiederherstellen</button>
        </div>
    `).join('');
}

function unarchiveAnniversary(index) {
    anniversaries[index].archived = false;
    saveAnniversaries();
    renderArchivedList();
    renderAllAnniversaries();
}
window.unarchiveAnniversary = unarchiveAnniversary;

// Detail Modal
function openMainDetail() {
    const upcomingEvents = getAllUpcomingAnniversaries();
    const nextEvent = upcomingEvents[0];
    if (!nextEvent) return;
    const actualIndex = anniversaries.findIndex(a => a.name === nextEvent.name && a.date === nextEvent.date && !a.archived);
    if (actualIndex !== -1) openDetail(actualIndex);
}
window.openMainDetail = openMainDetail;

function openDetail(index) {
    currentDetailIndex = index;
    const anniversary = anniversaries[index];
    document.getElementById('detail-name').value = anniversary.name;
    document.getElementById('detail-date').value = anniversary.date;
    document.getElementById('repeating-toggle').checked = anniversary.repeating !== false;
    document.getElementById('detail-modal').classList.remove('hidden');
    updateDetailCountdown();
    renderMemories();
    
    document.getElementById('detail-name').addEventListener('input', () => {
        anniversaries[currentDetailIndex].name = document.getElementById('detail-name').value;
        saveAnniversaries();
        renderAllAnniversaries();
    });
    document.getElementById('detail-date').addEventListener('change', () => {
        anniversaries[currentDetailIndex].date = document.getElementById('detail-date').value;
        saveAnniversaries();
        renderAllAnniversaries();
    });
}
window.openDetail = openDetail;

function closeDetail() {
    document.getElementById('detail-modal').classList.add('hidden');
    document.querySelector('.detail-dropdown')?.classList.add('hidden');
    currentDetailIndex = null;
}
window.closeDetail = closeDetail;

function toggleDetailMenu(e) {
    e.stopPropagation();
    const dropdown = document.querySelector('.detail-dropdown');
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown() {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeDropdown);
            });
        }, 0);
    }
}
window.toggleDetailMenu = toggleDetailMenu;

function archiveAnniversary() {
    if (currentDetailIndex === null) return;
    anniversaries[currentDetailIndex].archived = true;
    saveAnniversaries();
    closeDetail();
    renderAllAnniversaries();
}
window.archiveAnniversary = archiveAnniversary;

function deleteAnniversary() {
    if (currentDetailIndex === null) return;
    const anniversary = anniversaries[currentDetailIndex];
    document.getElementById('delete-confirm-input').value = '';
    document.getElementById('delete-confirm-input').dataset.expectedName = anniversary.name;
    document.getElementById('delete-modal').classList.remove('hidden');
}
window.deleteAnniversary = deleteAnniversary;

function cancelDelete() { document.getElementById('delete-modal').classList.add('hidden'); }
window.cancelDelete = cancelDelete;

function confirmDelete() {
    const input = document.getElementById('delete-confirm-input');
    const expected = input.dataset.expectedName;
    if (input.value.trim() === expected) {
        anniversaries.splice(currentDetailIndex, 1);
        saveAnniversaries();
        document.getElementById('delete-modal').classList.add('hidden');
        closeDetail();
        renderAllAnniversaries();
    } else {
        input.style.borderColor = 'var(--danger-color)';
        setTimeout(() => { input.style.borderColor = ''; }, 500);
    }
}
window.confirmDelete = confirmDelete;

function updateDetailCountdown() {
    if (currentDetailIndex === null) return;
    const anniversary = anniversaries[currentDetailIndex];
    const upcomingEvents = getAllUpcomingAnniversaries();
    const event = upcomingEvents.find(e => e.name === anniversary.name && e.date === anniversary.date);
    if (!event) return;
    const now = new Date();
    const diff = event.targetDate - now;
    if (diff < 0) return;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const countdown = document.getElementById('detail-countdown');
    const daysEl = countdown.querySelector('[data-days]');
    const hoursEl = countdown.querySelector('[data-hours]');
    const minutesEl = countdown.querySelector('[data-minutes]');
    const secondsEl = countdown.querySelector('[data-seconds]');
    if (daysEl) daysEl.textContent = days.toString().padStart(3, '0');
    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
    if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
    if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
}

function toggleRepeating() {
    if (currentDetailIndex === null) return;
    anniversaries[currentDetailIndex].repeating = document.getElementById('repeating-toggle').checked;
    saveAnniversaries();
    renderMemories();
}
window.toggleRepeating = toggleRepeating;

// Memories
function renderMemories() {
    if (currentDetailIndex === null) return;
    const anniversary = anniversaries[currentDetailIndex];
    if (!anniversary.memories) anniversary.memories = {};
    const container = document.getElementById('memories-container');
    const currentYear = new Date().getFullYear();
    const startYear = new Date(anniversary.date).getFullYear();
    const years = anniversary.repeating ? Array.from({ length: currentYear - startYear + 1 }, (_, i) => currentYear - i) : [startYear];
    container.innerHTML = years.map(year => {
        const memory = anniversary.memories[year] || { note: '', image: '' };
        return `
            <div class="memory-year glass inset">
                <div class="memory-year-title">${year}</div>
                <div class="memory-image-upload">
                    ${memory.image ? `<img src="${memory.image}" class="memory-image" alt="Foto ${year}">` : ''}
                    <input type="file" accept="image/*" onchange="uploadMemoryImage(${year})" id="upload-${year}" style="display:none;">
                    <button class="upload-btn inset" onclick="document.getElementById('upload-${year}').click()">
                        ${memory.image ? 'Foto ändern' : '📷 Foto hinzufügen'}
                    </button>
                </div>
                <textarea class="memory-note inset" placeholder="Notiz für ${year}..." oninput="saveMemoryNote(${year}, this.value)">${memory.note}</textarea>
            </div>
        `;
    }).join('');
}

function uploadMemoryImage(year) {
    if (currentDetailIndex === null) return;
    const input = document.getElementById(`upload-${year}`);
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        if (!anniversaries[currentDetailIndex].memories) anniversaries[currentDetailIndex].memories = {};
        if (!anniversaries[currentDetailIndex].memories[year]) anniversaries[currentDetailIndex].memories[year] = { note: '', image: '' };
        anniversaries[currentDetailIndex].memories[year].image = e.target.result;
        saveAnniversaries();
        renderMemories();
    };
    reader.readAsDataURL(file);
}
window.uploadMemoryImage = uploadMemoryImage;

function saveMemoryNote(year, note) {
    if (currentDetailIndex === null) return;
    if (!anniversaries[currentDetailIndex].memories) anniversaries[currentDetailIndex].memories = {};
    if (!anniversaries[currentDetailIndex].memories[year]) anniversaries[currentDetailIndex].memories[year] = { note: '', image: '' };
    anniversaries[currentDetailIndex].memories[year].note = note;
    saveAnniversaries();
}
window.saveMemoryNote = saveMemoryNote;

// Confetti
function checkForCelebration() {
    const upcomingEvents = getAllUpcomingAnniversaries();
    upcomingEvents.forEach(event => {
        const now = new Date();
        const diff = event.targetDate - now;
        if (diff <= 0 && diff > -1000 && !confettiTriggered[event.name]) {
            confettiTriggered[event.name] = true;
            triggerConfetti();
            setTimeout(() => { delete confettiTriggered[event.name]; }, 60000);
        }
    });
}

function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -20,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 2 + 2,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            size: Math.random() * 8 + 4,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        });
    }
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        particles.forEach(p => {
            p.vy += 0.1;
            p.y += p.vy;
            p.x += p.vx;
            p.rotation += p.rotationSpeed;
            if (p.y < canvas.height + 20) active = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });
        if (active) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    animate();
}
