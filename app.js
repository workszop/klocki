// ===== CONSTANTS =====
const SCHEMA_VERSION = "v1";
const CLASS_COLORS = ['#0369A1', '#7C3AED', '#D97706', '#DC2626', '#059669', '#DB2777'];
const MODEL_URL = 'https://www.kaggle.com/models/google/mobilenet-v3/frameworks/tfJs/variations/small-100-224-feature-vector/versions/1/model.json?tfjs-format=file';

// ===== BUNDLE HELPERS =====
// Chunked encoding — avoids O(n²) string concat for multi-MB weight buffers.
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // 32 KB — safe limit for String.fromCharCode.apply
  const parts = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
  }
  return btoa(parts.join(''));
}
function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
// Normalize weightData to a plain ArrayBuffer.
// TF.js may deliver ArrayBuffer, ArrayBuffer[] (multiple shards), or CompositeArrayBuffer.
function normalizeWeightData(wd) {
  if (Array.isArray(wd)) {
    const total = wd.reduce((s, b) => s + b.byteLength, 0);
    const merged = new Uint8Array(total);
    let off = 0;
    for (const buf of wd) { merged.set(new Uint8Array(buf), off); off += buf.byteLength; }
    return merged.buffer;
  }
  if (wd instanceof ArrayBuffer) return wd;
  // CompositeArrayBuffer or typed-array view — copy to plain ArrayBuffer
  if (typeof wd.slice === 'function') return wd.slice(0);
  return new Uint8Array(wd).buffer;
}
// Capture a model's artifacts via a custom IOHandler (works for both LayersModel and GraphModel).
async function captureArtifacts(model) {
  let a = null;
  await model.save({ save: async (artifacts) => { a = artifacts; return { modelArtifactsInfo: { dateSaved: new Date() } }; } });
  const wd = normalizeWeightData(a.weightData);
  return { modelTopology: a.modelTopology, weightSpecs: a.weightSpecs, weightData: arrayBufferToBase64(wd), format: a.format };
}

// ===== i18n STRINGS =====
const STRINGS = {
  pl: {
    phase_data: 'Dane', phase_label: 'Etykiety', phase_prep: 'Przygotowanie',
    phase_model: 'Model', phase_train: 'Trening', phase_deploy: 'Zapis', phase_infer: 'Predykcja', phase_xai: 'Wyjaśnialne AI',
    btn_guide: 'Przewodnik', btn_clear: 'Wyczyść', btn_run: 'Uruchom',
    sidebar_training: 'Trening', sidebar_inference: 'Predykcja',
    block_camera_input: 'Kamera: Dane', block_label_classes: 'Etykiety klas',
    block_prepare_data: 'Dane', block_pretrained_model: 'Model bazowy',
    block_train_model: 'Trenuj model', block_save_model: 'Zapisz model',
    block_upload_model: 'Wczytaj model', block_camera_infer: 'Kamera: Predykcja',
    block_predict: 'Predykcja', block_show_results: 'Pokaż wyniki',
    block_zero_shot: 'Model bazowy / Predykcja', block_explain_ai: 'Explainable AI', block_model_explorer: 'Eksplorator modelu',
    log_title: 'Pipeline Log',
    guide_title: 'Przewodnik — KlockiAI', guide_subtitle: 'Jak zbudować swój pierwszy model AI w przeglądarce',
    guide_close: 'OK', guide_dontshow: 'Nie pokazuj ponownie',
    status_idle: 'Oczekuje', status_running: 'Działa', status_done: 'Gotowe', status_error: 'Błąd',
    btn_start_camera: 'Uruchom kamerę', btn_stop_camera: 'Zatrzymaj',
    btn_capture: 'Zrób zdjęcie', btn_capture_hold: 'Zbierz próbki',
    param_resolution: 'Rozdzielczość', param_samples: 'Próbek/klasę',
    param_augment: 'Augmentacja', param_multiplier: 'Mnożnik', param_augment_none: 'Brak',
    param_epochs: 'Epoki', param_lr: 'Learning rate', param_batch: 'Batch size',
    param_freeze: 'Zamroź warstwy', param_fps: 'FPS', param_threshold: 'Próg',
    param_fmap: 'Mapa cech',
    btn_load_model: 'Załaduj z CDN', btn_save_idb: 'Zapisz w przeglądarce',
    btn_download: 'Pobierz model', btn_load_idb: 'Wczytaj z przeglądarki',
    btn_pick_files: 'Wybierz plik (.json)', param_model_name: 'Nazwa modelu', lbl_no_saved_models: 'Brak zapisanych modeli',
    btn_train: 'Trenuj', btn_stop_train: 'Zatrzymaj',
    btn_freeze_frame: 'Zamroź klatkę', btn_run_xai: 'Analizuj (Zamroź kadr)',
    lbl_class: 'Klasa', lbl_samples: 'próbek', lbl_accuracy: 'Dokładność',
    lbl_no_model: 'Brak modelu — najpierw wczytaj lub załaduj',
    lbl_classes: 'Klasy', lbl_timestamp: 'Data treningu',
    log_camera_start: 'Kamera uruchomiona', log_camera_err: 'Błąd kamery: ',
    log_capture: (n, cls) => `Zebrano ${n} próbkę(i) dla klasy "${cls}"`,
    log_prep_start: 'Rozpoczynam przygotowanie danych...',
    log_prep_aug: (n) => `Augmentacja: wygenerowano ${n} dodatkowych próbek`,
    log_prep_done: (n) => `Przygotowanie zakończone — łącznie ${n} próbek`,
    log_model_loading: 'Ładowanie MobileNetV3-Small...',
    log_model_loaded: 'Model bazowy załadowany ✓',
    log_model_err: 'Błąd ładowania modelu: ',
    log_train_start: (e) => `Trening — ${e} epok`,
    log_train_epoch: (e, l, a) => `Epoka ${e}: strata=${l.toFixed(4)}, dokł.=${(a * 100).toFixed(1)}%`,
    log_train_done: (a) => `Trening zakończony — dokładność ${(a * 100).toFixed(1)}%`,
    log_train_cancel: 'Trening przerwany przez użytkownika',
    log_save_idb: 'Model zapisany w IndexedDB ✓',
    log_download: 'Pobieranie plików modelu...',
    log_upload_start: 'Wczytywanie modelu z pliku...',
    log_upload_done: (cls) => `Model załadowany — klasy: ${cls}`,
    log_upload_warn: 'Ostrzeżenie: inna wersja schematu. Model może działać niepoprawnie.',
    log_infer_start: 'Predykcja uruchomiona',
    log_infer_result: (cls, pct) => `→ ${cls}: ${(pct * 100).toFixed(1)}%`,
    log_no_data: 'Brak danych! Najpierw zbierz próbki.',
    log_no_model_base: 'Brak modelu bazowego! Załaduj go najpierw.',
    log_no_infer_model: 'Brak modelu do predykcji!',
    warn_version: 'Niezgodna wersja schematu modelu. Kontynuuj z ostrożnością.',
    guide_steps: [
      { title: 'Krok 1 — Kamera', desc: 'Dodaj blok "Kamera — Dane" na tablicę. Uruchom kamerę i zbieraj zdjęcia dla każdej klasy, klikając "Zbierz próbki".' },
      { title: 'Krok 2 — Etykiety', desc: 'Dodaj blok "Etykiety klas" i nazwij swoje kategorie, np. "Pies", "Kot", "Inne". Wybierz aktywną klasę przed zbieraniem.' },
      { title: 'Krok 3 — Przygotowanie danych', desc: 'Blok "Przygotuj dane" zmieni rozmiar zdjęć i opcjonalnie wygeneruje więcej próbek przez augmentację (obrócenie, jasność).' },
      { title: 'Krok 4 — Model bazowy', desc: 'Blok "Model bazowy" pobierze MobileNetV3-Small z sieci (~3MB). Ten model "widział" miliony zdjęć i rozumie cechy wizualne.' },
      { title: 'Krok 5 — Trening', desc: 'Blok "Trenuj model" dostosuje model do Twoich klas. Obserwuj wykres straty i dokładności w czasie rzeczywistym!' },
      { title: 'Krok 6: Predykcja', desc: 'Po treningu użyj bloków predykcji: wczytaj model, uruchom kamerę i obserwuj predykcje na żywo.' },
    ]
  },
  en: {
    phase_data: 'Data', phase_label: 'Labels', phase_prep: 'Prepare',
    phase_model: 'Model', phase_train: 'Train', phase_deploy: 'Save', phase_infer: 'Prediction', phase_xai: 'Explainable AI',
    btn_guide: 'Guide', btn_clear: 'Clear', btn_run: 'Run',
    sidebar_training: 'Training', sidebar_inference: 'Prediction',
    block_camera_input: 'Camera: Input', block_label_classes: 'Label Classes',
    block_prepare_data: 'Data', block_pretrained_model: 'Pretrained Model',
    block_train_model: 'Train Model', block_save_model: 'Save Model',
    block_upload_model: 'Load Model', block_camera_infer: 'Camera: Prediction',
    block_predict: 'Predict', block_show_results: 'Show Results',
    block_zero_shot: 'Base Model / Predict', block_explain_ai: 'Explainable AI', block_model_explorer: 'Model Explorer',
    log_title: 'Pipeline Log',
    guide_title: 'Guide — KlockiAI', guide_subtitle: 'How to build your first AI model in the browser',
    guide_close: 'OK', guide_dontshow: 'Do not show again',
    status_idle: 'Idle', status_running: 'Running', status_done: 'Done', status_error: 'Error',
    btn_start_camera: 'Start Camera', btn_stop_camera: 'Stop',
    btn_capture: 'Capture', btn_capture_hold: 'Collect Samples',
    param_resolution: 'Resolution', param_samples: 'Samples/class',
    param_augment: 'Augmentation', param_multiplier: 'Multiplier', param_augment_none: 'None',
    param_epochs: 'Epochs', param_lr: 'Learning rate', param_batch: 'Batch size',
    param_freeze: 'Freeze layers', param_fps: 'FPS', param_threshold: 'Threshold',
    param_fmap: 'Feature Maps',
    btn_load_model: 'Load from CDN', btn_save_idb: 'Save to Browser',
    btn_download: 'Download model', btn_load_idb: 'Load from Browser',
    btn_pick_files: 'Pick file (.json)', param_model_name: 'Model name', lbl_no_saved_models: 'No saved models',
    btn_train: 'Train', btn_stop_train: 'Stop',
    btn_freeze_frame: 'Freeze Frame', btn_run_xai: 'Analyze (Freeze frame)',
    lbl_class: 'Class', lbl_samples: 'samples', lbl_accuracy: 'Accuracy',
    lbl_no_model: 'No model — load or train one first',
    lbl_classes: 'Classes', lbl_timestamp: 'Trained on',
    log_camera_start: 'Camera started', log_camera_err: 'Camera error: ',
    log_capture: (n, cls) => `Captured ${n} sample(s) for class "${cls}"`,
    log_prep_start: 'Starting data preparation...',
    log_prep_aug: (n) => `Augmentation: generated ${n} additional samples`,
    log_prep_done: (n) => `Data ready — ${n} total samples`,
    log_model_loading: 'Loading MobileNetV3-Small...',
    log_model_loaded: 'Base model loaded ✓',
    log_model_err: 'Model load error: ',
    log_train_start: (e) => `Training — ${e} epochs`,
    log_train_epoch: (e, l, a) => `Epoch ${e}: loss=${l.toFixed(4)}, acc=${(a * 100).toFixed(1)}%`,
    log_train_done: (a) => `Training complete — accuracy ${(a * 100).toFixed(1)}%`,
    log_train_cancel: 'Training cancelled',
    log_save_idb: 'Model saved to IndexedDB ✓',
    log_download: 'Downloading model files...',
    log_upload_start: 'Loading model from file...',
    log_upload_done: (cls) => `Model loaded — classes: ${cls}`,
    log_upload_warn: 'Warning: schema version mismatch. Model may behave unexpectedly.',
    log_infer_start: 'Prediction started',
    log_infer_result: (cls, pct) => `→ ${cls}: ${(pct * 100).toFixed(1)}%`,
    log_no_data: 'No data! Collect samples first.',
    log_no_model_base: 'No base model! Load it first.',
    log_no_infer_model: 'No model for prediction!',
    warn_version: 'Incompatible schema version. Proceed with caution.',
    guide_steps: [
      { title: 'Step 1 — Camera', desc: 'Add the "Camera — Input" block to the canvas. Start the camera and collect images for each class by clicking "Collect Samples".' },
      { title: 'Step 2 — Labels', desc: 'Add the "Label Classes" block and name your categories, e.g. "Dog", "Cat", "Other". Select the active class before collecting.' },
      { title: 'Step 3 — Prepare Data', desc: 'The "Prepare Data" block resizes images and can generate more samples through augmentation (flips, rotations, brightness).' },
      { title: 'Step 4 — Base Model', desc: 'The "Pretrained Model" block downloads MobileNetV3-Small (~3MB). It has seen millions of images and understands visual features.' },
      { title: 'Step 5 — Training', desc: 'The "Train Model" block fine-tunes the model for your classes. Watch the loss and accuracy chart update in real time!' },
      { title: 'Step 6: Prediction', desc: 'After training, use the prediction blocks: load the model, start the camera, and watch live predictions.' },
    ]
  }
};

// ===== STATE =====
let lang = localStorage.getItem('ml-blocks-lang') || 'pl';
let S = STRINGS[lang];
let placedBlocks = [];
let blockIdCounter = 0;
let draggedPaletteType = null;
let dragOffsetX = 0, dragOffsetY = 0;
let draggedCard = null;

// Training state
let classNames = ['Klasa 1', 'Klasa 2'];
let classColors = CLASS_COLORS.slice(0, 2);
let capturedSamples = [[], []]; // per class, array of ImageData — dynamic
let preparedData = null; // {xs, ys}
let baseModel = null;
let fullModel = null;
let trainingCancelled = false;
let modelMetadata = null;
let inferModel = null;
let inferMetadata = null;
let inferInterval = null;
const EDU_MODE = new URLSearchParams(location.search).get('edu') === '1';

// ===== i18n ENGINE =====
function t(key, ...args) {
  const val = S[key];
  if (typeof val === 'function') return val(...args);
  return val || key;
}
function applyLang() {
  S = STRINGS[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    const val = S[k];
    if (val) el.textContent = val;
  });
  document.getElementById('btn-lang').textContent = lang === 'pl' ? 'EN' : 'PL';
  // Re-render dynamic block content
  placedBlocks.forEach(b => {
    if (b.card) refreshBlockText(b);
  });
}
function toggleLang() {
  lang = lang === 'pl' ? 'en' : 'pl';
  localStorage.setItem('ml-blocks-lang', lang);
  applyLang();
}



// ============================================================

// ===== LOG PANEL =====
function log(type, msg) {
  const el = document.createElement('div');
  el.className = `log-line ll-${type}`;
  const ts = new Date().toLocaleTimeString('pl', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  el.textContent = `[${ts}] ${msg}`;
  const entries = document.getElementById('log-entries');
  entries.appendChild(el);
  entries.scrollTop = entries.scrollHeight;
}
function clearLog() { document.getElementById('log-entries').innerHTML = ''; }

// ===== DRAG & DROP — PALETTE =====
function paletteDragStart(e) {
  draggedPaletteType = e.currentTarget.dataset.type;
  e.dataTransfer.effectAllowed = 'copy';
}
function canvasDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = draggedPaletteType ? 'copy' : 'move';
}
function canvasDrop(e) {
  e.preventDefault();
  const canvas = document.getElementById('canvas');
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left - (draggedPaletteType ? 140 : dragOffsetX);
  const y = e.clientY - rect.top - (draggedPaletteType ? 30 : dragOffsetY);
  if (draggedPaletteType) {
    placeBlock(draggedPaletteType, Math.max(8, x), Math.max(8, y));
    draggedPaletteType = null;
  }
}

// ===== BLOCK STATUS =====
function setBlockStatus(card, status) {
  card.className = card.className.replace(/status-\w+/, '') + ` status-${status}`;
  const chip = card.querySelector('.bk-status');
  if (chip) {
    const key = `status_${status}`;
    chip.textContent = t(key);
  }
}

// ===== BLOCK CARD HELPERS =====
function makeParam(label, content) {
  return `<div class="param-row"><span class="param-label">${label}</span>${content}</div>`;
}
function makeBtn(txt, onclick, color) {
  return `<button class="bk-btn" style="background:${color}" onclick="${onclick}">${txt}</button>`;
}

// ===== BLOCK FACTORY =====
function buildBlockHTML(type, id) {
  const phaseColors = {
    'camera-input': 'var(--c-data)', 'label-classes': 'var(--c-label)',
    'prepare-data': 'var(--c-prep)', 'pretrained-model': 'var(--c-model)',
    'train-model': 'var(--c-train)', 'save-model': 'var(--c-deploy)',
    'upload-model': 'var(--c-data)', 'camera-infer': 'var(--c-data)',
    'predict': 'var(--c-deploy)',
    'show-results': 'var(--c-eval)', 'zero-shot': 'var(--c-model)',
    'explain-ai': 'var(--c-eval)', 'model-explorer': 'var(--c-eval)'
  };
  const phases = {
    'camera-input': 'DATA', 'label-classes': 'LABEL', 'prepare-data': 'PREP',
    'pretrained-model': 'MODEL', 'train-model': 'TRAIN', 'save-model': 'DEPLOY',
    'upload-model': 'DATA', 'camera-infer': 'DATA',
    'predict': 'PRED', 'show-results': 'EVAL', 'zero-shot': 'PRED',
    'explain-ai': 'EVAL', 'model-explorer': 'EVAL'
  };
  const titles = {
    'camera-input': t('block_camera_input'), 'label-classes': t('block_label_classes'),
    'prepare-data': t('block_prepare_data'), 'pretrained-model': t('block_pretrained_model'),
    'train-model': t('block_train_model'), 'save-model': t('block_save_model'),
    'upload-model': t('block_upload_model'), 'camera-infer': t('block_camera_infer'),
    'predict': t('block_predict'), 'show-results': t('block_show_results'), 'zero-shot': t('block_zero_shot'),
    'explain-ai': t('block_explain_ai'), 'model-explorer': t('block_model_explorer')
  };
  const bg = phaseColors[type] || '#64748B';
  const phase = phases[type] || '';
  const title = titles[type] || type;

  let body = '';
  switch (type) {
    case 'camera-input': body = buildCameraInputBody(id); break;
    case 'label-classes': body = buildLabelClassesBody(id); break;
    case 'prepare-data': body = buildPrepareDataBody(id); break;
    case 'pretrained-model': body = buildPretrainedModelBody(id); break;
    case 'train-model': body = buildTrainModelBody(id); break;
    case 'save-model': body = buildSaveModelBody(id); break;
    case 'upload-model': body = buildUploadModelBody(id); break;
    case 'camera-infer': body = buildCameraInferBody(id); break;
    case 'predict': body = buildPredictBody(id); break;
    case 'show-results': body = buildShowResultsBody(id); break;
    case 'zero-shot': body = buildZeroShotBody(id); break;
    case 'explain-ai': body = buildExplainAIBody(id); break;
    case 'model-explorer': body = buildModelExplorerBody(id); break;
  }

  return `
<div class="bk-header" style="background:${bg}" onmousedown="cardDragStart(event,'${id}')" ondblclick="toggleCollapse('${id}')">
  <span class="drag-handle">⠸</span>
  <span class="bk-title" data-block-title="${id}">${title}</span>
  <span class="bk-badge">${phase}</span>
  <span class="bk-status">${t('status_idle')}</span>
</div>
<div class="bk-body">${body}</div>
<div class="block-annotation" id="ann-${id}"></div>`;
}

function buildCameraInputBody(id) {
  const classButtons = () => classNames.map((name, i) =>
    `<button class="bk-btn" style="background:${CLASS_COLORS[i]};font-size:10px;padding:4px 8px" onclick="blockCapture('${id}',${i})">${name}</button>`
  ).join('');
  return `
<div class="video-wrap"><video class="bk-video" id="vid-${id}" autoplay playsinline muted style="height:120px;background:#000"></video></div>
${makeParam(t('param_resolution'), `<select id="res-${id}"><option value="224">224\u00d7224</option><option value="128">128\u00d7128</option></select>`)}
${makeParam(t('param_samples'), `<input type="number" id="spc-${id}" value="10" min="1" max="100" style="width:60px">`)}
${makeBtn(t('btn_start_camera'), `blockStartCamera('${id}')`, 'var(--c-data)')}
<div id="capture-btns-${id}" style="display:flex;flex-direction:column;gap:4px;margin-top:4px">${classButtons()}</div>
<button class="bk-btn" style="margin-top:4px;background:#64748B;font-size:11px" onclick="addClass(null)">${lang === 'pl' ? 'Dodaj klas\u0119' : 'Add class'}</button>
<div id="cam-status-${id}" style="font-size:10px;color:var(--c-muted);text-align:center;margin-top:4px">—</div>
<div id="thumbs-${id}" class="thumb-strip"></div>`;
}

function buildLabelClassesBody(id) {
  return renderLabelRows(id);
}

function renderLabelRows(id) {
  let rows = '';
  for (let i = 0; i < classNames.length; i++) {
    const isActive = (window.activeClass === i);
    rows += `<div class="class-row">
<div class="class-color-dot" style="background:${CLASS_COLORS[i]}"></div>
<input class="class-name-input" id="cn-${id}-${i}" value="${classNames[i]}"
  oninput="classNames[${i}]=this.value;updateClassNamesEverywhere()" placeholder="${lang === 'pl' ? 'nazwa klasy...' : 'class name...'}">
<span class="class-count" id="cc-${id}-${i}">${(capturedSamples[i] || []).length} ${t('lbl_samples')}</span>
<button style="flex-shrink:0;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;border:none;cursor:pointer;background:${CLASS_COLORS[i]};color:#fff" onclick="labelCapture(${i})">${lang === 'pl' ? 'zbierz' : 'capture'}</button>
<button class="class-delete-btn" onclick="clearClassSamples(${i})" title="${lang === 'pl' ? 'Usuń próbki' : 'Delete samples'}">✕</button>
</div>
<div id="thumbs-label-${i}-${id}" class="thumb-strip"></div>`;
  }
  rows += `<button class="bk-btn" style="margin-top:6px;background:#64748B;font-size:11px" onclick="addClass('${id}')">${lang === 'pl' ? 'Dodaj klas\u0119' : 'Add class'}</button>`;
  return `<div id="classes-${id}">${rows}</div>`;
}

function labelCapture(classIdx) {
  // Find the first camera-input block and capture for the given class
  const camBlock = placedBlocks.find(b => b.type === 'camera-input');
  if (!camBlock) {
    log('warn', lang === 'pl' ? 'Najpierw dodaj blok Kamera: Dane!' : 'Add Camera: Input block first!');
    return;
  }
  window.activeClass = classIdx;
  blockCapture(camBlock.id, classIdx);
}

function clearClassSamples(classIdx) {
  if (!capturedSamples[classIdx] || capturedSamples[classIdx].length === 0) return;
  capturedSamples[classIdx] = [];
  log('info', lang === 'pl'
    ? `Usunięto próbki klasy "${classNames[classIdx]}"`
    : `Deleted samples for class "${classNames[classIdx]}"`);
  // Refresh all label-classes blocks so counts and thumbnails update
  placedBlocks.filter(b => b.type === 'label-classes').forEach(b => {
    const body = document.getElementById(b.id)?.querySelector('.bk-body');
    if (body) body.innerHTML = renderLabelRows(b.id);
  });
  updateThumbStrips();
}

function setActiveClass(idx, labelBlockId) {
  window.activeClass = idx;
  // Refresh all label blocks so buttons re-render
  placedBlocks.filter(b => b.type === 'label-classes').forEach(b => {
    const body = document.getElementById(b.id)?.querySelector('.bk-body');
    if (body) body.innerHTML = renderLabelRows(b.id);
  });
}

function addClass(labelBlockId) {
  const idx = classNames.length;
  if (idx >= CLASS_COLORS.length) {
    log('warn', lang === 'pl' ? 'Maksymalna liczba klas osi\u0105gni\u0119ta' : 'Maximum class count reached');
    return;
  }
  const name = lang === 'pl' ? `Klasa ${idx + 1}` : `Class ${idx + 1}`;
  classNames.push(name);
  capturedSamples.push([]);
  // Re-render label blocks: specific one if passed, otherwise all
  const labelBlocksToUpdate = labelBlockId
    ? [{ id: labelBlockId }]
    : placedBlocks.filter(b => b.type === 'label-classes');
  labelBlocksToUpdate.forEach(b => {
    const body = document.getElementById(b.id)?.querySelector('.bk-body');
    if (body) body.innerHTML = renderLabelRows(b.id);
  });
  // Update camera capture buttons (rebuild with new class)
  updateClassNamesEverywhere();
  log('info', lang === 'pl' ? `Dodano klas\u0119: ${name}` : `Added class: ${name}`);
}

function buildPrepareDataBody(id) {
  const hint = lang === 'pl'
    ? 'Przeskaluj zebrane zdjęcia do rozmiaru modelu. Opcjonalnie augmentuj dane, aby zwiększyć liczbę próbek.'
    : 'Resize captured images to model input size. Optionally augment to increase sample count.';
  return `
<div style="font-size:12px;color:var(--c-muted);line-height:1.4;padding-bottom:4px">${hint}</div>
${makeParam(t('param_augment'), `<select id="aug-${id}">
  <option value="none" selected>${lang === 'pl' ? 'Tylko przygotowanie' : 'Prepare only'}</option>
  <option value="all">Flip + Rotate + Brightness</option>
</select>`)}
${makeParam(t('param_multiplier'), `<select id="mul-${id}">
  <option value="1">1×</option><option value="2" selected>2×</option><option value="3">3×</option>
</select>`)}
<progress id="prog-${id}" value="0" max="100" style="margin-top:6px"></progress>
<div id="prep-status-${id}" style="font-size:10px;color:var(--c-muted);text-align:center">—</div>
${makeBtn(lang === 'pl' ? 'Przygotuj dane' : 'Prepare data', `runPrepare('${id}')`, 'var(--c-prep)')}`;
}

function buildPretrainedModelBody(id) {
  return `
<progress id="prog-${id}" value="0" max="100"></progress>
<div id="model-status-${id}" style="font-size:10px;color:var(--c-muted);text-align:center">—</div>
${makeBtn(t('btn_load_model'), `runLoadBaseModel('${id}')`, 'var(--c-model)')}`;
}

function buildTrainModelBody(id) {
  return `
${makeParam(t('param_epochs'), `<input type="number" id="ep-${id}" value="15" min="1" max="100" style="width:60px">`)}
${makeParam(t('param_lr'), `<select id="lr-${id}">
  <option value="0.001" selected>0.001</option>
  <option value="0.0001">0.0001</option>
  <option value="0.01">0.01</option>
</select>`)}
${makeParam(t('param_batch'), `<select id="bs-${id}">
  <option value="8">8</option><option value="16" selected>16</option><option value="32">32</option>
</select>`)}
<canvas class="chart-canvas" id="chart-${id}" height="80"></canvas>
<div id="train-info-${id}" style="font-size:10px;color:var(--c-muted);text-align:center">—</div>
<div style="display:flex;gap:6px;margin-top:4px">
${makeBtn(t('btn_train'), `runTraining('${id}')`, 'var(--c-train)')}
${makeBtn(t('btn_stop_train'), `stopTraining('${id}')`, '#64748B')}
</div>`;
}

function buildSaveModelBody(id) {
  return `
${makeParam(t('param_model_name'), `<input type="text" id="model-name-${id}" value="model-1" placeholder="model-1" style="width:90px;font-size:12px">`)}
<div id="save-info-${id}" style="font-size:11px;color:var(--c-muted)">—</div>
${makeBtn(t('btn_save_idb'), `runSaveIDB('${id}')`, 'var(--c-deploy)')}
${makeBtn(t('btn_download'), `runDownload('${id}')`, '#0369A1')}`;
}

function buildUploadModelBody(id) {
  return `
<div class="warn-banner" id="warn-${id}">${t('warn_version')}</div>
<input type="file" id="file-model-${id}" accept=".json,.bin,.weights.bin" multiple style="display:none">
${makeBtn(t('btn_pick_files'), `pickModelFiles('${id}')`, 'var(--c-data)')}
<div style="display:flex;gap:4px;align-items:center;margin-top:2px">
  <select id="idb-select-${id}" style="flex:1;font-size:12px;padding:4px 6px;border-radius:4px;border:1px solid var(--c-border);background:var(--c-bg)">
    <option value="" disabled selected>${t('lbl_no_saved_models')}</option>
  </select>
  <button class="bk-btn" style="background:#64748B;padding:4px 8px;font-size:13px;width:auto" onclick="refreshIDBList('${id}')">↺</button>
</div>
${makeBtn(t('btn_load_idb'), `runLoadIDB('${id}')`, '#64748B')}
<div id="meta-${id}" style="font-size:10px;color:var(--c-muted);margin-top:4px;line-height:1.8">—</div>`;
}

function buildCameraInferBody(id) {
  return `
<div class="video-wrap"><video class="bk-video" id="vid-${id}" autoplay playsinline muted style="height:120px"></video></div>
${makeParam(t('param_fps'), `<select id="fps-${id}"><option value="1000">1</option><option value="200" selected>5</option><option value="100">10</option></select>`)}
${makeBtn(t('btn_start_camera'), `startInferCamera('${id}')`, 'var(--c-data)')}
${makeBtn(t('btn_stop_camera'), `stopInferCamera('${id}')`, '#64748B')}`;
}


function buildZeroShotBody(id) {
  const note = lang === 'pl'
    ? 'Ten model nigdy nie widzia\u0142 Twoich klas: zobaczmy co rozpoznaje samodzielnie!'
    : 'This model has never seen your custom classes: watch what it recognizes on its own!';
  return `
<div style="font-size:10px;color:var(--c-muted);line-height:1.6;padding:4px 0 6px;border-bottom:1px solid var(--c-border);margin-bottom:6px">${note}</div>
<div class="video-wrap"><video class="bk-video" id="zsvid-${id}" autoplay playsinline muted style="height:110px;background:#000"></video></div>
${makeParam('FPS', `<select id="zsfps-${id}"><option value="1000">1</option><option value="200" selected>5</option><option value="100">10</option></select>`)}
<div id="zs-results-${id}" style="margin-top:6px"></div>
<div style="display:flex;gap:6px;margin-top:4px">
${makeBtn(lang === 'pl' ? 'Uruchom' : 'Start', `startZeroShot('${id}')`, 'var(--c-model)')}
${makeBtn(lang === 'pl' ? 'Stop' : 'Stop', `stopZeroShot('${id}')`, '#64748B')}
</div>`;
}


function buildPredictBody(id) {
  return `
${makeParam(t('param_threshold'), `<select id="thr-${id}">
  <option value="0.5">50%</option><option value="0.7" selected>70%</option>
  <option value="0.8">80%</option><option value="0.9">90%</option>
</select>`)}
${makeParam(t('param_fmap'), `<input type="checkbox" id="fmap-${id}">`)}
<div id="fmaps-${id}" class="fmap-container" style="display:none;margin-top:6px"></div>
<div id="pred-bars-${id}" style="margin-top:6px"></div>
<div id="pred-result-${id}" style="font-size:13px;font-weight:700;padding:6px 8px;background:var(--c-bg);border-radius:6px;text-align:center;margin-top:4px;min-height:28px;color:var(--c-muted);font-style:italic">${lang === 'pl' ? 'oczekiwanie na predykcj\u0119...' : 'waiting for prediction...'}</div>`;
}

function buildShowResultsBody(id) {
  return `
<div class="video-wrap" id="show-wrap-${id}">
  <video id="show-vid-${id}" autoplay playsinline muted style="width:100%;border-radius:6px;display:block"></video>
  <canvas id="show-overlay-${id}" class="overlay" style="position:absolute;inset:0;pointer-events:none"></canvas>
</div>
<canvas id="hist-chart-${id}" class="chart-canvas" height="60" style="margin-top:6px"></canvas>
${makeBtn(t('btn_freeze_frame'), `freezeFrame('${id}')`, '#64748B')}`;
}

function buildExplainAIBody(id) {
  return `
<div id="xai-wrap-${id}" style="position:relative; width:224px; height:224px; margin: 0 auto; border-radius:6px; overflow:hidden; background:#000;">
  <canvas id="xai-vid-${id}" style="width:100%; height:100%; display:block;"></canvas>
  <canvas id="xai-overlay-${id}" style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;"></canvas>
</div>
<input type="hidden" id="xai-patch-${id}" value="16">
<div id="xai-result-${id}" style="font-size:13px;font-weight:700;padding:6px 8px;background:var(--c-bg);border-radius:6px;text-align:center;margin-top:6px;min-height:28px;color:var(--c-muted);font-style:italic">Wait...</div>
<div style="margin-top:6px">
${makeBtn(t('btn_run_xai'), `runXAI('${id}')`, 'var(--c-eval)')}
</div>`;
}

function buildModelExplorerBody(id) {
  const desc = lang === 'pl'
    ? 'Eksploruj architektur\u0119 MobileNet V3 Small \u2014 warstwy, mapy cech i inferencj\u0119 na \u017cywo.'
    : 'Explore MobileNet V3 Small \u2014 layers, feature maps and live inference.';
  const btnLabel = lang === 'pl' ? 'Otwórz eksplorator' : 'Open Explorer';
  return '<div style="font-size:11px;color:var(--c-muted);line-height:1.5;padding-bottom:4px">' + desc + '</div>'
    + makeBtn(btnLabel, "window.open('model-explorer.html','_blank')", 'var(--c-eval)');
}


// ============================================================

// ===== BLOCK PLACEMENT =====
function placeBlock(type, x, y) {
  const id = 'blk-' + (++blockIdCounter);
  const card = document.createElement('div');
  card.className = 'block-card status-idle';
  card.id = id;
  card.style.left = x + 'px';
  card.style.top = y + 'px';
  card.innerHTML = buildBlockHTML(type, id);
  card.style.borderColor = getPhaseColor(type);
  document.getElementById('canvas').appendChild(card);
  placedBlocks.push({ id, type, card, x, y });
  log('info', `+ ${type} #${blockIdCounter}`);
  initBlockAfterPlace(id, type);
  if (EDU_MODE) {
    card.querySelectorAll('[onmousedown]').forEach(el => el.removeAttribute('onmousedown'));
  }
  return id;
}

function getPhaseColor(type) {
  const map = {
    'camera-input': 'var(--c-data)', 'label-classes': 'var(--c-label)',
    'prepare-data': 'var(--c-prep)', 'pretrained-model': 'var(--c-model)',
    'train-model': 'var(--c-train)', 'save-model': 'var(--c-deploy)',
    'upload-model': 'var(--c-data)', 'camera-infer': 'var(--c-data)',
    'predict': 'var(--c-deploy)', 'show-results': 'var(--c-eval)',
    'explain-ai': 'var(--c-eval)', 'model-explorer': 'var(--c-eval)'
  };
  return map[type] || '#64748B';
}

function initBlockAfterPlace(id, type) {
  if (type === 'label-classes') {
    window.activeClass = 0;
    updateSampleCounts();
  }
  if (type === 'upload-model') {
    const inp = document.getElementById('file-model-' + id);
    if (inp) inp.addEventListener('change', () => tryLoadModelFiles(id));
    refreshIDBList(id);
  }
}

function refreshBlockText(b) {
  const title = b.card.querySelector('[data-block-title]');
  if (title) {
    const titles = {
      'camera-input': t('block_camera_input'), 'label-classes': t('block_label_classes'),
      'prepare-data': t('block_prepare_data'), 'pretrained-model': t('block_pretrained_model'),
      'train-model': t('block_train_model'), 'save-model': t('block_save_model'),
      'upload-model': t('block_upload_model'), 'camera-infer': t('block_camera_infer'),
      'predict': t('block_predict'), 'show-results': t('block_show_results'),
      'explain-ai': t('block_explain_ai'), 'model-explorer': t('block_model_explorer')
    };
    title.textContent = titles[b.type] || b.type;
  }
}

function toggleCollapse(id) {
  const card = document.getElementById(id);
  if (card) card.classList.toggle('collapsed');
}

// ===== CARD DRAG (reposition) =====
function cardDragStart(e, id) {
  if (EDU_MODE) return;
  if (e.button !== 0) return;
  e.stopPropagation();
  draggedCard = id;
  const card = document.getElementById(id);
  const rect = card.getBoundingClientRect();
  const trash = document.getElementById('trash-zone');
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  card.classList.add('dragging');
  trash.classList.add('visible');

  function onMove(ev) {
    const canvas = document.getElementById('canvas');
    const cr = canvas.getBoundingClientRect();
    let nx = ev.clientX - cr.left - dragOffsetX;
    let ny = ev.clientY - cr.top - dragOffsetY;
    nx = Math.max(0, Math.min(nx, cr.width - 280));
    ny = Math.max(0, ny);
    card.style.left = nx + 'px';
    card.style.top = ny + 'px';
    // Trash detection
    const tr = trash.getBoundingClientRect();
    const inTrash = ev.clientX >= tr.left && ev.clientX <= tr.right &&
      ev.clientY >= tr.top && ev.clientY <= tr.bottom;
    trash.classList.toggle('hot', inTrash);
  }
  function onUp(ev) {
    card.classList.remove('dragging');
    trash.classList.remove('visible', 'hot');
    const tr = trash.getBoundingClientRect();
    const inTrash = ev.clientX >= tr.left && ev.clientX <= tr.right &&
      ev.clientY >= tr.top && ev.clientY <= tr.bottom;
    if (inTrash && !EDU_MODE) {
      removeBlock(id);
    } else {
      const b = placedBlocks.find(b => b.id === id);
      if (b) {
        b.x = parseFloat(card.style.left);
        b.y = parseFloat(card.style.top);
      }
    }
    draggedCard = null;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function removeBlock(id) {
  const card = document.getElementById(id);
  if (card) card.remove();
  placedBlocks = placedBlocks.filter(b => b.id !== id);
  log('warn', `Removed block #${id}`);
}

function clearCanvas() {
  placedBlocks.forEach(b => { if (b.card) b.card.remove(); });
  placedBlocks = [];
  classNames = ['Klasa 1', 'Klasa 2'];
  capturedSamples = [[], []];
  baseModel = null;
  fullModel = null;
  preparedData = null;
  log('warn', 'Canvas cleared');
}

// ===== SAMPLE COUNTS =====
function updateSampleCounts() {
  document.querySelectorAll('[id^="cc-"]').forEach(el => {
    const parts = el.id.split('-');
    const cls = parseInt(parts[parts.length - 1]);
    const n = capturedSamples[cls] ? capturedSamples[cls].length : 0;
    el.textContent = `${n} ${t('lbl_samples')}`;
  });
}
function updateClassNamesEverywhere() {
  // Sync class name inputs across all label blocks
  document.querySelectorAll('[id^="cn-"]').forEach(el => {
    const parts = el.id.split('-');
    const cls = parseInt(parts[parts.length - 1]);
    classNames[cls] = el.value;
    el.value = classNames[cls];
  });
  // Fully rebuild capture buttons so new classes appear automatically
  placedBlocks.filter(b => b.type === 'camera-input').forEach(b => {
    const container = document.getElementById('capture-btns-' + b.id);
    if (!container) return;
    container.innerHTML = classNames.map((name, i) =>
      `<button class="bk-btn" style="background:${CLASS_COLORS[i]};font-size:10px;padding:4px 8px" onclick="blockCapture('${b.id}',${i})">${name}</button>`
    ).join('');
  });
}

// ===== CAMERA — Training =====
let cameraStreams = {};

async function getCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
  } catch (err) {
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.name === 'OverconstrainedError') {
      return await navigator.mediaDevices.getUserMedia({ video: true });
    }
    throw err;
  }
}

async function blockStartCamera(id) {
  try {
    if (cameraStreams[id]) {
      cameraStreams[id].getTracks().forEach(t => t.stop());
    }
    const stream = await getCameraStream();
    cameraStreams[id] = stream;
    const vid = document.getElementById('vid-' + id);
    if (vid) { vid.srcObject = stream; vid.play().catch(() => {}); }
    setBlockStatus(document.getElementById(id), 'running');
    log('success', t('log_camera_start'));
  } catch (err) {
    let msg = t('log_camera_err') + err.message;
    if (location.protocol === 'file:') {
      msg += lang === 'pl'
        ? ' ⚠️ Otwórz przez http://localhost:8765 (nie file://)'
        : ' ⚠️ Open via http://localhost:8765 (not file://)';
    }
    log('error', msg);
    setBlockStatus(document.getElementById(id), 'error');
  }
}

function blockCapture(id, cls) {
  if (cls === undefined) cls = window.activeClass || 0;
  const vid = document.getElementById('vid-' + id);
  if (!vid || !vid.srcObject) {
    log('warn', lang === 'pl' ? 'Najpierw uruchom kamerę!' : 'Start the camera first!');
    return;
  }
  // Check video is actually playing and has frames
  if (vid.readyState < 2 || vid.videoWidth === 0) {
    log('warn', lang === 'pl' ? 'Kamera jeszcze się ładuje, poczekaj chwilę...' : 'Camera still loading, wait a moment...');
    return;
  }
  const spc = parseInt(document.getElementById('spc-' + id)?.value || '10');
  const res = parseInt(document.getElementById('res-' + id)?.value || '224');
  const off = document.createElement('canvas');
  off.width = res; off.height = res;
  const ctx = off.getContext('2d');
  if (!capturedSamples[cls]) capturedSamples[cls] = [];
  let captured = 0;
  const statusEl = document.getElementById('cam-status-' + id);
  setBlockStatus(document.getElementById(id), 'running');
  function grab() {
    if (captured >= spc) {
      log('success', t('log_capture', spc, classNames[cls]));
      if (statusEl) statusEl.textContent = `${classNames[cls]}: ${capturedSamples[cls].length} ${t('lbl_samples')}`;
      updateSampleCounts();
      updateThumbStrips(id);
      setBlockStatus(document.getElementById(id), 'done');
      return;
    }
    // Draw current video frame
    ctx.drawImage(vid, 0, 0, res, res);
    const imgData = ctx.getImageData(0, 0, res, res);
    capturedSamples[cls].push(imgData);
    captured++;
    if (statusEl) statusEl.textContent = `${classNames[cls]}: zbieranie ${captured}/${spc}...`;
    setTimeout(grab, 150);
  }
  grab();
}

function renderThumbsIntoStrip(strip, cls) {
  strip.innerHTML = '';
  const samples = capturedSamples[cls] || [];
  samples.slice(-5).forEach(imgData => {
    const cv = document.createElement('canvas');
    cv.width = imgData.width; cv.height = imgData.height;
    cv.getContext('2d').putImageData(imgData, 0, 0);
    cv.style.borderTop = `3px solid ${CLASS_COLORS[cls]}`;
    strip.appendChild(cv);
  });
}

function updateThumbStrips(cameraId) {
  // Update camera block's combined strip
  const camStrip = document.getElementById('thumbs-' + cameraId);
  if (camStrip) {
    camStrip.innerHTML = '';
    for (let cls = 0; cls < classNames.length; cls++) {
      const samples = capturedSamples[cls] || [];
      samples.slice(-5).forEach(imgData => {
        const cv = document.createElement('canvas');
        cv.width = imgData.width; cv.height = imgData.height;
        cv.getContext('2d').putImageData(imgData, 0, 0);
        cv.style.borderTop = `3px solid ${CLASS_COLORS[cls % CLASS_COLORS.length]}`;
        camStrip.appendChild(cv);
      });
    }
  }
  // Update per-class strips in all label blocks
  placedBlocks.filter(b => b.type === 'label-classes').forEach(b => {
    for (let cls = 0; cls < classNames.length; cls++) {
      const labelStrip = document.getElementById(`thumbs-label-${cls}-${b.id}`);
      if (labelStrip) renderThumbsIntoStrip(labelStrip, cls);
    }
  });
}

// ===== AUGMENTATION WEB WORKER =====
const WORKER_CODE = `
self.onmessage = function(e) {
  const { samples, multiplier, augType } = e.data;
  const result = [];
  // include originals
  for (const s of samples) result.push(s);
  
  const target = samples.length * multiplier;
  let added = 0;
  let idx = 0;
  
  while (result.length < target) {
const src = samples[idx % samples.length];
const w = src.width, h = src.height;
const buf = new Uint8ClampedArray(src.data);

if (augType !== 'none') {
  // Brightness jitter
  const bj = 0.7 + Math.random() * 0.6;
  for (let i=0;i<buf.length;i+=4) {
buf[i] = Math.min(255, buf[i]*bj);
buf[i+1] = Math.min(255, buf[i+1]*bj);
buf[i+2] = Math.min(255, buf[i+2]*bj);
  }
  
  // Horizontal flip (50%)
  if (augType === 'all' && Math.random() > 0.5) {
for (let row=0;row<h;row++) {
  for (let col=0;col<Math.floor(w/2);col++) {
    const a = (row*w+col)*4, b2 = (row*w+(w-1-col))*4;
    for (let c=0;c<4;c++) {
      const tmp=buf[a+c]; buf[a+c]=buf[b2+c]; buf[b2+c]=tmp;
    }
  }
}
  }
}

result.push({ data: buf, width: w, height: h });
added++;
idx++;

if (added % 10 === 0) {
  self.postMessage({ type: 'progress', pct: Math.round((result.length/target)*100) });
}
  }
  
  self.postMessage({ type: 'done', result, counts: samples.length });
};
`;

// ===== PREPARE DATA =====
async function runPrepare(id) {
  const totalSamples = capturedSamples.reduce((s, a) => s + a.length, 0);
  if (totalSamples === 0) { log('warn', t('log_no_data')); return; }

  setBlockStatus(document.getElementById(id), 'running');
  log('step', t('log_prep_start'));

  const augType = document.getElementById('aug-' + id)?.value || 'all';
  const multiplier = parseInt(document.getElementById('mul-' + id)?.value || '2');
  const prog = document.getElementById('prog-' + id);
  const status = document.getElementById('prep-status-' + id);

  const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
  const workerURL = URL.createObjectURL(blob);
  const worker = new Worker(workerURL);

  // Flatten all samples with labels
  const allSamples = [];
  const allLabels = [];
  for (let cls = 0; cls < classNames.length; cls++) {
    for (const s of (capturedSamples[cls] || [])) {
      allSamples.push(s);
      allLabels.push(cls);
    }
  }

  return new Promise((resolve) => {
    worker.onmessage = async (e) => {
      if (e.data.type === 'progress') {
        if (prog) prog.value = e.data.pct;
        if (status) status.textContent = e.data.pct + '%';
      } else if (e.data.type === 'done') {
        const augmented = e.data.result;
        const n = augmented.length;
        if (prog) prog.value = 100;

        // Build tensor dataset
        const numClasses = classNames.length;
        log('info', t('log_prep_aug', n - totalSamples));

        // Map augmented back to labels (same order)
        const xs = [];
        const ys = [];
        for (let i = 0; i < augmented.length; i++) {
          const origIdx = i < allSamples.length ? i : i % allSamples.length;
          const cls = allLabels[origIdx % allLabels.length];
          xs.push(augmented[i]);
          ys.push(cls);
        }

        preparedData = { xs, ys, numClasses: classNames.length };
        log('success', t('log_prep_done', n));
        if (status) status.textContent = t('log_prep_done', n);
        setBlockStatus(document.getElementById(id), 'done');
        worker.terminate();
        URL.revokeObjectURL(workerURL);
        resolve();
      }
    };
    worker.postMessage({ samples: allSamples, multiplier, augType });
  });
}

// ===== LOAD BASE MODEL =====
async function runLoadBaseModel(id) {
  if (baseModel) { log('info', 'Base model already loaded'); setBlockStatus(document.getElementById(id), 'done'); return; }
  setBlockStatus(document.getElementById(id), 'running');
  log('step', t('log_model_loading'));
  const prog = document.getElementById('prog-' + id);
  const mstat = document.getElementById('model-status-' + id);
  try {
    baseModel = await tf.loadGraphModel(MODEL_URL, {
      onProgress: (frac) => {
        if (prog) prog.value = Math.round(frac * 100);
        if (mstat) mstat.textContent = Math.round(frac * 100) + '%';
      }
    });

    if (prog) prog.value = 100;
    if (mstat) mstat.textContent = 'MobileNetV3-Small loaded ✓';
    log('success', t('log_model_loaded'));
    setBlockStatus(document.getElementById(id), 'done');
  } catch (err) {
    log('error', t('log_model_err') + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  }
}



// ============================================================

// ===== TRAINING =====
let lossHistory = [], accHistory = [];

function drawChart(canvasId) {
  const cv = document.getElementById(canvasId);
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.offsetWidth || 256;
  const H = cv.height || 80;
  cv.width = W;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, W, H);

  function drawLine(data, color) {
    if (data.length < 2) return;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * (W - 20) + 10;
      const y = H - 10 - ((v - min) / range) * (H - 20);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Label last point
    const lv = data[data.length - 1];
    const lx = W - 12;
    const ly = H - 10 - ((lv - min) / range) * (H - 20);
    ctx.fillStyle = color;
    ctx.font = '9px Inter';
    ctx.fillText(lv.toFixed ? lv.toFixed(3) : lv, lx - 28, Math.max(12, ly - 3));
  }
  drawLine(lossHistory, '#DC2626');
  drawLine(accHistory, '#059669');

  // Legend
  ctx.font = '9px Inter';
  ctx.fillStyle = '#DC2626'; ctx.fillText('loss', 10, 10);
  ctx.fillStyle = '#059669'; ctx.fillText('acc', 40, 10);
}

async function runTraining(id) {
  if (!preparedData) { log('warn', t('log_no_data')); return; }
  if (!baseModel) { log('warn', t('log_no_model_base')); return; }

  trainingCancelled = false;
  lossHistory = []; accHistory = [];
  const epochs = parseInt(document.getElementById('ep-' + id)?.value || '15');
  const lr = parseFloat(document.getElementById('lr-' + id)?.value || '0.001');
  const batchSize = parseInt(document.getElementById('bs-' + id)?.value || '16');
  const info = document.getElementById('train-info-' + id);
  const numClasses = preparedData.numClasses;
  const { xs: rawXs, ys: rawYs } = preparedData;

  setBlockStatus(document.getElementById(id), 'running');
  log('step', t('log_train_start', epochs));

  // Declared outside try so finally can always dispose them
  let featsTensor = null;
  let ysTensor = null;

  try {
    // ── STEP 1: Extract bottleneck features from frozen base model ──
    // Always resize to 224×224 — MobileNetV3-Small requires that input size
    // regardless of the resolution the user chose when capturing samples.
    log('info', lang === 'pl' ? `Ekstrakcja cech z ${rawXs.length} próbek...` : `Extracting features from ${rawXs.length} samples...`);
    const allFeats = [];
    const reuseCanvas = document.createElement('canvas');
    const reuseCtx = reuseCanvas.getContext('2d');
    for (let i = 0; i < rawXs.length; i++) {
      if (trainingCancelled) throw new Error('cancelled');
      const imgData = rawXs[i];
      const feat = tf.tidy(() => {
        if (reuseCanvas.width !== imgData.width || reuseCanvas.height !== imgData.height) {
          reuseCanvas.width = imgData.width;
          reuseCanvas.height = imgData.height;
        }
        reuseCtx.putImageData(
          new ImageData(new Uint8ClampedArray(imgData.data), imgData.width, imgData.height), 0, 0
        );
        return baseModel.predict(
          tf.browser.fromPixels(reuseCanvas).resizeBilinear([224, 224]).toFloat().div(255).expandDims(0)
        );
      });
      allFeats.push(feat);
      if (i % 5 === 0) {
        if (info) info.textContent = lang === 'pl'
          ? `Ekstrakcja cech: ${i + 1}/${rawXs.length}`
          : `Feature extraction: ${i + 1}/${rawXs.length}`;
        await tf.nextFrame();
      }
    }
    featsTensor = tf.concat(allFeats, 0);
    allFeats.forEach(f => f.dispose());
    const featSize = featsTensor.shape[1];

    // Dispose the index tensor immediately after oneHot consumes it
    const idxTensor = tf.tensor1d(rawYs, 'int32');
    ysTensor = tf.oneHot(idxTensor, numClasses);
    idxTensor.dispose();

    log('info', lang === 'pl' ? `Cechy: ${rawXs.length}×${featSize}` : `Features: ${rawXs.length}×${featSize}`);

    // ── STEP 2: Train small classifier on bottleneck features ──
    // The base model (GraphModel) cannot be fine-tuned in TF.js — it is always frozen.
    // We train only the Dense head on the pre-extracted feature vectors.
    const classifier = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [featSize], units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: numClasses, activation: 'softmax' })
      ]
    });
    classifier.compile({
      optimizer: tf.train.adam(lr),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    const startTime = Date.now();
    await classifier.fit(featsTensor, ysTensor, {
      epochs, batchSize, shuffle: true,
      callbacks: {
        onEpochBegin: async (epoch) => {
          if (trainingCancelled) throw new Error('cancelled');
        },
        onEpochEnd: async (epoch, logs) => {
          lossHistory.push(logs.loss);
          accHistory.push(logs.acc || logs.accuracy || 0);
          drawChart('chart-' + id);
          const elapsed = (Date.now() - startTime) / 1000;
          const perEpoch = elapsed / (epoch + 1);
          const remaining = Math.round((epochs - epoch - 1) * perEpoch);
          const acc = logs.acc || logs.accuracy || 0;
          if (info) info.textContent = `Epoch ${epoch + 1}/${epochs} | ETA: ${remaining}s`;
          log('data', t('log_train_epoch', epoch + 1, logs.loss, acc));
          await tf.nextFrame();
        }
      }
    });

    // ── STEP 3: Store classifier and wire up inference ──
    // Inference is always two-step: baseModel (frozen GraphModel from CDN) → classifier.
    // A GraphModel cannot be merged into a LayersModel in TF.js, so we keep them separate.
    // Both fullModel (for save) and inferModel (for same-session prediction) point to the
    // same trained classifier instance; baseModel is required at inference time.
    const finalAcc = accHistory[accHistory.length - 1] || 0;
    modelMetadata = {
      schemaVersion: SCHEMA_VERSION,
      classLabels: classNames.slice(0, numClasses),
      inputSize: 224,
      trainingAccuracy: finalAcc,
      baseModel: 'MobileNetV3-Small',
      timestamp: new Date().toISOString()
    };
    fullModel = classifier;
    inferModel = classifier;       // available immediately for same-session inference
    inferMetadata = modelMetadata; // so inference blocks see the right class labels

    log('info', lang === 'pl' ? 'Model gotowy...' : 'Model ready...');
    log('success', t('log_train_done', finalAcc));
    setBlockStatus(document.getElementById(id), 'done');
  } catch (err) {
    if (err.message === 'cancelled') {
      log('warn', t('log_train_cancel'));
      setBlockStatus(document.getElementById(id), 'idle');
    } else {
      log('error', 'Training error: ' + err.message);
      console.error(err);
      setBlockStatus(document.getElementById(id), 'error');
    }
  } finally {
    // Always clean up feature tensors regardless of success, cancellation or error
    if (featsTensor) featsTensor.dispose();
    if (ysTensor) ysTensor.dispose();
  }
}


function stopTraining(id) {
  trainingCancelled = true;
  log('warn', lang === 'pl' ? 'Zatrzymywanie po bieżącej epoce...' : 'Stopping after current epoch...');
}

// ===== SAVE MODEL =====
async function runSaveIDB(id) {
  if (!fullModel) { log('warn', t('lbl_no_model')); return; }
  if (!baseModel) { log('warn', t('log_no_model_base')); return; }
  const nameEl = document.getElementById('model-name-' + id);
  const name = (nameEl ? nameEl.value.trim() : '') || 'model-1';
  try {
    fullModel.userDefinedMetadata = modelMetadata; // bake labels into model JSON
    await fullModel.save('indexeddb://ml-blocks-' + name);
    await baseModel.save('indexeddb://ml-blocks-base-' + name);
    localStorage.setItem('ml-blocks-meta-' + name, JSON.stringify(modelMetadata));
    log('success', t('log_save_idb'));
    setBlockStatus(document.getElementById(id), 'done');
    const el = document.getElementById('save-info-' + id);
    if (el) el.textContent = t('log_save_idb');
  } catch (err) {
    log('error', 'Save error: ' + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  }
}

async function runDownload(id) {
  if (!fullModel) { log('warn', t('lbl_no_model')); return; }
  if (!baseModel) { log('warn', t('log_no_model_base')); return; }
  log('step', t('log_download'));
  try {
    fullModel.userDefinedMetadata = modelMetadata;
    // Capture both models' topology + weights via custom IOHandlers (no DOM side-effects).
    // Running in parallel is safe — each saves to its own closure variable.
    const [classifierArt, baseArt] = await Promise.all([
      captureArtifacts(fullModel),
      captureArtifacts(baseModel),
    ]);
    const bundle = {
      schemaVersion: SCHEMA_VERSION,
      metadata: modelMetadata,
      classifier: classifierArt,
      base: baseArt,
    };
    const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nameEl = document.getElementById('model-name-' + id);
    const fname = ((nameEl ? nameEl.value.trim() : '') || 'klocki-model') + '.json';
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    log('success', (lang === 'pl' ? 'Model pobrany ✓ (' : 'Model downloaded ✓ (') + fname + ')');
  } catch (err) {
    log('error', 'Download error: ' + err.message);
  }
}

// ===== UPLOAD MODEL =====
function pickModelFiles(id) {
  const inp = document.getElementById('file-model-' + id);
  if (!inp) return;
  inp.onchange = () => tryLoadModelFiles(id);
  inp.click();
}

async function tryLoadModelFiles(id) {
  const inp = document.getElementById('file-model-' + id);
  if (!inp || !inp.files.length) { log('warn', lang === 'pl' ? 'Wybierz plik modelu' : 'Select model file first'); return; }
  const allFiles = Array.from(inp.files);
  const jsonFile = allFiles.find(f => f.name.endsWith('.json'));
  if (!jsonFile) { log('warn', 'No .json file selected'); return; }
  setBlockStatus(document.getElementById(id), 'running');
  log('step', t('log_upload_start'));
  try {
    const jsonText = await jsonFile.text();
    const parsed = JSON.parse(jsonText);
    if (parsed.base && parsed.classifier) {
      // ── Bundled format (klocki-full-model.json) — contains base + classifier ──
      // Load both models from the single file; no CDN access needed.
      inferModel = await tf.loadLayersModel({
        load: async () => ({
          modelTopology: parsed.classifier.modelTopology,
          weightSpecs: parsed.classifier.weightSpecs,
          weightData: base64ToArrayBuffer(parsed.classifier.weightData),
          format: parsed.classifier.format,
        })
      });
      baseModel = await tf.loadGraphModel({
        load: async () => ({
          modelTopology: parsed.base.modelTopology,
          weightSpecs: parsed.base.weightSpecs,
          weightData: base64ToArrayBuffer(parsed.base.weightData),
          format: parsed.base.format,
        })
      });
      log('info', lang === 'pl' ? 'Model bazowy wczytany z pliku ✓' : 'Base model loaded from file ✓');
      processLoadedMeta(id, parsed.metadata || {});
    } else {
      // ── Legacy: separate classifier .json + .bin files ──
      const binFile = allFiles.find(f => f.name.endsWith('.bin') || f.name.endsWith('.weights.bin'));
      const files = binFile ? [jsonFile, binFile] : [jsonFile];
      inferModel = await tf.loadLayersModel(tf.io.browserFiles(files));
      processLoadedMeta(id, parsed.userDefinedMetadata || {});
      if (!baseModel) {
        log('warn', lang === 'pl'
          ? 'Pamiętaj: załaduj też model bazowy (blok "Model bazowy" lub "Wczytaj z przeglądarki")'
          : 'Remember: also load the base model (Pretrained Model block or Load from Browser)');
      }
    }
    setBlockStatus(document.getElementById(id), 'done');
    log('success', t('log_upload_done', classNames.join(', ')));
  } catch (err) {
    log('error', 'Upload error: ' + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  }
}

async function runLoadIDB(id) {
  const sel = document.getElementById('idb-select-' + id);
  const name = sel ? sel.value : '';
  if (!name) {
    log('warn', lang === 'pl' ? 'Wybierz model z listy (kliknij ↺ aby odświeżyć)' : 'Select a model from the list (click ↺ to refresh)');
    return;
  }
  setBlockStatus(document.getElementById(id), 'running');
  log('step', 'Loading from IndexedDB: ' + name + '...');
  try {
    inferModel = await tf.loadLayersModel('indexeddb://ml-blocks-' + name);
    try {
      baseModel = await tf.loadGraphModel('indexeddb://ml-blocks-base-' + name);
      log('info', lang === 'pl' ? 'Model bazowy wczytany z przeglądarki ✓' : 'Base model loaded from browser ✓');
    } catch (_) {
      // Backward compat: try old fixed key
      try {
        baseModel = await tf.loadGraphModel('indexeddb://ml-blocks-base-v1');
        log('info', lang === 'pl' ? 'Model bazowy wczytany z przeglądarki ✓' : 'Base model loaded from browser ✓');
      } catch (_2) {
        log('warn', lang === 'pl'
          ? 'Brak modelu bazowego w przeglądarce — załaduj blok "Model bazowy" z CDN'
          : 'Base model not in browser — load the Pretrained Model block from CDN');
      }
    }
    const metaStr = localStorage.getItem('ml-blocks-meta-' + name) || localStorage.getItem('ml-blocks-meta');
    const meta = metaStr ? JSON.parse(metaStr) : {};
    processLoadedMeta(id, meta);
    setBlockStatus(document.getElementById(id), 'done');
    log('success', t('log_upload_done', meta.classLabels ? meta.classLabels.join(', ') : '—'));
  } catch (err) {
    log('error', 'IDB load error: ' + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  }
}

async function refreshIDBList(id) {
  const sel = document.getElementById('idb-select-' + id);
  if (!sel) return;
  try {
    const models = await tf.io.listModels();
    const names = Object.keys(models)
      .filter(k => k.startsWith('indexeddb://ml-blocks-') && !k.startsWith('indexeddb://ml-blocks-base-'))
      .map(k => k.replace('indexeddb://ml-blocks-', ''));
    sel.innerHTML = names.length
      ? names.map(n => '<option value="' + n + '">' + n + '</option>').join('')
      : '<option value="" disabled selected>' + t('lbl_no_saved_models') + '</option>';
  } catch (e) {
    sel.innerHTML = '<option value="" disabled selected>' + t('lbl_no_saved_models') + '</option>';
  }
}

function processLoadedMeta(id, meta) {
  inferMetadata = meta;
  const warn = document.getElementById('warn-' + id);
  if (warn) {
    if (meta.schemaVersion && meta.schemaVersion !== SCHEMA_VERSION) {
      warn.textContent = t('warn_version');
      warn.classList.add('show');
      log('warn', t('log_upload_warn'));
    } else {
      warn.classList.remove('show');
    }
  }
  if (meta.classLabels) {
    for (let i = 0; i < meta.classLabels.length; i++) classNames[i] = meta.classLabels[i];
  }
  const el = document.getElementById('meta-' + id);
  if (el) {
    el.innerHTML = `
  <b>${t('lbl_classes')}:</b> ${classNames.join(', ')}<br>
  <b>${t('lbl_accuracy')}:</b> ${meta.trainingAccuracy ? (meta.trainingAccuracy * 100).toFixed(1) + '%' : '—'}<br>
  <b>${t('lbl_timestamp')}:</b> ${meta.timestamp ? new Date(meta.timestamp).toLocaleString() : '—'}
`;
  }
}



// ============================================================

// ===== INFERENCE CAMERA =====
let inferCameraStream = null;
let inferVideoEl = null;
let predHistoryId = null;
let predHistory = [];
let frozenFrame = false;

// ===== ZERO-SHOT INFERENCE (BASE MODEL) =====
let zsStreams = {}; // id -> MediaStream
let zsIntervals = {}; // id -> setInterval handle
let featureMapModel = null;

// Compact ImageNet top-1000 label list (first 100 for brevity — app loads full list lazily)
const IMAGENET_LABELS_URL = 'https://storage.googleapis.com/download.tensorflow.org/data/ImageNetLabels.txt';
let imagenetLabels = null;

async function loadImagenetLabels() {
  if (imagenetLabels) return imagenetLabels;
  try {
    const res = await fetch(IMAGENET_LABELS_URL);
    const text = await res.text();
    // file has one label per line, first line is 'background'
    imagenetLabels = text.trim().split('\n');
    return imagenetLabels;
  } catch (e) {
    // fallback — return index strings
    imagenetLabels = Array.from({ length: 1001 }, (_, i) => `class_${i}`);
    return imagenetLabels;
  }
}

async function startZeroShot(id) {
  if (!baseModel) {
    log('warn', lang === 'pl'
      ? 'Najpierw za\u0142aduj Model bazowy (blok treningu)!'
      : 'Load the Pretrained Model block first!');
    return;
  }
  if (zsStreams[id]) zsStreams[id].getTracks().forEach(t => t.stop());
  try {
    const stream = await getCameraStream();
    zsStreams[id] = stream;
    const vid = document.getElementById('zsvid-' + id);
    if (vid) { vid.srcObject = stream; vid.play().catch(() => {}); }
    setBlockStatus(document.getElementById(id), 'running');
    // Ensure labels are loaded
    loadImagenetLabels();
    const fpsEl = document.getElementById('zsfps-' + id);
    const interval = fpsEl ? parseInt(fpsEl.value) : 100;
    if (zsIntervals[id]) clearInterval(zsIntervals[id]);
    zsIntervals[id] = setInterval(() => runZeroShot(id), interval);
    log('success', lang === 'pl' ? 'Zero-shot uruchomiony' : 'Zero-shot started');
  } catch (err) {
    log('error', (lang === 'pl' ? 'B\u0142\u0105d kamery: ' : 'Camera error: ') + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  }
}

function stopZeroShot(id) {
  if (zsIntervals[id]) { clearInterval(zsIntervals[id]); delete zsIntervals[id]; }
  if (zsStreams[id]) { zsStreams[id].getTracks().forEach(t => t.stop()); delete zsStreams[id]; }
  setBlockStatus(document.getElementById(id), 'idle');
  log('info', lang === 'pl' ? 'Zero-shot zatrzymany' : 'Zero-shot stopped');
}

async function runZeroShot(id) {
  if (!baseModel) return;
  const vid = document.getElementById('zsvid-' + id);
  if (!vid || !vid.srcObject) return;
  const labels = imagenetLabels;
  try {
    const tensor = tf.tidy(() =>
      tf.browser.fromPixels(vid)
        .resizeBilinear([224, 224])
        .toFloat().div(255)
        .expandDims(0)
    );

    // Base model outputs features (not class probs). For top-K labels we need a full classification model.
    // We'll reuse a simple argmax on the feature vector as a proxy — or better, signal we need full mobilenet.
    // Since baseModel is the feature extractor, we show top-5 neuron activations mapped to imagenet labels.
    const features = await baseModel.predict(tensor).data();
    tensor.dispose();
    // Get top 5 indices by activation value
    const indexed = Array.from(features).map((v, i) => ({ v, i }));
    indexed.sort((a, b) => b.v - a.v);
    const top5 = indexed.slice(0, 5);
    const max = top5[0].v || 1;
    const resultsEl = document.getElementById('zs-results-' + id);
    if (resultsEl && labels) {
      resultsEl.innerHTML = top5.map(({ v, i }) => {
        const label = labels[i] || `feat_${i}`;
        const pct = Math.max(0, (v / max * 100)).toFixed(1);
        return `<div style="margin-bottom:3px">
<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:1px">
  <span style="font-weight:600;color:var(--c-model);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">${label}</span>
  <span style="color:var(--c-muted)">${pct}%</span>
</div>
<div style="background:#E2E8F0;border-radius:3px;height:5px">
  <div style="background:var(--c-model);width:${pct}%;height:5px;border-radius:3px;transition:width .15s"></div>
</div></div>`;
      }).join('');
    }
  } catch (e) { /* silent */ }
}

async function startInferCamera(id) {
  try {
    if (inferCameraStream) inferCameraStream.getTracks().forEach(t => t.stop());
    inferCameraStream = await getCameraStream();
    const vid = document.getElementById('vid-' + id);
    const showVid = document.querySelector('[id^="show-vid-"]');
    if (vid) { vid.srcObject = inferCameraStream; vid.play().catch(() => {}); }
    if (showVid) { showVid.srcObject = inferCameraStream; showVid.play().catch(() => {}); }
    inferVideoEl = vid || showVid;
    setBlockStatus(document.getElementById(id), 'running');
    log('success', t('log_camera_start') + ' (inference)');
    // Start inference loop
    const fpsEl = document.getElementById('fps-' + id);
    const interval = fpsEl ? parseInt(fpsEl.value) : 100;
    if (inferInterval) clearInterval(inferInterval);
    inferInterval = setInterval(() => runInference(id), interval);
  } catch (err) {
    log('error', t('log_camera_err') + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  }
}

function stopInferCamera(id) {
  if (inferInterval) { clearInterval(inferInterval); inferInterval = null; }
  if (inferCameraStream) { inferCameraStream.getTracks().forEach(t => t.stop()); inferCameraStream = null; }
  setBlockStatus(document.getElementById(id), 'idle');
  log('info', 'Inference camera stopped');
}

async function runInference(camId) {
  if (!inferModel) return;
  if (frozenFrame) return;
  const vid = inferVideoEl || document.querySelector('video[id^="vid-"]');
  if (!vid || !vid.srcObject) return;

  try {
    const inputSize = (inferMetadata && inferMetadata.inputSize) || 224;
    const tensor = tf.tidy(() =>
      tf.browser.fromPixels(vid)
        .resizeBilinear([inputSize, inputSize])
        .toFloat().div(255)
        .expandDims(0)
    );

    // Two-step prediction: baseModel (frozen GraphModel) extracts features,
    // inferModel (trained classifier head) maps them to class probabilities.
    // baseModel is mandatory — the classifier was trained on its 576-dim output,
    // not on raw pixels, so passing raw pixels would produce garbage results.
    if (!baseModel) {
      log('error', lang === 'pl' ? 'Brak modelu bazowego! Załaduj blok "Model bazowy" najpierw.' : 'Base model not loaded — add and run the Pretrained Model block first.');
      tensor.dispose();
      return;
    }
    const features = await baseModel.predict(tensor);
    const predTensor = inferModel.predict(features);
    const predictions = await predTensor.data();
    predTensor.dispose();
    features.dispose();

    // Feature Map Visualization for inference block
    const fmPredictBlock = placedBlocks.find(b => b.type === 'predict');
    if (fmPredictBlock) {
      const fmapCheckbox = document.getElementById('fmap-' + fmPredictBlock.id);
      const fmapsContainer = document.getElementById('fmaps-' + fmPredictBlock.id);

      if (fmapCheckbox && fmapCheckbox.checked) {
        if (fmapsContainer) fmapsContainer.style.display = 'flex';

        // Find the base model inside the functional model
        // inferModel combines MobileNet and sequential classifier.
        // It's a functional model, we need to locate the MobileNet layer or 
        // rely on baseModel if it's currently loaded
        if (baseModel) {
          if (!featureMapModel) {
            try {
              const layer = baseModel.getLayer('conv_pw_1_relu');
              featureMapModel = tf.model({ inputs: baseModel.inputs, outputs: layer.output });
            } catch (e) {
              console.warn("Could not extract feature map layer");
            }
          }

          if (featureMapModel) {
            const fmapTensor = featureMapModel.predict(tensor);
            const numChannels = 16;

            tf.tidy(() => {
              const channels = tf.split(fmapTensor.squeeze(0), fmapTensor.shape[3], 2);

              if (fmapsContainer) {
                if (fmapsContainer.children.length < numChannels) {
                  fmapsContainer.innerHTML = '';
                  for (let i = 0; i < numChannels; i++) {
                    const cv = document.createElement('canvas');
                    cv.className = 'fm-canvas';
                    fmapsContainer.appendChild(cv);
                  }
                }

                for (let i = 0; i < numChannels; i++) {
                  if (i < channels.length) {
                    const ch = channels[i];
                    const min = ch.min();
                    const max = ch.max();
                    const normalized = ch.sub(min).div(max.sub(min).add(1e-5));

                    const cv = fmapsContainer.children[i];
                    tf.browser.toPixels(normalized, cv);
                  }
                }
              }
            });
            fmapTensor.dispose();
          }
        }
      } else {
        if (fmapsContainer) fmapsContainer.style.display = 'none';
      }
    }

    tensor.dispose();

    const best = Array.from(predictions);
    const maxIdx = best.indexOf(Math.max(...best));
    const confidence = best[maxIdx];

    // Update predict block — per-class confidence bars + top result
    const predictBlock = placedBlocks.find(b => b.type === 'predict');
    if (predictBlock) {
      const thresh = parseFloat(document.getElementById('thr-' + predictBlock.id)?.value || '0.7');
      const result = document.getElementById('pred-result-' + predictBlock.id);
      const barsEl = document.getElementById('pred-bars-' + predictBlock.id);
      // Render per-class confidence bars
      if (barsEl) {
        barsEl.innerHTML = Array.from(predictions).map((p, i) => {
          const pct = (p * 100).toFixed(1);
          return `<div style="margin-bottom:4px">
<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px">
  <span style="font-weight:600;color:${CLASS_COLORS[i]}">${classNames[i]}</span>
  <span style="color:var(--c-muted)">${pct}%</span>
</div>
<div style="background:#E2E8F0;border-radius:3px;height:6px">
  <div style="background:${CLASS_COLORS[i]};width:${pct}%;height:6px;border-radius:3px;transition:width .2s"></div>
</div></div>`;
        }).join('');
      }
      if (result) {
        if (confidence >= thresh) {
          result.textContent = `${classNames[maxIdx]} \u2014 ${(confidence * 100).toFixed(1)}%`;
          result.style.color = CLASS_COLORS[maxIdx];
          result.style.borderLeft = `4px solid ${CLASS_COLORS[maxIdx]}`;
          result.style.fontStyle = '';
        } else {
          result.textContent = lang === 'pl' ? 'poni\u017cej progu pewno\u015bci' : 'below confidence threshold';
          result.style.color = 'var(--c-muted)';
          result.style.borderLeft = '';
          result.style.fontStyle = 'italic';
        }
      }
      // Raw array logged at bottom of function
    }

    // Update show-results overlay
    const showBlock = placedBlocks.find(b => b.type === 'show-results');
    if (showBlock) {
      drawOverlay(showBlock.id, classNames[maxIdx], confidence, maxIdx);
      predHistory.push({ idx: maxIdx, conf: confidence });
      if (predHistory.length > 30) predHistory.shift();
      drawHistChart(showBlock.id);
    }

    const raw = Array.from(predictions).map(v => v.toFixed(4));
    log('data', `[${raw.join(', ')}]`);

  } catch (err) {
    // silent
  }
}

// ===== XAI / HEATMAP GENERATOR =====
async function runXAI(id) {
  if (!inferModel) {
    log('warn', lang === 'pl' ? 'Najpierw załaduj lub wytrenuj model!' : 'Load or train a model first!');
    return;
  }
  if (!baseModel) {
    log('error', lang === 'pl' ? 'Brak modelu bazowego! Załaduj blok "Model bazowy".' : 'Base model not loaded — load the Pretrained Model block first.');
    return;
  }

  const resultEl = document.getElementById('xai-result-' + id);
  if (resultEl) resultEl.innerHTML = lang === 'pl'
    ? '<span style="color:var(--c-eval)">Analizuję... (nie ruszaj kamery)</span>'
    : '<span style="color:var(--c-eval)">Analyzing... (keep camera still)</span>';

  const vid = inferVideoEl || document.querySelector('video[id^="vid-"]');
  if (!vid || !vid.srcObject) {
    if (resultEl) resultEl.textContent = lang === 'pl' ? 'Uruchom "Kamera: Predykcja"' : 'Start "Camera: Prediction" first';
    return;
  }

  const canvas = document.getElementById('xai-vid-' + id);
  const overlay = document.getElementById('xai-overlay-' + id);
  if (!canvas || !overlay) return;

  const inputSize = (inferMetadata && inferMetadata.inputSize) || 224;

  // ── 1. Capture frame using EXACTLY the same preprocessing as inference ──
  // runInference squishes the full video frame to inputSize×inputSize without any
  // cropping (tf.browser.fromPixels(vid).resizeBilinear([inputSize, inputSize])).
  // blockCapture() does the same: ctx.drawImage(vid, 0, 0, res, res).
  // A center-crop would analyse different pixels than the model actually saw,
  // making the heatmap misleading. Squish the full frame here too.
  canvas.width = inputSize;
  canvas.height = inputSize;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(vid, 0, 0, inputSize, inputSize); // full-frame squish, matching inference
  const frameImageData = ctx.getImageData(0, 0, inputSize, inputSize);

  // ── 2. Size the overlay to the container's physical pixel dimensions ──
  // The canvas above is drawn at inputSize×inputSize model pixels (shown in a
  // fixed CSS container). The overlay must cover that same visual area exactly.
  // Using devicePixelRatio makes the heatmap crisp on HiDPI/Retina screens
  // instead of upscaling a 224-pixel canvas to fill 448 physical pixels.
  const wrap = canvas.parentElement;
  const displayW = wrap.clientWidth || inputSize;
  const displayH = wrap.clientHeight || inputSize;
  const dpr = window.devicePixelRatio || 1;
  overlay.width = Math.round(displayW * dpr);
  overlay.height = Math.round(displayH * dpr);

  // Scale factors: one model-input pixel → overlay physical pixels
  const scaleX = overlay.width / inputSize;
  const scaleY = overlay.height / inputSize;

  // ── 3. Base prediction on the captured frame ──
  // Explicit tensor disposal instead of tf.tidy returning a plain JS object,
  // which was technically correct but fragile and misleading.
  let baseClass, baseConf;
  {
    const tInput = tf.browser.fromPixels(frameImageData).toFloat().div(255).expandDims(0);
    const features = baseModel.predict(tInput);
    const predTensor = inferModel.predict(features);
    const preds = await predTensor.data();
    tInput.dispose();
    features.dispose();
    predTensor.dispose();
    baseClass = Array.from(preds).reduce((best, v, i) => v > preds[best] ? i : best, 0);
    baseConf = preds[baseClass];
  }

  const patchSizeEl = document.getElementById('xai-patch-' + id);
  const PATCH_SIZE = patchSizeEl ? parseInt(patchSizeEl.value) : 32;
  const STRIDE = PATCH_SIZE;

  const gridW = Math.ceil(inputSize / STRIDE);
  const gridH = Math.ceil(inputSize / STRIDE);
  const heatmap = new Float32Array(gridW * gridH);

  await new Promise(r => setTimeout(r, 50)); // let "Analyzing..." render

  // ── 4. Occlusion sensitivity ──
  // Reuse a single pixel buffer — reset to original on each iteration instead
  // of allocating a fresh Uint8ClampedArray (49+ × 200KB = wasteful).
  const occBuf = new Uint8ClampedArray(frameImageData.data.length);
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      // Reset to original frame, then grey-out only this patch
      occBuf.set(frameImageData.data);
      for (let py = 0; py < PATCH_SIZE; py++) {
        for (let px = 0; px < PATCH_SIZE; px++) {
          const ix = x * STRIDE + px;
          const iy = y * STRIDE + py;
          if (ix < inputSize && iy < inputSize) {
            const i4 = (iy * inputSize + ix) * 4;
            occBuf[i4] = occBuf[i4 + 1] = occBuf[i4 + 2] = 128;
          }
        }
      }

      // tf.browser.fromPixels reads the ImageData synchronously — occBuf is safe to reuse next iter
      const imgOcc = new ImageData(occBuf, inputSize, inputSize);
      const tOcc = tf.browser.fromPixels(imgOcc).toFloat().div(255).expandDims(0);
      const featOcc = baseModel.predict(tOcc);
      const predOcc = inferModel.predict(featOcc);
      const predsOcc = await predOcc.data();
      tOcc.dispose();
      featOcc.dispose();
      predOcc.dispose();

      heatmap[y * gridW + x] = Math.max(0, baseConf - predsOcc[baseClass]);

      if (x % 4 === 0) await new Promise(r => setTimeout(r, 0));
    }
  }

  // ── 5. Render heatmap onto overlay ──
  // Patches are drawn at display-scaled coordinates so the heatmap cells align
  // precisely over the image pixels they represent, at any DPR or container size.
  // Canvas blur smooths the hard patch edges without extra computation.
  const maxImportance = Math.max(...heatmap, 1e-6);
  const octx = overlay.getContext('2d');
  octx.clearRect(0, 0, overlay.width, overlay.height);

  // Dark vignette makes hot regions pop
  octx.fillStyle = 'rgba(0,0,0,0.55)';
  octx.fillRect(0, 0, overlay.width, overlay.height);

  // Blur proportional to patch display size for a smooth gradient look
  const blurPx = Math.round(PATCH_SIZE * scaleX * 0.45);
  octx.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const norm = heatmap[y * gridW + x] / maxImportance;
      if (norm > 0.1) {
        const hue = Math.round((1 - norm) * 50); // 50 (amber) → 0 (red)
        const alpha = 0.35 + norm * 0.65;
        octx.fillStyle = `hsla(${hue},100%,50%,${alpha})`;
        // Full PATCH_SIZE (no gap) — gaps create false structure; blur handles the edge
        octx.fillRect(
          x * STRIDE * scaleX,
          y * STRIDE * scaleY,
          PATCH_SIZE * scaleX,
          PATCH_SIZE * scaleY
        );
      }
    }
  }
  octx.filter = 'none';

  // ── 6. Show result ──
  if (resultEl) {
    const lbl = classNames[baseClass];
    const pct = (baseConf * 100).toFixed(1);
    resultEl.innerHTML = `<span style="color:${CLASS_COLORS[baseClass]}">${lbl} \u2014 ${pct}%</span>`;
    log('eval', lang === 'pl' ? `XAI: "${lbl}" (${pct}%)` : `XAI: "${lbl}" (${pct}%)`);
  }
}

function drawOverlay(id, label, conf, classIdx) {
  const wrap = document.getElementById('show-wrap-' + id);
  const overlay = document.getElementById('show-overlay-' + id);
  if (!overlay || !wrap) return;
  overlay.width = wrap.clientWidth || 256;
  overlay.height = wrap.clientHeight || 120;
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (!overlay.width || !overlay.height) return;
  const color = CLASS_COLORS[classIdx] || '#059669';
  // Background bar at bottom of video
  ctx.fillStyle = color + 'CC';
  ctx.fillRect(0, overlay.height - 38, overlay.width, 38);
  // Label text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.fillText(`${label}  ${(conf * 100).toFixed(1)}%`, 10, overlay.height - 22);
  // Confidence bar
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(10, overlay.height - 14, overlay.width - 20, 6);
  ctx.fillStyle = '#fff';
  ctx.fillRect(10, overlay.height - 14, (overlay.width - 20) * conf, 6);
}

function drawHistChart(id) {
  const cv = document.getElementById('hist-chart-' + id);
  if (!cv || predHistory.length < 2) return;
  const W = cv.offsetWidth || 256;
  const H = cv.height || 60;
  cv.width = W;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, W, H);
  const barW = W / 30;
  predHistory.forEach((p, i) => {
    ctx.fillStyle = CLASS_COLORS[p.idx] || '#059669';
    const bh = p.conf * (H - 4);
    ctx.fillRect(i * barW, H - bh - 2, barW - 2, bh);
  });
}

function freezeFrame(id) {
  frozenFrame = !frozenFrame;
  log('info', frozenFrame ? '❄️ Frame frozen' : '▶ Resumed');
}

// ===== FLOW BAR PHASE ACTIVATION =====
function setFlowPhase(phase) {
  document.querySelectorAll('.flow-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.phase === phase);
  });
}
function clearFlowPhase() {
  document.querySelectorAll('.flow-pill').forEach(pill => pill.classList.remove('active'));
}
const BLOCK_PHASE_MAP = {
  'camera-input': 'data', 'label-classes': 'label',
  'prepare-data': 'prep', 'pretrained-model': 'model',
  'train-model': 'train', 'save-model': 'deploy',
  'upload-model': 'data', 'camera-infer': 'data',
  'predict': 'deploy', 'show-results': 'deploy'
};

// ===== PIPELINE RUNNER =====
async function runPipeline() {
  // Sort blocks left-to-right by X position
  const sorted = [...placedBlocks].sort((a, b) => a.x - b.x);
  log('step', '=== Pipeline Start ===');

  for (const b of sorted) {
    const id = b.id;
    // Activate flow bar phase
    setFlowPhase(BLOCK_PHASE_MAP[b.type] || 'data');

    switch (b.type) {
      case 'prepare-data':
        await runPrepare(id);
        break;
      case 'pretrained-model':
        await runLoadBaseModel(id);
        break;
      case 'train-model':
        await runTraining(id);
        break;
    }
    // Edu mode annotations
    if (EDU_MODE) {
      const ann = document.getElementById('ann-' + id);
      const annotations = {
        'camera-input': '📷 Zbieramy dane treningowe — zdjęcia dla każdej klasy',
        'label-classes': '🏷️ Etykiety identyfikują każdą kategorię obrazów',
        'prepare-data': '⚙️ Zdjęcia są przeskalowane i augmentowane w Web Worker',
        'pretrained-model': '🧠 MobileNet widział 1.2M zdjęć — "transfer learning"',
        'train-model': '🚀 model.fit() dostosowuje wagi do naszych klas',
        'save-model': '💾 Wagi modelu zapisywane w IndexedDB przeglądarki',
        'upload-model': '📤 Wczytujemy wagi modelu z pliku .json + .bin',
        'camera-infer': '📷 Kamera streamuje klatki do predykcji',
        'predict': '🎯 model.predict() zwraca prawdopodobieństwa klas',
        'show-results': '📊 Wynik z najwyższym prawdopodobieństwem = predykcja'
      };
      if (ann && annotations[b.type]) ann.textContent = annotations[b.type];
    }
    await tf.nextFrame();
  }
  clearFlowPhase();
  log('success', '=== Pipeline Done ===');
}

// ===== GUIDE MODAL =====
function showGuide() {
  const modal = document.getElementById('guide-modal');
  if (modal) modal.classList.remove('hidden');
  renderGuideSteps();
}
function closeGuide() {
  const modal = document.getElementById('guide-modal');
  if (modal) modal.classList.add('hidden');
}
function saveGuidePrefs() {
  const chk = document.getElementById('chk-no-guide');
  localStorage.setItem('ml-blocks-no-guide', chk && chk.checked ? '1' : '0');
}
function renderGuideSteps() {
  const container = document.getElementById('guide-steps-container');
  if (!container) return;
  const steps = S.guide_steps || STRINGS.pl.guide_steps;
  const titleEl = document.querySelector('[data-i18n="guide_title"]');
  const subtitleEl = document.querySelector('[data-i18n="guide_subtitle"]');
  if (titleEl) titleEl.textContent = t('guide_title');
  if (subtitleEl) subtitleEl.textContent = t('guide_subtitle');
  container.innerHTML = steps.map((s, i) =>
    `<div class="guide-step">
  <div class="guide-step-num">${i + 1}</div>
  <div class="guide-step-text"><h4>${s.title}</h4><p>${s.desc}</p></div>
</div>`
  ).join('');
}

// ===== QUICK START — Pre-populate canvas =====
function quickStart() {
  const types = ['camera-input', 'label-classes', 'prepare-data', 'pretrained-model', 'train-model', 'save-model'];
  types.forEach((type, i) => placeBlock(type, 16 + i * 296, 40));
  log('step', lang === 'pl' ? 'Szybki start: bloki treningowe dodane!' : 'Quick start: training blocks placed!');
}

// ===== EDU MODE =====
if (EDU_MODE) {
  document.body.classList.add('edu-mode');
  document.body.style.fontSize = '18px';
}

// ===== INIT =====
window.activeClass = 0;

document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  renderGuideSteps();

  // Show guide on first visit
  const noGuide = localStorage.getItem('ml-blocks-no-guide') === '1';
  if (!noGuide) showGuide();

  // Canvas scroll sync
  const canvas = document.getElementById('canvas');
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
  }, { passive: false });

  // Quick start if EDU mode
  if (EDU_MODE) {
    setTimeout(quickStart, 300);
  }

  log('step', lang === 'pl' ? 'KlockiAI gotowy — przeciągnij bloki na tablicę!' : 'KlockiAI ready — drag blocks onto the canvas!');
  log('info', 'TensorFlow.js ' + (tf.version?.tfjs || tf.version || ''));
  // Wait for TF.js to fully initialize WebGL backend before reading it
  tf.ready().then(() => {
    log('info', 'Backend: ' + tf.getBackend());
  });
});
