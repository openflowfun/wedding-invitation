/* ==========================================================================
   CONFIG — this is the only thing you need to change.
   Paste the /exec Web App URL you get after deploying google-apps-script.gs.
   See README.md for the step-by-step Google Sheet setup.
   ========================================================================== */

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwb2moa8MQ3FNFyB5OBWFvbCzP0ElvvJPJYWR9G4h6a94R-1DapDtu0ldX8EnG3j35z/exec';

// The day, pinned to Sri Lanka time with "+05:30". Without the offset these
// would be read in each visitor's own timezone, so a relative in London would
// see a countdown and calendar entry 5½ hours out.
const PORUWA_START = new Date('2026-12-17T09:25:00+05:30'); // the countdown counts to this
// No finish time was given — this is only where the calendar entry ends.
const CALENDAR_END = new Date('2026-12-17T15:00:00+05:30');

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
  const diff = PORUWA_START - new Date();

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
// One Google Calendar event for the Poruwa Ceremony, built from the constants
// above so it can never disagree with the countdown.
const calendarBtn = document.getElementById('calendarBtn');
if(calendarBtn){
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Wedding of Krishal & Jayakshi',
    dates: `${fmt(PORUWA_START)}/${fmt(CALENDAR_END)}`,
    details: 'Poruwa Ceremony · 9:25 AM (Sri Lanka time)\n\n' + location.origin + location.pathname,
    location: 'Hotel Green Court, Homagama, Sri Lanka'
  });
  calendarBtn.href = `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ---------- Personal greeting: ?to=Name ----------
// Send each guest a link like  …/wedding-invitation/?to=Nimal+Perera  and the
// letter in the envelope is addressed to them. textContent (never innerHTML)
// keeps whatever is typed in the link as plain text.
const guestParam = (new URLSearchParams(location.search).get('to') || '').trim().slice(0, 60);
if(guestParam){
  const letterGuest = document.getElementById('letterGuest');
  letterGuest.textContent = guestParam;
  if(guestParam.length > 22) letterGuest.classList.add('long');
  // Save them typing it again — they can still edit it.
  const nameField = document.getElementById('guestName');
  if(nameField && !nameField.value) nameField.value = guestParam;
}

// ---------- Sound ----------
// Music is routed through the Web Audio API rather than played straight from
// the <audio> element, for two reasons: it can fade in smoothly under the
// opening chime, and iPhones ignore audio.volume entirely — without this
// they'd play at full volume however low it was set.
const MUSIC_VOLUME = 0.35;
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const music = document.getElementById('bgMusic');
const musicToggle = document.getElementById('musicToggle');
let actx = null;
let musicGain = null;
let musicRouted = false;
let musicFailed = false;

function audioContext(){
  if(!AudioCtx) return null;
  if(!actx){
    try { actx = new AudioCtx(); } catch(e){ return null; }
  }
  if(actx.state === 'suspended') actx.resume();
  return actx;
}

function routeMusic(){
  if(musicRouted) return true;
  const ctx = audioContext();
  if(!ctx) return false;
  try {
    const source = ctx.createMediaElementSource(music);
    musicGain = ctx.createGain();
    musicGain.gain.value = MUSIC_VOLUME;
    source.connect(musicGain);
    musicGain.connect(ctx.destination);
    musicRouted = true;
  } catch(e){
    return false;
  }
  return true;
}

// play() is always called synchronously inside the tap handler — browsers
// only allow sound to start from a real gesture — and any delay is done with
// the volume envelope instead of a timer.
function startMusic(delay = 0, fade = 0.8){
  if(!music || musicFailed) return;
  if(routeMusic()){
    const t = actx.currentTime;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(0.0001, t);
    musicGain.gain.setValueAtTime(0.0001, t + delay);
    musicGain.gain.linearRampToValueAtTime(MUSIC_VOLUME, t + delay + fade);
  } else {
    music.volume = MUSIC_VOLUME;
  }
  music.play().then(reflectMusicState).catch(reflectMusicState);
}

function reflectMusicState(){
  const playing = music && !music.paused;
  musicToggle.classList.toggle('muted', !playing);
  musicToggle.classList.toggle('playing', playing);
  musicToggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
  musicToggle.setAttribute('aria-label', playing ? 'Turn music off' : 'Turn music on');
}

if(music && musicToggle){
  // The button only appears once the track has proven loadable, so a missing
  // file leaves no dead control on the page.
  music.addEventListener('canplaythrough', () => {
    musicToggle.classList.add('available');
  }, { once:true });
  music.addEventListener('error', () => {
    musicFailed = true;
    musicToggle.classList.remove('available');
    const hint = document.getElementById('introSound');
    if(hint) hint.style.display = 'none';
  });
  music.load();

  musicToggle.addEventListener('click', () => {
    if(music.paused) startMusic(0, 0.8);
    else { music.pause(); reflectMusicState(); }
  });
  music.addEventListener('play', reflectMusicState);
  music.addEventListener('pause', reflectMusicState);

  // Phones suspend audio when the screen locks or the tab is switched away;
  // pick the music back up on return if it was meant to be playing.
  document.addEventListener('visibilitychange', () => {
    if(!document.hidden && actx && actx.state !== 'running' && !music.paused) actx.resume();
  });
}

// The sound of opening: a soft click as the wax seal gives, a breath of paper
// as the letter slides out, then a small bell-like chime rising through
// E major. Synthesised on the spot, so there is no extra file to download.
function playOpeningSound(){
  const ctx = audioContext();
  if(!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.8;
  out.connect(ctx.destination);

  const noise = (seconds) => {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  };
  const chain = (...nodes) => { for(let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); };

  // Seal click
  const click = noise(0.06), clickHp = ctx.createBiquadFilter(), clickGain = ctx.createGain();
  clickHp.type = 'highpass'; clickHp.frequency.value = 1800;
  clickGain.gain.setValueAtTime(0.35, t);
  clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  chain(click, clickHp, clickGain, out);
  click.start(t);

  // Paper slide: a filtered hush that brightens as the letter moves
  const slide = noise(1.2), slideBp = ctx.createBiquadFilter(), slideGain = ctx.createGain();
  slideBp.type = 'bandpass'; slideBp.Q.value = 0.9;
  slideBp.frequency.setValueAtTime(900, t + 0.55);
  slideBp.frequency.exponentialRampToValueAtTime(3400, t + 1.5);
  slideGain.gain.setValueAtTime(0.0001, t + 0.55);
  slideGain.gain.exponentialRampToValueAtTime(0.2, t + 0.85);
  slideGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.65);
  chain(slide, slideBp, slideGain, out);
  slide.start(t + 0.55);

  // Chime: E5 G#5 B5 E6, each with a faint octave above so it rings like a bell
  [659.25, 830.61, 987.77, 1318.51].forEach((freq, i) => {
    const at = t + 1.0 + i * 0.16;
    [[freq, 0.15], [freq * 2, 0.035]].forEach(([f, peak]) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.9);
      chain(osc, gain, out);
      osc.start(at); osc.stop(at + 2);
    });
  });
}

// ---------- Opening envelope ----------
const intro = document.getElementById('intro');
const envelope = document.getElementById('envelope');
const hero = document.getElementById('home');
let introStage = 'closed';           // closed → opening → done
const introTimers = [];
const later = (fn, ms) => introTimers.push(setTimeout(fn, ms));

function openEnvelope(){
  introStage = 'opening';
  playOpeningSound();
  startMusic(1.9, 3.5);              // starts now, but stays silent until the chime has rung
  intro.classList.add('opening');    // words fade; seal pops; flap swings open
  envelope.classList.add('open');
  later(() => envelope.classList.add('rise'), 620);   // letter slides up
  later(() => envelope.classList.add('lift'), 1650);  // envelope falls away, letter comes forward
  later(finishIntro, 4100);                           // time to read "Dear, …", then in
}

function finishIntro(){
  if(introStage === 'done') return;
  introStage = 'done';
  introTimers.forEach(clearTimeout);
  intro.classList.add('done');
  document.body.classList.remove('veiled');
  revealHero();
  onScroll();
  // Once faded, take it out of the page (and the accessibility tree) entirely.
  setTimeout(() => { intro.hidden = true; }, 900);
}

function revealHero(){
  hero.classList.add('hero-revealing');
  requestAnimationFrame(() => hero.classList.remove('hero-pending'));
  setTimeout(() => hero.classList.remove('hero-revealing'), 2800);
}

// Arm the envelope only when JS is running and motion is welcome. Anyone else
// simply lands on the invitation already open.
if(intro && envelope && !prefersReduced){
  intro.classList.add('armed');
  document.body.classList.add('veiled');
  hero.classList.add('hero-pending');
  // The whole screen is the tap target. Once the letter is out, a second tap
  // skips the rest for anyone who doesn't want to wait.
  intro.addEventListener('click', () => {
    if(introStage === 'closed') openEnvelope();
    else if(envelope.classList.contains('lift')) finishIntro();
  });
}

// ---------- Guest-count stepper ----------
const guestCountInput = document.getElementById('guestCount');
const guestMinus = document.getElementById('guestMinus');
const guestPlus = document.getElementById('guestPlus');
const GUESTS_MIN = 1, GUESTS_MAX = 20;

function setGuests(n){
  const v = Math.min(GUESTS_MAX, Math.max(GUESTS_MIN, parseInt(n, 10) || GUESTS_MIN));
  guestCountInput.value = v;
  guestMinus.disabled = v <= GUESTS_MIN;
  guestPlus.disabled = v >= GUESTS_MAX;
}
if(guestCountInput && guestMinus && guestPlus){
  guestMinus.addEventListener('click', () => setGuests(Number(guestCountInput.value) - 1));
  guestPlus.addEventListener('click', () => setGuests(Number(guestCountInput.value) + 1));
  // Typing is still allowed; tidy it up when they leave the box.
  guestCountInput.addEventListener('change', () => setGuests(guestCountInput.value));
  setGuests(guestCountInput.value);
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
  const phone = document.getElementById('guestPhone').value.trim();
  const guestCountRaw = document.getElementById('guestCount').value.trim();
  const message = document.getElementById('guestMsg').value.trim();

  if(!name){ formMsg.textContent = 'Please enter your name.'; formMsg.classList.add('error'); return; }
  if(!isPlausiblePhone(phone)){
    formMsg.textContent = 'Please enter a mobile number we can reach you on.';
    formMsg.classList.add('error');
    return;
  }
  if(!attendingVal){ formMsg.textContent = 'Please let us know if you can make it.'; formMsg.classList.add('error'); return; }

  // Guest count only applies to those attending; decliners are recorded as 0.
  let guestCount = 0;
  if(attendingVal === 'yes'){
    guestCount = parseInt(guestCountRaw) || 1;
    if(guestCount < 1) guestCount = 1;
    if(guestCount > 20) guestCount = 20;
  }

  const record = {
    name, phone, attending: attendingVal, guests: guestCount, message,
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
  body.innerHTML = '<tr><td colspan="6" class="loading-dots">Loading…</td></tr>';
  const result = await fetchRecords(dashKey);
  if(result.ok){ allRecords = result.records; renderDashboard(); }
  else body.innerHTML = `<tr><td colspan="6" class="loading-dots">${escapeHtml(result.message)}</td></tr>`;
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
      <td>${phoneCell(r.phone)}</td>
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
  const header = ['Name','Mobile','Attending','Guests','Message','Submitted'];
  const body = rows.map(r => [
    csvEscape(r.name),
    csvEscape(r.phone || ''),
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

// Loose on purpose: guests may write 0771234567, 077 123 4567, +94 77 123 4567
// or a UK/Australian number. All we insist on is 9–15 digits, which every real
// mobile number has and a typo like "077" doesn't.
function isPlausiblePhone(value){
  if(!/^[+(\d][\d\s().-]*$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

// In the dashboard a number becomes a tap-to-call link. Only digits and a
// leading + go into the tel: link, whatever was typed.
function phoneCell(phone){
  if(!phone) return '—';
  const dial = String(phone).replace(/(?!^\+)[^\d]/g, '');
  return `<a class="tel-link" href="tel:${dial}">${escapeHtml(String(phone))}</a>`;
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
