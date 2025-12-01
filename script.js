// ============================================
// KONFIGURATION
// ============================================

const CORRECT_TOKEN_HASH = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"; // Hash von "password"

// Standard-Jahrestage (werden aus localStorage geladen wenn vorhanden)
let anniversaries = [
    { name: "Unser Jahrestag", date: "2024-02-14" },
    { name: "Erstes Date", date: "2024-06-15" },
    { name: "Zusammengezogen", date: "2024-12-25" }
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
    
    loadSettings();
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

function saveSettings() {
    const settings = {
        background: document.querySelector('input[name="background"]:checked')?.value || 'gradient',
        counter: document.querySelector('input[name="counter"]:checked')?.value || 'default',
        trail: document.querySelector('input[name="trail"]:checked')?.value || 'dots'
    };
    localStorage.setItem('settings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('settings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            
            // Setze Radio-Buttons
            if (settings.background) {
                const bgRadio = document.querySelector(`input[name="background"][value="${settings.background}"]`);
                if (bgRadio) bgRadio.checked = true;
            }
            if (settings.counter) {
                const counterRadio = document.querySelector(`input[name="counter"][value="${settings.counter}"]`);
                if (counterRadio) counterRadio.checked = true;
                document.body.setAttribute('data-counter', settings.counter);
            }
            if (settings.trail) {
                const trailRadio = document.querySelector(`input[name="trail"][value="${settings.trail}"]`);
                if (trailRadio) trailRadio.checked = true;
                currentTrailStyle = settings.trail;
            }
            
            // Wende Einstellungen an
            applyBackgroundStyle(settings.background);
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
    renderAnniversariesList();
    updateCountdown();
    setInterval(updateCountdown, 1000);
    
    // Event Listeners
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('close-settings').addEventListener('click', closeSettings);
    document.getElementById('add-anniversary').addEventListener('click', openAddModal);
    document.getElementById('cancel-add').addEventListener('click', closeAddModal);
    document.getElementById('confirm-add').addEventListener('click', addNewAnniversary);
    
    // Settings Event Listeners
    document.querySelectorAll('input[name="background"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyBackgroundStyle(e.target.value);
            saveSettings();
        });
    });
    
    document.querySelectorAll('input[name="counter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.body.setAttribute('data-counter', e.target.value);
            saveSettings();
        });
    });
    
    document.querySelectorAll('input[name="trail"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentTrailStyle = e.target.value;
            saveSettings();
        });
    });
    
    // Hintergrund und Mouse Trail initialisieren
    initBackground();
    initMouseTrail();
}

// ============================================
// COUNTDOWN LOGIK
// ============================================

function getNextAnniversary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let nextEvent = null;
    let minDiff = Infinity;
    
    anniversaries.forEach(anniversary => {
        const eventDate = new Date(anniversary.date);
        const thisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        const nextYear = new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
        
        let targetDate = thisYear >= today ? thisYear : nextYear;
        const diff = targetDate - today;
        
        if (diff < minDiff) {
            minDiff = diff;
            nextEvent = { ...anniversary, targetDate };
        }
    });
    
    return nextEvent;
}

function updateCountdown() {
    const nextEvent = getNextAnniversary();
    
    if (!nextEvent) {
        document.getElementById('event-name').textContent = 'Kein Jahrestag eingetragen';
        return;
    }
    
    const now = new Date();
    const diff = nextEvent.targetDate - now;
    
    if (diff < 0) {
        updateCountdown(); // Nächsten Event finden
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    document.getElementById('days').textContent = days.toString().padStart(2, '0');
    document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
    
    document.getElementById('event-name').textContent = nextEvent.name;
    document.getElementById('event-date').textContent = formatDate(nextEvent.date);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('de-DE', options);
}

// ============================================
// JAHRESTAGE VERWALTUNG
// ============================================

function renderAnniversariesList() {
    const list = document.getElementById('anniversaries-list');
    list.innerHTML = '';
    
    anniversaries.forEach((anniversary, index) => {
        const item = document.createElement('div');
        item.className = 'anniversary-item';
        item.innerHTML = `
            <div class="anniversary-info">
                <div class="anniversary-name">${anniversary.name}</div>
                <div class="anniversary-date">${formatDate(anniversary.date)}</div>
            </div>
            <button class="btn-delete" onclick="deleteAnniversary(${index})">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        `;
        list.appendChild(item);
    });
}

function openAddModal() {
    document.getElementById('add-modal').classList.add('active');
}

function closeAddModal() {
    document.getElementById('add-modal').classList.remove('active');
    document.getElementById('new-event-name').value = '';
    document.getElementById('new-event-date').value = '';
}

function addNewAnniversary() {
    const name = document.getElementById('new-event-name').value.trim();
    const date = document.getElementById('new-event-date').value;
    
    if (!name || !date) {
        alert('Bitte alle Felder ausfüllen');
        return;
    }
    
    anniversaries.push({ name, date });
    saveAnniversaries();
    renderAnniversariesList();
    closeAddModal();
    updateCountdown();
}

function deleteAnniversary(index) {
    if (confirm('Diesen Jahrestag wirklich löschen?')) {
        anniversaries.splice(index, 1);
        saveAnniversaries();
        renderAnniversariesList();
        updateCountdown();
    }
}

// ============================================
// SETTINGS PANEL
// ============================================

function openSettings() {
    document.getElementById('settings-panel').classList.add('active');
}

function closeSettings() {
    document.getElementById('settings-panel').classList.remove('active');
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
    
    const savedBg = document.querySelector('input[name="background"]:checked')?.value || 'gradient';
    applyBackgroundStyle(savedBg);
}

function applyBackgroundStyle(style) {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    
    const canvas = document.getElementById('background-canvas');
    const ctx = canvas.getContext('2d');
    
    switch(style) {
        case 'gradient':
            animateGradient(ctx, canvas);
            break;
        case 'particles':
            animateParticles(ctx, canvas);
            break;
        case 'waves':
            animateWaves(ctx, canvas);
            break;
        case 'solid':
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
    }
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

function animateParticles(ctx, canvas) {
    const particles = [];
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1
        });
    }
    
    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        animationFrame = requestAnimationFrame(draw);
    }
    draw();
}

function animateWaves(ctx, canvas) {
    let offset = 0;
    
    function draw() {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(0, 122, 255, 0.3)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            for (let x = 0; x < canvas.width; x++) {
                const y = canvas.height / 2 + Math.sin((x + offset + i * 100) * 0.01) * (50 + i * 20);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        
        offset += 2;
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
        if (currentTrailStyle === 'none') return;
        
        trail.push({ x: e.clientX, y: e.clientY, age: 0 });
        if (trail.length > maxTrailLength) trail.shift();
    });
    
    document.addEventListener('touchmove', (e) => {
        if (currentTrailStyle === 'none') return;
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
        
        // Alte Punkte entfernen
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
