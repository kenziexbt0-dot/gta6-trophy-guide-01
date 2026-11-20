// Leonida Ledger: checklist, filters, spoiler setting, roadmap and missables
// for the 55 Grand Theft Auto VI trophies. Progress lives in localStorage;
// export writes it to a file, import reads one back. The app fetches only
// its own data/trophies.json and never reaches the network.

const EARNED_KEY = 'leonida-ledger-earned-v1';
const SPOILER_KEY = 'leonida-ledger-spoiler-v1';

const SOURCE_NAMES = {
  exophase: 'Exophase — official list',
  psnprofiles: 'PSNProfiles — official list & PSN counts',
  powerpyx: 'PowerPyx — trophy guide & roadmap',
};

const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  side: 'Side quests',
  robbery: 'Robberies',
  exploration: 'Exploration',
  misc: 'Feats & misc',
  completion: 'Completion',
};

const data = await (await fetch('data/trophies.json')).json();
const trophies = data.trophies;
const sourceUrls = data.sources;

let earned = new Set(loadEarned());
let spoilerOn = loadSpoiler();
let openGuides = new Set();

const listEl = document.getElementById('trophyList');
const missableListEl = document.getElementById('missableList');
const searchEl = document.getElementById('search');
const kindEl = document.getElementById('kind');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');
const hideEarnedEl = document.getElementById('hideEarned');

function loadEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((id) => Number.isInteger(id) && id >= 1 && id <= 55) : [];
  } catch {
    return [];
  }
}

function loadSpoiler() {
  return localStorage.getItem(SPOILER_KEY) !== 'off';
}

function saveEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function saveSpoiler() {
  localStorage.setItem(SPOILER_KEY, spoilerOn ? 'on' : 'off');
}

function trophyIsSpoiled(trophy) {
  return spoilerOn && trophy.kind === 'story' && !earned.has(trophy.id);
}

function trophyMatchesFilters(trophy) {
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (kindEl.value === 'missable') {
    if (!trophy.missable) return false;
  } else if (kindEl.value !== 'all' && trophy.kind !== kindEl.value) {
    return false;
  }
  if (gradeEl.value !== 'all' && trophy.grade !== gradeEl.value) return false;
  if (hideEarnedEl.checked && earned.has(trophy.id)) return false;
  return true;
}

function buildTrophyRow(trophy) {
  const li = document.createElement('li');
  li.className = 'trophy' + (earned.has(trophy.id) ? ' earned' : '');
  li.dataset.trophyId = String(trophy.id);

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(trophy.id);
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(trophy.id);
    else earned.delete(trophy.id);
    saveEarned();
    renderChecklist();
    renderProgress();
  });

  const medal = document.createElement('span');
  medal.className = `medal ${trophy.grade}`;
  medal.title = trophy.grade;

  const head = document.createElement('div');
  head.className = 'trophy-head';
  const spoiled = trophyIsSpoiled(trophy);
  const nameEl = document.createElement('span');
  nameEl.className = 'trophy-name' + (spoiled ? ' spoiled' : '');
  nameEl.textContent = spoiled ? 'Hidden trophy — earn it to reveal' : trophy.name;
  const gradeEl2 = document.createElement('span');
  gradeEl2.className = `trophy-grade ${trophy.grade}`;
  gradeEl2.textContent = trophy.grade;
  head.append(nameEl, gradeEl2);
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = KIND_LABELS[trophy.kind] ?? trophy.kind;
  head.append(kindTag);
  if (trophy.target !== null && trophy.target !== undefined) {
    const targetTag = document.createElement('span');
    targetTag.className = 'tag target';
    targetTag.textContent = `PSN target: ${formatTarget(trophy.target)}`;
    head.append(targetTag);
  }
  if (trophy.missable) {
    const missTag = document.createElement('span');
    missTag.className = 'tag missable';
    missTag.textContent = 'Possibly missable';
    head.append(missTag);
  }
  if (trophy.hidden && !spoiled) {
    const hiddenTag = document.createElement('span');
    hiddenTag.className = 'tag hidden-tag';
    hiddenTag.textContent = 'Hidden on PSN';
    head.append(hiddenTag);
  }

  const desc = document.createElement('p');
  desc.className = 'trophy-desc' + (spoiled ? ' spoiled' : '');
  desc.textContent = spoiled
    ? 'A story trophy. Its name and description stay hidden until you earn it.'
    : trophy.description;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-toggle';
  const open = openGuides.has(trophy.id);
  toggle.textContent = open ? 'Hide guide' : 'Show guide';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.addEventListener('click', () => {
    if (openGuides.has(trophy.id)) openGuides.delete(trophy.id);
    else openGuides.add(trophy.id);
    renderChecklist();
  });

  // A spoiled trophy stays hidden whole: its guide names the mission, so
  // there is no toggle until the trophy is earned.
  li.append(box, medal, head, desc);
  if (!spoiled) li.append(toggle);

  if (open && !spoiled) {
    const body = document.createElement('div');
    body.className = 'guide-body';
    const guideP = document.createElement('p');
    guideP.textContent = trophy.guide;
    const srcP = document.createElement('p');
    srcP.className = 'guide-sources';
    srcP.textContent = 'Sources: ';
    trophy.sources.forEach((key, i) => {
      if (i > 0) srcP.append(document.createTextNode(' · '));
      const a = document.createElement('a');
      a.href = sourceUrls[key];
      a.textContent = SOURCE_NAMES[key] ?? key;
      a.target = '_blank';
      a.rel = 'noopener';
      srcP.append(a);
    });
    body.append(guideP, srcP);
    li.append(body);
  }
  return li;
}

function formatTarget(n) {
  return n >= 1000 ? n.toLocaleString('en-US') : String(n);
}

function renderChecklist() {
  const shown = trophies.filter(trophyMatchesFilters);
  listEl.replaceChildren(...shown.map(buildTrophyRow));
  document.getElementById('resultLine').textContent =
    `Showing ${shown.length} of 55 trophies · ${earned.size} earned`;
}

function renderMissables() {
  const missable = trophies.filter((t) => t.missable);
  missableListEl.replaceChildren(...missable.map(buildTrophyRow));
}

function renderProgress() {
  const byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) if (earned.has(t.id)) byGrade[t.grade] += 1;
  document.getElementById('earnedCount').textContent = String(earned.size);
  document.getElementById('barFill').style.width = `${(earned.size / trophies.length) * 100}%`;
  document.getElementById('gradeLine').innerHTML =
    `Earned: <b>${byGrade.platinum}</b> platinum · <b>${byGrade.gold}</b> gold · <b>${byGrade.silver}</b> silver · <b>${byGrade.bronze}</b> bronze`;
}

function switchView(view) {
  for (const btn of document.querySelectorAll('.tab')) {
    const active = btn.dataset.view === view;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  }
  for (const section of document.querySelectorAll('.view')) {
    section.classList.toggle('hidden', section.id !== `view-${view}`);
  }
  if (view === 'missables') renderMissables();
}

function exportProgress() {
  const payload = {
    game: 'Grand Theft Auto VI',
    exported_at: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-ledger-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  try {
    const payload = JSON.parse(await file.text());
    const ids = Array.isArray(payload) ? payload : payload.earned;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    const valid = ids.filter((id) => Number.isInteger(id) && id >= 1 && id <= 55);
    earned = new Set(valid);
    saveEarned();
    renderChecklist();
    renderProgress();
  } catch {
    alert('That file is not a Leonida Ledger progress export.');
  }
}

for (const btn of document.querySelectorAll('.tab')) {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
}
searchEl.addEventListener('input', renderChecklist);
kindEl.addEventListener('change', renderChecklist);
gradeEl.addEventListener('change', renderChecklist);
hideEarnedEl.addEventListener('change', renderChecklist);
spoilerEl.addEventListener('change', () => {
  spoilerOn = spoilerEl.checked;
  saveSpoiler();
  renderChecklist();
});
document.getElementById('exportBtn').addEventListener('click', exportProgress);
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) importProgress(file);
  e.target.value = '';
});

spoilerEl.checked = spoilerOn;
renderChecklist();
renderProgress();
renderMissables();

// Deep links: #roadmap and #missables open those tabs, so a link can point
// straight at the roadmap or the missables page.
function applyHash() {
  const view = location.hash.replace('#', '');
  if (view === 'roadmap' || view === 'missables') switchView(view);
  else switchView('checklist');
}
window.addEventListener('hashchange', applyHash);
applyHash();
