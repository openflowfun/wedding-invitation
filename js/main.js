/* ==========================================================================
   CONFIG — this is the only thing you need to change.
   Paste the /exec Web App URL you get after deploying google-apps-script.gs.
   See README.md for the step-by-step Google Sheet setup.
   ========================================================================== */

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwb2moa8MQ3FNFyB5OBWFvbCzP0ElvvJPJYWR9G4h6a94R-1DapDtu0ldX8EnG3j35z/exec';

// When the celebration begins. Months are 0-based, so 11 = December.
// Change the last two numbers to set the start time (currently 19:00).
const WEDDING_DATE = new Date(2026, 11, 17, 19, 0, 0);

/* ========================================================================== */

const scriptConfigured = /^https:\/\/script\.google\.com\//.test(GOOGLE_SCRIPT_URL);

// ---------- Scroll progress bar ----------
const scrollProgress = document.getElementById('scrollProgress');
function updateScrollProgress(){
  const h = document.documentElement;
  const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
  scrollProgress.style.width = (isNaN(scrolled) ? 0 : scrolled) + '%';
}

// ---------- Hero + band motion ----------
// The hero portrait deliberately does NOT translate on scroll. Moving it down
// used to slide it over the date, venue and RSVP button underneath it, hiding
// them. It now only fades and eases back slightly, so nothing can ever cover
// the details below.
const heroImg = document.getElementById('heroImg');
const bandMedia = document.getElementById('bandMedia');
const band = document.getElementById('band');
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ticking = false;
function onScroll(){
  if(ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateScrollProgress();
    if(!prefersReduced){
      const y = window.scrollY;
      if(heroImg && y < window.innerHeight){
        const p = y / window.innerHeight;
        heroImg.style.transform = `scale(${1 - p * 0.06})`;
        heroImg.style.opacity = String(1 - p * 0.55);
      }
      if(bandMedia && band){
        const rect = band.getBoundingClientRect();
        if(rect.bottom > 0 && rect.top < window.innerHeight){
          const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
          bandMedia.style.transform = `translateY(${(progress - 0.5) * 14}%)`;
        }
      }
    }
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive:true });
onScroll();

// ---------- Scroll reveal (progressive enhancement) ----------
// Content is visible by default via CSS. Only if JS runs AND the browser
// supports IntersectionObserver AND the person hasn't asked for reduced
// motion do we opt elements into the hide-then-fade-in effect.
const revealEls = document.querySelectorAll('.reveal');
if(!prefersReduced && 'IntersectionObserver' in window){
  revealEls.forEach(el => el.classList.add('js-reveal'));
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));
}

// ---------- Countdown ----------
const cd = {
  days: document.getElementById('cdDays'),
  hours: document.getElementById('cdHours'),
  mins: document.getElementById('cdMins'),
  secs: document.getElementById('cdSecs')
};

function pad(n){ return String(n).padStart(2, '0'); }

// Only re-paint a digit when it actually changes, so the tick animation
// fires once per change instead of restarting every single second.
function setCell(el, value){
  if(!el || el.textContent === value) return;
  el.textContent = value;
  el.classList.remove('tick');
  void el.offsetWidth; // force the animation to restart
  el.classList.add('tick');
}

function updateCountdown(){
  const diff = WEDDING_DATE - new Date();

  if(diff <= 0){
    setCell(cd.days, '0'); setCell(cd.hours, '00');
    setCell(cd.mins, '00'); setCell(cd.secs, '00');
    const note = document.getElementById('countdownNote');
    if(note) note.textContent = 'Today is the day. Thank you for celebrating with us.';
    return false; // stop ticking
  }

  const secs = Math.floor(diff / 1000);
  setCell(cd.days, String(Math.floor(secs / 86400)));
  setCell(cd.hours, pad(Math.floor(secs / 3600) % 24));
  setCell(cd.mins, pad(Math.floor(secs / 60) % 60));
  setCell(cd.secs, pad(secs % 60));
  return true;
}

if(cd.days){
  updateCountdown();
  const cdTimer = setInterval(() => {
    if(!updateCountdown()) clearInterval(cdTimer);
  }, 1000);
}

// ---------- Add to Calendar ----------
// Builds a Google Calendar event from the same date the countdown uses.
const calendarBtn = document.getElementById('calendarBtn');
if(calendarBtn){
  const end = new Date(WEDDING_DATE.getTime() + 5 * 60 * 60 * 1000); // 5-hour event
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Wedding of Krishal & Jayakshi',
    dates: `${fmt(WEDDING_DATE)}/${fmt(end)}`,
    details: 'We would be delighted to have you with us.',
    location: 'Hotel Green Court, Homagama'
  });
  calendarBtn.href = `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ---------- Background music ----------
// The button only appears once the audio file has proven loadable, so a
// missing or not-yet-added track leaves no dead control on the page.
const music = document.getElementById('bgMusic');
const musicToggle = document.getElementById('musicToggle');
let musicReady = false;

function reflectMusicState(){
  const playing = music && !music.paused;
  musicToggle.classList.toggle('muted', !playing);
  musicToggle.classList.toggle('playing', playing);
  musicToggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
  musicToggle.setAttribute('aria-label', playing ? 'Turn music off' : 'Turn music on');
}

if(music && musicToggle){
  music.volume = 0.35;
  music.addEventListener('canplaythrough', () => {
    musicReady = true;
    musicToggle.classList.add('available');
  }, { once:true });
  // No track present (or it can't be decoded) — stay silent and hidden.
  music.addEventListener('error', () => {
    musicReady = false;
    musicToggle.classList.remove('available');
  });
  music.load();

  musicToggle.addEventListener('click', () => {
    if(music.paused){
      music.play().then(reflectMusicState).catch(() => {});
    } else {
      music.pause();
      reflectMusicState();
    }
  });
  music.addEventListener('play', reflectMusicState);
  music.addEventListener('pause', reflectMusicState);
}

// Browsers only allow audio to start from a genuine user gesture — opening
// the invitation is exactly that, so the music begins there.
function startMusic(){
  if(!music || !musicReady) return;
  music.play().then(reflectMusicState).catch(() => {
    // Autoplay still refused; the toggle stays available for a manual start.
    reflectMusicState();
  });
}

// ---------- Intro veil ----------
const introVeil = document.getElementById('introVeil');
const introOpen = document.getElementById('introOpen');

function openInvitation(){
  introVeil.classList.add('opening');
  startMusic();
  // Let the curtains part before releasing the page underneath.
  setTimeout(() => {
    introVeil.classList.add('gone');
    document.body.classList.remove('veiled');
    onScroll();
  }, 1000);
}

// Arm the veil only when JS is running and motion is welcome. Anyone else
// simply lands on the invitation already open.
if(introVeil && introOpen && !prefersReduced){
  introVeil.classList.add('armed');
  document.body.classList.add('veiled');
  introOpen.addEventListener('click', openInvitation);
  // Hide the sound hint if there's no track to hear.
  setTimeout(() => {
    const hint = document.getElementById('introHint');
    if(hint && !musicReady) hint.style.display = 'none';
  }, 1200);
}

// ---------- Menu ----------
const hamburgerBtn = document.getElementById('hamburgerBtn');
const menuPanel = document.getElementById('menuPanel');
const scrim = document.getElementById('scrim');
function toggleMenu(open){
  hamburgerBtn.classList.toggle('open', open);
  menuPanel.classList.toggle('open', open);
  scrim.classList.toggle('open', open);
}
hamburgerBtn.addEventListener('click', () => toggleMenu(!menuPanel.classList.contains('open')));
scrim.addEventListener('click', () => toggleMenu(false));
document.querySelectorAll('[data-close]').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

// ---------- Gallery lightbox ----------
const galleryImgs = Array.from(document.querySelectorAll('.gallery-item img'));
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxCount = document.getElementById('lightboxCount');
let lightboxIndex = 0;

function openLightbox(i){
  lightboxIndex = i;
  showLightboxImage();
  lightbox.classList.add('open');
  requestAnimationFrame(() => lightbox.classList.add('show'));
}
function showLightboxImage(){
  const img = galleryImgs[lightboxIndex];
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  lightboxCaption.textContent = img.alt || '';
  lightboxCount.textContent = `${lightboxIndex + 1} / ${galleryImgs.length}`;
}
function closeLightbox(){
  lightbox.classList.remove('show');
  setTimeout(() => lightbox.classList.remove('open'), 250);
}
function stepLightbox(dir){
  lightboxIndex = (lightboxIndex + dir + galleryImgs.length) % galleryImgs.length;
  showLightboxImage();
}
galleryImgs.forEach((img, i) => img.closest('.gallery-item').addEventListener('click', () => openLightbox(i)));
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if(e.target === lightbox) closeLightbox(); });
document.getElementById('lightboxPrev').addEventListener('click', () => stepLightbox(-1));
document.getElementById('lightboxNext').addEventListener('click', () => stepLightbox(1));
document.addEventListener('keydown', (e) => {
  if(!lightbox.classList.contains('open')) return;
  if(e.key === 'Escape') closeLightbox();
  if(e.key === 'ArrowLeft') stepLightbox(-1);
  if(e.key === 'ArrowRight') stepLightbox(1);
});

// ---------- RSVP toggle ----------
const yesBtn = document.querySelector('.yes-btn');
const noBtn = document.querySelector('.no-btn');
const guestsField = document.getElementById('guestsField');
let attendingVal = null;
yesBtn.addEventListener('click', () => {
  attendingVal = 'yes';
  yesBtn.classList.add('active'); noBtn.classList.remove('active', 'no');
  guestsField.classList.add('show');
});
noBtn.addEventListener('click', () => {
  attendingVal = 'no';
  noBtn.classList.add('active', 'no'); yesBtn.classList.remove('active');
  guestsField.classList.remove('show');
});

// ---------- RSVP submit → Google Sheet ----------
// This is a one-way street: the page can add a row to the sheet, and that is
// all it can do. There is no code here that can read responses back, so the
// guest list is never exposed through the website.
const rsvpForm = document.getElementById('rsvpForm');
const formMsg = document.getElementById('formMsg');
const submitBtn = document.getElementById('submitBtn');

rsvpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formMsg.textContent = '';
  formMsg.classList.remove('error');

  const name = document.getElementById('guestName').value.trim();
  const guestCountRaw = document.getElementById('guestCount').value.trim();
  const message = document.getElementById('guestMsg').value.trim();

  if(!name){ formMsg.textContent = 'Please enter your name.'; formMsg.classList.add('error'); return; }
  if(!attendingVal){ formMsg.textContent = 'Please let us know if you can make it.'; formMsg.classList.add('error'); return; }

  // Guest count only applies to those attending; decliners are recorded as 0.
  let guestCount = 0;
  if(attendingVal === 'yes'){
    guestCount = parseInt(guestCountRaw) || 1;
    if(guestCount < 1) guestCount = 1;
    if(guestCount > 20) guestCount = 20;
  }

  const record = {
    name, attending: attendingVal, guests: guestCount, message,
    timestamp: new Date().toISOString()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  const sent = await sendToGoogleSheet(record);

  if(!sent.ok){
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send RSVP';
    formMsg.textContent = sent.message;
    formMsg.classList.add('error');
    return;
  }

  // Tailor the thank-you to what they actually said.
  if(attendingVal === 'no'){
    document.getElementById('successTitle').textContent = 'Thank you';
    document.getElementById('successText').textContent =
      "We're sorry you can't join us, but thank you for letting us know. You'll be missed.";
  }

  rsvpForm.style.display = 'none';
  document.getElementById('successPanel').classList.add('show');
});

// ---------- Dashboard ----------
// Note there is deliberately no passcode in this file. Whatever is typed into
// the box is sent to the Apps Script, which holds the real one and decides.
// Someone reading this source finds the endpoint but no working key.
const dashScrim = document.getElementById('dashScrim');
const dashboardLink = document.getElementById('dashboardLink');
const passGate = document.getElementById('passGate');
const dashContent = document.getElementById('dashContent');
const passInput = document.getElementById('passInput');
const passError = document.getElementById('passError');
const passSubmit = document.getElementById('passSubmit');

let dashKey = null;          // held in memory only, for Refresh
let allRecords = [];         // everything fetched
let activeFilter = 'all';

dashboardLink.addEventListener('click', () => {
  toggleMenu(false);
  dashScrim.classList.add('open');
});
document.getElementById('dashClose').addEventListener('click', () => dashScrim.classList.remove('open'));
dashScrim.addEventListener('click', (e) => { if(e.target === dashScrim) dashScrim.classList.remove('open'); });

passSubmit.addEventListener('click', checkPass);
passInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') checkPass(); });

async function checkPass(){
  const typed = passInput.value.trim();
  passError.textContent = '';
  if(!typed) return;

  if(!scriptConfigured){
    passError.textContent = 'The Google Sheet is not connected yet.';
    return;
  }

  passSubmit.disabled = true;
  passSubmit.textContent = 'Checking...';

  const result = await fetchRecords(typed);

  passSubmit.disabled = false;
  passSubmit.textContent = 'Enter';

  if(!result.ok){
    passError.textContent = result.message;
    return;
  }

  dashKey = typed;
  passInput.value = '';
  passGate.style.display = 'none';
  dashContent.style.display = 'block';
  allRecords = result.records;
  renderDashboard();
}

async function fetchRecords(key){
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?key=${encodeURIComponent(key)}`);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    if(data && data.ok && Array.isArray(data.records)){
      data.records.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
      return { ok:true, records:data.records };
    }
    // The script answers "Unauthorized" for a wrong passcode.
    return { ok:false, message:'Incorrect passcode.' };
  } catch(err){
    console.error('Dashboard load failed:', err);
    return { ok:false, message:'Could not reach the sheet. Check your connection and try again.' };
  }
}

document.querySelectorAll('.dash-filter button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dash-filter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderDashboard();
  });
});

document.getElementById('refreshBtn').addEventListener('click', async () => {
  if(!dashKey) return;
  const body = document.getElementById('dashBody');
  body.innerHTML = '<tr><td colspan="5" class="loading-dots">Loading…</td></tr>';
  const result = await fetchRecords(dashKey);
  if(result.ok){ allRecords = result.records; renderDashboard(); }
  else body.innerHTML = `<tr><td colspan="5" class="loading-dots">${escapeHtml(result.message)}</td></tr>`;
});

function visibleRecords(){
  if(activeFilter === 'all') return allRecords;
  return allRecords.filter(r => r.attending === activeFilter);
}

function renderDashboard(){
  const dashBody = document.getElementById('dashBody');
  const emptyState = document.getElementById('emptyState');

  // Totals always describe every response, not just the filtered view.
  const yes = allRecords.filter(r => r.attending === 'yes');
  const no = allRecords.filter(r => r.attending === 'no');
  document.getElementById('statTotal').textContent = allRecords.length;
  document.getElementById('statYes').textContent = yes.length;
  document.getElementById('statNo').textContent = no.length;
  document.getElementById('statGuests').textContent =
    yes.reduce((s,r) => s + (Number(r.guests)||0), 0);

  const rows = visibleRecords();
  if(rows.length === 0){
    dashBody.innerHTML = '';
    emptyState.textContent = allRecords.length === 0
      ? 'No responses yet.'
      : 'Nobody in this category yet.';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  dashBody.innerHTML = rows.map(r => {
    const d = new Date(r.timestamp);
    const dateStr = isNaN(d) ? '—' : d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
    const yesRow = r.attending === 'yes';
    return `<tr>
      <td>${escapeHtml(r.name)}</td>
      <td><span class="pill ${yesRow ? 'yes' : 'no'}">${yesRow ? 'Attending' : 'Not Attending'}</span></td>
      <td>${yesRow ? escapeHtml(String(r.guests)) : '—'}</td>
      <td>${escapeHtml(r.message || '—')}</td>
      <td>${dateStr}</td>
    </tr>`;
  }).join('');
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

document.getElementById('csvBtn').addEventListener('click', () => {
  const rows = visibleRecords();
  if(rows.length === 0) return;
  const header = ['Name','Attending','Guests','Message','Submitted'];
  const body = rows.map(r => [
    csvEscape(r.name),
    r.attending === 'yes' ? 'Yes' : 'No',
    r.attending === 'yes' ? r.guests : 0,
    csvEscape(r.message || ''),
    r.timestamp
  ]);
  const csv = [header.join(','), ...body.map(row => row.join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'krishal-jayakshi-rsvp.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

function csvEscape(val){
  const s = String(val).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

async function sendToGoogleSheet(record){
  if(!scriptConfigured){
    return { ok:false, message:'RSVP is not connected yet — please contact the couple directly.' };
  }
  try {
    // text/plain keeps this a "simple" request, so the browser sends it
    // straight through without a CORS preflight that Apps Script can't answer.
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(record)
    });
    return { ok:true };
  } catch(err){
    console.error('RSVP submit failed:', err);
    return { ok:false, message:'We couldn\'t send that — please check your connection and try again.' };
  }
}
