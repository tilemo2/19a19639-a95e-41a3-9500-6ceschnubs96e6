// ============================================
// KONFIGURATION
// ============================================

const CORRECT_TOKEN_HASH = "7c86e5eb9c3dfadb03cdebb85032711359458e33fb07de36f253cbdf4afb297f";

// Standard-Jahrestage
let anniversaries = [
    { name: "Unser Jahrestag", date: "2024-02-14" },
    { name: "Erstes Date", date: "2024-06-15" },
    { name: "Zusammengezogen", date: "2024-12-25" },
    { name: "Erster Urlaub", date: "2025-03-20" },
    { name: "Verlobung", date: "2025-08-10" }
];

// Easter Egg Variablen
let emptyClickCount = 0;
let settingsUnlocked = false;

// Settings
let currentTrailStyle = 'dots';
let visibleUnits = { days: true, hours: true, minutes: true, seconds: true };

// ============================================
// TOKEN-PRÜFUNG
// ============================================

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
    
    if (!token) {
        showError();
        return false;
    }
    
    const tokenHash = await hashToken(token);
    
    if (tokenHash === CORRECT_TOKEN_HASH) {
        showContent();
        return true;
    } else {
        showError();
        return false;
    }
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

// ============================================
// LOCALSTORAGE
// ============================================

function saveAnniversaries() {
    localStorage.setItem('anniversaries', JSON.stringify(anniversaries));
}

function loadAnniversaries() {
    const saved = localStorage.getItem('anniversaries');
    if (saved) {
        try {
            anniversaries = JSON.parse(saved);
        } catch (e) {
            console.error('Fehler beim Laden der Jahrestage');
        }
    }
}

function saveSettings() {
    const settings = {
        font: document.getElementById('font-select').value,
        trail: document.getElementById('trail-select').value,
        units: visibleUnits
    };
    localStorage.setItem('settings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('settings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            
            if (settings.font) {
                document.getElementById('font-select').value = settings.font;
                applyFont(settings.font);
            }
            if (settings.trail) {
                document.getElementById('trail-select').value = settings.trail;
                currentTrailStyle = settings.trail;
            }
            if (settings.units) {
                visibleUnits = settings.units;
                Object.keys(visibleUnits).forEach(unit => {
                    const checkbox = document.querySelector(`input[data-unit="${unit}"]`);
                    if (checkbox) checkbox.checked = visibleUnits[unit];
                });
                applyVisibleUnits();
            }
        } catch (e) {
            console.error('Fehler beim Laden der Einstellungen');
        }
    }
}

// ============================================
// APP INITIALISIERUNG
// ============================================

function initApp() {
    loadAnniversaries();
    loadSettings();
    updateMainCountdown();
    renderAllAnniversaries();
    
    setInterval(() => {
        updateMainCountdown();
        updateAllCountdowns();
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
        if (window.scrollY > 30) {
            scrollIndicator?.classList.add('hidden');
        } else {
            scrollIndicator?.classList.remove('hidden');
        }
    }
    
    window.addEventListener('scroll', updateScrollIndicator, { passive: true });
    window.addEventListener('touchmove', updateScrollIndicator, { passive: true });
}

function initEasterEgg() {
    document.addEventListener('pointerdown', (e) => {
        // Ignore clicks on interactive elements
        if (e.target.closest('.anniversary-card')) return;
        if (e.target.closest('.scroll-indicator')) return;
        if (e.target.closest('.settings')) return;
        
        // Spawn heart animation
        spawnHeart(e.clientX, e.clientY);
        
        // Count clicks
        emptyClickCount++;
        
        // Unlock settings after 10 clicks
        if (emptyClickCount >= 10 && !settingsUnlocked) {
            settingsUnlocked = true;
            openSettings();
        }
        
        // Reset counter after 1 second of inactivity
        clearTimeout(window._clickReset);
        window._clickReset = setTimeout(() => {
            emptyClickCount = 0;
        }, 1000);
    });
}

function spawnHeart(x, y) {
    const heart = document.createElement('div');
    const size = Math.random() * 18 + 10;
    
    heart.className = 'heart';
    heart.style.left = `${x - size / 2}px`;
    heart.style.top = `${y - size / 2}px`;
    heart.style.fontSize = `${size}px`;
    heart.style.color = `rgba(255, ${100 + Math.random() * 100}, ${150 + Math.random() * 100}, 0.9)`;
    heart.innerHTML = '❤';
    
    document.body.appendChild(heart);
    
    setTimeout(() => heart.remove(), 2500);
}

function initSettingsHandlers() {
    // Font selector
    document.getElementById('font-select').addEventListener('change', (e) => {
        applyFont(e.target.value);
        saveSettings();
    });
    
    // Trail selector
    document.getElementById('trail-select').addEventListener('change', (e) => {
        currentTrailStyle = e.target.value;
        saveSettings();
    });
    
    // Unit checkboxes
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
    if (font === 'serif') {
        document.body.classList.add('font-serif');
    } else if (font === 'mono') {
        document.body.classList.add('font-mono');
    }
}

function applyVisibleUnits() {
    const units = ['days', 'hours', 'minutes', 'seconds'];
    
    units.forEach((unit, index) => {
        const items = document.querySelectorAll(`.countdown-item:nth-child(${index * 2 + 1})`);
        const separators = document.querySelectorAll(`.countdown-separator:nth-child(${index * 2 + 2})`);
        
        items.forEach(item => {
            if (visibleUnits[unit]) {
                item.classList.remove('unit-hidden');
            } else {
                item.classList.add('unit-hidden');
            }
        });
        
        // Hide separator if next unit is hidden
        if (index < units.length - 1) {
            separators.forEach(sep => {
                if (!visibleUnits[units[index + 1]]) {
                    sep.classList.add('sep-hidden');
                } else {
                    sep.classList.remove('sep-hidden');
                }
            });
        }
    });
}

// ============================================
// SETTINGS MODAL
// ============================================

function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

window.openSettings = openSettings;
window.closeSettings = closeSettings;

// ============================================
// COUNTDOWN LOGIK
// ============================================

function getAllUpcomingAnniversaries() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = anniversaries.map(anniversary => {
        const eventDate = new Date(anniversary.date);
        const thisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        const nextYear = new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
        
        let targetDate = thisYear >= today ? thisYear : nextYear;
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
    
    updateCountdownDisplay(nextEvent, 'main');
}

function updateAllCountdowns() {
    const cards = document.querySelectorAll('.anniversary-card:not(.add-card)');
    const upcomingEvents = getAllUpcomingAnniversaries();
    
    cards.forEach((card, index) => {
        if (upcomingEvents[index + 1]) {
            updateCountdownDisplayForCard(card, upcomingEvents[index + 1]);
        }
    });
}

function updateCountdownDisplay(event, type = 'main') {
    const now = new Date();
    const diff = event.targetDate - now;
    
    if (diff < 0) {
        if (type === 'main') {
            updateMainCountdown();
        }
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (type === 'main') {
        document.getElementById('days').textContent = days.toString().padStart(2, '0');
        document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        
        document.getElementById('event-name').textContent = event.name;
        document.getElementById('event-date').textContent = formatDate(event.date);
    }
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
    
    if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
    if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
    if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('de-DE', options);
}

// ============================================
// RENDER JAHRESTAGE
// ============================================

function renderAllAnniversaries() {
    const container = document.getElementById('all-anniversaries');
    const upcomingEvents = getAllUpcomingAnniversaries();
    const eventsToShow = upcomingEvents.slice(1);
    
    container.innerHTML = '';
    
    eventsToShow.forEach((event, index) => {
        const card = document.createElement('div');
        card.className = 'anniversary-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <h2 class="event-name">${event.name}</h2>
            <div class="countdown">
                <div class="countdown-item ${!visibleUnits.days ? 'unit-hidden' : ''}">
                    <span class="countdown-number" data-days>0</span>
                    <span class="countdown-label">Tage</span>
                </div>
                <div class="countdown-separator ${!visibleUnits.hours ? 'sep-hidden' : ''}">:</div>
                <div class="countdown-item ${!visibleUnits.hours ? 'unit-hidden' : ''}">
                    <span class="countdown-number" data-hours>0</span>
                    <span class="countdown-label">Std</span>
                </div>
                <div class="countdown-separator ${!visibleUnits.minutes ? 'sep-hidden' : ''}">:</div>
                <div class="countdown-item ${!visibleUnits.minutes ? 'unit-hidden' : ''}">
                    <span class="countdown-number" data-minutes>0</span>
                    <span class="countdown-label">Min</span>
                </div>
                <div class="countdown-separator ${!visibleUnits.seconds ? 'sep-hidden' : ''}">:</div>
                <div class="countdown-item ${!visibleUnits.seconds ? 'unit-hidden' : ''}">
                    <span class="countdown-number" data-seconds>0</span>
                    <span class="countdown-label">Sek</span>
                </div>
            </div>
            <p class="event-date">${formatDate(event.date)}</p>
        `;
        
        container.appendChild(card);
        updateCountdownDisplayForCard(card, event);
    });
    
    // Add-Karte
    const addCard = document.createElement('div');
    addCard.className = 'anniversary-card add-card';
    addCard.innerHTML = `
        <div class="add-content">
            <span class="add-plus">+</span>
            <span class="add-text">Jahrestag hinzufügen</span>
        </div>
    `;
    
    addCard.addEventListener('click', () => {
        const name = prompt('Name des Jahrestags:');
        if (!name) return;
        
        const date = prompt('Datum (YYYY-MM-DD):');
        if (!date) return;
        
        anniversaries.push({ name, date });
        saveAnniversaries();
        renderAllAnniversaries();
    });
    
    container.appendChild(addCard);
}

// ============================================
// HINTERGRUND
// ============================================

let animationFrame;

function initBackground() {
    const canvas = document.getElementById('background-canvas');
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    
    animateGradient(ctx, canvas);
}

function animateGradient(ctx, canvas) {
    let hue = 0;
    
    function draw() {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, `hsl(${hue}, 70%, 20%)`);
        gradient.addColorStop(0.5, `hsl(${hue + 60}, 70%, 15%)`);
        gradient.addColorStop(1, `hsl(${hue + 120}, 70%, 10%)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        hue = (hue + 0.2) % 360;
        animationFrame = requestAnimationFrame(draw);
    }
    draw();
}

// ============================================
// MOUSE TRAIL
// ============================================

const trail = [];
const maxTrailLength = 13;

function initMouseTrail() {
    const canvas = document.getElementById('trail-canvas');
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    
    document.addEventListener('mousemove', (e) => {
        trail.push({ x: e.clientX, y: e.clientY, age: 0 });
        if (trail.length > maxTrailLength) trail.shift();
    });
    
    document.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        trail.push({ x: touch.clientX, y: touch.clientY, age: 0 });
        if (trail.length > maxTrailLength) trail.shift();
    });
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        trail.forEach((point, i) => {
            point.age++;
            const opacity = 1 - (point.age / maxTrailLength);
            
            if (currentTrailStyle === 'none') return;
            
            if (currentTrailStyle === 'dots') {
                ctx.fillStyle = `rgba(0, 122, 255, ${opacity * 0.6})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (currentTrailStyle === 'line' && i > 0) {
                ctx.strokeStyle = `rgba(0, 122, 255, ${opacity * 0.6})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
            } else if (currentTrailStyle === 'glow') {
                ctx.fillStyle = `rgba(0, 122, 255, ${opacity * 0.3})`;
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'rgba(0, 122, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });
        
        trail.forEach((point, i) => {
            if (point.age > maxTrailLength) trail.splice(i, 1);
        });
        
        requestAnimationFrame(animate);
    }
    animate();
}

// ============================================
// HELPER
// ============================================

window.generateTokenHash = async function(token) {
    const hash = await hashToken(token);
    console.log('Token:', token);
    console.log('Hash:', hash);
    return hash;
};

// ============================================
// INITIALISIERUNG
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        await checkAccess();
    }, 500);
});

console.log('🍎 iOS-Style Anniversary App geladen');
console.log('💡 Token-Hash generieren: generateTokenHash("dein_token")');
