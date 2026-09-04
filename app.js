// ===== CONSTANTS =====
const SCHEMA_VERSION = "v1";
const CLASS_COLORS = ['#0369A1', '#7C3AED', '#D97706', '#DC2626', '#059669', '#DB2777'];
// Feature-vector variant: 576-dim output, used as the frozen backbone for
// transfer-learning (Train Model block). The full classifier variant is loaded
// separately by the Zero-shot block — see CLASSIFIER_MODEL_URL.
const MODEL_URL = 'https://www.kaggle.com/models/google/mobilenet-v3/frameworks/tfJs/variations/small-100-224-feature-vector/versions/1/model.json?tfjs-format=file';
// Full MobileNetV3-Small with the original 1001-class ImageNet softmax head.
// Used by the Zero-shot block to demonstrate "what does the base model know
// without any training" — produces actual ImageNet probabilities.
const CLASSIFIER_MODEL_URL = 'https://www.kaggle.com/models/google/mobilenet-v3/frameworks/tfJs/variations/small-100-224-classification/versions/1/model.json?tfjs-format=file';

// ===== HTML ESCAPING =====
// Class names and model metadata are user-controlled and also arrive from
// imported dataset/model files that persist to IndexedDB/localStorage. Any of
// these strings interpolated into innerHTML is a stored-XSS sink, so escape at
// every such boundary. Escapes the five HTML-significant characters, covering
// both element-text and double-quoted-attribute contexts.
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== SEEDED PRNG =====
// mulberry32: tiny seeded generator returning floats in [0, 1). Used where a
// reproducible shuffle is wanted (evaluate hold-out split).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
    btn_guide: 'Przewodnik', btn_clear: 'Wyczyść', btn_run: 'Uruchom', btn_edu: '🎓 Edu', btn_tidy: '🧹 Uporządkuj',
    sidebar_training: 'Trening', sidebar_inference: 'Predykcja',
    block_camera_input: 'Kamera: Dane', block_label_classes: 'Etykiety klas',
    block_prepare_data: 'Dane', block_pretrained_model: 'Model bazowy',
    block_train_model: 'Trenuj model', block_save_model: 'Zapisz model',
    block_upload_model: 'Wczytaj model', block_camera_infer: 'Kamera: Predykcja',
    block_predict: 'Predykcja', block_show_results: 'Pokaż wyniki',
    block_zero_shot: 'Model bazowy / Predykcja', block_explain_ai: 'Explainable AI', block_model_explorer: 'Eksplorator modelu',
    block_evaluate: 'Ocena modelu', block_deploy_export: 'Eksport aplikacji',
    log_title: 'Pipeline Log',
    guide_title: 'Przewodnik — KlockiAI', guide_subtitle: 'Jak zbudować swój pierwszy model AI w przeglądarce',
    guide_close: 'OK', guide_dontshow: 'Nie pokazuj ponownie',
    status_idle: 'Oczekuje', status_running: 'Działa', status_done: 'Gotowe', status_error: 'Błąd',
    btn_start_camera: 'Uruchom kamerę', btn_stop_camera: 'Zatrzymaj',
    btn_capture: 'Zrób zdjęcie', btn_capture_hold: 'Zbierz próbki',
    param_resolution: 'Rozdzielczość', param_samples: 'Próbek/klasę',
    param_augment: 'Augmentacja', param_augment_none: 'Brak',
    param_epochs: 'Epoki', param_lr: 'Learning rate', param_batch: 'Batch size',
    param_freeze: 'Zamroź warstwy', param_fps: 'FPS', param_threshold: 'Próg',
    btn_load_model: 'Załaduj z CDN', btn_save_idb: 'Zapisz w przeglądarce',
    btn_download: 'Pobierz model', btn_load_idb: 'Wczytaj z przeglądarki',
    btn_pick_files: 'Wybierz plik (.json)', param_model_name: 'Nazwa modelu', lbl_no_saved_models: 'Brak zapisanych modeli',
    btn_train: 'Trenuj', btn_stop_train: 'Zatrzymaj',
    btn_freeze_frame: 'Zamroź klatkę', btn_run_xai: '🔍 Dlaczego? (Analizuj)',
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
    sidebar_dataset: 'Dataset',
    btn_export_dataset: '⬇ Pobierz dataset',
    btn_clear_dataset: '🗑 Usuń z pamięci',
    btn_load_dataset: '📂 Wczytaj dataset',
    log_prep_stale: 'Dane zmieniły się w trakcie przygotowania - uruchom "Przygotuj dane" ponownie.',
    confirm_clear_canvas: 'Wyczyścić obszar roboczy? Bloki i wczytane modele zostaną usunięte. Dataset pozostanie w pamięci przeglądarki.',
    confirm_clear_canvas_model: 'Wytrenowany model nie został jeszcze zapisany i zostanie utracony. Wyczyścić obszar roboczy? Dataset pozostanie w pamięci przeglądarki.',
    empty_title: 'Pusty obszar roboczy',
    empty_subtitle: 'Kliknij lub przeciągnij blok z lewej strony albo użyj szablonu',
    empty_qs_train: '🎓 Szybki start: Trening',
    empty_qs_infer: '🔮 Szybki start: Predykcja',
    empty_hint: 'Szablony dodają wszystkie potrzebne bloki w odpowiedniej kolejności.',
    prereq_label_samples: 'Próbki',
    prereq_label_prepared: 'Dane przygotowane',
    prereq_label_baseModel: 'Model bazowy',
    prereq_label_fullModel: 'Wytrenowany model',
    prereq_label_inferModel: 'Klasyfikator',
    prereq_label_inferStream: 'Kamera predykcji',
    prereq_label_classes: 'Min. 2 klasy',
    prereq_heading: 'Wymagania:',
    prereq_all_satisfied: 'Gotowe do uruchomienia',
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
    btn_guide: 'Guide', btn_clear: 'Clear', btn_run: 'Run', btn_edu: '🎓 Edu', btn_tidy: '🧹 Tidy up',
    sidebar_training: 'Training', sidebar_inference: 'Prediction',
    block_camera_input: 'Camera: Input', block_label_classes: 'Label Classes',
    block_prepare_data: 'Data', block_pretrained_model: 'Pretrained Model',
    block_train_model: 'Train Model', block_save_model: 'Save Model',
    block_upload_model: 'Load Model', block_camera_infer: 'Camera: Prediction',
    block_predict: 'Predict', block_show_results: 'Show Results',
    block_zero_shot: 'Base Model / Predict', block_explain_ai: 'Explainable AI', block_model_explorer: 'Model Explorer',
    block_evaluate: 'Evaluate Model', block_deploy_export: 'Export App',
    log_title: 'Pipeline Log',
    guide_title: 'Guide — KlockiAI', guide_subtitle: 'How to build your first AI model in the browser',
    guide_close: 'OK', guide_dontshow: 'Do not show again',
    status_idle: 'Idle', status_running: 'Running', status_done: 'Done', status_error: 'Error',
    btn_start_camera: 'Start Camera', btn_stop_camera: 'Stop',
    btn_capture: 'Capture', btn_capture_hold: 'Collect Samples',
    param_resolution: 'Resolution', param_samples: 'Samples/class',
    param_augment: 'Augmentation', param_augment_none: 'None',
    param_epochs: 'Epochs', param_lr: 'Learning rate', param_batch: 'Batch size',
    param_freeze: 'Freeze layers', param_fps: 'FPS', param_threshold: 'Threshold',
    btn_load_model: 'Load from CDN', btn_save_idb: 'Save to Browser',
    btn_download: 'Download model', btn_load_idb: 'Load from Browser',
    btn_pick_files: 'Pick file (.json)', param_model_name: 'Model name', lbl_no_saved_models: 'No saved models',
    btn_train: 'Train', btn_stop_train: 'Stop',
    btn_freeze_frame: 'Freeze Frame', btn_run_xai: '🔍 Why? (Analyze)',
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
    sidebar_dataset: 'Dataset',
    btn_export_dataset: '⬇ Download dataset',
    btn_clear_dataset: '🗑 Delete from storage',
    btn_load_dataset: '📂 Load dataset',
    log_prep_stale: 'Data changed during preparation - run "Prepare Data" again.',
    confirm_clear_canvas: 'Clear the workspace? Blocks and loaded models will be removed. The dataset stays in browser storage.',
    confirm_clear_canvas_model: 'The trained model has not been saved yet and will be lost. Clear the workspace? The dataset stays in browser storage.',
    empty_title: 'Empty workspace',
    empty_subtitle: 'Click or drag a block from the left, or use a template',
    empty_qs_train: '🎓 Quick start: Training',
    empty_qs_infer: '🔮 Quick start: Inference',
    empty_hint: 'Templates add every block you need, in the right order.',
    prereq_label_samples: 'Samples',
    prereq_label_prepared: 'Prepared data',
    prereq_label_baseModel: 'Base model',
    prereq_label_fullModel: 'Trained model',
    prereq_label_inferModel: 'Classifier',
    prereq_label_inferStream: 'Inference camera',
    prereq_label_classes: 'Min. 2 classes',
    prereq_heading: 'Needs:',
    prereq_all_satisfied: 'Ready to run',
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
// A corrupted stored value would make S undefined and t() throw at init.
if (!STRINGS[lang]) lang = 'pl';
let S = STRINGS[lang];
let placedBlocks = [];
let blockIdCounter = 0;
// Type -> first matching block record. Kept in sync via placeBlock /
// removeBlock so the inference hot path doesn't have to .find() per frame.
let blocksByType = {};
// Cached static NodeList; populated once after DOMContentLoaded.
let _flowPillEls = null;
// Predict-block UI state cache (set of <div.pred-row> nodes built once,
// then patched per frame instead of innerHTML rebuild).
const _predUI = new WeakMap(); // block -> { rows:[{label,pct,fill}], thrLabel }
// Rate-limit raw-probability log: only on class change or 1s elapsed.
let _lastLoggedClass = -1;
let _lastLogTime = 0;
let draggedPaletteType = null;
let dragOffsetX = 0, dragOffsetY = 0;
let draggedCard = null;

// Training state
let classNames = ['Klasa 1', 'Klasa 2'];
let classColors = CLASS_COLORS.slice(0, 2);
let capturedSamples = [[], []]; // per class, array of ImageData — dynamic
let preparedData = null; // {xs, ys}
// Bumped on every sample/class change. runPrepare records it on entry and
// discards a worker result produced from an older snapshot.
let datasetVersion = 0;
function invalidatePreparedData() {
  preparedData = null;
  datasetVersion++;
}
let baseModel = null;
let fullModel = null;
let trainingCancelled = false;
let modelMetadata = null;
let inferModel = null;
let inferMetadata = null;
let inferInterval = null;
// Single-flight guards — these long-running async actions share global state
// (preparedData, fullModel, baseModel, the chart histories), so overlapping
// invocations corrupt each other. Each guard is set on entry and cleared in a
// finally block.
let trainingInProgress = false;
let pipelineRunning = false;
let prepareInProgress = false;
let baseModelLoading = false;
let modelFileLoading = false;
// Educational mode: shows annotation tooltips above each block, disables drag
// repositioning, and pre-populates a training pipeline. Toggleable from the
// topbar; URL param ?edu=1 also enables it (for embedding in iframes).
let eduMode = (new URLSearchParams(location.search).get('edu') === '1')
  || (localStorage.getItem('ml-blocks-edu') === '1');
// (toggleEduMode below mutates `eduMode` — every consumer reads the live let.)

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
  // Re-render dynamic block content. Titles refresh cheaply for every block;
  // the block BODY (buttons, param labels, hints) is baked at build time from
  // t(), so it must be rebuilt to switch language — otherwise the canvas shows
  // a mix of both languages until some unrelated action re-renders it.
  placedBlocks.forEach(b => {
    if (!b.card) return;
    refreshBlockText(b);
    // Skip blocks with live runtime state (streaming camera, running inference,
    // in-flight training) — rebuilding their innerHTML would orphan the <video>,
    // interval target, or training chart. They self-heal on stop/restart.
    if (isBlockBusy(b)) return;
    const body = b.card.querySelector('.bk-body');
    if (body) {
      body.innerHTML = renderBlockBody(b.type, b.id);
      initBlockAfterPlace(b.id, b.type);
      if (eduMode) {
        b.card.querySelectorAll('[onmousedown]').forEach(el => el.removeAttribute('onmousedown'));
        b.card.querySelectorAll('[ontouchstart]').forEach(el => el.removeAttribute('ontouchstart'));
      }
    }
  });
  refreshAllPrereqStrips();
  refreshAllAnnotations();
  evaluatePipelineState();
}

// A block is "busy" when it holds live runtime state that a full innerHTML
// rebuild would destroy. Used to protect such blocks from the language rebuild.
function isBlockBusy(b) {
  switch (b.type) {
    case 'camera-input': return !!cameraStreams[b.id];
    case 'camera-infer':
    case 'show-results': return !!inferInterval;
    case 'zero-shot': return !!zsIntervals[b.id];
    case 'train-model': return trainingInProgress;
    default: return false;
  }
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

// Click-to-add: place the palette block on the canvas without dragging. Drops it
// into the currently-visible area of the canvas, staggered so blocks don't stack
// exactly on top of each other. (Drag-and-drop doesn't fire a click, so the two
// input methods don't collide.)
function paletteAddBlock(el) {
  const type = el && el.dataset ? el.dataset.type : null;
  if (!type) return;
  const canvas = document.getElementById('canvas');
  const sx = canvas ? canvas.scrollLeft : 0;
  const sy = canvas ? canvas.scrollTop : 0;
  const n = placedBlocks.length;
  placeBlock(type, sx + 24 + (n % 6) * 26, sy + 24 + (n % 6) * 26);
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

// Educational notes shown at the top of certain blocks. They explain the
// implicit data-flow relationships between blocks (which block "listens" to
// which) — the prereq strip alone tells you what's missing, not why.
const BLOCK_NOTES = {
  'show-results': {
    pl: 'Reaguje na klatki z bloku „Kamera: Predykcja" — pokazuje obraz, paski pewności klas i wynik na żywo.',
    en: 'Listens to frames from "Camera: Prediction" — shows the image, per-class confidence bars and the live prediction.'
  },
  'explain-ai': {
    pl: 'Analizuje pojedynczą klatkę kamery predykcji i pokazuje, które obszary wpłynęły na decyzję.',
    en: 'Analyses a single inference-camera frame and highlights which regions drove the decision.'
  },
  'zero-shot': {
    pl: 'Pokazuje, co model bazowy rozpoznaje samodzielnie — przed jakimkolwiek treningiem.',
    en: 'Shows what the base model recognises on its own — before any training.'
  }
};

function renderBlockNote(type) {
  const n = BLOCK_NOTES[type];
  if (!n) return '';
  return `<div class="bk-note">${n[lang] || n.en}</div>`;
}

// EDU-mode annotations rendered above each block when teaching mode is on.
// Bilingual; keeps the lesson short and conceptual rather than instructional.
const EDU_ANNOTATIONS = {
  'camera-input':     { pl: '📷 Zbieramy dane treningowe — zdjęcia dla każdej klasy', en: '📷 Collect training data — images for each class' },
  'label-classes':    { pl: '🏷️ Etykiety identyfikują każdą kategorię obrazów',     en: '🏷️ Labels identify each image category' },
  'prepare-data':     { pl: '⚙️ Zdjęcia są przeskalowane i augmentowane w Web Worker', en: '⚙️ Images resized + augmented in a Web Worker' },
  'pretrained-model': { pl: '🧠 MobileNet widział 1.2M zdjęć — "transfer learning"',  en: '🧠 MobileNet has seen 1.2M images — "transfer learning"' },
  'train-model':      { pl: '🚀 model.fit() dostosowuje wagi do naszych klas',         en: '🚀 model.fit() adapts weights to your classes' },
  'save-model':       { pl: '💾 Wagi modelu zapisywane w IndexedDB przeglądarki',    en: '💾 Model weights saved to browser IndexedDB' },
  'upload-model':     { pl: '📤 Wczytujemy wagi modelu z pliku .json + .bin',        en: '📤 Load model weights from .json + .bin file' },
  'camera-infer':     { pl: '📷 Kamera streamuje klatki do predykcji',                en: '📷 Camera streams frames for prediction' },
  'show-results':     { pl: '🎯 model.predict() — paski pewności + klasa o najwyższym prawdopodobieństwie', en: '🎯 model.predict() — confidence bars + class with the highest probability' },
  'zero-shot':        { pl: '🌍 1001 klas ImageNet — to, co MobileNet już zna',      en: '🌍 1001 ImageNet classes — what MobileNet already knows' },
  'explain-ai':       { pl: '🔍 Sprawdzamy które fragmenty obrazu wpływają na decyzję', en: '🔍 Find which image regions drove the decision' },
  'model-explorer':   { pl: '🔬 Architektura warstwa po warstwie',                   en: '🔬 Architecture layer by layer' },
  'evaluate':         { pl: '📊 Prawdziwy test: trenuje na 80%, sprawdza na niewidzianych 20%', en: '📊 True hold-out: trains on 80%, tests on the unseen 20%' },
  'deploy-export':    { pl: '🚀 Eksportuj działającą aplikację z modelem w środku',   en: '🚀 Export a working app with the model baked in' }
};
function getEduAnnotation(type) {
  const a = EDU_ANNOTATIONS[type];
  return a ? (a[lang] || a.en) : '';
}

// ===== DATASET PERSISTENCE (IndexedDB) =====
// Each class's captured ImageData objects are JPEG-encoded and stored in IDB.
// JPEG at quality 0.82 reduces each 224×224 sample from ~200 KB to ~10-15 KB,
// keeping a 50-sample × 6-class dataset under 5 MB total.
//
// Schema:  DB 'ml-blocks-v2'  /  objectStore 'dataset'
//   key:   classIndex (integer 0-5)
//   value: { name, color, jpegData: ArrayBuffer[] }

const DATASET_DB_NAME = 'ml-blocks-v2';
const DATASET_STORE   = 'dataset';
let _datasetDB = null;
let _saveDebounceTimers = {};

function openDatasetDB() {
  if (_datasetDB) return Promise.resolve(_datasetDB);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATASET_DB_NAME, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(DATASET_STORE);
    };
    req.onsuccess = e => { _datasetDB = e.target.result; resolve(_datasetDB); };
    req.onerror   = e => reject(e.target.error);
  });
}

// Encode one ImageData as a JPEG ArrayBuffer.
function imageDataToJPEG(imgData, quality) {
  return new Promise((resolve, reject) => {
    const cv = document.createElement('canvas');
    cv.width = imgData.width; cv.height = imgData.height;
    cv.getContext('2d').putImageData(imgData, 0, 0);
    cv.toBlob(blob => {
      // toBlob yields null if the canvas is tainted or encoding fails — reject
      // so callers surface an error instead of awaiting a promise that never
      // settles.
      if (!blob) { reject(new Error('JPEG encoding failed')); return; }
      blob.arrayBuffer().then(resolve, reject);
    }, 'image/jpeg', quality || 0.82);
  });
}

// Decode a JPEG ArrayBuffer back to ImageData. Rejects on a corrupt/undecodable
// buffer (e.g. an imported dataset file with garbage sample data) — without a
// reject path a single bad sample would hang import/load forever.
function jpegToImageData(buf, width, height) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buf], { type: 'image/jpeg' });
    createImageBitmap(blob).then(bmp => {
      const cv = document.createElement('canvas');
      cv.width = width || bmp.width; cv.height = height || bmp.height;
      cv.getContext('2d').drawImage(bmp, 0, 0);
      resolve(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height));
    }, reject);
  });
}

// Cancel every pending debounced save. Must be called before any operation that
// repacks or clears class indices (delete class, clear dataset, import) —
// otherwise a timer scheduled under an old index fires afterwards and writes a
// phantom record at a now-invalid key.
function cancelAllPendingSaves() {
  Object.values(_saveDebounceTimers).forEach(clearTimeout);
  _saveDebounceTimers = {};
}

// Actually encode + persist one class. Returns a promise that resolves when the
// IDB write commits, so callers that need durability (import, delete) can await.
async function writeClassToIDB(classIdx) {
  // A write racing the initial load would store only the samples captured so
  // far and drop the ones still being decoded from IDB for that class.
  if (datasetLoadPromise) await datasetLoadPromise;
  const db = await openDatasetDB();
  const samples = capturedSamples[classIdx] || [];
  const jpegData = await Promise.all(samples.map(imgData => imageDataToJPEG(imgData)));
  const record = { name: classNames[classIdx], color: classColors[classIdx], jpegData };
  await new Promise((res, rej) => {
    const tx = db.transaction(DATASET_STORE, 'readwrite');
    const req = tx.objectStore(DATASET_STORE).put(record, classIdx);
    req.onsuccess = res; req.onerror = e => rej(e.target.error);
  });
}

// Save one class's samples to IDB. Debounced per-class to avoid hammering the
// encoder during rapid capture bursts. Returns a promise that resolves once the
// scheduled write completes (immediate=true skips the debounce).
function saveClassToIDB(classIdx, immediate) {
  if (!classIdx && classIdx !== 0) return Promise.resolve();
  // Any change to the captured samples invalidates the prepared training
  // snapshot — otherwise training silently runs on stale data.
  invalidatePreparedData();
  clearTimeout(_saveDebounceTimers[classIdx]);
  const delay = immediate ? 0 : 600;
  return new Promise(resolve => {
    _saveDebounceTimers[classIdx] = setTimeout(async () => {
      try {
        await writeClassToIDB(classIdx);
      } catch (err) {
        console.warn('saveClassToIDB failed:', err);
      } finally {
        resolve();
      }
    }, delay);
  });
}

// Restore all classes from IDB into classNames / classColors / capturedSamples.
// Called when a camera-input or label-classes block is placed.
let datasetLoadPromise = null;
// True once the stored dataset has been pulled into memory (or confirmed empty).
// After that, placing another block just refreshes the UI from the in-memory
// arrays rather than re-reading IDB — re-reading could overwrite samples the
// user captured this session (the read races the 600 ms debounced save).
let datasetLoadedFromIDB = false;
function refreshDatasetUI() {
  updateSampleCounts();
  placedBlocks.filter(b => b.type === 'label-classes').forEach(b => {
    const body = document.getElementById(b.id)?.querySelector('.bk-body');
    if (body) body.innerHTML = renderLabelRows(b.id);
  });
  placedBlocks.filter(b => b.type === 'camera-input').forEach(b => updateThumbStrips(b.id));
  evaluatePipelineState();
  refreshDatasetInfo();
}
async function loadDatasetFromIDB() {
  // Already restored — just re-sync the newly-placed block's UI from memory.
  if (datasetLoadedFromIDB) { refreshDatasetUI(); return; }
  if (datasetLoadPromise) return datasetLoadPromise;
  datasetLoadPromise = (async () => {
    try {
      const db = await openDatasetDB();
      // Read keys and records in ONE transaction so index ki lines up between
      // them — two separate transactions can straddle a concurrent write and
      // misalign records against keys.
      const { keys, records } = await new Promise((res, rej) => {
        const tx = db.transaction(DATASET_STORE, 'readonly');
        const store = tx.objectStore(DATASET_STORE);
        const kReq = store.getAllKeys();
        const rReq = store.getAll();
        tx.oncomplete = () => res({ keys: kReq.result, records: rReq.result });
        tx.onerror = e => rej(e.target.error);
      });
      if (!keys.length) return; // nothing stored yet

      // Restore class metadata first (fast)
      const maxKey = Math.max(...keys);
      // Expand arrays to match stored class count
      while (classNames.length <= maxKey) { classNames.push(''); classColors.push(CLASS_COLORS[classNames.length - 1] || '#64748B'); capturedSamples.push([]); }
      for (let ki = 0; ki < keys.length; ki++) {
        const idx = keys[ki];
        const rec = records[ki];
        if (!rec) continue;
        classNames[idx] = rec.name;
        classColors[idx] = rec.color || classColors[idx];
      }
      log('info', lang === 'pl'
        ? `Wczytywanie ${keys.length} klas z bazy danych...`
        : `Loading ${keys.length} classes from database...`);

      // Decode JPEG blobs — done in parallel per class. Skip any class that
      // already has in-memory samples (captured while this load was in flight)
      // so we don't discard them. A bad sample rejects instead of hanging.
      const decodePromises = keys.map(async (idx, ki) => {
        const rec = records[ki];
        if (!rec || !rec.jpegData || !rec.jpegData.length) return;
        if (capturedSamples[idx] && capturedSamples[idx].length) return;
        try {
          capturedSamples[idx] = await Promise.all(rec.jpegData.map(buf => jpegToImageData(buf)));
        } catch (e) {
          console.warn('Skipping undecodable samples for class', idx, e);
        }
      });
      await Promise.all(decodePromises);

      log('success', lang === 'pl'
        ? `Dataset załadowany: ${capturedSamples.flat().length} próbek`
        : `Dataset loaded: ${capturedSamples.flat().length} samples`);
      refreshDatasetUI();
    } catch (err) {
      console.warn('loadDatasetFromIDB failed:', err);
    } finally {
      datasetLoadedFromIDB = true;
      datasetLoadPromise = null;
    }
  })();
  return datasetLoadPromise;
}

// Remove a single class entry from IDB and repack remaining entries so keys
// stay contiguous (0, 1, 2 … n-1).
async function deleteClassFromIDB(classIdx) {
  // Kill any pending debounced writes first — one firing after the repack would
  // resurrect a class at a stale index.
  cancelAllPendingSaves();
  try {
    const db = await openDatasetDB();
    // Read AND repack inside a single readwrite transaction so keys/records stay
    // aligned and no concurrent write can slip between read and rebuild.
    await new Promise((res, rej) => {
      const tx = db.transaction(DATASET_STORE, 'readwrite');
      const store = tx.objectStore(DATASET_STORE);
      const kReq = store.getAllKeys();
      const rReq = store.getAll();
      rReq.onsuccess = () => {
        const keys = kReq.result;      // completes before rReq (same store, FIFO)
        const records = rReq.result;
        store.clear();
        let newIdx = 0;
        for (let ki = 0; ki < keys.length; ki++) {
          if (keys[ki] === classIdx) continue;
          store.put(records[ki], newIdx++);
        }
      };
      tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
    });
  } catch (err) {
    console.warn('deleteClassFromIDB failed:', err);
  }
}

// ===== DATASET EXPORT / IMPORT =====
// Format: { version: 'dataset-v1', exportedAt: ISO, classes: [{name, color, samples: base64[]}] }
// JPEG quality 0.82 keeps each sample ~10-15 KB; a typical 50-sample × 3-class
// dataset downloads as a ~2 MB JSON file.

async function exportDataset() {
  const total = capturedSamples.flat().length;
  if (total === 0) {
    log('warn', lang === 'pl' ? 'Brak próbek do pobrania.' : 'No samples to export.');
    return;
  }
  log('step', lang === 'pl' ? 'Przygotowywanie datasetu...' : 'Preparing dataset...');
  try {
    const classes = await Promise.all(classNames.map(async (name, i) => {
      const samples = capturedSamples[i] || [];
      const jpegBuffers = await Promise.all(samples.map(imgData => imageDataToJPEG(imgData)));
      // Convert ArrayBuffer → base64 string for JSON embedding
      const base64Samples = jpegBuffers.map(buf => {
        const bytes = new Uint8Array(buf);
        const CHUNK = 0x8000;
        const parts = [];
        for (let j = 0; j < bytes.length; j += CHUNK) {
          parts.push(String.fromCharCode.apply(null, bytes.subarray(j, j + CHUNK)));
        }
        return btoa(parts.join(''));
      });
      return { name, color: classColors[i], samples: base64Samples };
    }));
    const bundle = {
      version: 'dataset-v1',
      exportedAt: new Date().toISOString(),
      classes
    };
    const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'klocki-dataset.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    log('success', lang === 'pl'
      ? `Dataset pobrany (${total} próbek, ${classes.length} klas)`
      : `Dataset downloaded (${total} samples, ${classes.length} classes)`);
  } catch (err) {
    log('error', 'Export error: ' + err.message);
  }
}

async function importDataset(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  // Let an in-flight IDB load finish first, otherwise it would resurrect the
  // old classes on top of the imported ones.
  if (datasetLoadPromise) await datasetLoadPromise;
  log('step', lang === 'pl' ? 'Wczytywanie datasetu z pliku...' : 'Loading dataset from file...');
  try {
    const text = await file.text();
    const bundle = JSON.parse(text);
    if (bundle.version !== 'dataset-v1' || !Array.isArray(bundle.classes)) {
      log('error', lang === 'pl' ? 'Nieprawidłowy format pliku datasetu.' : 'Invalid dataset file format.');
      return;
    }
    // Decode each class
    const newNames = [];
    const newColors = [];
    const newSamples = [];
    for (const cls of bundle.classes) {
      // Coerce: a non-string name would persist and later throw on .trim().
      const name = String(cls.name ?? '').trim();
      newNames.push(name || (lang === 'pl' ? 'Klasa' : 'Class'));
      // Accept stored color or assign next pool color
      const usedSoFar = new Set(newColors);
      newColors.push(cls.color && CLASS_COLORS.includes(cls.color) && !usedSoFar.has(cls.color)
        ? cls.color
        : CLASS_COLORS.find(c => !usedSoFar.has(c)) || CLASS_COLORS[newNames.length % CLASS_COLORS.length]);
      // Decode each sample independently; skip (rather than abort on) any
      // corrupt sample so one bad frame doesn't sink the whole import.
      const decoded = (await Promise.all((cls.samples || []).map(b64 => {
        try {
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return jpegToImageData(bytes.buffer).catch(() => null);
        } catch (_) { return null; }
      }))).filter(Boolean);
      newSamples.push(decoded);
    }
    // Cap at CLASS_COLORS.length classes
    classNames    = newNames.slice(0, CLASS_COLORS.length);
    classColors   = newColors.slice(0, CLASS_COLORS.length);
    capturedSamples = newSamples.slice(0, CLASS_COLORS.length);
    preparedData  = null;

    // Persist to IDB. Cancel pending debounced writes, then WIPE the store so
    // classes from a previous (larger) dataset can't survive at higher keys and
    // get merged back in on the next load. Await the writes so the success log
    // reflects durable state, not a fire-and-forget.
    cancelAllPendingSaves();
    await clearDatasetStore();
    for (let i = 0; i < classNames.length; i++) await writeClassToIDB(i);
    datasetLoadedFromIDB = true;

    // Refresh all block UIs
    placedBlocks.filter(b => b.type === 'label-classes').forEach(b => {
      const body = document.getElementById(b.id)?.querySelector('.bk-body');
      if (body) body.innerHTML = renderLabelRows(b.id);
    });
    placedBlocks.filter(b => b.type === 'camera-input').forEach(b => updateThumbStrips(b.id));
    updateSampleCounts();
    evaluatePipelineState();
    persistCanvasState();
    refreshDatasetInfo();
    const total = capturedSamples.flat().length;
    log('success', lang === 'pl'
      ? `Dataset wczytany: ${classNames.length} klas, ${total} próbek`
      : `Dataset loaded: ${classNames.length} classes, ${total} samples`);
  } catch (err) {
    log('error', 'Import error: ' + err.message);
    console.error(err);
  }
  input.value = ''; // reset so same file can be re-picked
}

function refreshDatasetInfo() {
  const el = document.getElementById('dataset-info');
  if (!el) return;
  const total = capturedSamples.flat().length;
  if (total === 0) { el.textContent = ''; return; }
  const perClass = classNames.map((n, i) => `${n}: ${(capturedSamples[i] || []).length}`).join(' · ');
  el.textContent = `${total} ${lang === 'pl' ? 'próbek' : 'samples'} — ${perClass}`;
}

async function confirmClearDataset() {
  // Wait for an in-flight IDB load: clearing mid-load would leave zombie data
  // in memory that the load then reports as restored.
  if (datasetLoadPromise) await datasetLoadPromise;
  const totalSamples = capturedSamples.flat().length;
  if (totalSamples === 0) {
    showToast(lang === 'pl' ? 'Brak próbek do usunięcia.' : 'No samples to delete.', 'info', { duration: 2500 });
    return;
  }
  // Snapshot the whole dataset for undo before wiping.
  const snapshot = {
    names: classNames.slice(),
    colors: classColors.slice(),
    samples: capturedSamples.map(a => a.slice())
  };
  clearDatasetFromIDB();
  datasetLoadedFromIDB = true; // in-memory is now authoritative; don't re-read
  classNames = lang === 'pl' ? ['Klasa 1', 'Klasa 2'] : ['Class 1', 'Class 2'];
  classColors = CLASS_COLORS.slice(0, 2);
  capturedSamples = [[], []];
  invalidatePreparedData();
  refreshLabelAndCameraBlocks();
  updateClassNamesEverywhere();
  evaluatePipelineState();
  persistCanvasState();
  refreshDatasetInfo();
  log('warn', lang === 'pl' ? 'Dataset usunięty z pamięci' : 'Dataset deleted from storage');

  showToast(
    lang === 'pl' ? `Usunięto dataset (${totalSamples} próbek)` : `Deleted dataset (${totalSamples} samples)`,
    'warn',
    {
      duration: 8000,
      actionLabel: lang === 'pl' ? 'Cofnij' : 'Undo',
      onAction: async () => {
        classNames = snapshot.names;
        classColors = snapshot.colors;
        capturedSamples = snapshot.samples;
        invalidatePreparedData();
        cancelAllPendingSaves();
        await clearDatasetStore();
        for (let i = 0; i < classNames.length; i++) await writeClassToIDB(i);
        refreshLabelAndCameraBlocks();
        updateClassNamesEverywhere();
        evaluatePipelineState();
        persistCanvasState();
        refreshDatasetInfo();
        log('info', lang === 'pl' ? 'Dataset przywrócony' : 'Dataset restored');
      }
    }
  );
}

// Low-level store wipe (awaitable), shared by the clear-dataset action and the
// import flow.
async function clearDatasetStore() {
  const db = await openDatasetDB();
  await new Promise((res, rej) => {
    const tx = db.transaction(DATASET_STORE, 'readwrite');
    tx.objectStore(DATASET_STORE).clear();
    tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
  });
}

async function clearDatasetFromIDB() {
  // Cancel pending debounced writes so none re-inserts a record after the wipe.
  cancelAllPendingSaves();
  try {
    await clearDatasetStore();
  } catch (err) {
    console.warn('clearDatasetFromIDB failed:', err);
  }
}

// ===== CANVAS STATE PERSISTENCE =====
// Save the *layout* (block types + positions) and class names to localStorage
// after every relevant change. Restore on DOMContentLoaded so an accidental
// page reload doesn't wipe out the user's setup. Trained models and samples
// are intentionally NOT persisted — they're large and live in IndexedDB
// (Save Model block) where the user explicitly opted in.
const CANVAS_STATE_KEY = 'ml-blocks-canvas-v1';
let canvasStateRestoring = false;

function persistCanvasState() {
  if (canvasStateRestoring) return; // avoid clobbering during initial restore
  try {
    const state = {
      blocks: placedBlocks.map(b => ({ type: b.type, x: b.x, y: b.y })),
      classNames: classNames.slice(),
      classColors: classColors.slice()
    };
    localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify(state));
  } catch (_) { /* quota / disabled storage — silent */ }
}

function restoreCanvasState() {
  let raw = null;
  try { raw = localStorage.getItem(CANVAS_STATE_KEY); } catch (_) { return; }
  if (!raw) return;
  let state;
  try { state = JSON.parse(raw); } catch (_) { return; }
  if (!state || !Array.isArray(state.blocks)) return;
  canvasStateRestoring = true;
  try {
    // Only accept a well-formed list of >= 2 strings; anything else (e.g. a
    // number persisted from a bad import) falls back to the defaults.
    const validNames = Array.isArray(state.classNames) && state.classNames.length >= 2 &&
      state.classNames.every(n => typeof n === 'string');
    if (validNames) {
      classNames = state.classNames.slice();
      if (Array.isArray(state.classColors) && state.classColors.length === classNames.length) {
        classColors = state.classColors.slice();
      } else {
        // Back-fill colors for saves created before stable-color change.
        classColors = classNames.map((_, i) => CLASS_COLORS[i % CLASS_COLORS.length]);
      }
      while (capturedSamples.length < classNames.length) capturedSamples.push([]);
    }
    state.blocks.forEach(b => {
      if (!b || typeof b.type !== 'string') return;
      // Legacy: 'predict' was merged into 'show-results'; map it forward.
      let type = b.type;
      if (type === 'predict') type = 'show-results';
      // Skip duplicate show-results when both legacy predict AND show-results existed.
      if (type === 'show-results' && placedBlocks.some(x => x.type === 'show-results')) return;
      placeBlock(type, b.x || 16, b.y || 40);
    });
  } finally {
    canvasStateRestoring = false;
  }
}

// Toggle EDU/teaching mode at runtime. Persisted in localStorage so the next
// visit remembers the setting. Annotations re-render via refreshAllAnnotations.
function toggleEduMode() {
  eduMode = !eduMode;
  localStorage.setItem('ml-blocks-edu', eduMode ? '1' : '0');
  document.body.classList.toggle('edu-mode', eduMode);
  refreshAllAnnotations();
  const btn = document.getElementById('btn-edu');
  if (btn) btn.classList.toggle('active', eduMode);
}

function refreshAllAnnotations() {
  placedBlocks.forEach(b => {
    const ann = document.getElementById('ann-' + b.id);
    if (ann) ann.textContent = eduMode ? (getEduAnnotation(b.type) || '') : '';
  });
}

// ===== BLOCK PREREQUISITES =====
// Each block type declares the pipeline state keys it needs to function.
// The prereq strip rendered at the top of every block body shows a green/red
// pill per requirement, so users see at a glance what's missing without
// having to click "Run" and read the log panel.
const BLOCK_PREREQS = {
  'camera-input': [],
  'label-classes': [],
  'prepare-data': ['samples'],
  'pretrained-model': [],
  'train-model': ['samples', 'classes', 'prepared', 'baseModel'],
  'save-model': ['fullModel', 'baseModel'],
  'upload-model': [],
  'camera-infer': ['inferModel', 'baseModel'],
  'show-results': ['inferModel', 'baseModel', 'inferStream'],
  'zero-shot': [], // self-contained — loads its own classifier on demand
  'explain-ai': ['inferModel', 'baseModel', 'inferStream'],
  'model-explorer': [],
  'evaluate': ['baseModel', 'samples', 'classes'], // trains fresh head on 80%, tests 20%
  'deploy-export': ['fullModel', 'baseModel']
};

function evalPrereq(key) {
  switch (key) {
    case 'samples': return capturedSamples.some(a => a && a.length > 0);
    case 'classes': return classNames.length >= 2 && classNames.every(n => (n || '').trim().length > 0);
    case 'prepared': return !!preparedData;
    case 'baseModel': return !!baseModel;
    case 'fullModel': return !!fullModel;
    case 'inferModel': return !!inferModel;
    case 'inferStream': return !!inferCameraStream;
    default: return false;
  }
}

function renderPrereqStrip(type) {
  const reqs = BLOCK_PREREQS[type] || [];
  if (reqs.length === 0) return '';
  const pills = reqs.map(key => {
    const ok = evalPrereq(key);
    const label = t('prereq_label_' + key) || key;
    return `<span class="prereq-pill ${ok ? 'ok' : 'missing'}"><span class="prereq-mark">${ok ? '✓' : '○'}</span>${label}</span>`;
  }).join('');
  const allOk = reqs.every(k => evalPrereq(k));
  const heading = allOk ? t('prereq_all_satisfied') : t('prereq_heading');
  return `<div class="bk-prereq ${allOk ? 'all-ok' : ''}">
    <div class="prereq-heading">${heading}</div>
    <div class="prereq-pills">${pills}</div>
  </div>`;
}

// Diff-based update: build the strip DOM ONCE per block, then toggle pill
// classes/text on subsequent calls. Avoids parsing the same template into
// new elements on every state change. Forced full rebuild when language
// changes (heading + labels are translated).
let _prereqRenderedLang = null;
function refreshAllPrereqStrips() {
  const langChanged = _prereqRenderedLang !== lang;
  if (langChanged) _prereqRenderedLang = lang;
  for (let bi = 0; bi < placedBlocks.length; bi++) {
    const b = placedBlocks[bi];
    const slot = document.getElementById('prereq-' + b.id);
    if (!slot) continue;
    if (langChanged || slot.dataset.built !== '1') {
      slot.innerHTML = renderPrereqStrip(b.type);
      slot.dataset.built = '1';
      continue;
    }
    const reqs = BLOCK_PREREQS[b.type] || [];
    if (reqs.length === 0) continue;
    const wrap = slot.firstElementChild;
    if (!wrap) continue;
    let allOk = true;
    const pills = wrap.querySelectorAll('.prereq-pill');
    for (let i = 0; i < pills.length && i < reqs.length; i++) {
      const ok = evalPrereq(reqs[i]);
      if (!ok) allOk = false;
      pills[i].classList.toggle('ok', ok);
      pills[i].classList.toggle('missing', !ok);
      const mark = pills[i].firstElementChild;
      if (mark && mark.classList.contains('prereq-mark')) {
        mark.textContent = ok ? '✓' : '○';
      }
    }
    wrap.classList.toggle('all-ok', allOk);
    const heading = wrap.querySelector('.prereq-heading');
    if (heading) heading.textContent = allOk ? t('prereq_all_satisfied') : t('prereq_heading');
  }
}

// Offer to add a missing prerequisite block to the canvas. Returns true if the
// block already exists or was added; false if the user declined.
function ensureBlockOnCanvas(type) {
  if (placedBlocks.some(b => b.type === type)) return true;
  const titles = {
    'camera-input': lang === 'pl' ? 'Kamera: Dane' : 'Camera: Input',
    'label-classes': lang === 'pl' ? 'Etykiety klas' : 'Label Classes',
    'prepare-data': lang === 'pl' ? 'Augmentacja danych' : 'Prepare Data',
    'pretrained-model': lang === 'pl' ? 'Model bazowy' : 'Pretrained Model',
    'train-model': lang === 'pl' ? 'Trenuj model' : 'Train Model',
    'save-model': lang === 'pl' ? 'Zapisz model' : 'Save Model',
    'upload-model': lang === 'pl' ? 'Wczytaj model' : 'Load Model',
    'camera-infer': lang === 'pl' ? 'Kamera: Predykcja' : 'Camera: Prediction',
    'show-results': lang === 'pl' ? 'Pokaż wyniki' : 'Show Results'
  };
  const name = titles[type] || type;
  // Auto-add the missing prerequisite block — it's non-destructive and expected,
  // so no need to interrupt with a confirm; just place it and note it.
  const x = 16 + (placedBlocks.length * 40);
  const y = 40 + (placedBlocks.length * 40);
  placeBlock(type, Math.min(x, 600), Math.min(y, 400));
  showToast(lang === 'pl' ? `Dodano brakujący blok „${name}"` : `Added missing "${name}" block`, 'info', { duration: 3000 });
  return true;
}

// ===== BLOCK STATUS =====
function setBlockStatus(card, status) {
  if (!card) return; // block removed while an async action was in flight
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
    'show-results': 'var(--c-eval)', 'zero-shot': 'var(--c-model)',
    'explain-ai': 'var(--c-eval)', 'model-explorer': 'var(--c-eval)', 'evaluate': 'var(--c-eval)', 'deploy-export': 'var(--c-deploy)'
  };
  const phases = {
    'camera-input': 'DATA', 'label-classes': 'LABEL', 'prepare-data': 'PREP',
    'pretrained-model': 'MODEL', 'train-model': 'TRAIN', 'save-model': 'DEPLOY',
    'upload-model': 'DATA', 'camera-infer': 'DATA',
    'show-results': 'PRED', 'zero-shot': 'PRED',
    'explain-ai': 'EVAL', 'model-explorer': 'EVAL', 'evaluate': 'EVAL', 'deploy-export': 'DEPLOY'
  };
  const titles = {
    'camera-input': t('block_camera_input'), 'label-classes': t('block_label_classes'),
    'prepare-data': t('block_prepare_data'), 'pretrained-model': t('block_pretrained_model'),
    'train-model': t('block_train_model'), 'save-model': t('block_save_model'),
    'upload-model': t('block_upload_model'), 'camera-infer': t('block_camera_infer'),
    'show-results': t('block_show_results'), 'zero-shot': t('block_zero_shot'),
    'explain-ai': t('block_explain_ai'), 'model-explorer': t('block_model_explorer'), 'evaluate': t('block_evaluate'), 'deploy-export': t('block_deploy_export')
  };
  const bg = phaseColors[type] || '#64748B';
  const phase = phases[type] || '';
  const title = titles[type] || type;

  return `
<div class="bk-header" style="background:${bg}" onmousedown="cardDragStart(event,'${id}')" ontouchstart="cardDragStart(event,'${id}')" ondblclick="toggleCollapse('${id}')">
  <span class="drag-handle">⠸</span>
  <span class="bk-title" data-block-title="${id}">${title}</span>
  <span class="bk-badge">${phase}</span>
  <span class="bk-status">${t('status_idle')}</span>
  <button class="bk-close" onclick="confirmRemoveBlock('${id}')" onmousedown="event.stopPropagation()" title="${lang === 'pl' ? 'Usuń blok' : 'Remove block'}">✕</button>
</div>
<div class="bk-body">${renderBlockBody(type, id)}</div>
<div class="block-annotation" id="ann-${id}"></div>`;
}

// Inner markup of a block's .bk-body (note + prereq strip + type-specific body).
// Extracted so the language switch can rebuild a block body in place without
// duplicating the type dispatch or touching the header/status.
function renderBlockBody(type, id) {
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
    case 'show-results': body = buildShowResultsBody(id); break;
    case 'zero-shot': body = buildZeroShotBody(id); break;
    case 'explain-ai': body = buildExplainAIBody(id); break;
    case 'model-explorer': body = buildModelExplorerBody(id); break;
    case 'evaluate': body = buildEvaluateBody(id); break;
    case 'deploy-export': body = buildDeployExportBody(id); break;
  }
  return `
  ${renderBlockNote(type)}
  <div id="prereq-${id}">${renderPrereqStrip(type)}</div>
  ${body}`;
}

function buildCameraInputBody(id) {
  const classButtons = () => classNames.map((name, i) =>
    `<button class="bk-btn" style="background:${classColors[i]};font-size:10px;padding:4px 8px" onclick="blockCapture('${id}',${i})">${escapeHtml(name)}</button>`
  ).join('');
  return `
<div class="video-wrap"><video class="bk-video" id="vid-${id}" autoplay playsinline muted></video></div>
${makeParam(t('param_resolution'), `<select id="res-${id}"><option value="224">224\u00d7224</option><option value="128">128\u00d7128</option></select>`)}
${makeParam(t('param_samples'), `<input type="number" id="spc-${id}" value="10" min="1" max="100" style="width:60px">`)}
${makeBtn(t('btn_start_camera'), `blockStartCamera('${id}')`, 'var(--c-data)')}
<div id="capture-btns-${id}" style="display:flex;flex-direction:column;gap:4px;margin-top:4px">${classButtons()}</div>
<input type="file" id="cam-photo-up-${id}" accept="image/*" multiple style="display:none" onchange="uploadPhotosToClass(window.activeClass||0, this)">
<button class="bk-btn" style="margin-top:4px;background:#475569;font-size:11px" onclick="document.getElementById('cam-photo-up-${id}').click()" title="${lang === 'pl' ? 'Wgraj zdj\u0119cia do aktywnej klasy' : 'Upload photos to the active class'}">${lang === 'pl' ? '\ud83d\udcc1 Wgraj zdj\u0119cia' : '\ud83d\udcc1 Upload photos'}</button>
<button class="bk-btn" style="margin-top:4px;background:#64748B;font-size:11px" onclick="addClass(null)">${lang === 'pl' ? 'Dodaj klas\u0119' : 'Add class'}</button>
<div id="cam-status-${id}" style="font-size:10px;color:var(--c-muted);text-align:center;margin-top:4px">—</div>
<div id="thumbs-${id}" class="thumb-strip"></div>
<div style="border-top:1px dashed var(--c-border);margin-top:8px;padding-top:8px">
  <input type="file" id="dataset-file-${id}" accept=".json" style="display:none" onchange="importDataset(this)">
  <button class="bk-btn" style="background:#475569;font-size:11px" onclick="document.getElementById('dataset-file-${id}').click()">${t('btn_load_dataset')}</button>
</div>`;
}

function buildLabelClassesBody(id) {
  return renderLabelRows(id);
}

function renderLabelRows(id) {
  let rows = '';
  for (let i = 0; i < classNames.length; i++) {
    const isActive = (window.activeClass === i);
    // Show delete-class button only when there are 2+ classes so we can't
    // accidentally destroy the last one.
    const canDelete = classNames.length > 1;
    const clearTip = lang === 'pl' ? 'Wyczyść próbki' : 'Clear samples';
    const deleteTip = lang === 'pl' ? 'Usuń klasę' : 'Delete class';
    const uploadTip = lang === 'pl' ? 'Wgraj zdjęcia' : 'Upload photos';
    rows += `<div class="class-row">
<div class="class-color-dot" style="background:${classColors[i]}"></div>
<input class="class-name-input" id="cn-${id}-${i}" value="${escapeHtml(classNames[i])}"
  oninput="updateClassNamesEverywhere(this)" placeholder="${lang === 'pl' ? 'nazwa klasy...' : 'class name...'}">
<span class="class-count" id="cc-${id}-${i}">${(capturedSamples[i] || []).length} ${t('lbl_samples')}</span>
<button style="flex-shrink:0;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;border:none;cursor:pointer;background:${classColors[i]};color:#fff" onclick="labelCapture(${i})">${lang === 'pl' ? 'zbierz' : 'capture'}</button>
<input type="file" id="photo-up-${id}-${i}" accept="image/*" multiple style="display:none" onchange="uploadPhotosToClass(${i}, this)">
<button class="class-delete-btn" onclick="document.getElementById('photo-up-${id}-${i}').click()" title="${uploadTip}">📁</button>
<button class="class-delete-btn" onclick="clearClassSamples(${i})" title="${clearTip}">⌫</button>
${canDelete ? `<button class="class-delete-btn class-delete-class-btn" onclick="deleteClass(${i})" title="${deleteTip}">🗑</button>` : ''}
</div>
<div id="thumbs-label-${i}-${id}" class="thumb-strip"></div>`;
  }
  // Class adding lives in the Camera/Data block; the Labels block only shows and
  // renames the existing classes.
  return `<div id="classes-${id}">${rows}</div>`;
}

// Feature: import photos from disk as training samples (no webcam needed).
// Each image is cover-cropped to a centered square and resized to 224×224 to
// match the model input, then pushed to the class like a camera capture.
async function uploadPhotosToClass(classIdx, input) {
  if (!input || !input.files || !input.files.length) return;
  if (classIdx == null || classIdx < 0 || classIdx >= classNames.length) classIdx = 0;
  const files = Array.from(input.files).filter(f => f.type.startsWith('image/'));
  input.value = ''; // allow re-picking the same files
  if (!files.length) return;
  const SIZE = 224;
  let added = 0;
  for (const f of files) {
    try {
      const bmp = await createImageBitmap(f);
      const cv = document.createElement('canvas');
      cv.width = SIZE; cv.height = SIZE;
      const ctx = cv.getContext('2d');
      const s = Math.min(bmp.width, bmp.height);           // center cover-crop
      const sx = (bmp.width - s) / 2, sy = (bmp.height - s) / 2;
      ctx.drawImage(bmp, sx, sy, s, s, 0, 0, SIZE, SIZE);
      if (!capturedSamples[classIdx]) capturedSamples[classIdx] = [];
      capturedSamples[classIdx].push(ctx.getImageData(0, 0, SIZE, SIZE));
      if (bmp.close) bmp.close();
      added++;
    } catch (e) {
      console.warn('Photo decode failed:', e);
    }
  }
  if (added) {
    invalidatePreparedData();              // dataset changed → snapshot stale
    saveClassToIDB(classIdx);
    refreshLabelAndCameraBlocks();
    updateSampleCounts();
    evaluatePipelineState();
    refreshDatasetInfo();
    const name = classNames[classIdx];
    log('success', lang === 'pl' ? `Wgrano ${added} zdjęć do „${name}"` : `Uploaded ${added} photos to "${name}"`);
    showToast(lang === 'pl' ? `Wgrano ${added} zdjęć do „${name}"` : `Uploaded ${added} photos to "${name}"`, 'success', { duration: 3000 });
  } else {
    showToast(lang === 'pl' ? 'Nie udało się wczytać zdjęć.' : 'Could not read the images.', 'warn', { duration: 3000 });
  }
}

function labelCapture(classIdx) {
  // Find the first camera-input block and capture for the given class
  let camBlock = placedBlocks.find(b => b.type === 'camera-input');
  if (!camBlock) {
    if (!ensureBlockOnCanvas('camera-input')) return;
    camBlock = placedBlocks.find(b => b.type === 'camera-input');
    if (!camBlock) return;
    log('info', lang === 'pl'
      ? 'Dodano blok Kamera: Dane. Uruchom kamerę i spróbuj ponownie.'
      : 'Camera: Input added. Start the camera and try again.');
    return;
  }
  window.activeClass = classIdx;
  blockCapture(camBlock.id, classIdx);
}

// Permanently remove a class (name + samples + color) and compact the arrays.
// Guards: requires at least 1 class remaining. Invalidates preparedData.
async function deleteClass(classIdx) {
  if (classNames.length <= 1) return; // never destroy the last class
  const name = classNames[classIdx] || '';
  // Snapshot for undo (samples are shared ImageData refs — fine, we're only
  // removing the array slot, not the pixels).
  const snapshot = {
    idx: classIdx,
    name: classNames[classIdx],
    color: classColors[classIdx],
    samples: capturedSamples[classIdx]
  };

  // Splice all parallel arrays
  classNames.splice(classIdx, 1);
  classColors.splice(classIdx, 1);
  capturedSamples.splice(classIdx, 1);

  // Stale — training with deleted class would corrupt ys tensor
  invalidatePreparedData();

  // Remove from IDB and repack remaining keys
  await deleteClassFromIDB(classIdx);
  refreshLabelAndCameraBlocks();
  updateClassNamesEverywhere();
  evaluatePipelineState();
  persistCanvasState();
  log('warn', lang === 'pl' ? `Usunięto klasę "${name}"` : `Deleted class "${name}"`);

  showToast(
    lang === 'pl' ? `Usunięto klasę „${name}"` : `Deleted class "${name}"`,
    'warn',
    {
      actionLabel: lang === 'pl' ? 'Cofnij' : 'Undo',
      onAction: async () => {
        classNames.splice(snapshot.idx, 0, snapshot.name);
        classColors.splice(snapshot.idx, 0, snapshot.color);
        capturedSamples.splice(snapshot.idx, 0, snapshot.samples);
        invalidatePreparedData();
        cancelAllPendingSaves();
        await clearDatasetStore();
        for (let i = 0; i < classNames.length; i++) await writeClassToIDB(i);
        refreshLabelAndCameraBlocks();
        updateClassNamesEverywhere();
        evaluatePipelineState();
        persistCanvasState();
        log('info', lang === 'pl' ? `Przywrócono klasę „${snapshot.name}"` : `Restored class "${snapshot.name}"`);
      }
    }
  );
}

// Re-render every label-classes block body and every camera capture-button strip
// from the current class arrays. Shared by delete/clear/import/undo paths.
function refreshLabelAndCameraBlocks() {
  placedBlocks.filter(b => b.type === 'label-classes').forEach(b => {
    const body = document.getElementById(b.id)?.querySelector('.bk-body');
    if (body) body.innerHTML = renderLabelRows(b.id);
  });
  placedBlocks.filter(b => b.type === 'camera-input').forEach(b => updateThumbStrips(b.id));
}

function clearClassSamples(classIdx) {
  if (!capturedSamples[classIdx] || capturedSamples[classIdx].length === 0) return;
  const name = classNames[classIdx];
  const snapshot = capturedSamples[classIdx];
  capturedSamples[classIdx] = [];
  log('info', lang === 'pl' ? `Usunięto próbki klasy "${name}"` : `Deleted samples for class "${name}"`);
  refreshLabelAndCameraBlocks();
  evaluatePipelineState();
  refreshDatasetInfo();
  saveClassToIDB(classIdx, true); // immediate — saves empty array
  showToast(
    lang === 'pl' ? `Wyczyszczono próbki „${name}" (${snapshot.length})` : `Cleared "${name}" samples (${snapshot.length})`,
    'warn',
    {
      actionLabel: lang === 'pl' ? 'Cofnij' : 'Undo',
      onAction: () => {
        capturedSamples[classIdx] = snapshot;
        refreshLabelAndCameraBlocks();
        evaluatePipelineState();
        refreshDatasetInfo();
        saveClassToIDB(classIdx, true);
        log('info', lang === 'pl' ? `Przywrócono próbki „${name}"` : `Restored "${name}" samples`);
      }
    }
  );
}

function addClass(labelBlockId) {
  const idx = classNames.length;
  if (idx >= CLASS_COLORS.length) {
    log('warn', lang === 'pl' ? 'Maksymalna liczba klas osi\u0105gni\u0119ta' : 'Maximum class count reached');
    return;
  }
  const name = lang === 'pl' ? `Klasa ${idx + 1}` : `Class ${idx + 1}`;
  // Pick next unused color from the pool; fall back to cycling if all taken.
  const usedColors = new Set(classColors);
  const nextColor = CLASS_COLORS.find(c => !usedColors.has(c)) || CLASS_COLORS[idx % CLASS_COLORS.length];
  classNames.push(name);
  classColors.push(nextColor);
  capturedSamples.push([]);
  // If the user adds a class from the camera-input block without ever placing
  // a label-classes block, they have no UI to rename it. Suggest adding one.
  if (!labelBlockId && !placedBlocks.some(b => b.type === 'label-classes')) {
    setTimeout(() => ensureBlockOnCanvas('label-classes'), 200);
  }
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
  evaluatePipelineState();
}

function buildPrepareDataBody(id) {
  const hint = lang === 'pl'
    ? 'Przeskaluj zebrane zdjęcia do rozmiaru modelu. Opcjonalnie augmentuj dane, aby zwiększyć liczbę próbek.'
    : 'Resize captured images to model input size. Optionally augment to increase sample count.';
  return `
<div style="font-size:12px;color:var(--c-muted);line-height:1.4;padding-bottom:4px">${hint}</div>
${makeParam(t('param_augment'), `<select id="aug-${id}" onchange="previewAugmentation('${id}')">
  <option value="none" selected>${lang === 'pl' ? 'Tylko przygotowanie' : 'Prepare only'}</option>
  <option value="all">Flip + Brightness + Zoom + Skew</option>
</select>`)}
<button class="bk-btn" style="background:#64748B;font-size:11px;margin-top:4px" onclick="previewAugmentation('${id}')">${lang === 'pl' ? '👁 Podgląd augmentacji' : '👁 Preview augmentation'}</button>
<div id="aug-preview-${id}" class="aug-preview"></div>
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
<div id="train-interp-${id}" class="train-interp"></div>
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
<div class="video-wrap"><video class="bk-video" id="vid-${id}" autoplay playsinline muted></video></div>
${makeParam(t('param_fps'), `<select id="fps-${id}"><option value="1000">1</option><option value="200" selected>5</option><option value="100">10</option></select>`)}
${makeBtn(t('btn_start_camera'), `startInferCamera('${id}')`, 'var(--c-data)')}
${makeBtn(t('btn_stop_camera'), `stopInferCamera('${id}')`, '#64748B')}`;
}


function buildZeroShotBody(id) {
  const note = lang === 'pl'
    ? 'Pe\u0142ny klasyfikator MobileNetV3 (1001 klas ImageNet). Pierwsze uruchomienie pobiera ~5 MB.'
    : 'Full MobileNetV3 classifier (1001 ImageNet classes). First start downloads ~5 MB.';
  return `
<div style="font-size:10px;color:var(--c-muted);line-height:1.6;padding:4px 0 6px;border-bottom:1px solid var(--c-border);margin-bottom:6px">${note}</div>
<div class="video-wrap"><video class="bk-video" id="zsvid-${id}" autoplay playsinline muted></video></div>
${makeParam('FPS', `<select id="zsfps-${id}"><option value="1000">1</option><option value="200" selected>5</option><option value="100">10</option></select>`)}
<div id="zs-status-${id}" style="font-size:10px;color:var(--c-muted);text-align:center;min-height:14px"></div>
<div id="zs-results-${id}" style="margin-top:6px"></div>
<div style="display:flex;gap:6px;margin-top:4px">
${makeBtn(lang === 'pl' ? 'Uruchom' : 'Start', `startZeroShot('${id}')`, 'var(--c-model)')}
${makeBtn(lang === 'pl' ? 'Stop' : 'Stop', `stopZeroShot('${id}')`, '#64748B')}
</div>`;
}


function buildShowResultsBody(id) {
  // Merged Predict + Show Results block. Element IDs that runInference reads
  // (pred-bars-, pred-result-, thr-) live here. Camera frames are rendered
  // by the Camera: Prediction block; this block is the *result* surface.
  const waitMsg = lang === 'pl' ? 'oczekiwanie na predykcj\u0119...' : 'waiting for prediction...';
  return `
<div id="pred-bars-${id}"></div>
<div id="pred-result-${id}" style="font-size:14px;font-weight:700;padding:8px 10px;background:var(--c-bg);border-radius:6px;text-align:center;min-height:32px;color:var(--c-muted);font-style:italic">${waitMsg}</div>
${makeParam(t('param_threshold'), `<select id="thr-${id}">
  <option value="0.5">50%</option><option value="0.7" selected>70%</option>
  <option value="0.8">80%</option><option value="0.9">90%</option>
</select>`)}
<canvas id="hist-chart-${id}" class="chart-canvas" height="60"></canvas>
${makeBtn(t('btn_freeze_frame'), `freezeFrame('${id}')`, '#64748B')}`;
}

function buildExplainAIBody(id) {
  const granLabel = lang === 'pl' ? 'Rozdzielczość' : 'Granularity';
  const methLabel = lang === 'pl' ? 'Metoda' : 'Method';
  const optOccl   = lang === 'pl' ? 'Okluzja (po krokach)' : 'Occlusion (patch-by-patch)';
  const optSal    = lang === 'pl' ? 'Saliency (gradient)' : 'Saliency (gradient)';
  const optFast   = lang === 'pl' ? 'Szybko (4×4)'  : 'Fast (4×4)';
  const optNorm   = lang === 'pl' ? 'Normalna (7×7)': 'Normal (7×7)';
  const optHi     = lang === 'pl' ? 'Dokładna (14×14)' : 'Detailed (14×14)';
  const stopLbl   = lang === 'pl' ? 'Stop' : 'Stop';
  const legendHi  = lang === 'pl' ? '🟥 patrzył tutaj' : '🟥 looked here';
  const legendLo  = lang === 'pl' ? 'myliło 🟦' : 'distracting 🟦';
  const waitMsg   = lang === 'pl' ? 'Uruchom kamerę predykcji, potem kliknij „Analizuj"' : 'Start the prediction camera, then click "Analyze"';
  const howto     = lang === 'pl'
    ? 'Podświetlone obszary to te, na które model patrzył, podejmując decyzję. Czerwone = główny dowód.'
    : 'The highlighted areas are what the model looked at to decide. Red = its main evidence.';
  return `
<div id="xai-wrap-${id}" style="position:relative; width:224px; height:224px; margin: 0 auto; border-radius:6px; overflow:hidden; background:#000;">
  <canvas id="xai-vid-${id}" style="width:100%; height:100%; display:block;"></canvas>
  <canvas id="xai-overlay-${id}" style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;"></canvas>
</div>
<div class="xai-legend">
  <span class="xai-legend-label">${legendLo}</span>
  <div class="xai-legend-bar"></div>
  <span class="xai-legend-label">${legendHi}</span>
</div>
<div class="xai-howto">${howto}</div>
${makeParam(methLabel, `<select id="xai-method-${id}">
  <option value="occlusion" selected>${optOccl}</option>
  <option value="saliency">${optSal}</option>
</select>`)}
${makeParam(granLabel, `<select id="xai-patch-${id}">
  <option value="56">${optFast}</option>
  <option value="32" selected>${optNorm}</option>
  <option value="16">${optHi}</option>
</select>`)}
<progress id="xai-prog-${id}" value="0" max="100" style="display:none;margin-top:4px"></progress>
<div id="xai-result-${id}" style="font-size:13px;font-weight:700;padding:6px 8px;background:var(--c-bg);border-radius:6px;text-align:center;margin-top:6px;min-height:28px;color:var(--c-muted);font-style:italic">${waitMsg}</div>
<div id="xai-detail-${id}" class="xai-detail" style="display:none">
  <div class="xai-detail-row">
    <canvas id="xai-thumb-${id}" width="64" height="64" class="xai-thumb"></canvas>
    <div class="xai-detail-text" id="xai-detail-text-${id}"></div>
  </div>
  <div class="xai-classes" id="xai-classes-${id}"></div>
</div>
<div style="display:flex;gap:6px;margin-top:6px">
${makeBtn(t('btn_run_xai'), `runXAI('${id}')`, 'var(--c-eval)')}
${makeBtn(stopLbl, `stopXAI('${id}')`, '#64748B')}
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

function buildEvaluateBody(id) {
  const hint = lang === 'pl'
    ? 'Dzieli próbki 80/20, trenuje świeży model na 80% i testuje na niewidzianych 20% — prawdziwy sprawdzian generalizacji.'
    : 'Splits 80/20, trains a fresh model on 80%, and tests on the unseen 20% — a true generalisation check.';
  return `
<div style="font-size:11px;color:var(--c-muted);line-height:1.5;padding-bottom:4px">${hint}</div>
${makeBtn(lang === 'pl' ? '▶ Oceń model' : '▶ Evaluate model', `runEvaluate('${id}')`, 'var(--c-eval)')}
<div id="eval-status-${id}" style="font-size:10px;color:var(--c-muted);text-align:center;margin-top:4px">—</div>
<div id="eval-results-${id}" class="eval-results"></div>`;
}

function buildDeployExportBody(id) {
  const hint = lang === 'pl'
    ? 'Eksportuj samodzielną stronę HTML z Twoim modelem w środku — działa offline, klasyfikuje z kamery. Podziel się nią z innymi!'
    : 'Export a self-contained HTML page with your model baked in — works offline, classifies from the camera. Share it with anyone!';
  return `
<div style="font-size:11px;color:var(--c-muted);line-height:1.5;padding-bottom:4px">${hint}</div>
${makeBtn(lang === 'pl' ? '🚀 Eksportuj aplikację' : '🚀 Export app', `runDeployExport('${id}')`, 'var(--c-deploy)')}
<div id="deploy-status-${id}" style="font-size:10px;color:var(--c-muted);text-align:center;margin-top:4px">—</div>`;
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
  const record = { id, type, card, x, y };
  placedBlocks.push(record);
  // First-of-type wins; if you place two predict blocks the second is ignored
  // by the inference hot path (matches previous .find() behaviour).
  if (!blocksByType[type]) blocksByType[type] = record;
  log('info', `+ ${type} #${blockIdCounter}`);
  initBlockAfterPlace(id, type);
  if (eduMode) {
    card.querySelectorAll('[onmousedown]').forEach(el => el.removeAttribute('onmousedown'));
    card.querySelectorAll('[ontouchstart]').forEach(el => el.removeAttribute('ontouchstart'));
    const ann = document.getElementById('ann-' + id);
    if (ann) ann.textContent = getEduAnnotation(type) || '';
  }
  refreshEmptyState();
  evaluatePipelineState();
  persistCanvasState();
  updatePipelineOrder();
  return id;
}

function getPhaseColor(type) {
  const map = {
    'camera-input': 'var(--c-data)', 'label-classes': 'var(--c-label)',
    'prepare-data': 'var(--c-prep)', 'pretrained-model': 'var(--c-model)',
    'train-model': 'var(--c-train)', 'save-model': 'var(--c-deploy)',
    'upload-model': 'var(--c-data)', 'camera-infer': 'var(--c-data)',
    'show-results': 'var(--c-eval)',
    'explain-ai': 'var(--c-eval)', 'model-explorer': 'var(--c-eval)', 'evaluate': 'var(--c-eval)', 'deploy-export': 'var(--c-deploy)'
  };
  return map[type] || '#64748B';
}

function initBlockAfterPlace(id, type) {
  if (type === 'label-classes') {
    window.activeClass = 0;
    updateSampleCounts();
    // Reload dataset from IDB so a freshly-placed block shows existing samples.
    loadDatasetFromIDB();
  }
  if (type === 'camera-input') {
    // Reload so thumb-strips and sample counts reflect stored data.
    loadDatasetFromIDB();
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
      'show-results': t('block_show_results'),
      'explain-ai': t('block_explain_ai'), 'model-explorer': t('block_model_explorer'),
      'zero-shot': t('block_zero_shot'), 'evaluate': t('block_evaluate'), 'deploy-export': t('block_deploy_export')
    };
    title.textContent = titles[b.type] || b.type;
  }
  // Re-translate the status badge from the card's current status-* class so it
  // doesn't stay stuck in the previous language after a switch.
  const chip = b.card.querySelector('.bk-status');
  const statusMatch = /status-(\w+)/.exec(b.card.className);
  if (chip && statusMatch) chip.textContent = t('status_' + statusMatch[1]);
}

function toggleCollapse(id) {
  const card = document.getElementById(id);
  if (card) card.classList.toggle('collapsed');
}

// ===== CARD DRAG (reposition) =====
// Supports both mouse and single-finger touch. Pointer Events would be
// cleaner but onmousedown is wired into block markup (educational simplicity),
// so we add a parallel touchstart path that synthesises clientX/clientY.
function cardDragStart(e, id) {
  if (eduMode) return;
  // Mouse events report e.button; touch events don't have it.
  if (e.type === 'mousedown' && e.button !== 0) return;
  const isTouch = e.type === 'touchstart';
  const point = isTouch ? e.touches[0] : e;
  if (isTouch) e.preventDefault(); // suppress 300 ms tap delay + scroll
  e.stopPropagation();
  draggedCard = id;
  const card = document.getElementById(id);
  const rect = card.getBoundingClientRect();
  const trash = document.getElementById('trash-zone');
  dragOffsetX = point.clientX - rect.left;
  dragOffsetY = point.clientY - rect.top;
  card.classList.add('dragging');
  trash.classList.add('visible');

  function pointFromEvent(ev) {
    if (ev.touches && ev.touches.length) return ev.touches[0];
    if (ev.changedTouches && ev.changedTouches.length) return ev.changedTouches[0];
    return ev;
  }

  function onMove(ev) {
    const p = pointFromEvent(ev);
    const canvas = document.getElementById('canvas');
    const cr = canvas.getBoundingClientRect();
    let nx = p.clientX - cr.left - dragOffsetX;
    let ny = p.clientY - cr.top - dragOffsetY;
    nx = Math.max(0, Math.min(nx, cr.width - 280));
    ny = Math.max(0, ny);
    card.style.left = nx + 'px';
    card.style.top = ny + 'px';
    // Keep connector curves attached to the block as it moves.
    drawPipelineConnectors();
    // Trash detection
    const tr = trash.getBoundingClientRect();
    const inTrash = p.clientX >= tr.left && p.clientX <= tr.right &&
      p.clientY >= tr.top && p.clientY <= tr.bottom;
    trash.classList.toggle('hot', inTrash);
    if (ev.cancelable) ev.preventDefault();
  }
  function onUp(ev) {
    const p = pointFromEvent(ev);
    card.classList.remove('dragging');
    trash.classList.remove('visible', 'hot');
    const tr = trash.getBoundingClientRect();
    const inTrash = p.clientX >= tr.left && p.clientX <= tr.right &&
      p.clientY >= tr.top && p.clientY <= tr.bottom;
    if (inTrash && !eduMode) {
      confirmRemoveBlock(id);
    } else {
      const b = placedBlocks.find(b => b.id === id);
      if (b) {
        b.x = parseFloat(card.style.left);
        b.y = parseFloat(card.style.top);
        persistCanvasState();
        updatePipelineOrder(); // x may have changed → renumber
      }
    }
    draggedCard = null;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    document.removeEventListener('touchcancel', onUp);
  }
  if (isTouch) {
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    document.addEventListener('touchcancel', onUp);
  } else {
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
}

// User-facing wrapper that confirms before removing blocks holding user work
// (trained model, captured samples). Plain navigation blocks delete silently.
function confirmRemoveBlock(id) {
  const block = placedBlocks.find(b => b.id === id);
  if (!block) return;
  const isTrainBlockWithModel = block.type === 'train-model' && fullModel && !modelSaved;
  const isLabelWithSamples = block.type === 'label-classes' &&
    capturedSamples.some(a => a && a.length > 0);
  let needsConfirm = false;
  let msg = '';
  if (isTrainBlockWithModel) {
    needsConfirm = true;
    msg = lang === 'pl'
      ? 'Wytrenowany model nie został jeszcze zapisany. Usunąć blok?'
      : 'Trained model has not been saved yet. Remove block?';
  } else if (isLabelWithSamples) {
    needsConfirm = true;
    msg = lang === 'pl'
      ? 'Próbki klas zostaną zachowane (możesz dodać blok ponownie). Usunąć blok?'
      : 'Class samples will be preserved (you can add the block again). Remove block?';
  }
  if (needsConfirm) {
    uiConfirm(msg, { okLabel: lang === 'pl' ? 'Usuń blok' : 'Remove block', danger: true })
      .then(ok => { if (ok) removeBlock(id); });
    return;
  }
  removeBlock(id);
}

function removeBlock(id) {
  const block = placedBlocks.find(b => b.id === id);
  // Stop streams/intervals associated with this block before tearing it down
  if (block) {
    if (cameraStreams[id]) {
      try { cameraStreams[id].getTracks().forEach(t => t.stop()); } catch (_) {}
      delete cameraStreams[id];
    }
    if (zsStreams[id]) {
      try { zsStreams[id].getTracks().forEach(t => t.stop()); } catch (_) {}
      delete zsStreams[id];
    }
    if (zsIntervals[id]) {
      clearInterval(zsIntervals[id]);
      delete zsIntervals[id];
    }
    // The inference loop is global, but logically owned by camera-infer.
    if (block.type === 'camera-infer') {
      if (inferInterval) { clearInterval(inferInterval); inferInterval = null; }
      if (inferCameraStream) {
        try { inferCameraStream.getTracks().forEach(t => t.stop()); } catch (_) {}
        inferCameraStream = null;
      }
      inferVideoEl = null;
    }
    // The zero-shot classifier is large (~5 MB GPU memory). Free it when
    // the user removes the only zero-shot block — they can reload it.
    if (block.type === 'zero-shot' && !placedBlocks.some(b => b.type === 'zero-shot' && b.id !== id)) {
      if (zeroShotModel) { try { zeroShotModel.dispose(); } catch (_) {} zeroShotModel = null; }
    }
  }
  const card = document.getElementById(id);
  if (card) card.remove();
  placedBlocks = placedBlocks.filter(b => b.id !== id);
  // Rebuild the by-type index. Tiny set, so cheaper than tracking deltas.
  blocksByType = {};
  for (const b of placedBlocks) {
    if (!blocksByType[b.type]) blocksByType[b.type] = b;
  }
  log('warn', `Removed block #${id}`);
  refreshEmptyState();
  evaluatePipelineState();
  persistCanvasState();
  updatePipelineOrder();
}

async function clearCanvas() {
  const hasSamples = capturedSamples.some(a => a && a.length > 0);
  if ((fullModel && !modelSaved) || hasSamples || placedBlocks.length > 0) {
    const msg = (fullModel && !modelSaved) ? t('confirm_clear_canvas_model') : t('confirm_clear_canvas');
    const ok = await uiConfirm(msg, { okLabel: t('btn_clear'), danger: true });
    if (!ok) return;
  }
  // Flush (not drop) debounced dataset writes: the dataset survives a canvas
  // clear by design, so a capture from the last 600 ms must still reach IDB.
  const pendingClasses = Object.keys(_saveDebounceTimers).map(Number);
  cancelAllPendingSaves();
  pendingClasses.forEach(i => saveClassToIDB(i, true));
  // Stop any running camera/inference streams attached to soon-to-be-removed blocks
  Object.keys(cameraStreams).forEach(id => {
    try { cameraStreams[id].getTracks().forEach(t => t.stop()); } catch (_) {}
  });
  cameraStreams = {};
  Object.keys(zsStreams).forEach(id => {
    try { zsStreams[id].getTracks().forEach(t => t.stop()); } catch (_) {}
  });
  zsStreams = {};
  Object.keys(zsIntervals).forEach(id => clearInterval(zsIntervals[id]));
  zsIntervals = {};
  if (inferInterval) { clearInterval(inferInterval); inferInterval = null; }
  if (inferCameraStream) { try { inferCameraStream.getTracks().forEach(t => t.stop()); } catch (_) {} inferCameraStream = null; }
  inferVideoEl = null;
  predHistory = [];
  frozenFrame = false;

  placedBlocks.forEach(b => { if (b.card) b.card.remove(); });
  placedBlocks = [];
  blocksByType = {};
  // classNames / classColors / capturedSamples are intentionally kept: the
  // Dataset sidebar section and the IDB store outlive the canvas, and
  // datasetLoadedFromIDB stays true, so the in-memory arrays must remain the
  // authoritative copy. Use "Delete from storage" to drop the dataset.
  baseModel = null;
  fullModel = null;
  inferModel = null;
  inferMetadata = null;
  invalidatePreparedData();
  modelSaved = false;
  modelMetadata = null;
  log('warn', 'Canvas cleared');
  evaluatePipelineState();
  refreshEmptyState();
  persistCanvasState();
  refreshDatasetInfo();
  const svg = document.getElementById('pipeline-connectors');
  if (svg) svg.innerHTML = '';
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
// `source` is the class-name input that fired (optional). Only that input is
// read; every other cn-* input is written from classNames. Reading all inputs
// let a second Labels block's stale value overwrite the edit just made.
function updateClassNamesEverywhere(source) {
  const classIdxOf = (el) => { const parts = el.id.split('-'); return parseInt(parts[parts.length - 1]); };
  if (source && source.id) {
    const cls = classIdxOf(source);
    if (cls >= 0 && cls < classNames.length) classNames[cls] = source.value;
  }
  document.querySelectorAll('[id^="cn-"]').forEach(el => {
    if (el === source) return;
    const cls = classIdxOf(el);
    if (cls < classNames.length && el.value !== classNames[cls]) el.value = classNames[cls];
  });
  // Fully rebuild capture buttons so new classes appear automatically
  placedBlocks.filter(b => b.type === 'camera-input').forEach(b => {
    const container = document.getElementById('capture-btns-' + b.id);
    if (!container) return;
    container.innerHTML = classNames.map((name, i) =>
      `<button class="bk-btn" style="background:${classColors[i]};font-size:10px;padding:4px 8px" onclick="blockCapture('${b.id}',${i})">${escapeHtml(name)}</button>`
    ).join('');
  });
  persistCanvasState();
  // Update class name in IDB metadata without re-encoding all JPEG samples.
  // We re-use saveClassToIDB's debounce timer so rapid typing doesn't thrash.
  classNames.forEach((_, i) => {
    if (capturedSamples[i] && capturedSamples[i].length > 0) saveClassToIDB(i);
  });
}

// ===== CAMERA — Training =====
let cameraStreams = {};
// Per-id "camera is opening" latch. getUserMedia is async, so without it two
// rapid clicks both pass the existing-stream check and open two streams — the
// first is overwritten and never stopped (camera LED stays on).
let cameraOpening = {};

function isBlockPlaced(id) {
  return placedBlocks.some(b => b.id === id);
}
function stopStream(stream) {
  try { stream.getTracks().forEach(t => t.stop()); } catch (_) {}
}

async function getCameraStream() {
  const bail = e => e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError';
  // Attempt 1: preferred resolution
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
  } catch (e) { if (bail(e)) throw e; }
  // Attempt 2: any video, no resolution constraints
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (e) { if (bail(e)) throw e; }
  // Attempt 3: enumerate devices and try each by explicit deviceId
  // (works around "Requested device not found" on some hardware/drivers)
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    for (const dev of devices.filter(d => d.kind === 'videoinput' && d.deviceId)) {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: { deviceId: dev.deviceId } });
      } catch (e) { if (bail(e)) throw e; }
    }
  } catch (e) { if (bail(e)) throw e; }
  throw new Error(lang === 'pl' ? 'Nie znaleziono kamery' : 'No camera found');
}

async function blockStartCamera(id) {
  if (cameraOpening[id]) return;
  cameraOpening[id] = true;
  try {
    if (cameraStreams[id]) {
      cameraStreams[id].getTracks().forEach(t => t.stop());
    }
    const stream = await getCameraStream();
    if (!isBlockPlaced(id)) { stopStream(stream); return; } // removed during the permission prompt
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
  } finally {
    cameraOpening[id] = false;
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
  const cardEl = document.getElementById(id);
  setBlockStatus(cardEl, 'running');
  function grab() {
    if (captured >= spc) {
      log('success', t('log_capture', spc, classNames[cls]));
      if (statusEl) statusEl.textContent = `${classNames[cls]}: ${capturedSamples[cls].length} ${t('lbl_samples')}`;
      updateSampleCounts();
      updateThumbStrips(id);
      setBlockStatus(cardEl, 'done');
      evaluatePipelineState();
      saveClassToIDB(cls); // persist new samples to IDB (debounced)
      refreshDatasetInfo();
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
    cv.style.borderTop = `3px solid ${classColors[cls]}`;
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
        cv.style.borderTop = `3px solid ${classColors[cls % CLASS_COLORS.length]}`;
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

  // Zoom + skew (affine transform). Each applied independently with 50%
  // probability when augType === 'all'. Uses bilinear sampling. Out-of-source
  // pixels are filled with the edge value (less artifact-prone than black).
  if (augType === 'all') {
const doZoom = Math.random() > 0.5;
const doSkew = Math.random() > 0.5;
if (doZoom || doSkew) {
  const zoom  = doZoom ? (0.85 + Math.random() * 0.30) : 1.0;
  const sX    = doSkew ? (Math.random() - 0.5) * 0.30 : 0;
  const sY    = doSkew ? (Math.random() - 0.5) * 0.30 : 0;
  const cx = w / 2, cy = h / 2;
  const out = new Uint8ClampedArray(buf.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      let sx = dx / zoom - sX * dy + cx;
      let sy = dy / zoom - sY * dx + cy;
      if (sx < 0) sx = 0; else if (sx > w - 1) sx = w - 1;
      if (sy < 0) sy = 0; else if (sy > h - 1) sy = h - 1;
      const x0 = sx | 0, y0 = sy | 0;
      const x1 = x0 + 1 < w ? x0 + 1 : x0;
      const y1 = y0 + 1 < h ? y0 + 1 : y0;
      const fx = sx - x0, fy = sy - y0;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const i00 = (y0 * w + x0) * 4;
      const i10 = (y0 * w + x1) * 4;
      const i01 = (y1 * w + x0) * 4;
      const i11 = (y1 * w + x1) * 4;
      const di = (y * w + x) * 4;
      out[di]     = buf[i00]     * w00 + buf[i10]     * w10 + buf[i01]     * w01 + buf[i11]     * w11;
      out[di + 1] = buf[i00 + 1] * w00 + buf[i10 + 1] * w10 + buf[i01 + 1] * w01 + buf[i11 + 1] * w11;
      out[di + 2] = buf[i00 + 2] * w00 + buf[i10 + 2] * w10 + buf[i01 + 2] * w01 + buf[i11 + 2] * w11;
      out[di + 3] = 255;
    }
  }
  buf.set(out);
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
  // Transfer all buffers — avoids structured-clone copy of what can be tens
  // of MB for larger datasets. The worker is done after this message anyway.
  const buffers = [];
  for (const r of result) buffers.push(r.data.buffer);
  self.postMessage({ type: 'done', result, counts: samples.length }, buffers);
};
`;

// ===== AUGMENTATION PREVIEW =====
// Apply the same transforms the worker uses (brightness jitter, and for 'all'
// horizontal flip + zoom + skew) to one ImageData, returning a new ImageData.
// Kept in sync with WORKER_CODE so the preview reflects real augmentation.
function augmentImageDataPreview(src, augType) {
  const w = src.width, h = src.height;
  let buf = new Uint8ClampedArray(src.data);
  // Brightness jitter
  const bj = 0.7 + Math.random() * 0.6;
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = Math.min(255, buf[i] * bj);
    buf[i + 1] = Math.min(255, buf[i + 1] * bj);
    buf[i + 2] = Math.min(255, buf[i + 2] * bj);
  }
  if (augType === 'all') {
    if (Math.random() > 0.5) { // horizontal flip
      for (let row = 0; row < h; row++) {
        for (let col = 0; col < Math.floor(w / 2); col++) {
          const a = (row * w + col) * 4, b2 = (row * w + (w - 1 - col)) * 4;
          for (let c = 0; c < 4; c++) { const tmp = buf[a + c]; buf[a + c] = buf[b2 + c]; buf[b2 + c] = tmp; }
        }
      }
    }
    const doZoom = Math.random() > 0.5, doSkew = Math.random() > 0.5;
    if (doZoom || doSkew) {
      const zoom = doZoom ? (0.85 + Math.random() * 0.30) : 1.0;
      const sX = doSkew ? (Math.random() - 0.5) * 0.30 : 0;
      const sY = doSkew ? (Math.random() - 0.5) * 0.30 : 0;
      const cx = w / 2, cy = h / 2;
      const out = new Uint8ClampedArray(buf.length);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy;
        let sx = dx / zoom - sX * dy + cx;
        let sy = dy / zoom - sY * dx + cy;
        if (sx < 0) sx = 0; else if (sx > w - 1) sx = w - 1;
        if (sy < 0) sy = 0; else if (sy > h - 1) sy = h - 1;
        const x0 = sx | 0, y0 = sy | 0;
        const x1 = x0 + 1 < w ? x0 + 1 : x0, y1 = y0 + 1 < h ? y0 + 1 : y0;
        const fx = sx - x0, fy = sy - y0;
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        const i00 = (y0 * w + x0) * 4, i10 = (y0 * w + x1) * 4, i01 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4, di = (y * w + x) * 4;
        out[di] = buf[i00] * w00 + buf[i10] * w10 + buf[i01] * w01 + buf[i11] * w11;
        out[di + 1] = buf[i00 + 1] * w00 + buf[i10 + 1] * w10 + buf[i01 + 1] * w01 + buf[i11 + 1] * w11;
        out[di + 2] = buf[i00 + 2] * w00 + buf[i10 + 2] * w10 + buf[i01 + 2] * w01 + buf[i11 + 2] * w11;
        out[di + 3] = 255;
      }
      buf = out;
    }
  }
  return new ImageData(buf, w, h);
}

// Render an original sample plus a few augmented variants so students can see
// exactly what augmentation does to their data before committing to it.
function previewAugmentation(id) {
  const box = document.getElementById('aug-preview-' + id);
  if (!box) return;
  const augType = document.getElementById('aug-' + id)?.value || 'none';
  // First sample of the first class that has any.
  let sample = null;
  for (const arr of capturedSamples) { if (arr && arr.length) { sample = arr[0]; break; } }
  if (!sample) {
    box.innerHTML = `<div class="aug-preview-empty">${lang === 'pl' ? 'Najpierw zbierz kilka próbek.' : 'Collect a few samples first.'}</div>`;
    return;
  }
  const drawInto = (imgData, label) => {
    const cv = document.createElement('canvas');
    cv.width = imgData.width; cv.height = imgData.height;
    cv.getContext('2d').putImageData(imgData, 0, 0);
    const wrap = document.createElement('div');
    wrap.className = 'aug-preview-item';
    const shown = document.createElement('canvas');
    shown.width = 56; shown.height = 56;
    shown.getContext('2d').drawImage(cv, 0, 0, 56, 56);
    const cap = document.createElement('div');
    cap.className = 'aug-preview-cap';
    cap.textContent = label;
    wrap.appendChild(shown); wrap.appendChild(cap);
    return wrap;
  };
  box.innerHTML = '';
  box.appendChild(drawInto(sample, lang === 'pl' ? 'oryginał' : 'original'));
  if (augType === 'none') {
    const note = document.createElement('div');
    note.className = 'aug-preview-empty';
    note.textContent = lang === 'pl'
      ? 'Augmentacja wyłączona — tylko oryginały.'
      : 'Augmentation off — originals only.';
    box.appendChild(note);
    return;
  }
  const N = 4;
  for (let i = 0; i < N; i++) box.appendChild(drawInto(augmentImageDataPreview(sample, augType), '#' + (i + 1)));
}

// ===== PREPARE DATA =====
async function runPrepare(id) {
  const totalSamples = capturedSamples.reduce((s, a) => s + a.length, 0);
  if (totalSamples === 0) { log('warn', t('log_no_data')); return; }

  // Single-flight: parallel prepares would spawn competing workers whose 'done'
  // handlers race to overwrite preparedData.
  if (prepareInProgress) {
    log('warn', lang === 'pl' ? 'Przygotowanie już trwa.' : 'Preparation is already running.');
    return;
  }
  prepareInProgress = true;
  const versionAtStart = datasetVersion;

  setBlockStatus(document.getElementById(id), 'running');
  log('step', t('log_prep_start'));

  const augType = document.getElementById('aug-' + id)?.value || 'none';
  const multiplier = augType === 'none' ? 1 : 2;
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
    // Tear down worker + blob URL + guard exactly once, whatever the outcome.
    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      try { worker.terminate(); } catch (_) {}
      URL.revokeObjectURL(workerURL);
      prepareInProgress = false;
      resolve();
    };
    // Without these, a worker exception left the promise pending forever —
    // runPipeline would hang and the progress bar freeze with no error.
    worker.onerror = (err) => {
      log('error', 'Prepare worker error: ' + (err && err.message ? err.message : 'unknown'));
      setBlockStatus(document.getElementById(id), 'error');
      cleanup();
    };
    worker.onmessageerror = () => {
      log('error', 'Prepare worker: message decode failed');
      setBlockStatus(document.getElementById(id), 'error');
      cleanup();
    };
    worker.onmessage = async (e) => {
      if (e.data.type === 'progress') {
        if (prog) prog.value = e.data.pct;
        if (status) status.textContent = e.data.pct + '%';
      } else if (e.data.type === 'done') {
        // Samples changed while the worker ran (capture, upload, delete...):
        // the snapshot is stale, so leave preparedData null instead of
        // overwriting the invalidation with old data.
        if (datasetVersion !== versionAtStart) {
          console.warn('runPrepare: dataset changed during preparation, result discarded');
          log('warn', t('log_prep_stale'));
          if (status) status.textContent = '';
          setBlockStatus(document.getElementById(id), 'idle');
          cleanup();
          return;
        }
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
        evaluatePipelineState();
        cleanup();
      }
    };
    worker.postMessage({ samples: allSamples, multiplier, augType });
  });
}

// ===== LOAD BASE MODEL =====
async function runLoadBaseModel(id) {
  if (baseModel) { log('info', 'Base model already loaded'); setBlockStatus(document.getElementById(id), 'done'); return; }
  // Guard against a double-click racing two ~3 MB downloads (the second would
  // overwrite baseModel and leak the first GraphModel's weights).
  if (baseModelLoading) { log('info', lang === 'pl' ? 'Model bazowy już się ładuje...' : 'Base model is already loading...'); return; }
  baseModelLoading = true;
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
    evaluatePipelineState();
  } catch (err) {
    log('error', t('log_model_err') + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  } finally {
    baseModelLoading = false;
  }
}



// ============================================================

// ===== TRAINING =====
let lossHistory = [], accHistory = [];

// Narrate the training curve in plain language so students can read the chart.
// Reacts to the loss trend and warns about the classic "100% accuracy on very
// few samples = memorising, not learning" overfitting trap.
function updateTrainInterpretation(id, epoch, acc) {
  const el = document.getElementById('train-interp-' + id);
  if (!el) return;
  const totalSamples = capturedSamples.reduce((s, a) => s + (a ? a.length : 0), 0);
  let msg = '', tone = 'ok';
  const n = lossHistory.length;
  const fallingFast = n >= 3 && lossHistory[n - 1] < lossHistory[Math.max(0, n - 3)] - 0.02;
  const flat = n >= 4 && Math.abs(lossHistory[n - 1] - lossHistory[n - 4]) < 0.01;
  if (acc >= 0.999 && totalSamples < 20) {
    tone = 'warn';
    msg = lang === 'pl'
      ? '⚠️ 100% dokładności przy małej liczbie próbek — model może zapamiętywać, a nie uczyć się. Dodaj więcej zdjęć.'
      : '⚠️ 100% accuracy on few samples — the model may be memorising, not learning. Add more images.';
  } else if (fallingFast) {
    msg = lang === 'pl' ? '📉 Strata spada — model się uczy!' : '📉 Loss is dropping — the model is learning!';
  } else if (flat) {
    msg = lang === 'pl' ? '➡️ Strata się wypłaszcza — bliski końca nauki.' : '➡️ Loss is flattening out — learning is levelling off.';
  } else {
    msg = lang === 'pl' ? `Uczenie w toku — dokładność ${(acc * 100).toFixed(0)}%.` : `Learning in progress — accuracy ${(acc * 100).toFixed(0)}%.`;
  }
  el.textContent = msg;
  el.className = 'train-interp train-interp-' + tone;
}

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

  // Layout: leave room for axis labels
  const PAD_L = 26, PAD_R = 8, PAD_T = 14, PAD_B = 14;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  // Axis frame
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_L, PAD_T);
  ctx.lineTo(PAD_L, H - PAD_B);
  ctx.lineTo(W - PAD_R, H - PAD_B);
  ctx.stroke();

  // Y-axis ticks: accuracy uses fixed 0..1, drawn on left axis.
  ctx.font = '9px Inter';
  ctx.fillStyle = '#94A3B8';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  [0, 0.5, 1].forEach(v => {
    const y = PAD_T + innerH - v * innerH;
    ctx.fillText(v.toFixed(1), PAD_L - 4, y);
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y);
    ctx.stroke();
  });

  // X-axis ticks: epoch numbers (sparse: first, last, midpoint).
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const nEpochs = Math.max(lossHistory.length, accHistory.length);
  if (nEpochs >= 1) {
    const positions = nEpochs <= 4
      ? lossHistory.map((_, i) => i)
      : [0, Math.floor((nEpochs - 1) / 2), nEpochs - 1];
    positions.forEach(i => {
      const x = nEpochs === 1 ? PAD_L + innerW / 2 : PAD_L + (i / (nEpochs - 1)) * innerW;
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(String(i + 1), x, H - PAD_B + 2);
    });
  }

  // Loss is unbounded — scale to its own min/max so the curve fills the chart.
  const lossMax = lossHistory.length ? Math.max(...lossHistory) : 1;
  const lossMin = lossHistory.length ? Math.min(...lossHistory) : 0;
  const lossRange = (lossMax - lossMin) || 1;

  function drawLine(data, color, scaleFn) {
    if (data.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    data.forEach((v, i) => {
      const x = PAD_L + (i / (data.length - 1)) * innerW;
      const y = PAD_T + innerH - scaleFn(v) * innerH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  // Accuracy: bounded 0..1, drawn against left axis ticks directly.
  drawLine(accHistory, '#059669', v => v);
  // Loss: scale into [0..1] for plotting only (right-side y label shows real value).
  drawLine(lossHistory, '#DC2626', v => (v - lossMin) / lossRange);

  // Legend + final values, top of chart
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '10px Inter';
  const lastLoss = lossHistory[lossHistory.length - 1];
  const lastAcc = accHistory[accHistory.length - 1];
  ctx.fillStyle = '#DC2626';
  ctx.fillText('loss' + (lastLoss != null ? ` ${lastLoss.toFixed(3)}` : ''), PAD_L + 4, 1);
  ctx.fillStyle = '#059669';
  ctx.fillText('acc' + (lastAcc != null ? ` ${(lastAcc * 100).toFixed(1)}%` : ''), PAD_L + 80, 1);
}

// Train pre-flight validation. Returns true if training should proceed.
async function validateTrainingData() {
  const counts = capturedSamples.map(arr => (arr || []).length);
  const classesWithSamples = counts.filter(n => n > 0).length;
  if (classesWithSamples < 2) {
    const msg = lang === 'pl'
      ? `Trening wymaga co najmniej 2 klas z próbkami (masz ${classesWithSamples}). Zbierz próbki dla dwóch lub więcej klas.`
      : `Training needs at least 2 classes with samples (you have ${classesWithSamples}). Collect samples for two or more classes.`;
    showToast(msg, 'error');
    log('warn', msg);
    return false;
  }
  const cont = lang === 'pl' ? 'Kontynuuj mimo to' : 'Continue anyway';
  const MIN_PER_CLASS = 5;
  const tooFew = counts
    .map((n, i) => ({ n, name: classNames[i] }))
    .filter(c => c.n > 0 && c.n < MIN_PER_CLASS);
  if (tooFew.length > 0) {
    const list = tooFew.map(c => `"${c.name}" (${c.n})`).join(', ');
    const msg = lang === 'pl'
      ? `Niektóre klasy mają mniej niż ${MIN_PER_CLASS} próbek: ${list}. Modele potrzebują kilku przykładów na klasę. Kontynuować mimo to?`
      : `Some classes have fewer than ${MIN_PER_CLASS} samples: ${list}. Models need several examples per class. Continue anyway?`;
    if (!(await uiConfirm(msg, { okLabel: cont }))) return false;
  }
  const nonZero = counts.filter(n => n > 0);
  const max = Math.max(...nonZero);
  const min = Math.min(...nonZero);
  if (max >= 10 * min && max >= 20) {
    const msg = lang === 'pl'
      ? `Bardzo nierówny rozkład klas (od ${min} do ${max} próbek). Model nauczy się rozpoznawać klasę większościową. Kontynuować?`
      : `Class imbalance is large (${min}–${max} samples). The model will favour the majority class. Continue?`;
    if (!(await uiConfirm(msg, { okLabel: cont }))) return false;
  }
  return true;
}

async function runTraining(id) {
  if (!preparedData) {
    log('warn', t('log_no_data'));
    if (!placedBlocks.some(b => b.type === 'prepare-data')) {
      ensureBlockOnCanvas('prepare-data');
    }
    return;
  }
  if (!baseModel) {
    log('warn', t('log_no_model_base'));
    if (!placedBlocks.some(b => b.type === 'pretrained-model')) {
      ensureBlockOnCanvas('pretrained-model');
    }
    return;
  }
  if (!(await validateTrainingData())) return;

  // Single-flight: a second concurrent run (double-click Train, or Run pipeline
  // while a manual train is in flight) would share trainingCancelled / the chart
  // histories / fullModel and corrupt all of them.
  if (trainingInProgress) {
    log('warn', lang === 'pl' ? 'Trening już trwa.' : 'Training is already running.');
    return;
  }
  trainingInProgress = true;

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
  const allFeats = [];      // per-batch feature tensors — leak on cancel/error otherwise
  let classifier = null;    // disposed in finally unless training committed it
  let committed = false;
  const prevModel = fullModel; // freed AFTER the new model is live (see below)

  try {
    // ── STEP 1: Extract bottleneck features from frozen base model ──
    // Always resize to 224×224 — MobileNetV3-Small requires that input size
    // regardless of the resolution the user chose when capturing samples.
    log('info', lang === 'pl' ? `Ekstrakcja cech z ${rawXs.length} próbek...` : `Extracting features from ${rawXs.length} samples...`);
    // BATCHED feature extraction — one baseModel.predict() per BATCH samples
    // instead of per-sample. ~4-8x faster on GPU. Yield to UI between batches.
    // Worker output uses plain {data,width,height} objects; wrap with
    // ImageData (no buffer copy) so tf.browser.fromPixels accepts them.
    const BATCH = 8;
    for (let bs = 0; bs < rawXs.length; bs += BATCH) {
      if (trainingCancelled) throw new Error('cancelled');
      const end = Math.min(bs + BATCH, rawXs.length);
      const batchTensor = tf.tidy(() => {
        const items = [];
        for (let i = bs; i < end; i++) {
          const d = rawXs[i];
          const im = d instanceof ImageData
            ? d
            : new ImageData(d.data, d.width, d.height);
          let t = tf.browser.fromPixels(im).toFloat().div(255);
          if (im.width !== 224 || im.height !== 224) {
            t = t.resizeBilinear([224, 224]);
          }
          items.push(t);
        }
        return tf.stack(items);
      });
      try {
        allFeats.push(baseModel.predict(batchTensor));
      } finally {
        batchTensor.dispose();
      }
      if (info) info.textContent = lang === 'pl'
        ? `Ekstrakcja cech: ${end}/${rawXs.length}`
        : `Feature extraction: ${end}/${rawXs.length}`;
      await tf.nextFrame();
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
    classifier = tf.sequential({
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
          updateTrainInterpretation(id, epoch, acc);
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
    committed = true;              // ownership transferred — don't dispose in finally
    // Free the previous head now that the live inference loop reads the new one.
    // Doing it here (not before fit) means a running inference camera has already
    // switched to `classifier` before the old model's weights are released.
    if (prevModel && prevModel !== classifier) {
      try { prevModel.dispose(); } catch (_) {}
    }

    log('info', lang === 'pl' ? 'Model gotowy...' : 'Model ready...');
    log('success', t('log_train_done', finalAcc));
    setBlockStatus(document.getElementById(id), 'done');
    modelSaved = false; // freshly trained, not yet saved
    evaluatePipelineState();
    notifyModelTrained();
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
    // Always clean up feature tensors regardless of success, cancellation or error.
    if (featsTensor) featsTensor.dispose();
    if (ysTensor) ysTensor.dispose();
    // Batch feature tensors leak if we bailed mid-extraction (dispose is
    // idempotent, so re-disposing the ones freed after concat is harmless).
    allFeats.forEach(f => { try { f.dispose(); } catch (_) {} });
    // The freshly-built classifier leaks if training was cancelled or errored
    // before ownership transferred to fullModel.
    if (classifier && !committed) { try { classifier.dispose(); } catch (_) {} }
    trainingInProgress = false;
  }
}


function stopTraining(id) {
  trainingCancelled = true;
  log('warn', lang === 'pl' ? 'Zatrzymywanie po bieżącej epoce...' : 'Stopping after current epoch...');
}

// ===== MODEL EVALUATION (train/test split) =====
// Extract MobileNet bottleneck features for a list of ImageData samples.
// Returns a [N, featSize] tensor (caller disposes). Batched like runTraining.
async function extractFeatures(samples) {
  const BATCH = 8;
  const feats = [];
  for (let bs = 0; bs < samples.length; bs += BATCH) {
    const end = Math.min(bs + BATCH, samples.length);
    const batchTensor = tf.tidy(() => {
      const items = [];
      for (let i = bs; i < end; i++) {
        const d = samples[i];
        const im = d instanceof ImageData ? d : new ImageData(d.data, d.width, d.height);
        let tt = tf.browser.fromPixels(im).toFloat().div(255);
        if (im.width !== 224 || im.height !== 224) tt = tt.resizeBilinear([224, 224]);
        items.push(tt);
      }
      return tf.stack(items);
    });
    try { feats.push(baseModel.predict(batchTensor)); }
    finally { batchTensor.dispose(); }
    await tf.nextFrame();
  }
  const out = tf.concat(feats, 0);
  feats.forEach(f => f.dispose());
  return out;
}

let evaluateInProgress = false;
async function runEvaluate(id) {
  // TRUE hold-out evaluation. Split samples 80/20 (stratified), train a FRESH
  // head on the 80% only, then test on the 20% the fresh head has never seen.
  // (The deployed model can't give a genuine hold-out because it trained on all
  // images.) Only the test-set numbers are reported.
  if (!baseModel) {
    log('warn', t('log_no_model_base'));
    if (!placedBlocks.some(b => b.type === 'pretrained-model')) ensureBlockOnCanvas('pretrained-model');
    return;
  }
  // Each evaluated class needs >=2 samples so the split yields both a train and
  // a test example.
  const counts = capturedSamples.map(a => (a || []).length);
  const usable = counts.filter(n => n >= 2).length;
  if (usable < 2) {
    showToast(lang === 'pl'
      ? 'Prawdziwy test wymaga min. 2 klas z co najmniej 2 próbkami (aby podzielić 80/20).'
      : 'A true hold-out test needs at least 2 classes with 2+ samples each (to split 80/20).', 'warn');
    return;
  }
  if (evaluateInProgress) return;
  evaluateInProgress = true;

  const statusEl = document.getElementById('eval-status-' + id);
  const resEl = document.getElementById('eval-results-' + id);
  const setStatus = (s) => { if (statusEl) statusEl.textContent = s; };
  setBlockStatus(document.getElementById(id), 'running');
  if (resEl) resEl.innerHTML = '';

  const numClasses = classNames.length;
  // Stratified 80/20 split. Keep the test ImageData refs for the thumbnails.
  const trainSamples = [], trainLabels = [], testSamples = [], testLabels = [];
  for (let c = 0; c < numClasses; c++) {
    const arr = (capturedSamples[c] || []).slice();
    if (arr.length < 2) { arr.forEach(s => { trainSamples.push(s); trainLabels.push(c); }); continue; }
    // Deterministic seeded Fisher-Yates so the split is stable across clicks
    // but still a real per-class permutation (the old index-only formula gave
    // one fixed pattern for every class, so the same capture indices were
    // always held out).
    const rng = mulberry32(arr.length * 1000 + c);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const nTest = Math.max(1, Math.round(arr.length * 0.2));
    arr.forEach((s, i) => {
      if (i < nTest) { testSamples.push(s); testLabels.push(c); }
      else { trainSamples.push(s); trainLabels.push(c); }
    });
  }

  let trainFeat = null, testFeat = null, ysTensor = null, classifier = null, trainProbT = null, testProbT = null;
  try {
    setStatus(lang === 'pl' ? 'Ekstrakcja cech...' : 'Extracting features...');
    trainFeat = await extractFeatures(trainSamples);
    testFeat = await extractFeatures(testSamples);
    const featSize = trainFeat.shape[1];

    const idxT = tf.tensor1d(trainLabels, 'int32');
    ysTensor = tf.oneHot(idxT, numClasses);
    idxT.dispose();

    setStatus(lang === 'pl' ? 'Trening na 80% (świeży model)...' : 'Training on 80% (fresh model)...');
    classifier = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [featSize], units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: numClasses, activation: 'softmax' })
      ]
    });
    classifier.compile({ optimizer: tf.train.adam(0.001), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
    await classifier.fit(trainFeat, ysTensor, { epochs: 20, batchSize: 16, shuffle: true });

    setStatus(lang === 'pl' ? 'Test na 20% (niewidziane)...' : 'Testing on 20% (unseen)...');
    trainProbT = classifier.predict(trainFeat);
    testProbT = classifier.predict(testFeat);
    const trainProbs = await trainProbT.data();
    const testProbs = await testProbT.data();

    const argmaxRow = (probs, row) => {
      let m = 0; for (let k = 1; k < numClasses; k++) if (probs[row * numClasses + k] > probs[row * numClasses + m]) m = k; return m;
    };
    // Train accuracy is computed for the overfit verdict but not displayed.
    let trainCorrect = 0;
    for (let i = 0; i < trainLabels.length; i++) if (argmaxRow(trainProbs, i) === trainLabels[i]) trainCorrect++;
    const trainAcc = trainLabels.length ? trainCorrect / trainLabels.length : 0;

    // Test confusion matrix + misclassified thumbnails — the 20% hold-out only.
    const confusion = Array.from({ length: numClasses }, () => new Array(numClasses).fill(0));
    const misclassified = [];
    let correct = 0;
    for (let i = 0; i < testLabels.length; i++) {
      const pred = argmaxRow(testProbs, i);
      const truth = testLabels[i];
      confusion[truth][pred]++;
      if (pred === truth) correct++;
      else misclassified.push({ sample: testSamples[i], truth, pred, conf: testProbs[i * numClasses + pred] });
    }
    const acc = testLabels.length ? correct / testLabels.length : 0;

    renderEvaluation(id, { confusion, acc, trainAcc, total: testLabels.length, misclassified, numClasses });
    setStatus('');
    setBlockStatus(document.getElementById(id), 'done');
    log('success', lang === 'pl'
      ? `Test na niewidzianych 20%: ${(acc * 100).toFixed(0)}% z ${testLabels.length} zdjęć`
      : `Hold-out test on unseen 20%: ${(acc * 100).toFixed(0)}% of ${testLabels.length} images`);
  } catch (err) {
    log('error', 'Evaluation error: ' + err.message);
    console.error(err);
    setStatus((lang === 'pl' ? 'Błąd: ' : 'Error: ') + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  } finally {
    if (trainFeat) trainFeat.dispose();
    if (testFeat) testFeat.dispose();
    if (ysTensor) ysTensor.dispose();
    if (trainProbT) trainProbT.dispose();
    if (testProbT) testProbT.dispose();
    if (classifier) { try { classifier.dispose(); } catch (_) {} }
    evaluateInProgress = false;
  }
}

// Render the evaluation results: headline train-vs-test accuracy (with an
// overfit note when they diverge), a confusion matrix, and thumbnails of the
// actual misclassified test images labelled true → predicted.
function renderEvaluation(id, r) {
  const el = document.getElementById('eval-results-' + id);
  if (!el) return;
  const pct = (x) => (x * 100).toFixed(0) + '%';
  // Genuine hold-out: the 20% test images were never seen by the fresh head, so
  // test accuracy is a real generalisation measure. Flag overfitting when the
  // (internal) train accuracy is high but test accuracy lags.
  const gap = (r.trainAcc || 0) - r.acc;
  let verdict, verdictClass;
  if (gap >= 0.25 && (r.trainAcc || 0) > 0.8) {
    verdictClass = 'warn';
    verdict = lang === 'pl'
      ? '⚠️ Model dobrze radzi sobie z danymi treningowymi, ale słabo z niewidzianymi (przeuczenie). Dodaj więcej różnorodnych zdjęć.'
      : '⚠️ Great on training data but weak on unseen data (overfitting). Add more varied images.';
  } else if (r.acc >= 0.8) {
    verdictClass = 'ok';
    verdict = lang === 'pl'
      ? '✅ Model dobrze generalizuje — trafia na zdjęciach, których nigdy nie widział.'
      : '✅ The model generalises well — it gets images it never saw right.';
  } else {
    verdictClass = 'warn';
    verdict = lang === 'pl'
      ? '⚠️ Słaba skuteczność na niewidzianych danych — zbierz więcej lub wyraźniejsze próbki.'
      : '⚠️ Weak on unseen data — collect more or clearer samples.';
  }

  // Confusion matrix table.
  const maxCell = Math.max(1, ...r.confusion.flat());
  let head = '<th></th>' + classNames.slice(0, r.numClasses).map((n, i) =>
    `<th title="${escapeHtml(n)}"><span class="eval-dot" style="background:${classColors[i]}"></span></th>`).join('');
  let rows = '';
  for (let tr = 0; tr < r.numClasses; tr++) {
    let cells = `<th class="eval-rowhead" title="${escapeHtml(classNames[tr])}"><span class="eval-dot" style="background:${classColors[tr]}"></span>${escapeHtml((classNames[tr] || '').slice(0, 8))}</th>`;
    for (let pc = 0; pc < r.numClasses; pc++) {
      const v = r.confusion[tr][pc];
      const isDiag = tr === pc;
      const intensity = v / maxCell;
      const bg = isDiag
        ? `rgba(5,150,105,${0.15 + intensity * 0.6})`
        : (v > 0 ? `rgba(220,38,38,${0.15 + intensity * 0.6})` : 'transparent');
      cells += `<td style="background:${bg}">${v || ''}</td>`;
    }
    rows += `<tr>${cells}</tr>`;
  }
  const matrix = `<table class="eval-matrix"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;

  // Misclassified thumbnails (up to 8).
  let missHtml = '';
  const shown = r.misclassified.slice(0, 8);
  if (shown.length) {
    missHtml = `<div class="eval-miss-title">${lang === 'pl' ? 'Błędy modelu:' : 'Model mistakes:'}</div><div class="eval-miss-grid" id="eval-miss-${id}"></div>`;
  } else if (r.total > 0) {
    missHtml = `<div class="eval-miss-title">${lang === 'pl' ? 'Brak błędów na zbiorze testowym 🎉' : 'No mistakes on the test set 🎉'}</div>`;
  }

  el.innerHTML = `
    <div class="eval-scores">
      <div class="eval-score eval-score-test">
        <div class="eval-score-val">${pct(r.acc)}</div>
        <div class="eval-score-lbl">${lang === 'pl' ? `niewidziane (20%) — ${r.total} zdjęć` : `unseen (20%) — ${r.total} images`}</div>
      </div>
    </div>
    <div class="eval-verdict eval-verdict-${verdictClass}">${verdict}</div>
    <div class="eval-matrix-title">${lang === 'pl' ? 'Macierz pomyłek (wiersz = prawda, kolumna = predykcja)' : 'Confusion matrix (row = truth, column = prediction)'}</div>
    ${matrix}
    ${missHtml}`;

  // Draw the misclassified thumbnails into canvases (can't put ImageData in HTML).
  const grid = document.getElementById('eval-miss-' + id);
  if (grid) {
    shown.forEach(m => {
      const cv = document.createElement('canvas');
      cv.width = m.sample.width; cv.height = m.sample.height;
      cv.getContext('2d').putImageData(m.sample, 0, 0);
      const disp = document.createElement('canvas');
      disp.width = 48; disp.height = 48; disp.className = 'eval-miss-canvas';
      disp.getContext('2d').drawImage(cv, 0, 0, 48, 48);
      const wrap = document.createElement('div');
      wrap.className = 'eval-miss-item';
      const cap = document.createElement('div');
      cap.className = 'eval-miss-cap';
      cap.innerHTML = `<span style="color:${classColors[m.truth]}">${escapeHtml((classNames[m.truth] || '').slice(0, 6))}</span>→<span style="color:${classColors[m.pred]}">${escapeHtml((classNames[m.pred] || '').slice(0, 6))}</span>`;
      wrap.appendChild(disp); wrap.appendChild(cap);
      grid.appendChild(wrap);
    });
  }
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
    modelSaved = true;
    evaluatePipelineState();
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
    modelSaved = true;
    evaluatePipelineState();
  } catch (err) {
    log('error', 'Download error: ' + err.message);
  }
}

// ===== DEPLOY: EXPORT SELF-CONTAINED CLASSIFIER APP =====
async function runDeployExport(id) {
  if (!fullModel || !baseModel) {
    showToast(lang === 'pl' ? 'Najpierw wytrenuj model.' : 'Train a model first.', 'warn');
    return;
  }
  const statusEl = document.getElementById('deploy-status-' + id);
  const setStatus = (s) => { if (statusEl) statusEl.textContent = s; };
  setBlockStatus(document.getElementById(id), 'running');
  setStatus(lang === 'pl' ? 'Pakowanie modelu (~6 MB)...' : 'Packaging model (~6 MB)...');
  try {
    fullModel.userDefinedMetadata = modelMetadata;
    const [classifierArt, baseArt] = await Promise.all([captureArtifacts(fullModel), captureArtifacts(baseModel)]);
    const meta = modelMetadata || {};
    const labels = (meta.classLabels && meta.classLabels.length) ? meta.classLabels : classNames.slice();
    const html = buildStandaloneAppHTML({
      classifier: classifierArt,
      base: baseArt,
      labels,
      colors: classColors.slice(0, labels.length),
      inputSize: meta.inputSize || 224,
      lang
    });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'klocki-classifier.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(lang === 'pl' ? 'Wyeksportowano ✓' : 'Exported ✓');
    setBlockStatus(document.getElementById(id), 'done');
    log('success', lang === 'pl' ? 'Aplikacja wyeksportowana: klocki-classifier.html' : 'App exported: klocki-classifier.html');
    showToast(lang === 'pl' ? 'Aplikacja wyeksportowana 🚀' : 'App exported 🚀', 'success', { duration: 3500 });
  } catch (err) {
    log('error', 'Export error: ' + err.message);
    console.error(err);
    setStatus((lang === 'pl' ? 'Błąd: ' : 'Error: ') + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  }
}

// Build a fully self-contained classifier web app: TF.js from CDN + both models
// embedded as base64 + a camera UI. `<` in the embedded JSON is escaped so a
// class name can't break out of the <script> block.
function buildStandaloneAppHTML(bundle) {
  const isPl = bundle.lang === 'pl';
  const dataJson = JSON.stringify(bundle).replace(/</g, '\\u003c');
  const title = isPl ? 'Klasyfikator KlockiAI' : 'KlockiAI Classifier';
  const startLbl = isPl ? '▶ Uruchom kamerę' : '▶ Start camera';
  const madeWith = isPl ? 'Zrobione w KlockiAI' : 'Made with KlockiAI';
  const loadingLbl = isPl ? 'Ładowanie modelu…' : 'Loading model…';
  return `<!DOCTYPE html>
<html lang="${isPl ? 'pl' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js"><\/script>
<style>
  *{box-sizing:border-box} body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#94a3b8;font-size:12px;margin-bottom:16px}
  #stage{position:relative;width:100%;max-width:360px;aspect-ratio:1;border-radius:16px;overflow:hidden;background:#1e293b;border:2px solid #334155}
  video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
  button{margin-top:16px;background:#22c55e;color:#052e16;border:none;padding:12px 22px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer}
  button:disabled{opacity:.5;cursor:default}
  #bars{width:100%;max-width:360px;margin-top:16px;display:flex;flex-direction:column;gap:8px}
  .bar-row{font-size:13px}
  .bar-head{display:flex;justify-content:space-between;margin-bottom:3px}
  .bar-track{height:10px;background:#1e293b;border-radius:5px;overflow:hidden}
  .bar-fill{height:100%;border-radius:5px;transition:width .12s}
  #result{font-size:22px;font-weight:800;margin-top:14px;min-height:28px}
  .foot{margin-top:20px;color:#475569;font-size:11px}
  .foot a{color:#64748b}
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="sub" id="status">${loadingLbl}</div>
<div id="stage"><video id="vid" autoplay playsinline muted></video></div>
<div id="result"></div>
<div id="bars"></div>
<button id="btn" disabled>${startLbl}</button>
<div class="foot">${madeWith}</div>
<script>
const BUNDLE = ${dataJson};
const LABELS = BUNDLE.labels, COLORS = BUNDLE.colors, SIZE = BUNDLE.inputSize || 224;
function b64ToBuf(b64){const bin=atob(b64),n=bin.length,bytes=new Uint8Array(n);for(let i=0;i<n;i++)bytes[i]=bin.charCodeAt(i);return bytes.buffer;}
let baseModel=null, headModel=null, stream=null, loopTimer=null;
async function load(){
  headModel = await tf.loadLayersModel({load:async()=>({modelTopology:BUNDLE.classifier.modelTopology,weightSpecs:BUNDLE.classifier.weightSpecs,weightData:b64ToBuf(BUNDLE.classifier.weightData),format:BUNDLE.classifier.format})});
  baseModel = await tf.loadGraphModel({load:async()=>({modelTopology:BUNDLE.base.modelTopology,weightSpecs:BUNDLE.base.weightSpecs,weightData:b64ToBuf(BUNDLE.base.weightData),format:BUNDLE.base.format})});
  document.getElementById('status').textContent='${isPl ? 'Gotowe — uruchom kamerę' : 'Ready — start the camera'}';
  const b=document.getElementById('btn'); b.disabled=false;
  // Build bar rows.
  const bars=document.getElementById('bars');
  bars.innerHTML=LABELS.map((n,i)=>'<div class="bar-row"><div class="bar-head"><span>'+esc(n)+'</span><span id="pct'+i+'">0%</span></div><div class="bar-track"><div class="bar-fill" id="fill'+i+'" style="width:0%;background:'+(COLORS[i]||'#22c55e')+'"></div></div></div>').join('');
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function start(){
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
  }catch(e){ try{ stream=await navigator.mediaDevices.getUserMedia({video:true}); }catch(e2){ document.getElementById('status').textContent='${isPl ? 'Brak dostępu do kamery' : 'No camera access'}'; return; } }
  const vid=document.getElementById('vid'); vid.srcObject=stream; await vid.play();
  document.getElementById('btn').style.display='none';
  loopTimer=setInterval(predict,120);
}
async function predict(){
  const vid=document.getElementById('vid'); if(!vid.srcObject) return;
  let probs;
  const t=tf.tidy(()=>tf.browser.fromPixels(vid).resizeBilinear([SIZE,SIZE]).toFloat().div(255).expandDims(0));
  try{ const f=baseModel.predict(t); const p=headModel.predict(f); probs=await p.data(); f.dispose(); p.dispose(); } finally { t.dispose(); }
  let max=0; for(let i=1;i<probs.length;i++) if(probs[i]>probs[max]) max=i;
  for(let i=0;i<LABELS.length;i++){ const pc=Math.round((probs[i]||0)*100); document.getElementById('pct'+i).textContent=pc+'%'; document.getElementById('fill'+i).style.width=pc+'%'; }
  const r=document.getElementById('result'); r.textContent=esc(LABELS[max])+' '+Math.round(probs[max]*100)+'%'; r.style.color=COLORS[max]||'#e2e8f0';
}
document.getElementById('btn').addEventListener('click',start);
load().catch(e=>{document.getElementById('status').textContent='Error: '+e.message;});
<\/script>
</body>
</html>`;
}

// ===== UPLOAD MODEL =====
function pickModelFiles(id) {
  const inp = document.getElementById('file-model-' + id);
  if (!inp) return;
  // The 'change' handler is registered once in initBlockAfterPlace. Do NOT also
  // assign inp.onchange here — that made every file pick run tryLoadModelFiles
  // twice concurrently (parsing the file and building two models).
  inp.click();
}

async function tryLoadModelFiles(id) {
  const inp = document.getElementById('file-model-' + id);
  if (!inp || !inp.files.length) { log('warn', lang === 'pl' ? 'Wybierz plik modelu' : 'Select model file first'); return; }
  const allFiles = Array.from(inp.files);
  const jsonFile = allFiles.find(f => f.name.endsWith('.json'));
  // Checked before the single-flight guard: an early return after
  // modelFileLoading = true (outside try/finally) left the guard stuck.
  if (!jsonFile) { log('warn', 'No .json file selected'); return; }
  if (modelFileLoading) { log('info', lang === 'pl' ? 'Model już się wczytuje...' : 'A model is already loading...'); return; }
  modelFileLoading = true;
  // Capture the models we may replace so we can free them once the new ones are
  // live. A model still referenced by fullModel (a trained head kept for saving)
  // is never disposed here.
  const prevInfer = inferModel;
  const prevBase = baseModel;
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
    disposeIfUnused(prevInfer, inferModel, fullModel);
    disposeIfUnused(prevBase, baseModel, fullModel);
    setBlockStatus(document.getElementById(id), 'done');
    log('success', t('log_upload_done', classNames.join(', ')));
    modelSaved = true; // loaded from disk → already exists somewhere
    evaluatePipelineState();
  } catch (err) {
    log('error', 'Upload error: ' + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  } finally {
    modelFileLoading = false;
  }
}

// Dispose a model we're replacing, unless it's the same instance we just kept or
// is still owned elsewhere (e.g. fullModel keeps a trained head for saving).
function disposeIfUnused(model, keepA, keepB) {
  if (model && model !== keepA && model !== keepB) {
    try { model.dispose(); } catch (_) {}
  }
}

async function runLoadIDB(id) {
  const sel = document.getElementById('idb-select-' + id);
  const name = sel ? sel.value : '';
  if (!name) {
    log('warn', lang === 'pl' ? 'Wybierz model z listy (kliknij ↺ aby odświeżyć)' : 'Select a model from the list (click ↺ to refresh)');
    return;
  }
  if (modelFileLoading) { log('info', lang === 'pl' ? 'Model już się wczytuje...' : 'A model is already loading...'); return; }
  modelFileLoading = true;
  const prevInfer = inferModel;
  const prevBase = baseModel;
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
    disposeIfUnused(prevInfer, inferModel, fullModel);
    disposeIfUnused(prevBase, baseModel, fullModel);
    setBlockStatus(document.getElementById(id), 'done');
    log('success', t('log_upload_done', meta.classLabels ? meta.classLabels.join(', ') : '—'));
    modelSaved = true;
    evaluatePipelineState();
  } catch (err) {
    log('error', 'IDB load error: ' + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  } finally {
    modelFileLoading = false;
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
      ? names.map(n => '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>').join('')
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
    for (let i = 0; i < meta.classLabels.length; i++) {
      classNames[i] = meta.classLabels[i];
      // Keep classColors / capturedSamples aligned so a model with more classes
      // than the current session doesn't render undefined-coloured result bars.
      if (!classColors[i]) classColors[i] = CLASS_COLORS[i % CLASS_COLORS.length];
      if (!capturedSamples[i]) capturedSamples[i] = [];
    }
  }
  const el = document.getElementById('meta-' + id);
  if (el) {
    el.innerHTML = `
  <b>${t('lbl_classes')}:</b> ${classNames.map(escapeHtml).join(', ')}<br>
  <b>${t('lbl_accuracy')}:</b> ${meta.trainingAccuracy ? (meta.trainingAccuracy * 100).toFixed(1) + '%' : '—'}<br>
  <b>${t('lbl_timestamp')}:</b> ${meta.timestamp ? new Date(meta.timestamp).toLocaleString() : '—'}
`;
  }
}



// ============================================================

// ===== INFERENCE CAMERA =====
let inferCameraStream = null;
let inferVideoEl = null;
let predHistory = [];
let frozenFrame = false;

// ===== ZERO-SHOT INFERENCE (FULL CLASSIFIER) =====
// Uses MobileNetV3-Small's original 1001-class ImageNet softmax head — a real
// classifier, not feature-vector activations. Loaded lazily on first start so
// users who never open the block don't pay the download cost.
let zsStreams = {}; // id -> MediaStream
let zsIntervals = {}; // id -> setInterval handle
let zeroShotModel = null;
let zeroShotModelLoading = null;

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

async function loadZeroShotModel(statusEl) {
  if (zeroShotModel) return zeroShotModel;
  if (zeroShotModelLoading) return zeroShotModelLoading;
  log('step', lang === 'pl'
    ? '\u0141adowanie pe\u0142nego klasyfikatora MobileNetV3 (1001 klas)...'
    : 'Loading full MobileNetV3 classifier (1001 classes)...');
  zeroShotModelLoading = tf.loadGraphModel(CLASSIFIER_MODEL_URL, {
    onProgress: (frac) => {
      if (statusEl) statusEl.textContent = Math.round(frac * 100) + '%';
    }
  }).then(m => {
    zeroShotModel = m;
    zeroShotModelLoading = null;
    log('success', lang === 'pl'
      ? 'Klasyfikator zero-shot za\u0142adowany \u2713'
      : 'Zero-shot classifier loaded \u2713');
    return m;
  }).catch(err => {
    zeroShotModelLoading = null;
    throw err;
  });
  return zeroShotModelLoading;
}

async function startZeroShot(id) {
  const statusEl = document.getElementById('zs-status-' + id);
  if (cameraOpening['zs-' + id]) return;
  cameraOpening['zs-' + id] = true;
  if (zsStreams[id]) zsStreams[id].getTracks().forEach(t => t.stop());
  try {
    setBlockStatus(document.getElementById(id), 'running');
    if (!zeroShotModel) {
      if (statusEl) statusEl.textContent = lang === 'pl' ? 'Pobieranie modelu...' : 'Downloading model...';
      await loadZeroShotModel(statusEl);
    }
    if (statusEl) statusEl.textContent = '';
    loadImagenetLabels();
    const stream = await getCameraStream();
    if (!isBlockPlaced(id)) { stopStream(stream); return; } // removed during the permission prompt
    zsStreams[id] = stream;
    const vid = document.getElementById('zsvid-' + id);
    if (vid) { vid.srcObject = stream; vid.play().catch(() => {}); }
    const fpsEl = document.getElementById('zsfps-' + id);
    const interval = fpsEl ? parseInt(fpsEl.value) : 200;
    if (zsIntervals[id]) clearInterval(zsIntervals[id]);
    zsIntervals[id] = setInterval(() => runZeroShot(id), interval);
    log('success', lang === 'pl' ? 'Zero-shot uruchomiony' : 'Zero-shot started');
  } catch (err) {
    if (statusEl) statusEl.textContent = err.message || '';
    log('error', (lang === 'pl' ? 'B\u0142\u0105d zero-shot: ' : 'Zero-shot error: ') + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  } finally {
    cameraOpening['zs-' + id] = false;
  }
}

function stopZeroShot(id) {
  if (zsIntervals[id]) { clearInterval(zsIntervals[id]); delete zsIntervals[id]; }
  if (zsStreams[id]) { zsStreams[id].getTracks().forEach(t => t.stop()); delete zsStreams[id]; }
  setBlockStatus(document.getElementById(id), 'idle');
  log('info', lang === 'pl' ? 'Zero-shot zatrzymany' : 'Zero-shot stopped');
}

async function runZeroShot(id) {
  if (!zeroShotModel) return;
  const vid = document.getElementById('zsvid-' + id);
  if (!vid || !vid.srcObject) return;
  const labels = imagenetLabels;
  // Declared outside try so a throw in predict/softmax/data() still frees them
  // — this runs up to 10x/s, so a leak here compounds fast.
  let tensor = null, logitsTensor = null, probsTensor = null;
  try {
    tensor = tf.tidy(() =>
      tf.browser.fromPixels(vid)
        .resizeBilinear([224, 224])
        .toFloat().div(255)
        .expandDims(0)
    );
    // The Kaggle classification model outputs raw logits, not probabilities.
    // Apply softmax to convert to a proper 0-1 probability distribution.
    logitsTensor = zeroShotModel.predict(tensor);
    probsTensor = tf.softmax(logitsTensor);
    const probs = await probsTensor.data();
    // Partial top-5 selection — single linear pass instead of allocating
    // 1001 wrapper objects + full sort every frame.
    const K = 5;
    const topV = new Float32Array(K).fill(-Infinity);
    const topI = new Int32Array(K);
    for (let i = 0; i < probs.length; i++) {
      const v = probs[i];
      if (v > topV[K - 1]) {
        let j = K - 1;
        while (j > 0 && topV[j - 1] < v) {
          topV[j] = topV[j - 1]; topI[j] = topI[j - 1]; j--;
        }
        topV[j] = v; topI[j] = i;
      }
    }
    const top5 = [];
    for (let k = 0; k < K; k++) top5.push({ v: topV[k], i: topI[k] });
    const resultsEl = document.getElementById('zs-results-' + id);
    if (resultsEl && labels) {
      resultsEl.innerHTML = top5.map(({ v, i }) => {
        const label = labels[i] || `class_${i}`;
        const pct = Math.min(100, v * 100).toFixed(1);
        return `<div style="margin-bottom:3px">
<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:1px">
  <span style="font-weight:600;color:var(--c-model);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">${escapeHtml(label)}</span>
  <span style="color:var(--c-muted)">${pct}%</span>
</div>
<div style="background:#E2E8F0;border-radius:3px;height:5px">
  <div style="background:var(--c-model);width:${pct}%;height:5px;border-radius:3px;transition:width .15s"></div>
</div></div>`;
      }).join('');
    }
  } catch (e) { /* silent — frame may not be ready yet */ }
  finally {
    if (tensor) tensor.dispose();
    if (logitsTensor) logitsTensor.dispose();
    if (probsTensor) probsTensor.dispose();
  }
}

async function startInferCamera(id) {
  if (cameraOpening['infer']) return;
  cameraOpening['infer'] = true;
  try {
    if (inferCameraStream) inferCameraStream.getTracks().forEach(t => t.stop());
    // Clear any leftover freeze from a previous session — otherwise the
    // inference loop early-returns forever and predictions never resume.
    frozenFrame = false;
    const stream = await getCameraStream();
    if (!isBlockPlaced(id)) { stopStream(stream); return; } // removed during the permission prompt
    inferCameraStream = stream;
    const vid = document.getElementById('vid-' + id);
    if (vid) { vid.srcObject = inferCameraStream; vid.play().catch(() => {}); }
    inferVideoEl = vid;
    setBlockStatus(document.getElementById(id), 'running');
    log('success', t('log_camera_start') + ' (inference)');
    // Start inference loop
    const fpsEl = document.getElementById('fps-' + id);
    const interval = fpsEl ? parseInt(fpsEl.value) : 100;
    if (inferInterval) clearInterval(inferInterval);
    inferInterval = setInterval(() => runInference(id), interval);
    evaluatePipelineState();
  } catch (err) {
    log('error', t('log_camera_err') + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  } finally {
    cameraOpening['infer'] = false;
  }
}

function stopInferCamera(id) {
  if (inferInterval) { clearInterval(inferInterval); inferInterval = null; }
  if (inferCameraStream) { inferCameraStream.getTracks().forEach(t => t.stop()); inferCameraStream = null; }
  frozenFrame = false;
  setBlockStatus(document.getElementById(id), 'idle');
  log('info', 'Inference camera stopped');
  evaluatePipelineState();
}

// Build the predict-block bar DOM ONCE per session, then mutate widths/text
// per frame. Massive saving over innerHTML-rebuild: no parser, no GC churn,
// no layout reflow on every prediction.
function ensurePredictBarsDOM(predictBlock, classCount, threshold) {
  const cached = _predUI.get(predictBlock);
  if (cached && cached.rows.length === classCount) return cached;
  const barsEl = document.getElementById('pred-bars-' + predictBlock.id);
  if (!barsEl) return null;

  const thrPct = (threshold * 100).toFixed(1);
  const thrLabel = lang === 'pl' ? 'próg' : 'threshold';

  // Threshold marker line + per-class rows
  const frag = document.createDocumentFragment();
  const thrEl = document.createElement('div');
  thrEl.className = 'pred-thr-label';
  thrEl.style.setProperty('--thr', thrPct + '%');
  const thrSpan = document.createElement('span');
  thrSpan.textContent = `${thrLabel} ${thrPct}%`;
  thrEl.appendChild(thrSpan);
  frag.appendChild(thrEl);

  const rows = [];
  for (let i = 0; i < classCount; i++) {
    const row = document.createElement('div');
    row.className = 'pred-row';
    row.style.setProperty('--thr', thrPct + '%');

    const lbl = document.createElement('div');
    lbl.className = 'pred-label';
    const name = document.createElement('span');
    name.style.fontWeight = '600';
    name.style.color = classColors[i];
    name.textContent = classNames[i];
    const pct = document.createElement('span');
    pct.style.color = 'var(--c-muted)';
    pct.textContent = '0.0%';
    lbl.appendChild(name);
    lbl.appendChild(pct);

    const track = document.createElement('div');
    track.className = 'pred-track';
    const fill = document.createElement('div');
    fill.className = 'pred-fill';
    fill.style.background = classColors[i];
    fill.style.width = '0%';
    track.appendChild(fill);

    row.appendChild(lbl);
    row.appendChild(track);
    frag.appendChild(row);

    rows.push({ row, name, pct, fill });
  }
  barsEl.replaceChildren(frag);
  const ui = { rows, thrEl, thrSpan, thrPct, classCount };
  _predUI.set(predictBlock, ui);
  return ui;
}

function updatePredictBars(ui, predictions, threshold) {
  if (!ui) return;
  const newThrPct = (threshold * 100).toFixed(1);
  if (newThrPct !== ui.thrPct) {
    ui.thrPct = newThrPct;
    ui.thrEl.style.setProperty('--thr', newThrPct + '%');
    ui.thrSpan.textContent = `${lang === 'pl' ? 'próg' : 'threshold'} ${newThrPct}%`;
    for (const r of ui.rows) r.row.style.setProperty('--thr', newThrPct + '%');
  }
  for (let i = 0; i < ui.rows.length; i++) {
    const p = predictions[i];
    const pctTxt = (p * 100).toFixed(1);
    const r = ui.rows[i];
    r.fill.style.width = pctTxt + '%';
    r.fill.classList.toggle('below', p < threshold);
    r.pct.textContent = pctTxt + '%';
    // Class names can change (rename) — keep label in sync cheaply.
    if (r.name.textContent !== classNames[i]) {
      r.name.textContent = classNames[i];
      r.name.style.color = classColors[i];
      r.fill.style.background = classColors[i];
    }
  }
}

async function runInference(camId) {
  if (!inferModel) return;
  if (frozenFrame) return;
  const vid = inferVideoEl;
  if (!vid || !vid.srcObject) return;
  if (!baseModel) return; // user is between block placements; silent

  // Declared outside try so a throw in either predict() (e.g. a loaded model
  // whose input shape doesn't match the base features) frees them instead of
  // leaking ~0.6 MB per tick at 5-10 fps.
  let tensor = null, features = null, predTensor = null;
  try {
    const inputSize = (inferMetadata && inferMetadata.inputSize) || 224;
    tensor = tf.tidy(() =>
      tf.browser.fromPixels(vid)
        .resizeBilinear([inputSize, inputSize])
        .toFloat().div(255)
        .expandDims(0)
    );

    // Two-step prediction: baseModel (frozen GraphModel) -> features ->
    // inferModel (classifier head) -> class probabilities. baseModel is
    // synchronous; no need to await.
    features = baseModel.predict(tensor);
    predTensor = inferModel.predict(features);
    const predictions = await predTensor.data();

    // argmax + confidence in one pass — avoids spread + indexOf.
    let maxIdx = 0;
    for (let i = 1; i < predictions.length; i++) {
      if (predictions[i] > predictions[maxIdx]) maxIdx = i;
    }
    const confidence = predictions[maxIdx];

    // Update merged show-results block — patch DOM nodes built once.
    const predictBlock = blocksByType['show-results'];
    if (predictBlock) {
      const thresh = parseFloat(document.getElementById('thr-' + predictBlock.id)?.value || '0.7');
      const ui = ensurePredictBarsDOM(predictBlock, predictions.length, thresh);
      updatePredictBars(ui, predictions, thresh);
      const result = document.getElementById('pred-result-' + predictBlock.id);
      if (result) {
        if (confidence >= thresh) {
          result.textContent = `${classNames[maxIdx]} \u2014 ${(confidence * 100).toFixed(1)}%`;
          result.style.color = classColors[maxIdx];
          result.style.borderLeft = `4px solid ${classColors[maxIdx]}`;
          result.style.fontStyle = '';
        } else {
          result.textContent = lang === 'pl' ? 'poni\u017cej progu pewno\u015bci' : 'below confidence threshold';
          result.style.color = 'var(--c-muted)';
          result.style.borderLeft = '';
          result.style.fontStyle = 'italic';
        }
      }
    }

    // Track recent predictions for the small history chart.
    if (blocksByType['show-results']) {
      predHistory.push({ idx: maxIdx, conf: confidence });
      if (predHistory.length > 30) predHistory.shift();
      drawHistChart(blocksByType['show-results'].id);
    }

    // Rate-limited probability log: only when class changes or 1s elapsed.
    const now = performance.now();
    if (maxIdx !== _lastLoggedClass || now - _lastLogTime > 1000) {
      _lastLoggedClass = maxIdx;
      _lastLogTime = now;
      const raw = new Array(predictions.length);
      for (let i = 0; i < predictions.length; i++) raw[i] = predictions[i].toFixed(3);
      log('data', `[${raw.join(', ')}]`);
    }

  } catch (err) {
    // silent
  } finally {
    if (predTensor) predTensor.dispose();
    if (features) features.dispose();
    if (tensor) tensor.dispose();
  }
}

// ===== XAI / HEATMAP GENERATOR =====
// Method: occlusion sensitivity. For every patch in a grid, replace the patch
// pixels with a BLURRED version of the same patch (not solid grey — grey
// introduces synthetic edges the model never saw during training). Compare
// the predicted class probability to the baseline; the drop is positive
// evidence ("this region supports the answer"), the rise is negative evidence
// ("this region was a distractor"). Visualised on a diverging red/blue map.

let xaiCancelled = false;
let xaiRunning = false;

function stopXAI(id) {
  if (!xaiRunning) return;
  xaiCancelled = true;
  log('warn', lang === 'pl' ? 'Zatrzymywanie analizy XAI...' : 'Stopping XAI analysis...');
}

async function runXAI(id) {
  if (xaiRunning) return; // single-flight
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

  const detailEl = document.getElementById('xai-detail-' + id);
  const detailText = document.getElementById('xai-detail-text-' + id);
  const thumbCv = document.getElementById('xai-thumb-' + id);
  const progEl = document.getElementById('xai-prog-' + id);
  if (detailEl) detailEl.style.display = 'none';
  if (progEl) { progEl.style.display = 'block'; progEl.value = 0; }

  const canvas = document.getElementById('xai-vid-' + id);
  const overlay = document.getElementById('xai-overlay-' + id);
  if (!canvas || !overlay) return;

  const inputSize = (inferMetadata && inferMetadata.inputSize) || 224;
  const block = document.getElementById(id);
  setBlockStatus(block, 'running');
  xaiRunning = true;
  xaiCancelled = false;

  try {
  // ── 1. Capture frame using EXACTLY the same preprocessing as inference ──
  canvas.width = inputSize;
  canvas.height = inputSize;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(vid, 0, 0, inputSize, inputSize);
  const frameImageData = ctx.getImageData(0, 0, inputSize, inputSize);

  // ── 1b. Pre-compute a heavily-blurred copy of the frame for occlusion.
  // Replacing a patch with its blurred counterpart removes information without
  // adding synthetic edges (solid grey introduces artifacts the model never
  // saw during training). One blur op on the whole canvas is far cheaper than
  // synthesising blurred pixels per patch.
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = inputSize;
  blurCanvas.height = inputSize;
  const bctx = blurCanvas.getContext('2d');
  bctx.filter = 'blur(12px)';
  bctx.drawImage(canvas, 0, 0);
  bctx.filter = 'none';
  const blurredData = bctx.getImageData(0, 0, inputSize, inputSize).data;

  // ── 2. Size the overlay to the container's physical pixel dimensions ──
  const wrap = canvas.parentElement;
  const displayW = wrap.clientWidth || inputSize;
  const displayH = wrap.clientHeight || inputSize;
  const dpr = window.devicePixelRatio || 1;
  overlay.width = Math.round(displayW * dpr);
  overlay.height = Math.round(displayH * dpr);

  // Scale factors: one model-input pixel → overlay physical pixels
  const scaleX = overlay.width / inputSize;
  const scaleY = overlay.height / inputSize;

  // ── 3. Baseline prediction on the unmodified frame ──
  let baseClass, baseConf, basePreds;
  {
    const tInput = tf.browser.fromPixels(frameImageData).toFloat().div(255).expandDims(0);
    const features = baseModel.predict(tInput);
    const predTensor = inferModel.predict(features);
    basePreds = await predTensor.data();
    tInput.dispose();
    features.dispose();
    predTensor.dispose();
    baseClass = Array.from(basePreds).reduce((best, v, i) => v > basePreds[best] ? i : best, 0);
    baseConf = basePreds[baseClass];
  }

  // ── 3b. Method branch: saliency vs occlusion ──
  // Saliency uses |grad of class score w.r.t. input pixels| — one forward +
  // one backward pass through both models. Much faster than occlusion when it
  // works, but TFJS GraphModels imported from Kaggle don't always support
  // backprop through every op. On failure we fall through to occlusion.
  const methodEl = document.getElementById('xai-method-' + id);
  const method = methodEl ? methodEl.value : 'occlusion';
  if (method === 'saliency') {
    const ok = await runXAISaliency({
      id, canvas, overlay, frameImageData, inputSize,
      scaleX, scaleY, baseClass, baseConf, basePreds,
      resultEl, detailEl, detailText, thumbCv, progEl, block
    });
    if (ok) return; // finally clause cleans up xaiRunning, etc.
    log('warn', lang === 'pl'
      ? 'Saliency niedostępny dla tego modelu — przełączam na okluzję'
      : 'Saliency unavailable for this model — falling back to occlusion');
  }

  const patchSizeEl = document.getElementById('xai-patch-' + id);
  const PATCH_SIZE = patchSizeEl ? parseInt(patchSizeEl.value) : 32;
  const STRIDE = PATCH_SIZE;

  const gridW = Math.ceil(inputSize / STRIDE);
  const gridH = Math.ceil(inputSize / STRIDE);
  // Signed importance: + = patch supports prediction, - = distractor.
  const heatmap = new Float32Array(gridW * gridH);
  // Full per-patch prediction vector for the counterfactual narrative.
  const patchPreds = new Array(gridW * gridH);

  await new Promise(r => setTimeout(r, 30));

  // ── 4. Occlusion loop, BATCHED per row ──
  // Building a tensor with `gridW` occluded variants and running ONE predict()
  // per row is ~10x faster than the previous one-predict-per-patch loop.
  for (let y = 0; y < gridH; y++) {
    if (xaiCancelled) throw new Error('cancelled');
    const rowImageDatas = [];
    for (let x = 0; x < gridW; x++) {
      const buf = new Uint8ClampedArray(frameImageData.data);
      // Replace patch pixels with their blurred counterparts
      for (let py = 0; py < PATCH_SIZE; py++) {
        for (let px = 0; px < PATCH_SIZE; px++) {
          const ix = x * STRIDE + px;
          const iy = y * STRIDE + py;
          if (ix < inputSize && iy < inputSize) {
            const i4 = (iy * inputSize + ix) * 4;
            buf[i4]     = blurredData[i4];
            buf[i4 + 1] = blurredData[i4 + 1];
            buf[i4 + 2] = blurredData[i4 + 2];
          }
        }
      }
      rowImageDatas.push(new ImageData(buf, inputSize, inputSize));
    }

    const batchTensor = tf.tidy(() => tf.stack(
      rowImageDatas.map(im => tf.browser.fromPixels(im).toFloat().div(255))
    ));
    const featBatch = baseModel.predict(batchTensor);
    const predBatch = inferModel.predict(featBatch);
    const predsArr = await predBatch.array();
    batchTensor.dispose();
    featBatch.dispose();
    predBatch.dispose();

    for (let x = 0; x < gridW; x++) {
      const idx = y * gridW + x;
      patchPreds[idx] = predsArr[x];
      heatmap[idx] = baseConf - predsArr[x][baseClass];
    }

    if (progEl) progEl.value = Math.round(((y + 1) / gridH) * 100);
    renderXAIHeatmap(overlay, heatmap, gridW, gridH, STRIDE,
      overlay.width / inputSize, overlay.height / inputSize);
    await new Promise(r => setTimeout(r, 0));
  }

  // ── 5. Final render + plain-language explanation ──
  renderXAIHeatmap(overlay, heatmap, gridW, gridH, STRIDE, scaleX, scaleY);

  // Find the most-supportive patch (largest positive importance)
  let bestIdx = 0;
  for (let i = 1; i < heatmap.length; i++) {
    if (heatmap[i] > heatmap[bestIdx]) bestIdx = i;
  }
  const bestX = (bestIdx % gridW) * STRIDE;
  const bestY = Math.floor(bestIdx / gridW) * STRIDE;
  const bestDrop = heatmap[bestIdx];
  const counterPreds = patchPreds[bestIdx] || basePreds;
  let counterClass = 0;
  for (let i = 1; i < counterPreds.length; i++) {
    if (counterPreds[i] > counterPreds[counterClass]) counterClass = i;
  }

  // Outline the single most-important region so "the model looked HERE" is
  // unmistakable, on top of the heatmap.
  if (bestDrop > 0.001) {
    drawXAIFocusBox(overlay, bestX, bestY, PATCH_SIZE, scaleX, scaleY);
  }

  const lbl = classNames[baseClass];
  const pct = (baseConf * 100).toFixed(0);
  // Headline: clear plain-language statement of the decision + how sure.
  if (resultEl) {
    const sees = lang === 'pl' ? 'Model widzi' : 'The model sees';
    const sure = baseConf >= 0.85 ? (lang === 'pl' ? 'jest pewny' : 'confident')
      : baseConf >= 0.6 ? (lang === 'pl' ? 'raczej pewny' : 'fairly sure')
      : (lang === 'pl' ? 'niepewny' : 'unsure');
    resultEl.innerHTML = `<span style="color:${classColors[baseClass]}">🔍 ${sees} „${escapeHtml(lbl)}" ${pct}%</span> <span style="font-weight:400;color:var(--c-muted);font-style:normal">(${sure})</span>`;
  }

  if (thumbCv && bestDrop > 0.001) {
    thumbCv.width = 64; thumbCv.height = 64;
    const tctx = thumbCv.getContext('2d');
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(canvas, bestX, bestY, PATCH_SIZE, PATCH_SIZE, 0, 0, 64, 64);
  }
  if (detailEl && detailText && bestDrop > 0.001) {
    const dropPct = (bestDrop * 100).toFixed(0);
    const counterLbl = classNames[counterClass];
    const baseLbl = classNames[baseClass];
    // Plain-language "why": what it focused on (thumbnail beside), and what
    // would change its mind.
    let txt;
    if (counterClass !== baseClass) {
      txt = lang === 'pl'
        ? `Najważniejszy dowód to zaznaczony fragment (obok). Bez niego pewność „${baseLbl}" spada o ${dropPct} pkt i model uznałby to za „${counterLbl}".`
        : `The key evidence is the highlighted patch (shown left). Without it, "${baseLbl}" confidence falls ${dropPct} points and the model would call this "${counterLbl}".`;
    } else {
      txt = lang === 'pl'
        ? `Najważniejszy dowód to zaznaczony fragment (obok). Bez niego pewność „${baseLbl}" spada o ${dropPct} pkt.`
        : `The key evidence is the highlighted patch (shown left). Without it, "${baseLbl}" confidence falls ${dropPct} points.`;
    }
    detailText.textContent = txt;
    detailEl.style.display = 'block';
    // Per-class delta breakdown for the most-important patch.
    // Shows: baseline % (grey track), occluded % (color fill), and the
    // signed change in percentage points. Lets students see exactly which
    // class the evidence shifts to when the hot region is hidden.
    const classesEl = document.getElementById('xai-classes-' + id);
    if (classesEl && counterPreds && counterPreds.length === basePreds.length) {
      const rows = [];
      for (let i = 0; i < basePreds.length; i++) {
        const b = basePreds[i];
        const o = counterPreds[i];
        const deltaPP = (o - b) * 100;
        const dir = deltaPP > 0.05 ? '+' : deltaPP < -0.05 ? '-' : '0';
        const arrow = deltaPP > 0.05 ? '&uarr;' : deltaPP < -0.05 ? '&darr;' : '&middot;';
        const color = deltaPP > 0.05 ? '#16A34A' : deltaPP < -0.05 ? '#DC2626' : '#94A3B8';
        rows.push(`<div class="xai-class-row">
  <span class="xai-class-dot" style="background:${classColors[i]}"></span>
  <span class="xai-class-name" title="${escapeHtml(classNames[i])}">${escapeHtml(classNames[i])}</span>
  <span class="xai-class-track">
    <span class="xai-bar-base" style="width:${(b*100).toFixed(1)}%"></span>
    <span class="xai-bar-occ" style="width:${(o*100).toFixed(1)}%;background:${classColors[i]}"></span>
  </span>
  <span class="xai-class-delta" style="color:${color}">${arrow}&nbsp;${Math.abs(deltaPP).toFixed(1)}pp</span>
</div>`);
      }
      classesEl.innerHTML = rows.join('');
    }
  }

  log('eval', `XAI: "${classNames[baseClass]}" ${(baseConf * 100).toFixed(1)}% top patch drop=${(bestDrop * 100).toFixed(1)}pp${counterClass !== baseClass ? ' -> ' + classNames[counterClass] : ''}`);
  setBlockStatus(block, 'done');
  } catch (err) {
    if (err.message === 'cancelled') {
      log('warn', 'XAI cancelled');
      if (resultEl) resultEl.textContent = lang === 'pl' ? 'Przerwano' : 'Cancelled';
      setBlockStatus(block, 'idle');
    } else {
      log('error', 'XAI error: ' + err.message);
      console.error(err);
      setBlockStatus(block, 'error');
    }
  } finally {
    xaiRunning = false;
    xaiCancelled = false;
    if (progEl) progEl.style.display = 'none';
  }
}

// Draw a bright outlined box (with a small "★" marker) around the single most
// important region, on top of the heatmap, so students immediately see the one
// spot the model relied on most.
function drawXAIFocusBox(overlay, px, py, patch, scaleX, scaleY) {
  const octx = overlay.getContext('2d');
  const x = px * scaleX, y = py * scaleY, w = patch * scaleX, h = patch * scaleY;
  octx.save();
  octx.lineWidth = Math.max(3, 3 * (window.devicePixelRatio || 1));
  octx.strokeStyle = '#FACC15';
  octx.shadowColor = 'rgba(0,0,0,0.6)';
  octx.shadowBlur = 6;
  octx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  octx.restore();
}

// Diverging colormap renderer. Positive heatmap values (occlusion drops the
// predicted class confidence) -> red. Negative values (occlusion raises it,
// so that region was a distractor) -> blue. Magnitude controls alpha. No
// vignette so the underlying image stays readable.
function renderXAIHeatmap(overlay, heatmap, gridW, gridH, STRIDE, scaleX, scaleY) {
  const octx = overlay.getContext('2d');
  octx.clearRect(0, 0, overlay.width, overlay.height);

  let maxAbs = 1e-6;
  for (let i = 0; i < heatmap.length; i++) {
    const a = Math.abs(heatmap[i]);
    if (a > maxAbs) maxAbs = a;
  }

  // Dark vignette behind the colors — dims the image uniformly so the
  // red/blue regions stand out clearly even on bright video frames.
  octx.fillStyle = 'rgba(0,0,0,0.45)';
  octx.fillRect(0, 0, overlay.width, overlay.height);

  // Moderate blur smooths patch edges without washing out the signal.
  const blurPx = Math.round(STRIDE * scaleX * 0.22);
  octx.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const v = heatmap[y * gridW + x] / maxAbs;
      const mag = Math.abs(v);
      if (mag < 0.07) continue; // show more patches, suppress only near-zero
      // Alpha scales from 0.50 at the cutoff to 1.0 at full magnitude —
      // high-importance regions are fully opaque and unmissable.
      const alpha = 0.50 + mag * 0.50;
      octx.fillStyle = v > 0
        ? `rgba(255,40,40,${alpha.toFixed(3)})`   // red — supports prediction
        : `rgba(30,100,255,${alpha.toFixed(3)})`; // blue — distractor
      octx.fillRect(
        x * STRIDE * scaleX,
        y * STRIDE * scaleY,
        STRIDE * scaleX,
        STRIDE * scaleY
      );
    }
  }
  octx.filter = 'none';
}

// Gradient-based saliency: |dy/dx| where y = predicted class score and x = input
// pixels. One forward + one backward pass. Returns true if rendering succeeded,
// false if the model doesn't support backprop (caller falls back to occlusion).
async function runXAISaliency(p) {
  const {
    canvas, overlay, frameImageData, inputSize, baseClass, baseConf, basePreds,
    resultEl, detailEl, detailText, thumbCv, progEl, block
  } = p;
  if (progEl) progEl.value = 30;

  // Compute |gradient of class score w.r.t. input| via tf.grad. The score is
  // probs[baseClass] — taking just the predicted class, so the saliency
  // answers "which input pixels most affect *this specific class's* output?".
  let saliency2D = null;
  try {
    saliency2D = tf.tidy(() => {
      const inputT = tf.browser.fromPixels(frameImageData).toFloat().div(255).expandDims(0);
      const gradFn = tf.grad((inp) => {
        const features = baseModel.predict(inp);
        const probs = inferModel.predict(features);
        // gather the scalar class score; .sum() to make it a 0-D scalar
        return probs.gather([baseClass], 1).sum();
      });
      const grads = gradFn(inputT);
      // Aggregate across RGB channels, magnitude, drop batch dim
      return grads.abs().max(-1).squeeze();
    });
    if (progEl) progEl.value = 70;
    const arr = await saliency2D.array(); // [inputSize, inputSize]
    saliency2D.dispose();
    saliency2D = null;

    // Find max for normalization + argmax for the most-important pixel
    let max = 1e-9;
    let argY = 0, argX = 0;
    for (let y = 0; y < inputSize; y++) {
      for (let x = 0; x < inputSize; x++) {
        const v = arr[y][x];
        if (v > max) { max = v; argY = y; argX = x; }
      }
    }

    // Render saliency on overlay.
    // Alpha uses a power curve (^0.35) so mid-range gradients are visible,
    // not just the handful of pixels at the absolute maximum.
    // Same dark vignette base as the occlusion heatmap so colors pop.
    const off = document.createElement('canvas');
    off.width = inputSize;
    off.height = inputSize;
    const offCtx = off.getContext('2d');
    const imgData = offCtx.createImageData(inputSize, inputSize);
    for (let y = 0; y < inputSize; y++) {
      for (let x = 0; x < inputSize; x++) {
        const v = Math.min(1, arr[y][x] / max);
        if (v < 0.04) continue; // skip noise floor
        const alpha = Math.pow(v, 0.35); // gamma boost — weak gradients visible
        const i = (y * inputSize + x) * 4;
        imgData.data[i]     = 255;
        imgData.data[i + 1] = 40;
        imgData.data[i + 2] = 40;
        imgData.data[i + 3] = Math.round(alpha * 255);
      }
    }
    offCtx.putImageData(imgData, 0, 0);
    const octx = overlay.getContext('2d');
    octx.clearRect(0, 0, overlay.width, overlay.height);
    // Dark base matches the occlusion heatmap style — dims the video so
    // the bright red saliency regions are immediately obvious.
    octx.fillStyle = 'rgba(0,0,0,0.45)';
    octx.fillRect(0, 0, overlay.width, overlay.height);
    octx.imageSmoothingEnabled = true;
    octx.filter = 'blur(8px)';
    octx.drawImage(off, 0, 0, overlay.width, overlay.height);
    octx.filter = 'none';

    // Headline result + thumbnail of the most-important region
    if (resultEl) {
      const lbl = classNames[baseClass];
      const pct = (baseConf * 100).toFixed(0);
      const sees = lang === 'pl' ? 'Model widzi' : 'The model sees';
      const sure = baseConf >= 0.85 ? (lang === 'pl' ? 'jest pewny' : 'confident')
        : baseConf >= 0.6 ? (lang === 'pl' ? 'raczej pewny' : 'fairly sure')
        : (lang === 'pl' ? 'niepewny' : 'unsure');
      resultEl.innerHTML = `<span style="color:${classColors[baseClass]}">🔍 ${sees} „${escapeHtml(lbl)}" ${pct}%</span> <span style="font-weight:400;color:var(--c-muted);font-style:normal">(${sure})</span>`;
    }
    if (thumbCv) {
      const half = 32; // 64×64 thumb centred on hottest pixel
      const sx = Math.max(0, Math.min(inputSize - half * 2, argX - half));
      const sy = Math.max(0, Math.min(inputSize - half * 2, argY - half));
      thumbCv.width = 64; thumbCv.height = 64;
      const tctx = thumbCv.getContext('2d');
      tctx.imageSmoothingEnabled = true;
      tctx.drawImage(canvas, sx, sy, half * 2, half * 2, 0, 0, 64, 64);
    }
    if (detailEl && detailText) {
      const lbl = classNames[baseClass];
      detailText.textContent = lang === 'pl'
        ? `Podświetlone piksele najmocniej wpływają na decyzję „${lbl}" — to na nie model patrzył najbardziej.`
        : `The highlighted pixels most affect the "${lbl}" decision — these are what the model paid the most attention to.`;
      detailEl.style.display = 'block';
      // Saliency is a single-pass method — no per-class deltas. Hide the row.
      const classesEl = document.getElementById('xai-classes-' + p.id);
      if (classesEl) classesEl.innerHTML = '';
    }
    if (progEl) progEl.value = 100;
    log('eval', `XAI saliency: "${classNames[baseClass]}" ${(baseConf * 100).toFixed(1)}% argmax=(${argX},${argY})`);
    setBlockStatus(block, 'done');
    return true;
  } catch (err) {
    if (saliency2D) try { saliency2D.dispose(); } catch (_) {}
    console.warn('Saliency failed:', err);
    return false;
  }
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
    ctx.fillStyle = classColors[p.idx] || '#059669';
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

// One-click "save to browser" — usable from the post-train toast without the
// user having to find the Save Model block. Reuses a placed block's name field
// if present, otherwise a sensible default.
async function quickSaveModel() {
  if (!fullModel || !baseModel) {
    showToast(lang === 'pl' ? 'Brak wytrenowanego modelu do zapisania.' : 'No trained model to save.', 'warn', { duration: 3000 });
    return;
  }
  const saveBlock = placedBlocks.find(b => b.type === 'save-model');
  let name = 'model-1';
  if (saveBlock) {
    const el = document.getElementById('model-name-' + saveBlock.id);
    if (el && el.value.trim()) name = el.value.trim();
  }
  try {
    fullModel.userDefinedMetadata = modelMetadata;
    await fullModel.save('indexeddb://ml-blocks-' + name);
    await baseModel.save('indexeddb://ml-blocks-base-' + name);
    localStorage.setItem('ml-blocks-meta-' + name, JSON.stringify(modelMetadata));
    modelSaved = true;
    if (saveBlock && saveBlock.card) setBlockStatus(saveBlock.card, 'done');
    evaluatePipelineState();
    log('success', t('log_save_idb'));
    showToast(lang === 'pl' ? `Zapisano jako „${name}"` : `Saved as "${name}"`, 'success', { duration: 3000 });
  } catch (err) {
    log('error', 'Save error: ' + err.message);
    showToast((lang === 'pl' ? 'Błąd zapisu: ' : 'Save error: ') + err.message, 'error');
  }
}

// Show a "trained — now save" toast with a one-click Save action, and pulse the
// Save Model block if present.
function notifyModelTrained() {
  const saveBlocks = placedBlocks.filter(b => b.type === 'save-model');
  saveBlocks.forEach(b => {
    if (b.card) {
      b.card.classList.add('save-prompt');
      setTimeout(() => b.card.classList.remove('save-prompt'), 6000);
    }
  });
  showToast(
    lang === 'pl' ? '✅ Model gotowy — zapisz go, zanim zamkniesz kartę!' : '✅ Model trained — save it before closing the tab!',
    'success',
    {
      duration: 9000,
      actionLabel: lang === 'pl' ? '💾 Zapisz teraz' : '💾 Save now',
      onAction: quickSaveModel
    }
  );
}

// Lightweight bottom-right toast notifications. Multiple stack vertically.
// Toast with optional action button(s). opts:
//   { kind, duration, actionLabel, onAction }  — single action
//   or { kind, duration, actions: [{label, onClick, primary}] } — multiple.
// Clicking an action dismisses the toast and runs its handler.
function showToast(text, kind, opts) {
  opts = opts || {};
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = 'toast toast-' + (kind || 'info');
  const msg = document.createElement('span');
  msg.className = 'toast-msg';
  msg.textContent = text;
  el.appendChild(msg);

  const actions = opts.actions || (opts.actionLabel ? [{ label: opts.actionLabel, onClick: opts.onAction, primary: true }] : []);
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  };
  if (actions.length) {
    const row = document.createElement('div');
    row.className = 'toast-actions';
    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'toast-btn' + (a.primary ? ' toast-btn-primary' : '');
      btn.textContent = a.label;
      btn.onclick = () => { dismiss(); if (a.onClick) a.onClick(); };
      row.appendChild(btn);
    });
    el.appendChild(row);
  }
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(dismiss, opts.duration || 5500);
  return dismiss;
}

// Promise-based confirm dialog — a non-blocking replacement for window.confirm()
// that matches the app's visual language and is bilingual. Resolves true/false.
function uiConfirm(message, opts) {
  opts = opts || {};
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay confirm-overlay';
    const okLabel = opts.okLabel || (lang === 'pl' ? 'Potwierdź' : 'Confirm');
    const cancelLabel = opts.cancelLabel || (lang === 'pl' ? 'Anuluj' : 'Cancel');
    const box = document.createElement('div');
    box.className = 'modal-box confirm-box';
    box.innerHTML = `
      <div class="confirm-msg">${escapeHtml(message)}</div>
      <div class="confirm-actions">
        <button class="confirm-cancel">${escapeHtml(cancelLabel)}</button>
        <button class="confirm-ok${opts.danger ? ' confirm-ok-danger' : ''}">${escapeHtml(okLabel)}</button>
      </div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const close = (val) => { overlay.remove(); document.removeEventListener('keydown', onKey); resolve(val); };
    // Enter is left to the focused button's native click (OK gets focus below);
    // a document-level Enter handler fired before the click and resolved true
    // even when Cancel was focused.
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    box.querySelector('.confirm-ok').onclick = () => close(true);
    box.querySelector('.confirm-cancel').onclick = () => close(false);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => box.querySelector('.confirm-ok').focus());
  });
}

// Warn before unload if a fresh model has not been saved.
window.addEventListener('beforeunload', (e) => {
  if (fullModel && !modelSaved) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});

// Pipeline-wide readiness evaluation. Sets the .done class on each phase pill
// based on global pipeline state. Called from every mutation path so the
// flowbar always reflects what the user has accomplished.
let modelSaved = false;
function evaluatePipelineState() {
  const hasData = capturedSamples.some(a => a && a.length > 0);
  const hasLabels = classNames.length >= 2 && classNames.every(n => (n || '').trim().length > 0);
  const phaseStates = {
    data: hasData,
    label: hasLabels && hasData,
    prep: !!preparedData,
    model: !!baseModel,
    train: !!fullModel,
    deploy: modelSaved,
    infer: !!inferModel
  };
  // Cached NodeList — set in DOMContentLoaded, reused on every state change.
  const pills = _flowPillEls || (_flowPillEls = document.querySelectorAll('.flow-pill'));
  for (let i = 0; i < pills.length; i++) {
    const pill = pills[i];
    pill.classList.toggle('done', !!phaseStates[pill.dataset.phase]);
  }
  // Notify other UI that needs to re-render on state change
  if (typeof refreshAllPrereqStrips === 'function') refreshAllPrereqStrips();
  if (typeof refreshEmptyState === 'function') refreshEmptyState();
}
const BLOCK_PHASE_MAP = {
  'camera-input': 'data', 'label-classes': 'label',
  'prepare-data': 'prep', 'pretrained-model': 'model',
  'train-model': 'train', 'save-model': 'deploy',
  'upload-model': 'data', 'camera-infer': 'data',
  'show-results': 'infer', 'evaluate': 'infer', 'deploy-export': 'deploy'
};

// ===== PIPELINE RUNNER =====
async function runPipeline() {
  // Single-flight: a second Run while one is in flight would drive two prepares
  // and two trainings over the same shared state.
  if (pipelineRunning) {
    log('warn', lang === 'pl' ? 'Pipeline już działa.' : 'Pipeline is already running.');
    return;
  }
  pipelineRunning = true;
  try {
  // Run in canonical pipeline order (matches the connector lines and badges),
  // not by physical x-position — so a block dropped anywhere still runs in the
  // right order.
  const sorted = pipelineSorted();
  log('step', '=== Pipeline Start ===');

  for (const b of sorted) {
    const id = b.id;
    // Activate flow bar phase
    setFlowPhase(BLOCK_PHASE_MAP[b.type] || 'data');
    // Highlight the block (and the connector leading into it) that's running.
    const card = document.getElementById(id);
    if (card) card.classList.add('block-running');
    document.getElementById('pipeline-connectors')?.classList.add('pipe-active');

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
    if (card) card.classList.remove('block-running');
    // Edu mode annotations
    if (eduMode) {
      const ann = document.getElementById('ann-' + id);
      if (ann) ann.textContent = getEduAnnotation(b.type) || '';
    }
    await tf.nextFrame();
  }
  clearFlowPhase();
  document.getElementById('pipeline-connectors')?.classList.remove('pipe-active');
  log('success', '=== Pipeline Done ===');
  } finally {
    pipelineRunning = false;
    document.querySelectorAll('.block-running').forEach(c => c.classList.remove('block-running'));
    document.getElementById('pipeline-connectors')?.classList.remove('pipe-active');
  }
}

// ===== GUIDE MODAL =====
function showGuide() {
  const modal = document.getElementById('guide-modal');
  if (modal) modal.classList.remove('hidden');
  // Sync the "don't show again" checkbox with the stored preference.
  const chk = document.getElementById('chk-no-guide');
  if (chk) chk.checked = localStorage.getItem('ml-blocks-no-guide') === '1';
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
function quickStartTraining() {
  const types = ['camera-input', 'label-classes', 'prepare-data', 'pretrained-model', 'train-model', 'save-model'];
  types.forEach((type, i) => placeBlock(type, 16 + i * 296, 40));
  log('step', lang === 'pl' ? 'Szybki start: bloki treningowe dodane!' : 'Quick start: training blocks placed!');
}

function quickStartInference() {
  const types = ['upload-model', 'camera-infer', 'show-results'];
  types.forEach((type, i) => placeBlock(type, 16 + i * 296, 40));
  log('step', lang === 'pl' ? 'Szybki start: bloki predykcji dodane!' : 'Quick start: inference blocks placed!');
}

// Toggle the empty-state placeholder when the canvas has zero blocks.
function refreshEmptyState() {
  const el = document.getElementById('empty-state');
  if (!el) return;
  el.classList.toggle('hidden', placedBlocks.length > 0);
}

// ===== PIPELINE ORDER VISUALIZATION =====
// Canonical pipeline order — matches the side panel top-to-bottom (training
// then prediction). Order badges, connector lines AND the Run order all follow
// this, so the flow is always logically correct no matter where a block is
// dropped on the canvas. Blocks of the same rank fall back to left-to-right.
const PIPELINE_ORDER = {
  'camera-input': 0, 'label-classes': 1, 'prepare-data': 2, 'pretrained-model': 3,
  'train-model': 4, 'save-model': 5, 'evaluate': 6, 'deploy-export': 7,
  'upload-model': 8, 'camera-infer': 9, 'show-results': 10,
  'zero-shot': 11, 'explain-ai': 12, 'model-explorer': 13
};
function pipelineRank(type) {
  return (PIPELINE_ORDER[type] === undefined) ? 99 : PIPELINE_ORDER[type];
}
// Two independent pipelines: training (ranks 0–7) and prediction (8+). Badges,
// connectors and the tidy layout treat them separately.
function pipelineGroup(type) {
  return pipelineRank(type) < 8 ? 0 : 1;
}
// Blocks in canonical pipeline order (rank first, x as tiebreaker).
function pipelineSorted() {
  return [...placedBlocks].sort((a, b) => {
    const r = pipelineRank(a.type) - pipelineRank(b.type);
    return r !== 0 ? r : a.x - b.x;
  });
}

function updatePipelineOrder() {
  const sorted = pipelineSorted();
  const counters = [0, 0]; // per-group step numbers
  sorted.forEach((b) => {
    const card = document.getElementById(b.id);
    if (!card) return;
    const header = card.querySelector('.bk-header');
    if (!header) return;
    let badge = header.querySelector('.order-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'order-badge';
      header.insertBefore(badge, header.firstChild);
    }
    const g = pipelineGroup(b.type);
    badge.textContent = ++counters[g];
  });
  drawPipelineConnectors(sorted);
}

// Auto-arrange blocks left-to-right in pipeline order on a tidy row. Blocks
// often pile up and overlap (especially after quick-starts); one click lays
// them out cleanly. The canvas scrolls horizontally to fit them all.
function tidyUpCanvas() {
  if (!placedBlocks.length) return;
  const canvas = document.getElementById('canvas');
  const COL_W = 300, START_X = 16, START_Y = 24, ROW_GAP = 28, GROUP_GAP = 56;
  // How many columns fit in the visible canvas — wrap so a long pipeline never
  // forces horizontal scrolling.
  const avail = (canvas ? canvas.clientWidth : 1200) - START_X;
  const cols = Math.max(1, Math.floor(avail / COL_W));

  // Lay a group into a grid starting at startY, returning the bottom Y. Rows
  // alternate direction (boustrophedon) so the connector lines snake down
  // cleanly instead of jumping back across the whole canvas on each wrap.
  const layoutGrid = (blocks, startY) => {
    let y = startY, rowMaxH = 0, bottom = startY;
    blocks.forEach((b, i) => {
      const rowIdx = Math.floor(i / cols);
      const posInRow = i % cols;
      if (posInRow === 0 && i > 0) { y += rowMaxH + ROW_GAP; rowMaxH = 0; }
      const col = (rowIdx % 2 === 0) ? posInRow : (cols - 1 - posInRow);
      b.x = START_X + col * COL_W;
      b.y = y;
      const card = document.getElementById(b.id);
      const hh = card ? card.offsetHeight : 200;
      if (card) { card.style.left = b.x + 'px'; card.style.top = b.y + 'px'; }
      rowMaxH = Math.max(rowMaxH, hh);
      bottom = Math.max(bottom, y + hh);
    });
    return bottom;
  };

  const sorted = pipelineSorted();
  const train = sorted.filter(b => pipelineGroup(b.type) === 0);
  const infer = sorted.filter(b => pipelineGroup(b.type) === 1);
  const trainBottom = layoutGrid(train, START_Y);
  layoutGrid(infer, train.length ? trainBottom + GROUP_GAP : START_Y);
  persistCanvasState();
  updatePipelineOrder();
  showToast(lang === 'pl' ? 'Uporządkowano bloki' : 'Blocks tidied up', 'info', { duration: 2500 });
}

function drawPipelineConnectors(sorted) {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  sorted = sorted || pipelineSorted();
  let svg = document.getElementById('pipeline-connectors');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'pipeline-connectors';
    // Insert as the first canvas child so it paints behind the block cards.
    canvas.insertBefore(svg, canvas.firstChild);
  }
  const w = Math.max(canvas.scrollWidth, canvas.clientWidth);
  const h = Math.max(canvas.scrollHeight, canvas.clientHeight);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  // offsetLeft/Top are already in canvas content coordinates (canvas is the
  // positioned offset parent), so no scroll math is needed.
  let paths = '';
  const HEADER_MID = 24;
  for (let i = 0; i < sorted.length - 1; i++) {
    // Training and prediction are separate pipelines — don't draw a line from
    // the last training block to the first prediction block.
    if (pipelineGroup(sorted[i].type) !== pipelineGroup(sorted[i + 1].type)) continue;
    const a = document.getElementById(sorted[i].id);
    const b = document.getElementById(sorted[i + 1].id);
    if (!a || !b) continue;
    const aL = a.offsetLeft, aT = a.offsetTop, aW = a.offsetWidth, aH = a.offsetHeight;
    const bL = b.offsetLeft, bT = b.offsetTop, bW = b.offsetWidth, bH = b.offsetHeight;
    let x1, y1, x2, y2, path;
    if (Math.abs(aT - bT) < 40) {
      // Same row: connect nearest horizontal edges (handles left→right AND the
      // right→left rows produced by the snake layout).
      if (bL >= aL) { x1 = aL + aW; x2 = bL; } else { x1 = aL; x2 = bL + bW; }
      y1 = aT + HEADER_MID; y2 = bT + HEADER_MID;
      const mx = (x1 + x2) / 2;
      path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    } else {
      // Wrapped to the next row: connect bottom-centre → top-centre.
      x1 = aL + aW / 2; y1 = aT + aH; x2 = bL + bW / 2; y2 = bT;
      const my = (y1 + y2) / 2;
      path = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
    }
    paths += `<path class="pipe-path" d="${path}"/>`;
    paths += `<circle class="pipe-dot" cx="${x2}" cy="${y2}" r="3"/>`;
  }
  svg.innerHTML = paths;
}

// ===== EDU MODE =====
// (CSS class applied on DOMContentLoaded — document.body may not exist yet
//  if this script runs before <body>.)

// ===== INIT =====
window.activeClass = 0;

document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  renderGuideSteps();
  if (eduMode) {
    document.body.classList.add('edu-mode');
    document.getElementById('btn-edu')?.classList.add('active');
  }
  // Restore previously-saved canvas layout (block types/positions + class
  // names). Done before evaluatePipelineState so prereq strips render once
  // with the correct context.
  restoreCanvasState();
  evaluatePipelineState();
  if (typeof refreshEmptyState === 'function') refreshEmptyState();

  // Palette blocks can be added by a plain click (in addition to drag-and-drop).
  document.querySelectorAll('.palette-block').forEach(el => {
    el.addEventListener('click', () => paletteAddBlock(el));
  });

  // Quick start if EDU mode — but ONLY when the canvas is empty. restoreCanvasState()
  // above may have already rebuilt a saved pipeline; adding another one on every
  // reload made the block count grow without bound (6 → 12 → 18 …).
  if (eduMode && placedBlocks.length === 0) {
    setTimeout(quickStartTraining, 300);
  }

  // First-run onboarding: auto-open the guide unless the user ticked "don't
  // show again" (and not in edu mode, which drives its own quick-start).
  if (!eduMode && localStorage.getItem('ml-blocks-no-guide') !== '1') {
    setTimeout(showGuide, 600);
  }

  log('step', lang === 'pl' ? 'KlockiAI gotowy — przeciągnij bloki na tablicę!' : 'KlockiAI ready — drag blocks onto the canvas!');
  log('info', 'TensorFlow.js ' + (tf.version?.tfjs || tf.version || ''));
  // Wait for TF.js to fully initialize WebGL backend before reading it
  tf.ready().then(() => {
    log('info', 'Backend: ' + tf.getBackend());
  });
});
