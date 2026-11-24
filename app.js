(() => {
'use strict';

// ---------- i18n ----------
const T = {
  hr: {
    skip:'Preskoči na program', tagline:'Galerija · Scena · Kino · Društveni centar',
    nav_program:'Program', nav_about:'O prostoru', nav_sources:'Izvori',
    eyebrow:'Mjesni odbor Trnjanska Savica · Zagreb', h1:'Što se događa u MOTS-u',
    lede:'Izložbe, film, predstave, radionice i susreti u kvartu. Program se sam slaže mjesec po mjesec iz javnih izvora.',
    today:'Danas', v_month:'Mjesec', v_30:'Sljedećih 30 dana', all:'Sve',
    about_h:'O prostoru',
    about_p1:'MOTS nema vlastitu internetsku stranicu. Galerija, scena, kino i društveni centar djeluju unutar zgrade Mjesnog odbora Trnjanska Savica, a organizatori program objavljuju pod različitim nazivima. Zato ova stranica skuplja sve na jednom mjestu.',
    map:'Karta (OpenStreetMap)', aka:'Nazivi pod kojima se program objavljuje:',
    src_h:'Kako nastaje program',
    src_p:'Svaki dan skripta pregleda javne izvore i zadrži samo ono što je održano u MOTS-u ili na adresi Vladimira Ruždjaka 21. Stranica na početku svakog mjeseca sama otvara novi mjesec. Što izvor ne navede (vrijeme, prijava), ovdje piše kao nepotvrđeno.',
    src_evento:'gradski portal događanja (automatski)', src_poco:'dječje predstave na Sceni MOTS (automatski)',
    src_bacaci:'filmske i medijske radionice (ručni pregled)', src_kvarti:'sezonski programi (ručni pregled)', src_kino:'filmski raspored (ručni pregled)',
    foot:'Podaci su iz javnih izvora; moguće su izmjene programa. Provjerite kod organizatora.',
    cat:{cinema:'Kino', exhibition:'Izložba', theater:'Kazalište', workshop:'Radionica', community:'Zajednica', music:'Glazba'},
    organizer:'Organizator', admission:'Ulaz / prijava', source:'Izvor', until:'do',
    time_unconfirmed:'Vrijeme nije potvrđeno', admission_unknown:'Nije navedeno u izvoru; provjerite kod organizatora',
    no_link:'Bez poveznice za prijavu', register:'Prijava / ulaznice', open_source:'Izvor događaja', ics:'Dodaj u kalendar',
    all_day:'cijeli dan', month_count:(n)=>n===1?'1 događaj':`${n} događaja`,
    empty_h:'Za ovaj razdoblje još nema potvrđenih programa',
    empty_p:'Nijedan javni izvor trenutno ne navodi događanje u MOTS-u za odabrano razdoblje. Programi se često objavljuju tek tjedan-dva unaprijed, pa svratite ponovno.',
    empty_next:'Idi na prvi sljedeći program', empty_ask:'Provjeri kod organizatora',
    updated:(d)=>`Podaci osvježeni: ${d}.`, load_err:'Program se trenutno ne može učitati. Pokušajte ponovno kasnije.',
    legend:'Boje označavaju kategoriju. Klik na dan u kalendaru vodi do popisa.', prev:'Prethodni mjesec', next:'Sljedeći mjesec',
  },
  en: {
    skip:'Skip to program', tagline:'Gallery · Stage · Cinema · Community centre',
    nav_program:'Program', nav_about:'The space', nav_sources:'Sources',
    eyebrow:'Local Board Trnjanska Savica · Zagreb', h1:"What's on at MOTS",
    lede:'Exhibitions, film, theatre, workshops and neighbourhood gatherings. The program builds itself month by month from public sources.',
    today:'Today', v_month:'Month', v_30:'Next 30 days', all:'All',
    about_h:'The space',
    about_p1:'MOTS has no website of its own. The gallery, stage, cinema and community centre operate inside the Trnjanska Savica local board building, and organisers publish under different names. This page gathers it all in one place.',
    map:'Map (OpenStreetMap)', aka:'Names the program is published under:',
    src_h:'How the program is built',
    src_p:'Every day a script reads public sources and keeps only what takes place at MOTS or at Vladimira Ruždjaka 21. The page opens the new month by itself. Whatever a source does not state (time, registration) is shown here as unconfirmed.',
    src_evento:'city events portal (automatic)', src_poco:"children's theatre at Scena MOTS (automatic)",
    src_bacaci:'film and media workshops (manual review)', src_kvarti:'seasonal programs (manual review)', src_kino:'film listings (manual review)',
    foot:'Data comes from public sources; programs may change. Check with the organiser.',
    cat:{cinema:'Cinema', exhibition:'Exhibition', theater:'Theatre', workshop:'Workshop', community:'Community', music:'Music'},
    organizer:'Organiser', admission:'Admission / registration', source:'Source', until:'until',
    time_unconfirmed:'Time not confirmed', admission_unknown:'Not stated by the source; check with the organiser',
    no_link:'No registration link listed', register:'Registration / tickets', open_source:'Event source', ics:'Add to calendar',
    all_day:'all day', month_count:(n)=>n===1?'1 event':`${n} events`,
    empty_h:'No confirmed program for this period yet',
    empty_p:'No public source currently lists an event at MOTS for the selected period. Programs are often announced only a week or two ahead, so check back.',
    empty_next:'Jump to the next program', empty_ask:'Check with organisers',
    updated:(d)=>`Data refreshed: ${d}.`, load_err:'The program cannot be loaded right now. Please try again later.',
    legend:'Colours mark the category. Click a day in the calendar to jump to the list.', prev:'Previous month', next:'Next month',
  },
};
const CATS = ['cinema','exhibition','theater','workshop','community','music'];

let lang = (navigator.language || 'hr').toLowerCase().startsWith('en') ? 'en' : 'hr';
try { const s = localStorage.getItem('mots-lang'); if (s === 'hr' || s === 'en') lang = s; } catch {}
const t = (k) => T[lang][k];

// ---------- dates (all wall-clock, Europe/Zagreb; no timezone maths) ----------
const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (s) => ({ y:+s.slice(0,4), m:+s.slice(5,7)-1, d:+s.slice(8,10), time: s.length>10 ? s.slice(11,16) : null });
const dayDiff = (a, b) => Math.round((Date.UTC(...a) - Date.UTC(...b)) / 864e5);
function todayZagreb() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Zagreb', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  return p; // YYYY-MM-DD
}
const addDays = (iso, n) => { const x = parse(iso); const d = new Date(Date.UTC(x.y, x.m, x.d + n)); return ymd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
const loc = () => (lang === 'hr' ? 'hr-HR' : 'en-GB');
const fmt = (iso, o) => { const x = parse(iso); return new Intl.DateTimeFormat(loc(), { timeZone:'UTC', ...o }).format(new Date(Date.UTC(x.y, x.m, x.d))); };

// ---------- DOM helper (text only, never innerHTML) ----------
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.setAttribute('style', v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
const $ = (s) => document.querySelector(s);
const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };

// ---------- state ----------
const today = todayZagreb();
const st = { events: [], generated: null, view: 'month', y: +today.slice(0,4), m: +today.slice(5,7)-1, hidden: new Set() };

function readHash() {
  const m = /^#(\d{4})-(\d{2})$/.exec(location.hash);
  if (m && +m[2] >= 1 && +m[2] <= 12) { st.y = +m[1]; st.m = +m[2] - 1; }
}
function writeHash() { if (st.view === 'month') history.replaceState(null, '', `#${st.y}-${pad(st.m + 1)}`); }

// ---------- data ----------
const evStart = (e) => e.start.slice(0, 10);
const evEnd = (e) => (e.end ? e.end.slice(0, 10) : evStart(e));
const overlaps = (e, from, to) => evStart(e) <= to && evEnd(e) >= from;
function range() {
  if (st.view === '30') return [today, addDays(today, 30)];
  const last = new Date(Date.UTC(st.y, st.m + 1, 0)).getUTCDate();
  return [ymd(st.y, st.m, 1), ymd(st.y, st.m, last)];
}
const visible = (list) => list.filter((e) => !st.hidden.has(e.category));

// ---------- render ----------
function render() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((n) => { const v = t(n.dataset.i18n); if (typeof v === 'string') n.textContent = v; });
  $('#lang').textContent = lang === 'hr' ? 'EN' : 'HR';
  $('#prev').setAttribute('aria-label', t('prev')); $('#next').setAttribute('aria-label', t('next'));
  $('#v-month').setAttribute('aria-pressed', st.view === 'month'); $('#v-30').setAttribute('aria-pressed', st.view === '30');

  const [from, to] = range();
  const inRange = st.events.filter((e) => overlaps(e, from, to));
  $('#month-title').textContent = st.view === 'month'
    ? fmt(ymd(st.y, st.m, 1), { month:'long', year:'numeric' })
    : `${fmt(from, { day:'numeric', month:'short' })} – ${fmt(to, { day:'numeric', month:'short' })}`;
  $('#prev').hidden = $('#next').hidden = st.view !== 'month';

  renderFilters(inRange);
  const shown = visible(inRange);
  $('#grid-wrap').hidden = st.view !== 'month';
  if (st.view === 'month') renderGrid(shown);
  renderList(shown, from, to);
  $('#program').classList.toggle('is-empty', !shown.length);
  $('#legend-note').textContent = st.view === 'month' ? t('legend') : '';
  if (st.generated) $('#updated').textContent = t('updated')(st.generated.replace('T', ' '));
}

function renderFilters(inRange) {
  const box = $('#filters'); box.replaceChildren();
  for (const c of CATS) {
    const n = inRange.filter((e) => e.category === c).length;
    if (!n && !st.hidden.has(c)) continue;
    box.append(h('button', { class:'chip', type:'button', 'aria-pressed': !st.hidden.has(c), style:`--cat:var(--c-${c})`,
      onclick: () => { st.hidden.has(c) ? st.hidden.delete(c) : st.hidden.add(c); render(); } },
      h('i'), t('cat')[c], ' ', h('span', { class:'n' }, String(n))));
  }
}

function renderGrid(events) {
  const grid = $('#grid'); grid.replaceChildren();
  const base = new Date(Date.UTC(2024, 0, 1)); // a Monday, for weekday labels
  for (let i = 0; i < 7; i++) grid.append(h('div', { class:'dow', role:'columnheader' },
    new Intl.DateTimeFormat(loc(), { weekday:'short', timeZone:'UTC' }).format(new Date(base.getTime() + i * 864e5))));
  const first = Date.UTC(st.y, st.m, 1);
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(st.y, st.m + 1, 0)).getUTCDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  for (let i = 0; i < total; i++) {
    const d = new Date(first + (i - lead) * 864e5);
    const iso = ymd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const out = d.getUTCMonth() !== st.m;
    const evs = events.filter((e) => overlaps(e, iso, iso));
    const cls = 'cell' + (out ? ' out' : '') + (iso === today ? ' today' : '');
    const kids = [h('span', { class:'d' }, String(d.getUTCDate()))];
    if (!out) {
      evs.slice(0, 3).forEach((e) => kids.push(h('span', { class:'ev', style:`--cat:var(--c-${e.category})`, title:e.title }, h('span', {}, e.title))));
      if (evs.length > 3) kids.push(h('span', { class:'more' }, `+${evs.length - 3}`));
    }
    grid.append(evs.length && !out
      ? h('a', { class:cls, href:`#d-${iso}`, role:'gridcell', 'aria-label':`${fmt(iso, { day:'numeric', month:'long' })}: ${t('month_count')(evs.length)}`,
          onclick: (ev) => { ev.preventDefault(); const el = document.getElementById(`d-${iso}`); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); } }, kids)
      : h('div', { class:cls, role:'gridcell' }, kids));
  }
}

function whenText(e) {
  const s = parse(e.start), end = e.end ? parse(e.end) : null;
  const multiDay = evEnd(e) !== evStart(e);
  const parts = [];
  if (multiDay) parts.push(`${fmt(evStart(e), { day:'numeric', month:'short' })} – ${fmt(evEnd(e), { day:'numeric', month:'short', year:'numeric' })}`);
  else parts.push(fmt(evStart(e), { weekday:'long', day:'numeric', month:'long', year:'numeric' }));
  if (e.time_confirmed && s.time) parts.push(end && end.time && !multiDay ? `${s.time}–${end.time}` : s.time);
  return parts.join(' · ');
}

function card(e) {
  const link = safeUrl(e.url), reg = safeUrl(e.registration_url);
  const rows = h('dl', { class:'rows' },
    e.organizer ? [h('dt', {}, t('organizer')), h('dd', {}, e.organizer)] : null,
    h('dt', {}, t('admission')), h('dd', {}, e.admission || t('admission_unknown'), !reg && !e.admission?.toLowerCase().includes('prijav') ? [' · ', h('em', {}, t('no_link'))] : null),
    link ? [h('dt', {}, t('source')), h('dd', {}, h('a', { href:link, rel:'noopener' }, e.source_name || new URL(link).hostname))] : null);
  return h('article', { class:'card', style:`--cat:var(--c-${e.category})` },
    h('div', { class:'tag' }, t('cat')[e.category] || e.category),
    h('h3', {}, e.title),
    h('div', { class:'meta' }, h('span', { class:'when' }, whenText(e)),
      !e.time_confirmed ? h('span', { class:'warn' }, t('time_unconfirmed')) : null),
    rows,
    e.notes ? h('p', { class:'note' }, e.notes) : null,
    h('div', { class:'actions' },
      reg ? h('a', { class:'btn primary', href:reg, rel:'noopener' }, t('register')) : null,
      link ? h('a', { class:'btn', href:link, rel:'noopener' }, t('open_source')) : null,
      h('button', { class:'btn', type:'button', onclick: () => downloadIcs(e) }, t('ics'))));
}

function renderList(events, from, to) {
  const box = $('#list'); box.replaceChildren();
  if (!events.length) {
    const next = st.events.filter((e) => !st.hidden.has(e.category) && evEnd(e) > to).sort((a, b) => a.start.localeCompare(b.start))[0];
    const act = h('div', { class:'actions' });
    if (next) act.append(h('button', { class:'btn primary', type:'button', onclick: () => { const x = parse(evStart(next)); st.view = 'month'; st.y = x.y; st.m = x.m; writeHash(); render(); } }, `${t('empty_next')}: ${fmt(evStart(next), { day:'numeric', month:'long' })}`));
    act.append(h('a', { class:'btn', href:'#izvori' }, t('empty_ask')));
    box.append(h('div', { class:'empty' }, h('h3', {}, t('empty_h')), h('p', {}, t('empty_p')), act));
    return;
  }
  // an event is listed once, on the first day it appears inside the visible range
  const groups = new Map();
  for (const e of events) {
    const key = evStart(e) < from ? from : evStart(e);
    (groups.get(key) || groups.set(key, []).get(key)).push(e);
  }
  for (const key of [...groups.keys()].sort()) {
    box.append(h('section', { class:'day', id:`d-${key}` },
      h('div', { class:'dayhead' }, h('b', {}, String(parse(key).d)), h('span', {}, fmt(key, { weekday:'long' })), h('small', {}, fmt(key, { month:'long' }))),
      h('div', { class:'items' }, groups.get(key).sort((a, b) => a.start.localeCompare(b.start)).map(card))));
  }
}

// ---------- calendar export (.ics, floating local time) ----------
function downloadIcs(e) {
  const s = parse(e.start);
  const allDay = !e.time_confirmed || !s.time;
  const ds = (iso, time) => iso.replaceAll('-', '') + (time ? `T${time.replace(':', '')}00` : '');
  const esc = (v) => String(v || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c);
  let dtstart, dtend;
  if (allDay) { dtstart = `DTSTART;VALUE=DATE:${ds(evStart(e))}`; dtend = `DTEND;VALUE=DATE:${ds(addDays(evEnd(e), 1))}`; }
  else {
    const en = e.end ? parse(e.end) : null;
    dtstart = `DTSTART:${ds(evStart(e), s.time)}`;
    dtend = en && en.time ? `DTEND:${ds(evEnd(e), en.time)}` : `DTEND:${ds(evStart(e), pad((+s.time.slice(0,2) + 1) % 24) + ':' + s.time.slice(3))}`;
  }
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//mots.markobosko.org//HR', 'BEGIN:VEVENT',
    `UID:${e.id}@mots.markobosko.org`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    dtstart, dtend, `SUMMARY:${esc(e.title)}`, 'LOCATION:' + esc('MOTS, Mjesni odbor Trnjanska Savica, Ulica Vladimira Ruždjaka 21, Zagreb'),
    e.url ? `URL:${e.url}` : '', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
  const a = h('a', { href: URL.createObjectURL(new Blob([body], { type:'text/calendar' })), download: `${e.id}.ics` });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- wiring ----------
function shift(n) { const d = new Date(Date.UTC(st.y, st.m + n, 1)); st.y = d.getUTCFullYear(); st.m = d.getUTCMonth(); writeHash(); render(); }
$('#prev').addEventListener('click', () => shift(-1));
$('#next').addEventListener('click', () => shift(1));
$('#today').addEventListener('click', () => { st.view = 'month'; st.y = +today.slice(0,4); st.m = +today.slice(5,7)-1; writeHash(); render(); });
$('#v-month').addEventListener('click', () => { st.view = 'month'; writeHash(); render(); });
$('#v-30').addEventListener('click', () => { st.view = '30'; history.replaceState(null, '', location.pathname); render(); });
$('#lang').addEventListener('click', () => { lang = lang === 'hr' ? 'en' : 'hr'; try { localStorage.setItem('mots-lang', lang); } catch {} render(); });
window.addEventListener('hashchange', () => { if (/^#\d{4}-\d{2}$/.test(location.hash)) { readHash(); st.view = 'month'; render(); } });
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea,select') || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowLeft' && st.view === 'month') shift(-1);
  if (e.key === 'ArrowRight' && st.view === 'month') shift(1);
});

readHash();
render();
fetch('data/events.json', { cache:'no-cache' })
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((d) => { st.events = d.events || []; st.generated = d.generated || null; render(); })
  .catch(() => { $('#list').replaceChildren(h('div', { class:'empty' }, h('h3', {}, t('load_err')))); });
})();
