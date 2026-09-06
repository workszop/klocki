/* ─── Workspace shell constants ─── */
const CO_STRINGS = {
  pl: {
    reset_state: 'Resetuj stan aplikacji', resize_card: 'Zmień rozmiar: przeciągnij lub użyj strzałek. Home lub dwuklik przywraca rozmiar.',
    run_pipeline: 'Uruchom pipeline', guide_button: 'Pomoc', tools: 'Narzędzia', tidy: 'Uporządkuj bloki', clear: 'Wyczyść tablicę',
    library_title: 'Biblioteka bloków', library_lead: 'Wybierz blok, aby dodać go do tablicy. Grupowanie pokazuje rolę każdego kroku.',
    group_build: 'Buduj i trenuj', group_test: 'Testuj i przewiduj', group_understand: 'Zrozum model', group_share: 'Zapisz i udostępnij',
    dataset_title: 'Dataset i pliki',
    details_open: 'Ukryj szczegóły', details_closed: 'Pokaż szczegóły', settings: 'Ustawienia', already_added: 'Blok już dodany', terminal_resize: 'Zmień rozmiar terminala: przeciągnij krawędź lub użyj strzałek',
    status_done: 'gotowe', status_idle: 'oczekuje', status_running: 'działa', status_error: 'błąd'
  },
  en: {
    reset_state: 'Reset app state', resize_card: 'Resize: drag or use arrow keys. Home or double-click restores the default size.',
    run_pipeline: 'Run pipeline', guide_button: 'Help', tools: 'Tools', tidy: 'Tidy blocks', clear: 'Clear canvas',
    library_title: 'Block library', library_lead: 'Choose a block to add it to the canvas. Groups show the role of each step.',
    group_build: 'Build and train', group_test: 'Test and predict', group_understand: 'Understand the model', group_share: 'Save and share',
    dataset_title: 'Dataset and files',
    details_open: 'Hide details', details_closed: 'Show details', settings: 'Settings', already_added: 'Block already added', terminal_resize: 'Resize terminal: drag the edge or use arrow keys',
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
  terminalWidth: 320, terminalHeight: 240, terminalDrag: null
};

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
    case 'prepare-data': return join([coLang() === 'pl' ? 'Augmentacja' : 'Augmentation', coSettingsValue(card, 'aug') === 'all' ? 'Flip + Brightness + Zoom + Skew' : (coLang() === 'pl' ? 'Brak' : 'None')]);
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
  summary.textContent = source.textContent.replace(/\s+/g, ' ').trim();
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
    if (indicator) indicator.textContent = added ? '✓' : '+';
  });
  records.forEach(record => {
    const card = record.card || document.getElementById(record.id);
    if (!card) return;
    const type = coCardType(record);
    coEnsureCardControls(card, type);
    coUpdateCardControl(card);
  });
  coPositionCardsFree();
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

function coQuickStartTraining() {
  const types = ['camera-input', 'label-classes', 'prepare-data', 'pretrained-model', 'train-model', 'evaluate', 'save-model'];
  const present = new Set(coRecords().map(record => coCardType(record)));
  types.forEach((type, index) => { if (!present.has(type)) window.placeBlock(type, 16 + index * 296, 40); });
  try { log('step', t('log_qs_train')); } catch (_) { /* app may still be loading */ }
  coSyncCards();
}

function coQuickStartInference() {
  const types = ['upload-model', 'camera-infer', 'show-results'];
  const present = new Set(coRecords().map(record => coCardType(record)));
  types.forEach((type, index) => { if (!present.has(type)) window.placeBlock(type, 16 + index * 296, 40); });
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
    const id = CO_NATIVE_PLACE_BLOCK(type, x, y);
    const card = document.getElementById(id);
    if (card) {
      card.dataset.coType = type;
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
    if (card) coUpdateCardControl(card);
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

if (typeof CO_NATIVE_TIDY === 'function') {
  window.tidyUpCanvas = function () {
    const result = CO_NATIVE_TIDY();
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
