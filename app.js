// ===== CONSTANTS =====
const SCHEMA_VERSION = "v1";
const CLASS_COLORS = ['#0369A1', '#7C3AED', '#D97706', '#DC2626', '#059669', '#DB2777'];
// Feature-vector variant: 576-dim output, used as the frozen backbone for
// transfer-learning (Train Model block). The full classifier variant is loaded
// separately by the Zero-shot block – see CLASSIFIER_MODEL_URL.
const MODEL_URL = 'https://www.kaggle.com/models/google/mobilenet-v3/frameworks/tfJs/variations/small-100-224-feature-vector/versions/1/model.json?tfjs-format=file';
// Full MobileNetV3-Small with the original 1001-class ImageNet softmax head.
// Used by the Zero-shot block to demonstrate "what does the base model know
// without any training" – produces actual ImageNet probabilities.
const CLASSIFIER_MODEL_URL = 'https://www.kaggle.com/models/google/mobilenet-v3/frameworks/tfJs/variations/small-100-224-classification/versions/1/model.json?tfjs-format=file';

// ===== BLOCK METADATA =====
// One record per block type. Every per-type lookup reads this table:
//   phase    - flow-bar pill lit while the block runs in the pipeline
//   color    - header / border colour token (matches the sidebar dots)
//   badge    - short label in the card header
//   titleKey - STRINGS key of the block title (sidebar label and card title)
//   rank     - canonical pipeline order (badges, connectors, Run order)
//   group    - 'train' (ranks 0-7) or 'infer' (8+): two independent pipelines
const BLOCK_META = {
  'camera-input':     { phase: 'data',   color: 'var(--c-data)',   badge: 'DATA',   titleKey: 'block_camera_input',     rank: 0,  group: 'train' },
  'label-classes':    { phase: 'label',  color: 'var(--c-label)',  badge: 'LABEL',  titleKey: 'block_label_classes',    rank: 1,  group: 'train' },
  'prepare-data':     { phase: 'prep',   color: 'var(--c-prep)',   badge: 'PREP',   titleKey: 'block_prepare_data',     rank: 2,  group: 'train' },
  'pretrained-model': { phase: 'model',  color: 'var(--c-model)',  badge: 'MODEL',  titleKey: 'block_pretrained_model', rank: 3,  group: 'train' },
  'train-model':      { phase: 'train',  color: 'var(--c-train)',  badge: 'TRAIN',  titleKey: 'block_train_model',      rank: 4,  group: 'train' },
  'save-model':       { phase: 'deploy', color: 'var(--c-deploy)', badge: 'DEPLOY', titleKey: 'block_save_model',       rank: 5,  group: 'train' },
  'evaluate':         { phase: 'infer',  color: 'var(--c-eval)',   badge: 'EVAL',   titleKey: 'block_evaluate',         rank: 6,  group: 'train' },
  'deploy-export':    { phase: 'deploy', color: 'var(--c-deploy)', badge: 'DEPLOY', titleKey: 'block_deploy_export',    rank: 7,  group: 'train' },
  'upload-model':     { phase: 'infer',  color: 'var(--c-data)',   badge: 'DATA',   titleKey: 'block_upload_model',     rank: 8,  group: 'infer' },
  'camera-infer':     { phase: 'infer',  color: 'var(--c-data)',   badge: 'DATA',   titleKey: 'block_camera_infer',     rank: 9,  group: 'infer' },
  'show-results':     { phase: 'infer',  color: 'var(--c-eval)',   badge: 'PRED',   titleKey: 'block_show_results',     rank: 10, group: 'infer' },
  'zero-shot':        { phase: 'infer',  color: 'var(--c-model)',  badge: 'PRED',   titleKey: 'block_zero_shot',        rank: 11, group: 'infer' },
  'explain-ai':       { phase: 'infer',  color: 'var(--c-eval)',   badge: 'EVAL',   titleKey: 'block_explain_ai',       rank: 12, group: 'infer' },
  'model-explorer':   { phase: 'model',  color: 'var(--c-eval)',   badge: 'EVAL',   titleKey: 'block_model_explorer',   rank: 13, group: 'infer' }
};
// Unknown types (a stale saved layout) get a neutral record so nothing throws.
const BLOCK_META_FALLBACK = { phase: 'data', color: 'var(--c-muted)', badge: '', titleKey: null, rank: 99, group: 'infer' };
function blockMeta(type) { return BLOCK_META[type] || BLOCK_META_FALLBACK; }
// Translated block title; the type id itself for an unknown type.
function blockTitle(type) {
  const m = BLOCK_META[type];
  return m ? t(m.titleKey) : type;
}

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

// ===== THEME TOKENS FOR CANVAS =====
// Canvas 2D has no var() support, so chart / overlay code reads the colour and
// font tokens from :root. There is no theme switch, so a plain memo is enough.
const cssTokenCache = {};
function cssToken(name) {
  if (!(name in cssTokenCache)) {
    cssTokenCache[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  return cssTokenCache[name];
}
// "255 40 40" triplet token + alpha -> CSS colour string (mirrors the
// rgb(var(--rgb-x) / a) pattern used in style.css).
function cssRgba(tripletName, alpha) {
  return `rgb(${cssToken(tripletName)} / ${alpha})`;
}
function cssRgbChannels(tripletName) {
  return cssToken(tripletName).split(/\s+/).map(Number);
}
function cssFont(px) {
  return `${px}px ${cssToken('--font')}`;
}

// Size a chart canvas to its CSS box times devicePixelRatio (crisp on HiDPI)
// and return a context whose coordinate space is CSS pixels. Reassigning
// width/height clears the bitmap and forces layout, so only touch them when
// the CSS size or the pixel ratio actually changed.
function setupChartCanvas(cv, fallbackH) {
  const dpr = window.devicePixelRatio || 1;
  const W = cv.offsetWidth || 256;
  const H = cv.offsetHeight || fallbackH;
  const key = `${W}x${H}@${dpr}`;
  if (cv.dataset.dim !== key) {
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.dataset.dim = key;
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W, H };
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
// Chunked encoding – avoids O(n²) string concat for multi-MB weight buffers.
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // 32 KB – safe limit for String.fromCharCode.apply
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
  // CompositeArrayBuffer or typed-array view – copy to plain ArrayBuffer
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
    block_prepare_data: 'Augmentacja danych', block_pretrained_model: 'Model bazowy',
    block_train_model: 'Trenuj model', block_save_model: 'Zapisz model',
    block_upload_model: 'Wczytaj model', block_camera_infer: 'Kamera: Predykcja',
    block_predict: 'Predykcja', block_show_results: 'Pokaż wyniki',
    block_zero_shot: 'Model bazowy / Predykcja', block_explain_ai: 'Explainable AI', block_model_explorer: 'Eksplorator modelu',
    block_evaluate: 'Ocena modelu', block_deploy_export: 'Eksport aplikacji',
    log_title: 'Pipeline Log',
    guide_title: 'Przewodnik – KlockiAI', guide_subtitle: 'Jak zbudować swój pierwszy model AI w przeglądarce',
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
    lbl_no_model: 'Brak modelu – najpierw wczytaj lub załaduj',
    lbl_classes: 'Klasy', lbl_timestamp: 'Data treningu',
    log_camera_start: 'Kamera uruchomiona', log_camera_err: 'Błąd kamery: ',
    log_capture: (n, cls) => `Zebrano ${n} próbkę(i) dla klasy "${cls}"`,
    log_prep_start: 'Rozpoczynam przygotowanie danych...',
    log_prep_aug: (n) => `Augmentacja: wygenerowano ${n} dodatkowych próbek`,
    log_prep_done: (n) => `Przygotowanie zakończone – łącznie ${n} próbek`,
    log_model_loading: 'Ładowanie MobileNetV3-Small...',
    log_model_loaded: 'Model bazowy załadowany ✓',
    log_model_err: 'Błąd ładowania modelu: ',
    log_train_start: (e) => `Trening – ${e} epok`,
    log_train_epoch: (e, l, a) => `Epoka ${e}: strata=${l.toFixed(4)}, dokł.=${(a * 100).toFixed(1)}%`,
    log_train_done: (a) => `Trening zakończony – dokładność ${(a * 100).toFixed(1)}%`,
    log_train_cancel: 'Trening przerwany przez użytkownika',
    log_save_idb: 'Model zapisany w IndexedDB ✓',
    log_download: 'Pobieranie plików modelu...',
    log_upload_start: 'Wczytywanie modelu z pliku...',
    log_upload_done: (cls) => `Model załadowany – klasy: ${cls}`,
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
    log_feat_cached: 'Cechy wzięte z pamięci podręcznej (dane bez zmian).',
    log_save_bad_name: 'Nazwa modelu nie może zaczynać się od "base-".',
    eval_epoch: (e, n) => `Trening na 80% (świeży model): epoka ${e}/${n}`,
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
    title_run: 'Uruchom cały pipeline (Ctrl+Enter)', title_edu: 'Tryb nauczania (E)', title_tidy: 'Uporządkuj bloki (T)',
    title_guide: 'Przewodnik (?)', title_clear: 'Wyczyść tablicę', title_lang: 'Przełącz na angielski (L)',
    title_log_clear: 'Wyczyść log',
    aria_remove_block: 'Usuń blok', aria_refresh_models: 'Odśwież listę modeli',
    aria_class_name: (n) => `Nazwa klasy ${n}`,
    aria_chart_idle: 'Wykres treningu: brak danych',
    aria_chart: (ep, loss, acc) => `Wykres treningu: epoka ${ep}, strata ${loss}, dokładność ${acc}%`,
    btn_unfreeze_frame: 'Wznów klatkę',
    // ─── Dataset ───
    log_idb_loading: (n) => `Wczytywanie ${n} klas z bazy danych...`,
    log_idb_loaded: (n) => `Dataset załadowany: ${n} próbek`,
    log_export_empty: 'Brak próbek do pobrania.',
    log_export_prep: 'Przygotowywanie datasetu...',
    log_export_done: (total, n) => `Dataset pobrany (${total} próbek, ${n} klas)`,
    log_import_start: 'Wczytywanie datasetu z pliku...',
    log_import_bad_format: 'Nieprawidłowy format pliku datasetu.',
    log_import_done: (n, total) => `Dataset wczytany: ${n} klas, ${total} próbek`,
    default_class_name: 'Klasa',
    default_class_names: ['Klasa 1', 'Klasa 2'],
    class_name_n: (n) => `Klasa ${n}`,
    dataset_info: (total, perClass) => `${total} próbek – ${perClass}`,
    toast_no_samples_delete: 'Brak próbek do usunięcia.',
    log_dataset_deleted: 'Dataset usunięty z pamięci',
    toast_dataset_deleted: (n) => `Usunięto dataset (${n} próbek)`,
    log_dataset_restored: 'Dataset przywrócony',
    btn_undo: 'Cofnij',
    log_photos_uploaded: (n, name) => `Wgrano ${n} zdjęć do „${name}"`,
    toast_photos_failed: 'Nie udało się wczytać zdjęć.',
    class_deleted: (name) => `Usunięto klasę „${name}"`,
    class_restored: (name) => `Przywrócono klasę „${name}"`,
    samples_deleted: (name) => `Usunięto próbki klasy „${name}"`,
    toast_samples_cleared: (name, n) => `Wyczyszczono próbki „${name}" (${n})`,
    samples_restored: (name) => `Przywrócono próbki „${name}"`,
    log_max_classes: 'Maksymalna liczba klas osiągnięta',
    log_class_added: (name) => `Dodano klasę: ${name}`,
    // ─── Block bodies ───
    toast_block_added: (name) => `Dodano brakujący blok „${name}"`,
    log_camera_block_added: 'Dodano blok Kamera: Dane. Uruchom kamerę i spróbuj ponownie.',
    title_upload_active: 'Wgraj zdjęcia do aktywnej klasy',
    btn_upload_photos: '📁 Wgraj zdjęcia',
    btn_add_class: 'Dodaj klasę',
    title_clear_samples: 'Wyczyść próbki',
    title_delete_class: 'Usuń klasę',
    title_upload_photos: 'Wgraj zdjęcia',
    ph_class_name: 'nazwa klasy...',
    btn_capture_short: 'zbierz',
    prep_hint: 'Przeskaluj zebrane zdjęcia do rozmiaru modelu. Opcjonalnie augmentuj dane, aby zwiększyć liczbę próbek.',
    opt_prepare_only: 'Tylko przygotowanie',
    btn_preview_aug: '👁 Podgląd augmentacji',
    btn_prepare: 'Przygotuj dane',
    zs_note: 'Pełny klasyfikator MobileNetV3 (1001 klas ImageNet). Pierwsze uruchomienie pobiera ~5 MB.',
    btn_start: 'Uruchom', btn_stop: 'Stop',
    pred_waiting: 'oczekiwanie na predykcję...',
    xai_granularity: 'Rozdzielczość', xai_method: 'Metoda',
    xai_opt_occlusion: 'Okluzja (po krokach)', xai_opt_saliency: 'Saliency (gradient)',
    xai_opt_fast: 'Szybko (4×4)', xai_opt_normal: 'Normalna (7×7)', xai_opt_detailed: 'Dokładna (14×14)',
    xai_legend_hi: '🟥 patrzył tutaj', xai_legend_lo: 'myliło 🟦',
    xai_wait: 'Uruchom kamerę predykcji, potem kliknij „Analizuj"',
    xai_howto: 'Podświetlone obszary to te, na które model patrzył, podejmując decyzję. Czerwone = główny dowód.',
    explorer_desc: 'Eksploruj architekturę MobileNet V3 Small – warstwy, mapy cech i inferencję na żywo.',
    btn_open_explorer: 'Otwórz eksplorator',
    eval_hint: 'Dzieli próbki 80/20, trenuje świeży model na 80% i testuje na niewidzianych 20% – prawdziwy sprawdzian generalizacji.',
    btn_evaluate: '▶ Oceń model',
    deploy_hint: 'Eksportuj samodzielną stronę HTML z Twoim modelem w środku – działa offline, klasyfikuje z kamery. Podziel się nią z innymi!',
    btn_export_app: '🚀 Eksportuj aplikację',
    trash_label: 'Kosz',
    // ─── Blocks / canvas ───
    confirm_remove_train: 'Wytrenowany model nie został jeszcze zapisany. Usunąć blok?',
    confirm_remove_labels: 'Próbki klas zostaną zachowane (możesz dodać blok ponownie). Usunąć blok?',
    btn_remove_block: 'Usuń blok',
    btn_confirm: 'Potwierdź', btn_cancel: 'Anuluj',
    log_block_added: (type, n) => `+ ${type} #${n}`,
    log_block_removed: (id) => `Usunięto blok #${id}`,
    log_canvas_cleared: 'Obszar roboczy wyczyszczony',
    toast_tidied: 'Uporządkowano bloki',
    log_qs_train: 'Szybki start: bloki treningowe dodane!',
    log_qs_infer: 'Szybki start: bloki predykcji dodane!',
    log_ready: 'KlockiAI gotowy – przeciągnij bloki na tablicę!',
    // ─── Camera / capture ───
    err_no_camera: 'Nie znaleziono kamery',
    hint_file_protocol: ' ⚠️ Otwórz przez http://localhost:8765 (nie file://)',
    warn_start_camera_first: 'Najpierw uruchom kamerę!',
    warn_camera_loading: 'Kamera jeszcze się ładuje, poczekaj chwilę...',
    capture_progress: (cls, n, total) => `${cls}: zbieranie ${n}/${total}...`,
    log_capture_aborted: 'Zbieranie przerwane – kamera zatrzymana.',
    // ─── Prepare ───
    aug_collect_first: 'Najpierw zbierz kilka próbek.',
    aug_original: 'oryginał',
    aug_off: 'Augmentacja wyłączona – tylko oryginały.',
    warn_prep_running: 'Przygotowanie już trwa.',
    err_prep_worker: 'Błąd workera przygotowania: ',
    err_prep_decode: 'Worker przygotowania: nie udało się odczytać wiadomości',
    // ─── Base model ───
    info_base_loading: 'Model bazowy już się ładuje...',
    info_base_already: 'Model bazowy już załadowany',
    status_base_loaded: 'MobileNetV3-Small załadowany ✓',
    // ─── Training ───
    interp_overfit: '⚠️ 100% dokładności przy małej liczbie próbek – model może zapamiętywać, a nie uczyć się. Dodaj więcej zdjęć.',
    interp_falling: '📉 Strata spada – model się uczy!',
    interp_flat: '➡️ Strata się wypłaszcza – bliski końca nauki.',
    interp_progress: (pct) => `Uczenie w toku – dokładność ${pct}%.`,
    chart_loss: 'strata', chart_acc: 'dokł.',
    val_min_classes: (n) => `Trening wymaga co najmniej 2 klas z próbkami (masz ${n}). Zbierz próbki dla dwóch lub więcej klas.`,
    btn_continue_anyway: 'Kontynuuj mimo to',
    val_too_few: (min, list) => `Niektóre klasy mają mniej niż ${min} próbek: ${list}. Modele potrzebują kilku przykładów na klasę. Kontynuować mimo to?`,
    val_imbalance: (min, max) => `Bardzo nierówny rozkład klas (od ${min} do ${max} próbek). Model nauczy się rozpoznawać klasę większościową. Kontynuować?`,
    warn_train_running: 'Trening już trwa.',
    log_feat_extract: (n) => `Ekstrakcja cech z ${n} próbek...`,
    feat_progress: (done, total) => `Ekstrakcja cech: ${done}/${total}`,
    log_feat_shape: (n, size) => `Cechy: ${n}×${size}`,
    train_eta: (e, n, s) => `Epoka ${e}/${n} | ETA: ${s}s`,
    log_model_ready: 'Model gotowy...',
    err_training: 'Błąd treningu: ',
    log_train_stopping: 'Zatrzymywanie po bieżącej epoce...',
    // ─── Evaluate ───
    eval_need_samples: 'Prawdziwy test wymaga min. 2 klas z co najmniej 2 próbkami (aby podzielić 80/20).',
    eval_extracting: 'Ekstrakcja cech...',
    eval_training: 'Trening na 80% (świeży model)...',
    eval_testing: 'Test na 20% (niewidziane)...',
    log_eval_settings: (e, lr, bs, fromTrain) => `Ocena: ${e} epok, lr ${lr}, batch ${bs} (${fromTrain ? 'ustawienia z bloku Trenuj model' : 'ustawienia domyślne'})`,
    log_eval_done: (pct, n) => `Test na niewidzianych 20%: ${pct}% z ${n} zdjęć`,
    err_eval: 'Błąd oceny: ',
    err_prefix: 'Błąd: ',
    eval_verdict_overfit: '⚠️ Model dobrze radzi sobie z danymi treningowymi, ale słabo z niewidzianymi (przeuczenie). Dodaj więcej różnorodnych zdjęć.',
    eval_verdict_ok: '✅ Model dobrze generalizuje – trafia na zdjęciach, których nigdy nie widział.',
    eval_verdict_weak: '⚠️ Słaba skuteczność na niewidzianych danych – zbierz więcej lub wyraźniejsze próbki.',
    eval_mistakes: 'Błędy modelu:',
    eval_no_mistakes: 'Brak błędów na zbiorze testowym 🎉',
    eval_unseen_lbl: (n) => `niewidziane (20%) – ${n} zdjęć`,
    eval_matrix_title: 'Macierz pomyłek (wiersz = prawda, kolumna = predykcja)',
    // ─── Save / load / export ───
    err_save: 'Błąd zapisu: ',
    err_download: 'Błąd pobierania: ',
    log_model_downloaded: (fname) => `Model pobrany ✓ (${fname})`,
    toast_train_first: 'Najpierw wytrenuj model.',
    deploy_packing: 'Pakowanie modelu (~6 MB)...',
    deploy_exported: 'Wyeksportowano ✓',
    log_app_exported: 'Aplikacja wyeksportowana: klocki-classifier.html',
    toast_app_exported: 'Aplikacja wyeksportowana 🚀',
    err_export: 'Błąd eksportu: ',
    err_import: 'Błąd importu: ',
    export_title: 'Klasyfikator KlockiAI',
    export_start: '▶ Uruchom kamerę',
    export_made_with: 'Zrobione w KlockiAI',
    export_loading: 'Ładowanie modelu...',
    export_ready: 'Gotowe – uruchom kamerę',
    export_no_camera: 'Brak dostępu do kamery',
    warn_pick_model_file: 'Wybierz plik modelu',
    warn_no_json: 'Nie wybrano pliku .json',
    info_model_loading: 'Model już się wczytuje...',
    log_base_from_file: 'Model bazowy wczytany z pliku ✓',
    warn_load_base_too: 'Pamiętaj: załaduj też model bazowy (blok "Model bazowy" lub "Wczytaj z przeglądarki")',
    err_upload: 'Błąd wczytywania: ',
    warn_pick_from_list: 'Wybierz model z listy (kliknij ↺ aby odświeżyć)',
    log_idb_load: (name) => `Wczytywanie z IndexedDB: ${name}...`,
    log_base_from_browser: 'Model bazowy wczytany z przeglądarki ✓',
    warn_base_not_in_browser: 'Brak modelu bazowego w przeglądarce – załaduj blok "Model bazowy" z CDN',
    err_idb_load: 'Błąd wczytywania z IndexedDB: ',
    toast_no_model_to_save: 'Brak wytrenowanego modelu do zapisania.',
    toast_saved_as: (name) => `Zapisano jako „${name}"`,
    toast_model_trained: '✅ Model gotowy – zapisz go, zanim zamkniesz kartę!',
    btn_save_now: '💾 Zapisz teraz',
    // ─── Zero-shot ───
    log_zs_loading: 'Ładowanie pełnego klasyfikatora MobileNetV3 (1001 klas)...',
    log_zs_loaded: 'Klasyfikator zero-shot załadowany ✓',
    zs_downloading: 'Pobieranie modelu...',
    log_zs_started: 'Zero-shot uruchomiony',
    err_zs: 'Błąd zero-shot: ',
    log_zs_stopped: 'Zero-shot zatrzymany',
    // ─── Inference ───
    log_infer_camera_start: 'Kamera predykcji uruchomiona',
    log_infer_camera_stopped: 'Kamera predykcji zatrzymana',
    lbl_threshold: 'próg',
    pred_below_threshold: 'poniżej progu pewności',
    log_frame_frozen: '❄️ Klatka zamrożona',
    log_frame_resumed: '▶ Wznowiono',
    // ─── XAI ───
    log_xai_stopping: 'Zatrzymywanie analizy XAI...',
    warn_xai_no_model: 'Najpierw załaduj lub wytrenuj model!',
    err_xai_no_base: 'Brak modelu bazowego! Załaduj blok "Model bazowy".',
    xai_analyzing: 'Analizuję... (nie ruszaj kamery)',
    xai_start_camera: 'Uruchom "Kamera: Predykcja"',
    warn_saliency_fallback: 'Saliency niedostępny dla tego modelu – przełączam na okluzję',
    xai_sees: 'Model widzi',
    xai_sure_high: 'jest pewny', xai_sure_mid: 'raczej pewny', xai_sure_low: 'niepewny',
    xai_detail_counter: (base, drop, counter) => `Najważniejszy dowód to zaznaczony fragment (obok). Bez niego pewność „${base}" spada o ${drop} pkt i model uznałby to za „${counter}".`,
    xai_detail_same: (base, drop) => `Najważniejszy dowód to zaznaczony fragment (obok). Bez niego pewność „${base}" spada o ${drop} pkt.`,
    xai_saliency_detail: (lbl) => `Podświetlone piksele najmocniej wpływają na decyzję „${lbl}" – to na nie model patrzył najbardziej.`,
    log_xai_cancelled: 'Analiza XAI przerwana',
    xai_cancelled_short: 'Przerwano',
    err_xai: 'Błąd XAI: ',
    // ─── Pipeline ───
    warn_pipeline_running: 'Pipeline już działa.',
    log_pipeline_start: '=== Start pipeline ===',
    log_pipeline_done: '=== Pipeline zakończony ===',
    log_pipeline_stopped: (name) => `Pipeline zatrzymany na kroku „${name}"`,
    guide_shortcuts: 'Skróty: ? przewodnik, Esc zamknij, Ctrl+Enter uruchom, T uporządkuj, L język, E tryb Edu',
    guide_steps: [
      { title: 'Krok 1 – Kamera', desc: 'Dodaj blok "Kamera – Dane" na tablicę. Uruchom kamerę i zbieraj zdjęcia dla każdej klasy, klikając "Zbierz próbki".' },
      { title: 'Krok 2 – Etykiety', desc: 'Dodaj blok "Etykiety klas" i nazwij swoje kategorie, np. "Pies", "Kot", "Inne". Wybierz aktywną klasę przed zbieraniem.' },
      { title: 'Krok 3 – Przygotowanie danych', desc: 'Blok "Przygotuj dane" zmieni rozmiar zdjęć i opcjonalnie wygeneruje więcej próbek przez augmentację (obrócenie, jasność).' },
      { title: 'Krok 4 – Model bazowy', desc: 'Blok "Model bazowy" pobierze MobileNetV3-Small z sieci (~3MB). Ten model "widział" miliony zdjęć i rozumie cechy wizualne.' },
      { title: 'Krok 5 – Trening', desc: 'Blok "Trenuj model" dostosuje model do Twoich klas. Obserwuj wykres straty i dokładności w czasie rzeczywistym!' },
      { title: 'Krok 6: Predykcja', desc: 'Po treningu użyj bloków predykcji: wczytaj model, uruchom kamerę i obserwuj predykcje na żywo.' },
    ]
  },
  en: {
    phase_data: 'Data', phase_label: 'Labels', phase_prep: 'Prepare',
    phase_model: 'Model', phase_train: 'Train', phase_deploy: 'Save', phase_infer: 'Prediction', phase_xai: 'Explainable AI',
    btn_guide: 'Guide', btn_clear: 'Clear', btn_run: 'Run', btn_edu: '🎓 Edu', btn_tidy: '🧹 Tidy up',
    sidebar_training: 'Training', sidebar_inference: 'Prediction',
    block_camera_input: 'Camera: Input', block_label_classes: 'Label Classes',
    block_prepare_data: 'Prepare Data', block_pretrained_model: 'Pretrained Model',
    block_train_model: 'Train Model', block_save_model: 'Save Model',
    block_upload_model: 'Load Model', block_camera_infer: 'Camera: Prediction',
    block_predict: 'Predict', block_show_results: 'Show Results',
    block_zero_shot: 'Base Model / Predict', block_explain_ai: 'Explainable AI', block_model_explorer: 'Model Explorer',
    block_evaluate: 'Evaluate Model', block_deploy_export: 'Export App',
    log_title: 'Pipeline Log',
    guide_title: 'Guide – KlockiAI', guide_subtitle: 'How to build your first AI model in the browser',
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
    lbl_no_model: 'No model – load or train one first',
    lbl_classes: 'Classes', lbl_timestamp: 'Trained on',
    log_camera_start: 'Camera started', log_camera_err: 'Camera error: ',
    log_capture: (n, cls) => `Captured ${n} sample(s) for class "${cls}"`,
    log_prep_start: 'Starting data preparation...',
    log_prep_aug: (n) => `Augmentation: generated ${n} additional samples`,
    log_prep_done: (n) => `Data ready – ${n} total samples`,
    log_model_loading: 'Loading MobileNetV3-Small...',
    log_model_loaded: 'Base model loaded ✓',
    log_model_err: 'Model load error: ',
    log_train_start: (e) => `Training – ${e} epochs`,
    log_train_epoch: (e, l, a) => `Epoch ${e}: loss=${l.toFixed(4)}, acc=${(a * 100).toFixed(1)}%`,
    log_train_done: (a) => `Training complete – accuracy ${(a * 100).toFixed(1)}%`,
    log_train_cancel: 'Training cancelled',
    log_save_idb: 'Model saved to IndexedDB ✓',
    log_download: 'Downloading model files...',
    log_upload_start: 'Loading model from file...',
    log_upload_done: (cls) => `Model loaded – classes: ${cls}`,
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
    log_feat_cached: 'Features reused from cache (data unchanged).',
    log_save_bad_name: 'Model name cannot start with "base-".',
    eval_epoch: (e, n) => `Training on 80% (fresh model): epoch ${e}/${n}`,
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
    title_run: 'Run the whole pipeline (Ctrl+Enter)', title_edu: 'Teaching mode (E)', title_tidy: 'Tidy up blocks (T)',
    title_guide: 'Guide (?)', title_clear: 'Clear canvas', title_lang: 'Switch to Polish (L)',
    title_log_clear: 'Clear log',
    aria_remove_block: 'Remove block', aria_refresh_models: 'Refresh model list',
    aria_class_name: (n) => `Class name ${n}`,
    aria_chart_idle: 'Training chart: no data yet',
    aria_chart: (ep, loss, acc) => `Training chart: epoch ${ep}, loss ${loss}, accuracy ${acc}%`,
    btn_unfreeze_frame: 'Resume Frame',
    // ─── Dataset ───
    log_idb_loading: (n) => `Loading ${n} classes from database...`,
    log_idb_loaded: (n) => `Dataset loaded: ${n} samples`,
    log_export_empty: 'No samples to export.',
    log_export_prep: 'Preparing dataset...',
    log_export_done: (total, n) => `Dataset downloaded (${total} samples, ${n} classes)`,
    log_import_start: 'Loading dataset from file...',
    log_import_bad_format: 'Invalid dataset file format.',
    log_import_done: (n, total) => `Dataset loaded: ${n} classes, ${total} samples`,
    default_class_name: 'Class',
    default_class_names: ['Class 1', 'Class 2'],
    class_name_n: (n) => `Class ${n}`,
    dataset_info: (total, perClass) => `${total} samples – ${perClass}`,
    toast_no_samples_delete: 'No samples to delete.',
    log_dataset_deleted: 'Dataset deleted from storage',
    toast_dataset_deleted: (n) => `Deleted dataset (${n} samples)`,
    log_dataset_restored: 'Dataset restored',
    btn_undo: 'Undo',
    log_photos_uploaded: (n, name) => `Uploaded ${n} photos to "${name}"`,
    toast_photos_failed: 'Could not read the images.',
    class_deleted: (name) => `Deleted class "${name}"`,
    class_restored: (name) => `Restored class "${name}"`,
    samples_deleted: (name) => `Deleted samples for class "${name}"`,
    toast_samples_cleared: (name, n) => `Cleared "${name}" samples (${n})`,
    samples_restored: (name) => `Restored "${name}" samples`,
    log_max_classes: 'Maximum class count reached',
    log_class_added: (name) => `Added class: ${name}`,
    // ─── Block bodies ───
    toast_block_added: (name) => `Added missing "${name}" block`,
    log_camera_block_added: 'Camera: Input added. Start the camera and try again.',
    title_upload_active: 'Upload photos to the active class',
    btn_upload_photos: '📁 Upload photos',
    btn_add_class: 'Add class',
    title_clear_samples: 'Clear samples',
    title_delete_class: 'Delete class',
    title_upload_photos: 'Upload photos',
    ph_class_name: 'class name...',
    btn_capture_short: 'capture',
    prep_hint: 'Resize captured images to model input size. Optionally augment to increase sample count.',
    opt_prepare_only: 'Prepare only',
    btn_preview_aug: '👁 Preview augmentation',
    btn_prepare: 'Prepare data',
    zs_note: 'Full MobileNetV3 classifier (1001 ImageNet classes). First start downloads ~5 MB.',
    btn_start: 'Start', btn_stop: 'Stop',
    pred_waiting: 'waiting for prediction...',
    xai_granularity: 'Granularity', xai_method: 'Method',
    xai_opt_occlusion: 'Occlusion (patch-by-patch)', xai_opt_saliency: 'Saliency (gradient)',
    xai_opt_fast: 'Fast (4×4)', xai_opt_normal: 'Normal (7×7)', xai_opt_detailed: 'Detailed (14×14)',
    xai_legend_hi: '🟥 looked here', xai_legend_lo: 'distracting 🟦',
    xai_wait: 'Start the prediction camera, then click "Analyze"',
    xai_howto: 'The highlighted areas are what the model looked at to decide. Red = its main evidence.',
    explorer_desc: 'Explore MobileNet V3 Small – layers, feature maps and live inference.',
    btn_open_explorer: 'Open Explorer',
    eval_hint: 'Splits 80/20, trains a fresh model on 80%, and tests on the unseen 20% – a true generalisation check.',
    btn_evaluate: '▶ Evaluate model',
    deploy_hint: 'Export a self-contained HTML page with your model baked in – works offline, classifies from the camera. Share it with anyone!',
    btn_export_app: '🚀 Export app',
    trash_label: 'Trash',
    // ─── Blocks / canvas ───
    confirm_remove_train: 'Trained model has not been saved yet. Remove block?',
    confirm_remove_labels: 'Class samples will be preserved (you can add the block again). Remove block?',
    btn_remove_block: 'Remove block',
    btn_confirm: 'Confirm', btn_cancel: 'Cancel',
    log_block_added: (type, n) => `+ ${type} #${n}`,
    log_block_removed: (id) => `Removed block #${id}`,
    log_canvas_cleared: 'Canvas cleared',
    toast_tidied: 'Blocks tidied up',
    log_qs_train: 'Quick start: training blocks placed!',
    log_qs_infer: 'Quick start: inference blocks placed!',
    log_ready: 'KlockiAI ready – drag blocks onto the canvas!',
    // ─── Camera / capture ───
    err_no_camera: 'No camera found',
    hint_file_protocol: ' ⚠️ Open via http://localhost:8765 (not file://)',
    warn_start_camera_first: 'Start the camera first!',
    warn_camera_loading: 'Camera still loading, wait a moment...',
    capture_progress: (cls, n, total) => `${cls}: collecting ${n}/${total}...`,
    log_capture_aborted: 'Capture aborted – camera stopped.',
    // ─── Prepare ───
    aug_collect_first: 'Collect a few samples first.',
    aug_original: 'original',
    aug_off: 'Augmentation off – originals only.',
    warn_prep_running: 'Preparation is already running.',
    err_prep_worker: 'Prepare worker error: ',
    err_prep_decode: 'Prepare worker: message decode failed',
    // ─── Base model ───
    info_base_loading: 'Base model is already loading...',
    info_base_already: 'Base model already loaded',
    status_base_loaded: 'MobileNetV3-Small loaded ✓',
    // ─── Training ───
    interp_overfit: '⚠️ 100% accuracy on few samples – the model may be memorising, not learning. Add more images.',
    interp_falling: '📉 Loss is dropping – the model is learning!',
    interp_flat: '➡️ Loss is flattening out – learning is levelling off.',
    interp_progress: (pct) => `Learning in progress – accuracy ${pct}%.`,
    chart_loss: 'loss', chart_acc: 'acc',
    val_min_classes: (n) => `Training needs at least 2 classes with samples (you have ${n}). Collect samples for two or more classes.`,
    btn_continue_anyway: 'Continue anyway',
    val_too_few: (min, list) => `Some classes have fewer than ${min} samples: ${list}. Models need several examples per class. Continue anyway?`,
    val_imbalance: (min, max) => `Class imbalance is large (${min}–${max} samples). The model will favour the majority class. Continue?`,
    warn_train_running: 'Training is already running.',
    log_feat_extract: (n) => `Extracting features from ${n} samples...`,
    feat_progress: (done, total) => `Feature extraction: ${done}/${total}`,
    log_feat_shape: (n, size) => `Features: ${n}×${size}`,
    train_eta: (e, n, s) => `Epoch ${e}/${n} | ETA: ${s}s`,
    log_model_ready: 'Model ready...',
    err_training: 'Training error: ',
    log_train_stopping: 'Stopping after current epoch...',
    // ─── Evaluate ───
    eval_need_samples: 'A true hold-out test needs at least 2 classes with 2+ samples each (to split 80/20).',
    eval_extracting: 'Extracting features...',
    eval_training: 'Training on 80% (fresh model)...',
    eval_testing: 'Testing on 20% (unseen)...',
    log_eval_settings: (e, lr, bs, fromTrain) => `Evaluate: ${e} epochs, lr ${lr}, batch ${bs} (${fromTrain ? 'settings from the Train Model block' : 'default settings'})`,
    log_eval_done: (pct, n) => `Hold-out test on unseen 20%: ${pct}% of ${n} images`,
    err_eval: 'Evaluation error: ',
    err_prefix: 'Error: ',
    eval_verdict_overfit: '⚠️ Great on training data but weak on unseen data (overfitting). Add more varied images.',
    eval_verdict_ok: '✅ The model generalises well – it gets images it never saw right.',
    eval_verdict_weak: '⚠️ Weak on unseen data – collect more or clearer samples.',
    eval_mistakes: 'Model mistakes:',
    eval_no_mistakes: 'No mistakes on the test set 🎉',
    eval_unseen_lbl: (n) => `unseen (20%) – ${n} images`,
    eval_matrix_title: 'Confusion matrix (row = truth, column = prediction)',
    // ─── Save / load / export ───
    err_save: 'Save error: ',
    err_download: 'Download error: ',
    log_model_downloaded: (fname) => `Model downloaded ✓ (${fname})`,
    toast_train_first: 'Train a model first.',
    deploy_packing: 'Packaging model (~6 MB)...',
    deploy_exported: 'Exported ✓',
    log_app_exported: 'App exported: klocki-classifier.html',
    toast_app_exported: 'App exported 🚀',
    err_export: 'Export error: ',
    err_import: 'Import error: ',
    export_title: 'KlockiAI Classifier',
    export_start: '▶ Start camera',
    export_made_with: 'Made with KlockiAI',
    export_loading: 'Loading model...',
    export_ready: 'Ready – start the camera',
    export_no_camera: 'No camera access',
    warn_pick_model_file: 'Select model file first',
    warn_no_json: 'No .json file selected',
    info_model_loading: 'A model is already loading...',
    log_base_from_file: 'Base model loaded from file ✓',
    warn_load_base_too: 'Remember: also load the base model (Pretrained Model block or Load from Browser)',
    err_upload: 'Upload error: ',
    warn_pick_from_list: 'Select a model from the list (click ↺ to refresh)',
    log_idb_load: (name) => `Loading from IndexedDB: ${name}...`,
    log_base_from_browser: 'Base model loaded from browser ✓',
    warn_base_not_in_browser: 'Base model not in browser – load the Pretrained Model block from CDN',
    err_idb_load: 'IDB load error: ',
    toast_no_model_to_save: 'No trained model to save.',
    toast_saved_as: (name) => `Saved as "${name}"`,
    toast_model_trained: '✅ Model trained – save it before closing the tab!',
    btn_save_now: '💾 Save now',
    // ─── Zero-shot ───
    log_zs_loading: 'Loading full MobileNetV3 classifier (1001 classes)...',
    log_zs_loaded: 'Zero-shot classifier loaded ✓',
    zs_downloading: 'Downloading model...',
    log_zs_started: 'Zero-shot started',
    err_zs: 'Zero-shot error: ',
    log_zs_stopped: 'Zero-shot stopped',
    // ─── Inference ───
    log_infer_camera_start: 'Inference camera started',
    log_infer_camera_stopped: 'Inference camera stopped',
    lbl_threshold: 'threshold',
    pred_below_threshold: 'below confidence threshold',
    log_frame_frozen: '❄️ Frame frozen',
    log_frame_resumed: '▶ Resumed',
    // ─── XAI ───
    log_xai_stopping: 'Stopping XAI analysis...',
    warn_xai_no_model: 'Load or train a model first!',
    err_xai_no_base: 'Base model not loaded – load the Pretrained Model block first.',
    xai_analyzing: 'Analyzing... (keep camera still)',
    xai_start_camera: 'Start "Camera: Prediction" first',
    warn_saliency_fallback: 'Saliency unavailable for this model – falling back to occlusion',
    xai_sees: 'The model sees',
    xai_sure_high: 'confident', xai_sure_mid: 'fairly sure', xai_sure_low: 'unsure',
    xai_detail_counter: (base, drop, counter) => `The key evidence is the highlighted patch (shown left). Without it, "${base}" confidence falls ${drop} points and the model would call this "${counter}".`,
    xai_detail_same: (base, drop) => `The key evidence is the highlighted patch (shown left). Without it, "${base}" confidence falls ${drop} points.`,
    xai_saliency_detail: (lbl) => `The highlighted pixels most affect the "${lbl}" decision – these are what the model paid the most attention to.`,
    log_xai_cancelled: 'XAI cancelled',
    xai_cancelled_short: 'Cancelled',
    err_xai: 'XAI error: ',
    // ─── Pipeline ───
    warn_pipeline_running: 'Pipeline is already running.',
    log_pipeline_start: '=== Pipeline start ===',
    log_pipeline_done: '=== Pipeline done ===',
    log_pipeline_stopped: (name) => `Pipeline stopped at step "${name}"`,
    guide_shortcuts: 'Shortcuts: ? guide, Esc close, Ctrl+Enter run, T tidy up, L language, E Edu mode',
    guide_steps: [
      { title: 'Step 1 – Camera', desc: 'Add the "Camera – Input" block to the canvas. Start the camera and collect images for each class by clicking "Collect Samples".' },
      { title: 'Step 2 – Labels', desc: 'Add the "Label Classes" block and name your categories, e.g. "Dog", "Cat", "Other". Select the active class before collecting.' },
      { title: 'Step 3 – Prepare Data', desc: 'The "Prepare Data" block resizes images and can generate more samples through augmentation (flips, rotations, brightness).' },
      { title: 'Step 4 – Base Model', desc: 'The "Pretrained Model" block downloads MobileNetV3-Small (~3MB). It has seen millions of images and understands visual features.' },
      { title: 'Step 5 – Training', desc: 'The "Train Model" block fine-tunes the model for your classes. Watch the loss and accuracy chart update in real time!' },
      { title: 'Step 6: Prediction', desc: 'After training, use the prediction blocks: load the model, start the camera, and watch live predictions.' },
    ]
  }
};

// Prediction copy stays outside STRINGS because the prediction card can be
// refreshed independently of the canvas shell.  This lets the model output
// survive a language rebuild while labels and state copy are translated in one
// deterministic pass.
const PREDICTION_TEXT = {
  pl: {
    waiting: 'Oczekiwanie na pierwszą klatkę',
    live: 'Na żywo',
    paused: 'Wstrzymano',
    stopped: 'Kamera zatrzymana',
    belowThreshold: 'Poniżej progu',
    winnerLabel: 'Najlepsza klasa',
    ranking: 'Ranking klas',
    history: 'Historia predykcji',
    historyEmpty: 'Historia pojawi się po pierwszej klatce.',
    confidenceCaveat: 'Pewność to wynik modelu, nie zmierzona dokładność.',
    noPrediction: 'Brak predykcji',
    threshold: 'próg',
    frame: (n) => `Klatka ${n}`,
    aboveThreshold: 'powyżej progu'
  },
  en: {
    waiting: 'Waiting for the first frame',
    live: 'Live',
    paused: 'Paused',
    stopped: 'Camera stopped',
    belowThreshold: 'Below threshold',
    winnerLabel: 'Top class',
    ranking: 'Class ranking',
    history: 'Prediction history',
    historyEmpty: 'History appears after the first frame.',
    confidenceCaveat: 'Confidence is a model output, not measured accuracy.',
    noPrediction: 'No prediction',
    threshold: 'threshold',
    frame: (n) => `Frame ${n}`,
    aboveThreshold: 'above threshold'
  }
};

function predictionText(key, ...args) {
  const copy = PREDICTION_TEXT[lang] || PREDICTION_TEXT.en;
  const value = copy[key];
  return typeof value === 'function' ? value(...args) : (value || key);
}

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
let capturedSamples = [[], []]; // per class, array of ImageData – dynamic
let preparedData = null; // {xs, ys}
// Bumped on every sample/class change. runPrepare records it on entry and
// discards a worker result produced from an older snapshot.
let datasetVersion = 0;
// ─── Feature cache ───
// Bottleneck features are the most expensive thing the app computes and Train
// and Evaluate both need them for the same images. One entry per source:
// 'raw' = capturedSamples flattened class by class, 'prepared' = an augmented
// snapshot. An entry is valid only while datasetVersion, the sample array
// identity and the base model identity all still match.
const featureCache = {}; // source -> { version, ident, base, feats }
function disposeFeatureCache() {
  Object.keys(featureCache).forEach(k => {
    try { featureCache[k].feats.dispose(); } catch (_) {}
    delete featureCache[k];
  });
}
function invalidatePreparedData() {
  preparedData = null;
  datasetVersion++;
  disposeFeatureCache();
}
let baseModel = null;
let fullModel = null;
let trainingCancelled = false;
let modelMetadata = null;
let inferModel = null;
let inferMetadata = null;
let inferInterval = null;
// Single-flight guards – these long-running async actions share global state
// (preparedData, fullModel, baseModel, the chart histories), so overlapping
// invocations corrupt each other. Each guard is set on entry and cleared in a
// finally block.
let trainingInProgress = false;
let pipelineRunning = false;
let prepareInProgress = false;
let baseModelLoading = false;
let modelFileLoading = false;
let evaluateInProgress = false;
// True once the current fullModel has been saved/downloaded; drives the Save
// pill, the remove/clear confirms and the beforeunload warning.
let modelSaved = false;
// Educational mode: shows annotation tooltips above each block, disables drag
// repositioning, and pre-populates a training pipeline. Toggleable from the
// topbar; URL param ?edu=1 also enables it (for embedding in iframes).
let eduMode = (new URLSearchParams(location.search).get('edu') === '1')
  || (localStorage.getItem('ml-blocks-edu') === '1');
// (toggleEduMode below mutates `eduMode` – every consumer reads the live let.)

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
  // Tooltips and accessible names for terse/icon-only controls.
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const val = S[el.getAttribute('data-i18n-title')];
    if (val) el.title = val;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const val = S[el.getAttribute('data-i18n-aria')];
    if (val) el.setAttribute('aria-label', val);
  });
  document.documentElement.lang = lang;
  document.getElementById('btn-lang').textContent = lang === 'pl' ? 'EN' : 'PL';
  // Re-render dynamic block content. Titles refresh cheaply for every block;
  // the block BODY (buttons, param labels, hints) is baked at build time from
  // t(), so it must be rebuilt to switch language – otherwise the canvas shows
  // a mix of both languages until some unrelated action re-renders it.
  placedBlocks.forEach(b => {
    if (!b.card) return;
    refreshBlockText(b);
    // Skip blocks with live runtime state (streaming camera, running inference,
    // in-flight training) – rebuilding their innerHTML would orphan the <video>,
    // interval target, or training chart. They self-heal on stop/restart.
    if (isBlockBusy(b)) return;
    const body = b.card.querySelector('.bk-body');
    if (body) {
      body.innerHTML = renderBlockBody(b.type, b.id);
      initBlockAfterPlace(b.id, b.type);
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
    case 'explain-ai': return xaiRunning;
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
const LOG_MAX_ENTRIES = 500;
function log(type, msg) {
  const el = document.createElement('div');
  el.className = `log-line ll-${type}`;
  const ts = new Date().toLocaleTimeString(lang === 'pl' ? 'pl-PL' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  el.textContent = `[${ts}] ${msg}`;
  const entries = document.getElementById('log-entries');
  entries.appendChild(el);
  // Keep the panel bounded: inference logs ~1 line/s for the whole session.
  while (entries.childElementCount > LOG_MAX_ENTRIES) entries.removeChild(entries.firstChild);
  entries.scrollTop = entries.scrollHeight;
}
function clearLog() { document.getElementById('log-entries').innerHTML = ''; }

// ===== DRAG & DROP – PALETTE =====
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
// which) – the prereq strip alone tells you what's missing, not why.
const BLOCK_NOTES = {
  'show-results': {
    pl: 'Reaguje na klatki z bloku „Kamera: Predykcja" – pokazuje obraz, paski pewności klas i wynik na żywo.',
    en: 'Listens to frames from "Camera: Prediction" – shows the image, per-class confidence bars and the live prediction.'
  },
  'explain-ai': {
    pl: 'Analizuje pojedynczą klatkę kamery predykcji i pokazuje, które obszary wpłynęły na decyzję.',
    en: 'Analyses a single inference-camera frame and highlights which regions drove the decision.'
  },
  'zero-shot': {
    pl: 'Pokazuje, co model bazowy rozpoznaje samodzielnie – przed jakimkolwiek treningiem.',
    en: 'Shows what the base model recognises on its own – before any training.'
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
  'camera-input':     { pl: '📷 Zbieramy dane treningowe – zdjęcia dla każdej klasy', en: '📷 Collect training data – images for each class' },
  'label-classes':    { pl: '🏷️ Etykiety identyfikują każdą kategorię obrazów',     en: '🏷️ Labels identify each image category' },
  'prepare-data':     { pl: '⚙️ Zdjęcia są przeskalowane i augmentowane w Web Worker', en: '⚙️ Images resized + augmented in a Web Worker' },
  'pretrained-model': { pl: '🧠 MobileNet widział 1.2M zdjęć – "transfer learning"',  en: '🧠 MobileNet has seen 1.2M images – "transfer learning"' },
  'train-model':      { pl: '🚀 model.fit() dostosowuje wagi do naszych klas',         en: '🚀 model.fit() adapts weights to your classes' },
  'save-model':       { pl: '💾 Wagi modelu zapisywane w IndexedDB przeglądarki',    en: '💾 Model weights saved to browser IndexedDB' },
  'upload-model':     { pl: '📤 Wczytujemy wagi modelu z pliku .json + .bin',        en: '📤 Load model weights from .json + .bin file' },
  'camera-infer':     { pl: '📷 Kamera streamuje klatki do predykcji',                en: '📷 Camera streams frames for prediction' },
  'show-results':     { pl: '🎯 model.predict() – paski pewności + klasa o najwyższym prawdopodobieństwie', en: '🎯 model.predict() – confidence bars + class with the highest probability' },
  'zero-shot':        { pl: '🌍 1001 klas ImageNet – to, co MobileNet już zna',      en: '🌍 1001 ImageNet classes – what MobileNet already knows' },
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

// One scratch canvas per direction instead of a fresh canvas per sample.
// Safe under concurrent calls: putImageData + toBlob's bitmap snapshot, and
// drawImage + getImageData, each run synchronously inside a single callback.
let _encodeCanvas = null;
let _decodeCanvas = null;
function scratchCanvas(which, w, h) {
  let cv = which === 'enc' ? _encodeCanvas : _decodeCanvas;
  if (!cv) {
    cv = document.createElement('canvas');
    if (which === 'enc') _encodeCanvas = cv; else _decodeCanvas = cv;
  }
  if (cv.width !== w) cv.width = w;
  if (cv.height !== h) cv.height = h;
  return cv;
}

// Encode one ImageData as a JPEG ArrayBuffer.
function imageDataToJPEG(imgData, quality) {
  return new Promise((resolve, reject) => {
    const cv = scratchCanvas('enc', imgData.width, imgData.height);
    cv.getContext('2d').putImageData(imgData, 0, 0);
    cv.toBlob(blob => {
      // toBlob yields null if the canvas is tainted or encoding fails – reject
      // so callers surface an error instead of awaiting a promise that never
      // settles.
      if (!blob) { reject(new Error('JPEG encoding failed')); return; }
      blob.arrayBuffer().then(resolve, reject);
    }, 'image/jpeg', quality || 0.82);
  });
}

// Decode a JPEG ArrayBuffer back to ImageData. Rejects on a corrupt/undecodable
// buffer (e.g. an imported dataset file with garbage sample data) – without a
// reject path a single bad sample would hang import/load forever.
function jpegToImageData(buf, width, height) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buf], { type: 'image/jpeg' });
    createImageBitmap(blob).then(bmp => {
      const cv = scratchCanvas('dec', width || bmp.width, height || bmp.height);
      const ctx = cv.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      resolve(ctx.getImageData(0, 0, cv.width, cv.height));
    }, reject);
  });
}

// Encoded JPEG per ImageData. Samples never change after capture, so a buffer
// encoded once (or decoded from IDB / an import file) is valid for the sample's
// whole lifetime; the WeakMap lets it go with the ImageData.
const _jpegCache = new WeakMap(); // ImageData -> ArrayBuffer
function encodeSampleJPEG(imgData) {
  const hit = _jpegCache.get(imgData);
  if (hit) return Promise.resolve(hit);
  return imageDataToJPEG(imgData).then(buf => { _jpegCache.set(imgData, buf); return buf; });
}
// Decode and remember the source buffer so the first save after a load does
// not re-encode the whole dataset.
function decodeSampleJPEG(buf) {
  return jpegToImageData(buf).then(img => { _jpegCache.set(img, buf); return img; });
}

// Cancel every pending debounced save. Must be called before any operation that
// repacks or clears class indices (delete class, clear dataset, import) –
// otherwise a timer scheduled under an old index fires afterwards and writes a
// phantom record at a now-invalid key.
function cancelAllPendingSaves() {
  Object.values(_saveDebounceTimers).forEach(clearTimeout);
  _saveDebounceTimers = {};
  Object.values(_nameSaveTimers).forEach(clearTimeout);
  _nameSaveTimers = {};
}

// Rename path: patch only `name`/`color` on the stored record (read-modify-write
// in one transaction), never touching the JPEG payload. Debounced per class so
// typing does not thrash the store. A class with no stored record yet is
// skipped; its first full write will carry the current name anyway.
let _nameSaveTimers = {};
function saveClassNameToIDB(classIdx) {
  clearTimeout(_nameSaveTimers[classIdx]);
  _nameSaveTimers[classIdx] = setTimeout(async () => {
    delete _nameSaveTimers[classIdx];
    try {
      await writeClassNameToIDB(classIdx);
    } catch (err) {
      console.warn('saveClassNameToIDB failed:', err);
    }
  }, 600);
}
async function writeClassNameToIDB(classIdx) {
  if (datasetLoadPromise) await datasetLoadPromise;
  const db = await openDatasetDB();
  await new Promise((res, rej) => {
    const tx = db.transaction(DATASET_STORE, 'readwrite');
    const store = tx.objectStore(DATASET_STORE);
    const get = store.get(classIdx);
    get.onsuccess = () => {
      const rec = get.result;
      if (!rec) { res(); return; }
      rec.name = classNames[classIdx];
      rec.color = classColors[classIdx];
      const put = store.put(rec, classIdx);
      put.onsuccess = res; put.onerror = e => rej(e.target.error);
    };
    get.onerror = e => rej(e.target.error);
  });
}

// Actually encode + persist one class. Returns a promise that resolves when the
// IDB write commits, so callers that need durability (import, delete) can await.
async function writeClassToIDB(classIdx) {
  // A write racing the initial load would store only the samples captured so
  // far and drop the ones still being decoded from IDB for that class.
  if (datasetLoadPromise) await datasetLoadPromise;
  const db = await openDatasetDB();
  const samples = capturedSamples[classIdx] || [];
  // Only samples captured since the last save are actually encoded.
  const jpegData = await Promise.all(samples.map(encodeSampleJPEG));
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
  // snapshot – otherwise training silently runs on stale data.
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
// arrays rather than re-reading IDB – re-reading could overwrite samples the
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
  // Already restored – just re-sync the newly-placed block's UI from memory.
  if (datasetLoadedFromIDB) { refreshDatasetUI(); return; }
  if (datasetLoadPromise) return datasetLoadPromise;
  datasetLoadPromise = (async () => {
    try {
      const db = await openDatasetDB();
      // Read keys and records in ONE transaction so index ki lines up between
      // them – two separate transactions can straddle a concurrent write and
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
      while (classNames.length <= maxKey) { classNames.push(''); classColors.push(CLASS_COLORS[(classNames.length - 1) % CLASS_COLORS.length]); capturedSamples.push([]); }
      for (let ki = 0; ki < keys.length; ki++) {
        const idx = keys[ki];
        const rec = records[ki];
        if (!rec) continue;
        classNames[idx] = rec.name;
        classColors[idx] = rec.color || classColors[idx];
      }
      log('info', t('log_idb_loading', keys.length));

      // Decode JPEG blobs – done in parallel per class. Skip any class that
      // already has in-memory samples (captured while this load was in flight)
      // so we don't discard them. A bad sample rejects instead of hanging.
      const decodePromises = keys.map(async (idx, ki) => {
        const rec = records[ki];
        if (!rec || !rec.jpegData || !rec.jpegData.length) return;
        if (capturedSamples[idx] && capturedSamples[idx].length) return;
        try {
          capturedSamples[idx] = await Promise.all(rec.jpegData.map(decodeSampleJPEG));
        } catch (e) {
          console.warn('Skipping undecodable samples for class', idx, e);
        }
      });
      await Promise.all(decodePromises);

      log('success', t('log_idb_loaded', capturedSamples.flat().length));
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

// Rewrite the whole store from the in-memory arrays, keys 0..n-1. Memory is
// authoritative: the old "repack the stored records" approach copied stale
// records and dropped samples captured in the last 600 ms (still debounced).
// Shared by class delete, undo paths and import.
async function rewriteDatasetToIDB() {
  // Kill any pending debounced writes first - one firing after the rewrite
  // would resurrect a class at a stale index.
  cancelAllPendingSaves();
  try {
    await clearDatasetStore();
    for (let i = 0; i < classNames.length; i++) await writeClassToIDB(i);
  } catch (err) {
    console.warn('rewriteDatasetToIDB failed:', err);
  }
}

// ===== DATASET EXPORT / IMPORT =====
// Format: { version: 'dataset-v1', exportedAt: ISO, classes: [{name, color, samples: base64[]}] }
// JPEG quality 0.82 keeps each sample ~10-15 KB; a typical 50-sample × 3-class
// dataset downloads as a ~2 MB JSON file.

async function exportDataset() {
  const total = capturedSamples.flat().length;
  if (total === 0) {
    log('warn', t('log_export_empty'));
    return;
  }
  log('step', t('log_export_prep'));
  try {
    const classes = await Promise.all(classNames.map(async (name, i) => {
      const samples = capturedSamples[i] || [];
      const jpegBuffers = await Promise.all(samples.map(encodeSampleJPEG));
      // ArrayBuffer -> base64 string for JSON embedding
      const base64Samples = jpegBuffers.map(arrayBufferToBase64);
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
    log('success', t('log_export_done', total, classes.length));
  } catch (err) {
    log('error', t('err_export') + err.message);
  }
}

async function importDataset(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  // Let an in-flight IDB load finish first, otherwise it would resurrect the
  // old classes on top of the imported ones.
  if (datasetLoadPromise) await datasetLoadPromise;
  log('step', t('log_import_start'));
  try {
    const text = await file.text();
    const bundle = JSON.parse(text);
    if (bundle.version !== 'dataset-v1' || !Array.isArray(bundle.classes)) {
      log('error', t('log_import_bad_format'));
      return;
    }
    // Decode each class
    const newNames = [];
    const newColors = [];
    const newSamples = [];
    // At most CLASS_COLORS.length classes: capping here (rather than slicing
    // afterwards) also means a free pool colour always exists below.
    for (const cls of bundle.classes.slice(0, CLASS_COLORS.length)) {
      // Coerce: a non-string name would persist and later throw on .trim().
      const name = String(cls.name ?? '').trim();
      newNames.push(name || t('default_class_name'));
      // Accept stored color or assign next pool color
      const usedSoFar = new Set(newColors);
      newColors.push(cls.color && CLASS_COLORS.includes(cls.color) && !usedSoFar.has(cls.color)
        ? cls.color
        : CLASS_COLORS.find(c => !usedSoFar.has(c)));
      // Decode each sample independently; skip (rather than abort on) any
      // corrupt sample so one bad frame doesn't sink the whole import.
      const decoded = (await Promise.all((cls.samples || []).map(b64 => {
        try {
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return decodeSampleJPEG(bytes.buffer).catch(() => null);
        } catch (_) { return null; }
      }))).filter(Boolean);
      newSamples.push(decoded);
    }
    classNames    = newNames;
    classColors   = newColors;
    capturedSamples = newSamples;
    invalidatePreparedData();

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
    log('success', t('log_import_done', classNames.length, total));
  } catch (err) {
    log('error', t('err_import') + err.message);
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
  el.textContent = t('dataset_info', total, perClass);
}

async function confirmClearDataset() {
  // Wait for an in-flight IDB load: clearing mid-load would leave zombie data
  // in memory that the load then reports as restored.
  if (datasetLoadPromise) await datasetLoadPromise;
  const totalSamples = capturedSamples.flat().length;
  if (totalSamples === 0) {
    showToast(t('toast_no_samples_delete'), 'info', { duration: 2500 });
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
  classNames = t('default_class_names').slice();
  classColors = CLASS_COLORS.slice(0, 2);
  capturedSamples = [[], []];
  invalidatePreparedData();
  refreshLabelAndCameraBlocks();
  updateClassNamesEverywhere();
  evaluatePipelineState();
  persistCanvasState();
  refreshDatasetInfo();
  log('warn', t('log_dataset_deleted'));

  showToast(
    t('toast_dataset_deleted', totalSamples),
    'warn',
    {
      duration: 8000,
      actionLabel: t('btn_undo'),
      onAction: async () => {
        classNames = snapshot.names;
        classColors = snapshot.colors;
        capturedSamples = snapshot.samples;
        invalidatePreparedData();
        await rewriteDatasetToIDB();
        refreshLabelAndCameraBlocks();
        updateClassNamesEverywhere();
        evaluatePipelineState();
        persistCanvasState();
        refreshDatasetInfo();
        log('info', t('log_dataset_restored'));
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
// are intentionally NOT persisted – they're large and live in IndexedDB
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
  } catch (_) { /* quota / disabled storage – silent */ }
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
  'zero-shot': [], // self-contained – loads its own classifier on demand
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
  // Auto-add the missing prerequisite block - it's non-destructive and expected,
  // so no need to interrupt with a confirm; just place it and note it.
  const x = 16 + (placedBlocks.length * 40);
  const y = 40 + (placedBlocks.length * 40);
  placeBlock(type, Math.min(x, 600), Math.min(y, 400));
  showToast(t('toast_block_added', blockTitle(type)), 'info', { duration: 3000 });
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
  const meta = blockMeta(type);
  return `
<div class="bk-header" style="background:${meta.color}" onmousedown="cardDragStart(event,'${id}')" ontouchstart="cardDragStart(event,'${id}')" ondblclick="toggleCollapse('${id}')">
  <span class="drag-handle">⠸</span>
  <span class="bk-title" data-block-title="${id}">${blockTitle(type)}</span>
  <span class="bk-badge">${meta.badge}</span>
  <span class="bk-status">${t('status_idle')}</span>
  <button class="bk-close" onclick="confirmRemoveBlock('${id}')" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()" title="${t('aria_remove_block')}" aria-label="${t('aria_remove_block')}">✕</button>
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
    `<button class="bk-btn bk-btn--xs" style="background:${classColors[i]}" onclick="blockCapture('${id}',${i})">${escapeHtml(name)}</button>`
  ).join('');
  return `
<div class="video-wrap"><video class="bk-video" id="vid-${id}" autoplay playsinline muted></video></div>
${makeParam(t('param_resolution'), `<select id="res-${id}"><option value="224">224\u00d7224</option><option value="128">128\u00d7128</option></select>`)}
${makeParam(t('param_samples'), `<input type="number" id="spc-${id}" value="10" min="1" max="100" style="width:60px">`)}
${makeBtn(t('btn_start_camera'), `blockStartCamera('${id}')`, 'var(--c-data)')}
<div id="capture-btns-${id}" style="display:flex;flex-direction:column;gap:4px;margin-top:4px">${classButtons()}</div>
<input type="file" id="cam-photo-up-${id}" accept="image/*" multiple style="display:none" onchange="uploadPhotosToClass(window.activeClass||0, this)">
<button class="bk-btn bk-btn--neutral bk-btn--compact" style="margin-top:4px" onclick="document.getElementById('cam-photo-up-${id}').click()" title="${t('title_upload_active')}">${t('btn_upload_photos')}</button>
<button class="bk-btn bk-btn--muted bk-btn--compact" style="margin-top:4px" onclick="addClass(null)">${t('btn_add_class')}</button>
<div id="cam-status-${id}" style="font-size:10px;color:var(--c-muted);text-align:center;margin-top:4px">–</div>
<div id="thumbs-${id}" class="thumb-strip"></div>
<div style="border-top:1px dashed var(--c-border);margin-top:8px;padding-top:8px">
  <input type="file" id="dataset-file-${id}" accept=".json" style="display:none" onchange="importDataset(this)">
  <button class="bk-btn bk-btn--neutral bk-btn--compact" onclick="document.getElementById('dataset-file-${id}').click()">${t('btn_load_dataset')}</button>
</div>`;
}

function buildLabelClassesBody(id) {
  return renderLabelRows(id);
}

function renderLabelRows(id) {
  let rows = '';
  for (let i = 0; i < classNames.length; i++) {
    // Show delete-class button only when there are 2+ classes so we can't
    // accidentally destroy the last one.
    const canDelete = classNames.length > 1;
    const clearTip = t('title_clear_samples');
    const deleteTip = t('title_delete_class');
    const uploadTip = t('title_upload_photos');
    rows += `<div class="class-row">
<div class="class-color-dot" style="background:${classColors[i]}"></div>
<input class="class-name-input" id="cn-${id}-${i}" value="${escapeHtml(classNames[i])}" aria-label="${t('aria_class_name', i + 1)}"
  oninput="updateClassNamesEverywhere(this)" placeholder="${t('ph_class_name')}">
<span class="class-count" id="cc-${id}-${i}">${(capturedSamples[i] || []).length} ${t('lbl_samples')}</span>
<button class="class-capture-btn" style="background:${classColors[i]}" onclick="labelCapture(${i})">${t('btn_capture_short')}</button>
<input type="file" id="photo-up-${id}-${i}" accept="image/*" multiple style="display:none" onchange="uploadPhotosToClass(${i}, this)">
<button class="class-tool-btn" onclick="document.getElementById('photo-up-${id}-${i}').click()" title="${uploadTip}" aria-label="${uploadTip}">📁</button>
<button class="class-tool-btn" onclick="clearClassSamples(${i})" title="${clearTip}" aria-label="${clearTip}">⌫</button>
${canDelete ? `<button class="class-tool-btn class-delete-class-btn" onclick="deleteClass(${i})" title="${deleteTip}" aria-label="${deleteTip}">🗑</button>` : ''}
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
    log('success', t('log_photos_uploaded', added, name));
    showToast(t('log_photos_uploaded', added, name), 'success', { duration: 3000 });
  } else {
    showToast(t('toast_photos_failed'), 'warn', { duration: 3000 });
  }
}

function labelCapture(classIdx) {
  // Find the first camera-input block and capture for the given class
  let camBlock = placedBlocks.find(b => b.type === 'camera-input');
  if (!camBlock) {
    if (!ensureBlockOnCanvas('camera-input')) return;
    camBlock = placedBlocks.find(b => b.type === 'camera-input');
    if (!camBlock) return;
    log('info', t('log_camera_block_added'));
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
  // Snapshot for undo (samples are shared ImageData refs – fine, we're only
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

  // Stale – training with deleted class would corrupt ys tensor
  invalidatePreparedData();

  // Rewrite IDB from memory so keys stay contiguous
  await rewriteDatasetToIDB();
  refreshLabelAndCameraBlocks();
  updateClassNamesEverywhere();
  evaluatePipelineState();
  persistCanvasState();
  refreshDatasetInfo();
  log('warn', t('class_deleted', name));

  showToast(
    t('class_deleted', name),
    'warn',
    {
      actionLabel: t('btn_undo'),
      onAction: async () => {
        classNames.splice(snapshot.idx, 0, snapshot.name);
        classColors.splice(snapshot.idx, 0, snapshot.color);
        capturedSamples.splice(snapshot.idx, 0, snapshot.samples);
        invalidatePreparedData();
        await rewriteDatasetToIDB();
        refreshLabelAndCameraBlocks();
        updateClassNamesEverywhere();
        evaluatePipelineState();
        persistCanvasState();
        refreshDatasetInfo();
        log('info', t('class_restored', snapshot.name));
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
  log('info', t('samples_deleted', name));
  refreshLabelAndCameraBlocks();
  evaluatePipelineState();
  refreshDatasetInfo();
  saveClassToIDB(classIdx, true); // immediate – saves empty array
  showToast(
    t('toast_samples_cleared', name, snapshot.length),
    'warn',
    {
      actionLabel: t('btn_undo'),
      onAction: () => {
        capturedSamples[classIdx] = snapshot;
        refreshLabelAndCameraBlocks();
        evaluatePipelineState();
        refreshDatasetInfo();
        saveClassToIDB(classIdx, true);
        log('info', t('samples_restored', name));
      }
    }
  );
}

function addClass(labelBlockId) {
  const idx = classNames.length;
  if (idx >= CLASS_COLORS.length) {
    log('warn', t('log_max_classes'));
    return;
  }
  const name = t('class_name_n', idx + 1);
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
  log('info', t('log_class_added', name));
  evaluatePipelineState();
}

function buildPrepareDataBody(id) {
  const hint = t('prep_hint');
  return `
<div style="font-size:12px;color:var(--c-muted);line-height:1.4;padding-bottom:4px">${hint}</div>
${makeParam(t('param_augment'), `<select id="aug-${id}" onchange="previewAugmentation('${id}')">
  <option value="none" selected>${t('opt_prepare_only')}</option>
  <option value="all">Flip + Brightness + Zoom + Skew</option>
</select>`)}
<button class="bk-btn bk-btn--muted bk-btn--compact" style="margin-top:4px" onclick="previewAugmentation('${id}')">${t('btn_preview_aug')}</button>
<div id="aug-preview-${id}" class="aug-preview"></div>
<progress id="prog-${id}" value="0" max="100" style="margin-top:6px"></progress>
<div id="prep-status-${id}" style="font-size:10px;color:var(--c-muted);text-align:center">–</div>
${makeBtn(t('btn_prepare'), `runPrepare('${id}')`, 'var(--c-prep)')}`;
}

function buildPretrainedModelBody(id) {
  return `
<progress id="prog-${id}" value="0" max="100"></progress>
<div id="model-status-${id}" style="font-size:10px;color:var(--c-muted);text-align:center">–</div>
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
<canvas class="chart-canvas" id="chart-${id}" height="80" role="img" aria-label="${t('aria_chart_idle')}"></canvas>
<div id="train-info-${id}" aria-live="polite" style="font-size:10px;color:var(--c-muted);text-align:center">–</div>
<div id="train-interp-${id}" class="train-interp" aria-live="polite"></div>
<div style="display:flex;gap:6px;margin-top:4px">
${makeBtn(t('btn_train'), `runTraining('${id}')`, 'var(--c-train)')}
${makeBtn(t('btn_stop_train'), `stopTraining('${id}')`, 'var(--c-muted)')}
</div>`;
}

function buildSaveModelBody(id) {
  return `
${makeParam(t('param_model_name'), `<input type="text" id="model-name-${id}" value="model-1" placeholder="model-1" style="width:90px;font-size:12px">`)}
<div id="save-info-${id}" style="font-size:11px;color:var(--c-muted)">–</div>
${makeBtn(t('btn_save_idb'), `runSaveIDB('${id}')`, 'var(--c-deploy)')}
${makeBtn(t('btn_download'), `runDownload('${id}')`, 'var(--c-data)')}`;
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
  <button class="bk-btn bk-btn--muted bk-btn--icon" onclick="refreshIDBList('${id}')" title="${t('aria_refresh_models')}" aria-label="${t('aria_refresh_models')}">↺</button>
</div>
${makeBtn(t('btn_load_idb'), `runLoadIDB('${id}')`, 'var(--c-muted)')}
<div id="meta-${id}" style="font-size:10px;color:var(--c-muted);margin-top:4px;line-height:1.8">–</div>`;
}

function buildCameraInferBody(id) {
  return `
<div class="video-wrap"><video class="bk-video" id="vid-${id}" autoplay playsinline muted></video></div>
${makeParam(t('param_fps'), `<select id="fps-${id}"><option value="1000">1</option><option value="200" selected>5</option><option value="100">10</option></select>`)}
${makeBtn(t('btn_start_camera'), `startInferCamera('${id}')`, 'var(--c-data)')}
${makeBtn(t('btn_stop_camera'), `stopInferCamera('${id}')`, 'var(--c-muted)')}`;
}


function buildZeroShotBody(id) {
  const note = t('zs_note');
  return `
<div style="font-size:10px;color:var(--c-muted);line-height:1.6;padding:4px 0 6px;border-bottom:1px solid var(--c-border);margin-bottom:6px">${note}</div>
<div class="video-wrap"><video class="bk-video" id="zsvid-${id}" autoplay playsinline muted></video></div>
${makeParam('FPS', `<select id="zsfps-${id}"><option value="1000">1</option><option value="200" selected>5</option><option value="100">10</option></select>`)}
<div id="zs-status-${id}" aria-live="polite" style="font-size:10px;color:var(--c-muted);text-align:center;min-height:14px"></div>
<div id="zs-results-${id}" style="margin-top:6px"></div>
<div style="display:flex;gap:6px;margin-top:4px">
${makeBtn(t('btn_start'), `startZeroShot('${id}')`, 'var(--c-model)')}
${makeBtn(t('btn_stop'), `stopZeroShot('${id}')`, 'var(--c-muted)')}
</div>`;
}


function buildShowResultsBody(id) {
  // Merged Predict + Show Results block. Keep the original IDs because both
  // the inference loop and the guided shell use them as integration points.
  // Dynamic labels are filled with textContent by the prediction renderer.
  const thresholdLabel = t('param_threshold') || predictionText('threshold');
  const waiting = predictionText('waiting');
  return `
<section class="pred-ui" id="pred-ui-${id}" data-prediction-id="${id}" data-prediction-state="waiting" data-prediction-mode="waiting" data-prediction-threshold="0.7" data-prediction-history-length="0" data-prediction-render-count="0" aria-describedby="pred-caveat-${id}">
  <div class="pred-status" id="pred-status-${id}" role="status" aria-live="polite" data-status-key="waiting">
    <span class="pred-status-dot" aria-hidden="true"></span>
    <span class="pred-status-label">${waiting}</span>
  </div>
  <div class="pred-result" id="pred-result-${id}" data-prediction-result="true" role="group" aria-label="${predictionText('winnerLabel')}">
    <span class="pred-winner-kicker" id="pred-winner-label-${id}">${predictionText('winnerLabel')}</span>
    <span class="pred-winner-class" id="pred-winner-class-${id}">${predictionText('noPrediction')}</span>
    <span class="pred-winner-score" id="pred-winner-score-${id}"></span>
  </div>
  <div class="pred-section-title">${predictionText('ranking')}</div>
  <div id="pred-bars-${id}" class="pred-bars" role="list" aria-label="${predictionText('ranking')}"></div>
  <div class="pred-history" id="pred-history-${id}">
    <div class="pred-section-title pred-history-title">${predictionText('history')}</div>
    <div class="pred-history-empty" id="pred-history-empty-${id}">${predictionText('historyEmpty')}</div>
    <canvas id="hist-chart-${id}" class="chart-canvas pred-history-chart" height="72" role="img" aria-label="${predictionText('history')}"></canvas>
    <div class="pred-history-timeline" id="pred-history-timeline-${id}" data-prediction-history="true" role="list" aria-label="${predictionText('history')}"></div>
  </div>
  <div class="pred-caveat" id="pred-caveat-${id}" role="note">${predictionText('confidenceCaveat')}</div>
  <div class="param-row pred-threshold-control">
    <label class="param-label" for="thr-${id}">${thresholdLabel}</label>
    <select id="thr-${id}">
      <option value="0.5">50%</option><option value="0.7" selected>70%</option>
      <option value="0.8">80%</option><option value="0.9">90%</option>
    </select>
  </div>
  <button class="bk-btn bk-btn--muted" id="freeze-btn-${id}" aria-pressed="${frozenFrame ? 'true' : 'false'}" onclick="freezeFrame('${id}')">${t(frozenFrame ? 'btn_unfreeze_frame' : 'btn_freeze_frame')}</button>
</section>`;
}

function buildExplainAIBody(id) {
  const granLabel = t('xai_granularity');
  const methLabel = t('xai_method');
  const optOccl   = t('xai_opt_occlusion');
  const optSal    = t('xai_opt_saliency');
  const optFast   = t('xai_opt_fast');
  const optNorm   = t('xai_opt_normal');
  const optHi     = t('xai_opt_detailed');
  const stopLbl   = t('btn_stop');
  const state = getXAIState(id);
  const waitMsg = xaiText('wait');
  const selectedView = state.view === 'original' ? 'original' : 'heatmap';
  const selectedMethod = state.requestedMethod === 'saliency' ? 'saliency' : 'occlusion';
  const opacityPct = Math.round(state.opacity * 100);
  return `
<div class="xai-scroll">
<div id="xai-wrap-${id}" class="xai-viewport" data-xai-status="idle" data-xai-view="${selectedView}" data-xai-method="${selectedMethod}" data-xai-has-result="false" data-xai-overlay-opacity="${opacityPct}">
  <canvas id="xai-vid-${id}" class="xai-frame" width="224" height="224"></canvas>
  <canvas id="xai-overlay-${id}" class="xai-overlay" width="224" height="224"></canvas>
</div>
<div class="xai-view-toolbar" role="group" aria-label="${xaiText('viewLabel')}">
  <span class="xai-toolbar-label">${xaiText('viewLabel')}</span>
  <button type="button" class="xai-view-btn ${selectedView === 'original' ? 'is-selected' : ''}" id="xai-view-original-${id}" aria-pressed="${selectedView === 'original'}" onclick="setXAIView('${id}','original')">${xaiText('viewOriginal')}</button>
  <button type="button" class="xai-view-btn ${selectedView === 'heatmap' ? 'is-selected' : ''}" id="xai-view-heatmap-${id}" aria-pressed="${selectedView === 'heatmap'}" onclick="setXAIView('${id}','heatmap')">${xaiText('viewHeatmap')}</button>
</div>
<div class="xai-opacity-control">
  <label for="xai-opacity-${id}">${xaiText('opacityLabel')}</label>
  <input type="range" id="xai-opacity-${id}" min="0" max="100" step="1" value="${opacityPct}" oninput="setXAIOverlayOpacity('${id}', this.value)">
  <output id="xai-opacity-value-${id}" for="xai-opacity-${id}">${opacityPct}%</output>
</div>
<div class="xai-snapshot" id="xai-snapshot-${id}" data-xai-snapshot="empty" aria-live="polite">
  <div class="xai-snapshot-item"><span class="xai-snapshot-label">${xaiText('snapshotLabel')}</span><strong id="xai-snapshot-meta-${id}">${xaiText('snapshotEmpty')}</strong></div>
  <div class="xai-snapshot-item"><span class="xai-snapshot-label">${xaiText('predictedLabel')}</span><strong id="xai-predicted-${id}">${xaiText('predictionEmpty')}</strong></div>
</div>
<div class="xai-legend" id="xai-legend-${id}" data-xai-legend-kind="${selectedMethod}"></div>
<div class="xai-howto" id="xai-howto-${id}"></div>
${makeParam(methLabel, `<select id="xai-method-${id}">
  <option value="occlusion" ${selectedMethod === 'occlusion' ? 'selected' : ''}>${optOccl}</option>
  <option value="saliency" ${selectedMethod === 'saliency' ? 'selected' : ''}>${optSal}</option>
</select>`).replace('<select ', `<select onchange="xaiMethodChanged('${id}', this.value)" `)}
${makeParam(granLabel, `<select id="xai-patch-${id}">
  <option value="56" ${state.patchSize === 56 ? 'selected' : ''}>${optFast}</option>
  <option value="32" ${state.patchSize === 32 ? 'selected' : ''}>${optNorm}</option>
  <option value="16" ${state.patchSize === 16 ? 'selected' : ''}>${optHi}</option>
</select>`).replace('<select ', `<select onchange="xaiPatchChanged('${id}', this.value)" `)}
<progress id="xai-prog-${id}" value="0" max="100" hidden></progress>
<div id="xai-result-${id}" class="xai-result" role="status" aria-live="polite" data-xai-result="empty">${waitMsg}</div>
<div id="xai-detail-${id}" class="xai-detail" hidden>
  <div class="xai-detail-row">
    <canvas id="xai-thumb-${id}" width="64" height="64" class="xai-thumb"></canvas>
    <div class="xai-detail-text" id="xai-detail-text-${id}"></div>
  </div>
  <div class="xai-classes" id="xai-classes-${id}" aria-live="polite"></div>
</div>
<div style="display:flex;gap:6px;margin-top:6px">
${makeBtn(t('btn_run_xai'), `runXAI('${id}')`, 'var(--c-eval)')}
${makeBtn(stopLbl, `stopXAI('${id}')`, 'var(--c-muted)')}
</div>
</div>`;
}

function buildModelExplorerBody(id) {
  const desc = t('explorer_desc');
  const btnLabel = t('btn_open_explorer');
  return '<div style="font-size:11px;color:var(--c-muted);line-height:1.5;padding-bottom:4px">' + desc + '</div>'
    + makeBtn(btnLabel, "window.open('model-explorer.html','_blank')", 'var(--c-eval)');
}

function buildEvaluateBody(id) {
  const hint = t('eval_hint');
  return `
<div style="font-size:11px;color:var(--c-muted);line-height:1.5;padding-bottom:4px">${hint}</div>
${makeBtn(t('btn_evaluate'), `runEvaluate('${id}')`, 'var(--c-eval)')}
<div id="eval-status-${id}" aria-live="polite" style="font-size:10px;color:var(--c-muted);text-align:center;margin-top:4px">–</div>
<div id="eval-results-${id}" class="eval-results"></div>`;
}

function buildDeployExportBody(id) {
  const hint = t('deploy_hint');
  return `
<div style="font-size:11px;color:var(--c-muted);line-height:1.5;padding-bottom:4px">${hint}</div>
${makeBtn(t('btn_export_app'), `runDeployExport('${id}')`, 'var(--c-deploy)')}
<div id="deploy-status-${id}" aria-live="polite" style="font-size:10px;color:var(--c-muted);text-align:center;margin-top:4px">–</div>`;
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
  log('info', t('log_block_added', type, blockIdCounter));
  initBlockAfterPlace(id, type);
  // Drag is disabled in edu mode by the guard in cardDragStart, so the handlers
  // stay attached and dragging works again when edu mode is toggled off.
  if (eduMode) {
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
  return blockMeta(type).color;
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
  if (title) title.textContent = blockTitle(b.type);
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
  // The close button has its own handler; starting a drag from it would
  // swallow the tap on touch devices.
  if (e.target && e.target.closest && e.target.closest('.bk-close')) return;
  // Mouse events report e.button; touch events don't have it.
  if (e.type === 'mousedown' && e.button !== 0) return;
  const isTouch = e.type === 'touchstart';
  const point = isTouch ? e.touches[0] : e;
  // touchstart is NOT preventDefault-ed: doing so suppressed the synthesised
  // click/dblclick, so the header double-tap collapse never fired on touch.
  // Scrolling is cancelled per-move in onMove instead.
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

  // Connector redraw is coalesced to one per animation frame: mousemove can
  // fire far more often than the display refreshes, and each redraw measures
  // every card (forced layout).
  let connectorRafPending = false;
  function scheduleConnectorRedraw() {
    if (connectorRafPending) return;
    connectorRafPending = true;
    requestAnimationFrame(() => {
      connectorRafPending = false;
      if (draggedCard === id) drawPipelineConnectors();
    });
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
    scheduleConnectorRedraw();
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
    msg = t('confirm_remove_train');
  } else if (isLabelWithSamples) {
    needsConfirm = true;
    msg = t('confirm_remove_labels');
  }
  if (needsConfirm) {
    uiConfirm(msg, { okLabel: t('btn_remove_block'), danger: true })
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
      placedBlocks.filter(b => b.type === 'show-results').forEach(b => renderPredictionState(b.id, 'stopped'));
    }
    if (block.type === 'show-results') predSnapshots.delete(String(id));
    if (block.type === 'explain-ai') {
      stopXAI(id);
      window.XAI_UI.drop(id);
    }
    // The zero-shot classifier is large (~5 MB GPU memory). Free it when
    // the user removes the only zero-shot block – they can reload it.
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
  log('warn', t('log_block_removed', id));
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
  predSnapshots.clear();
  stopXAI();
  Object.keys(xaiStates).forEach(id => window.XAI_UI.drop(id));

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
  log('warn', t('log_canvas_cleared'));
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
  // Only the renamed class is persisted, and only its name/color field: the
  // stored JPEG payload is left untouched. The other callers (add/delete
  // class, import, clear) write their records themselves.
  if (source && source.id) {
    const cls = classIdxOf(source);
    if (cls >= 0 && cls < classNames.length) saveClassNameToIDB(cls);
  }
}

// ===== CAMERA – Training =====
let cameraStreams = {};
// Per-id "camera is opening" latch. getUserMedia is async, so without it two
// rapid clicks both pass the existing-stream check and open two streams – the
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
  throw new Error(t('err_no_camera'));
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
      msg += t('hint_file_protocol');
    }
    log('error', msg);
    setBlockStatus(document.getElementById(id), 'error');
  } finally {
    cameraOpening[id] = false;
  }
}

// Per-block "capture burst in flight" latch: two clicks used to interleave two
// grab loops (double samples, flickering counter).
const captureBusy = {}; // id -> bool
function blockCapture(id, cls) {
  if (cls === undefined) cls = window.activeClass || 0;
  if (captureBusy[id]) return;
  const vid = document.getElementById('vid-' + id);
  if (!vid || !vid.srcObject) {
    log('warn', t('warn_start_camera_first'));
    return;
  }
  // Check video is actually playing and has frames
  if (vid.readyState < 2 || vid.videoWidth === 0) {
    log('warn', t('warn_camera_loading'));
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
  captureBusy[id] = true;
  setBlockStatus(cardEl, 'running');
  function finish(complete) {
    captureBusy[id] = false;
    if (complete) {
      log('success', t('log_capture', spc, classNames[cls]));
      if (statusEl) statusEl.textContent = `${classNames[cls]}: ${capturedSamples[cls].length} ${t('lbl_samples')}`;
      setBlockStatus(cardEl, 'done');
    } else {
      log('warn', t('log_capture_aborted'));
      setBlockStatus(cardEl, 'idle');
    }
    // Whatever was grabbed before an abort is real data: show and persist it.
    updateSampleCounts();
    updateThumbStrips(id);
    evaluatePipelineState();
    if (captured > 0) saveClassToIDB(cls); // persist new samples to IDB (debounced)
    refreshDatasetInfo();
  }
  function grab() {
    // Stop when the camera or the block itself went away mid-burst.
    if (!cameraStreams[id] || !vid.srcObject) { finish(false); return; }
    if (captured >= spc) { finish(true); return; }
    // Draw current video frame
    ctx.drawImage(vid, 0, 0, res, res);
    const imgData = ctx.getImageData(0, 0, res, res);
    capturedSamples[cls].push(imgData);
    captured++;
    if (statusEl) statusEl.textContent = t('capture_progress', classNames[cls], captured, spc);
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

// ===== AUGMENTATION =====
// The one augmentation routine, used by both the Web Worker (its source is
// stringified into WORKER_CODE below) and the in-page preview. It must stay
// self-contained: no references to outer scope, no closures, since the worker
// copy runs in isolation. Returns a plain {data, width, height} record.
//
// Transforms: brightness jitter for any augType other than 'none'; for 'all'
// also a 50% horizontal flip and, independently at 50% each, zoom and skew
// (one affine pass with bilinear sampling; out-of-source pixels take the edge
// value, which is less artifact-prone than black).
function augmentImageData(src, augType) {
  const w = src.width, h = src.height;
  let buf = new Uint8ClampedArray(src.data);
  if (augType === 'none') return { data: buf, width: w, height: h };
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
  return { data: buf, width: w, height: h };
}

// ===== AUGMENTATION WEB WORKER =====
// The worker source is the augmentation function above plus a small message
// shell: originals first, then augmented copies round-robin over the samples
// until samples.length * multiplier records exist.
const WORKER_CODE = augmentImageData.toString() + `
self.onmessage = function(e) {
  const { samples, multiplier, augType } = e.data;
  const result = [];
  for (const s of samples) result.push(s);
  const target = samples.length * multiplier;
  let added = 0;
  let idx = 0;
  while (result.length < target) {
    result.push(augmentImageData(samples[idx % samples.length], augType));
    added++;
    idx++;
    if (added % 10 === 0) {
      self.postMessage({ type: 'progress', pct: Math.round((result.length / target) * 100) });
    }
  }
  // Transfer all buffers - avoids a structured-clone copy of what can be tens
  // of MB for larger datasets. The worker is done after this message anyway.
  const buffers = [];
  for (const r of result) buffers.push(r.data.buffer);
  self.postMessage({ type: 'done', result, counts: samples.length }, buffers);
};
`;

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
    box.innerHTML = `<div class="aug-preview-empty">${t('aug_collect_first')}</div>`;
    return;
  }
  const drawInto = (rec, label) => {
    // augmentImageData returns a plain {data,width,height} record.
    const imgData = rec instanceof ImageData ? rec : new ImageData(rec.data, rec.width, rec.height);
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
  box.appendChild(drawInto(sample, t('aug_original')));
  if (augType === 'none') {
    const note = document.createElement('div');
    note.className = 'aug-preview-empty';
    note.textContent = t('aug_off');
    box.appendChild(note);
    return;
  }
  const N = 4;
  for (let i = 0; i < N; i++) box.appendChild(drawInto(augmentImageData(sample, augType), '#' + (i + 1)));
}

// ===== PREPARE DATA =====
// Resolves true when preparedData is ready, false otherwise (runPipeline stops
// on false).
async function runPrepare(id) {
  const totalSamples = capturedSamples.reduce((s, a) => s + a.length, 0);
  if (totalSamples === 0) { log('warn', t('log_no_data')); return false; }

  // Single-flight: parallel prepares would spawn competing workers whose 'done'
  // handlers race to overwrite preparedData.
  if (prepareInProgress) {
    log('warn', t('warn_prep_running'));
    return false;
  }
  prepareInProgress = true;
  const versionAtStart = datasetVersion;

  setBlockStatus(document.getElementById(id), 'running');
  log('step', t('log_prep_start'));

  const augType = document.getElementById('aug-' + id)?.value || 'none';
  const multiplier = augType === 'none' ? 1 : 2;
  const prog = document.getElementById('prog-' + id);
  const status = document.getElementById('prep-status-' + id);

  // Flatten all samples with labels
  const allSamples = [];
  const allLabels = [];
  for (let cls = 0; cls < classNames.length; cls++) {
    for (const s of (capturedSamples[cls] || [])) {
      allSamples.push(s);
      allLabels.push(cls);
    }
  }

  if (multiplier === 1) {
    // No augmentation: the prepared set IS the originals. Reference the
    // ImageData objects directly (downstream only reads pixels from them)
    // instead of cloning the whole dataset into a worker and back. rawOrder
    // tells the feature cache this set is identical to the flattened raw
    // samples, so Train and Evaluate share one feature tensor.
    if (prog) prog.value = 100;
    preparedData = { xs: allSamples, ys: allLabels, numClasses: classNames.length, rawOrder: true };
    log('success', t('log_prep_done', allSamples.length));
    if (status) status.textContent = t('log_prep_done', allSamples.length);
    setBlockStatus(document.getElementById(id), 'done');
    evaluatePipelineState();
    prepareInProgress = false;
    return true;
  }

  const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
  const workerURL = URL.createObjectURL(blob);
  const worker = new Worker(workerURL);

  return new Promise((resolve) => {
    // Tear down worker + blob URL + guard exactly once, whatever the outcome.
    let settled = false;
    const cleanup = (ok) => {
      if (settled) return;
      settled = true;
      try { worker.terminate(); } catch (_) {}
      URL.revokeObjectURL(workerURL);
      prepareInProgress = false;
      resolve(!!ok);
    };
    // Without these, a worker exception left the promise pending forever -
    // runPipeline would hang and the progress bar freeze with no error.
    worker.onerror = (err) => {
      log('error', t('err_prep_worker') + (err && err.message ? err.message : 'unknown'));
      setBlockStatus(document.getElementById(id), 'error');
      cleanup(false);
    };
    worker.onmessageerror = () => {
      log('error', t('err_prep_decode'));
      setBlockStatus(document.getElementById(id), 'error');
      cleanup(false);
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
          cleanup(false);
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
        cleanup(true);
      }
    };
    worker.postMessage({ samples: allSamples, multiplier, augType });
  });
}

// ===== LOAD BASE MODEL =====
// Returns true when the base model is available afterwards (runPipeline stops
// on false).
async function runLoadBaseModel(id) {
  if (baseModel) { log('info', t('info_base_already')); setBlockStatus(document.getElementById(id), 'done'); return true; }
  // Guard against a double-click racing two ~3 MB downloads (the second would
  // overwrite baseModel and leak the first GraphModel's weights).
  if (baseModelLoading) { log('info', t('info_base_loading')); return false; }
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
    if (mstat) mstat.textContent = t('status_base_loaded');
    log('success', t('log_model_loaded'));
    setBlockStatus(document.getElementById(id), 'done');
    evaluatePipelineState();
    return true;
  } catch (err) {
    log('error', t('log_model_err') + err.message);
    setBlockStatus(document.getElementById(id), 'error');
    return false;
  } finally {
    baseModelLoading = false;
  }
}



// ============================================================

// ===== TRAINING =====
let lossHistory = [], accHistory = [];

// The classifier head trained on frozen MobileNet features. Built here for
// both Train and Evaluate so the hold-out verdict is about the same
// architecture the deployed model uses.
function buildHead(featSize, numClasses, lr) {
  const head = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [featSize], units: 128, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.3 }),
      tf.layers.dense({ units: numClasses, activation: 'softmax' })
    ]
  });
  head.compile({
    optimizer: tf.train.adam(lr),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  return head;
}

// Hyperparameters from a Train block's inputs (its defaults when a field is
// missing). Evaluate reads the placed Train block through this too, so the
// hold-out verdict follows the settings the user is actually training with.
function readTrainSettings(trainId) {
  const val = (prefix) => document.getElementById(prefix + trainId)?.value;
  return {
    epochs: parseInt(val('ep-') || '15'),
    lr: parseFloat(val('lr-') || '0.001'),
    batchSize: parseInt(val('bs-') || '16')
  };
}

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
    msg = t('interp_overfit');
  } else if (fallingFast) {
    msg = t('interp_falling');
  } else if (flat) {
    msg = t('interp_flat');
  } else {
    msg = t('interp_progress', (acc * 100).toFixed(0));
  }
  el.textContent = msg;
  el.className = 'train-interp train-interp-' + tone;
}

function drawChart(canvasId) {
  const cv = document.getElementById(canvasId);
  if (!cv) return;
  const { ctx, W, H } = setupChartCanvas(cv, 80);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = cssToken('--c-surface-2');
  ctx.fillRect(0, 0, W, H);

  // Layout: leave room for axis labels
  const PAD_L = 26, PAD_R = 8, PAD_T = 14, PAD_B = 14;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  // Axis frame
  ctx.strokeStyle = cssToken('--c-border-strong');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_L, PAD_T);
  ctx.lineTo(PAD_L, H - PAD_B);
  ctx.lineTo(W - PAD_R, H - PAD_B);
  ctx.stroke();

  // Y-axis ticks: accuracy uses fixed 0..1, drawn on left axis.
  ctx.font = cssFont(9);
  ctx.fillStyle = cssToken('--c-muted-2');
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  [0, 0.5, 1].forEach(v => {
    const y = PAD_T + innerH - v * innerH;
    ctx.fillText(v.toFixed(1), PAD_L - 4, y);
    ctx.strokeStyle = cssToken('--c-border');
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
      ctx.fillStyle = cssToken('--c-muted-2');
      ctx.fillText(String(i + 1), x, H - PAD_B + 2);
    });
  }

  // Loss is unbounded – scale to its own min/max so the curve fills the chart.
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
  drawLine(accHistory, cssToken('--c-model'), v => v);
  // Loss: scale into [0..1] for plotting only (right-side y label shows real value).
  drawLine(lossHistory, cssToken('--c-train'), v => (v - lossMin) / lossRange);

  // Legend + final values, top of chart
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = cssFont(10);
  const lastLoss = lossHistory[lossHistory.length - 1];
  const lastAcc = accHistory[accHistory.length - 1];
  ctx.fillStyle = cssToken('--c-train');
  ctx.fillText(t('chart_loss') + (lastLoss != null ? ` ${lastLoss.toFixed(3)}` : ''), PAD_L + 4, 1);
  ctx.fillStyle = cssToken('--c-model');
  ctx.fillText(t('chart_acc') + (lastAcc != null ? ` ${(lastAcc * 100).toFixed(1)}%` : ''), PAD_L + 80, 1);
}

// Train pre-flight validation. Returns true if training should proceed.
async function validateTrainingData() {
  const counts = capturedSamples.map(arr => (arr || []).length);
  const classesWithSamples = counts.filter(n => n > 0).length;
  if (classesWithSamples < 2) {
    const msg = t('val_min_classes', classesWithSamples);
    showToast(msg, 'error');
    log('warn', msg);
    return false;
  }
  const cont = t('btn_continue_anyway');
  const MIN_PER_CLASS = 5;
  const tooFew = counts
    .map((n, i) => ({ n, name: classNames[i] }))
    .filter(c => c.n > 0 && c.n < MIN_PER_CLASS);
  if (tooFew.length > 0) {
    const list = tooFew.map(c => `"${c.name}" (${c.n})`).join(', ');
    const msg = t('val_too_few', MIN_PER_CLASS, list);
    if (!(await uiConfirm(msg, { okLabel: cont }))) return false;
  }
  const nonZero = counts.filter(n => n > 0);
  const max = Math.max(...nonZero);
  const min = Math.min(...nonZero);
  if (max >= 10 * min && max >= 20) {
    const msg = t('val_imbalance', min, max);
    if (!(await uiConfirm(msg, { okLabel: cont }))) return false;
  }
  return true;
}

// Resolves true when a trained model is live afterwards, false on a guard,
// cancel or error (runPipeline stops on false).
async function runTraining(id) {
  if (!preparedData) {
    log('warn', t('log_no_data'));
    if (!placedBlocks.some(b => b.type === 'prepare-data')) {
      ensureBlockOnCanvas('prepare-data');
    }
    return false;
  }
  if (!baseModel) {
    log('warn', t('log_no_model_base'));
    if (!placedBlocks.some(b => b.type === 'pretrained-model')) {
      ensureBlockOnCanvas('pretrained-model');
    }
    return false;
  }
  if (!(await validateTrainingData())) return false;

  // Single-flight: a second concurrent run (double-click Train, or Run pipeline
  // while a manual train is in flight) would share trainingCancelled / the chart
  // histories / fullModel and corrupt all of them.
  if (trainingInProgress) {
    log('warn', t('warn_train_running'));
    return false;
  }
  trainingInProgress = true;

  trainingCancelled = false;
  lossHistory = []; accHistory = [];
  const { epochs, lr, batchSize } = readTrainSettings(id);
  const info = document.getElementById('train-info-' + id);
  const numClasses = preparedData.numClasses;
  const { xs: rawXs, ys: rawYs } = preparedData;

  setBlockStatus(document.getElementById(id), 'running');
  log('step', t('log_train_start', epochs));

  // ysTensor is disposed in finally; the feature tensor is OWNED BY THE
  // FEATURE CACHE and must never be disposed here.
  let ysTensor = null;
  let classifier = null;    // disposed in finally unless training committed it
  let committed = false;
  const prevModel = fullModel; // freed AFTER the new model is live (see below)

  try {
    // ── STEP 1: Extract bottleneck features from frozen base model ──
    // Always resize to 224×224 – MobileNetV3-Small requires that input size
    // regardless of the resolution the user chose when capturing samples.
    log('info', t('log_feat_extract', rawXs.length));
    // A prepared set without augmentation is the raw set in the same order,
    // so it shares the 'raw' cache entry with Evaluate.
    const featsTensor = await getCachedFeatures(
      preparedData.rawOrder ? 'raw' : 'prepared',
      rawXs,
      preparedData.rawOrder ? 'raw' : rawXs,
      {
        shouldCancel: () => trainingCancelled,
        onProgress: (done, total) => {
          if (info) info.textContent = t('feat_progress', done, total);
        }
      });
    const featSize = featsTensor.shape[1];

    // Dispose the index tensor immediately after oneHot consumes it
    const idxTensor = tf.tensor1d(rawYs, 'int32');
    ysTensor = tf.oneHot(idxTensor, numClasses);
    idxTensor.dispose();

    log('info', t('log_feat_shape', rawXs.length, featSize));

    // ── STEP 2: Train small classifier on bottleneck features ──
    // The base model (GraphModel) cannot be fine-tuned in TF.js - it is always frozen.
    // We train only the Dense head on the pre-extracted feature vectors.
    classifier = buildHead(featSize, numClasses, lr);

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
          if (info) info.textContent = t('train_eta', epoch + 1, epochs, remaining);
          const chartEl = document.getElementById('chart-' + id);
          if (chartEl) chartEl.setAttribute('aria-label', t('aria_chart', epoch + 1, logs.loss.toFixed(3), (acc * 100).toFixed(1)));
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
    committed = true;              // ownership transferred – don't dispose in finally
    // Free the previous head now that the live inference loop reads the new one.
    // Doing it here (not before fit) means a running inference camera has already
    // switched to `classifier` before the old model's weights are released.
    if (prevModel && prevModel !== classifier) {
      try { prevModel.dispose(); } catch (_) {}
    }

    log('info', t('log_model_ready'));
    log('success', t('log_train_done', finalAcc));
    setBlockStatus(document.getElementById(id), 'done');
    modelSaved = false; // freshly trained, not yet saved
    evaluatePipelineState();
    notifyModelTrained();
    return true;
  } catch (err) {
    if (err.message === 'cancelled') {
      log('warn', t('log_train_cancel'));
      setBlockStatus(document.getElementById(id), 'idle');
    } else {
      log('error', t('err_training') + err.message);
      console.error(err);
      setBlockStatus(document.getElementById(id), 'error');
    }
    return false;
  } finally {
    // The label tensor is ours; the feature tensor stays in featureCache.
    if (ysTensor) ysTensor.dispose();
    // The freshly-built classifier leaks if training was cancelled or errored
    // before ownership transferred to fullModel.
    if (classifier && !committed) { try { classifier.dispose(); } catch (_) {} }
    trainingInProgress = false;
  }
}


function stopTraining(id) {
  trainingCancelled = true;
  log('warn', t('log_train_stopping'));
}

// ===== MODEL EVALUATION (train/test split) =====
// Extract MobileNet bottleneck features for a list of ImageData samples.
// Returns a [N, featSize] tensor (caller owns it). BATCHED: one
// baseModel.predict() per BATCH samples instead of per-sample, ~4-8x faster
// on GPU, yielding to the UI between batches. Always resizes to 224x224
// (MobileNetV3-Small input) whatever resolution the samples were captured at.
// Worker output uses plain {data,width,height} objects; wrap with ImageData
// (no buffer copy) so tf.browser.fromPixels accepts them.
// opts.shouldCancel() aborts with 'cancelled'; opts.onProgress(done, total).
async function extractFeatures(samples, opts) {
  const BATCH = 8;
  const shouldCancel = opts && opts.shouldCancel;
  const onProgress = opts && opts.onProgress;
  const feats = [];
  try {
    for (let bs = 0; bs < samples.length; bs += BATCH) {
      if (shouldCancel && shouldCancel()) throw new Error('cancelled');
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
      if (onProgress) onProgress(end, samples.length);
      await tf.nextFrame();
    }
    return tf.concat(feats, 0);
  } finally {
    // Per-batch tensors are always freed: after concat on success, and on a
    // cancel/error mid-way so nothing leaks.
    feats.forEach(f => { try { f.dispose(); } catch (_) {} });
  }
}

// Cached wrapper around extractFeatures. `source` names the cache slot,
// `ident` is what makes the sample list unique within that slot (the array
// itself for a prepared snapshot, 'raw' for the flattened captured samples,
// whose content is covered by datasetVersion). The returned tensor belongs to
// the cache: callers must not dispose it.
async function getCachedFeatures(source, samples, ident, opts) {
  const hit = featureCache[source];
  if (hit && hit.version === datasetVersion && hit.ident === ident && hit.base === baseModel) {
    log('info', t('log_feat_cached'));
    return hit.feats;
  }
  if (hit) { try { hit.feats.dispose(); } catch (_) {} delete featureCache[source]; }
  // Snapshot the keys before the (async) extraction so a sample captured
  // mid-way produces a stale entry that the next lookup rejects.
  const version = datasetVersion;
  const base = baseModel;
  const feats = await extractFeatures(samples, opts);
  if (featureCache[source]) { try { featureCache[source].feats.dispose(); } catch (_) {} }
  featureCache[source] = { version, ident, base, feats };
  return feats;
}

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
    showToast(t('eval_need_samples'), 'warn');
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
  // Features are extracted ONCE for the flattened raw set (class by class, the
  // same order runPrepare uses, so the cache entry is shared with Train) and
  // the train/test rows are gathered from it by index. Stratified 80/20 split;
  // keep the test ImageData refs for the thumbnails.
  const flatSamples = [];
  const trainIdx = [], trainLabels = [], testIdx = [], testLabels = [], testSamples = [];
  for (let c = 0; c < numClasses; c++) {
    const arr = capturedSamples[c] || [];
    const offset = flatSamples.length;
    arr.forEach(s => flatSamples.push(s));
    const order = arr.map((_, i) => offset + i);
    if (arr.length < 2) { order.forEach(gi => { trainIdx.push(gi); trainLabels.push(c); }); continue; }
    // Deterministic seeded Fisher-Yates so the split is stable across clicks
    // but still a real per-class permutation (the old index-only formula gave
    // one fixed pattern for every class, so the same capture indices were
    // always held out).
    const rng = mulberry32(arr.length * 1000 + c);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const nTest = Math.max(1, Math.round(arr.length * 0.2));
    order.forEach((gi, i) => {
      if (i < nTest) { testIdx.push(gi); testLabels.push(c); testSamples.push(flatSamples[gi]); }
      else { trainIdx.push(gi); trainLabels.push(c); }
    });
  }

  // Hyperparameters follow the placed Train block so the verdict is about the
  // model the user is actually training; without one, the evaluate defaults.
  const trainBlock = blocksByType['train-model'];
  const { epochs, lr, batchSize } = trainBlock
    ? readTrainSettings(trainBlock.id)
    : { epochs: 20, lr: 0.001, batchSize: 16 };
  log('info', t('log_eval_settings', epochs, lr, batchSize, !!trainBlock));
  let trainFeat = null, testFeat = null, ysTensor = null, classifier = null, trainProbT = null, testProbT = null;
  try {
    setStatus(t('eval_extracting'));
    // Owned by featureCache (never disposed here); trainFeat/testFeat are ours.
    const allFeat = await getCachedFeatures('raw', flatSamples, 'raw', {
      onProgress: (done, total) => setStatus(t('feat_progress', done, total))
    });
    trainFeat = tf.tidy(() => tf.gather(allFeat, tf.tensor1d(trainIdx, 'int32')));
    testFeat = tf.tidy(() => tf.gather(allFeat, tf.tensor1d(testIdx, 'int32')));
    const featSize = trainFeat.shape[1];

    const idxT = tf.tensor1d(trainLabels, 'int32');
    ysTensor = tf.oneHot(idxT, numClasses);
    idxT.dispose();

    setStatus(t('eval_training'));
    classifier = buildHead(featSize, numClasses, lr);
    await classifier.fit(trainFeat, ysTensor, {
      epochs, batchSize, shuffle: true,
      // Yield between epochs so the tab stays responsive and the status line
      // actually repaints.
      callbacks: {
        onEpochEnd: async (epoch) => {
          setStatus(t('eval_epoch', epoch + 1, epochs));
          await tf.nextFrame();
        }
      }
    });

    setStatus(t('eval_testing'));
    trainProbT = classifier.predict(trainFeat);
    testProbT = classifier.predict(testFeat);
    const trainProbs = await trainProbT.data();
    const testProbs = await testProbT.data();

    // Row `row` of a flat [N, numClasses] probability buffer.
    const argmaxRow = (probs, row) => argmax(probs.subarray(row * numClasses, (row + 1) * numClasses));
    // Train accuracy is computed for the overfit verdict but not displayed.
    let trainCorrect = 0;
    for (let i = 0; i < trainLabels.length; i++) if (argmaxRow(trainProbs, i) === trainLabels[i]) trainCorrect++;
    const trainAcc = trainLabels.length ? trainCorrect / trainLabels.length : 0;

    // Test confusion matrix + misclassified thumbnails – the 20% hold-out only.
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
    log('success', t('log_eval_done', (acc * 100).toFixed(0), testLabels.length));
  } catch (err) {
    log('error', t('err_eval') + err.message);
    console.error(err);
    setStatus(t('err_prefix') + err.message);
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
    verdict = t('eval_verdict_overfit');
  } else if (r.acc >= 0.8) {
    verdictClass = 'ok';
    verdict = t('eval_verdict_ok');
  } else {
    verdictClass = 'warn';
    verdict = t('eval_verdict_weak');
  }

  // Confusion matrix table.
  const maxCell = Math.max(1, ...r.confusion.flat());
  let head = '<th></th>' + classNames.slice(0, r.numClasses).map((n, i) =>
    `<th title="${escapeHtml(n)}"><span class="sr-only">${escapeHtml(n)}</span><span class="eval-dot" style="background:${classColors[i]}"></span></th>`).join('');
  let rows = '';
  for (let tr = 0; tr < r.numClasses; tr++) {
    let cells = `<th class="eval-rowhead" title="${escapeHtml(classNames[tr])}"><span class="eval-dot" style="background:${classColors[tr]}"></span>${escapeHtml((classNames[tr] || '').slice(0, 8))}</th>`;
    for (let pc = 0; pc < r.numClasses; pc++) {
      const v = r.confusion[tr][pc];
      const isDiag = tr === pc;
      const intensity = v / maxCell;
      const bg = isDiag
        ? cssRgba('--rgb-model', 0.15 + intensity * 0.6)
        : (v > 0 ? cssRgba('--rgb-train', 0.15 + intensity * 0.6) : 'transparent');
      cells += `<td style="background:${bg}">${v || ''}</td>`;
    }
    rows += `<tr>${cells}</tr>`;
  }
  const matrix = `<table class="eval-matrix"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;

  // Misclassified thumbnails (up to 8).
  let missHtml = '';
  const shown = r.misclassified.slice(0, 8);
  if (shown.length) {
    missHtml = `<div class="eval-miss-title">${t('eval_mistakes')}</div><div class="eval-miss-grid" id="eval-miss-${id}"></div>`;
  } else if (r.total > 0) {
    missHtml = `<div class="eval-miss-title">${t('eval_no_mistakes')}</div>`;
  }

  el.innerHTML = `
    <div class="eval-scores">
      <div class="eval-score eval-score-test">
        <div class="eval-score-val">${pct(r.acc)}</div>
        <div class="eval-score-lbl">${t('eval_unseen_lbl', r.total)}</div>
      </div>
    </div>
    <div class="eval-verdict eval-verdict-${verdictClass}">${verdict}</div>
    <div class="eval-matrix-title">${t('eval_matrix_title')}</div>
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
// The MobileNet backbone is identical for every trained head, so it is stored
// ONCE under this key (~2.5 MB) and only the small head is saved per name.
// model-explorer.html reads the same key to skip the network download.
const BASE_MODEL_IDB_KEY = 'indexeddb://ml-blocks-base-v1';

// Shared by the Save Model block and the post-train toast: the small head is
// saved under the chosen name, the backbone once under BASE_MODEL_IDB_KEY.
async function saveModelToBrowser(name) {
  fullModel.userDefinedMetadata = modelMetadata; // bake labels into model JSON
  await fullModel.save('indexeddb://ml-blocks-' + name);
  const stored = await tf.io.listModels();
  if (!stored[BASE_MODEL_IDB_KEY]) await baseModel.save(BASE_MODEL_IDB_KEY);
  localStorage.setItem('ml-blocks-meta-' + name, JSON.stringify(modelMetadata));
  modelSaved = true;
  evaluatePipelineState();
}

async function runSaveIDB(id) {
  if (!fullModel) { log('warn', t('lbl_no_model')); return; }
  if (!baseModel) { log('warn', t('log_no_model_base')); return; }
  const nameEl = document.getElementById('model-name-' + id);
  const name = (nameEl ? nameEl.value.trim() : '') || 'model-1';
  // 'base-*' is the backbone namespace (fixed key + legacy per-name copies);
  // a head stored there would be hidden from the list and could clobber it.
  if (name.startsWith('base-')) {
    log('warn', t('log_save_bad_name'));
    setBlockStatus(document.getElementById(id), 'error');
    return;
  }
  try {
    await saveModelToBrowser(name);
    log('success', t('log_save_idb'));
    setBlockStatus(document.getElementById(id), 'done');
    const el = document.getElementById('save-info-' + id);
    if (el) el.textContent = t('log_save_idb');
  } catch (err) {
    log('error', t('err_save') + err.message);
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
    // Running in parallel is safe – each saves to its own closure variable.
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
    log('success', t('log_model_downloaded', fname));
    modelSaved = true;
    evaluatePipelineState();
  } catch (err) {
    log('error', t('err_download') + err.message);
  }
}

// ===== DEPLOY: EXPORT SELF-CONTAINED CLASSIFIER APP =====
async function runDeployExport(id) {
  if (!fullModel || !baseModel) {
    showToast(t('toast_train_first'), 'warn');
    return;
  }
  const statusEl = document.getElementById('deploy-status-' + id);
  const setStatus = (s) => { if (statusEl) statusEl.textContent = s; };
  setBlockStatus(document.getElementById(id), 'running');
  setStatus(t('deploy_packing'));
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
    setStatus(t('deploy_exported'));
    setBlockStatus(document.getElementById(id), 'done');
    log('success', t('log_app_exported'));
    showToast(t('toast_app_exported'), 'success', { duration: 3500 });
  } catch (err) {
    log('error', t('err_export') + err.message);
    console.error(err);
    setStatus(t('err_prefix') + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  }
}

// Build a fully self-contained classifier web app: TF.js from CDN + both models
// embedded as base64 + a camera UI. `<` in the embedded JSON is escaped so a
// class name can't break out of the <script> block.
function buildStandaloneAppHTML(bundle) {
  // The exported page is frozen in the language it was exported from.
  const X = STRINGS[bundle.lang] || STRINGS.pl;
  const dataJson = JSON.stringify(bundle).replace(/</g, '\\u003c');
  const title = X.export_title;
  const startLbl = X.export_start;
  const madeWith = X.export_made_with;
  const loadingLbl = X.export_loading;
  return `<!DOCTYPE html>
<html lang="${STRINGS[bundle.lang] ? bundle.lang : 'pl'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js"><\/script>
<style>
  :root{--bg:#0f172a;--surface:#1e293b;--border:#334155;--text:#e2e8f0;--muted:#94a3b8;--faint:#475569;--link:#64748b;--ok:#22c55e;--ok-ink:#052e16;--font:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  *{box-sizing:border-box} body{margin:0;font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
  h1{font-size:20px;margin:0 0 4px} .sub{color:var(--muted);font-size:12px;margin-bottom:16px}
  #stage{position:relative;width:100%;max-width:360px;aspect-ratio:1;border-radius:16px;overflow:hidden;background:var(--surface);border:2px solid var(--border)}
  video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
  button{margin-top:16px;background:var(--ok);color:var(--ok-ink);border:none;padding:12px 22px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer}
  button:disabled{opacity:.5;cursor:default}
  #bars{width:100%;max-width:360px;margin-top:16px;display:flex;flex-direction:column;gap:8px}
  .bar-row{font-size:13px}
  .bar-head{display:flex;justify-content:space-between;margin-bottom:3px}
  .bar-track{height:10px;background:var(--surface);border-radius:5px;overflow:hidden}
  .bar-fill{height:100%;border-radius:5px;transition:width .12s}
  #result{font-size:22px;font-weight:800;margin-top:14px;min-height:28px}
  .foot{margin-top:20px;color:var(--faint);font-size:11px}
  .foot a{color:var(--link)}
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
let baseModel=null, headModel=null, stream=null, loopTimer=null, busy=false;
async function load(){
  headModel = await tf.loadLayersModel({load:async()=>({modelTopology:BUNDLE.classifier.modelTopology,weightSpecs:BUNDLE.classifier.weightSpecs,weightData:b64ToBuf(BUNDLE.classifier.weightData),format:BUNDLE.classifier.format})});
  baseModel = await tf.loadGraphModel({load:async()=>({modelTopology:BUNDLE.base.modelTopology,weightSpecs:BUNDLE.base.weightSpecs,weightData:b64ToBuf(BUNDLE.base.weightData),format:BUNDLE.base.format})});
  document.getElementById('status').textContent='${X.export_ready}';
  const b=document.getElementById('btn'); b.disabled=false;
  // Build bar rows.
  const bars=document.getElementById('bars');
  bars.innerHTML=LABELS.map((n,i)=>'<div class="bar-row"><div class="bar-head"><span>'+esc(n)+'</span><span id="pct'+i+'">0%</span></div><div class="bar-track"><div class="bar-fill" id="fill'+i+'" style="width:0%;background:'+(COLORS[i]||'var(--ok)')+'"></div></div></div>').join('');
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function start(){
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
  }catch(e){ try{ stream=await navigator.mediaDevices.getUserMedia({video:true}); }catch(e2){ document.getElementById('status').textContent='${X.export_no_camera}'; return; } }
  const vid=document.getElementById('vid'); vid.srcObject=stream; await vid.play();
  document.getElementById('btn').style.display='none';
  startLoop();
}
function startLoop(){ if(!loopTimer&&stream) loopTimer=setInterval(predict,120); }
function stopLoop(){ if(loopTimer){ clearInterval(loopTimer); loopTimer=null; } }
async function predict(){
  // In-flight guard: on a slow GPU a tick can outlast the interval; without
  // it ticks pile up and the page stutters.
  if(busy) return;
  const vid=document.getElementById('vid'); if(!vid.srcObject) return;
  busy=true;
  let probs;
  try{
    const t=tf.tidy(()=>tf.browser.fromPixels(vid).resizeBilinear([SIZE,SIZE]).toFloat().div(255).expandDims(0));
    try{ const f=baseModel.predict(t); const p=headModel.predict(f); probs=await p.data(); f.dispose(); p.dispose(); } finally { t.dispose(); }
    let max=0; for(let i=1;i<probs.length;i++) if(probs[i]>probs[max]) max=i;
    for(let i=0;i<LABELS.length;i++){ const pc=Math.round((probs[i]||0)*100); document.getElementById('pct'+i).textContent=pc+'%'; document.getElementById('fill'+i).style.width=pc+'%'; }
    const r=document.getElementById('result'); r.textContent=LABELS[max]+' '+Math.round(probs[max]*100)+'%'; r.style.color=COLORS[max]||'var(--text)';
  }catch(e){ /* frame not ready yet */ }
  finally{ busy=false; }
}
// Pause inference while the tab is hidden; release the camera when the page goes away.
document.addEventListener('visibilitychange',()=>{ if(document.hidden) stopLoop(); else startLoop(); });
window.addEventListener('pagehide',()=>{ stopLoop(); if(stream){ stream.getTracks().forEach(tr=>tr.stop()); stream=null; } });
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
  // assign inp.onchange here – that made every file pick run tryLoadModelFiles
  // twice concurrently (parsing the file and building two models).
  inp.click();
}

async function tryLoadModelFiles(id) {
  const inp = document.getElementById('file-model-' + id);
  if (!inp || !inp.files.length) { log('warn', t('warn_pick_model_file')); return; }
  const allFiles = Array.from(inp.files);
  const jsonFile = allFiles.find(f => f.name.endsWith('.json'));
  // Checked before the single-flight guard: an early return after
  // modelFileLoading = true (outside try/finally) left the guard stuck.
  if (!jsonFile) { log('warn', t('warn_no_json')); return; }
  if (modelFileLoading) { log('info', t('info_model_loading')); return; }
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
      // ── Bundled format (klocki-full-model.json) – contains base + classifier ──
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
      log('info', t('log_base_from_file'));
      processLoadedMeta(id, parsed.metadata || {});
    } else {
      // ── Legacy: separate classifier .json + .bin files ──
      const binFile = allFiles.find(f => f.name.endsWith('.bin') || f.name.endsWith('.weights.bin'));
      const files = binFile ? [jsonFile, binFile] : [jsonFile];
      inferModel = await tf.loadLayersModel(tf.io.browserFiles(files));
      processLoadedMeta(id, parsed.userDefinedMetadata || {});
      if (!baseModel) {
        log('warn', t('warn_load_base_too'));
      }
    }
    disposeIfUnused(prevInfer, inferModel, fullModel);
    disposeIfUnused(prevBase, baseModel, fullModel);
    if (prevBase !== baseModel) disposeFeatureCache();
    setBlockStatus(document.getElementById(id), 'done');
    log('success', t('log_upload_done', inferLabels().join(', ')));
    modelSaved = true; // loaded from disk -> already exists somewhere
    evaluatePipelineState();
  } catch (err) {
    log('error', t('err_upload') + err.message);
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
    log('warn', t('warn_pick_from_list'));
    return;
  }
  if (modelFileLoading) { log('info', t('info_model_loading')); return; }
  modelFileLoading = true;
  const prevInfer = inferModel;
  const prevBase = baseModel;
  setBlockStatus(document.getElementById(id), 'running');
  log('step', t('log_idb_load', name));
  try {
    inferModel = await tf.loadLayersModel('indexeddb://ml-blocks-' + name);
    try {
      baseModel = await tf.loadGraphModel(BASE_MODEL_IDB_KEY);
      log('info', t('log_base_from_browser'));
    } catch (_) {
      // Backward compat: older saves stored a backbone copy per model name.
      try {
        baseModel = await tf.loadGraphModel('indexeddb://ml-blocks-base-' + name);
        log('info', t('log_base_from_browser'));
      } catch (_2) {
        log('warn', t('warn_base_not_in_browser'));
      }
    }
    const metaStr = localStorage.getItem('ml-blocks-meta-' + name) || localStorage.getItem('ml-blocks-meta');
    const meta = metaStr ? JSON.parse(metaStr) : {};
    processLoadedMeta(id, meta);
    disposeIfUnused(prevInfer, inferModel, fullModel);
    disposeIfUnused(prevBase, baseModel, fullModel);
    if (prevBase !== baseModel) disposeFeatureCache();
    setBlockStatus(document.getElementById(id), 'done');
    log('success', t('log_upload_done', meta.classLabels ? meta.classLabels.join(', ') : '–'));
    modelSaved = true;
    evaluatePipelineState();
  } catch (err) {
    log('error', t('err_idb_load') + err.message);
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
  // The loaded labels are NOT written into classNames: the prediction UI reads
  // them through inferLabels(), so a 2-label model in a 4-class session shows
  // two classes there while the training side keeps its own four.
  const el = document.getElementById('meta-' + id);
  if (el) {
    el.innerHTML = `
  <b>${t('lbl_classes')}:</b> ${inferLabels().map(escapeHtml).join(', ')}<br>
  <b>${t('lbl_accuracy')}:</b> ${meta.trainingAccuracy ? (meta.trainingAccuracy * 100).toFixed(1) + '%' : '–'}<br>
  <b>${t('lbl_timestamp')}:</b> ${meta.timestamp ? new Date(meta.timestamp).toLocaleString() : '–'}
`;
  }
}



// ============================================================

// ===== INFERENCE CAMERA =====
let inferCameraStream = null;
let inferVideoEl = null;
let predHistory = [];
let frozenFrame = false;
// The latest raw model output is retained separately from the history so a
// language switch or a shell rebuild can repaint the card without inventing a
// new prediction.  Values are never smoothed or renormalised.
const predSnapshots = new Map(); // block id -> normalized prediction snapshot
const _predHistoryUI = new WeakMap(); // timeline element -> { slots: [...] }
let predFrameSeq = 0;

const PREDICTION_HISTORY_LIMIT = 30;
const PREDICTION_MODES = new Set(['live', 'paused', 'waiting', 'stopped']);

// Index of the largest value in an array / typed array (0 for an empty one).
function argmax(arr) {
  let m = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[m]) m = i;
  return m;
}

// Labels shown by the prediction-side UI (result line, bars, XAI). A model
// trained this session follows the live class names, so renames propagate;
// a model loaded from file/browser carries its own labels, which may be
// fewer than the session's classes and must not be written into classNames
// (that left phantom classes in the Labels block and confusion matrix).
function inferLabels() {
  const loaded = inferModel && inferModel !== fullModel;
  const meta = inferMetadata;
  if (loaded && meta && Array.isArray(meta.classLabels) && meta.classLabels.length) return meta.classLabels;
  return classNames;
}
function inferColor(i) {
  return classColors[i] || CLASS_COLORS[i % CLASS_COLORS.length];
}

// ===== ZERO-SHOT INFERENCE (FULL CLASSIFIER) =====
// Uses MobileNetV3-Small's original 1001-class ImageNet softmax head – a real
// classifier, not feature-vector activations. Loaded lazily on first start so
// users who never open the block don't pay the download cost.
let zsStreams = {}; // id -> MediaStream
let zsIntervals = {}; // id -> setInterval handle
let zeroShotModel = null;
let zeroShotModelLoading = null;

// Full 1001-entry ImageNet label list (line 0 = background), fetched lazily on
// the first zero-shot start; falls back to index strings when offline.
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
    // fallback – return index strings
    imagenetLabels = Array.from({ length: 1001 }, (_, i) => `class_${i}`);
    return imagenetLabels;
  }
}

async function loadZeroShotModel(statusEl) {
  if (zeroShotModel) return zeroShotModel;
  if (zeroShotModelLoading) return zeroShotModelLoading;
  log('step', t('log_zs_loading'));
  zeroShotModelLoading = tf.loadGraphModel(CLASSIFIER_MODEL_URL, {
    onProgress: (frac) => {
      if (statusEl) statusEl.textContent = Math.round(frac * 100) + '%';
    }
  }).then(m => {
    zeroShotModel = m;
    zeroShotModelLoading = null;
    log('success', t('log_zs_loaded'));
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
      if (statusEl) statusEl.textContent = t('zs_downloading');
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
    log('success', t('log_zs_started'));
  } catch (err) {
    if (statusEl) statusEl.textContent = err.message || '';
    log('error', t('err_zs') + err.message);
    setBlockStatus(document.getElementById(id), 'error');
  } finally {
    cameraOpening['zs-' + id] = false;
  }
}

function stopZeroShot(id) {
  if (zsIntervals[id]) { clearInterval(zsIntervals[id]); delete zsIntervals[id]; }
  if (zsStreams[id]) { zsStreams[id].getTracks().forEach(t => t.stop()); delete zsStreams[id]; }
  setBlockStatus(document.getElementById(id), 'idle');
  log('info', t('log_zs_stopped'));
}

// Top-5 result rows are built once per results element and patched per tick.
const _zsUI = new WeakMap(); // resultsEl -> rows:[{label,pct,fill}]
function ensureZeroShotRowsDOM(resultsEl, k) {
  const cached = _zsUI.get(resultsEl);
  if (cached && cached.length === k) return cached;
  resultsEl.innerHTML = '';
  const rows = [];
  for (let i = 0; i < k; i++) {
    const row = document.createElement('div');
    row.style.marginBottom = '3px';
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;font-size:10px;margin-bottom:1px';
    const label = document.createElement('span');
    label.style.cssText = 'font-weight:600;color:var(--c-model);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px';
    const pct = document.createElement('span');
    pct.style.color = 'var(--c-muted)';
    head.appendChild(label); head.appendChild(pct);
    const track = document.createElement('div');
    track.style.cssText = 'background:var(--c-border);border-radius:3px;height:5px';
    const fill = document.createElement('div');
    fill.style.cssText = 'background:var(--c-model);width:0%;height:5px;border-radius:3px;transition:width .15s';
    track.appendChild(fill);
    row.appendChild(head); row.appendChild(track);
    resultsEl.appendChild(row);
    rows.push({ label, pct, fill });
  }
  _zsUI.set(resultsEl, rows);
  return rows;
}

// Per-block in-flight guard so a slow tick never overlaps the next one.
const zsBusy = {}; // id -> bool
async function runZeroShot(id) {
  if (!zeroShotModel) return;
  if (zsBusy[id]) return;
  const vid = document.getElementById('zsvid-' + id);
  if (!vid || !vid.srcObject) return;
  zsBusy[id] = true;
  const labels = imagenetLabels;
  // Declared outside try so a throw in predict/softmax/data() still frees them
  // – this runs up to 10x/s, so a leak here compounds fast.
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
    // Partial top-5 selection – single linear pass instead of allocating
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
    const resultsEl = document.getElementById('zs-results-' + id);
    if (resultsEl && labels) {
      const rows = ensureZeroShotRowsDOM(resultsEl, K);
      for (let k = 0; k < K; k++) {
        const i = topI[k];
        const pct = Math.min(100, topV[k] * 100).toFixed(1);
        rows[k].label.textContent = labels[i] || `class_${i}`;
        rows[k].pct.textContent = pct + '%';
        rows[k].fill.style.width = pct + '%';
      }
    }
  } catch (e) { /* silent – frame may not be ready yet */ }
  finally {
    if (tensor) tensor.dispose();
    if (logitsTensor) logitsTensor.dispose();
    if (probsTensor) probsTensor.dispose();
    zsBusy[id] = false;
  }
}

async function startInferCamera(id) {
  if (cameraOpening['infer']) return;
  cameraOpening['infer'] = true;
  try {
    if (inferCameraStream) inferCameraStream.getTracks().forEach(t => t.stop());
    // Clear any leftover freeze from a previous session – otherwise the
    // inference loop early-returns forever and predictions never resume.
    frozenFrame = false;
    const stream = await getCameraStream();
    if (!isBlockPlaced(id)) { stopStream(stream); return; } // removed during the permission prompt
    inferCameraStream = stream;
    const vid = document.getElementById('vid-' + id);
    if (vid) { vid.srcObject = inferCameraStream; vid.play().catch(() => {}); }
    inferVideoEl = vid;
    setBlockStatus(document.getElementById(id), 'running');
    log('success', t('log_infer_camera_start'));
    // Start inference loop
    const fpsEl = document.getElementById('fps-' + id);
    const interval = fpsEl ? parseInt(fpsEl.value) : 100;
    if (inferInterval) clearInterval(inferInterval);
    inferInterval = setInterval(() => runInference(id), interval);
    // A restarted camera may still have the previous snapshot.  Keep it
    // visible, but truthfully mark the card as waiting until a fresh frame
    // reaches the model.
    const resultBlock = blocksByType['show-results'];
    if (resultBlock) renderPredictionState(resultBlock.id, 'waiting');
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
  // Detach the dead stream from the <video> (mirrors removeBlock) so XAI cannot
  // pick up a frozen last frame from a camera that is no longer running.
  const vid = document.getElementById('vid-' + id);
  if (vid) vid.srcObject = null;
  if (inferVideoEl && inferVideoEl !== vid) inferVideoEl.srcObject = null;
  inferVideoEl = null;
  frozenFrame = false;
  setBlockStatus(document.getElementById(id), 'idle');
  const resultBlock = blocksByType['show-results'];
  if (resultBlock) renderPredictionState(resultBlock.id, 'stopped');
  log('info', t('log_infer_camera_stopped'));
  evaluatePipelineState();
}

// ─── Prediction UI helpers ───
function finitePredictionNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePredictionColor(value, fallback) {
  const color = String(value == null ? '' : value).trim();
  // The model metadata can be imported from a file.  Keep CSS values limited to
  // simple colour tokens so a persisted label/colour cannot become markup.
  if (/^(?:var\(--[a-z0-9-]+\)|#[0-9a-f]{3,8}|rgb\([^)]*\)|rgba\([^)]*\)|hsl\([^)]*\)|hsla\([^)]*\))$/i.test(color)) return color;
  return fallback || 'var(--c-model)';
}

function predictionBlockRecord(idOrBlock) {
  if (idOrBlock && typeof idOrBlock === 'object' && idOrBlock.id) return idOrBlock;
  const id = String(idOrBlock == null ? '' : idOrBlock);
  const known = blocksByType['show-results'];
  if (known && known.id === id) return known;
  const card = document.getElementById(id);
  return { id, card: card || null };
}

function predictionRoot(id) {
  return document.getElementById('pred-ui-' + id)
    || document.getElementById('pred-result-' + id)?.closest('.pred-ui')
    || document.getElementById(id)?.querySelector('.pred-ui');
}

function predictionThreshold(id, fallback) {
  const field = document.getElementById('thr-' + id);
  const value = field ? Number(field.value) : Number(fallback);
  return Math.min(1, Math.max(0, finitePredictionNumber(value, 0.7)));
}

function normalizePredictionPayload(payload) {
  const input = payload && typeof payload === 'object' ? payload : {};
  let raw = [];
  if (input.probabilities != null) {
    try { raw = Array.from(input.probabilities); } catch (_) { raw = []; }
  }
  // Preserve valid model outputs exactly.  Invalid fixture values are made
  // deterministic and harmless, but no smoothing or probability re-scaling is
  // applied to valid values.
  const probabilities = raw.map(value => finitePredictionNumber(value, 0));
  const sourceLabels = Array.isArray(input.labels) ? input.labels : inferLabels();
  const sourceColors = Array.isArray(input.colors) ? input.colors : [];
  const labels = probabilities.map((_, i) => String(sourceLabels && sourceLabels[i] != null ? sourceLabels[i] : `Class ${i + 1}`));
  const colors = probabilities.map((_, i) => normalizePredictionColor(
    sourceColors[i], normalizePredictionColor(inferColor(i), 'var(--c-model)')
  ));
  const threshold = Math.min(1, Math.max(0, finitePredictionNumber(input.threshold, 0.7)));
  const requestedMode = String(input.mode || (probabilities.length ? 'live' : 'waiting')).toLowerCase();
  const mode = requestedMode === 'below-threshold' || requestedMode === 'low-confidence'
    ? 'live' : (PREDICTION_MODES.has(requestedMode) ? requestedMode : (probabilities.length ? 'live' : 'waiting'));
  const maxIdx = probabilities.length ? argmax(probabilities) : -1;
  const confidence = maxIdx >= 0 ? probabilities[maxIdx] : null;
  const belowThreshold = confidence != null && confidence < threshold;
  const state = mode === 'waiting' ? 'waiting'
    : mode === 'stopped' ? 'stopped'
      : mode === 'paused' ? 'paused'
        : (belowThreshold ? 'below-threshold' : 'live');
  return {
    probabilities,
    labels,
    colors,
    threshold,
    mode,
    state,
    belowThreshold,
    maxIdx,
    confidence,
    timestamp: input.timestamp != null ? input.timestamp : Date.now(),
    frame: input.frame != null ? input.frame : null
  };
}

function predictionStatusText(snapshot) {
  if (!snapshot || snapshot.mode === 'waiting') return predictionText('waiting');
  if (snapshot.mode === 'stopped') return predictionText('stopped');
  if (snapshot.mode === 'paused') {
    return snapshot.belowThreshold
      ? `${predictionText('paused')} · ${predictionText('belowThreshold')}`
      : predictionText('paused');
  }
  return snapshot.belowThreshold
    ? `${predictionText('live')} · ${predictionText('belowThreshold')}`
    : predictionText('live');
}

function ensurePredictionStatusDOM(id) {
  let root = predictionRoot(id);
  if (!root) return null;
  let status = document.getElementById('pred-status-' + id);
  if (!status) {
    status = document.createElement('div');
    status.id = 'pred-status-' + id;
    status.className = 'pred-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const dot = document.createElement('span');
    dot.className = 'pred-status-dot';
    dot.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'pred-status-label';
    status.append(dot, label);
    root.prepend(status);
  }
  let dot = status.querySelector('.pred-status-dot');
  let label = status.querySelector('.pred-status-label');
  if (!dot) {
    dot = document.createElement('span');
    dot.className = 'pred-status-dot';
    dot.setAttribute('aria-hidden', 'true');
    status.prepend(dot);
  }
  if (!label) {
    label = document.createElement('span');
    label.className = 'pred-status-label';
    status.appendChild(label);
  }
  return { root, status, dot, label };
}

function ensurePredictionWinnerDOM(id) {
  const result = document.getElementById('pred-result-' + id);
  if (!result) return null;
  let kicker = result.querySelector('.pred-winner-kicker');
  let winner = result.querySelector('.pred-winner-class');
  let score = result.querySelector('.pred-winner-score');
  if (!kicker || !winner || !score) {
    kicker = document.createElement('span');
    kicker.className = 'pred-winner-kicker';
    winner = document.createElement('span');
    winner.className = 'pred-winner-class';
    score = document.createElement('span');
    score.className = 'pred-winner-score';
    result.replaceChildren(kicker, winner, score);
  }
  return { result, kicker, winner, score };
}

function updatePredictionStatus(id, snapshot) {
  const parts = ensurePredictionStatusDOM(id);
  if (!parts) return;
  const key = `${snapshot.mode}:${snapshot.belowThreshold ? 'below' : 'ok'}`;
  const nextText = predictionStatusText(snapshot);
  // The state badge is the only live region.  Avoid touching it on every
  // unchanged frame so screen readers do not announce a flashing stream.
  if (parts.status.dataset.statusKey !== key || parts.label.textContent !== nextText) {
    parts.status.dataset.statusKey = key;
    parts.label.textContent = nextText;
  }
  parts.status.dataset.mode = snapshot.mode;
  parts.status.dataset.confidenceState = snapshot.belowThreshold ? 'below-threshold' : 'above-threshold';
  parts.status.classList.toggle('is-live', snapshot.mode === 'live');
  parts.status.classList.toggle('is-paused', snapshot.mode === 'paused');
  parts.status.classList.toggle('is-waiting', snapshot.mode === 'waiting');
  parts.status.classList.toggle('is-stopped', snapshot.mode === 'stopped');
  parts.status.classList.toggle('is-below-threshold', snapshot.belowThreshold);
}

function updatePredictionWinner(id, snapshot) {
  const parts = ensurePredictionWinnerDOM(id);
  if (!parts) return;
  const { result, kicker, winner, score } = parts;
  kicker.textContent = predictionText('winnerLabel');
  result.setAttribute('aria-label', predictionText('winnerLabel'));
  result.dataset.predictionState = snapshot.state;
  if (snapshot.maxIdx < 0) {
    winner.textContent = predictionText('noPrediction');
    score.textContent = '';
    result.style.removeProperty('--pred-winner-color');
  } else {
    winner.textContent = snapshot.labels[snapshot.maxIdx];
    score.textContent = `${(snapshot.confidence * 100).toFixed(1)}%`;
    result.style.setProperty('--pred-winner-color', snapshot.colors[snapshot.maxIdx]);
  }
  result.classList.toggle('is-below-threshold', snapshot.belowThreshold);
  result.classList.toggle('has-prediction', snapshot.maxIdx >= 0);
  result.dataset.topIndex = String(snapshot.maxIdx);
  result.dataset.topScore = snapshot.confidence == null ? '' : String(snapshot.confidence);
}

function setPredictionRootState(id, snapshot, historyLength) {
  const root = predictionRoot(id);
  if (!root) return;
  root.dataset.predictionState = snapshot.state;
  root.dataset.predictionMode = snapshot.mode;
  root.dataset.predictionThresholdState = snapshot.belowThreshold ? 'below-threshold' : 'above-threshold';
  root.dataset.predictionThreshold = String(snapshot.threshold);
  root.dataset.predictionTopIndex = String(snapshot.maxIdx);
  root.dataset.predictionTopScore = snapshot.confidence == null ? '' : String(snapshot.confidence);
  root.dataset.predictionHistoryLength = String(historyLength == null ? predHistory.length : historyLength);
  root.dataset.predictionLanguage = lang;
  root.dataset.predictionRenderCount = String((Number(root.dataset.predictionRenderCount) || 0) + 1);
}

function ensurePredictionThresholdListener(id) {
  const field = document.getElementById('thr-' + id);
  if (!field || field.dataset.predictionBound === '1') return;
  field.dataset.predictionBound = '1';
  field.addEventListener('change', () => {
    const previous = predSnapshots.get(id);
    const threshold = predictionThreshold(id, previous ? previous.threshold : 0.7);
    if (previous) renderPredictionSnapshot(id, { ...previous, threshold, recordHistory: false }, { recordHistory: false });
    else renderPredictionState(id, 'waiting', threshold);
  });
}

// Build the ranked predict-block bar DOM ONCE per session, then mutate widths/text
// per frame. Re-check the element identity because applyLang replaces a block
// body and leaves a WeakMap entry pointing at the disconnected old bars node.
function ensurePredictBarsDOM(predictBlock, classCount, threshold, labelsArg, colorsArg) {
  if (!predictBlock || !predictBlock.id) return null;
  const barsEl = document.getElementById('pred-bars-' + predictBlock.id);
  if (!barsEl) return null;
  const labels = Array.from({ length: classCount }, (_, i) => String(labelsArg && labelsArg[i] != null ? labelsArg[i] : (inferLabels()[i] || `Class ${i + 1}`)));
  const colors = Array.from({ length: classCount }, (_, i) => normalizePredictionColor(
    colorsArg && colorsArg[i], normalizePredictionColor(inferColor(i), 'var(--c-model)')
  ));
  const cached = _predUI.get(predictBlock);
  const connected = node => !!node && (node.isConnected !== undefined ? node.isConnected : document.contains(node));
  if (cached && cached.barsEl === barsEl && connected(cached.barsEl) && cached.rows.length === classCount) {
    ensurePredictionThresholdListener(predictBlock.id);
    return cached;
  }

  const thresholdValue = Math.min(1, Math.max(0, finitePredictionNumber(threshold, 0.7)));
  const thrPct = (thresholdValue * 100).toFixed(1);
  const frag = document.createDocumentFragment();
  const thrEl = document.createElement('div');
  thrEl.className = 'pred-thr-label';
  thrEl.style.setProperty('--thr', thrPct + '%');
  const thrSpan = document.createElement('span');
  thrSpan.textContent = `${predictionText('threshold')} ${thrPct}%`;
  thrEl.appendChild(thrSpan);
  frag.appendChild(thrEl);

  const rows = [];
  for (let i = 0; i < classCount; i++) {
    const row = document.createElement('div');
    row.className = 'pred-row';
    row.dataset.classIndex = String(i);
    row.dataset.rank = String(i + 1);
    row.setAttribute('role', 'listitem');
    row.style.setProperty('--thr', thrPct + '%');
    row.style.setProperty('--pred-class-color', colors[i]);

    const lbl = document.createElement('div');
    lbl.className = 'pred-label';
    const left = document.createElement('span');
    left.className = 'pred-label-left';
    const rank = document.createElement('span');
    rank.className = 'pred-rank';
    rank.textContent = `#${i + 1}`;
    const name = document.createElement('span');
    name.className = 'pred-label-name';
    name.textContent = labels[i];
    left.append(rank, name);
    const pct = document.createElement('span');
    pct.className = 'pred-label-pct';
    pct.textContent = '0.0%';
    lbl.append(left, pct);

    const track = document.createElement('div');
    track.className = 'pred-track';
    track.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('div');
    fill.className = 'pred-fill';
    fill.style.backgroundColor = colors[i];
    fill.style.width = '0%';
    track.appendChild(fill);
    row.append(lbl, track);
    frag.appendChild(row);
    rows.push({ row, rank, name, pct, fill });
  }
  barsEl.replaceChildren(frag);
  const ui = { barsEl, rows, thrEl, thrSpan, thrPct, classCount, rankKey: '' };
  _predUI.set(predictBlock, ui);
  ensurePredictionThresholdListener(predictBlock.id);
  return ui;
}

function updatePredictBars(ui, predictions, threshold, labelsArg, colorsArg) {
  if (!ui || !ui.rows) return [];
  const values = Array.from(predictions || [], value => finitePredictionNumber(value, 0));
  const thresholdValue = Math.min(1, Math.max(0, finitePredictionNumber(threshold, 0.7)));
  const newThrPct = (thresholdValue * 100).toFixed(1);
  if (newThrPct !== ui.thrPct) {
    ui.thrPct = newThrPct;
    ui.thrEl.style.setProperty('--thr', newThrPct + '%');
    ui.thrSpan.textContent = `${predictionText('threshold')} ${newThrPct}%`;
    for (const r of ui.rows) r.row.style.setProperty('--thr', newThrPct + '%');
  }
  const labels = labelsArg || inferLabels();
  const colors = colorsArg || [];
  const ranking = ui.rows.map((_, i) => i).sort((a, b) => {
    const diff = (values[b] == null ? 0 : values[b]) - (values[a] == null ? 0 : values[a]);
    return diff || a - b;
  });
  const rankKey = ranking.join(',');
  if (rankKey !== ui.rankKey) {
    const ordered = document.createDocumentFragment();
    ranking.forEach(index => ordered.appendChild(ui.rows[index].row));
    ui.barsEl.appendChild(ordered);
    ui.rankKey = rankKey;
  }
  ranking.forEach((classIndex, rankIndex) => {
    const p = values[classIndex] == null ? 0 : values[classIndex];
    const r = ui.rows[classIndex];
    const label = String(labels && labels[classIndex] != null ? labels[classIndex] : `Class ${classIndex + 1}`);
    const color = normalizePredictionColor(colors[classIndex], normalizePredictionColor(inferColor(classIndex), 'var(--c-model)'));
    const pctTxt = (p * 100).toFixed(1);
    r.rank.textContent = `#${rankIndex + 1}`;
    r.name.textContent = label;
    r.pct.textContent = pctTxt + '%';
    r.row.dataset.classIndex = String(classIndex);
    r.row.dataset.rank = String(rankIndex + 1);
    r.row.dataset.classLabel = label;
    r.row.dataset.probability = String(p);
    r.row.style.setProperty('--pred-class-color', color);
    r.fill.style.backgroundColor = color;
    // Width is visual only; the exact value remains available in the data
    // contract and the snapshot. Do not smooth successive model outputs.
    r.fill.style.width = Math.max(0, Math.min(100, p * 100)) + '%';
    r.fill.classList.toggle('below', p < thresholdValue);
  });
  return ranking;
}

function appendPredictionHistory(snapshot) {
  if (!snapshot || !snapshot.probabilities.length || snapshot.maxIdx < 0) return;
  const previous = predHistory[predHistory.length - 1];
  const frame = ++predFrameSeq;
  predHistory.push({
    idx: snapshot.maxIdx,
    conf: snapshot.confidence,
    label: snapshot.labels[snapshot.maxIdx],
    color: snapshot.colors[snapshot.maxIdx],
    frame,
    at: snapshot.timestamp,
    changed: !previous || previous.idx !== snapshot.maxIdx
  });
  if (predHistory.length > PREDICTION_HISTORY_LIMIT) predHistory.shift();
}

function renderPredictionSnapshot(id, payload, options) {
  const opts = options || {};
  const input = payload && typeof payload === 'object' ? payload : {};
  const snapshot = normalizePredictionPayload(input);
  const recordHistory = opts.recordHistory !== false && input.recordHistory !== false;
  if (recordHistory) appendPredictionHistory(snapshot);
  predSnapshots.set(String(id), snapshot);

  const block = predictionBlockRecord(id);
  let ui = null;
  if (snapshot.probabilities.length) {
    ui = ensurePredictBarsDOM(block, snapshot.probabilities.length, snapshot.threshold, snapshot.labels, snapshot.colors);
  } else {
    // An explicit waiting/empty render must not leave a previous ranked list
    // looking current.  Drop the old cache as well as its rows; a later frame
    // will build a fresh marker/list for the new output size.
    const barsEl = document.getElementById('pred-bars-' + id);
    if (barsEl) barsEl.replaceChildren();
    if (block && block.id) _predUI.delete(block);
  }
  if (ui) updatePredictBars(ui, snapshot.probabilities, snapshot.threshold, snapshot.labels, snapshot.colors);
  updatePredictionStatus(String(id), snapshot);
  updatePredictionWinner(String(id), snapshot);
  setPredictionRootState(String(id), snapshot, predHistory.length);
  updatePredictionControls(String(id));
  drawHistChart(String(id), snapshot.threshold);
  return snapshot;
}

function renderPredictionState(id, mode, threshold) {
  const key = String(id);
  const previous = predSnapshots.get(key);
  const next = previous
    ? { ...previous, mode, threshold: predictionThreshold(key, threshold == null ? previous.threshold : threshold), recordHistory: false }
    : {
      probabilities: [], labels: inferLabels(), colors: inferLabels().map((_, i) => inferColor(i)),
      threshold: predictionThreshold(key, threshold == null ? 0.7 : threshold), mode, recordHistory: false
    };
  return renderPredictionSnapshot(key, next, { recordHistory: false });
}

function updatePredictionControls(id) {
  const btn = document.getElementById('freeze-btn-' + id);
  if (btn) {
    btn.setAttribute('aria-pressed', frozenFrame ? 'true' : 'false');
    btn.textContent = t(frozenFrame ? 'btn_unfreeze_frame' : 'btn_freeze_frame');
  }
  const caveat = document.getElementById('pred-caveat-' + id);
  if (caveat) caveat.textContent = predictionText('confidenceCaveat');
  const title = document.querySelector('#pred-history-' + id + ' .pred-history-title');
  if (title) title.textContent = predictionText('history');
  const empty = document.getElementById('pred-history-empty-' + id);
  if (empty && !predHistory.length) empty.textContent = predictionText('historyEmpty');
}

function refreshPredictionBlock(id) {
  const key = String(id);
  const previous = predSnapshots.get(key);
  const threshold = predictionThreshold(key, previous ? previous.threshold : 0.7);
  if (previous) renderPredictionSnapshot(key, { ...previous, threshold, recordHistory: false }, { recordHistory: false });
  else renderPredictionState(key, 'waiting', threshold);
}

function predictionProbe(id) {
  const key = String(id);
  const root = predictionRoot(key);
  const snapshot = predSnapshots.get(key);
  const rootThreshold = root ? root.dataset.predictionThreshold : null;
  const rootTopIndex = root ? root.dataset.predictionTopIndex : null;
  const rootTopScore = root ? root.dataset.predictionTopScore : null;
  const threshold = finitePredictionNumber(rootThreshold == null || rootThreshold === '' ? snapshot?.threshold : rootThreshold, 0.7);
  const topIndex = rootTopIndex == null || rootTopIndex === ''
    ? (snapshot?.maxIdx ?? null) : finitePredictionNumber(rootTopIndex, null);
  const topScore = rootTopScore == null || rootTopScore === ''
    ? (snapshot?.confidence ?? null) : finitePredictionNumber(rootTopScore, null);
  const rows = root ? Array.from(root.querySelectorAll('#pred-bars-' + key + ' .pred-row')).map(row => ({
    classIndex: Number(row.dataset.classIndex),
    rank: Number(row.dataset.rank),
    label: row.dataset.classLabel || row.querySelector('.pred-label-name')?.textContent || '',
    probability: Number(row.dataset.probability || 0)
  })) : [];
  return {
    id: key,
    state: root?.dataset.predictionState || snapshot?.state || 'waiting',
    mode: root?.dataset.predictionMode || snapshot?.mode || 'waiting',
    threshold,
    topIndex,
    topScore,
    historyLength: Number(root?.dataset.predictionHistoryLength || predHistory.length),
    renderCount: Number(root?.dataset.predictionRenderCount || 0),
    probabilities: snapshot ? snapshot.probabilities.slice() : [],
    bars: rows
  };
}

// Public, model-free entry point for deterministic UI fixtures and shell hooks.
// Real camera inference calls this exact render path below.
window.PREDICTION_UI = {
  render(id, payload) { return renderPredictionSnapshot(String(id), payload || {}, {}); },
  refreshAll() {
    const ids = new Set();
    if (Array.isArray(placedBlocks)) placedBlocks.forEach(block => { if (block.type === 'show-results') ids.add(block.id); });
    document.querySelectorAll('.pred-ui[id^="pred-ui-"]').forEach(root => ids.add(root.id.slice('pred-ui-'.length)));
    ids.forEach(refreshPredictionBlock);
    return Array.from(ids, predictionProbe);
  },
  probe: predictionProbe
};

// In-flight guard: setInterval keeps firing while a slow tick is still
// awaiting the GPU; without this, ticks pile up and the UI stutters.
let inferBusy = false;
async function runInference(camId) {
  if (!inferModel) return;
  if (frozenFrame) return;
  if (inferBusy) return;
  const vid = inferVideoEl;
  if (!vid || !vid.srcObject) return;
  if (!baseModel) return; // user is between block placements; silent
  inferBusy = true;

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

    const predictBlock = blocksByType['show-results'];
    const maxIdx = argmax(predictions);
    const confidence = predictions[maxIdx];
    if (predictBlock) {
      const thresh = predictionThreshold(predictBlock.id, 0.7);
      PREDICTION_UI.render(predictBlock.id, {
        probabilities: Array.from(predictions),
        labels: inferLabels().slice(0, predictions.length),
        colors: Array.from({ length: predictions.length }, (_, i) => inferColor(i)),
        threshold: thresh,
        mode: 'live',
        timestamp: Date.now()
      });
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
    inferBusy = false;
  }
}

// ===== XAI / HEATMAP GENERATOR =====
// Method: occlusion sensitivity. For every patch in a grid, replace the patch
// pixels with a BLURRED version of the same patch (not solid grey – grey
// introduces synthetic edges the model never saw during training). Compare
// the predicted class probability to the baseline; the drop is positive
// evidence ("this region supports the answer"), the rise is negative evidence
// ("this region was a distractor"). Visualised on a diverging red/blue map.

// XAI is intentionally stateful outside the block DOM. The controller rebuilds
// block bodies when the language changes; keeping the captured pixels and real
// model outputs here lets the new DOM render the completed snapshot again.
const XAI_DEFAULT_OPACITY = 0.74;
const XAI_DEFAULT_VIEW = 'heatmap';
const xaiStates = Object.create(null);
let xaiCancelled = false;
let xaiRunning = false;
let xaiActiveId = null;
let xaiFrameCounter = 0;

// Keep XAI copy separate from the main STRINGS table. These messages describe
// the measurement and its limitations, rather than claiming a causal reason.
const XAI_UI_TEXT = {
  pl: {
    wait: 'Uruchom analizę, aby zobaczyć mapę dla pojedynczej klatki.',
    viewLabel: 'Widok obrazu', viewOriginal: 'Oryginał', viewHeatmap: 'Mapa XAI',
    opacityLabel: 'Krycie mapy', snapshotLabel: 'Analizowana klatka',
    predictedLabel: 'Przewidywana klasa', snapshotEmpty: 'Brak zapisanej klatki',
    predictionEmpty: 'Brak predykcji', frameLabel: 'klatka', timestampLabel: 'czas',
    analyzing: 'Analizuję nową klatkę…', missingModel: 'Najpierw załaduj lub wytrenuj model.',
    missingBase: 'Brak modelu bazowego. Załaduj blok „Model bazowy”.',
    missingCamera: 'Uruchom blok „Kamera: Predykcja”, aby pobrać klatkę.',
    missingCanvas: 'Nie można przygotować płótna analizy.', cancelled: 'Analiza przerwana – poprzednia mapa została wyczyszczona.',
    errorPrefix: 'Analiza XAI nie powiodła się: ',
    legendOcclusionLow: 'wzrost wyniku klasy', legendOcclusionHigh: 'spadek wyniku klasy',
    legendSaliencyLow: 'niska |gradientu|', legendSaliencyHigh: 'wysoka |gradientu|',
    occlusionHowto: 'Okluzja zastępuje każdy fragment rozmytym obrazem. Czerwony oznacza spadek wyniku wybranej klasy po tej zmianie, niebieski – wzrost. To test kontrfaktyczny, a nie dowód przyczynowości.',
    saliencyHowto: 'Saliency pokazuje bezwzględną wartość gradientu wyniku wybranej klasy względem pikseli. Jasne miejsca oznaczają większą lokalną wrażliwość; gradient nie ma tu znaku i nie jest dowodem uwagi ani przyczynowości.',
    fallbackHowto: 'Saliency nie zadziałało dla tego modelu, więc pokazano okluzję. Mapa i liczby dotyczą okluzji.',
    baseline: 'przed zmianą', occluded: 'po okluzji', delta: 'różnica',
    patchLabel: 'Podświetlony fragment', saliencyDetail: (label) => `Jasne piksele mają największą wartość bezwzględną gradientu dla wyniku klasy „${label}”. To lokalna miara wrażliwości, nie dowód przyczynowości.`,
    occlusionDetail: (label) => `Dla klasy „${label}” pokazano wyniki modelu przed i po zastąpieniu podświetlonego fragmentu rozmyciem. Różnica opisuje reakcję na tę zmianę, nie przyczynę decyzji.`,
    fallbackShort: 'Saliency niedostępne – użyto okluzji.',
    noScores: 'Brak wyników dla tego fragmentu.'
  },
  en: {
    wait: 'Run an analysis to see a map for one captured frame.',
    viewLabel: 'Image view', viewOriginal: 'Original', viewHeatmap: 'XAI map',
    opacityLabel: 'Map opacity', snapshotLabel: 'Analyzed frame',
    predictedLabel: 'Predicted class', snapshotEmpty: 'No captured frame',
    predictionEmpty: 'No prediction', frameLabel: 'frame', timestampLabel: 'time',
    analyzing: 'Analyzing a new frame…', missingModel: 'Load or train a model first.',
    missingBase: 'Base model is missing. Load the “Pretrained Model” block.',
    missingCamera: 'Start the “Camera: Prediction” block to capture a frame.',
    missingCanvas: 'The analysis canvas could not be prepared.', cancelled: 'Analysis cancelled – the previous map was cleared.',
    errorPrefix: 'XAI analysis failed: ',
    legendOcclusionLow: 'class score rises', legendOcclusionHigh: 'class score drops',
    legendSaliencyLow: 'low |gradient|', legendSaliencyHigh: 'high |gradient|',
    occlusionHowto: 'Occlusion replaces each patch with a blurred image. Red means the selected class score drops after that change; blue means it rises. This is a counterfactual test, not proof of causality.',
    saliencyHowto: 'Saliency shows the absolute gradient magnitude of the selected class score with respect to pixels. Brighter areas mean higher local sensitivity; the gradient is unsigned here and is not proof of attention or causality.',
    fallbackHowto: 'Saliency was unavailable for this model, so occlusion is shown instead. The map and numbers are from occlusion.',
    baseline: 'before change', occluded: 'after occlusion', delta: 'change',
    patchLabel: 'Highlighted patch', saliencyDetail: (label) => `Bright pixels have the largest absolute gradient magnitude for the “${label}” score. This is a local sensitivity measure, not proof of causality.`,
    occlusionDetail: (label) => `For “${label}”, the table shows the model output before and after blurring the highlighted patch. The change describes the response to that perturbation, not a cause of the decision.`,
    fallbackShort: 'Saliency unavailable – occlusion used.',
    noScores: 'No scores were returned for this patch.'
  }
};

function xaiText(key, ...args) {
  const dict = XAI_UI_TEXT[lang] || XAI_UI_TEXT.en;
  const fallback = XAI_UI_TEXT.en[key];
  const value = dict[key] == null ? fallback : dict[key];
  return typeof value === 'function' ? value(...args) : (value == null ? key : value);
}

function makeXAIState(id) {
  return {
    id, status: 'idle', error: '', message: '', progress: 0,
    view: XAI_DEFAULT_VIEW, opacity: XAI_DEFAULT_OPACITY,
    requestedMethod: 'occlusion', method: 'occlusion', patchSize: 32,
    fallback: false, fallbackFrom: null, hasResult: false,
    frameNumber: 0, capturedAt: 0, frameImageData: null,
    labels: [], baseClass: null, baseConf: null, basePreds: null,
    heatmap: null, gridW: 0, gridH: 0, stride: 0,
    saliency: null, saliencySize: 0, bestX: 0, bestY: 0,
    bestPatch: 0, bestDrop: 0, bestMagnitude: 0,
    counterClass: null, counterPreds: null, detailMessage: ''
  };
}

function getXAIState(id) {
  const key = String(id || '');
  if (!xaiStates[key]) xaiStates[key] = makeXAIState(key);
  return xaiStates[key];
}

function xaiFiniteNumber(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function xaiNormalizeMethod(value) {
  return value === 'saliency' ? 'saliency' : 'occlusion';
}

function xaiNormalizePatch(value) {
  const n = parseInt(value, 10);
  return n === 16 || n === 56 ? n : 32;
}

function xaiFormatPercent(value) {
  return Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(1)}%` : '–';
}

function xaiFormatPP(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '–';
  const sign = n > 0.0005 ? '+' : n < -0.0005 ? '−' : '±';
  return `${sign}${Math.abs(n * 100).toFixed(1)} pp`;
}

function xaiFormatTimestamp(timestamp) {
  if (!timestamp) return xaiText('snapshotEmpty');
  try {
    return new Date(timestamp).toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-GB', {
      dateStyle: 'short', timeStyle: 'medium'
    });
  } catch (_) {
    return new Date(timestamp).toISOString();
  }
}

function xaiDisposeTensorLike(value) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach(xaiDisposeTensorLike);
    return;
  }
  if (typeof value.dispose === 'function') {
    try { value.dispose(); } catch (_) {}
  }
}

function xaiFirstTensor(value) {
  return Array.isArray(value) ? value[0] : value;
}

function syncXAIControls(id) {
  const state = getXAIState(id);
  const methodEl = document.getElementById('xai-method-' + id);
  const patchEl = document.getElementById('xai-patch-' + id);
  const opacityEl = document.getElementById('xai-opacity-' + id);
  if (methodEl) state.requestedMethod = xaiNormalizeMethod(methodEl.value);
  if (patchEl) state.patchSize = xaiNormalizePatch(patchEl.value);
  if (opacityEl) state.opacity = Math.max(0, Math.min(1, parseFloat(opacityEl.value) / 100));
  return state;
}

function clearXAICanvas(id) {
  const canvas = document.getElementById('xai-vid-' + id);
  const overlay = document.getElementById('xai-overlay-' + id);
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  if (overlay) {
    const ctx = overlay.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
  }
}

function xaiSetDataContract(id, state) {
  const wrap = document.getElementById('xai-wrap-' + id);
  if (!wrap) return;
  const labels = state.labels && state.labels.length ? state.labels : inferLabels();
  const baseLabel = state.baseClass == null ? '' : (labels[state.baseClass] || `class_${state.baseClass}`);
  const attrs = {
    xaiStatus: state.status,
    xaiView: state.view,
    xaiMethod: state.hasResult ? state.method : state.requestedMethod,
    xaiRequestedMethod: state.requestedMethod,
    xaiHasResult: state.hasResult ? 'true' : 'false',
    xaiFrame: state.frameNumber ? String(state.frameNumber) : '',
    xaiTimestamp: state.capturedAt ? String(state.capturedAt) : '',
    xaiBaseClass: state.baseClass == null ? '' : String(state.baseClass),
    xaiBaseConfidence: Number.isFinite(state.baseConf) ? String(state.baseConf) : '',
    xaiOverlayOpacity: String(Math.round(state.opacity * 100)),
    xaiFallback: state.fallback ? 'true' : 'false',
    xaiFallbackFrom: state.fallbackFrom || '',
    xaiPredictedLabel: baseLabel
  };
  Object.keys(attrs).forEach(key => { wrap.dataset[key] = attrs[key]; });
  const snapshot = document.getElementById('xai-snapshot-' + id);
  if (snapshot) snapshot.dataset.xaiSnapshot = state.capturedAt ? 'ready' : 'empty';
  const result = document.getElementById('xai-result-' + id);
  if (result) {
    result.dataset.xaiResult = state.hasResult ? 'ready' : state.status;
    result.dataset.xaiStatus = state.status;
  }
}

function renderXAIHeadline(resultEl, baseClass, baseConf, labels) {
  if (!resultEl) return;
  const names = labels && labels.length ? labels : inferLabels();
  const lbl = names[baseClass] || `class_${baseClass}`;
  resultEl.textContent = `${xaiText('predictedLabel')}: ${lbl} (${xaiFormatPercent(baseConf)})`;
  resultEl.style.color = inferColor(baseClass);
  resultEl.style.borderLeft = `4px solid ${inferColor(baseClass)}`;
  resultEl.style.fontStyle = '';
}

function setXAIView(id, view) {
  const state = getXAIState(id);
  state.view = view === 'original' ? 'original' : 'heatmap';
  renderXAIState(id);
  return state.view;
}

function setXAIOverlayOpacity(id, value) {
  const state = getXAIState(id);
  const raw = typeof value === 'string' ? parseFloat(value) / 100 : Number(value);
  state.opacity = Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : XAI_DEFAULT_OPACITY));
  renderXAIState(id);
  return state.opacity;
}

function xaiMethodChanged(id, value) {
  const state = getXAIState(id);
  state.requestedMethod = xaiNormalizeMethod(value);
  if (!state.hasResult && !xaiRunning) state.method = state.requestedMethod;
  renderXAIState(id);
}

function xaiPatchChanged(id, value) {
  const state = getXAIState(id);
  state.patchSize = xaiNormalizePatch(value);
  renderXAIState(id);
}

function renderXAISnapshot(id, state) {
  const meta = document.getElementById('xai-snapshot-meta-' + id);
  const prediction = document.getElementById('xai-predicted-' + id);
  const labels = state.labels && state.labels.length ? state.labels : inferLabels();
  if (meta) {
    meta.textContent = state.capturedAt
      ? `${xaiText('frameLabel')} #${state.frameNumber} · ${xaiText('timestampLabel')} ${xaiFormatTimestamp(state.capturedAt)}`
      : xaiText('snapshotEmpty');
  }
  if (prediction) {
    prediction.textContent = state.baseClass == null
      ? xaiText('predictionEmpty')
      : `${labels[state.baseClass] || `class_${state.baseClass}`} · ${xaiFormatPercent(state.baseConf)}`;
  }
}

function renderXAILegend(id, state) {
  const legend = document.getElementById('xai-legend-' + id);
  const howto = document.getElementById('xai-howto-' + id);
  if (!legend || !howto) return;
  const method = state.hasResult ? state.method : state.requestedMethod;
  legend.dataset.xaiLegendKind = method;
  if (method === 'saliency') {
    legend.innerHTML = `<span class="xai-legend-label">${xaiText('legendSaliencyLow')}</span><div class="xai-legend-bar xai-legend-bar--saliency"></div><span class="xai-legend-label">${xaiText('legendSaliencyHigh')}</span>`;
    howto.textContent = xaiText('saliencyHowto');
  } else {
    legend.innerHTML = `<span class="xai-legend-label">${xaiText('legendOcclusionLow')}</span><div class="xai-legend-bar xai-legend-bar--occlusion"></div><span class="xai-legend-label">${xaiText('legendOcclusionHigh')}</span>`;
    howto.textContent = state.fallback ? `${xaiText('fallbackHowto')} ${xaiText('occlusionHowto')}` : xaiText('occlusionHowto');
  }
  if (state.fallback) howto.dataset.xaiFallback = 'true';
  else delete howto.dataset.xaiFallback;
}

function renderXAIClasses(id, state) {
  const classesEl = document.getElementById('xai-classes-' + id);
  if (!classesEl) return;
  classesEl.replaceChildren();
  if (!state.hasResult || state.method !== 'occlusion' || !state.basePreds || !state.counterPreds) return;
  if (state.basePreds.length !== state.counterPreds.length) {
    const empty = document.createElement('div');
    empty.className = 'xai-class-empty';
    empty.textContent = xaiText('noScores');
    classesEl.appendChild(empty);
    return;
  }
  const labels = state.labels && state.labels.length ? state.labels : inferLabels();
  const header = document.createElement('div');
  header.className = 'xai-class-head';
  header.innerHTML = `<span>${xaiText('patchLabel')}</span><span>${xaiText('baseline')}</span><span>${xaiText('occluded')}</span><span>${xaiText('delta')}</span>`;
  classesEl.appendChild(header);
  state.basePreds.forEach((baseValue, i) => {
    const afterValue = state.counterPreds[i];
    const delta = afterValue - baseValue;
    const row = document.createElement('div');
    row.className = 'xai-class-row';
    row.dataset.xaiClass = String(i);
    row.dataset.xaiBefore = String(baseValue);
    row.dataset.xaiAfter = String(afterValue);
    row.dataset.xaiDeltaPp = String(delta * 100);

    const dot = document.createElement('span');
    dot.className = 'xai-class-dot';
    dot.style.background = inferColor(i);
    const name = document.createElement('span');
    name.className = 'xai-class-name';
    name.title = labels[i] || `class_${i}`;
    name.textContent = labels[i] || `class_${i}`;
    const values = document.createElement('span');
    values.className = 'xai-class-values';
    const before = document.createElement('span');
    before.className = 'xai-class-before';
    before.textContent = `${xaiText('baseline')}: ${xaiFormatPercent(baseValue)}`;
    const after = document.createElement('span');
    after.className = 'xai-class-after';
    after.textContent = `${xaiText('occluded')}: ${xaiFormatPercent(afterValue)}`;
    values.append(before, after);
    const deltaEl = document.createElement('span');
    deltaEl.className = 'xai-class-delta';
    deltaEl.textContent = xaiFormatPP(delta);
    deltaEl.style.color = delta > 0.0005 ? 'var(--c-ok)' : delta < -0.0005 ? 'var(--c-train)' : 'var(--c-muted-2)';
    row.append(dot, name, values, deltaEl);
    classesEl.appendChild(row);
  });
}

function renderXAIDetail(id, state) {
  const detailEl = document.getElementById('xai-detail-' + id);
  const detailText = document.getElementById('xai-detail-text-' + id);
  const thumbCv = document.getElementById('xai-thumb-' + id);
  const frameCv = document.getElementById('xai-vid-' + id);
  const showDetail = !!(state.hasResult && state.detailMessage);
  if (detailEl) detailEl.hidden = !showDetail;
  if (detailText) detailText.textContent = showDetail
    ? xaiText(state.method === 'saliency' ? 'saliencyDetail' : 'occlusionDetail', state.labels[state.baseClass] || `class_${state.baseClass}`) : '';
  if (thumbCv && showDetail && frameCv && state.bestPatch > 0) {
    const halfPatch = state.bestPatch;
    const sx = Math.max(0, Math.min(frameCv.width - halfPatch, state.bestX));
    const sy = Math.max(0, Math.min(frameCv.height - halfPatch, state.bestY));
    thumbCv.width = 64;
    thumbCv.height = 64;
    const tctx = thumbCv.getContext('2d');
    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, 64, 64);
    tctx.drawImage(frameCv, sx, sy, halfPatch, halfPatch, 0, 0, 64, 64);
  }
  renderXAIClasses(id, state);
}

function renderXAISaliencyOverlay(overlay, values, inputSize, scaleX, scaleY) {
  const off = document.createElement('canvas');
  off.width = inputSize;
  off.height = inputSize;
  const offCtx = off.getContext('2d');
  const imgData = offCtx.createImageData(inputSize, inputSize);
  const [heatR, heatG, heatB] = cssRgbChannels('--rgb-xai-heat-pos');
  let max = 1e-9;
  for (let i = 0; i < values.length; i++) if (values[i] > max) max = values[i];
  for (let i = 0; i < values.length; i++) {
    const v = Math.min(1, values[i] / max);
    if (v < 0.04) continue;
    const alpha = Math.pow(v, 0.35);
    imgData.data[i * 4] = heatR;
    imgData.data[i * 4 + 1] = heatG;
    imgData.data[i * 4 + 2] = heatB;
    imgData.data[i * 4 + 3] = Math.round(alpha * 255);
  }
  offCtx.putImageData(imgData, 0, 0);
  const octx = overlay.getContext('2d');
  octx.clearRect(0, 0, overlay.width, overlay.height);
  octx.fillStyle = cssRgba('--rgb-shade', 0.45);
  octx.fillRect(0, 0, overlay.width, overlay.height);
  octx.imageSmoothingEnabled = true;
  octx.filter = `blur(${Math.max(1, Math.round(8 * scaleX))}px)`;
  octx.drawImage(off, 0, 0, overlay.width, overlay.height);
  octx.filter = 'none';
}

function renderXAIState(id) {
  const state = getXAIState(id);
  const wrap = document.getElementById('xai-wrap-' + id);
  const canvas = document.getElementById('xai-vid-' + id);
  const overlay = document.getElementById('xai-overlay-' + id);
  const methodEl = document.getElementById('xai-method-' + id);
  const patchEl = document.getElementById('xai-patch-' + id);
  const opacityEl = document.getElementById('xai-opacity-' + id);
  const opacityValue = document.getElementById('xai-opacity-value-' + id);
  const resultEl = document.getElementById('xai-result-' + id);
  const progEl = document.getElementById('xai-prog-' + id);
  if (!wrap) return xaiProbe(id);
  if (methodEl) methodEl.value = state.requestedMethod;
  if (patchEl) patchEl.value = String(state.patchSize);
  if (opacityEl) opacityEl.value = String(Math.round(state.opacity * 100));
  if (opacityValue) opacityValue.textContent = `${Math.round(state.opacity * 100)}%`;

  const inputSize = state.frameImageData ? state.frameImageData.width : 224;
  if (canvas && state.frameImageData) {
    if (canvas.width !== inputSize || canvas.height !== state.frameImageData.height) {
      canvas.width = inputSize;
      canvas.height = state.frameImageData.height;
    }
    canvas.getContext('2d').putImageData(state.frameImageData, 0, 0);
  } else if (canvas) {
    const frameCtx = canvas.getContext('2d');
    frameCtx.clearRect(0, 0, canvas.width, canvas.height);
  }
  if (overlay) {
    const displayW = wrap.clientWidth || inputSize;
    const displayH = wrap.clientHeight || inputSize;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(displayW * dpr));
    const height = Math.max(1, Math.round(displayH * dpr));
    if (overlay.width !== width || overlay.height !== height) {
      overlay.width = width;
      overlay.height = height;
    }
    const scaleX = overlay.width / inputSize;
    const scaleY = overlay.height / inputSize;
    const octx = overlay.getContext('2d');
    octx.clearRect(0, 0, overlay.width, overlay.height);
    if (state.hasResult && state.method === 'saliency' && state.saliency) {
      renderXAISaliencyOverlay(overlay, state.saliency, state.saliencySize || inputSize, scaleX, scaleY);
    } else if (state.heatmap && state.gridW && state.gridH) {
      renderXAIHeatmap(overlay, state.heatmap, state.gridW, state.gridH, state.stride || state.patchSize, scaleX, scaleY);
      if (state.bestDrop > 0.001) drawXAIFocusBox(overlay, state.bestX, state.bestY, state.bestPatch || state.patchSize, scaleX, scaleY);
    }
    overlay.style.opacity = String(state.opacity);
    overlay.style.display = state.view === 'heatmap' ? 'block' : 'none';
  }
  const originalBtn = document.getElementById('xai-view-original-' + id);
  const heatmapBtn = document.getElementById('xai-view-heatmap-' + id);
  [originalBtn, heatmapBtn].forEach(btn => {
    if (!btn) return;
    const selected = btn === originalBtn ? state.view === 'original' : state.view === 'heatmap';
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    btn.classList.toggle('is-selected', selected);
  });
  if (resultEl) {
    if (state.status === 'running' || state.status === 'cancelling') {
      resultEl.textContent = state.status === 'cancelling' ? t('log_xai_stopping') : xaiText('analyzing');
      resultEl.style.color = 'var(--c-eval)';
      resultEl.style.borderLeft = '';
      resultEl.style.fontStyle = '';
    } else if (state.status === 'error') {
      resultEl.textContent = state.errorKey ? xaiText(state.errorKey)
        : xaiText('errorPrefix') + (state.errorDetail || '');
      resultEl.style.color = 'var(--c-danger)';
      resultEl.style.borderLeft = '4px solid var(--c-danger)';
      resultEl.style.fontStyle = '';
    } else if (state.status === 'cancelled') {
      resultEl.textContent = xaiText('cancelled');
      resultEl.style.color = 'var(--c-muted)';
      resultEl.style.borderLeft = '';
      resultEl.style.fontStyle = '';
    } else if (state.hasResult) {
      renderXAIHeadline(resultEl, state.baseClass, state.baseConf, state.labels);
    } else {
      resultEl.textContent = state.message || xaiText('wait');
      resultEl.style.color = 'var(--c-muted)';
      resultEl.style.borderLeft = '';
      resultEl.style.fontStyle = 'italic';
    }
  }
  if (progEl) {
    progEl.hidden = state.status !== 'running' && state.status !== 'cancelling';
    progEl.value = Math.max(0, Math.min(100, state.progress || 0));
  }
  renderXAISnapshot(id, state);
  renderXAILegend(id, state);
  renderXAIDetail(id, state);
  xaiSetDataContract(id, state);
  return xaiProbe(id);
}

function xaiProbe(id) {
  const key = String(id || '');
  const state = getXAIState(key);
  const wrap = document.getElementById('xai-wrap-' + key);
  const method = state.hasResult ? state.method : state.requestedMethod;
  return {
    ok: !!wrap,
    id: key,
    status: state.status,
    view: state.view,
    method,
    requestedMethod: state.requestedMethod,
    hasResult: !!state.hasResult,
    frame: state.frameNumber || null,
    timestamp: state.capturedAt || null,
    baseClass: state.baseClass,
    baseConfidence: Number.isFinite(state.baseConf) ? state.baseConf : null,
    bestDrop: Number.isFinite(state.bestDrop) ? state.bestDrop : null,
    bestMagnitude: Number.isFinite(state.bestMagnitude) ? state.bestMagnitude : null,
    fallback: !!state.fallback,
    fallbackFrom: state.fallbackFrom,
    overlayOpacity: state.opacity,
    controls: {
      original: !!document.getElementById('xai-view-original-' + key),
      heatmap: !!document.getElementById('xai-view-heatmap-' + key),
      opacity: !!document.getElementById('xai-opacity-' + key),
      method: !!document.getElementById('xai-method-' + key),
      patch: !!document.getElementById('xai-patch-' + key)
    },
    dataContract: wrap ? {
      status: wrap.dataset.xaiStatus || '', view: wrap.dataset.xaiView || '',
      method: wrap.dataset.xaiMethod || '', hasResult: wrap.dataset.xaiHasResult === 'true'
    } : null
  };
}

function publishXAIState(id, patch) {
  if (id && typeof id === 'object') {
    patch = id;
    id = patch.id;
  }
  const state = getXAIState(id);
  if (patch && typeof patch === 'object') {
    Object.keys(patch).forEach(key => {
      if (key !== 'id' && patch[key] !== undefined) state[key] = patch[key];
    });
  }
  state.opacity = Math.max(0, Math.min(1, xaiFiniteNumber(state.opacity, XAI_DEFAULT_OPACITY)));
  state.requestedMethod = xaiNormalizeMethod(state.requestedMethod);
  state.method = xaiNormalizeMethod(state.method);
  state.patchSize = xaiNormalizePatch(state.patchSize);
  renderXAIState(state.id);
  return xaiProbe(state.id);
}

window.XAI_UI = {
  publish: publishXAIState,
  render: renderXAIState,
  probe: xaiProbe,
  refreshAll() {
    const ids = new Set(Object.keys(xaiStates));
    document.querySelectorAll('[id^="xai-wrap-"]').forEach(el => ids.add(el.id.slice('xai-wrap-'.length)));
    ids.forEach(id => renderXAIState(id));
    return Array.from(ids).map(xaiProbe);
  },
  clear(id) {
    const state = getXAIState(id);
    const controls = { view: state.view, opacity: state.opacity, requestedMethod: state.requestedMethod, patchSize: state.patchSize };
    Object.assign(state, makeXAIState(id), controls);
    renderXAIState(id);
    return xaiProbe(id);
  },
  drop(id) {
    delete xaiStates[String(id || '')];
  }
};

function stopXAI(id) {
  if (!xaiRunning || (id && xaiActiveId && id !== xaiActiveId)) return;
  xaiCancelled = true;
  const state = getXAIState(id || xaiActiveId);
  state.status = 'cancelling';
  state.message = '';
  renderXAIState(state.id);
  log('warn', t('log_xai_stopping'));
}

function xaiBeginRun(id) {
  const state = syncXAIControls(id);
  state.status = 'running';
  state.error = '';
  state.message = '';
  state.progress = 0;
  state.hasResult = false;
  state.fallback = false;
  state.fallbackFrom = null;
  state.frameNumber = 0;
  state.capturedAt = 0;
  state.frameImageData = null;
  state.baseClass = null;
  state.baseConf = null;
  state.basePreds = null;
  state.labels = [];
  state.heatmap = null;
  state.gridW = 0;
  state.gridH = 0;
  state.stride = 0;
  state.saliency = null;
  state.saliencySize = 0;
  state.bestX = 0;
  state.bestY = 0;
  state.bestPatch = 0;
  state.bestDrop = 0;
  state.bestMagnitude = 0;
  state.counterClass = null;
  state.counterPreds = null;
  state.detailMessage = '';
  renderXAIState(id);
  return state;
}

function xaiGuardFailure(id, messageKey, logType, logMessage) {
  const state = getXAIState(id);
  state.status = 'error';
  state.errorKey = messageKey;
  state.error = xaiText(messageKey);
  state.message = '';
  state.hasResult = false;
  renderXAIState(id);
  if (logMessage) log(logType || 'warn', logMessage);
}

function clearXAIOutput(state) {
  state.hasResult = false;
  state.frameImageData = null;
  state.capturedAt = 0;
  state.frameNumber = 0;
  state.baseClass = null;
  state.baseConf = null;
  state.basePreds = null;
  state.labels = [];
  state.heatmap = null;
  state.gridW = 0;
  state.gridH = 0;
  state.stride = 0;
  state.saliency = null;
  state.saliencySize = 0;
  state.bestX = 0;
  state.bestY = 0;
  state.bestPatch = 0;
  state.bestDrop = 0;
  state.bestMagnitude = 0;
  state.counterClass = null;
  state.counterPreds = null;
  state.detailMessage = '';
}

async function runXAI(id) {
  if (xaiRunning) return; // single-flight
  const state = xaiBeginRun(id);
  if (!inferModel) {
    xaiGuardFailure(id, 'missingModel', 'warn', t('warn_xai_no_model'));
    return;
  }
  if (!baseModel) {
    xaiGuardFailure(id, 'missingBase', 'error', t('err_xai_no_base'));
    return;
  }

  const vid = inferVideoEl || document.querySelector('video[id^="vid-"]');
  if (!vid || !vid.srcObject) {
    xaiGuardFailure(id, 'missingCamera', 'warn', t('xai_start_camera'));
    return;
  }
  const canvas = document.getElementById('xai-vid-' + id);
  const overlay = document.getElementById('xai-overlay-' + id);
  if (!canvas || !overlay) {
    xaiGuardFailure(id, 'missingCanvas', 'error');
    return;
  }

  const progEl = document.getElementById('xai-prog-' + id);
  const inputSize = (inferMetadata && inferMetadata.inputSize) || 224;
  // Snapshot model references and labels once. If the user loads another model
  // while the sweep is in flight, this run still describes one model.
  const baseModelSnapshot = baseModel;
  const inferModelSnapshot = inferModel;
  const labels = inferLabels().slice();
  const block = document.getElementById(id);
  setBlockStatus(block, 'running');
  xaiRunning = true;
  xaiActiveId = id;
  xaiCancelled = false;
  // Pause the live inference loop for the sweep; restore the learner's prior
  // freeze state in finally.
  const prevFrozen = frozenFrame;
  frozenFrame = true;

  try {
    // ── 1. Capture frame using the same 0..1 preprocessing as inference ──
    canvas.width = inputSize;
    canvas.height = inputSize;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(vid, 0, 0, inputSize, inputSize);
    const frameImageData = ctx.getImageData(0, 0, inputSize, inputSize);
    state.frameImageData = frameImageData;
    state.frameNumber = ++xaiFrameCounter;
    state.capturedAt = Date.now();
    state.labels = labels;
    publishXAIState(id, { frameImageData, frameNumber: state.frameNumber, capturedAt: state.capturedAt, labels });

    // ── 1b. Blur once; each occlusion variant reuses this image ──
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
    const scaleX = overlay.width / inputSize;
    const scaleY = overlay.height / inputSize;

    // ── 3. Baseline prediction on the unmodified frame ──
    let baseClass, baseConf, basePreds;
    {
      const tInput = tf.tidy(() => tf.browser.fromPixels(frameImageData).toFloat().div(255).expandDims(0));
      let features = null;
      let predTensor = null;
      try {
        features = xaiFirstTensor(baseModelSnapshot.predict(tInput));
        predTensor = xaiFirstTensor(inferModelSnapshot.predict(features));
        basePreds = Array.from(await predTensor.data());
      } finally {
        xaiDisposeTensorLike(predTensor);
        xaiDisposeTensorLike(features);
        xaiDisposeTensorLike(tInput);
      }
      baseClass = argmax(basePreds);
      baseConf = basePreds[baseClass];
    }
    Object.assign(state, { baseClass, baseConf, basePreds, labels, method: state.requestedMethod });
    publishXAIState(id, { baseClass, baseConf, basePreds, labels, method: state.requestedMethod });

    // ── 3b. Method branch: saliency vs occlusion ──
    // Saliency uses unsigned |gradient|. Some imported GraphModels cannot
    // backpropagate; in that case the completed result says occlusion was used.
    if (state.requestedMethod === 'saliency') {
      const ok = await runXAISaliency({
        id, canvas, overlay, frameImageData, inputSize,
        scaleX, scaleY, baseClass, baseConf, basePreds,
        baseModelSnapshot, inferModelSnapshot, labels, state, progEl, block
      });
      if (ok) return;
      if (xaiCancelled) throw new Error('cancelled');
      state.fallback = true;
      state.fallbackFrom = 'saliency';
      state.method = 'occlusion';
      state.message = xaiText('fallbackShort');
      publishXAIState(id, { fallback: true, fallbackFrom: 'saliency', method: 'occlusion', message: state.message });
      log('warn', t('warn_saliency_fallback'));
    }

    const PATCH_SIZE = xaiNormalizePatch(state.patchSize);
    const STRIDE = PATCH_SIZE;
    const gridW = Math.ceil(inputSize / STRIDE);
    const gridH = Math.ceil(inputSize / STRIDE);
    // Signed score difference: positive = target score drops after occlusion;
    // negative = target score rises. This is a sensitivity measure.
    const heatmap = new Float32Array(gridW * gridH);
    const patchPreds = new Array(gridW * gridH);
    Object.assign(state, { method: 'occlusion', patchSize: PATCH_SIZE, heatmap, gridW, gridH, stride: STRIDE });
    publishXAIState(id, { method: 'occlusion', patchSize: PATCH_SIZE, heatmap, gridW, gridH, stride: STRIDE });

    await new Promise(r => setTimeout(r, 30));

    // ── 4. Occlusion loop, batched once per row ──
    for (let y = 0; y < gridH; y++) {
      if (xaiCancelled) throw new Error('cancelled');
      const rowImageDatas = [];
      for (let x = 0; x < gridW; x++) {
        const buf = new Uint8ClampedArray(frameImageData.data);
        for (let py = 0; py < PATCH_SIZE; py++) {
          for (let px = 0; px < PATCH_SIZE; px++) {
            const ix = x * STRIDE + px;
            const iy = y * STRIDE + py;
            if (ix < inputSize && iy < inputSize) {
              const i4 = (iy * inputSize + ix) * 4;
              buf[i4] = blurredData[i4];
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
      let featBatch = null;
      let predBatch = null;
      let predsArr;
      try {
        featBatch = xaiFirstTensor(baseModelSnapshot.predict(batchTensor));
        predBatch = xaiFirstTensor(inferModelSnapshot.predict(featBatch));
        predsArr = await predBatch.array();
      } finally {
        xaiDisposeTensorLike(predBatch);
        xaiDisposeTensorLike(featBatch);
        xaiDisposeTensorLike(batchTensor);
      }

      for (let x = 0; x < gridW; x++) {
        const idx = y * gridW + x;
        patchPreds[idx] = Array.from(predsArr[x]);
        heatmap[idx] = baseConf - predsArr[x][baseClass];
      }
      state.progress = Math.round(((y + 1) / gridH) * 100);
      renderXAIHeatmap(overlay, heatmap, gridW, gridH, STRIDE,
        overlay.width / inputSize, overlay.height / inputSize);
      overlay.style.opacity = String(state.opacity);
      publishXAIState(id, { progress: state.progress, heatmap });
      await new Promise(r => setTimeout(r, 0));
    }
    if (xaiCancelled) throw new Error('cancelled');

    const bestIdx = argmax(heatmap);
    const bestX = (bestIdx % gridW) * STRIDE;
    const bestY = Math.floor(bestIdx / gridW) * STRIDE;
    const bestDrop = heatmap[bestIdx];
    const counterPreds = patchPreds[bestIdx] || basePreds;
    const counterClass = argmax(counterPreds);
    Object.assign(state, {
      hasResult: true, status: 'done', progress: 100, method: 'occlusion',
      heatmap, gridW, gridH, stride: STRIDE, bestX, bestY,
      bestPatch: PATCH_SIZE, bestDrop, counterClass,
      counterPreds, detailMessage: xaiText('occlusionDetail', labels[baseClass] || `class_${baseClass}`), message: ''
    });
    publishXAIState(id, state);
    log('eval', `XAI: "${labels[baseClass]}" ${(baseConf * 100).toFixed(1)}% top patch delta=${(bestDrop * 100).toFixed(1)}pp${counterClass !== baseClass ? ' -> ' + labels[counterClass] : ''}`);
    setBlockStatus(block, 'done');
  } catch (err) {
    if (err && err.message === 'cancelled') {
      log('warn', t('log_xai_cancelled'));
      state.status = 'cancelled';
      state.error = '';
      state.message = xaiText('cancelled');
      clearXAIOutput(state);
      publishXAIState(id, state);
      setBlockStatus(block, 'idle');
    } else {
      log('error', t('err_xai') + (err && err.message ? err.message : String(err)));
      console.error(err);
      state.status = 'error';
      state.errorKey = '';
      state.errorDetail = err && err.message ? err.message : String(err);
      state.error = xaiText('errorPrefix') + (err && err.message ? err.message : String(err));
      state.message = '';
      clearXAIOutput(state);
      publishXAIState(id, state);
      setBlockStatus(block, 'error');
    }
  } finally {
    xaiRunning = false;
    xaiCancelled = false;
    xaiActiveId = null;
    frozenFrame = prevFrozen;
    if (progEl) progEl.hidden = true;
    if (state.status === 'running' || state.status === 'cancelling') {
      state.status = 'idle';
      publishXAIState(id, state);
    }
    if (!document.getElementById('xai-wrap-' + id)) {
      window.XAI_UI.drop(id);
      if (!placedBlocks.length) frozenFrame = false;
    }
  }
}
// Draw a bright outlined box around the patch with the largest measured target
// score change. It highlights the perturbation being compared, not a causal
// reason for the prediction.
function drawXAIFocusBox(overlay, px, py, patch, scaleX, scaleY) {
  const octx = overlay.getContext('2d');
  const x = px * scaleX, y = py * scaleY, w = patch * scaleX, h = patch * scaleY;
  octx.save();
  octx.lineWidth = Math.max(3, 3 * (window.devicePixelRatio || 1));
  octx.strokeStyle = cssToken('--c-highlight');
  octx.shadowColor = cssRgba('--rgb-shade', 0.6);
  octx.shadowBlur = 6;
  octx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  octx.restore();
}

// Diverging colormap renderer. Positive values mean the selected class score
// dropped after occlusion; negative values mean it rose. This is not a signed
// gradient and does not establish causality.
function renderXAIHeatmap(overlay, heatmap, gridW, gridH, STRIDE, scaleX, scaleY) {
  const octx = overlay.getContext('2d');
  octx.clearRect(0, 0, overlay.width, overlay.height);

  let maxAbs = 1e-6;
  for (let i = 0; i < heatmap.length; i++) {
    const a = Math.abs(heatmap[i]);
    if (a > maxAbs) maxAbs = a;
  }

  // Dark vignette behind the colours keeps both directions readable.
  octx.fillStyle = cssRgba('--rgb-shade', 0.45);
  octx.fillRect(0, 0, overlay.width, overlay.height);

  // Moderate blur smooths patch edges without washing out the signal.
  const blurPx = Math.round(STRIDE * scaleX * 0.22);
  octx.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const v = heatmap[y * gridW + x] / maxAbs;
      const mag = Math.abs(v);
      if (mag < 0.07) continue; // show more patches, suppress only near-zero
      // Alpha scales from 0.50 at the cutoff to 1.0 at full magnitude –
      // high-importance regions are fully opaque and unmissable.
      const alpha = 0.50 + mag * 0.50;
      octx.fillStyle = v > 0
        ? cssRgba('--rgb-xai-heat-pos', alpha.toFixed(3))
        : cssRgba('--rgb-xai-heat-neg', alpha.toFixed(3));
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

// Gradient-based saliency: unsigned |dy/dx| for the selected class score.
// This is a local sensitivity map, not a signed effect or causal explanation.
// Returns true if rendering succeeded; false tells the caller to use occlusion.
async function runXAISaliency(p) {
  const {
    canvas, overlay, frameImageData, inputSize, baseClass, baseConf, basePreds,
    baseModelSnapshot = baseModel, inferModelSnapshot = inferModel,
    labels = inferLabels(), state = getXAIState(p.id), progEl, block
  } = p;
  if (progEl) progEl.value = 30;
  let saliency2D = null;
  try {
    saliency2D = tf.tidy(() => {
      const inputT = tf.browser.fromPixels(frameImageData).toFloat().div(255).expandDims(0);
      const gradFn = tf.grad((inp) => {
        const features = xaiFirstTensor(baseModelSnapshot.predict(inp));
        const probs = xaiFirstTensor(inferModelSnapshot.predict(features));
        return probs.gather([baseClass], 1).sum();
      });
      const grads = gradFn(inputT);
      return grads.abs().max(-1).squeeze();
    });
    if (progEl) progEl.value = 70;
    const arr = await saliency2D.array();
    if (xaiCancelled) throw new Error('cancelled');
    saliency2D.dispose();
    saliency2D = null;

    const values = new Float32Array(inputSize * inputSize);
    let max = 1e-9;
    let argY = 0;
    let argX = 0;
    for (let y = 0; y < inputSize; y++) {
      for (let x = 0; x < inputSize; x++) {
        const value = Number(arr[y][x]) || 0;
        const index = y * inputSize + x;
        values[index] = value;
        if (value > max) { max = value; argY = y; argX = x; }
      }
    }
    const half = Math.min(32, Math.floor(inputSize / 2));
    const bestX = Math.max(0, Math.min(inputSize - half * 2, argX - half));
    const bestY = Math.max(0, Math.min(inputSize - half * 2, argY - half));
    Object.assign(state, {
      hasResult: true, status: 'done', progress: 100, method: 'saliency',
      saliency: values, saliencySize: inputSize, baseClass, baseConf,
      basePreds, labels, bestX, bestY, bestPatch: half * 2,
      bestMagnitude: max, bestDrop: 0, counterClass: null,
      counterPreds: null, detailMessage: xaiText('saliencyDetail', labels[baseClass] || `class_${baseClass}`), message: ''
    });
    publishXAIState(state.id, state);
    renderXAISaliencyOverlay(overlay, values, inputSize,
      overlay.width / inputSize, overlay.height / inputSize);
    overlay.style.opacity = String(state.opacity);
    log('eval', `XAI saliency: "${labels[baseClass]}" ${(baseConf * 100).toFixed(1)}% argmax=(${argX},${argY})`);
    setBlockStatus(block, 'done');
    return true;
  } catch (err) {
    if (saliency2D) try { saliency2D.dispose(); } catch (_) {}
    if (err && err.message === 'cancelled') throw err;
    console.warn('Saliency failed:', err);
    return false;
  }
}
function ensurePredictionHistoryDOM(id) {
  const timeline = document.getElementById('pred-history-timeline-' + id);
  if (!timeline) return null;
  const connected = timeline.isConnected !== undefined ? timeline.isConnected : document.contains(timeline);
  const cached = _predHistoryUI.get(timeline);
  if (cached && connected && cached.slots.length === PREDICTION_HISTORY_LIMIT) return cached;

  const frag = document.createDocumentFragment();
  const slots = [];
  for (let i = 0; i < PREDICTION_HISTORY_LIMIT; i++) {
    const point = document.createElement('div');
    point.className = 'pred-history-point';
    point.setAttribute('role', 'listitem');
    point.hidden = true;
    const marker = document.createElement('span');
    marker.className = 'pred-history-marker';
    marker.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'pred-history-point-label';
    const score = document.createElement('span');
    score.className = 'pred-history-point-score';
    const frame = document.createElement('span');
    frame.className = 'pred-history-point-frame';
    point.append(marker, label, score, frame);
    frag.appendChild(point);
    slots.push({ point, marker, label, score, frame });
  }
  timeline.replaceChildren(frag);
  const ui = { slots };
  _predHistoryUI.set(timeline, ui);
  return ui;
}

function renderPredictionHistoryTimeline(id, threshold) {
  const timeline = document.getElementById('pred-history-timeline-' + id);
  const empty = document.getElementById('pred-history-empty-' + id);
  const historyUI = ensurePredictionHistoryDOM(id);
  if (!timeline || !historyUI) return;
  const entries = predHistory.slice(-PREDICTION_HISTORY_LIMIT);
  const offset = PREDICTION_HISTORY_LIMIT - entries.length;
  for (let i = 0; i < historyUI.slots.length; i++) {
    const slot = historyUI.slots[i];
    const entry = entries[i - offset];
    if (!entry) {
      slot.point.hidden = true;
      continue;
    }
    const prior = i - offset > 0 ? entries[i - offset - 1] : null;
    const changed = !prior || prior.idx !== entry.idx;
    const label = String(entry.label == null ? `Class ${entry.idx + 1}` : entry.label);
    const pct = (finitePredictionNumber(entry.conf, 0) * 100).toFixed(1);
    slot.point.hidden = false;
    slot.point.classList.toggle('class-change', changed);
    slot.point.dataset.classIndex = String(entry.idx);
    slot.point.dataset.frame = String(entry.frame == null ? i + 1 : entry.frame);
    slot.point.dataset.probability = String(entry.conf);
    const pointColor = normalizePredictionColor(entry.color, normalizePredictionColor(inferColor(entry.idx), 'var(--c-model)'));
    slot.point.style.setProperty('--pred-history-color', pointColor);
    slot.marker.style.backgroundColor = pointColor;
    slot.label.textContent = label;
    slot.score.textContent = pct + '%';
    slot.frame.textContent = predictionText('frame', entry.frame == null ? i + 1 : entry.frame);
    slot.point.title = `${label} ${pct}%`;
    slot.point.setAttribute('aria-label', `${predictionText('frame', entry.frame == null ? i + 1 : entry.frame)}: ${label} ${pct}%`);
  }
  timeline.dataset.historyLength = String(entries.length);
  timeline.dataset.threshold = String(threshold);
  if (empty) {
    empty.hidden = entries.length > 0;
    empty.textContent = predictionText('historyEmpty');
  }
}

function drawHistChart(id, thresholdArg) {
  const cv = document.getElementById('hist-chart-' + id);
  const snapshot = predSnapshots.get(String(id));
  const threshold = Math.min(1, Math.max(0, finitePredictionNumber(
    thresholdArg == null ? snapshot?.threshold : thresholdArg, 0.7
  )));
  const entries = predHistory.slice(-PREDICTION_HISTORY_LIMIT);
  if (cv) {
    const { ctx, W, H } = setupChartCanvas(cv, 72);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = cssToken('--c-surface-2');
    ctx.fillRect(0, 0, W, H);
    const left = 18;
    const right = 4;
    const top = 4;
    const bottom = 12;
    const chartW = Math.max(1, W - left - right);
    const chartH = Math.max(1, H - top - bottom);
    ctx.strokeStyle = cssToken('--c-border');
    ctx.lineWidth = 1;
    [0, 0.5, 1].forEach(level => {
      const y = top + (1 - level) * chartH + 0.5;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(W - right, y);
      ctx.stroke();
    });
    const thresholdY = top + (1 - threshold) * chartH;
    ctx.strokeStyle = cssToken('--c-ink-soft');
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(left, thresholdY);
    ctx.lineTo(W - right, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = cssToken('--c-muted');
    ctx.font = cssFont(8);
    ctx.textAlign = 'right';
    ctx.fillText('100%', left - 3, top + 7);
    ctx.fillText('0%', left - 3, H - bottom + 1);
    if (entries.length) {
      const barW = chartW / PREDICTION_HISTORY_LIMIT;
      entries.forEach((entry, i) => {
        const confidence = Math.max(0, Math.min(1, finitePredictionNumber(entry.conf, 0)));
        const bh = confidence * chartH;
        ctx.fillStyle = normalizePredictionColor(entry.color, normalizePredictionColor(inferColor(entry.idx), 'var(--c-model)'));
        ctx.fillRect(left + (PREDICTION_HISTORY_LIMIT - entries.length + i) * barW, top + chartH - bh, Math.max(1, barW - 1), bh);
      });
    }
    cv.dataset.historyLength = String(entries.length);
    cv.dataset.threshold = String(threshold);
  }
  renderPredictionHistoryTimeline(String(id), threshold);
}

function freezeFrame(id) {
  frozenFrame = !frozenFrame;
  const key = String(id);
  const previous = predSnapshots.get(key);
  if (previous) {
    const mode = frozenFrame ? 'paused' : (inferInterval && inferCameraStream ? 'live' : 'stopped');
    renderPredictionSnapshot(key, { ...previous, mode, recordHistory: false }, { recordHistory: false });
  } else {
    renderPredictionState(key, frozenFrame ? 'paused' : (inferInterval && inferCameraStream ? 'live' : 'waiting'));
  }
  updatePredictionControls(key);
  log('info', t(frozenFrame ? 'log_frame_frozen' : 'log_frame_resumed'));
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

// One-click "save to browser" – usable from the post-train toast without the
// user having to find the Save Model block. Reuses a placed block's name field
// if present, otherwise a sensible default.
async function quickSaveModel() {
  if (!fullModel || !baseModel) {
    showToast(t('toast_no_model_to_save'), 'warn', { duration: 3000 });
    return;
  }
  const saveBlock = placedBlocks.find(b => b.type === 'save-model');
  let name = 'model-1';
  if (saveBlock) {
    const el = document.getElementById('model-name-' + saveBlock.id);
    if (el && el.value.trim()) name = el.value.trim();
  }
  // Same guard as runSaveIDB: 'base-*' is the backbone namespace.
  if (name.startsWith('base-')) {
    log('warn', t('log_save_bad_name'));
    showToast(t('log_save_bad_name'), 'warn', { duration: 3000 });
    return;
  }
  try {
    await saveModelToBrowser(name);
    if (saveBlock && saveBlock.card) setBlockStatus(saveBlock.card, 'done');
    log('success', t('log_save_idb'));
    showToast(t('toast_saved_as', name), 'success', { duration: 3000 });
  } catch (err) {
    log('error', t('err_save') + err.message);
    showToast(t('err_save') + err.message, 'error');
  }
}

// Show a "trained – now save" toast with a one-click Save action, and pulse the
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
    t('toast_model_trained'),
    'success',
    {
      duration: 9000,
      actionLabel: t('btn_save_now'),
      onAction: quickSaveModel
    }
  );
}

// Lightweight bottom-right toast notifications. Multiple stack vertically.
// Toast with optional action button(s). opts:
//   { kind, duration, actionLabel, onAction }  – single action
//   or { kind, duration, actions: [{label, onClick, primary}] } – multiple.
// Clicking an action dismisses the toast and runs its handler.
function showToast(text, kind, opts) {
  opts = opts || {};
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
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
    clearTimeout(timer);
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
  // Auto-dismiss pauses while the pointer or keyboard focus is on the toast, so
  // an action button ("Save now") cannot vanish under the user's cursor.
  let timer = null, remaining = opts.duration || 5500, startedAt = 0, hovered = false, focused = false;
  const startTimer = () => {
    if (dismissed || timer || hovered || focused) return;
    startedAt = Date.now();
    timer = setTimeout(dismiss, remaining);
  };
  const pauseTimer = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(1000, remaining - (Date.now() - startedAt));
  };
  el.addEventListener('mouseenter', () => { hovered = true; pauseTimer(); });
  el.addEventListener('mouseleave', () => { hovered = false; startTimer(); });
  el.addEventListener('focusin', () => { focused = true; pauseTimer(); });
  el.addEventListener('focusout', (e) => { if (el.contains(e.relatedTarget)) return; focused = false; startTimer(); });
  startTimer();
  return dismiss;
}

// ─── Dialog focus helpers ───
let _confirmSeq = 0;
const FOCUSABLE_SEL = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
// Keep Tab / Shift+Tab cycling inside `box` while a modal is open.
function trapTabKey(e, box) {
  if (e.key !== 'Tab' || !box) return;
  const items = Array.from(box.querySelectorAll(FOCUSABLE_SEL)).filter(el => !el.disabled && el.offsetParent !== null);
  if (!items.length) { e.preventDefault(); return; }
  const first = items[0], last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !box.contains(active))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (active === last || !box.contains(active))) { e.preventDefault(); first.focus(); }
}
function restoreFocus(el) {
  if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
}

// Promise-based confirm dialog – a non-blocking replacement for window.confirm()
// that matches the app's visual language and is bilingual. Resolves true/false.
function uiConfirm(message, opts) {
  opts = opts || {};
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay confirm-overlay';
    const okLabel = opts.okLabel || t('btn_confirm');
    const cancelLabel = opts.cancelLabel || t('btn_cancel');
    const box = document.createElement('div');
    box.className = 'modal-box confirm-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-describedby', 'confirm-msg-' + (++_confirmSeq));
    const returnFocus = document.activeElement;
    box.innerHTML = `
      <div class="confirm-msg" id="confirm-msg-${_confirmSeq}">${escapeHtml(message)}</div>
      <div class="confirm-actions">
        <button class="confirm-cancel">${escapeHtml(cancelLabel)}</button>
        <button class="confirm-ok${opts.danger ? ' confirm-ok-danger' : ''}">${escapeHtml(okLabel)}</button>
      </div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const close = (val) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      restoreFocus(returnFocus);
      resolve(val);
    };
    // Enter is left to the focused button's native click (OK gets focus below);
    // a document-level Enter handler fired before the click and resolved true
    // even when Cancel was focused.
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Tab') trapTabKey(e, box);
    };
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
  // Cached NodeList – set in DOMContentLoaded, reused on every state change.
  const pills = _flowPillEls || (_flowPillEls = document.querySelectorAll('.flow-pill'));
  for (let i = 0; i < pills.length; i++) {
    const pill = pills[i];
    pill.classList.toggle('done', !!phaseStates[pill.dataset.phase]);
  }
  // Notify other UI that needs to re-render on state change
  if (typeof refreshAllPrereqStrips === 'function') refreshAllPrereqStrips();
  if (typeof refreshEmptyState === 'function') refreshEmptyState();
}

// ===== PIPELINE RUNNER =====
async function runPipeline() {
  // Single-flight: a second Run while one is in flight would drive two prepares
  // and two trainings over the same shared state.
  if (pipelineRunning) {
    log('warn', t('warn_pipeline_running'));
    return;
  }
  pipelineRunning = true;
  try {
  // Run in canonical pipeline order (matches the connector lines and badges),
  // not by physical x-position – so a block dropped anywhere still runs in the
  // right order.
  const sorted = pipelineSorted();
  log('step', t('log_pipeline_start'));

  let completed = true;
  for (const b of sorted) {
    const id = b.id;
    // Activate flow bar phase
    setFlowPhase(blockMeta(b.type).phase);
    // Highlight the block (and the connector leading into it) that's running.
    const card = document.getElementById(id);
    if (card) card.classList.add('block-running');
    document.getElementById('pipeline-connectors')?.classList.add('pipe-active');

    // Each runnable step reports success; a failed step stops the pipeline
    // instead of letting the next step run on missing state.
    let ok = true;
    switch (b.type) {
      case 'prepare-data':
        ok = await runPrepare(id);
        break;
      case 'pretrained-model':
        ok = await runLoadBaseModel(id);
        break;
      case 'train-model':
        ok = await runTraining(id);
        break;
    }
    if (card) card.classList.remove('block-running');
    // Edu mode annotations
    if (eduMode) {
      const ann = document.getElementById('ann-' + id);
      if (ann) ann.textContent = getEduAnnotation(b.type) || '';
    }
    if (!ok) {
      log('warn', t('log_pipeline_stopped', blockTitle(b.type)));
      completed = false;
      break;
    }
    await tf.nextFrame();
  }
  if (completed) log('success', t('log_pipeline_done'));
  } finally {
    pipelineRunning = false;
    clearFlowPhase();
    document.querySelectorAll('.block-running').forEach(c => c.classList.remove('block-running'));
    document.getElementById('pipeline-connectors')?.classList.remove('pipe-active');
  }
}

// ===== GUIDE MODAL =====
let _guideReturnFocus = null;
function showGuide() {
  const modal = document.getElementById('guide-modal');
  if (!modal) return;
  if (modal.classList.contains('hidden')) _guideReturnFocus = document.activeElement;
  modal.classList.remove('hidden');
  // Sync the "don't show again" checkbox with the stored preference.
  const chk = document.getElementById('chk-no-guide');
  if (chk) chk.checked = localStorage.getItem('ml-blocks-no-guide') === '1';
  renderGuideSteps();
  const closeBtn = modal.querySelector('.modal-close-btn');
  if (closeBtn) closeBtn.focus();
}
function closeGuide() {
  const modal = document.getElementById('guide-modal');
  if (modal) modal.classList.add('hidden');
  restoreFocus(_guideReturnFocus);
  _guideReturnFocus = null;
}
function isGuideOpen() {
  const modal = document.getElementById('guide-modal');
  return !!modal && !modal.classList.contains('hidden');
}

// ===== KEYBOARD SHORTCUTS =====
// Document-level: ? guide, Esc close guide, Ctrl+Enter run, T tidy, L language,
// E edu mode. Ignored while typing in a field or while a confirm dialog is open.
function isTypingTarget(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
function handleGlobalShortcut(e) {
  if (isGuideOpen()) {
    if (e.key === 'Escape') { e.preventDefault(); closeGuide(); }
    else if (e.key === 'Tab') trapTabKey(e, document.querySelector('#guide-modal .modal-box'));
    return;
  }
  if (document.querySelector('.confirm-overlay')) return;
  if (isTypingTarget(e.target)) return;
  if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); runPipeline(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  switch (e.key) {
    case '?': e.preventDefault(); showGuide(); break;
    case 't': case 'T': e.preventDefault(); tidyUpCanvas(); break;
    case 'l': case 'L': e.preventDefault(); toggleLang(); break;
    case 'e': case 'E': e.preventDefault(); toggleEduMode(); break;
  }
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

// ===== QUICK START – Pre-populate canvas =====
function quickStartTraining() {
  const types = ['camera-input', 'label-classes', 'prepare-data', 'pretrained-model', 'train-model', 'save-model'];
  types.forEach((type, i) => placeBlock(type, 16 + i * 296, 40));
  log('step', t('log_qs_train'));
}

function quickStartInference() {
  const types = ['upload-model', 'camera-infer', 'show-results'];
  types.forEach((type, i) => placeBlock(type, 16 + i * 296, 40));
  log('step', t('log_qs_infer'));
}

// Toggle the empty-state placeholder when the canvas has zero blocks.
function refreshEmptyState() {
  const el = document.getElementById('empty-state');
  if (!el) return;
  el.classList.toggle('hidden', placedBlocks.length > 0);
}

// ===== PIPELINE ORDER VISUALIZATION =====
// Canonical pipeline order – matches the side panel top-to-bottom (training
// then prediction). Order badges, connector lines AND the Run order all follow
// this, so the flow is always logically correct no matter where a block is
// dropped on the canvas. Blocks of the same rank fall back to left-to-right.
// Both come from BLOCK_META; unknown types sort last, into the prediction group.
function pipelineRank(type) {
  return blockMeta(type).rank;
}
// Two independent pipelines: training (0) and prediction (1). Badges,
// connectors and the tidy layout treat them separately.
function pipelineGroup(type) {
  return blockMeta(type).group === 'train' ? 0 : 1;
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
  // How many columns fit in the visible canvas – wrap so a long pipeline never
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
  showToast(t('toast_tidied'), 'info', { duration: 2500 });
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
    // Training and prediction are separate pipelines – don't draw a line from
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
// (CSS class applied on DOMContentLoaded – document.body may not exist yet
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
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); paletteAddBlock(el); }
    });
  });
  document.addEventListener('keydown', handleGlobalShortcut);

  // Quick start if EDU mode – but ONLY when the canvas is empty. restoreCanvasState()
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

  log('step', t('log_ready'));
  log('info', 'TensorFlow.js ' + (tf.version?.tfjs || tf.version || ''));
  // Wait for TF.js to fully initialize WebGL backend before reading it
  tf.ready().then(() => {
    log('info', 'Backend: ' + tf.getBackend());
  });
});
