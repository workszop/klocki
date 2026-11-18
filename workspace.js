/* ─── Workspace shell constants ─── */
const CO_STRINGS = {
  pl: {
    reset_state: 'Resetuj stan aplikacji', resize_card: 'Zmień rozmiar: przeciągnij lub użyj strzałek. Home lub dwuklik przywraca rozmiar.',
    run_pipeline: 'Uruchom pipeline', guide_button: 'Pomoc', tools: 'Narzędzia', tidy: 'Uporządkuj bloki', clear: 'Wyczyść tablicę',
    library_title: 'Biblioteka bloków',
    group_build: 'Buduj i trenuj', group_test: 'Testuj i przewiduj', group_understand: 'Zrozum model', group_share: 'Zapisz i udostępnij',
    dataset_title: 'Dataset i pliki',
    details_open: 'Ukryj szczegóły', details_closed: 'Pokaż szczegóły', settings: 'Ustawienia', already_added: 'Już na tablicy',
    log_show: 'Pokaż log', log_hide: 'Ukryj log', status_ready: 'Gotowe do pracy',
    empty_board: 'Tablica jest pusta. Dodaj blok z biblioteki albo użyj szybkiego startu.',
    needs_first: 'Najpierw:', camera_off: 'Kamera wyłączona',
    next_step: 'Następny krok:', tidy_done: 'Uporządkowano bloki', terminal_resize: 'Zmień rozmiar terminala: przeciągnij krawędź lub użyj strzałek',
    status_done: 'gotowe', status_idle: 'oczekuje', status_running: 'działa', status_error: 'błąd'
  },
  en: {
    reset_state: 'Reset app state', resize_card: 'Resize: drag or use arrow keys. Home or double-click restores the default size.',
    run_pipeline: 'Run pipeline', guide_button: 'Help', tools: 'Tools', tidy: 'Tidy blocks', clear: 'Clear canvas',
    library_title: 'Block library',
    group_build: 'Build and train', group_test: 'Test and predict', group_understand: 'Understand the model', group_share: 'Save and share',
    dataset_title: 'Dataset and files',
    details_open: 'Hide details', details_closed: 'Show details', settings: 'Settings', already_added: 'Already on the canvas',
    log_show: 'Show log', log_hide: 'Hide log', status_ready: 'Ready',
    empty_board: 'The canvas is empty. Add a block from the library or use a quick start.',
    needs_first: 'First:', camera_off: 'Camera is off',
    next_step: 'Next step:', tidy_done: 'Blocks tidied up', terminal_resize: 'Resize terminal: drag the edge or use arrow keys',
    status_done: 'ready', status_idle: 'waiting', status_running: 'running', status_error: 'error'
  }
};

const CO_SETTINGS = {
  'camera-input': { keys: ['res', 'spc'], summary: 'camera' },
  'camera-infer': { keys: ['fps'], summary: 'cameraInfer' },
  'prepare-data': { keys: ['augment'], summary: 'prepare' },
  'pretrained-model': { keys: [], summary: 'base' },
  'train-model': { keys: ['ep', 'lr', 'bs'], summary: 'train' },
  'show-results': { keys: ['threshold'], summary: 'threshold' },
  'zero-shot': { keys: ['zsfps'], summary: 'zero' },
  'explain-ai': { keys: ['xai-method', 'xai-patch'], summary: 'xai' }
};

/* ─── Alternative shell state ─── */
const CO_STATE = {
  libraryOpen: true,
  groupOpen: { build: true, test: false, understand: false, share: false },
  cardSizes: {},
  /* Cards are laid out automatically until the learner drags one by hand. */
  autoLayout: true, collapsed: {}, logOpen: false,
  autoOpened: null, failedStep: null, runMessages: [], lastToast: { text: '', at: 0 },
  terminalWidth: 320, terminalHeight: 240, terminalDrag: null
};

/* Read before app.js restores a saved canvas, so a hand-made layout is
   never re-flowed on load. */
try {
  CO_STATE.autoLayout = localStorage.getItem('co-auto-layout') !== 'false';
  const folded = JSON.parse(localStorage.getItem('co-collapsed') || '{}');
  if (folded && typeof folded === 'object' && !Array.isArray(folded)) CO_STATE.collapsed = folded;
  CO_STATE.logOpen = localStorage.getItem('co-log-open') === 'true';
} catch (_) { /* Keep defaults. */ }

const CO = window.CO = {
  state: CO_STATE,
  probe() {
    const cards = Array.from(document.querySelectorAll('.block-card'));
    const palette = Array.from(document.querySelectorAll('.palette-block')).map(el => el.dataset.type);
    const result = {
      ok: true,
      libraryOpen: document.body.dataset.libraryOpen === 'true',
      paletteTypes: palette,
      paletteCount: palette.length,
      blockCount: cards.length,
      logEntryCount: document.querySelectorAll('#log-entries .log-line').length,
      errorCount: document.querySelectorAll('#log-entries .log-line.ll-error').length
    };
    result.uniqueBlockTypes = new Set(cards.map(card => card.dataset.coType)).size === cards.length;
    result.ok = result.paletteCount === 14 && result.uniqueBlockTypes;
    return result;
  }
};

/* ─── Helpers ─── */
function coLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'pl';
}

function coText(key) {
  const strings = CO_STRINGS[coLang()];
  return (strings && strings[key]) || CO_STRINGS.pl[key] || key;
}

function coPipelineRank(type) {
  /* Keep this small override in one place. The native metadata is also
     updated below, but this fallback keeps the shell deterministic while
     app.js is still restoring a saved canvas. */
  if (type === 'evaluate') return 5;
  if (type === 'save-model') return 6;
  if (type === 'deploy-export') return 7;
  return typeof pipelineRank === 'function' ? pipelineRank(type) : 99;
}

function coCompareRecords(a, b) {
  const groupA = typeof pipelineGroup === 'function' ? pipelineGroup(a.type) : 0;
  const groupB = typeof pipelineGroup === 'function' ? pipelineGroup(b.type) : 0;
  if (groupA !== groupB) return groupA - groupB;
  const rankDiff = coPipelineRank(a.type) - coPipelineRank(b.type);
  if (rankDiff) return rankDiff;
  const xDiff = (Number(a.x) || 0) - (Number(b.x) || 0);
  return xDiff || String(a.id || '').localeCompare(String(b.id || ''));
}

function coRecords() {
  try {
    if (Array.isArray(placedBlocks)) return [...placedBlocks].sort(coCompareRecords);
  } catch (_) { /* app.js is still initialising */ }
  return Array.from(document.querySelectorAll('.block-card')).map(card => ({ id: card.id, type: card.dataset.coType || 'unknown', card }));
}

function coCardStatus(record) {
  const card = record && (record.card || document.getElementById(record.id));
  if (!card) return 'idle';
  const match = /status-(\w+)/.exec(card.className);
  return match ? match[1] : 'idle';
}

function coInferType(card) {
  if (!card) return 'unknown';
  if (card.querySelector('[id^="res-"]')) return 'camera-input';
  if (card.querySelector('[id^="fps-"]')) return 'camera-infer';
  if (card.querySelector('[id^="cn-"]')) return 'label-classes';
  if (card.querySelector('[id^="aug-"]')) return 'prepare-data';
  if (card.querySelector('[id^="ep-"]')) return 'train-model';
  if (card.querySelector('[id^="model-name-"]')) return 'save-model';
  if (card.querySelector('[id^="file-model-"]')) return 'upload-model';
  if (card.querySelector('[id^="pred-bars-"]')) return 'show-results';
  if (card.querySelector('[id^="zsfps-"]')) return 'zero-shot';
  if (card.querySelector('[id^="xai-method-"]')) return 'explain-ai';
  if (card.querySelector('[id^="eval-status-"]')) return 'evaluate';
  if (card.querySelector('[id^="deploy-status-"]')) return 'deploy-export';
  if (card.querySelector('[id^="model-status-"]')) return 'pretrained-model';
  if (card.querySelector('[id^="explorer-"]') || /Eksplorator|Model Explorer/.test(card.textContent)) return 'model-explorer';
  return 'unknown';
}

function coCardType(record) {
  return record && record.type && record.type !== 'unknown' ? record.type : coInferType(record && (record.card || document.getElementById(record && record.id)));
}

function coCaptureValues() {
  const values = [];
  document.querySelectorAll('.block-card input[id], .block-card select[id], .block-card textarea[id]').forEach(el => {
    if (el.type === 'file') return;
    values.push({ id: el.id, value: el.value, checked: !!el.checked });
  });
  const cards = [];
  document.querySelectorAll('.block-card').forEach(card => {
    cards.push({
      id: card.id,
      collapsed: card.classList.contains('collapsed'),
      settings: Array.from(card.querySelectorAll('details.co-settings-details')).map(detail => !!detail.open)
    });
  });
  return { values, cards };
}

function coRestoreValues(snapshot) {
  if (!snapshot) return;
  snapshot.values.forEach(item => {
    const el = document.getElementById(item.id);
    if (!el || el.type === 'file') return;
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = item.checked;
    else el.value = item.value;
  });
  snapshot.cards.forEach(item => {
    const card = document.getElementById(item.id);
    if (!card) return;
    card.classList.toggle('collapsed', item.collapsed);
    card.querySelectorAll('details.co-settings-details').forEach((detail, i) => {
      if (item.settings[i] !== undefined) detail.open = item.settings[i];
    });
  });
}

/* The card's own left/top is the source of truth: app.js writes it on drag
   end and tidy. Restoring a snapshot here would snap a freshly dragged card
   back to where it was before the drag. */
function coPositionCardsFree() {
  const maxWidth = coCardMaxWidth();
  document.querySelectorAll('.block-card').forEach(card => coCardSize(card, maxWidth));
}

function coSettingsValue(card, idPart) {
  const element = card && card.querySelector('[id*="-' + idPart + '-"], [id^="' + idPart + '-"]');
  return element ? element.value : '';
}

function coSummaryText(record) {
  const card = record.card || document.getElementById(record.id);
  const type = coCardType(record);
  const join = (parts) => parts.filter(Boolean).join(' · ');
  switch (type) {
    case 'camera-input': return join([coSettingsValue(card, 'res') ? coSettingsValue(card, 'res') + '×' + coSettingsValue(card, 'res') : '', coSettingsValue(card, 'spc') ? coSettingsValue(card, 'spc') + ' ' + (coLang() === 'pl' ? 'próbek/klasę' : 'samples/class') : '']);
    case 'camera-infer': return join([coLang() === 'pl' ? 'Kamera' : 'Camera', coSettingsValue(card, 'fps') ? (1000 / Number(coSettingsValue(card, 'fps'))).toFixed(0) + ' FPS' : '']);
    case 'prepare-data': return join([coLang() === 'pl' ? 'Augmentacja' : 'Augmentation', coSettingsValue(card, 'aug') === 'all' ? 'Flip + Brightness + Zoom + Skew' : (coLang() === 'pl' ? 'brak' : 'none')]);
    case 'train-model': return join([coSettingsValue(card, 'ep') ? coSettingsValue(card, 'ep') + (coLang() === 'pl' ? ' epok' : ' epochs') : '', coSettingsValue(card, 'lr') ? 'lr ' + coSettingsValue(card, 'lr') : '', coSettingsValue(card, 'bs') ? 'batch ' + coSettingsValue(card, 'bs') : '']);
    case 'show-results': return join([coLang() === 'pl' ? 'Próg' : 'Threshold', coSettingsValue(card, 'thr') ? Math.round(Number(coSettingsValue(card, 'thr')) * 100) + '%' : '']);
    case 'zero-shot': return join(['FPS', coSettingsValue(card, 'zsfps') ? (1000 / Number(coSettingsValue(card, 'zsfps'))).toFixed(0) : '']);
    case 'save-model': return coSettingsValue(card, 'model-name') || 'model-1';
    case 'pretrained-model': return coLang() === 'pl' ? 'MobileNetV3-Small' : 'MobileNetV3-Small';
    case 'evaluate': return coLang() === 'pl' ? '80% trening · 20% test' : '80% train · 20% test';
    default: return '';
  }
}

function coEnsureSummary(card, type) {
  if (!card) return;
  let summary = card.querySelector(':scope > .co-card-summary');
  if (!summary) {
    summary = document.createElement('div');
    summary.className = 'co-card-summary';
    summary.setAttribute('aria-live', 'polite');
    const body = card.querySelector(':scope > .bk-body');
    if (body) card.insertBefore(summary, body);
  }
  const record = { id: card.id, type, card };
  summary.textContent = coSummaryText(record);
}

function coEnsurePrereqSummary(card) {
  if (!card) return;
  const body = card.querySelector(':scope > .bk-body');
  const source = body && body.querySelector('.bk-prereq');
  let summary = card.querySelector(':scope > .co-card-prereq');
  if (!source) {
    if (summary) summary.remove();
    return;
  }
  if (!summary) {
    summary = document.createElement('div');
    summary.className = 'co-card-prereq';
    summary.setAttribute('aria-live', 'polite');
    if (body) card.insertBefore(summary, body);
  }
  const missing = Array.from(source.querySelectorAll('.prereq-pill.missing')).map(pill => {
    const copy = pill.cloneNode(true);
    copy.querySelector('.prereq-mark')?.remove();
    return copy.textContent.trim();
  });
  summary.textContent = missing.length ? coText('needs_first') + ' ' + missing.join(', ') : '';
  summary.hidden = !missing.length;
}

function coSettingsGroup(card, type) {
  const config = CO_SETTINGS[type];
  if (!card || !config) return;
  const body = card.querySelector(':scope > .bk-body');
  if (!body || body.querySelector(':scope > details.co-settings-details')) return;
  const rows = Array.from(body.querySelectorAll(':scope > .param-row'));
  if (!rows.length) return;
  const details = document.createElement('details');
  details.className = 'co-settings-details';
  details.open = true; /* options stay visible; the learner can fold them */
  details.dataset.coSettings = config.summary;
  const summary = document.createElement('summary');
  summary.textContent = coText('settings');
  details.appendChild(summary);
  const wanted = rows.filter(row => config.keys.some(key => row.querySelector('[id*="-' + key + '-"], [id^="' + key + '-"]')) || (type === 'camera-input' && row.querySelector('[id^="res-"]')));
  const selected = wanted.length ? wanted : rows.slice(0, type === 'train-model' ? 3 : 1);
  body.insertBefore(details, selected[0]);
  selected.forEach(row => details.appendChild(row));
}

function coEnsureCardControls(card, type) {
  if (!card) return;
  card.dataset.coType = type || coInferType(card);
  const header = card.querySelector(':scope > .bk-header');
  if (header && !header.querySelector('.co-card-toggle')) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'co-card-toggle';
    toggle.dataset.coControl = 'collapse';
    toggle.setAttribute('aria-controls', card.id + '-body');
    toggle.addEventListener('mousedown', event => event.stopPropagation());
    toggle.addEventListener('touchstart', event => event.stopPropagation(), { passive: true });
    toggle.addEventListener('click', event => {
      event.stopPropagation();
      if (typeof window.toggleCollapse === 'function') window.toggleCollapse(card.id);
      coSyncCards();
    });
    header.appendChild(toggle);
  }
  const body = card.querySelector(':scope > .bk-body');
  if (body) body.id = card.id + '-body';
  coSettingsGroup(card, card.dataset.coType);
  coEnsureSummary(card, card.dataset.coType);
  coEnsurePrereqSummary(card);
  coUpdateCardControl(card);
  coEnsureCardResize(card);
  if (CO_CARD_OBSERVER && !CO_OBSERVED_CARDS.has(card)) {
    CO_OBSERVED_CARDS.add(card);
    CO_CARD_OBSERVER.observe(card);
  }
}

/* ─── Automatic layout ─── */
/* Cards flow into the shortest column in pipeline order, training group
   first. An open card is as tall as its content and a folded one is a
   60px row, so a whole pipeline fits next to the step being worked on.
   Dragging a card by hand switches the automatic layout off until
   "Tidy blocks" (or a fresh quick start) switches it back on. */
const CO_OBSERVED_CARDS = new WeakSet();
const CO_CARD_OBSERVER = typeof ResizeObserver === 'function' ? new ResizeObserver(() => coScheduleSync()) : null;

function coSaveLayoutPrefs() {
  try {
    localStorage.setItem('co-auto-layout', String(CO_STATE.autoLayout));
    localStorage.setItem('co-collapsed', JSON.stringify(CO_STATE.collapsed));
  } catch (_) { /* Layout still works for this session. */ }
}

function coSetAutoLayout(on) {
  if (CO_STATE.autoLayout === on) return;
  CO_STATE.autoLayout = on;
  coSaveLayoutPrefs();
}

function coRememberCollapsed(card) {
  if (!card || !card.dataset.coType) return;
  CO_STATE.collapsed[card.dataset.coType] = card.classList.contains('collapsed');
  coSaveLayoutPrefs();
}

function coLayout(records) {
  if (!CO_STATE.autoLayout || document.body.dataset.cardResizing === 'true') return;
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  const cards = records.map(record => ({ record, card: record.card || document.getElementById(record.id) })).filter(item => item.card);
  /* A card that is no longer where the layout put it was moved by hand. */
  const moved = cards.some(({ card }) => card.classList.contains('dragging') ||
    (card.dataset.coX !== undefined && (card.dataset.coX !== card.style.left || card.dataset.coY !== card.style.top)));
  if (moved) { coSetAutoLayout(false); return; }
  const defaults = coCardDefaults();
  const mobile = window.innerWidth <= 768;
  const gutter = mobile ? 16 : 24, gap = 16, groupGap = 40;
  const rowGap = (typeof eduMode !== 'undefined' && eduMode) ? 44 : 12;
  const startY = (typeof eduMode !== 'undefined' && eduMode) ? 40 : 16;
  const available = Math.max(defaults.width, canvas.clientWidth - gutter * 2);
  const cols = Math.max(1, Math.floor((available + gap) / (defaults.width + gap)));
  const pitch = defaults.width + gap;
  let top = startY, changed = false;
  [0, 1].forEach(group => {
    const members = cards.filter(({ record }) => (typeof pipelineGroup === 'function' && pipelineGroup(record.type) === 1 ? 1 : 0) === group);
    if (!members.length) return;
    const heights = new Array(cols).fill(top);
    members.forEach(({ record, card }) => {
      const span = Math.max(1, Math.min(cols, Math.ceil((card.offsetWidth + gap) / pitch)));
      let best = 0, bestY = Infinity;
      for (let col = 0; col + span <= cols; col++) {
        const y = Math.max(...heights.slice(col, col + span));
        if (y < bestY) { bestY = y; best = col; }
      }
      const left = (gutter + best * pitch) + 'px', topPx = bestY + 'px';
      if (card.style.left !== left || card.style.top !== topPx) {
        card.style.left = left; card.style.top = topPx;
        record.x = gutter + best * pitch; record.y = bestY;
        changed = true;
      }
      card.dataset.coX = left; card.dataset.coY = topPx;
      for (let col = best; col < best + span; col++) heights[col] = bestY + card.offsetHeight + rowGap;
    });
    top = Math.max(...heights) + groupGap;
  });
  if (changed && typeof persistCanvasState === 'function' && !(typeof canvasStateRestoring !== 'undefined' && canvasStateRestoring)) persistCanvasState();
}

/* The Labels card is done as soon as two classes have samples. */
function coSyncLabelStatus(records) {
  const record = records.find(item => coCardType(item) === 'label-classes');
  document.body.dataset.hasLabels = String(!!record);
  if (!record) return;
  const card = record.card || document.getElementById(record.id);
  let ready = 0;
  try { ready = capturedSamples.filter(samples => samples && samples.length).length; } catch (_) { return; }
  const current = coCardStatus(record), wanted = ready >= 2 ? 'done' : 'idle';
  if ((current === 'idle' || current === 'done') && current !== wanted && typeof CO_NATIVE_SET_STATUS === 'function') CO_NATIVE_SET_STATUS(card, wanted);
}

/* ─── Status strip, log drawer and surfaced warnings ─── */
function coSetLogOpen(open) {
  CO_STATE.logOpen = !!open;
  document.body.dataset.logOpen = String(CO_STATE.logOpen);
  const toggle = document.getElementById('co-log-toggle');
  if (toggle) {
    toggle.textContent = coText(CO_STATE.logOpen ? 'log_hide' : 'log_show');
    toggle.setAttribute('aria-expanded', String(CO_STATE.logOpen));
  }
  try { localStorage.setItem('co-log-open', String(CO_STATE.logOpen)); } catch (_) { /* Session state is enough. */ }
  coScheduleSync();
}

function coSetStatus(kind, text) {
  const bar = document.getElementById('co-statusbar');
  const label = document.getElementById('co-status-text');
  if (!bar || !label) return;
  bar.dataset.kind = kind;
  label.textContent = text;
  label.removeAttribute('data-co-i18n'); /* a live message must survive a language switch */
}

/* Warnings and errors used to exist only in the log. With the log folded
   they also appear as a toast, once per message. */
function coSurface(type, msg) {
  if (type === 'info') return;
  const text = String(msg).replace(/^=+\s*|\s*=+$/g, '');
  coSetStatus(type, text);
  let running = false;
  try { running = pipelineRunning; } catch (_) { /* app.js not ready */ }
  if (type !== 'warn' && type !== 'error') return;
  if (running) {
    CO_STATE.runMessages.push(text);
    if (CO_STATE.runMessages.length > 1) return; /* the first message is the reason */
  }
  const now = Date.now();
  if (CO_STATE.lastToast.text === text && now - CO_STATE.lastToast.at < 5000) return;
  const shown = Array.from(document.querySelectorAll('#toast-stack .toast-msg')).some(el => el.textContent === text);
  CO_STATE.lastToast = { text, at: now };
  if (!shown && typeof showToast === 'function') showToast(text, type, { duration: 6000 });
}

function coCardAlert(id, text) {
  const card = document.getElementById(id);
  const body = card && card.querySelector(':scope > .bk-body');
  if (!body) return;
  let alert = body.querySelector(':scope > .co-card-alert');
  if (!text) { if (alert) alert.remove(); return; }
  if (!alert) {
    alert = document.createElement('div');
    alert.className = 'co-card-alert';
    alert.setAttribute('role', 'alert');
    body.insertBefore(alert, body.firstChild);
  }
  alert.textContent = text;
}

function coRevealCard(id) {
  const card = document.getElementById(id);
  if (!card) return;
  if (card.classList.contains('collapsed')) {
    card.classList.remove('collapsed');
    coRememberCollapsed(card);
  }
  coSyncCards();
  card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}

/* While Run pipeline works, the running step is open and in view; the step
   this shell opened before it folds back once it is done. */
function coFocusStep(id) {
  const previous = CO_STATE.autoOpened && document.getElementById(CO_STATE.autoOpened);
  if (previous && previous.id !== id && /status-done/.test(previous.className)) {
    previous.classList.add('collapsed');
    coRememberCollapsed(previous);
  }
  const card = document.getElementById(id);
  CO_STATE.autoOpened = card && card.classList.contains('collapsed') ? id : null;
  coRevealCard(id);
}

/* ─── Card sizing ─── */
/* Every card opens at one fixed default size (the size it has when packed
   next to its neighbours) regardless of viewport width. Only a card the
   learner resized by hand deviates from it. The defaults live in the
   --co-card-width / --co-open-card-height tokens; the numbers here are
   fallbacks for a missing stylesheet. */
function coCardDefaults() {
  const style = getComputedStyle(document.documentElement);
  const width = parseFloat(style.getPropertyValue('--co-card-width'));
  const height = parseFloat(style.getPropertyValue('--co-open-card-height'));
  return { width: Number.isFinite(width) ? width : 360, height: Number.isFinite(height) ? height : 640 };
}

function coCardMaxWidth() {
  return Math.max(160, (document.getElementById('canvas')?.clientWidth || 320) - (window.innerWidth <= 768 ? 32 : 48));
}

/* maxWidth is passed in by callers that size many cards so the canvas is
   measured once per pass, not once per card between DOM writes. Styles are
   written only when they change to keep syncs cheap. */
function coCardSize(card, maxWidth) {
  const stored = CO_STATE.cardSizes[card.dataset.coType];
  const limit = maxWidth != null ? maxWidth : coCardMaxWidth();
  const size = stored && Number.isFinite(stored.width) && Number.isFinite(stored.height)
    ? { width: Math.max(Math.min(220, limit), Math.min(limit, stored.width)), height: Math.max(320, Math.min(1200, stored.height)) } : null;
  /* Only a manual size is written inline, so the stylesheet token stays the
     default and a theme or breakpoint can still change it. */
  const height = size ? size.height + 'px' : '';
  if (card.style.getPropertyValue('--co-card-height') !== height) {
    if (size) card.style.setProperty('--co-card-height', height);
    else card.style.removeProperty('--co-card-height');
  }
  const width = size ? size.width + 'px' : '';
  if (card.style.width !== width) card.style.width = width;
  const manual = String(!!size);
  if (card.dataset.manualSize !== manual) card.dataset.manualSize = manual;
  return size;
}

function coSaveCardSizes() {
  try { localStorage.setItem('co-card-sizes', JSON.stringify(CO_STATE.cardSizes)); } catch (_) { /* Session sizing still works without storage. */ }
}

function coEnsureCardResize(card) {
  let handle = card.querySelector(':scope > .co-card-resize');
  if (!handle) {
    handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'co-card-resize';
    handle.textContent = '◢';
    handle.setAttribute('aria-controls', card.id);
    card.appendChild(handle);
    let drag = null;
    /* pointermove fires up to 120×/s: touch only the dragged card here and
       let the rAF-coalesced sync re-flow the rest of the layout. */
    const resize = (width, height) => {
      CO_STATE.cardSizes[card.dataset.coType] = { width, height };
      coCardSize(card);
      coScheduleSync();
    };
    const reset = () => {
      delete CO_STATE.cardSizes[card.dataset.coType];
      coSaveCardSizes();
      coSyncCards();
    };
    ['mousedown', 'touchstart', 'click'].forEach(type => handle.addEventListener(type, event => event.stopPropagation()));
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      const rect = card.getBoundingClientRect();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height };
      handle.setPointerCapture(event.pointerId);
      handle.focus({ preventScroll: true });
      document.body.dataset.cardResizing = 'true';
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      resize(drag.width + event.clientX - drag.x, drag.height + event.clientY - drag.y);
    });
    const finish = event => {
      if (!drag || drag.id !== event.pointerId) return;
      drag = null;
      document.body.dataset.cardResizing = 'false';
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      coSaveCardSizes();
      coSyncCards();
    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => handle.addEventListener(type, finish));
    handle.addEventListener('dblclick', reset);
    handle.addEventListener('keydown', event => {
      if (event.key === 'Home') { event.preventDefault(); event.stopPropagation(); reset(); return; }
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!delta) return;
      event.preventDefault(); event.stopPropagation();
      const rect = card.getBoundingClientRect(), step = event.shiftKey ? 50 : 20;
      resize(rect.width + delta[0] * step, rect.height + delta[1] * step);
    });
    /* Persist once per key press, not on every auto-repeat. */
    handle.addEventListener('keyup', event => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) coSaveCardSizes();
    });
  }
  handle.title = coText('resize_card');
  handle.setAttribute('aria-label', coText('resize_card'));
}

function coUpdateCardControl(card) {
  if (!card) return;
  const toggle = card.querySelector('.co-card-toggle');
  if (toggle) {
    const expanded = !card.classList.contains('collapsed');
    toggle.textContent = expanded ? '⌃' : '⌄';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? coText('details_open') : coText('details_closed'));
    toggle.title = expanded ? coText('details_open') : coText('details_closed');
  }
  const record = { id: card.id, type: card.dataset.coType || coInferType(card), card };
  coEnsureSummary(card, record.type);
  coEnsurePrereqSummary(card);
  card.querySelectorAll('.video-wrap').forEach(wrap => { wrap.dataset.coHint = coText('camera_off'); });
  const details = card.querySelector('.co-settings-details');
  if (details) {
    const summary = details.querySelector('summary');
    if (summary) summary.textContent = coText('settings');
  }
}

function coUpdateOrderBadges(records) {
  const counters = [0, 0];
  records.forEach(record => {
    const card = record.card || document.getElementById(record.id);
    if (!card) return;
    const header = card.querySelector('.bk-header');
    const badge = header && header.querySelector('.order-badge');
    if (!badge) return;
    const group = typeof pipelineGroup === 'function' && pipelineGroup(record.type) === 1 ? 1 : 0;
    badge.textContent = String(++counters[group]);
  });
}

function coSyncCards() {
  const records = coRecords();
  const addedTypes = new Set(records.map(coCardType));
  document.querySelectorAll('.palette-block').forEach(item => {
    const added = addedTypes.has(item.dataset.type);
    item.setAttribute('aria-disabled', String(added));
    item.dataset.added = String(added);
    item.draggable = !added;
    item.title = added ? coText('already_added') : '';
    const indicator = item.querySelector('.co-palette-action');
    if (indicator) indicator.textContent = added ? '' : '+';
  });
  records.forEach(record => {
    const card = record.card || document.getElementById(record.id);
    if (!card) return;
    const type = coCardType(record);
    coEnsureCardControls(card, type);
    coUpdateCardControl(card);
  });
  coPositionCardsFree();
  coSyncLabelStatus(records);
  coLayout(records);
  /* app.js numbers badges by its historical rank (save before evaluate).
     This shell presents the hold-out check first, so renumber to match. */
  coUpdateOrderBadges(records);
  CO_STATE.libraryOpen = document.body.dataset.libraryOpen === 'true';
}

function coTerminalLimits() {
  const mobile = window.innerWidth <= 768;
  const sidebarWidth = document.getElementById('sidebar')?.clientWidth || 0;
  return {
    mobile, min: mobile ? 120 : 200,
    max: Math.round(mobile ? Math.max(120, window.innerHeight * .75) : Math.max(200, Math.min(window.innerWidth * .6, window.innerWidth - sidebarWidth - 260)))
  };
}

function coApplyTerminalSize() {
  const limits = coTerminalLimits();
  const key = limits.mobile ? 'terminalHeight' : 'terminalWidth';
  CO_STATE[key] = Math.round(Math.max(limits.min, Math.min(limits.max, CO_STATE[key])));
  document.body.style.setProperty('--co-terminal-width', CO_STATE.terminalWidth + 'px');
  document.body.style.setProperty('--co-terminal-height', CO_STATE.terminalHeight + 'px');
  const handle = document.getElementById('co-log-resize');
  if (handle) {
    handle.setAttribute('aria-orientation', limits.mobile ? 'horizontal' : 'vertical');
    handle.setAttribute('aria-valuemin', String(limits.min));
    handle.setAttribute('aria-valuemax', String(limits.max));
    handle.setAttribute('aria-valuenow', String(CO_STATE[key]));
    handle.setAttribute('aria-label', coText('terminal_resize'));
    handle.title = coText('terminal_resize');
  }
  document.body.dataset.terminalWidth = String(CO_STATE.terminalWidth);
  document.body.dataset.terminalHeight = String(CO_STATE.terminalHeight);
}

function coSaveTerminalSize() {
  try {
    localStorage.setItem('co-terminal-size', JSON.stringify({ width: CO_STATE.terminalWidth, height: CO_STATE.terminalHeight }));
  } catch (_) { /* Resizing still works when persistence is unavailable. */ }
}

function coInitTerminalResize() {
  const handle = document.getElementById('co-log-resize');
  if (!handle) return;
  try {
    const saved = JSON.parse(localStorage.getItem('co-terminal-size'));
    if (Number.isFinite(saved?.width)) CO_STATE.terminalWidth = saved.width;
    if (Number.isFinite(saved?.height)) CO_STATE.terminalHeight = saved.height;
  } catch (_) { /* Keep defaults for malformed preferences. */ }
  coApplyTerminalSize();
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || CO_STATE.terminalDrag) return;
    event.preventDefault();
    const mobile = coTerminalLimits().mobile;
    CO_STATE.terminalDrag = { id: event.pointerId, mobile, origin: mobile ? event.clientY : event.clientX, size: mobile ? CO_STATE.terminalHeight : CO_STATE.terminalWidth };
    document.body.dataset.terminalResizing = 'true';
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    const drag = CO_STATE.terminalDrag;
    if (!drag || drag.id !== event.pointerId) return;
    CO_STATE[drag.mobile ? 'terminalHeight' : 'terminalWidth'] = drag.size + drag.origin - (drag.mobile ? event.clientY : event.clientX);
    coApplyTerminalSize();
    coScheduleSync();
  });
  const finish = event => {
    if (!CO_STATE.terminalDrag || CO_STATE.terminalDrag.id !== event.pointerId) return;
    CO_STATE.terminalDrag = null;
    document.body.dataset.terminalResizing = 'false';
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    coSaveTerminalSize();
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => handle.addEventListener(type, finish));
  handle.addEventListener('keydown', event => {
    const limits = coTerminalLimits();
    const key = limits.mobile ? 'terminalHeight' : 'terminalWidth';
    const increase = limits.mobile ? 'ArrowUp' : 'ArrowLeft';
    const decrease = limits.mobile ? 'ArrowDown' : 'ArrowRight';
    if (![increase, decrease, 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 32 : 16;
    CO_STATE[key] = event.key === 'Home' ? limits.min : event.key === 'End' ? limits.max : CO_STATE[key] + (event.key === increase ? step : -step);
    coApplyTerminalSize();
    coScheduleSync();
    coSaveTerminalSize();
  });
}

function coToggleLibrary() {
  const open = document.body.dataset.libraryOpen !== 'true';
  document.body.dataset.libraryOpen = String(open);
  CO_STATE.libraryOpen = open;
  const button = document.getElementById('co-library-toggle');
  if (button) button.setAttribute('aria-expanded', String(open));
  coApplyTerminalSize();
  coScheduleSync();
}

function coToggleGroup(group) {
  const section = document.querySelector('.co-library-group[data-group="' + group + '"]');
  if (!section) return;
  const open = section.dataset.open !== 'true';
  section.dataset.open = String(open);
  CO_STATE.groupOpen[group] = open;
  const button = section.querySelector('.co-library-group-toggle');
  if (button) button.setAttribute('aria-expanded', String(open));
}

let coSyncPending = false;
function coScheduleSync() {
  if (coSyncPending) return;
  coSyncPending = true;
  window.requestAnimationFrame(() => {
    coSyncPending = false;
    coSyncCards();
  });
}

let coWasMobile = window.innerWidth <= 768;
function coHandleResize() {
  const isMobile = window.innerWidth <= 768;
  if (coWasMobile && !isMobile) {
    /* A mobile canvas has its own scroll position. Returning to the wide
       layout should start at the top rather than a blank middle section. */
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const canvas = document.getElementById('canvas');
    if (canvas) canvas.scrollTop = 0;
  }
  if (!isMobile) {
    const canvas = document.getElementById('canvas');
    if (canvas) canvas.style.minHeight = '0px';
  }
  coWasMobile = isMobile;
  coApplyTerminalSize();
  coScheduleSync();
}

function coOpenGuide() {
  if (typeof CO_NATIVE_SHOW_GUIDE === 'function') CO_NATIVE_SHOW_GUIDE();
}

function coFoldExcept(types, open) {
  coRecords().forEach(record => {
    const type = coCardType(record);
    const card = record.card || document.getElementById(record.id);
    if (!card || !types.includes(type)) return;
    card.classList.toggle('collapsed', !open.includes(type));
    CO_STATE.collapsed[type] = !open.includes(type);
  });
  coSetAutoLayout(true);
  document.querySelectorAll('.block-card').forEach(card => { delete card.dataset.coX; delete card.dataset.coY; });
  coSaveLayoutPrefs();
}

function coQuickStartTraining() {
  const types = ['camera-input', 'label-classes', 'prepare-data', 'pretrained-model', 'train-model', 'evaluate', 'save-model'];
  const present = new Set(coRecords().map(record => coCardType(record)));
  types.forEach((type, index) => { if (!present.has(type)) window.placeBlock(type, 16 + index * 296, 40); });
  coFoldExcept(types, ['camera-input', 'label-classes']);
  try { log('step', t('log_qs_train')); } catch (_) { /* app may still be loading */ }
  coSyncCards();
}

function coQuickStartInference() {
  const types = ['upload-model', 'camera-infer', 'show-results'];
  const present = new Set(coRecords().map(record => coCardType(record)));
  types.forEach((type, index) => { if (!present.has(type)) window.placeBlock(type, 16 + index * 296, 40); });
  coFoldExcept(types, ['upload-model']);
  try { log('step', t('log_qs_infer')); } catch (_) { /* app may still be loading */ }
  coSyncCards();
}

/* ─── Wrappers around app.js, installed before its DOMContentLoaded hook ─── */
const CO_NATIVE_PLACE_BLOCK = window.placeBlock;
const CO_NATIVE_REMOVE_BLOCK = window.removeBlock;
const CO_NATIVE_CLEAR_CANVAS = window.clearCanvas;
const CO_NATIVE_TOGGLE_COLLAPSE = window.toggleCollapse;
const CO_NATIVE_APPLY_LANG = window.applyLang;
const CO_NATIVE_SET_STATUS = window.setBlockStatus;
const CO_NATIVE_TIDY = window.tidyUpCanvas;
const CO_NATIVE_SHOW_GUIDE = window.showGuide;
const CO_NATIVE_UPDATE_ORDER = window.updatePipelineOrder;
const CO_NATIVE_PIPELINE_SORTED = window.pipelineSorted;

/* In this shell evaluation is a learning milestone, not an afterthought:
   make Run pipeline follow the same test-before-save order shown above.
   BLOCK_META is mutable metadata owned by app.js; the original index page
   never loads this shell and therefore keeps its historical ordering. */
try {
  if (typeof BLOCK_META === 'object' && BLOCK_META.evaluate && BLOCK_META['save-model']) {
    BLOCK_META.evaluate.rank = 5;
    BLOCK_META['save-model'].rank = 6;
    if (BLOCK_META['deploy-export']) BLOCK_META['deploy-export'].rank = 7;
  }
} catch (_) { /* retain app.js defaults if metadata is unavailable */ }

/* Replace the global sorter as well as the metadata. updatePipelineOrder,
   connector drawing, and Run pipeline all call this function by name, so
   one order is visible and executable throughout the alternative shell. */
if (typeof CO_NATIVE_PIPELINE_SORTED === 'function') {
  window.pipelineSorted = function () {
    const nativeRecords = CO_NATIVE_PIPELINE_SORTED.apply(this, arguments);
    return Array.isArray(nativeRecords) ? nativeRecords.slice().sort(coCompareRecords) : coRecords();
  };
}

/* New cards land in the first free slot of a left-to-right grid sized from
   the default card, so a pipeline grows in an orderly way while every card
   the learner already dragged stays where it is. */
function coNextFreeSlot(newCard) {
  const canvas = document.getElementById('canvas');
  const defaults = coCardDefaults();
  const gutter = 24, gap = 16, rowGap = 22, startY = 24;
  const available = Math.max(defaults.width, (canvas ? canvas.clientWidth : 1200) - gutter * 2);
  const cols = Math.max(1, Math.floor((available + gap) / (defaults.width + gap)));
  const taken = Array.from(document.querySelectorAll('.block-card')).filter(card => card !== newCard).map(card => ({
    left: parseFloat(card.style.left) || 0, top: parseFloat(card.style.top) || 0,
    width: card.offsetWidth || defaults.width, height: card.offsetHeight || defaults.height
  }));
  const overlaps = (x, y) => taken.some(rect =>
    x < rect.left + rect.width && x + defaults.width > rect.left && y < rect.top + rect.height && y + defaults.height > rect.top);
  for (let row = 0; row < 200; row++) {
    const y = startY + row * (defaults.height + rowGap);
    for (let col = 0; col < cols; col++) {
      const x = gutter + col * (defaults.width + gap);
      if (!overlaps(x, y)) return { x, y };
    }
  }
  return { x: gutter, y: startY };
}

if (typeof CO_NATIVE_PLACE_BLOCK === 'function') {
  window.placeBlock = function (type, x, y) {
    /* Saved layouts can outlive a removed block type. Refuse unknown
       metadata here before app.js interpolates it into card markup. */
    if (typeof type !== 'string' || (typeof BLOCK_META === 'object' && BLOCK_META && !Object.prototype.hasOwnProperty.call(BLOCK_META, type))) return null;
    const existing = placedBlocks.find(record => record.type === type);
    if (existing) return existing.id;
    const restoringLayout = typeof canvasStateRestoring !== 'undefined' && canvasStateRestoring;
    if (!placedBlocks.length && !restoringLayout) coSetAutoLayout(true);
    const id = CO_NATIVE_PLACE_BLOCK(type, x, y);
    const card = document.getElementById(id);
    if (card) {
      card.dataset.coType = type;
      if (restoringLayout && CO_STATE.collapsed[type]) card.classList.add('collapsed');
      /* Restored layouts keep their saved coordinates; only cards added at
         runtime are slotted into the grid. */
      const restoring = typeof canvasStateRestoring !== 'undefined' && canvasStateRestoring;
      if (!restoring) {
        const slot = coNextFreeSlot(card);
        card.style.left = slot.x + 'px';
        card.style.top = slot.y + 'px';
        const record = placedBlocks.find(item => item.id === id);
        if (record) { record.x = slot.x; record.y = slot.y; }
        /* Native placeBlock already persisted the caller's coordinates. */
        if (typeof persistCanvasState === 'function') persistCanvasState();
      }
    }
    coSyncCards();
    return id;
  };
}

if (typeof CO_NATIVE_REMOVE_BLOCK === 'function') {
  window.removeBlock = function (id) {
    const result = CO_NATIVE_REMOVE_BLOCK(id);
    coSyncCards();
    return result;
  };
}

if (typeof CO_NATIVE_CLEAR_CANVAS === 'function') {
  window.clearCanvas = async function () {
    const result = await CO_NATIVE_CLEAR_CANVAS();
    coSyncCards();
    return result;
  };
}

if (typeof CO_NATIVE_TOGGLE_COLLAPSE === 'function') {
  window.toggleCollapse = function (id) {
    const result = CO_NATIVE_TOGGLE_COLLAPSE(id);
    const card = document.getElementById(id);
    if (card) { coUpdateCardControl(card); coRememberCollapsed(card); coScheduleSync(); }
    return result;
  };
}

if (typeof CO_NATIVE_APPLY_LANG === 'function') {
  window.applyLang = function () {
    const snapshot = coCaptureValues();
    const result = CO_NATIVE_APPLY_LANG();
    /* app.js rebuilds idle bodies. Recreate this shell's settings
       disclosures before restoring their open state and field values. */
    coSyncCards();
    coRestoreValues(snapshot);
    coApplyLanguage();
    window.PREDICTION_UI?.refreshAll();
    window.XAI_UI?.refreshAll();
    coSyncCards();
    return result;
  };
}

if (typeof CO_NATIVE_SET_STATUS === 'function') {
  window.setBlockStatus = function (card, status) {
    /* A failure must be visible even on a card the learner collapsed. Running
       is deliberately excluded: every capture flips the camera card to
       running, and a collapsed card should stay collapsed. */
    if (card && status === 'error') card.classList.remove('collapsed');
    const result = CO_NATIVE_SET_STATUS(card, status);
    coSyncCards();
    return result;
  };
}

if (typeof CO_NATIVE_UPDATE_ORDER === 'function') {
  window.updatePipelineOrder = function () {
    const result = CO_NATIVE_UPDATE_ORDER();
    coSyncCards();
    return result;
  };
}

window.tidyUpCanvas = function () {
  if (!coRecords().length) return;
  document.querySelectorAll('.block-card').forEach(card => { delete card.dataset.coX; delete card.dataset.coY; });
  coSetAutoLayout(true);
  coSyncCards();
  document.getElementById('canvas')?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  if (typeof showToast === 'function') showToast(coText('tidy_done'), 'info', { duration: 2500 });
};

/* ─── Pipeline feedback on the canvas ─── */
const CO_NATIVE_LOG = window.log;
if (typeof CO_NATIVE_LOG === 'function') {
  window.log = function (type, msg) {
    const result = CO_NATIVE_LOG.apply(this, arguments);
    try { coSurface(type, msg); } catch (_) { /* never let the strip break logging */ }
    return result;
  };
}

['runPrepare', 'runLoadBaseModel', 'runTraining'].forEach(name => {
  const native = window[name];
  if (typeof native !== 'function') return;
  window[name] = async function (id) {
    let inPipeline = false;
    try { inPipeline = pipelineRunning; } catch (_) { /* app.js not ready */ }
    coCardAlert(id, '');
    if (inPipeline) coFocusStep(id);
    const ok = await native.apply(this, arguments);
    if (inPipeline && ok === false) CO_STATE.failedStep = id;
    return ok;
  };
});

const CO_NATIVE_RUN_PIPELINE = window.runPipeline;
if (typeof CO_NATIVE_RUN_PIPELINE === 'function') {
  window.runPipeline = async function () {
    let busy = false;
    try { busy = pipelineRunning; } catch (_) { /* app.js not ready */ }
    if (busy) return CO_NATIVE_RUN_PIPELINE.apply(this, arguments);
    if (!coRecords().length) {
      coSetStatus('warn', coText('empty_board'));
      if (typeof showToast === 'function') showToast(coText('empty_board'), 'warn', { duration: 5000 });
      return undefined;
    }
    CO_STATE.failedStep = null; CO_STATE.runMessages = []; CO_STATE.autoOpened = null;
    const result = await CO_NATIVE_RUN_PIPELINE.apply(this, arguments);
    if (CO_STATE.failedStep) {
      /* The reason goes on the card that stopped the run, opened and in view. */
      coCardAlert(CO_STATE.failedStep, CO_STATE.runMessages[0] || '');
      coRevealCard(CO_STATE.failedStep);
    } else {
      /* Run stops after training: point at the first step still waiting. */
      const next = coRecords().find(record => ['evaluate', 'save-model'].includes(coCardType(record)) && coCardStatus(record) === 'idle');
      const trained = coRecords().some(record => coCardType(record) === 'train-model' && coCardStatus(record) === 'done');
      if (next && trained) {
        coSetStatus('success', coText('next_step') + ' ' + (typeof blockTitle === 'function' ? blockTitle(next.type) : next.type));
        const card = document.getElementById(next.id);
        if (card && card.classList.contains('collapsed')) { card.classList.remove('collapsed'); coRememberCollapsed(card); coSyncCards(); }
      }
    }
    return result;
  };
}

/* Edu hints sit between rows, so the layout needs its wider gaps at once. */
const CO_NATIVE_TOGGLE_EDU = window.toggleEduMode;
if (typeof CO_NATIVE_TOGGLE_EDU === 'function') {
  window.toggleEduMode = function () {
    const result = CO_NATIVE_TOGGLE_EDU.apply(this, arguments);
    coSyncCards();
    return result;
  };
}

window.quickStartTraining = coQuickStartTraining;
window.quickStartInference = coQuickStartInference;

/* Suppress app.js first-run auto-guide on this alternative shell only.
   The stored original preference is not read, written, or changed. */
const CO_STORAGE_PROTO = Object.getPrototypeOf(localStorage);
const CO_NATIVE_STORAGE_GET = CO_STORAGE_PROTO.getItem;
const CO_STORAGE_WRAPPED_GET = function (key) {
  /* app.js reads this preference only from its first-run timer. Returning
     a temporary value here keeps that timer quiet without writing or
     altering the user's original preference. */
  if (this === localStorage && key === 'ml-blocks-no-guide') return '1';
  return CO_NATIVE_STORAGE_GET.call(this, key);
};
CO_STORAGE_PROTO.getItem = CO_STORAGE_WRAPPED_GET;

/* ─── Alternative shell rendering ─── */
function coApplyLanguage() {
  document.querySelectorAll('[data-co-i18n]').forEach(el => {
    el.textContent = coText(el.dataset.coI18n);
  });
  document.querySelectorAll('[data-co-i18n-label]').forEach(el => {
    el.setAttribute('aria-label', coText(el.dataset.coI18nLabel));
    el.title = coText(el.dataset.coI18nLabel);
  });
  const logToggle = document.getElementById('co-log-toggle');
  if (logToggle) logToggle.textContent = coText(CO_STATE.logOpen ? 'log_hide' : 'log_show');
  document.getElementById('sidebar')?.setAttribute('aria-label', coLang() === 'pl' ? 'Biblioteka bloków' : 'Block library');
  document.getElementById('canvas')?.setAttribute('aria-label', coLang() === 'pl' ? 'Obszar roboczy' : 'Workspace');
  document.getElementById('flowbar')?.setAttribute('aria-label', coLang() === 'pl' ? 'Pipeline' : 'Pipeline');
  document.getElementById('log-panel')?.setAttribute('aria-label', coLang() === 'pl' ? 'Dziennik pipeline' : 'Pipeline log');
  document.title = 'KlockiAI';
  document.querySelectorAll('.block-card').forEach(coUpdateCardControl);
  coApplyTerminalSize();
}

function coInitialise() {
  try {
    const sizes = JSON.parse(localStorage.getItem('co-card-sizes') || '{}');
    if (sizes && typeof sizes === 'object' && !Array.isArray(sizes)) CO_STATE.cardSizes = sizes;
  } catch (_) { /* Ignore malformed saved sizes. */ }
  document.body.dataset.logOpen = String(CO_STATE.logOpen);
  document.getElementById('co-log-toggle')?.setAttribute('aria-expanded', String(CO_STATE.logOpen));
  /* Cards restored by app.js before this shell read its preferences. */
  document.querySelectorAll('.block-card').forEach(card => {
    const type = card.dataset.coType || coInferType(card);
    if (CO_STATE.collapsed[type]) card.classList.add('collapsed');
  });
  /* The original DOMContentLoaded handler has already made its one
     synchronous first-run preference check. Restore Storage immediately
     so the alternative shell never changes the page's normal API after
     boot. */
  if (CO_STORAGE_PROTO.getItem === CO_STORAGE_WRAPPED_GET) CO_STORAGE_PROTO.getItem = CO_NATIVE_STORAGE_GET;
  CO_STATE.libraryOpen = document.body.dataset.libraryOpen !== 'false';
  /* On a narrow first view, put the learner's current task before the
     catalogue. The library remains one tap away and is never collapsed
     again by a resize or by this shell. */
  if (window.innerWidth <= 768 && CO_STATE.libraryOpen) {
    document.body.dataset.libraryOpen = 'false';
    CO_STATE.libraryOpen = false;
  }
  document.getElementById('co-library-toggle')?.setAttribute('aria-expanded', String(CO_STATE.libraryOpen));
  coInitTerminalResize();
  document.getElementById('co-library-toggle')?.addEventListener('click', coToggleLibrary);
  document.querySelectorAll('.co-library-group-toggle').forEach(button => {
    button.addEventListener('click', () => coToggleGroup(button.closest('.co-library-group')?.dataset.group));
  });
  document.getElementById('co-tools-toggle')?.addEventListener('click', event => {
    const menu = document.getElementById('co-tools-menu');
    if (!menu) return;
    menu.hidden = !menu.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!menu.hidden));
  });
  document.addEventListener('click', event => {
    const tools = document.getElementById('co-tools');
    const menu = document.getElementById('co-tools-menu');
    if (tools && menu && !tools.contains(event.target)) {
      menu.hidden = true;
      document.getElementById('co-tools-toggle')?.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('input', event => {
    if (event.target.closest && event.target.closest('.block-card')) coSyncCards();
  });
  document.addEventListener('change', event => {
    if (event.target.closest && event.target.closest('.block-card')) coSyncCards();
  });
  /* Reflow after viewport changes and native <details> toggles. */
  window.addEventListener('resize', coHandleResize, { passive: true });
  document.addEventListener('toggle', event => {
    if (event.target.matches && event.target.matches('details.co-settings-details')) coScheduleSync();
  }, true);
  const canvas = document.getElementById('canvas');
  if (canvas) {
    const observer = new MutationObserver(records => {
      if (records.some(record => Array.from(record.addedNodes).some(node => node.nodeType === 1 && (node.matches?.('.block-card') || node.querySelector?.('.block-card'))))) coSyncCards();
    });
    observer.observe(canvas, { childList: true, subtree: true });
  }
  coApplyLanguage();
  coSyncCards();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', coInitialise, { once: true });
else coInitialise();
