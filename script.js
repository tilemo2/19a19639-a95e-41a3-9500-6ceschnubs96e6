// ============================================
// KONFIGURATION
// ============================================

const CORRECT_TOKEN_HASH = "7c86e5eb9c3dfadb03cdebb85032711359458e33fb07de36f253cbdf4afb297f"; // Dein Token-Hash

// Standard-Jahrestage (werden aus localStorage geladen wenn vorhanden)
let anniversaries = [
    { name: "Unser Jahrestag", date: "2024-02-14" },
    { name: "Erstes Date", date: "2024-06-15" },
    { name: "Zusammengezogen", date: "2024-12-25" },
    { name: "Erster Urlaub", date: "2025-03-20" },
    { name: "Verlobung", date: "2025-08-10" }
];

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
// LOCALSTORAGE FUNKTIONEN
// ============================================

function saveAnniversaries() {
    const data = JSON.stringify(anniversaries);
    localStorage.setItem('anniversaries', data);
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

// ============================================
// APP INITIALISIERUNG
// ============================================

function initApp() {
    loadAnniversaries();
    updateMainCountdown();
    renderAllAnniversaries();
    setInterval(() => {
        updateMainCountdown();
        updateAllCountdowns();
    }, 1000);
    
    // Hintergrund und Mouse Trail initialisieren
    initBackground();
    initMouseTrail();
    
    // Smooth scroll für Scroll-Indicator
    document.querySelector('.scroll-indicator')?.addEventListener('click', () => {
        document.querySelector('.all-anniversaries-section')?.scrollIntoView({ behavior: 'smooth' });
    });
}

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
        
        return {
            ...anniversary,
            targetDate,
            diff
        };
    });
    
    // Sortiere nach nächstem Datum
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
    const cards = document.querySelectorAll('.anniversary-card');
    const upcomingEvents = getAllUpcomingAnniversaries();
    
    cards.forEach((card, index) => {
        if (upcomingEvents[index + 1]) { // Skip first (main countdown)
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
// RENDER ALLE JAHRESTAGE
// ============================================

function renderAllAnniversaries() {
    const container = document.getElementById('all-anniversaries');
    const upcomingEvents = getAllUpcomingAnniversaries();
    
    // Skip first event (already shown in main countdown)
    const eventsToShow = upcomingEvents.slice(1);
    
    container.innerHTML = '';
    
    eventsToShow.forEach((event, index) => {
        const card = document.createElement('div');
        card.className = 'anniversary-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <h2 class="event-name">${event.name}</h2>
            <div class="countdown">
                <div class="countdown-item">
                    <span class="countdown-number" data-days>0</span>
                    <span class="countdown-label">Tage</span>
                </div>
                <div class="countdown-separator">:</div>
                <div class="countdown-item">
                    <span class="countdown-number" data-hours>0</span>
                    <span class="countdown-label">Std</span>
                </div>
                <div class="countdown-separator">:</div>
                <div class="countdown-item">
                    <span class="countdown-number" data-minutes>0</span>
                    <span class="countdown-label">Min</span>
                </div>
                <div class="countdown-separator">:</div>
                <div class="countdown-item">
                    <span class="countdown-number" data-seconds>0</span>
                    <span class="countdown-label">Sek</span>
                </div>
            </div>
            <p class="event-date">${formatDate(event.date)}</p>
        `;
        
        container.appendChild(card);
        updateCountdownDisplayForCard(card, event);
    });
}

// ============================================
// HINTERGRUND-EFFEKTE
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

let currentTrailStyle = 'dots';
const trail = [];
const maxTrailLength = 20;

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
// HELPER FUNKTION FÜR KONSOLE
// ============================================

window.generateTokenHash = async function(token) {
    const hash = await hashToken(token);
    console.log('Token:', token);
    console.log('Hash:', hash);
    console.log('Kopiere den Hash und füge ihn in CORRECT_TOKEN_HASH ein');
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
