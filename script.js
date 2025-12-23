// Token Hash für Zugang zur Seite
const CORRECT_TOKEN_HASH = "7c86e5eb9c3dfadb03cdebb85032711359458e33fb07de36f253cbdf4afb297f";

// ============================================
// SUPABASE KONFIGURATION - HIER ANPASSEN!
// ============================================
const SUPABASE_CONFIG = {
    url: 'https://dcxjtdiykoudrtgmrslu.supabase.co',     // z.B. 'https://abcdefgh.supabase.co'
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjeGp0ZGl5a291ZHJ0Z21yc2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NDIxODksImV4cCI6MjA4MjAxODE4OX0.5zG5uM344HRpYbFNCTT2MbgSscodtdmFj6YxZ8Fdvzs'                          // Der lange "anon public" Key
};

// Supabase Client initialisieren
let supabaseClient = null;

function initSupabase() {
    if (!SUPABASE_CONFIG.url.includes('DEIN_PROJECT')) {
        supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        console.log('✅ Supabase initialisiert');
    } else {
        console.warn('⚠️ Supabase nicht konfiguriert - nur lokale Speicherung');
    }
}

let anniversaries = [];
let isSaving = false;
let saveQueue = false;
let emptyClickCount = 0, clickResetTimer = null, settingsOpenBuffer = false;
let currentTrailStyle = 'hearts', currentColor = 'red';
let visibleUnits = { days: true, hours: true, minutes: true, seconds: true };
let currentDetailIndex = null, confettiTriggered = {}, isNewAnniversary = false;
let relationshipAnniversaryIndex = null;
let currentHeroAnniversaryIndex = null;
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
    try {
        const token = new URLSearchParams(window.location.search).get('token');
        if (!token) { showError(); return; }
        if (await hashToken(token) === CORRECT_TOKEN_HASH) showContent();
        else showError();
    } catch (e) {
        console.error('Access check failed:', e);
        showError();
    }
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

// ============================================
// SUPABASE SPEICHER-FUNKTIONEN
// ============================================

function saveAnniversaries() { 
    // Speichere auch lokal als Backup
    localStorage.setItem('anniversaries', JSON.stringify(anniversaries));
    
    // Speichere auf Supabase (mit Debouncing)
    if (isSaving) {
        saveQueue = true;
        return;
    }
    saveToSupabase();
}

async function saveToSupabase() {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase nicht konfiguriert - nur lokale Speicherung');
        return;
    }
    
    isSaving = true;
    
    try {
        const { data, error } = await supabaseClient
            .from('anniversaries')
            .upsert({
                id: 'user_data',  // Feste ID für single-user
                data: anniversaries,
                updated_at: new Date().toISOString()
            })
            .select();
        
        if (error) throw error;
        
        console.log('✅ Auf Supabase gespeichert');
    } catch (e) {
        console.error('❌ Supabase Speichern fehlgeschlagen:', e);
    }
    
    isSaving = false;
    
    // Falls während dem Speichern weitere Änderungen kamen
    if (saveQueue) {
        saveQueue = false;
        setTimeout(saveToSupabase, 1000);
    }
}

async function loadAnniversaries() {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase nicht konfiguriert - lade von localStorage');
        loadFromLocalStorage();
        return;
    }
    
    try {
        console.log('🔄 Versuche von Supabase zu laden...');
        
        const { data, error } = await supabaseClient
            .from('anniversaries')
            .select('*')
            .eq('id', 'user_data')
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('📁 Noch keine Daten auf Supabase - lade lokal');
                loadFromLocalStorage();
                // Speichere lokale Daten auf Supabase
                if (anniversaries.length > 0) {
                    console.log('📤 Übertrage lokale Daten zu Supabase...');
                    await saveToSupabase();
                }
            } else {
                throw error;
            }
            return;
        }
        
        if (data && data.data) {
            anniversaries = data.data.map(a => ({...a, time: a.time || '00:00'}));
            console.log('✅ Von Supabase geladen:', anniversaries.length, 'Jahrestage');
            // Auch lokal speichern als Backup
            localStorage.setItem('anniversaries', JSON.stringify(anniversaries));
        }
    } catch (e) {
        console.error('❌ Supabase Laden fehlgeschlagen:', e);
        console.log('📦 Fallback: Lade von localStorage');
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    const s = localStorage.getItem('anniversaries');
    if (s) {
        try { 
            anniversaries = JSON.parse(s).map(a => ({...a, time: a.time || '00:00'}));
            console.log('📦 Von localStorage geladen:', anniversaries.length, 'Jahrestage');
        } catch(e) {
            console.error('Error loading anniversaries:', e);
        }
    }
}

// Debug-Funktion um alles zurückzusetzen (über Konsole aufrufbar)
window.resetAllData = async function() {
    localStorage.removeItem('anniversaries');
    localStorage.removeItem('settings');
    anniversaries = [];
    
    if (supabaseClient) {
        try {
            await supabaseClient.from('anniversaries').delete().eq('id', 'user_data');
            await supabaseClient.from('anniversaries').delete().eq('id', 'user_settings');
            console.log('✅ Supabase Daten gelöscht');
        } catch (e) {
            console.error('❌ Fehler beim Löschen:', e);
        }
    }
    
    location.reload();
};

function saveSettings() {
    const settings = {
        trail: currentTrailStyle, 
        color: currentColor, 
        units: visibleUnits,
        font: document.querySelector('input[name="font"]:checked')?.value || 'system',
        theme: document.querySelector('input[name="theme"]:checked')?.value || 'romantic',
        relationshipIndex: relationshipAnniversaryIndex
    };
    
    // Speichere lokal als Backup
    localStorage.setItem('settings', JSON.stringify(settings));
    
    // Speichere auch auf Supabase
    saveSettingsToSupabase(settings);
}

async function saveSettingsToSupabase(settings) {
    if (!supabaseClient) return;
    
    try {
        await supabaseClient
            .from('anniversaries')
            .upsert({
                id: 'user_settings',
                data: settings,
                updated_at: new Date().toISOString()
            });
        console.log('✅ Einstellungen auf Supabase gespeichert');
    } catch (e) {
        console.error('❌ Fehler beim Speichern der Einstellungen:', e);
    }
}
async function loadSettings() {
    // Versuche zuerst von Supabase zu laden
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('anniversaries')
                .select('*')
                .eq('id', 'user_settings')
                .single();
            
            if (data && data.data) {
                console.log('✅ Einstellungen von Supabase geladen');
                applySettings(data.data);
                // Auch lokal speichern als Backup
                localStorage.setItem('settings', JSON.stringify(data.data));
                return;
            }
        } catch (e) {
            console.log('📦 Keine Einstellungen auf Supabase - lade lokal');
        }
    }
    
    // Fallback: Von localStorage laden
    const s = localStorage.getItem('settings');
    if (s) {
        try {
            const p = JSON.parse(s);
            applySettings(p);
        } catch(e) {
            console.error('Fehler beim Laden der Einstellungen:', e);
        }
    }
}

function applySettings(p) {
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
}
}

async function initApp() {
    // Zeige Ladezustand
    document.getElementById('main-name-scroll').textContent = 'Lädt...';
    
    // Initialisiere Supabase
    initSupabase();
    
    // Lade Daten von Supabase (async)
    await loadAnniversaries();
    await loadSettings();
    updateMainCountdown(); 
    renderAllAnniversaries(); 
    updateStatistics();
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
    initDetailInputHandlers();
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
        saveAnniversaries(); 
        renderAllAnniversaries(); 
        updateMainCountdown(); 
        updateStatistics();
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
/*
 * COUNTDOWN-LOGIK:
 * 1. Jeder Jahrestag wiederholt jährlich (unabhängig von repeating-Flag)
 * 2. Wenn Countdown 0 erreicht: Confetti-Animation + Grace Period beginnt
 * 3. Grace Period (12h): Kachel bleibt vorne, zählt rückwärts (-00:01:30 etc.)
 * 4. Nach Grace Period: Jahrestag ordnet sich hinten ein, zählt zum nächsten Jahr
 * 5. repeating-Flag bestimmt nur, ob mehrere Jahres-Erinnerungen möglich sind
 */

function getTargetDate(a) {
    const [y,m,d] = a.date.split('-').map(Number);
    const [h,min] = (a.time||'00:00').split(':').map(Number);
    
    // ALLE Jahrestage wiederholen jährlich für den Countdown
    // Das "repeating"-Flag bestimmt nur, ob man mehrere Jahres-Erinnerungen hat
    const now = new Date(), ty = now.getFullYear();
    const thisY = new Date(ty, m-1, d, h, min);
    const nextY = new Date(ty+1, m-1, d, h, min);
    return thisY > now ? thisY : nextY;
}

// Gibt das letzte (vergangene) Vorkommen des Jahrestags zurück
function getLastOccurrence(a) {
    const [y,m,d] = a.date.split('-').map(Number);
    const [h,min] = (a.time||'00:00').split(':').map(Number);
    
    const now = new Date(), ty = now.getFullYear();
    const thisY = new Date(ty, m-1, d, h, min);
    const lastY = new Date(ty-1, m-1, d, h, min);
    return thisY <= now ? thisY : lastY;
}

// 12 Stunden in Millisekunden
const GRACE_PERIOD = 12 * 60 * 60 * 1000;

// Hole alle Jahrestage für die Anzeige (inkl. kürzlich vergangene)
function getAllAnniversariesForDisplay() {
    const now = new Date();
    return anniversaries.filter(a => !a.archived).map((a) => {
        const targetDate = getTargetDate(a);
        const lastOccurrence = getLastOccurrence(a);
        const diff = targetDate - now;
        const timeSinceLast = now - lastOccurrence;
        
        // Wenn der Jahrestag kürzlich war (innerhalb von 12h), zeige ihn mit negativem Countdown
        const isInGracePeriod = timeSinceLast >= 0 && timeSinceLast < GRACE_PERIOD;
        
        return { 
            ...a, 
            targetDate: isInGracePeriod ? lastOccurrence : targetDate,
            diff: isInGracePeriod ? -timeSinceLast : diff,
            originalIndex: anniversaries.indexOf(a),
            isInGracePeriod,
            timeSinceLast
        };
    }).sort((a,b) => {
        // Jahrestage in der Grace Period zuerst (die aktuellsten), dann zukünftige nach Datum
        if (a.isInGracePeriod && !b.isInGracePeriod) return -1;
        if (!a.isInGracePeriod && b.isInGracePeriod) return 1;
        if (a.isInGracePeriod && b.isInGracePeriod) return a.diff - b.diff; // Weniger negativ = aktueller
        return a.diff - b.diff;
    });
}
function getAllUpcomingAnniversaries() {
    const now = new Date();
    return anniversaries.filter(a => !a.archived).map((a) => {
        const targetDate = getTargetDate(a);
        const lastOccurrence = getLastOccurrence(a);
        const diff = targetDate - now;
        const timeSinceLast = now - lastOccurrence;
        
        const isInGracePeriod = timeSinceLast >= 0 && timeSinceLast < GRACE_PERIOD;
        
        return { 
            ...a, 
            targetDate: isInGracePeriod ? lastOccurrence : targetDate,
            diff: isInGracePeriod ? -timeSinceLast : diff,
            originalIndex: anniversaries.indexOf(a),
            isInGracePeriod,
            timeSinceLast
        };
    }).sort((a,b) => {
        if (a.isInGracePeriod && !b.isInGracePeriod) return -1;
        if (!a.isInGracePeriod && b.isInGracePeriod) return 1;
        if (a.isInGracePeriod && b.isInGracePeriod) return a.diff - b.diff;
        return a.diff - b.diff;
    });
}
function updateMainCountdown() {
    const allEvs = getAllUpcomingAnniversaries();
    // Zeige entweder einen in der Grace Period oder den nächsten zukünftigen
    const ev = allEvs.find(e => e.isInGracePeriod) || allEvs.find(e => e.diff > 0);
    
    if (!ev) { 
        document.getElementById('main-name-scroll').textContent = 'Kein Jahrestag'; 
        document.getElementById('event-date').textContent = '';
        document.getElementById('countdown').classList.remove('countdown-negative', 'countdown-celebrating');
        currentHeroAnniversaryIndex = null;
        return; 
    }
    
    // Prüfe ob sich der Hero-Jahrestag geändert hat
    if (currentHeroAnniversaryIndex !== ev.originalIndex) {
        currentHeroAnniversaryIndex = ev.originalIndex;
        // Auch Karten neu rendern wenn sich der Hero ändert
        renderAllAnniversaries();
    }
    
    const isNegative = ev.diff < 0;
    const absDiff = Math.abs(ev.diff);
    const days = Math.floor(absDiff / 86400000);
    const hours = Math.floor((absDiff % 86400000) / 3600000);
    const mins = Math.floor((absDiff % 3600000) / 60000);
    const secs = Math.floor((absDiff % 60000) / 1000);
    
    const prefix = isNegative ? '-' : '';
    document.getElementById('days').textContent = prefix + days.toString().padStart(3,'0');
    document.getElementById('hours').textContent = hours.toString().padStart(2,'0');
    document.getElementById('minutes').textContent = mins.toString().padStart(2,'0');
    document.getElementById('seconds').textContent = secs.toString().padStart(2,'0');
    document.getElementById('main-name-scroll').textContent = ev.name;
    
    // Toggle celebrating class
    const countdownEl = document.getElementById('countdown');
    countdownEl.classList.toggle('countdown-negative', isNegative);
    countdownEl.classList.toggle('countdown-celebrating', isNegative);
    
    const annivNum = getAnniversaryNumber(ev);
    const annivNumText = formatAnniversaryNumber(annivNum);
    const dateText = formatDateDisplay(ev.date, ev.time);
    const celebratingText = isNegative ? '🎉 Jetzt feiern! • ' : '';
    document.getElementById('event-date').textContent = celebratingText + (annivNumText ? `${annivNumText} • ${dateText}` : dateText);
}
function updateAllCountdowns() {
    const cards = document.querySelectorAll('.anniversary-card:not(.add-card)');
    const evs = getAllAnniversariesForDisplay().slice(1);
    
    // Prüfe ob die Anzahl der Karten noch stimmt
    if (cards.length !== evs.length) {
        // Anzahl hat sich geändert - komplett neu rendern
        renderAllAnniversaries();
        return;
    }
    
    cards.forEach((c,i) => { 
        if (evs[i]) {
            // Prüfe ob die Karte noch zum richtigen Jahrestag gehört
            const cardIndex = parseInt(c.dataset.originalIndex);
            if (cardIndex !== evs[i].originalIndex) {
                // Indizes stimmen nicht mehr - neu rendern
                renderAllAnniversaries();
                return;
            }
            updateCountdownDisplayForCard(c, evs[i]); 
        }
    });
}
function updateCountdownDisplayForCard(card, ev) {
    const isNegative = ev.diff < 0;
    const absDiff = Math.abs(ev.diff);
    const d = Math.floor(absDiff/86400000);
    const h = Math.floor((absDiff%86400000)/3600000);
    const m = Math.floor((absDiff%3600000)/60000);
    const s = Math.floor((absDiff%60000)/1000);
    
    const el = (sel) => card.querySelector(sel);
    const prefix = isNegative ? '-' : '';
    if (el('[data-days]')) el('[data-days]').textContent = prefix + d.toString().padStart(3,'0');
    if (el('[data-hours]')) el('[data-hours]').textContent = h.toString().padStart(2,'0');
    if (el('[data-minutes]')) el('[data-minutes]').textContent = m.toString().padStart(2,'0');
    if (el('[data-seconds]')) el('[data-seconds]').textContent = s.toString().padStart(2,'0');
    
    // Toggle celebrating class on card
    card.classList.toggle('card-celebrating', isNegative);
}
function formatDateDisplay(date, time) {
    const [y,m,d] = date.split('-');
    return `${d}.${m}.${y}` + (time && time !== '00:00' ? ` • ${time}` : '');
}

// Berechnet die wievielte Wiederholung des Jahrestags bevorsteht/gefeiert wird
function getAnniversaryNumber(a) {
    const [startYear] = a.date.split('-').map(Number);
    
    // Wenn in Grace Period, nutze das letzte Vorkommen
    if (a.isInGracePeriod) {
        const lastOcc = getLastOccurrence(a);
        return lastOcc.getFullYear() - startYear;
    }
    
    const targetDate = getTargetDate(a);
    const targetYear = targetDate.getFullYear();
    return targetYear - startYear;
}

// Formatiert die Wiederholungsnummer als Text
function formatAnniversaryNumber(num) {
    if (num === 0) return null; // Erstes Mal, keine Nummer anzeigen
    return `${num}. Mal`;
}
function renderAllAnniversaries() {
    const c = document.getElementById('all-anniversaries');
    const evs = getAllAnniversariesForDisplay().slice(1); // Erste ist im Hero-Bereich
    
    c.innerHTML = '';
    evs.forEach((ev,i) => {
        const card = document.createElement('div');
        card.className = 'anniversary-card' + (ev.isInGracePeriod ? ' card-celebrating' : '');
        card.style.animationDelay = `${i*0.1}s`;
        card.dataset.originalIndex = ev.originalIndex;
        card.onclick = () => openDetail(ev.originalIndex);
        
        const annivNum = getAnniversaryNumber(ev);
        const annivNumText = formatAnniversaryNumber(annivNum);
        const celebratingBadge = ev.isInGracePeriod ? '<span class="celebrating-badge">🎉 Jetzt!</span>' : '';
        
        card.innerHTML = `
            <div class="event-name-container">
                <h2 class="event-name"><span class="event-name-text">${ev.name}</span></h2>
            </div>
            ${celebratingBadge}
            ${annivNumText && !ev.isInGracePeriod ? `<span class="anniversary-number">${annivNumText}</span>` : ''}
            <div class="countdown">${['days','hours','minutes','seconds'].map((u,j) => `
                <div class="countdown-item ${u==='days'?'countdown-days':''} ${!visibleUnits[u]?'unit-hidden':''}">
                    <span class="countdown-number" data-${u}>${u==='days'?'000':'00'}</span>
                    <span class="countdown-label">${u==='days'?'Tage':u==='hours'?'Std':u==='minutes'?'Min':'Sek'}</span>
                </div>${j<3?`<div class="countdown-separator ${!visibleUnits[['hours','minutes','seconds'][j]]?'sep-hidden':''}">:</div>`:''}`).join('')}
            </div>
            <p class="event-date">${formatDateDisplay(ev.date, ev.time)}</p>`;
        c.appendChild(card);
        updateCountdownDisplayForCard(card, ev);
        
        // Check if name needs marquee animation
        setTimeout(() => {
            const nameContainer = card.querySelector('.event-name-container');
            const nameText = card.querySelector('.event-name-text');
            if (nameText && nameContainer && nameText.scrollWidth > nameContainer.offsetWidth) {
                nameText.classList.add('marquee');
                // Duplicate text for seamless loop
                nameText.innerHTML = `${ev.name}<span class="marquee-spacer">•</span>${ev.name}`;
            }
        }, 100);
    });
    const add = document.createElement('div');
    add.className = 'anniversary-card add-card';
    add.innerHTML = '<div class="add-content"><span class="add-plus">+</span><span class="add-text">Jahrestag hinzufügen</span></div>';
    add.onclick = e => { e.stopPropagation(); createNewAnniversary(); };
    c.appendChild(add);
}
function createNewAnniversary() {
    anniversaries.push({ 
        name: "Neuer Jahrestag", 
        date: new Date().toISOString().split('T')[0], 
        time: "00:00", 
        archived: false, 
        repeating: false,  // Standardmäßig einmalig (nur eine Erinnerung)
        memories: {} 
    });
    saveAnniversaries(); 
    renderAllAnniversaries(); 
    updateMainCountdown(); 
    updateStatistics();
    isNewAnniversary = true; 
    openDetail(anniversaries.length - 1);
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
    // Prevent closing settings if buffer is active
    if (id === 'settings-modal' && settingsOpenBuffer) return;
    
    if (e.target.id === id) {
        document.getElementById(id).classList.add('hidden');
        document.body.classList.remove('modal-open');
        if (id === 'detail-modal') { 
            currentDetailIndex = null; 
            isNewAnniversary = false; 
            document.getElementById('detail-dropdown')?.classList.add('hidden'); 
        }
    }
}
window.closeOnBackdrop = closeOnBackdrop;
function openSettings() { 
    settingsOpenBuffer = true;
    setTimeout(() => settingsOpenBuffer = false, 500);
    renderArchivedList(); 
    document.getElementById('settings-modal').classList.remove('hidden'); 
    document.body.classList.add('modal-open'); 
}
function closeSettings() { document.getElementById('settings-modal').classList.add('hidden'); document.body.classList.remove('modal-open'); }
window.openSettings = openSettings; window.closeSettings = closeSettings;
function renderArchivedList() {
    const list = document.getElementById('archived-list');
    const arch = anniversaries.filter(a => a.archived);
    list.innerHTML = arch.length ? arch.map(a => {
        const idx = anniversaries.indexOf(a);
        return `<div class="archived-item" onclick="openArchivedDetail(${idx})" style="cursor:pointer"><div><div style="font-weight:500">${a.name}</div><div style="font-size:13px;color:var(--text-secondary)">${formatDateDisplay(a.date,a.time)}</div></div><button onclick="event.stopPropagation();unarchiveAnniversary(${idx})">Wiederherstellen</button></div>`;
    }).join('') : '<p class="empty-state">Keine archivierten Jahrestage</p>';
}
function openArchivedDetail(i) {
    closeSettings();
    setTimeout(() => openDetail(i), 100);
}
window.openArchivedDetail = openArchivedDetail;
function unarchiveAnniversary(i) { 
    anniversaries[i].archived = false; 
    saveAnniversaries(); 
    renderArchivedList(); 
    renderAllAnniversaries(); 
    updateMainCountdown(); 
    updateStatistics(); 
}
window.unarchiveAnniversary = unarchiveAnniversary;
function openMainDetail() { 
    const ev = getAllUpcomingAnniversaries().find(e => e.diff > 0); 
    if (ev) openDetail(ev.originalIndex); 
}
window.openMainDetail = openMainDetail;
function openDetail(i) {
    currentDetailIndex = i;
    const a = anniversaries[i];
    document.getElementById('detail-name').value = a.name;
    document.getElementById('repeating-toggle').checked = a.repeating !== false;
    updateDateDisplay();
    document.getElementById('detail-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
    updateDetailCountdown(); 
    renderMemories();
    if (isNewAnniversary) setTimeout(() => { 
        const n = document.getElementById('detail-name'); 
        n.focus(); 
        n.select(); 
    }, 100);
}
window.openDetail = openDetail;
function updateDateDisplay() {
    if (currentDetailIndex === null) return;
    const a = anniversaries[currentDetailIndex];
    const [y,m,d] = a.date.split('-');
    
    const annivNum = getAnniversaryNumber(a);
    const annivNumText = formatAnniversaryNumber(annivNum);
    
    // Datum anzeigen
    document.getElementById('display-date').textContent = `${d}.${m}.${y}`;
    document.getElementById('display-time').textContent = a.time || '00:00';
    
    // Wiederholungsnummer anzeigen/aktualisieren
    let numEl = document.getElementById('detail-anniversary-number');
    if (annivNumText) {
        if (!numEl) {
            numEl = document.createElement('div');
            numEl.id = 'detail-anniversary-number';
            numEl.className = 'detail-anniversary-number';
            const dateDisplay = document.querySelector('.datetime-picker');
            dateDisplay.parentNode.insertBefore(numEl, dateDisplay);
        }
        numEl.textContent = annivNumText;
    } else if (numEl) {
        numEl.remove();
    }
}
function closeDetail() { 
    document.getElementById('detail-modal').classList.add('hidden'); 
    document.body.classList.remove('modal-open'); 
    document.getElementById('detail-dropdown')?.classList.add('hidden'); 
    currentDetailIndex = null; 
    isNewAnniversary = false; 
}
window.closeDetail = closeDetail;
function toggleDetailMenu(e) {
    e.stopPropagation();
    const dd = document.getElementById('detail-dropdown');
    dd.classList.toggle('hidden');
    if (!dd.classList.contains('hidden')) {
        const close = ev => { 
            if (!dd.contains(ev.target) && !ev.target.closest('.menu-dots')) { 
                dd.classList.add('hidden'); 
                document.removeEventListener('click', close); 
            } 
        };
        setTimeout(() => document.addEventListener('click', close), 0);
    }
}
window.toggleDetailMenu = toggleDetailMenu;
function archiveAnniversary() { 
    if (currentDetailIndex === null) return; 
    anniversaries[currentDetailIndex].archived = true; 
    saveAnniversaries(); 
    closeDetail(); 
    renderAllAnniversaries(); 
    updateMainCountdown(); 
    updateStatistics(); 
}
window.archiveAnniversary = archiveAnniversary;
function deleteAnniversary() { 
    if (currentDetailIndex === null) return; 
    document.getElementById('delete-confirm-input').value = ''; 
    document.getElementById('delete-confirm-input').dataset.expectedName = anniversaries[currentDetailIndex].name; 
    document.getElementById('delete-modal').classList.remove('hidden'); 
}
window.deleteAnniversary = deleteAnniversary;
function cancelDelete() { document.getElementById('delete-modal').classList.add('hidden'); }
window.cancelDelete = cancelDelete;
function confirmDelete() {
    const inp = document.getElementById('delete-confirm-input');
    if (inp.value.trim() === inp.dataset.expectedName) { 
        const deletedName = anniversaries[currentDetailIndex].name;
        
        // Entferne aus confettiTriggered falls vorhanden
        delete confettiTriggered[deletedName];
        
        // Reset Hero-Index damit er neu berechnet wird
        currentHeroAnniversaryIndex = null;
        
        // Lösche den Jahrestag
        anniversaries.splice(currentDetailIndex, 1); 
        
        // Speichere (lokal + Supabase)
        saveAnniversaries(); 
        
        // Schließe Modals
        document.getElementById('delete-modal').classList.add('hidden'); 
        closeDetail(); 
        
        // Komplett neu rendern
        renderAllAnniversaries(); 
        updateMainCountdown(); 
        updateStatistics(); 
    }
    else { 
        inp.style.borderColor = 'var(--danger-color)'; 
        setTimeout(() => inp.style.borderColor = '', 500); 
    }
}
window.confirmDelete = confirmDelete;
function updateDetailCountdown() {
    if (currentDetailIndex === null) return;
    const a = anniversaries[currentDetailIndex];
    if (!a) return;
    const diff = getTargetDate(a) - new Date();
    if (diff < 0) return;
    const cd = document.getElementById('detail-countdown');
    cd.querySelector('[data-days]').textContent = Math.floor(diff/86400000).toString().padStart(3,'0');
    cd.querySelector('[data-hours]').textContent = Math.floor((diff%86400000)/3600000).toString().padStart(2,'0');
    cd.querySelector('[data-minutes]').textContent = Math.floor((diff%3600000)/60000).toString().padStart(2,'0');
    cd.querySelector('[data-seconds]').textContent = Math.floor((diff%60000)/1000).toString().padStart(2,'0');
}
function toggleRepeating() { 
    if (currentDetailIndex === null) return; 
    anniversaries[currentDetailIndex].repeating = document.getElementById('repeating-toggle').checked; 
    saveAnniversaries(); 
    renderMemories(); 
    renderAllAnniversaries(); 
    updateMainCountdown(); 
    updateStatistics(); 
}
window.toggleRepeating = toggleRepeating;
function openDatePicker() {
    if (currentDetailIndex === null) return;
    const a = anniversaries[currentDetailIndex];
    const [y,m,d] = a.date.split('-').map(Number);
    const [h,min] = (a.time||'00:00').split(':').map(Number);
    pickerYear = y; 
    pickerMonth = m-1; 
    pickerDay = d; 
    pickerHour = h; 
    pickerMinute = min;
    document.getElementById('picker-year').textContent = pickerYear;
    updateTimeDisplay();
    renderCalendar();
    document.getElementById('date-picker-modal').classList.remove('hidden');
}
window.openDatePicker = openDatePicker;
function updateTimeDisplay() {
    document.getElementById('picker-hour-display').textContent = String(pickerHour).padStart(2,'0');
    document.getElementById('picker-minute-display').textContent = String(pickerMinute).padStart(2,'0');
}
function changeHour(d) {
    pickerHour = (pickerHour + d + 24) % 24;
    updateTimeDisplay();
}
window.changeHour = changeHour;
function changeMinute(d) {
    pickerMinute = (pickerMinute + d + 60) % 60;
    updateTimeDisplay();
}
window.changeMinute = changeMinute;
function changeYear(d) { 
    pickerYear += d; 
    document.getElementById('picker-year').textContent = pickerYear; 
    renderCalendar(); 
}
window.changeYear = changeYear;
function changeMonth(d) { 
    pickerMonth += d; 
    if (pickerMonth < 0) { pickerMonth = 11; pickerYear--; } 
    if (pickerMonth > 11) { pickerMonth = 0; pickerYear++; } 
    document.getElementById('picker-year').textContent = pickerYear; 
    renderCalendar(); 
}
window.changeMonth = changeMonth;
function renderCalendar() {
    document.getElementById('picker-month').textContent = monthNames[pickerMonth];
    const c = document.getElementById('calendar-days'); 
    c.innerHTML = '';
    const first = new Date(pickerYear, pickerMonth, 1);
    const last = new Date(pickerYear, pickerMonth+1, 0);
    const start = (first.getDay()+6)%7;
    const prev = new Date(pickerYear, pickerMonth, 0);
    for (let i = start-1; i >= 0; i--) { 
        const b = document.createElement('button'); 
        b.className = 'calendar-day other-month'; 
        b.textContent = prev.getDate()-i; 
        c.appendChild(b); 
    }
    for (let d = 1; d <= last.getDate(); d++) { 
        const b = document.createElement('button'); 
        b.className = 'calendar-day' + (d===pickerDay?' selected':''); 
        b.textContent = d; 
        b.onclick = () => { pickerDay = d; renderCalendar(); }; 
        c.appendChild(b); 
    }
    for (let i = 1; c.children.length < 42; i++) { 
        const b = document.createElement('button'); 
        b.className = 'calendar-day other-month'; 
        b.textContent = i; 
        c.appendChild(b); 
    }
}
function confirmDatePicker() {
    if (currentDetailIndex === null) return;
    
    // Update the anniversary data
    anniversaries[currentDetailIndex].date = `${pickerYear}-${String(pickerMonth+1).padStart(2,'0')}-${String(pickerDay).padStart(2,'0')}`;
    anniversaries[currentDetailIndex].time = `${String(pickerHour).padStart(2,'0')}:${String(pickerMinute).padStart(2,'0')}`;
    
    // Save to localStorage
    saveAnniversaries(); 
    
    // Update the detail view display
    updateDateDisplay(); 
    updateDetailCountdown();
    
    // Update the cards/tiles view
    renderAllAnniversaries(); 
    
    // Update main countdown (in case the order changed)
    updateMainCountdown(); 
    
    // Update statistics
    updateStatistics(); 
    
    // Update memories for the new date
    renderMemories();
    
    // Close the date picker
    document.getElementById('date-picker-modal').classList.add('hidden');
}
window.confirmDatePicker = confirmDatePicker;
function renderMemories() {
    if (currentDetailIndex === null) return;
    const a = anniversaries[currentDetailIndex]; 
    if (!a.memories) a.memories = {};
    const c = document.getElementById('memories-container');
    const [startY] = a.date.split('-').map(Number);
    const curY = new Date().getFullYear();
    
    // Bei repeating: zeige alle Jahre vom Start bis jetzt
    // Bei nicht-repeating: zeige nur das Startjahr
    let years;
    if (a.repeating) {
        // Erstelle Array von aktuellem Jahr rückwärts bis zum Startjahr
        const numYears = Math.max(1, curY - startY + 1);
        years = Array.from({length: numYears}, (_,i) => curY - i);
    } else {
        years = [startY];
    }
    
    photoViewerYears = years;
    c.innerHTML = years.map(y => {
        const m = a.memories[y] || {};
        return `<div class="memory-thumb" onclick="openPhotoViewer(${y})">${m.image ? `<img src="${m.image}" alt="${y}">` : '<div class="memory-thumb-empty"><span>📷</span><span>Hinzufügen</span></div>'}<div class="memory-thumb-year">${y}${m.note?' 📝':''}</div></div>`;
    }).join('');
}
function openPhotoViewer(y) {
    if (currentDetailIndex === null) return;
    photoViewerCurrentIndex = photoViewerYears.indexOf(y); 
    if (photoViewerCurrentIndex < 0) photoViewerCurrentIndex = 0;
    updatePhotoViewer();
    document.getElementById('photo-viewer-modal').classList.remove('hidden');
}
window.openPhotoViewer = openPhotoViewer;
function updatePhotoViewer() {
    const y = photoViewerYears[photoViewerCurrentIndex];
    const m = anniversaries[currentDetailIndex].memories[y] || {};
    document.getElementById('photo-viewer-year').textContent = y;
    document.getElementById('photo-viewer-note').value = m.note || '';
    
    const img = document.getElementById('photo-viewer-img');
    const placeholder = document.getElementById('photo-placeholder');
    const editBtn = document.getElementById('photo-edit-btn');
    
    if (m.image) { 
        img.src = m.image; 
        img.style.display = 'block';
        placeholder.classList.add('hidden');
        editBtn.classList.remove('hidden');
    } else { 
        img.src = ''; 
        img.style.display = 'none';
        placeholder.classList.remove('hidden');
        editBtn.classList.add('hidden');
    }
}
function navigatePhoto(d) { 
    photoViewerCurrentIndex = (photoViewerCurrentIndex + d + photoViewerYears.length) % photoViewerYears.length; 
    updatePhotoViewer(); 
}
window.navigatePhoto = navigatePhoto;
function closePhotoViewer() { 
    document.getElementById('photo-viewer-modal').classList.add('hidden'); 
    renderMemories(); 
}
window.closePhotoViewer = closePhotoViewer;
function triggerPhotoUpload() { document.getElementById('photo-viewer-upload').click(); }
window.triggerPhotoUpload = triggerPhotoUpload;
function updatePhotoFromViewer() {
    const file = document.getElementById('photo-viewer-upload').files[0];
    if (!file || currentDetailIndex === null) return;
    const y = photoViewerYears[photoViewerCurrentIndex];
    const reader = new FileReader();
    reader.onload = e => {
        if (!anniversaries[currentDetailIndex].memories) anniversaries[currentDetailIndex].memories = {};
        if (!anniversaries[currentDetailIndex].memories[y]) anniversaries[currentDetailIndex].memories[y] = {};
        anniversaries[currentDetailIndex].memories[y].image = e.target.result;
        saveAnniversaries(); 
        updatePhotoViewer(); 
        updateStatistics();
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
    const active = anniversaries.filter(a => !a.archived);
    const archived = anniversaries.filter(a => a.archived);
    document.getElementById('total-anniversaries').textContent = active.length;
    document.getElementById('archived-count').textContent = `${archived.length} archiviert`;
    const upcoming = getAllUpcomingAnniversaries().filter(e => e.diff > 0);
    if (upcoming[0]) { 
        document.getElementById('next-anniversary-name').textContent = upcoming[0].name; 
        document.getElementById('next-anniversary-days').textContent = `in ${Math.ceil(upcoming[0].diff/86400000)} Tagen`; 
    }
    let photos = 0, notes = 0;
    anniversaries.forEach(a => { 
        if (a.memories) Object.values(a.memories).forEach(m => { 
            if (m.image) photos++; 
            if (m.note) notes++; 
        }); 
    });
    document.getElementById('total-memories').textContent = photos + notes;
    document.getElementById('memories-detail').textContent = `${photos} Fotos, ${notes} Notizen`;
    updateRelationshipStat();
    const mc = new Array(12).fill(0);
    active.forEach(a => mc[parseInt(a.date.split('-')[1])-1]++);
    const max = Math.max(...mc, 1);
    document.getElementById('month-chart').innerHTML = mc.map((c,i) => `<div class="month-bar"><div class="month-bar-fill" style="height:${c/max*80}px"></div><span class="month-bar-label">${monthNamesShort[i]}</span></div>`).join('');
    // This month with list
    const cm = new Date().getMonth();
    const tm = active.filter(a => parseInt(a.date.split('-')[1])-1 === cm);
    document.getElementById('this-month-count').textContent = tm.length;
    const tmList = document.getElementById('this-month-list');
    if (tmList) tmList.innerHTML = tm.length ? tm.map(a => `<div class="this-month-item">${a.name} - ${a.date.split('-')[2]}.${a.date.split('-')[1]}</div>`).join('') : '<span style="color:var(--text-secondary)">Keine Jahrestage</span>';
    // Season with icons
    const seasons = {'Frühling':0,'Sommer':0,'Herbst':0,'Winter':0};
    const seasonIcons = {'Frühling':'🌸','Sommer':'☀️','Herbst':'🍂','Winter':'❄️'};
    active.forEach(a => { 
        const m = parseInt(a.date.split('-')[1]); 
        if (m>=3&&m<=5) seasons['Frühling']++; 
        else if (m>=6&&m<=8) seasons['Sommer']++; 
        else if (m>=9&&m<=11) seasons['Herbst']++; 
        else seasons['Winter']++; 
    });
    const top = Object.entries(seasons).sort((a,b) => b[1]-a[1])[0];
    document.getElementById('season-icon').textContent = seasonIcons[top[0]];
    document.getElementById('top-season').textContent = top[0];
    document.getElementById('season-detail').textContent = `${top[1]} Jahrestage`;
    // Average wait time
    if (upcoming.length > 0) {
        const totalWait = upcoming.reduce((sum, e) => sum + e.diff, 0);
        const avgDays = Math.round(totalWait / upcoming.length / 86400000);
        document.getElementById('avg-wait-days').textContent = `${avgDays} Tage`;
    } else {
        document.getElementById('avg-wait-days').textContent = '-';
    }
    // Fun stats
    const totalDaysTracked = active.reduce((sum, a) => {
        const start = new Date(a.date);
        return sum + Math.max(0, Math.floor((new Date() - start) / 86400000));
    }, 0);
    document.getElementById('total-days-tracked').textContent = totalDaysTracked.toLocaleString();
    
    // Average repetitions
    const avgRepetitions = active.length > 0 
        ? (active.reduce((sum, a) => sum + getAnniversaryNumber(a), 0) / active.length).toFixed(1)
        : '0';
    const avgRepEl = document.getElementById('avg-repetitions');
    if (avgRepEl) avgRepEl.textContent = avgRepetitions;
}
function updateRelationshipStat() {
    if (relationshipAnniversaryIndex === null || !anniversaries[relationshipAnniversaryIndex]) { 
        document.getElementById('relationship-duration').textContent = 'Nicht konfiguriert'; 
        document.getElementById('relationship-detail').textContent = 'Tippe auf ⚙️'; 
        return; 
    }
    const start = new Date(anniversaries[relationshipAnniversaryIndex].date);
    const days = Math.floor((new Date() - start) / 86400000);
    document.getElementById('relationship-duration').textContent = `${days} Tage`;
    const y = Math.floor(days/365), m = Math.floor((days%365)/30);
    document.getElementById('relationship-detail').textContent = y > 0 ? `${y} Jahre, ${m} Monate` : `${m} Monate`;
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
function selectRelationshipAnniversary(i) { 
    relationshipAnniversaryIndex = i; 
    saveSettings(); 
    updateStatistics(); 
    document.querySelectorAll('.anniversary-select-item').forEach(el => el.classList.toggle('selected', parseInt(el.getAttribute('onclick').match(/\d+/)[0]) === i)); 
}
window.selectRelationshipAnniversary = selectRelationshipAnniversary;
function closeRelationshipConfig() { document.getElementById('relationship-modal').classList.add('hidden'); }
window.closeRelationshipConfig = closeRelationshipConfig;
function checkForCelebration() { 
    getAllUpcomingAnniversaries().forEach(ev => { 
        // Trigger confetti wenn ein Jahrestag gerade in die Grace Period eintritt (0-2 Sekunden vergangen)
        if (ev.isInGracePeriod && ev.timeSinceLast >= 0 && ev.timeSinceLast < 2000 && !confettiTriggered[ev.name]) { 
            confettiTriggered[ev.name] = true; 
            triggerConfetti(); 
            // Re-render um die Karten zu aktualisieren
            renderAllAnniversaries();
            setTimeout(() => delete confettiTriggered[ev.name], 60000); 
        } 
    }); 
}
function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas'), ctx = canvas.getContext('2d');
    canvas.width = innerWidth; canvas.height = innerHeight;
    const ps = Array.from({length:150}, () => ({
        x:Math.random()*canvas.width,
        y:-20,
        vx:(Math.random()-0.5)*4,
        vy:Math.random()*2+2,
        color:`hsl(${Math.random()*360},70%,60%)`,
        size:Math.random()*8+4,
        rot:Math.random()*360,
        rs:(Math.random()-0.5)*10
    }));
    (function animate() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        let active = false;
        ps.forEach(p => { 
            p.vy += 0.1; 
            p.y += p.vy; 
            p.x += p.vx; 
            p.rot += p.rs; 
            if (p.y < canvas.height+20) active = true; 
            ctx.save(); 
            ctx.translate(p.x,p.y); 
            ctx.rotate(p.rot*Math.PI/180); 
            ctx.fillStyle = p.color; 
            ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size); 
            ctx.restore(); 
        });
        if (active) requestAnimationFrame(animate); 
        else ctx.clearRect(0,0,canvas.width,canvas.height);
    })();
}
window.generateTokenHash = async t => { 
    const h = await hashToken(t); 
    console.log('Token:',t,'Hash:',h); 
    return h; 
};
document.addEventListener('DOMContentLoaded', () => setTimeout(checkAccess, 500));
console.log('🍎 Anniversary App geladen');
