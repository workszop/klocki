/* ─── Guided workspace constants ─── */
const CO_STRINGS = {
  pl: {
    reset_state: 'Resetuj stan aplikacji', resize_card: 'Zmień rozmiar: przeciągnij lub użyj strzałek. Home lub dwuklik przywraca rozmiar.',
    context_guided: 'Widok prowadzony', context_free: 'Canvas swobodny',
    run_pipeline: 'Uruchom pipeline', guide_button: 'Pomoc', tools: 'Narzędzia', tidy: 'Uporządkuj bloki', clear: 'Wyczyść tablicę',
    library_title: 'Biblioteka bloków', library_lead: 'Wybierz blok, aby dodać go do tablicy. Grupowanie pokazuje rolę każdego kroku.',
    group_build: 'Buduj i trenuj', group_test: 'Testuj i przewiduj', group_understand: 'Zrozum model', group_share: 'Zapisz i udostępnij',
    dataset_title: 'Dataset i pliki', guided_kicker: 'Widok prowadzony', guided_title: 'Zbuduj model krok po kroku',
    guided_intro: 'Zobacz pełną ścieżkę, skup się na jednym kroku i rozwijaj szczegóły wtedy, gdy są potrzebne.',
    expand_all: 'Rozwiń szczegóły', collapse_all: 'Zwiń szczegóły', current_step: 'Bieżący krok',
    previous_step: 'Poprzedni', next_step: 'Następny krok', first_step: 'To początek ścieżki', last_step: 'To ostatni krok',
    log_summary_ready: 'Ostatni status', log_close: 'Zwiń', log_open: 'Otwórz log', log_error_prefix: 'Błąd: ',
    details_open: 'Ukryj szczegóły', details_closed: 'Pokaż szczegóły', settings: 'Ustawienia', already_added: 'Blok już dodany', terminal_resize: 'Zmień rozmiar terminala: przeciągnij krawędź lub użyj strzałek',
    status_done: 'gotowe', status_idle: 'oczekuje', status_running: 'działa', status_error: 'błąd',
    step_camera: 'Zbierz dane', step_labels: 'Nazwij klasy', step_prepare: 'Przygotuj dane', step_base: 'Wczytaj model bazowy',
    step_train: 'Wytrenuj model', step_evaluate: 'Sprawdź na nowych danych', step_save: 'Zapisz model', step_export: 'Udostępnij aplikację',
    step_upload: 'Wczytaj model', step_infer_camera: 'Uruchom kamerę predykcji', step_results: 'Zobacz wyniki', step_zero: 'Sprawdź model bazowy',
    step_explain: 'Wyjaśnij decyzję', step_explorer: 'Poznaj architekturę',
    desc_camera: 'Zbieramy przykłady, na których model będzie się uczył.', desc_labels: 'Etykiety mówią modelowi, do której klasy należy każdy obraz.',
    desc_prepare: 'Obrazy są ujednolicane, a augmentacja tworzy bezpieczną różnorodność.', desc_base: 'Model bazowy dostarcza cechy wyuczone na dużym zbiorze obrazów.',
    desc_train: 'Trening dopasowuje ostatnią część modelu do Twoich klas.', desc_evaluate: 'Test na niewidzianych 20% danych pokazuje, czy model uogólnia.',
    desc_save: 'Zachowaj wytrenowane wagi w przeglądarce lub pobierz pliki.', desc_export: 'Eksport tworzy samodzielną aplikację z modelem w środku.',
    desc_upload: 'Wczytaj wcześniej zapisane wagi, aby wrócić do pracy.', desc_infer_camera: 'Kamera dostarcza klatki do bieżącej predykcji.',
    desc_results: 'Paski pewności pokazują, jak rozkładają się przewidywania klas.', desc_zero: 'Porównaj predykcję modelu bazowego przed treningiem.',
    desc_explain: 'Zobacz, które fragmenty obrazu wpłynęły na decyzję.', desc_explorer: 'Przejdź przez architekturę warstwa po warstwie.'
  },
  en: {
    reset_state: 'Reset app state', resize_card: 'Resize: drag or use arrow keys. Home or double-click restores the default size.',
    context_guided: 'Guided view', context_free: 'Free canvas',
    run_pipeline: 'Run pipeline', guide_button: 'Help', tools: 'Tools', tidy: 'Tidy blocks', clear: 'Clear canvas',
    library_title: 'Block library', library_lead: 'Choose a block to add it to the canvas. Groups show the role of each step.',
    group_build: 'Build and train', group_test: 'Test and predict', group_understand: 'Understand the model', group_share: 'Save and share',
    dataset_title: 'Dataset and files', guided_kicker: 'Guided view', guided_title: 'Build a model step by step',
    guided_intro: 'See the full path, focus on one step, and reveal details only when you need them.',
    expand_all: 'Expand details', collapse_all: 'Collapse details', current_step: 'Current step',
    previous_step: 'Previous', next_step: 'Next step', first_step: 'This is the first step', last_step: 'This is the last step',
    log_summary_ready: 'Latest status', log_close: 'Collapse', log_open: 'Open log', log_error_prefix: 'Error: ',
    details_open: 'Hide details', details_closed: 'Show details', settings: 'Settings', already_added: 'Block already added', terminal_resize: 'Resize terminal: drag the edge or use arrow keys',
    status_done: 'ready', status_idle: 'waiting', status_running: 'running', status_error: 'error',
    step_camera: 'Collect data', step_labels: 'Name classes', step_prepare: 'Prepare data', step_base: 'Load base model',
    step_train: 'Train the model', step_evaluate: 'Test on new data', step_save: 'Save the model', step_export: 'Share the app',
    step_upload: 'Load a model', step_infer_camera: 'Start prediction camera', step_results: 'See results', step_zero: 'Check the base model',
    step_explain: 'Explain a decision', step_explorer: 'Explore the architecture',
    desc_camera: 'Collect examples for the model to learn from.', desc_labels: 'Labels tell the model which class each image belongs to.',
    desc_prepare: 'Images are standardised and augmentation adds safe variety.', desc_base: 'The base model provides features learned from a large image collection.',
    desc_train: 'Training adapts the final part of the model to your classes.', desc_evaluate: 'A hold-out test on unseen 20% shows whether the model generalises.',
    desc_save: 'Keep the trained weights in the browser or download the files.', desc_export: 'Export creates a standalone app with the model inside.',
    desc_upload: 'Load previously saved weights to continue working.', desc_infer_camera: 'The camera supplies frames for live prediction.',
    desc_results: 'Confidence bars show how class predictions are distributed.', desc_zero: 'Compare the base model before training.',
    desc_explain: 'See which image regions influenced the decision.', desc_explorer: 'Inspect the architecture layer by layer.'
  }
};

const CO_STEP_META = {
  'camera-input': ['step_camera', 'desc_camera'], 'label-classes': ['step_labels', 'desc_labels'],
  'prepare-data': ['step_prepare', 'desc_prepare'], 'pretrained-model': ['step_base', 'desc_base'],
  'train-model': ['step_train', 'desc_train'], 'evaluate': ['step_evaluate', 'desc_evaluate'],
  'save-model': ['step_save', 'desc_save'], 'deploy-export': ['step_export', 'desc_export'],
  'upload-model': ['step_upload', 'desc_upload'], 'camera-infer': ['step_infer_camera', 'desc_infer_camera'],
  'show-results': ['step_results', 'desc_results'], 'zero-shot': ['step_zero', 'desc_zero'],
  'explain-ai': ['step_explain', 'desc_explain'], 'model-explorer': ['step_explorer', 'desc_explorer']
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
  view: 'guided', libraryOpen: true, logOpen: false, activeId: null,
  groupOpen: { build: true, test: false, understand: false, share: false },
  freePositions: new Map(), freeWidths: new Map(), freeCollapse: new Map(), freeSettings: new Map(),
  manualCollapse: new Map(),
  cardSizes: {},
  terminalWidth: 320, terminalHeight: 240, terminalDrag: null,
  logErrors: 0, latestLog: ''
};

const CO = window.CO = {
  state: CO_STATE,
  probe() {
    const cards = Array.from(document.querySelectorAll('.block-card'));
    const palette = Array.from(document.querySelectorAll('.palette-block')).map(el => el.dataset.type);
    const active = cards.filter(card => card.dataset.active === 'true');
    const result = {
      ok: document.body.dataset.view === 'guided' || document.body.dataset.view === 'free',
      view: document.body.dataset.view,
      libraryOpen: document.body.dataset.libraryOpen === 'true',
      logOpen: document.body.dataset.logOpen === 'true',
      paletteTypes: palette,
      paletteCount: palette.length,
      blockCount: cards.length,
      activeCardCount: active.length,
      activeCardId: CO_STATE.activeId,
      allCardsHaveActiveContract: cards.every(card => card.dataset.active === 'true' || card.dataset.active === 'false'),
      logEntryCount: document.querySelectorAll('#log-entries .log-line').length,
      errorCount: CO_STATE.logErrors
    };
    result.uniqueBlockTypes = new Set(cards.map(card => card.dataset.coType)).size === cards.length;
    result.ok = result.ok && result.paletteCount === 14 && result.allCardsHaveActiveContract && result.uniqueBlockTypes;
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

function coFreePositionSnapshot(force) {
  document.querySelectorAll('.block-card').forEach(card => {
    if (force || !CO_STATE.freePositions.has(card.id)) {
      CO_STATE.freePositions.set(card.id, { left: card.style.left, top: card.style.top });
      CO_STATE.freeWidths.set(card.id, card.style.width || '');
      CO_STATE.freeCollapse.set(card.id, card.classList.contains('collapsed'));
    }
  });
}

function coPositionCardsFree() {
  document.querySelectorAll('.block-card').forEach(card => {
    const position = CO_STATE.freePositions.get(card.id);
    if (position) {
      card.style.left = position.left;
      card.style.top = position.top;
    }
    card.style.width = CO_STATE.freeWidths.get(card.id) || '';
    const size = coCardSize(card);
    if (size) card.style.width = size.width + 'px';
    const wasCollapsed = CO_STATE.freeCollapse.get(card.id);
    if (wasCollapsed !== undefined) card.classList.toggle('collapsed', wasCollapsed);
  });
}

function coSaveNewFreePosition(card) {
  if (!card || CO_STATE.freePositions.has(card.id)) return;
  CO_STATE.freePositions.set(card.id, { left: card.style.left, top: card.style.top });
  CO_STATE.freeWidths.set(card.id, card.style.width || '');
  CO_STATE.freeCollapse.set(card.id, card.classList.contains('collapsed'));
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
      const wasCollapsed = card.classList.contains('collapsed');
      if (typeof window.toggleCollapse === 'function') window.toggleCollapse(card.id);
      const isCollapsed = !wasCollapsed;
      CO_STATE.manualCollapse.set(card.id, isCollapsed);
      if (!isCollapsed) CO_STATE.activeId = card.id;
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

function coCardSize(card) {
  const stored = CO_STATE.cardSizes[card.dataset.coType];
  const maxWidth = coCardMaxWidth();
  const size = stored && Number.isFinite(stored.width) && Number.isFinite(stored.height)
    ? { width: Math.max(Math.min(220, maxWidth), Math.min(maxWidth, stored.width)), height: Math.max(320, Math.min(1200, stored.height)) } : null;
  /* Only a manual size is written inline, so the stylesheet token stays the
     default and a theme or breakpoint can still change it. */
  if (size) card.style.setProperty('--co-card-height', size.height + 'px');
  else card.style.removeProperty('--co-card-height');
  card.dataset.manualSize = String(!!size);
  return size;
}

function coSaveCardSizes() {
  try { localStorage.setItem('co-card-sizes', JSON.stringify(CO_STATE.cardSizes)); } catch (_) { /* Session sizing still works without storage. */ }
}

function coEnsureCardResize(card) {
  coCardSize(card);
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
      const size = coCardSize(card);
      if (size) card.style.width = size.width + 'px';
      coScheduleSync();
    };
    const reset = () => {
      delete CO_STATE.cardSizes[card.dataset.coType];
      CO_STATE.freeWidths.delete(card.id);
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
      coSaveCardSizes();
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

function coSetActive(id, focusCard) {
  CO_STATE.activeId = id || null;
  coSyncCards();
  if (focusCard) {
    const card = document.getElementById(id);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function coCurrentIndex(records) {
  if (!records.length) return -1;
  const found = records.findIndex(record => record.id === CO_STATE.activeId);
  return found >= 0 ? found : 0;
}

function coLayoutGuided(records) {
  if (CO_STATE.view !== 'guided') return;
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  const panel = document.getElementById('co-guided-panel');
  const startY = (panel ? panel.offsetTop + panel.offsetHeight : 0) + 42;
  const gutter = window.innerWidth <= 768 ? 16 : 24;
  const gap = 16;
  const availableWidth = Math.max(1, canvas.clientWidth - gutter * 2);
  /* Fixed default width: cards pack left-to-right and wrap, they never
     stretch to fill the row. Phones get one full-width column. */
  const cardWidth = window.innerWidth <= 768 ? availableWidth : Math.min(coCardDefaults().width, availableWidth);
  let y = startY;
  let rowHeight = 0;
  let x = 0, row = 1, column = 0, maxColumns = 0;
  records.forEach((record, index) => {
    const card = record.card || document.getElementById(record.id);
    if (!card) return;
    coSaveNewFreePosition(card);
    const size = coCardSize(card);
    const width = size ? size.width : cardWidth;
    if (column > 0 && x + width > availableWidth + 0.5) {
      y += rowHeight + 22;
      rowHeight = 0;
      x = 0; column = 0; row++;
    }
    card.dataset.gridRow = String(row);
    card.dataset.gridColumn = String(column + 1);
    card.style.left = (gutter + x) + 'px';
    card.style.top = y + 'px';
    card.style.width = width + 'px';
    x += width + gap;
    column++;
    maxColumns = Math.max(maxColumns, column);
    /* Cards open unfolded; only an explicit learner choice collapses one. */
    card.classList.toggle('collapsed', CO_STATE.manualCollapse.get(record.id) === true);
    coUpdateCardControl(card);
    rowHeight = Math.max(rowHeight, card.offsetHeight);
  });
  const contentHeight = Math.ceil(y + rowHeight + 28);
  canvas.dataset.guidedColumns = String(maxColumns);
  canvas.dataset.guidedRows = String(row);
  const inner = document.getElementById('canvas-inner');
  if (inner) {
    /* Absolute cards do not reliably contribute to a scroll container's
       scrollHeight. A transparent spacer does, without making the flex
       canvas itself taller than the viewport on desktop. */
    inner.style.inset = '0 auto auto 0';
    inner.style.width = '100%';
    inner.style.height = contentHeight + 'px';
  }
  if (canvas) canvas.style.minHeight = window.innerWidth <= 768 ? contentHeight + 'px' : '0px';
}

function coRenderStepList(records) {
  const list = document.getElementById('co-step-list');
  if (!list) return;
  const activeIndex = coCurrentIndex(records);
  list.innerHTML = '';
  records.forEach((record, index) => {
    const type = coCardType(record);
    const meta = CO_STEP_META[type] || ['step_' + type, 'desc_' + type];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'co-step-button';
    button.dataset.coStep = String(index);
    button.dataset.active = String(index === activeIndex);
    button.dataset.done = String(coCardStatus(record) === 'done');
    button.setAttribute('role', 'listitem');
    button.innerHTML = '<span class="co-step-number">' + (index + 1) + '</span><span class="co-step-title"></span>';
    button.querySelector('.co-step-title').textContent = coText(meta[0]);
    button.addEventListener('click', () => coSetActive(record.id, true));
    list.appendChild(button);
  });
  const progress = document.getElementById('co-progress-fill');
  const label = document.getElementById('co-progress-label');
  const doneCount = records.filter(record => coCardStatus(record) === 'done').length;
  const pct = records.length ? Math.round((doneCount / records.length) * 100) : 0;
  if (progress) progress.style.width = pct + '%';
  if (label) label.textContent = records.length ? doneCount + ' / ' + records.length : '0 / 0';
  const track = document.getElementById('co-progress-track');
  if (track) track.setAttribute('aria-valuenow', String(pct));
  const current = records[activeIndex];
  const copy = document.getElementById('co-current-copy');
  if (copy) {
    const metaCurrent = current && (CO_STEP_META[coCardType(current)] || []);
    copy.textContent = current && metaCurrent.length ? coText(metaCurrent[1]) : (coLang() === 'pl' ? 'Dodaj blok, aby rozpocząć.' : 'Add a block to begin.');
  }
  const prev = document.getElementById('co-guided-prev');
  const next = document.getElementById('co-guided-next');
  if (prev) prev.disabled = activeIndex <= 0;
  if (next) next.disabled = activeIndex < 0 || activeIndex >= records.length - 1;
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
    coSaveNewFreePosition(card);
    coEnsureCardControls(card, type);
  });
  if (records.length && !CO_STATE.activeId) CO_STATE.activeId = records[0].id;
  const activeIndex = coCurrentIndex(records);
  records.forEach((record, index) => {
    const card = record.card || document.getElementById(record.id);
    if (!card) return;
    card.dataset.active = String(index === activeIndex);
    coUpdateCardControl(card);
  });
  if (CO_STATE.view === 'guided') coLayoutGuided(records);
  else coPositionCardsFree();
  coUpdateToggleAllButton(records);
  /* app.js numbers badges by its historical rank (save before evaluate).
     The alternative lesson presents the hold-out check first, so keep the
     visible step numbers aligned with the guided lane. */
  coUpdateOrderBadges(records);
  coRenderStepList(records);
  CO_STATE.view = document.body.dataset.view || CO_STATE.view;
  CO_STATE.libraryOpen = document.body.dataset.libraryOpen === 'true';
  CO_STATE.logOpen = document.body.dataset.logOpen === 'true';
}

function coSetView(view) {
  const nextView = view === 'free' ? 'free' : 'guided';
  if (nextView === CO_STATE.view) return;
  if (nextView === 'guided') {
    /* Capture the live free-canvas coordinates, not only the initial
       snapshot. A user may have moved a card by dragging or an integration
       may have updated b.x/b.y while the free view was open. */
    coFreePositionSnapshot(true);
    document.body.dataset.view = 'guided';
    CO_STATE.view = 'guided';
    coSyncCards();
  } else {
    /* Guided mode temporarily changes the visible collapse classes. Do
       not write those presentation classes back into the free-canvas
       snapshot: returning to free must restore the learner's own state. */
    document.body.dataset.view = 'free';
    CO_STATE.view = 'free';
    const canvas = document.getElementById('canvas');
    if (canvas) canvas.style.minHeight = window.innerWidth <= 768 ? '' : '0px';
    const inner = document.getElementById('canvas-inner');
    if (inner) {
      inner.style.inset = '';
      inner.style.width = '';
      inner.style.height = '';
    }
    coPositionCardsFree();
    coSyncCards();
  }
  const button = document.getElementById('co-view-toggle');
  if (button) {
    button.dataset.view = nextView;
    button.setAttribute('aria-pressed', String(nextView === 'free'));
    button.textContent = coLang() === 'pl' ? (nextView === 'guided' ? 'Canvas swobodny' : 'Widok prowadzony') : (nextView === 'guided' ? 'Free canvas' : 'Guided view');
  }
  const context = document.getElementById('co-topbar-context');
  if (context) context.textContent = coText(nextView === 'guided' ? 'context_guided' : 'context_free');
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

function coToggleLog(open) {
  const next = open === undefined ? document.body.dataset.logOpen !== 'true' : !!open;
  document.body.dataset.logOpen = String(next);
  CO_STATE.logOpen = next;
  const summaryButton = document.getElementById('co-log-toggle');
  const openButton = document.getElementById('co-log-toggle-open');
  if (summaryButton) {
    summaryButton.setAttribute('aria-expanded', String(next));
    summaryButton.setAttribute('aria-label', next ? coText('log_close') : coText('log_open'));
  }
  if (openButton) openButton.setAttribute('aria-label', coText('log_close'));
  if (next) {
    const entries = document.getElementById('log-entries');
    if (entries) entries.scrollTop = entries.scrollHeight;
  }
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

/* The button reflects the cards: it offers to collapse while any card is
   open and to expand once every card is folded. */
function coUpdateToggleAllButton(records) {
  const button = document.getElementById('co-expand-all');
  if (!button) return;
  const anyOpen = records.some(record => !(record.card || document.getElementById(record.id))?.classList.contains('collapsed'));
  button.setAttribute('aria-pressed', String(!anyOpen));
  button.textContent = coText(anyOpen ? 'collapse_all' : 'expand_all');
}

function coToggleAll() {
  const records = coRecords();
  const anyOpen = records.some(record => !(record.card || document.getElementById(record.id))?.classList.contains('collapsed'));
  records.forEach(record => CO_STATE.manualCollapse.set(record.id, anyOpen));
  coSyncCards();
}

function coMoveActive(delta) {
  const records = coRecords();
  const index = coCurrentIndex(records);
  const next = Math.max(0, Math.min(records.length - 1, index + delta));
  if (records[next]) coSetActive(records[next].id, true);
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
       layout should show the guided header again rather than a blank
       middle section. */
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

function coUpdateLogSummary() {
  const entries = Array.from(document.querySelectorAll('#log-entries .log-line'));
  const latestLine = entries.length ? entries[entries.length - 1] : null;
  const latestText = latestLine ? latestLine.textContent.trim() : coText('log_summary_ready');
  const latestErrorLine = [...entries].reverse().find(el => el.classList.contains('ll-error'));
  const latestErrorText = latestErrorLine ? latestErrorLine.textContent.trim() : '';
  const latest = latestErrorText && latestErrorLine !== latestLine
    ? coText('log_error_prefix') + latestErrorText + ' · ' + latestText
    : latestText;
  const errors = entries.filter(el => el.classList.contains('ll-error')).length;
  CO_STATE.latestLog = latest;
  CO_STATE.logErrors = errors;
  const latestEl = document.getElementById('co-log-latest');
  const errorEl = document.getElementById('co-log-error-count');
  if (latestEl) latestEl.textContent = latest;
  if (errorEl) {
    errorEl.textContent = String(errors);
    errorEl.setAttribute('aria-label', String(errors) + ' ' + (coLang() === 'pl' ? 'błędów' : 'errors'));
  }
}

function coOpenGuide() {
  if (typeof CO_NATIVE_SHOW_GUIDE === 'function') CO_NATIVE_SHOW_GUIDE();
}

function coQuickStartTraining() {
  const types = ['camera-input', 'label-classes', 'prepare-data', 'pretrained-model', 'train-model', 'evaluate', 'save-model'];
  const present = new Set(coRecords().map(record => coCardType(record)));
  types.forEach((type, index) => { if (!present.has(type)) window.placeBlock(type, 16 + index * 296, 40); });
  try { log('step', t('log_qs_train')); } catch (_) { /* app may still be loading */ }
  CO_STATE.activeId = null;
  coSyncCards();
}

function coQuickStartInference() {
  const types = ['upload-model', 'camera-infer', 'show-results'];
  const present = new Set(coRecords().map(record => coCardType(record)));
  types.forEach((type, index) => { if (!present.has(type)) window.placeBlock(type, 16 + index * 296, 40); });
  try { log('step', t('log_qs_infer')); } catch (_) { /* app may still be loading */ }
  CO_STATE.activeId = null;
  coSyncCards();
}

/* ─── Wrappers around app.js, installed before its DOMContentLoaded hook ─── */
const CO_NATIVE_PLACE_BLOCK = window.placeBlock;
const CO_NATIVE_REMOVE_BLOCK = window.removeBlock;
const CO_NATIVE_CLEAR_CANVAS = window.clearCanvas;
const CO_NATIVE_TOGGLE_COLLAPSE = window.toggleCollapse;
const CO_NATIVE_CARD_DRAG_START = window.cardDragStart;
const CO_NATIVE_APPLY_LANG = window.applyLang;
const CO_NATIVE_LOG = window.log;
const CO_NATIVE_CLEAR_LOG = window.clearLog;
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
      coSaveNewFreePosition(card);
    }
    coSyncCards();
    return id;
  };
}

if (typeof CO_NATIVE_REMOVE_BLOCK === 'function') {
  window.removeBlock = function (id) {
    const result = CO_NATIVE_REMOVE_BLOCK(id);
    if (CO_STATE.activeId === id) CO_STATE.activeId = null;
    CO_STATE.freePositions.delete(id);
    CO_STATE.freeWidths.delete(id);
    CO_STATE.freeCollapse.delete(id);
    CO_STATE.manualCollapse.delete(id);
    coSyncCards();
    return result;
  };
}

if (typeof CO_NATIVE_CLEAR_CANVAS === 'function') {
  window.clearCanvas = async function () {
    const result = await CO_NATIVE_CLEAR_CANVAS();
    /* uiConfirm returns without mutating placedBlocks when Cancel is
       chosen. Only discard shell snapshots after the native canvas is
       genuinely empty; a cancelled clear must be a no-op for view state. */
    const canvasEmpty = Array.isArray(placedBlocks)
      ? placedBlocks.length === 0
      : document.querySelectorAll('.block-card').length === 0;
    if (canvasEmpty) {
      CO_STATE.activeId = null;
      CO_STATE.freePositions.clear();
      CO_STATE.freeWidths.clear();
      CO_STATE.freeCollapse.clear();
      CO_STATE.manualCollapse.clear();
    }
    coSyncCards();
    return result;
  };
}

if (typeof CO_NATIVE_TOGGLE_COLLAPSE === 'function') {
  window.toggleCollapse = function (id) {
    const result = CO_NATIVE_TOGGLE_COLLAPSE(id);
    const card = document.getElementById(id);
    if (card) {
      if (CO_STATE.view === 'free') CO_STATE.freeCollapse.set(id, card.classList.contains('collapsed'));
      coUpdateCardControl(card);
    }
    return result;
  };
}

if (typeof CO_NATIVE_CARD_DRAG_START === 'function') {
  window.cardDragStart = function (event, id) {
    if (CO_STATE.view === 'guided') {
      event.preventDefault();
      return;
    }
    return CO_NATIVE_CARD_DRAG_START(event, id);
  };
}

if (typeof CO_NATIVE_APPLY_LANG === 'function') {
  window.applyLang = function () {
    const snapshot = coCaptureValues();
    const result = CO_NATIVE_APPLY_LANG();
    /* app.js rebuilds idle bodies. Recreate this shell's settings
       disclosures before restoring their open state and field values. */
    coSyncCards();
    snapshot.cards.forEach(item => CO_STATE.manualCollapse.set(item.id, item.collapsed));
    coRestoreValues(snapshot);
    coApplyLanguage();
    window.PREDICTION_UI?.refreshAll();
    window.XAI_UI?.refreshAll();
    coSyncCards();
    return result;
  };
}

if (typeof CO_NATIVE_LOG === 'function') {
  window.log = function (type, message) {
    const result = CO_NATIVE_LOG(type, message);
    coUpdateLogSummary();
    return result;
  };
}

if (typeof CO_NATIVE_CLEAR_LOG === 'function') {
  window.clearLog = function () {
    const result = CO_NATIVE_CLEAR_LOG();
    coUpdateLogSummary();
    return result;
  };
}

if (typeof CO_NATIVE_SET_STATUS === 'function') {
  window.setBlockStatus = function (card, status) {
    if (card && (status === 'running' || status === 'error')) {
      CO_STATE.activeId = card.id;
      /* A failure or an in-flight step must remain visible even when the
         learner previously collapsed that card manually. */
      CO_STATE.manualCollapse.set(card.id, false);
    }
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
    if (CO_STATE.view === 'free') {
      coFreePositionSnapshot();
      document.querySelectorAll('.block-card').forEach(card => {
        CO_STATE.freePositions.set(card.id, { left: card.style.left, top: card.style.top });
      });
    }
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
  const context = document.getElementById('co-topbar-context');
  if (context) context.textContent = coText(CO_STATE.view === 'guided' ? 'context_guided' : 'context_free');
  document.getElementById('sidebar')?.setAttribute('aria-label', coLang() === 'pl' ? 'Biblioteka bloków' : 'Block library');
  document.getElementById('canvas')?.setAttribute('aria-label', coLang() === 'pl' ? 'Obszar roboczy' : 'Workspace');
  document.getElementById('flowbar')?.setAttribute('aria-label', coLang() === 'pl' ? 'Pipeline' : 'Pipeline');
  document.getElementById('co-step-list')?.setAttribute('aria-label', coLang() === 'pl' ? 'Kroki pipeline' : 'Pipeline steps');
  document.getElementById('log-panel')?.setAttribute('aria-label', coLang() === 'pl' ? 'Dziennik pipeline' : 'Pipeline log');
  const button = document.getElementById('co-view-toggle');
  if (button) {
    button.textContent = coLang() === 'pl' ? (CO_STATE.view === 'guided' ? 'Canvas swobodny' : 'Widok prowadzony') : (CO_STATE.view === 'guided' ? 'Free canvas' : 'Guided view');
  }
  const logToggle = document.getElementById('co-log-toggle');
  const logToggleOpen = document.getElementById('co-log-toggle-open');
  if (logToggle) {
    logToggle.setAttribute('aria-expanded', String(CO_STATE.logOpen));
    logToggle.setAttribute('aria-label', coText(CO_STATE.logOpen ? 'log_close' : 'log_open'));
  }
  if (logToggleOpen) logToggleOpen.setAttribute('aria-label', coText('log_close'));
  const errorCount = document.getElementById('co-log-error-count');
  if (errorCount) errorCount.setAttribute('aria-label', String(CO_STATE.logErrors) + ' ' + (coLang() === 'pl' ? 'błędów' : 'errors'));
  document.title = coLang() === 'pl' ? 'KlockiAI - widok prowadzony' : 'KlockiAI - guided view';
  coUpdateLogSummary();
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
  CO_STATE.view = document.body.dataset.view === 'free' ? 'free' : 'guided';
  CO_STATE.libraryOpen = document.body.dataset.libraryOpen !== 'false';
  CO_STATE.logOpen = document.body.dataset.logOpen === 'true';
  /* On a narrow first view, put the learner's current task before the
     catalogue. The library remains one tap away and is never collapsed
     again by a resize or by this shell. */
  if (window.innerWidth <= 768 && CO_STATE.libraryOpen) {
    document.body.dataset.libraryOpen = 'false';
    CO_STATE.libraryOpen = false;
  }
  document.getElementById('co-library-toggle')?.setAttribute('aria-expanded', String(CO_STATE.libraryOpen));
  coInitTerminalResize();
  const viewButton = document.getElementById('co-view-toggle');
  if (viewButton) {
    viewButton.addEventListener('click', () => coSetView(CO_STATE.view === 'guided' ? 'free' : 'guided'));
    viewButton.dataset.view = CO_STATE.view;
    viewButton.setAttribute('aria-pressed', String(CO_STATE.view === 'free'));
  }
  document.getElementById('co-library-toggle')?.addEventListener('click', coToggleLibrary);
  document.getElementById('co-log-toggle')?.addEventListener('click', () => coToggleLog());
  document.getElementById('co-log-toggle-open')?.addEventListener('click', () => coToggleLog(false));
  document.getElementById('co-expand-all')?.addEventListener('click', coToggleAll);
  document.getElementById('co-guided-prev')?.addEventListener('click', () => coMoveActive(-1));
  document.getElementById('co-guided-next')?.addEventListener('click', () => coMoveActive(1));
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
    const card = event.target.closest && event.target.closest('.block-card');
    if (card && CO_STATE.view === 'guided' && !event.target.closest('button, input, select, textarea, summary, a')) coSetActive(card.id, false);
  });
  document.addEventListener('input', event => {
    if (event.target.closest && event.target.closest('.block-card')) coSyncCards();
  });
  document.addEventListener('change', event => {
    if (event.target.closest && event.target.closest('.block-card')) coSyncCards();
  });
  /* Guided cards are absolutely positioned only to keep the existing
     canvas engine untouched. Reflow after viewport changes and native
     <details> toggles so the next compact card never overlaps a newly
     expanded body. */
  window.addEventListener('resize', coHandleResize, { passive: true });
  document.addEventListener('toggle', event => {
    if (event.target.matches && event.target.matches('details.co-settings-details')) coScheduleSync();
  }, true);
  const logEntries = document.getElementById('log-entries');
  if (logEntries) {
    const observer = new MutationObserver(() => coUpdateLogSummary());
    observer.observe(logEntries, { childList: true });
  }
  const canvas = document.getElementById('canvas');
  if (canvas) {
    const observer = new MutationObserver(records => {
      if (records.some(record => Array.from(record.addedNodes).some(node => node.nodeType === 1 && (node.matches?.('.block-card') || node.querySelector?.('.block-card'))))) coSyncCards();
    });
    observer.observe(canvas, { childList: true, subtree: true });
  }
  coApplyLanguage();
  coSyncCards();
  coUpdateLogSummary();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', coInitialise, { once: true });
else coInitialise();
