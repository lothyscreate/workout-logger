const storageKey = "codex.workoutLoggerWeb.v1";
const backupKey = "codex.workoutLoggerWeb.backups.v1";
const sessionArchiveKey = "codex.workoutLoggerWeb.sessionArchive.v1";
const maxStateBackups = 8;
const maxArchivedSessions = 300;
const backupThrottleMs = 30000;
const storageWarningCooldownMs = 15000;
const cloudSyncDebounceMs = 2000;
const cloudErrorToastCooldownMs = 30000;
const criticalBackupReasons = new Set(["finish-workout", "auto-complete-workout", "cloud-merge", "delete-session"]);
const appVersion = "v21";
const domain = globalThis.WorkoutDomain;
const maxActiveWorkoutSeconds = 4 * 60 * 60;
const cloudConfig = window.WORKOUT_LOGGER_CLOUD ?? {};
const hasCloudConfig = Boolean(cloudConfig.supabaseUrl && cloudConfig.supabaseAnonKey);

const icons = {
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  plus: "M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z",
  play: "M8 5v14l11-7L8 5Z",
  check: "M9.2 16.6 4.9 12.3 3.5 13.7 9.2 19.4 21 7.6 19.6 6.2 9.2 16.6Z",
  trash: "M7 21c-1.1 0-2-.9-2-2V8h14v11c0 1.1-.9 2-2 2H7ZM9 4h6l1 2h5v2H3V6h5l1-2Z",
  edit: "M4 17.3V20h2.7L17.8 8.9 15.1 6.2 4 17.3ZM19.4 7.3 16.7 4.6l1.2-1.2c.8-.8 2-.8 2.8 0l.2.2c.8.8.8 2 0 2.8l-1.5.9Z",
  copy: "M8 8h12v12H8V8Zm-4 8V4h12v2H6v10H4Z",
  x: "M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z",
  list: "M5 5h3v3H5V5Zm5 0h9v2h-9V5Zm0 4h9v2h-9V9Zm-5 4h3v3H5v-3Zm5 0h9v2h-9v-2Zm0 4h9v2h-9v-2ZM5 9h3v3H5V9Z",
  template: "M5 4h14v16H5V4Zm2 2v3h10V6H7Zm0 5v7h4v-7H7Zm6 0v2h4v-2h-4Zm0 4v3h4v-3h-4Z",
  calendar: "M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z",
  target: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  chart: "M4 19h16v2H2V3h2v16Zm3-2V9h3v8H7Zm5 0V5h3v12h-3Zm5 0v-6h3v6h-3Z",
  flame: "M13 2s1 3-1 5c-1.4 2.1-4 3.6-4 7a4 4 0 0 0 8 0c0-1.7-.8-3.1-2-4 .2 1.9-.7 3.1-1.8 3.8.4-2.9-1.6-5.2-3.6-6.7C5.9 9.2 4 11.7 4 15a8 8 0 0 0 16 0c0-5.2-3.7-8.6-7-13Z",
  settings: "M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 3A8 8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5A9 9 0 0 0 4.5 12c0 .5 0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 3h4l.4-3a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z",
  grip: "M8 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm11-14a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
};

const demoTemplates = [
  {
    id: uuid(),
    name: "Upper Strength",
    notes: "Pressing and pulling.",
    exercises: [
      {
        id: uuid(),
        name: "Bench Press",
        notes: "",
        sets: [
          { id: uuid(), weight: 135, reps: 5, rir: 2 },
          { id: uuid(), weight: 145, reps: 5, rir: 1 },
          { id: uuid(), weight: 145, reps: 5, rir: 1 }
        ]
      },
      {
        id: uuid(),
        name: "Barbell Row",
        notes: "",
        sets: [
          { id: uuid(), weight: 115, reps: 8, rir: 2 },
          { id: uuid(), weight: 125, reps: 8, rir: 2 },
          { id: uuid(), weight: 125, reps: 8, rir: 1 }
        ]
      }
    ]
  },
  {
    id: uuid(),
    name: "Lower Hypertrophy",
    notes: "Controlled reps.",
    exercises: [
      {
        id: uuid(),
        name: "Squat",
        notes: "",
        sets: [
          { id: uuid(), weight: 185, reps: 8, rir: 2 },
          { id: uuid(), weight: 195, reps: 8, rir: 2 },
          { id: uuid(), weight: 185, reps: 10, rir: 1 }
        ]
      },
      {
        id: uuid(),
        name: "Romanian Deadlift",
        notes: "",
        sets: [
          { id: uuid(), weight: 155, reps: 10, rir: 2 },
          { id: uuid(), weight: 165, reps: 10, rir: 1 }
        ]
      }
    ]
  }
];

const exerciseBiasRules = [
  {
    matches: ["incline bench", "incline press"],
    muscles: ["Upper chest", "front delts", "triceps"],
    note: "Incline pressing usually shifts more demand toward the clavicular pec and anterior deltoid than flat pressing."
  },
  {
    matches: ["bench", "chest press", "push up", "push-up"],
    muscles: ["Chest", "triceps", "front delts"],
    note: "Horizontal pressing commonly biases pecs and triceps, with front delts assisting."
  },
  {
    matches: ["overhead press", "shoulder press", "military press"],
    muscles: ["Front delts", "side delts", "triceps"],
    note: "Vertical pressing tends to bias delts and triceps more than chest."
  },
  {
    matches: ["lateral raise", "side raise"],
    muscles: ["Side delts"],
    note: "Abduction-style raises are usually a strong side-delt choice."
  },
  {
    matches: ["rear delt", "reverse fly", "face pull"],
    muscles: ["Rear delts", "mid traps", "rotator cuff"],
    note: "Horizontal abduction and external-rotation patterns bias rear delts and upper-back stabilizers."
  },
  {
    matches: ["pulldown", "pull up", "pull-up", "chin up", "chin-up"],
    muscles: ["Lats", "biceps", "mid back"],
    note: "Vertical pulls bias lats; grip changes may alter feel more than overall lat activation."
  },
  {
    matches: ["row", "rowing"],
    muscles: ["Lats", "mid traps", "rhomboids", "biceps"],
    note: "Rows bias lats and mid-back muscles; torso angle and elbow path change the emphasis."
  },
  {
    matches: ["squat", "leg press", "hack squat"],
    muscles: ["Quads", "glutes", "adductors"],
    note: "Squat and leg-press patterns bias knee and hip extensors, especially quads and glutes."
  },
  {
    matches: ["hip thrust", "glute bridge"],
    muscles: ["Glutes", "hamstrings"],
    note: "Hip-extension patterns with a bent knee usually bias glutes strongly."
  },
  {
    matches: ["hip adduction", "adductor", "adduction machine", "copenhagen"],
    muscles: ["Adductors"],
    note: "Hip-adduction work biases the adductor group on the inner thigh, especially when the thigh moves toward midline under load."
  },
  {
    matches: ["hip abduction", "abductor", "abduction machine"],
    muscles: ["Glute medius", "glute minimus", "upper glutes"],
    note: "Hip-abduction work usually biases the glute medius/minimus and upper-glute region."
  },
  {
    matches: ["deadlift", "romanian deadlift", "rdl", "good morning"],
    muscles: ["Hamstrings", "glutes", "spinal erectors"],
    note: "Hip-hinge patterns bias posterior chain muscles."
  },
  {
    matches: ["leg extension"],
    muscles: ["Quads"],
    note: "Knee-extension isolation work is mainly a quadriceps bias."
  },
  {
    matches: ["leg curl", "hamstring curl"],
    muscles: ["Hamstrings"],
    note: "Knee-flexion isolation work is mainly a hamstring bias."
  },
  {
    matches: ["curl"],
    muscles: ["Biceps", "brachialis"],
    note: "Elbow-flexion curls bias the elbow flexors."
  },
  {
    matches: ["tricep", "triceps", "skullcrusher", "pushdown", "extension"],
    muscles: ["Triceps"],
    note: "Elbow-extension work biases the triceps; shoulder angle can shift long-head demand."
  },
  {
    matches: ["calf raise"],
    muscles: ["Calves"],
    note: "Plantar-flexion work biases the calf complex."
  },
  {
    matches: ["ab crunch", "crunch", "cable crunch", "machine crunch", "sit up", "sit-up"],
    muscles: ["Rectus abdominis"],
    note: "Spinal-flexion ab work biases the rectus abdominis, especially when the ribs move toward the pelvis against resistance."
  },
  {
    matches: ["leg raise", "hanging knee raise", "knee raise", "reverse crunch"],
    muscles: ["Abs", "hip flexors"],
    note: "Posterior pelvic tilt and reverse-crunch patterns bias abs; straight-leg raise variations also involve hip flexors strongly."
  },
  {
    matches: ["plank", "dead bug", "pallof"],
    muscles: ["Abs", "obliques", "deep core"],
    note: "Anti-extension and anti-rotation core work biases trunk stiffness rather than loaded spinal flexion."
  }
];

let state = loadState();
const demoMode = new URLSearchParams(location.search).get("demo");
if (demoMode === "active") {
  state = hydrateState({
    templates: demoTemplates,
    activeWorkout: workoutFromTemplate(demoTemplates[0], "Upper Strength Demo"),
    sessions: []
  });
}
if (demoMode === "advice" || demoMode === "strength") {
  const demoSession = workoutFromTemplate(demoTemplates[0], "Upper Strength Demo");
  demoSession.finishedAt = new Date().toISOString();
  demoSession.durationSeconds = 3720;
  demoSession.exercises[0].sets = [
    { id: uuid(), weight: 135, reps: 8, rir: 2 },
    { id: uuid(), weight: 145, reps: 6, rir: 1 }
  ];
  const olderSession = workoutFromTemplate(demoTemplates[0], "Upper Strength Demo");
  const olderDate = new Date();
  olderDate.setDate(olderDate.getDate() - 14);
  olderSession.finishedAt = olderDate.toISOString();
  olderSession.durationSeconds = 3540;
  olderSession.exercises[0].sets = [
    { id: uuid(), weight: 115, reps: 8, rir: 2 },
    { id: uuid(), weight: 125, reps: 6, rir: 2 }
  ];
  state = hydrateState({
    templates: [],
    activeWorkout: null,
    sessions: [demoSession, olderSession]
  });
}
let selectedTab = "train";
let selectedTemplateId = templatesAtGym()[0]?.id ?? null;
let selectedCalendarDate = dateKey(new Date());
let visibleCalendarMonth = selectedCalendarDate.slice(0, 7);
let selectedAdviceSessionId = sessionsAtGym()[0]?.id ?? null;
let selectedStrengthExercise = firstTrackedExerciseName();
if (demoMode === "advice") selectedTab = "advice";
if (demoMode === "strength") selectedTab = "strength";
let editingTemplate = null;
let editingSessionId = null;
let settingsOpen = false;
let toastTimer = null;
let timerInterval = null;
let biasRenderTimer = null;
let pointerDragState = null;
let pointerDragEventsReady = false;
let serviceWorkerRegistration = null;
let waitingServiceWorker = null;
let updateAvailable = false;
let cloudClient = null;
let cloudUser = null;
let cloudEmail = "";
let cloudPassword = "";
let cloudAuthReady = !hasCloudConfig;
let cloudStatus = hasCloudConfig ? "Checking account..." : "Local only";
let cloudSyncTimer = null;
let cloudSyncing = false;
let cloudSyncPending = false;
let lastStateBackupAt = 0;
let lastStorageWarningAt = 0;
let lastCloudErrorToastAt = 0;
autoCompleteExpiredWorkout("startup", { silent: true, preserveScroll: false, skipRender: true });

function sessionsAtGym() { return domain.sessionsAt(state.sessions, state.selectedGymId); }
function templatesAtGym() { return state.templates.filter(template => domain.gymId(template.gymId) === state.selectedGymId); }
function renderGymBar() {
  const locked = state.activeWorkout && selectedTab === "train";
  const current = locked ? domain.gymId(state.activeWorkout.gymId) : state.selectedGymId;
  return `<section class="gym-bar" aria-label="Gym selection"><div class="gym-heading"><strong>${locked ? "Training at" : "Your gym"}</strong><span>${locked ? "This workout stays with this gym" : "Separate equipment. Separate progress."}</span></div>
    <div class="gym-switch" role="group" aria-label="Select gym">${domain.gyms.map(gym => { const count = domain.sessionsAt(state.sessions, gym.id).length; return `<button data-action="switch-gym" data-gym-id="${gym.id}" aria-pressed="${current === gym.id}" ${locked ? "disabled" : ""}>${gym.short}<span>${count} workout${count === 1 ? "" : "s"}</span></button>`; }).join("")}</div>
    ${current === "previous" ? `<p class="gym-note">Your earlier records are preserved here. Edit a workout’s gym in Calendar whenever you’re ready to assign it.</p>` : ""}</section>`;
}
function renderTemplateImport() {
  const sources = state.templates.filter(template => domain.gymId(template.gymId) !== state.selectedGymId);
  if (!sources.length) return "";
  return `<details class="template-import"><summary>Copy a routine from another gym</summary><p class="note-preview">Make an independent copy, then choose the machines at this gym. Workout history stays separate.</p><div class="import-row"><select id="copy-template-source" aria-label="Routine to copy">${sources.map(template => `<option value="${escapeAttribute(template.id)}">${escapeHtml(template.name)} · ${domain.gymName(template.gymId)}</option>`).join("")}</select><button class="ghost-button" data-action="copy-gym-template">Copy & edit</button></div></details>`;
}
function copyTemplateToGym(id) {
  const original = state.templates.find(template => template.id === id);
  if (!original) return;
  editingTemplate = { ...deepClone(original), id: uuid(), gymId: state.selectedGymId, updatedAt: new Date().toISOString(),
    exercises: original.exercises.map(exercise => ({ ...deepClone(exercise), id: uuid(), equipment: "", sets: [] })) };
  render();
}
function equipmentDescription(exercise) {
  return [exercise.equipment || "Default setup", isUnilateralExercise(exercise) ? "Unilateral" : "Bilateral", domain.unit(exercise) === "unspecified" ? "Unit not set" : domain.unit(exercise)].join(" · ");
}
function renderEquipmentFields(exercise, index, scope) {
  const gym = domain.gymId(workoutForScope(scope)?.gymId);
  const setups = [...new Set([...state.templates, ...state.sessions].filter(workout => domain.gymId(workout.gymId) === gym).flatMap(workout => workout.exercises).filter(item => normalizeExerciseName(item.name) === normalizeExerciseName(exercise.name)).map(item => item.equipment).filter(Boolean))];
  const listId = `equipment-${scope}-${index}`;
  return `<div class="equipment-fields"><div class="field"><label>Machine / setup <span class="optional">optional</span></label><input list="${escapeAttribute(listId)}" maxlength="100" placeholder="e.g. Cable tower, seat 4" value="${escapeAttribute(exercise.equipment || "")}" data-bind="${scope}.exercise.${index}.equipment"><datalist id="${escapeAttribute(listId)}">${setups.map(setup => `<option value="${escapeAttribute(setup)}"></option>`).join("")}</datalist><span class="field-hint">Use the same label each time. A different label starts a separate comparison.</span></div><div class="field"><label>Load unit</label><select data-bind="${scope}.exercise.${index}.loadUnit">${["lb", "kg", "unspecified"].map(unit => `<option value="${unit}" ${selectedAttribute(domain.unit(exercise), unit)}>${unit === "unspecified" ? "Not set" : unit}</option>`).join("")}</select></div></div>`;
}
function renderPreviousSession(exercise, scope) {
  const workout = workoutForScope(scope);
  const previous = domain.previous(state.sessions, workout, exercise);
  return `<p class="previous-session">${previous ? `Last here · ${formatDate(previous.session.finishedAt || previous.session.startedAt)} · ${escapeHtml(domain.gymName(workout.gymId))}` : "First entry for this setup here. Set your baseline."}</p>`;
}
function renderWorkoutGymField(workout, scope) {
  return `<div class="field"><label>Workout gym</label><select data-workout-gym="${scope}">${domain.gyms.map(gym => `<option value="${gym.id}" ${selectedAttribute(domain.gymId(workout.gymId), gym.id)}>${gym.name}</option>`).join("")}</select><span class="field-hint">Correcting this moves the workout’s comparison history.</span></div>`;
}
function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `workout-logger-${dateKey(new Date())}.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function wireAccessibleControls() {
  document.querySelectorAll("input, textarea, select").forEach((field, index) => {
    const label = field.closest(".field")?.querySelector("label");
    if (label) { if (!field.id) field.id = `field-${index}`; label.htmlFor = field.id; }
    else if (!field.getAttribute("aria-label")) field.setAttribute("aria-label", field.placeholder || "Value");
  });
  document.querySelectorAll("[data-workout-gym]").forEach(field => field.addEventListener("change", () => {
    const scope = field.dataset.workoutGym;
    const workout = workoutForScope(scope);
    if (!workout) return;
    if (!confirm(`Move this workout to ${domain.gymName(field.value)}? Its sets will be compared only within that gym.`)) { field.value = domain.gymId(workout.gymId); return; }
    workout.gymId = domain.gymId(field.value);
    state.selectedGymId = workout.gymId;
    persistWorkoutScope(scope, "change-gym");
    refreshSelectionsAfterStateLoad();
    renderWithScrollRestore();
  }));
  document.querySelectorAll("[data-tab]").forEach(tab => tab.setAttribute("aria-current", tab.dataset.tab === selectedTab ? "page" : "false"));
  const modal = document.querySelector("[role=dialog]");
  if (modal) {
    modal.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); void handleAction(settingsOpen ? "close-settings" : "close-modal", modal); }
      if (event.key !== "Tab") return;
      const controls = [...modal.querySelectorAll("button, input, textarea, select")].filter(field => !field.disabled);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    if (!modal.contains(document.activeElement)) modal.querySelector("button")?.focus({ preventScroll: true });
  }
}

function loadState() {
  const emptyState = {
    templates: [],
    activeWorkout: null,
    sessions: [],
    deletedSessionIds: [],
    profile: defaultProfile()
  };
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return recoverStateFromLocalBackups(hydrateState(JSON.parse(saved)));
  } catch {
    localStorage.removeItem(storageKey);
  }
  return recoverStateFromLocalBackups(hydrateState(emptyState));
}

function saveState(reason = "save") {
  const now = new Date().toISOString();
  state.updatedAt = now;
  if (state.activeWorkout) { state.activeWorkout.updatedAt = now; state.activeWorkout.revisionAt = now; }
  state = recoverStateFromLocalBackups(hydrateState(state), { allowActiveRestore: false });
  savePrimaryState();
  writeStateBackup(state, reason);
  scheduleCloudSync();
}

function render() {
  const app = document.querySelector("#app");
  try {
    app.innerHTML = `
      <header class="topbar">
        <div class="brand">
          <div class="mark">${icon("bolt")}</div>
          <div>
            <div class="brand-title">
              <h1>Workout Logger</h1>
              <span class="version-pill">${appVersion}</span>
            </div>
            <p class="subline">${state.activeWorkout ? `<span data-workout-timer>${formatWorkoutDuration(state.activeWorkout)}</span> in progress` : cloudStatus}</p>
          </div>
        </div>
        ${renderHeaderActions()}
      </header>
      ${renderGymBar()}
      <div class="layout ${state.activeWorkout && selectedTab === "train" ? "training-layout" : ""}">
        <aside class="sidebar">
          ${renderSidebar()}
        </aside>
        <main class="main">
          ${renderMain()}
        </main>
      </div>
      ${renderTabs()}
      ${renderUpdatePrompt()}
      ${editingTemplate ? renderTemplateModal(editingTemplate) : ""}
      ${settingsOpen ? renderSettingsModal() : ""}
    `;
    app.dataset.ready = "true";
    wireEvents();
    wireAccessibleControls();
    startTimerRefresh();
  } catch (error) {
    console.error("Workout Logger render failed", error);
    app.dataset.ready = "error";
    app.innerHTML = renderStartupError(error);
    wireStartupErrorEvents();
  }
}

function renderStartupError(error) {
  return `
    <main class="startup-error">
      <div class="mark">${icon("bolt")}</div>
      <h1>Workout Logger</h1>
      <span class="version-pill">${appVersion}</span>
      <p>The app hit a saved-data display error while opening. Your cloud data has not been deleted.</p>
      <button class="button" data-recovery-action="reload">Reload</button>
      <p class="note-preview">${escapeHtml(error?.message ?? "Unknown startup error")}</p>
    </main>
  `;
}

function wireStartupErrorEvents() {
  document.querySelectorAll("[data-recovery-action]").forEach(button => {
    button.addEventListener("click", () => {
      window.location.href = `${location.pathname}?recover=${Date.now()}`;
    });
  });
}

function renderUpdatePrompt() {
  if (!updateAvailable) return "";
  return `
    <div class="update-prompt">
      <span>Update ready</span>
      <button class="button" data-action="apply-update">Reload</button>
    </div>
  `;
}

function renderWithScrollRestore() {
  const scrollState = captureScrollState();
  render();
  restoreScrollState(scrollState);
}

function captureScrollState() {
  const modal = document.querySelector("[data-modal]");
  return {
    windowY: window.scrollY,
    modalTop: modal?.scrollTop ?? null
  };
}

function restoreScrollState(scrollState) {
  requestAnimationFrame(() => {
    window.scrollTo(0, scrollState.windowY ?? 0);
    const modal = document.querySelector("[data-modal]");
    if (modal && scrollState.modalTop != null) modal.scrollTop = scrollState.modalTop;
  });
}

function renderTabs() {
  return `
    <nav class="tabs" aria-label="Sections">
      ${tabButton("train", "Train", "list")}
      ${tabButton("templates", "Plans", "template")}
      ${tabButton("calendar", "Days", "calendar")}
      ${tabButton("advice", "Insights", "target")}
      ${tabButton("strength", "Stats", "chart")}
    </nav>
  `;
}

function tabButton(id, label, iconName) {
  return `<button class="tab ${selectedTab === id ? "active" : ""}" data-tab="${id}">${icon(iconName)}<span>${label}</span></button>`;
}

function renderHeaderActions() {
  return `<div class="top-actions"><button class="ghost-button settings-button" data-action="open-settings">${icon("settings")} ${cloudUser ? "Settings" : "Account & settings"}</button></div>`;
}

function renderAccountPanel() {
  if (!hasCloudConfig) {
    return `
      <div class="account-panel compact">
        <span class="account-state">Local storage</span>
        <span class="account-note">Add Supabase keys to enable accounts.</span>
        <button class="ghost-button" data-action="check-update">Check update</button>
      </div>
    `;
  }

  if (!cloudAuthReady) {
    return `
      <div class="account-panel compact">
        <span class="account-state">${escapeHtml(cloudStatus)}</span>
        <span class="account-note">Loading your account.</span>
        <button class="ghost-button" data-action="check-update">Check update</button>
      </div>
    `;
  }

  if (cloudUser) {
    return `
      <div class="account-panel signed-in">
        <span class="account-state">${escapeHtml(cloudUser.email ?? "Signed in")}</span>
        <div class="account-actions">
          <button class="ghost-button" data-action="sync-now">Sync</button>
          <button class="ghost-button" data-action="check-update">Check update</button>
          <button class="ghost-button" data-action="sign-out">Sign out</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="account-panel">
      <input type="email" placeholder="Email" value="${escapeAttribute(cloudEmail)}" data-bind="cloud.email" autocomplete="email">
      <input type="password" placeholder="Password" data-bind="cloud.password" autocomplete="current-password">
      <button class="ghost-button" data-action="sign-in">Sign in</button>
      <button class="button" data-action="sign-up">Create</button>
      <button class="ghost-button" data-action="check-update">Check update</button>
    </div>
  `;
}

function renderSidebar() {
  if (selectedTab === "calendar") {
    return `
      <div class="panel-title">
        <h2>Workout Days</h2>
      </div>
      <div class="history-list">
        ${sessionsAtGym().length ? sessionsByMostRecentDay().map(renderWorkoutDayButton).join("") : `<div class="empty">No finished workouts.</div>`}
      </div>
    `;
  }

  if (selectedTab === "advice") {
    return `
      <div class="panel-title">
        <h2>Pick Workout</h2>
      </div>
      <div class="history-list">
        ${sessionsAtGym().length ? sessionsAtGym().map(renderAdviceWorkoutButton).join("") : `<div class="empty">Finish a workout to see insights.</div>`}
      </div>
    `;
  }

  if (selectedTab === "strength") {
    const names = trackedExerciseNames();
    return `
      <div class="panel-title">
        <h2>Exercises</h2>
      </div>
      <div class="history-list">
        ${names.length ? names.map(renderStrengthExerciseButton).join("") : `<div class="empty">Finish workouts to track strength.</div>`}
      </div>
    `;
  }

  return `
    <div class="panel-title">
      <h2>Workouts</h2>
      <button class="icon-button" title="New template" data-action="new-template">${icon("plus")}</button>
    </div>
    <div class="template-list">
      ${templatesAtGym().length ? templatesAtGym().map(renderTemplateButton).join("") : `<div class="empty">No templates.</div>`}
    </div>
  `;
}

function renderTemplateButton(template) {
  const selected = selectedTemplateId === template.id ? "selected" : "";
  return `
    <button class="row ${selected}" data-template-id="${template.id}">
      <span class="row-top">
        <span class="row-title">${escapeHtml(template.name)}</span>
        <span class="meta">${template.exercises.length} exercises</span>
      </span>
      ${template.notes ? `<span class="note-preview">${escapeHtml(template.notes)}</span>` : ""}
    </button>
  `;
}

function renderWorkoutDayButton(day) {
  const selected = selectedCalendarDate === day.key ? "selected" : "";
  return `
    <button class="row ${selected}" data-calendar-date="${day.key}">
      <span class="row-top">
        <span class="row-title">${formatCalendarHeading(day.key)}</span>
        <span class="meta">${day.sessions.length} workout${day.sessions.length === 1 ? "" : "s"}</span>
      </span>
      <span class="meta">${day.sessions.reduce((total, session) => total + session.exercises.length, 0)} exercises, ${day.sessions.reduce((total, session) => total + countSets(session.exercises), 0)} sets</span>
    </button>
  `;
}

function renderAdviceWorkoutButton(session) {
  const selected = adviceSession().id === session.id ? "selected" : "";
  return `
    <button class="row ${selected}" data-advice-session-id="${session.id}">
      <span class="row-top">
        <span class="row-title">${escapeHtml(session.title)}</span>
        <span class="meta">${formatDate(session.finishedAt)}</span>
      </span>
      <span class="meta">${session.exercises.length} exercises, ${countSets(session.exercises)} sets</span>
    </button>
  `;
}

function renderStrengthExerciseButton(key) {
  const item = domain.series(state.sessions, state.selectedGymId).find(item => item.key === key);
  return `<button class="row ${selectedStrengthExercise === key ? "selected" : ""}" data-strength-exercise="${escapeAttribute(key)}">
    <span class="row-title">${escapeHtml(item.name)}</span><span class="meta">${escapeHtml(item.detail)}</span>
    <span class="meta">${strengthPointsForExercise(key).length} sessions at this gym</span></button>`;
}

function renderMain() {
  if (selectedTab === "templates") return renderTemplatesMain();
  if (selectedTab === "calendar") return renderCalendarMain();
  if (selectedTab === "advice") return renderAdviceMain();
  if (selectedTab === "strength") return renderStrengthMain();
  return renderTrainMain();
}

function renderTrainMain() {
  if (state.activeWorkout) return renderActiveWorkout();
  const selectedTemplate = templatesAtGym().find(template => template.id === selectedTemplateId) ?? templatesAtGym()[0];
  return `
    ${renderTemplateImport()}
    <div class="section-head">
      <h2>Ready to train</h2>
      <button class="button" data-action="start-empty">${icon("plus")} Empty</button>
    </div>
    ${
      selectedTemplate
        ? `
          <section class="summary-band">
            <div class="field">
              <label>Selected</label>
              <strong>${escapeHtml(selectedTemplate.name)}</strong>
              ${selectedTemplate.notes ? `<span class="note-preview">${escapeHtml(selectedTemplate.notes)}</span>` : ""}
            </div>
            <div class="stat"><strong>${selectedTemplate.exercises.length}</strong><span>Exercises</span></div>
          </section>
          <div class="action-row">
            <button class="button" data-action="start-template" data-template-id="${selectedTemplate.id}">${icon("play")} Start</button>
            <button class="ghost-button" data-action="edit-template" data-template-id="${selectedTemplate.id}">${icon("edit")} Edit</button>
          </div>
          <div class="exercise-list" style="margin-top:16px">
            ${selectedTemplate.exercises.map(exercise => renderTemplateExercisePreview(exercise)).join("")}
          </div>
        `
        : `<div class="empty">Create a routine for this gym or start an empty workout.</div>`
    }
  `;
}

function renderActiveWorkout() {
  const workout = state.activeWorkout;
  const calorieEstimate = estimateWorkoutCalories(workout);
  return `
    <div class="section-head">
      <h2>In session <span class="gym-badge">${escapeHtml(domain.gymName(workout.gymId))}</span></h2>
      <div class="action-row">
        <button class="danger-button" data-action="discard-workout">${icon("trash")} Discard</button>
        <button class="button" data-action="finish-workout" ${workout.exercises.length ? "" : "disabled"}>${icon("check")} Finish</button>
      </div>
    </div>
    <section class="summary-band training-summary">
      <div class="field">
        <label for="workout-title">Workout</label>
        <input id="workout-title" value="${escapeAttribute(workout.title)}" data-bind="active.title">
      </div>
      <div class="stat"><strong>${workout.exercises.length}</strong><span>Exercises</span></div>
      <div class="stat"><strong>${countSets(workout.exercises)}</strong><span>Sets</span></div>
      <div class="stat"><strong data-workout-timer>${formatWorkoutDuration(workout)}</strong><span>Timer</span></div>
    </section>
    <details class="session-options"><summary>Notes, rest & session details</summary>
      <div class="field">
        <label for="avg-rest">Avg rest sec</label>
        <input id="avg-rest" type="text" inputmode="numeric" autocomplete="off" value="${escapeAttribute(workout.restSeconds ?? "")}" placeholder="${escapeAttribute(restSecondsPlaceholder(workout))}" data-bind="active.restSeconds">
      </div>
      <div class="field full">
        <label for="finish-notes">Finish notes</label>
        <textarea id="finish-notes" data-bind="active.workoutNotes">${escapeHtml(workout.workoutNotes)}</textarea>
      </div>
      ${renderWorkoutGymField(workout, "active")}
      ${renderCalorieNote(calorieEstimate)}
    </details>
    <div class="exercise-list">
      ${workout.exercises.map((exercise, index) => renderEditableExercise(exercise, index, "active")).join("")}
    </div>
    <div class="action-row" style="margin-top:14px">
      <button class="ghost-button" data-action="add-active-exercise">${icon("plus")} Exercise</button>
    </div>
  `;
}

function renderTemplatesMain() {
  const selectedTemplate = templatesAtGym().find(template => template.id === selectedTemplateId) ?? templatesAtGym()[0];
  return `
    ${renderTemplateImport()}
    <div class="section-head">
      <h2>Templates</h2>
      <button class="button" data-action="new-template">${icon("plus")} New</button>
    </div>
    ${
      selectedTemplate
        ? `
          <section class="summary-band">
            <div class="field">
              <label>Template</label>
              <strong>${escapeHtml(selectedTemplate.name)}</strong>
              ${selectedTemplate.notes ? `<span class="note-preview">${escapeHtml(selectedTemplate.notes)}</span>` : ""}
            </div>
            <div class="stat"><strong>${selectedTemplate.exercises.length}</strong><span>Exercises</span></div>
          </section>
          <div class="action-row">
            <button class="button" data-action="start-template" data-template-id="${selectedTemplate.id}">${icon("play")} Start</button>
            <button class="ghost-button" data-action="edit-template" data-template-id="${selectedTemplate.id}">${icon("edit")} Edit</button>
            <button class="ghost-button" data-action="duplicate-template" data-template-id="${selectedTemplate.id}">${icon("copy")} Duplicate</button>
            <button class="danger-button" data-action="delete-template" data-template-id="${selectedTemplate.id}">${icon("trash")} Delete</button>
          </div>
          <div class="exercise-list" style="margin-top:16px">
            ${selectedTemplate.exercises.map(exercise => renderTemplateExercisePreview(exercise)).join("")}
          </div>
        `
        : `<div class="empty">No templates.</div>`
    }
  `;
}

function renderCalendarMain() {
  const selectedSessions = sessionsForDate(selectedCalendarDate);
  return `
    <div class="section-head">
      <h2>Calendar</h2>
      <div class="action-row">
        <button class="ghost-button" data-action="previous-month">Previous</button>
        <button class="ghost-button" data-action="today">Today</button>
        <button class="ghost-button" data-action="next-month">Next</button>
      </div>
    </div>
    <section class="calendar-frame">
      <div class="calendar-title">${formatMonthTitle(visibleCalendarMonth)}</div>
      <div class="calendar-grid">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => `<div class="calendar-weekday">${day}</div>`).join("")}
        ${calendarCells(visibleCalendarMonth).map(renderCalendarCell).join("")}
      </div>
    </section>
    <section class="day-detail">
      <div class="section-head">
        <h2>${formatCalendarHeading(selectedCalendarDate)}</h2>
        <span class="meta">${selectedSessions.length} workout${selectedSessions.length === 1 ? "" : "s"}</span>
      </div>
      ${
        selectedSessions.length
          ? selectedSessions.map(renderSessionDetail).join("")
          : `<div class="empty">No workouts logged for this day.</div>`
      }
    </section>
  `;
}

function renderAdviceMain() {
  const session = adviceSession();
  if (!session) return `<div class="empty">Finish a workout at this gym to see insights from your log.</div>`;
  const advice = buildAdvice(session);
  return `
    <div class="section-head">
      <h2>Insights</h2>
      <span class="meta">${escapeHtml(session.title)} - ${formatDate(session.finishedAt)}</span>
    </div>
    <section class="summary-band">
      <div class="field">
        <label>Selected workout</label>
        <strong>${escapeHtml(session.title)}</strong>
        <span class="note-preview">${advice.overview}</span>
      </div>
      <div class="stat"><strong>${advice.frequency}</strong><span>Days / 14</span></div>
      <div class="stat"><strong>${advice.totalSets}</strong><span>Sets</span></div>
      <div class="stat"><strong>${advice.averageRir}</strong><span>Avg RIR</span></div>
      <div class="stat"><strong>${formatWorkoutDuration(session)}</strong><span>Duration</span></div>
    </section>
    <div class="advice-grid">
      ${advice.cards.map(card => `
        <article class="advice-card">
          <span>${escapeHtml(card.label)}</span>
          <h3>${escapeHtml(card.title)}</h3>
          <p>${escapeHtml(card.body)}</p>
        </article>
      `).join("")}
    </div>
    <section class="calendar-frame">
      <div class="calendar-title">Likely muscle involvement</div>
      <div class="bias-tags">
        ${advice.muscleSummary.length ? advice.muscleSummary.map(item => `<span>${escapeHtml(item.muscle)} - ${item.sets} sets</span>`).join("") : `<span>No known muscle matches yet</span>`}
      </div>
    </section>
    <section class="calendar-frame">
      <div class="calendar-title">About these insights</div>
      <p class="note-preview">Muscle labels are inferred from exercise names, and may count a set toward several muscles. They are not measured direct training volume. Calorie and strength estimates are approximate.</p>
    </section>
  `;
}

function renderStrengthMain() {
  const names = trackedExerciseNames();
  const selected = names.includes(selectedStrengthExercise) ? selectedStrengthExercise : names[0];
  if (!selected) return `<div class="empty"><h2>A fresh baseline</h2><p>Log weight and reps at ${escapeHtml(domain.gymName(state.selectedGymId))} to start a progress chart. Your other gyms stay separate.</p></div>`;
  const series = domain.series(state.sessions, state.selectedGymId).find(item => item.key === selected);
  const points = strengthPointsForExercise(selected);
  return `
    <div class="section-head">
      <h2>Strength</h2>
      <span class="meta">${escapeHtml(series.name)}</span>
    </div>
    <section class="summary-band">
      <div class="field">
        <label>Exercise</label>
        <strong>${escapeHtml(series.name)}</strong>
        <span class="note-preview">${escapeHtml(series.detail)}<br>Only ${escapeHtml(domain.gymName(state.selectedGymId))}. e1RM = weight × (1 + reps / 30); an estimate, not a tested maximum. Keep range of motion and setup consistent.</span>
      </div>
      <div class="stat"><strong>${points.length}</strong><span>Sessions</span></div>
      <div class="stat"><strong>${points.at(-1)?.estimate ?? "0"}</strong><span>Latest e1RM${series.unit === "unspecified" ? "" : ` (${series.unit})`}</span></div>
      <div class="stat"><strong>${strengthDelta(points)}</strong><span>Change</span></div>
    </section>
    <section class="calendar-frame">
      <div class="calendar-title">Estimated Strength Trend</div>
      ${renderStrengthGraph(points)}
    </section>
    <div class="exercise-list">
      ${[...points].reverse().map(point => `
        <section class="exercise-card">
          <div class="row-top">
            <strong>${formatCalendarHeading(point.date)}</strong>
            <span class="meta">e1RM ${point.estimate}</span>
          </div>
          <div class="sets">
            <div class="set-row">
              <div class="set-number">Best</div>
              <div class="stat"><strong>${point.weight}</strong><span>Weight</span></div>
              <div class="stat"><strong>${point.reps}</strong><span>Reps</span></div>
              <div class="stat"><strong>${displaySetValue(point.rir)}</strong><span>RIR</span></div>
              <div></div>
            </div>
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

function renderCalendarCell(cell) {
  const sessions = sessionsForDate(cell.key);
  const selected = selectedCalendarDate === cell.key ? "selected" : "";
  const muted = cell.inMonth ? "" : "muted";
  const hasWorkouts = sessions.length ? "has-workouts" : "";
  const cellDate = validDate(`${cell.key}T12:00:00`) ?? new Date();
  return `
    <button class="calendar-cell ${selected} ${muted} ${hasWorkouts}" data-calendar-date="${cell.key}">
      <span>${cellDate.getDate()}</span>
      ${sessions.length ? `<strong>${sessions.length}</strong>` : ""}
    </button>
  `;
}

function renderSessionDetail(session) {
  if (editingSessionId === session.id) return renderSessionEditor(session);
  const calorieEstimate = estimateWorkoutCalories(session);

  return `
    <article class="session-detail">
      <div class="section-head">
        <h3>${escapeHtml(session.title)} <span class="gym-badge">${escapeHtml(domain.gymName(session.gymId))}</span></h3>
        <div class="action-row">
          <button class="ghost-button" data-action="edit-session" data-session-id="${session.id}">${icon("edit")} Edit</button>
          <button class="danger-button" data-action="delete-session" data-session-id="${session.id}">${icon("trash")} Delete</button>
        </div>
      </div>
      <section class="summary-band">
        <div class="field">
          <label>Finished</label>
          <strong>${formatDate(session.finishedAt)}</strong>
          ${session.autoCompleted ? `<span class="note-preview">Auto-finished after 4 hours.</span>` : ""}
          ${session.workoutNotes ? `<span class="note-preview">${escapeHtml(session.workoutNotes)}</span>` : ""}
        </div>
        <div class="stat"><strong>${session.exercises.length}</strong><span>Exercises</span></div>
        <div class="stat"><strong>${countSets(session.exercises)}</strong><span>Sets</span></div>
        <div class="stat"><strong>${formatWorkoutDuration(session)}</strong><span>Duration</span></div>
        <div class="stat calorie-stat"><strong>${calorieDisplayValue(calorieEstimate)}</strong><span>Calories</span></div>
        <div class="stat"><strong>${averageRir(session.exercises)}</strong><span>Avg RIR</span></div>
      </section>
      ${renderCalorieNote(calorieEstimate)}
      <div class="exercise-list">
        ${session.exercises.map(exercise => renderReadOnlyExercise(exercise)).join("")}
      </div>
    </article>
  `;
}

function renderSessionEditor(session) {
  const scope = sessionScope(session.id);
  const calorieEstimate = estimateWorkoutCalories(session);
  return `
    <article class="session-detail editing-session">
      <div class="section-head">
        <h3>Edit ${escapeHtml(session.title || "Workout")}</h3>
        <div class="action-row">
          <button class="button" data-action="done-edit-session" data-session-id="${session.id}">${icon("check")} Done</button>
          <button class="danger-button" data-action="delete-session" data-session-id="${session.id}">${icon("trash")} Delete</button>
        </div>
      </div>
      <section class="summary-band session-edit-grid">
        ${renderWorkoutGymField(session, scope)}
        <div class="field">
          <label>Workout</label>
          <input value="${escapeAttribute(session.title)}" data-bind="${scope}.title">
        </div>
        <div class="field">
          <label>Started</label>
          <input type="datetime-local" value="${escapeAttribute(toDateTimeLocalValue(session.startedAt))}" data-bind="${scope}.startedAt">
        </div>
        <div class="field">
          <label>Finished</label>
          <input type="datetime-local" value="${escapeAttribute(toDateTimeLocalValue(session.finishedAt ?? session.startedAt))}" data-bind="${scope}.finishedAt">
        </div>
        <div class="field">
          <label>Duration min</label>
          <input type="text" inputmode="numeric" autocomplete="off" value="${escapeAttribute(durationMinutesValue(session))}" data-bind="${scope}.durationMinutes">
        </div>
        <div class="field">
          <label>Avg rest sec</label>
          <input type="text" inputmode="numeric" autocomplete="off" value="${escapeAttribute(session.restSeconds ?? "")}" placeholder="${escapeAttribute(restSecondsPlaceholder(session))}" data-bind="${scope}.restSeconds">
        </div>
        <div class="stat calorie-stat"><strong>${calorieDisplayValue(calorieEstimate)}</strong><span>Calories</span></div>
        <div class="field full">
          <label>Workout notes</label>
          <textarea data-bind="${scope}.workoutNotes">${escapeHtml(session.workoutNotes)}</textarea>
        </div>
      </section>
      ${renderCalorieNote(calorieEstimate)}
      <div class="exercise-list">
        ${session.exercises.map((exercise, index) => renderEditableExercise(exercise, index, scope)).join("")}
      </div>
      <div class="action-row" style="margin-top:14px">
        <button class="ghost-button" data-action="add-session-exercise" data-scope="${scope}">${icon("plus")} Exercise</button>
      </div>
    </article>
  `;
}

function renderReadOnlyExercise(exercise) {
  const unilateral = isUnilateralExercise(exercise);
  return `
    <section class="exercise-card">
      <div class="exercise-head">
        <div>
          <strong>${escapeHtml(exercise.name)}</strong>
          <div class="meta">${escapeHtml(equipmentDescription(exercise))}</div>
          ${exercise.notes ? `<div class="note-preview">${escapeHtml(exercise.notes)}</div>` : ""}
          ${renderMuscleBias(exercise.name)}
        </div>
      </div>
      <div class="sets">
        ${exercise.sets.map((set, index) => renderReadOnlySet(set, index, unilateral)).join("")}
      </div>
    </section>
  `;
}

function renderReadOnlySet(set, index, unilateral) {
  if (!unilateral) {
    return `
      <div class="set-row">
        <div class="set-number">#${index + 1}</div>
        <div class="stat"><strong>${displaySetValue(set.weight)}</strong><span>Weight</span></div>
        <div class="stat"><strong>${displaySetValue(set.reps)}</strong><span>Reps</span></div>
        <div class="stat"><strong>${displaySetValue(set.rir)}</strong><span>RIR</span></div>
        <div></div>
      </div>
    `;
  }

  return `
    <div class="unilateral-set">
      <div class="set-number">#${index + 1}</div>
      ${["left", "right"].map(side => {
        const entry = sideSet(set, side);
        return `
          <div class="side-readout">
            <span class="side-label">${side}</span>
            <div class="stat"><strong>${displaySetValue(entry.weight)}</strong><span>Weight</span></div>
            <div class="stat"><strong>${displaySetValue(entry.reps)}</strong><span>Reps</span></div>
            <div class="stat"><strong>${displaySetValue(entry.rir)}</strong><span>RIR</span></div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderTemplateExercisePreview(exercise) {
  return `
    <section class="exercise-card">
      <div class="exercise-head">
        <div>
          <strong>${escapeHtml(exercise.name)}</strong>
          <div class="meta">${escapeHtml(equipmentDescription(exercise))}</div>
          ${exercise.notes ? `<div class="note-preview">${escapeHtml(exercise.notes)}</div>` : ""}
          ${renderMuscleBias(exercise.name)}
        </div>
      </div>
    </section>
  `;
}

function renderEditableExercise(exercise, index, scope) {
  return `
    <section class="exercise-card" data-exercise-index="${index}" data-scope="${scope}" data-drop-exercise-index="${index}">
      <div class="exercise-head">
        ${renderDragHandle(scope, index)}
        <div class="field">
          <label>Exercise</label>
          <input value="${escapeAttribute(exercise.name)}" data-bind="${scope}.exercise.${index}.name">
        </div>
        <button class="icon-button" title="Remove exercise" data-action="remove-exercise" data-scope="${scope}" data-exercise-index="${index}">${icon("trash")}</button>
      </div>
      ${renderEquipmentFields(exercise, index, scope)}
      ${renderTrackingToggle(exercise, index, scope)}
      ${renderPreviousSession(exercise, scope)}
      ${renderMuscleBias(exercise.name)}
      <div class="sets">
        ${exercise.sets.map((set, setIndex) => renderSetRow(set, index, setIndex, scope)).join("")}
      </div>
      <div class="action-row">
        <button class="ghost-button" data-action="add-set" data-scope="${scope}" data-exercise-index="${index}">${icon("plus")} Set</button>
      </div>
      <div class="field" style="margin-top:12px">
        <label>Exercise notes</label>
        <textarea data-bind="${scope}.exercise.${index}.notes">${escapeHtml(exercise.notes)}</textarea>
      </div>
    </section>
  `;
}

function renderTemplateExerciseEditor(exercise, index) {
  return `
    <section class="exercise-card" data-exercise-index="${index}" data-scope="template" data-drop-exercise-index="${index}">
      <div class="exercise-head">
        ${renderDragHandle("template", index)}
        <div class="field">
          <label>Exercise</label>
          <input value="${escapeAttribute(exercise.name)}" data-bind="template.exercise.${index}.name">
        </div>
        <button class="icon-button" title="Remove exercise" data-action="remove-exercise" data-scope="template" data-exercise-index="${index}">${icon("trash")}</button>
      </div>
      ${renderEquipmentFields(exercise, index, "template")}
      ${renderTrackingToggle(exercise, index, "template")}
      ${renderMuscleBias(exercise.name)}
      <div class="field" style="margin-top:12px">
        <label>Preset notes</label>
        <textarea data-bind="template.exercise.${index}.notes">${escapeHtml(exercise.notes)}</textarea>
      </div>
    </section>
  `;
}

function renderDragHandle(scope, index) {
  return `
    <span class="drag-handle" title="Drag to reorder" draggable="true" data-drag-exercise-index="${index}" data-scope="${scope}">
      ${icon("grip")}
    </span>
  `;
}

function renderTrackingToggle(exercise, index, scope) {
  const unilateral = isUnilateralExercise(exercise);
  return `
    <div class="segmented" aria-label="Tracking mode">
      <button class="${unilateral ? "" : "active"}" data-action="set-tracking-mode" data-scope="${scope}" data-exercise-index="${index}" data-mode="bilateral">Bilateral</button>
      <button class="${unilateral ? "active" : ""}" data-action="set-tracking-mode" data-scope="${scope}" data-exercise-index="${index}" data-mode="unilateral">Unilateral</button>
    </div>
  `;
}

function renderSetRow(set, exerciseIndex, setIndex, scope) {
  const exerciseName = exerciseNameForSet(scope, exerciseIndex);
  const exercise = exerciseForSet(scope, exerciseIndex);
  if (isUnilateralExercise(exercise)) return renderUnilateralSetRow(set, exerciseIndex, setIndex, scope, exerciseName);
  const previous = previousSetForExercise(exercise, setIndex, null, scope);
  return `
    <div class="set-row">
      <div class="set-number">#${setIndex + 1}</div>
      <div class="field">
        <label>${domain.unit(exerciseForSet(scope, exerciseIndex)) === "unspecified" ? "Weight" : domain.unit(exerciseForSet(scope, exerciseIndex))}</label>
        <input type="text" inputmode="decimal" autocomplete="off" value="${escapeAttribute(set.weight ?? "")}" placeholder="${previousPlaceholder(previous, "weight")}" data-bind="${scope}.set.${exerciseIndex}.${setIndex}.weight">
      </div>
      <div class="field">
        <label>Reps</label>
        <input type="text" inputmode="numeric" autocomplete="off" value="${escapeAttribute(set.reps ?? "")}" placeholder="${previousPlaceholder(previous, "reps")}" data-bind="${scope}.set.${exerciseIndex}.${setIndex}.reps">
      </div>
      <div class="field">
        <label>RIR</label>
        <input type="text" inputmode="decimal" autocomplete="off" value="${escapeAttribute(set.rir ?? "")}" placeholder="${previousPlaceholder(previous, "rir")}" data-bind="${scope}.set.${exerciseIndex}.${setIndex}.rir">
      </div>
      <button class="icon-button" title="Remove set" data-action="remove-set" data-scope="${scope}" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}">${icon("x")}</button>
    </div>
  `;
}

function renderUnilateralSetRow(set, exerciseIndex, setIndex, scope, exerciseName) {
  return `
    <div class="unilateral-set">
      <div class="unilateral-set-head">
        <div class="set-number">#${setIndex + 1}</div>
        <button class="icon-button" title="Remove set" data-action="remove-set" data-scope="${scope}" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}">${icon("x")}</button>
      </div>
      ${["left", "right"].map(side => renderSideSetFields(set, exerciseIndex, setIndex, scope, exerciseName, side)).join("")}
    </div>
  `;
}

function renderSideSetFields(set, exerciseIndex, setIndex, scope, exerciseName, side) {
  const entry = sideSet(set, side);
  const previous = previousSetForExercise(exerciseForSet(scope, exerciseIndex), setIndex, side, scope);
  return `
    <div class="side-set">
      <span class="side-label">${side}</span>
      <div class="field">
        <label>${domain.unit(exerciseForSet(scope, exerciseIndex)) === "unspecified" ? "Weight" : domain.unit(exerciseForSet(scope, exerciseIndex))}</label>
        <input type="text" inputmode="decimal" autocomplete="off" value="${escapeAttribute(entry.weight ?? "")}" placeholder="${previousPlaceholder(previous, "weight")}" data-bind="${scope}.set.${exerciseIndex}.${setIndex}.${side}.weight">
      </div>
      <div class="field">
        <label>Reps</label>
        <input type="text" inputmode="numeric" autocomplete="off" value="${escapeAttribute(entry.reps ?? "")}" placeholder="${previousPlaceholder(previous, "reps")}" data-bind="${scope}.set.${exerciseIndex}.${setIndex}.${side}.reps">
      </div>
      <div class="field">
        <label>RIR</label>
        <input type="text" inputmode="decimal" autocomplete="off" value="${escapeAttribute(entry.rir ?? "")}" placeholder="${previousPlaceholder(previous, "rir")}" data-bind="${scope}.set.${exerciseIndex}.${setIndex}.${side}.rir">
      </div>
    </div>
  `;
}

function renderTemplateModal(template) {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal" role="dialog" aria-modal="true" aria-label="Template editor" data-modal>
        <div class="modal-head">
          <h2>Template <span class="gym-badge">${escapeHtml(domain.gymName(template.gymId))}</span></h2>
          <button class="icon-button" title="Close" data-action="close-modal">${icon("x")}</button>
        </div>
        <div class="modal-body">
          <div class="field-grid">
            <div class="field">
              <label>Name</label>
              <input value="${escapeAttribute(template.name)}" data-bind="template.name">
            </div>
            <div class="field full">
              <label>Notes</label>
              <textarea data-bind="template.notes">${escapeHtml(template.notes)}</textarea>
            </div>
          </div>
          <div class="exercise-list" style="margin-top:14px">
            ${template.exercises.map((exercise, index) => renderTemplateExerciseEditor(exercise, index)).join("")}
          </div>
          <div class="action-row" style="margin-top:14px">
            <button class="ghost-button" data-action="add-template-exercise">${icon("plus")} Exercise</button>
          </div>
        </div>
        <div class="modal-foot">
          <button class="ghost-button" data-action="close-modal">Cancel</button>
          <button class="button" data-action="save-template">${icon("check")} Save</button>
        </div>
      </section>
    </div>
  `;
}

function renderSettingsModal() {
  const profile = state.profile ?? defaultProfile();
  return `
    <div class="modal-backdrop" data-action="close-settings">
      <section class="modal settings-modal" role="dialog" aria-modal="true" aria-label="Settings" data-modal>
        <div class="modal-head">
          <h2>Settings</h2>
          <button class="icon-button" title="Close" data-action="close-settings">${icon("x")}</button>
        </div>
        <div class="modal-body">
          <section class="account-settings"><h3>Account & backup</h3>${renderAccountPanel()}<button class="ghost-button" data-action="export-backup">Export all workout data</button><p class="note-preview">Includes every gym, template and workout. Keep a copy before changing devices.</p></section>
          <h3>Body profile</h3><div class="field-grid settings-grid">
            <div class="field">
              <label>Body weight</label>
              <input type="text" inputmode="decimal" autocomplete="off" value="${escapeAttribute(profile.weight)}" data-bind="profile.weight">
            </div>
            <div class="field">
              <label>Weight unit</label>
              <select data-bind="profile.weightUnit">
                <option value="lb" ${selectedAttribute(profile.weightUnit, "lb")}>lb</option>
                <option value="kg" ${selectedAttribute(profile.weightUnit, "kg")}>kg</option>
              </select>
            </div>
            <div class="field">
              <label>Height</label>
              <input type="text" autocomplete="off" value="${escapeAttribute(profile.height)}" placeholder="${profile.heightUnit === "cm" ? "178" : "70 or 5 10"}" data-bind="profile.height">
            </div>
            <div class="field">
              <label>Height unit</label>
              <select data-bind="profile.heightUnit">
                <option value="in" ${selectedAttribute(profile.heightUnit, "in")}>ft/in</option>
                <option value="cm" ${selectedAttribute(profile.heightUnit, "cm")}>cm</option>
              </select>
            </div>
            <div class="field">
              <label>Age</label>
              <input type="text" inputmode="numeric" autocomplete="off" value="${escapeAttribute(profile.age)}" data-bind="profile.age">
            </div>
            <div class="field">
              <label>Gender</label>
              <select data-bind="profile.gender">
                <option value="" ${selectedAttribute(profile.gender, "")}>Select</option>
                <option value="male" ${selectedAttribute(profile.gender, "male")}>Male</option>
                <option value="female" ${selectedAttribute(profile.gender, "female")}>Female</option>
                <option value="other" ${selectedAttribute(profile.gender, "other")}>Other</option>
              </select>
            </div>
            <div class="field">
              <label>Default rest sec</label>
              <input type="text" inputmode="numeric" autocomplete="off" value="${escapeAttribute(profile.defaultRestSeconds)}" placeholder="Auto" data-bind="profile.defaultRestSeconds">
            </div>
          </div>
          <section class="settings-note">
            <div class="stat">${icon("flame")}<strong>${calorieReadinessLabel()}</strong><span>Calorie estimate</span></div>
          </section>
        </div>
        <div class="modal-foot">
          <button class="button" data-action="close-settings">${icon("check")} Done</button>
        </div>
      </section>
    </div>
  `;
}

function wireEvents() {
  document.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => {
      selectedTab = button.dataset.tab;
      render();
    });
  });

  document.querySelectorAll("[data-template-id]").forEach(element => {
    if (element.matches("button.row")) {
      element.addEventListener("click", () => {
        selectedTemplateId = element.dataset.templateId;
        render();
      });
    }
  });

  document.querySelectorAll("[data-calendar-date]").forEach(element => {
    element.addEventListener("click", () => {
      selectedCalendarDate = element.dataset.calendarDate;
      visibleCalendarMonth = selectedCalendarDate.slice(0, 7);
      render();
    });
  });

  document.querySelectorAll("[data-advice-session-id]").forEach(element => {
    element.addEventListener("click", () => {
      selectedAdviceSessionId = element.dataset.adviceSessionId;
      render();
    });
  });

  document.querySelectorAll("[data-strength-exercise]").forEach(element => {
    element.addEventListener("click", () => {
      selectedStrengthExercise = element.dataset.strengthExercise;
      render();
    });
  });

  document.querySelectorAll("[data-action]").forEach(element => {
    element.addEventListener("click", event => {
      const action = element.dataset.action;
      if ((action === "close-modal" || action === "close-settings") && event.target.closest("[data-modal]") && event.target !== element) return;
      void handleAction(action, element).catch(error => {
        console.error("Workout Logger action failed", error);
        renderWithScrollRestore();
        showToast(friendlyErrorMessage(error));
      });
    });
  });

  document.querySelectorAll("[data-bind]").forEach(field => {
    const updateField = () => {
      try {
        if (field.dataset.bind.endsWith(".loadUnit")) {
          const parts = field.dataset.bind.split(".");
          const exercise = exerciseForSet(parts[0], Number(parts[2]));
          if (exercise && domain.unit(exercise) !== field.value && loggedSetEntries(exercise).some(set => Number(set.weight) > 0) && !confirm("Change this exercise’s load unit? Existing weight numbers will stay the same; they are not converted.")) {
            field.value = domain.unit(exercise);
            return;
          }
        }
        updateBinding(field.dataset.bind, field.value);
        if (field.dataset.bind.includes(".exercise.")) refreshExerciseContext(field.closest(".exercise-card"));
      } catch (error) {
        console.error("Workout Logger input save failed", error);
        showToast(friendlyErrorMessage(error));
      }
    };
    if (field.tagName !== "SELECT") field.addEventListener("input", updateField);
    field.addEventListener("change", updateField);
  });

  document.querySelectorAll("[data-drag-exercise-index]").forEach(handle => {
    handle.addEventListener("pointerdown", event => {
      startPointerDrag(event, handle);
    });
    handle.addEventListener("dragstart", event => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify({
        scope: handle.dataset.scope,
        index: Number(handle.dataset.dragExerciseIndex)
      }));
      handle.closest(".exercise-card")?.classList.add("dragging");
    });
    handle.addEventListener("dragend", () => {
      document.querySelectorAll(".exercise-card.dragging, .exercise-card.drag-over").forEach(card => {
        card.classList.remove("dragging", "drag-over");
      });
    });
  });

  if (!pointerDragEventsReady) {
    document.addEventListener("pointermove", updatePointerDrag);
    document.addEventListener("pointerup", finishPointerDrag);
    document.addEventListener("pointercancel", cancelPointerDrag);
    pointerDragEventsReady = true;
  }

  document.querySelectorAll("[data-drop-exercise-index]").forEach(card => {
    card.addEventListener("dragover", event => {
      event.preventDefault();
      card.classList.add("drag-over");
    });
    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });
    card.addEventListener("drop", event => {
      event.preventDefault();
      card.classList.remove("drag-over");
      try {
        const drag = JSON.parse(event.dataTransfer.getData("text/plain"));
        reorderExercise(drag.scope, Number(drag.index), Number(card.dataset.dropExerciseIndex));
      } catch {
        showToast("Could not reorder");
      }
    });
  });
}

async function handleAction(action, element) {
  switch (action) {
    case "switch-gym":
      state.selectedGymId = domain.gymId(element.dataset.gymId);
      refreshSelectionsAfterStateLoad();
      saveAndRender(`${domain.gymName(state.selectedGymId)} selected`);
      break;
    case "copy-gym-template":
      copyTemplateToGym(document.querySelector("#copy-template-source")?.value);
      break;
    case "export-backup":
      exportBackup();
      break;
    case "start-empty":
      if (state.activeWorkout) { selectedTab = "train"; render(); break; }
      state.activeWorkout = newWorkout("Workout", []);
      saveAndRender("Workout started");
      break;
    case "start-template":
      startTemplate(element.dataset.templateId);
      break;
    case "finish-workout":
      finishWorkout();
      break;
    case "discard-workout":
      if (confirm("Discard active workout?")) {
        state.deletedSessionIds = [...new Set([...state.deletedSessionIds, state.activeWorkout.id])];
        state.activeWorkout = null;
        saveAndRender("Workout discarded");
      }
      break;
    case "new-template":
      editingTemplate = newTemplate();
      render();
      break;
    case "edit-template":
      editTemplate(element.dataset.templateId);
      break;
    case "duplicate-template":
      duplicateTemplate(element.dataset.templateId);
      break;
    case "delete-template":
      deleteTemplate(element.dataset.templateId);
      break;
    case "delete-session":
      deleteSession(element.dataset.sessionId);
      break;
    case "edit-session":
      editSession(element.dataset.sessionId);
      break;
    case "done-edit-session":
      finishEditingSession(element.dataset.sessionId);
      break;
    case "previous-month":
      shiftCalendarMonth(-1);
      break;
    case "next-month":
      shiftCalendarMonth(1);
      break;
    case "today":
      selectedCalendarDate = dateKey(new Date());
      visibleCalendarMonth = selectedCalendarDate.slice(0, 7);
      renderWithScrollRestore();
      break;
    case "add-active-exercise":
      state.activeWorkout.exercises.push(newExercise("New Exercise"));
      saveAndRender("Exercise added", true);
      break;
    case "add-template-exercise":
      editingTemplate.exercises.push(newTemplateExercise("New Exercise"));
      renderWithScrollRestore();
      break;
    case "add-session-exercise":
      addExerciseToScope(element.dataset.scope);
      break;
    case "remove-exercise":
      removeExercise(element.dataset.scope, Number(element.dataset.exerciseIndex));
      break;
    case "add-set":
      addSet(element.dataset.scope, Number(element.dataset.exerciseIndex));
      break;
    case "remove-set":
      removeSet(element.dataset.scope, Number(element.dataset.exerciseIndex), Number(element.dataset.setIndex));
      break;
    case "save-template":
      saveTemplate();
      break;
    case "close-modal":
      editingTemplate = null;
      render();
      break;
    case "open-settings":
      settingsOpen = true;
      render();
      break;
    case "close-settings":
      settingsOpen = false;
      saveAndRender("Settings saved", true);
      break;
    case "sign-in":
      await signIn();
      break;
    case "sign-up":
      await signUp();
      break;
    case "sign-out":
      await signOut();
      break;
    case "sync-now":
      await pushCloudState(true);
      break;
    case "set-tracking-mode":
      setTrackingMode(element.dataset.scope, Number(element.dataset.exerciseIndex), element.dataset.mode);
      break;
    case "check-update":
      await checkForAppUpdate(true);
      break;
    case "apply-update":
      applyAppUpdate();
      break;
  }
}

function updateBinding(binding, value) {
  const parts = binding.split(".");
  if (parts[0] === "cloud") {
    if (parts[1] === "email") cloudEmail = value;
    if (parts[1] === "password") cloudPassword = value;
    return;
  }

  if (parts[0] === "profile") {
    updateProfileBinding(parts[1], value);
    return;
  }

  if (isWorkoutEditScope(parts[0])) {
    const workout = workoutForScope(parts[0]);
    if (!workout) return;
    updateWorkoutBinding(workout, parts, value);
    persistWorkoutScope(parts[0], "workout-edit");
  }

  if (parts[0] === "template" && editingTemplate) {
    if (parts[1] === "name") editingTemplate.name = value;
    if (parts[1] === "notes") editingTemplate.notes = value;
    if (parts[1] === "exercise") {
      editingTemplate.exercises[Number(parts[2])][parts[3]] = value;
      if (parts[3] === "name") scheduleBiasRender();
    }
    if (parts[1] === "set") {
      const set = editingTemplate.exercises[Number(parts[2])].sets[Number(parts[3])];
      if (parts.length === 6) {
        const side = parts[4];
        set[side] = sideSet(set, side);
        set[side][parts[5]] = normalizeSetFieldValue(parts[5], value);
      } else {
        set[parts[4]] = normalizeSetFieldValue(parts[4], value);
      }
    }
  }
}

function updateWorkoutBinding(workout, parts, value) {
  if (parts[1] === "title") workout.title = value.trimStart() || "Workout";
  if (parts[1] === "workoutNotes") workout.workoutNotes = value;
  if (parts[1] === "startedAt") {
    const startedAt = fromDateTimeLocalValue(value);
    if (startedAt) workout.startedAt = startedAt;
  }
  if (parts[1] === "finishedAt") {
    const finishedAt = fromDateTimeLocalValue(value);
    if (finishedAt) workout.finishedAt = finishedAt;
  }
  if (parts[1] === "durationMinutes") workout.durationSeconds = minutesToDurationSeconds(value);
  if (parts[1] === "restSeconds") workout.restSeconds = normalizeRestSecondsValue(value);
  if (parts[1] === "exercise") {
    const exercise = workout.exercises[Number(parts[2])];
    if (!exercise) return;
    exercise[parts[3]] = value;
    if (parts[3] === "name") scheduleBiasRender();
  }
  if (parts[1] === "set") {
    const set = workout.exercises[Number(parts[2])]?.sets?.[Number(parts[3])];
    if (!set) return;
    if (parts.length === 6) {
      const side = parts[4];
      set[side] = sideSet(set, side);
      set[side][parts[5]] = normalizeSetFieldValue(parts[5], value);
    } else {
      set[parts[4]] = normalizeSetFieldValue(parts[4], value);
    }
  }
}

function startTemplate(id) {
  if (state.activeWorkout) { selectedTab = "train"; render(); showToast("Finish or discard your current workout first"); return; }
  const template = state.templates.find(item => item.id === id);
  if (!template || domain.gymId(template.gymId) !== state.selectedGymId) return;
  state.activeWorkout = workoutFromTemplate(template);
  selectedTab = "train";
  saveAndRender("Workout started");
}

function finishWorkout() {
  if (!state.activeWorkout) return;
  completeActiveWorkout({
    finishedAt: new Date().toISOString(),
    autoCompleted: false,
    toastMessage: "Workout finished"
  });
}

function completeActiveWorkout(options = {}) {
  if (!state.activeWorkout) return null;
  const finishedAt = options.finishedAt ?? new Date().toISOString();
  const session = hydrateWorkoutLike({
    ...deepClone(state.activeWorkout),
    finishedAt,
    durationSeconds: workoutDurationSecondsAt(state.activeWorkout, finishedAt),
    updatedAt: finishedAt,
    revisionAt: new Date().toISOString(),
    autoCompleted: Boolean(options.autoCompleted),
    autoCompletedAt: options.autoCompleted ? new Date().toISOString() : null,
    autoCompleteSource: options.autoCompleteSource ?? null
  });
  session.calorieEstimate = estimateWorkoutCalories(session);
  archiveCompletedSession(session);
  state.sessions = mergeById([session], state.sessions)
    .filter(item => !state.deletedSessionIds?.includes(item.id))
    .sort((a, b) => workoutTimestamp(b) - workoutTimestamp(a));
  selectedCalendarDate = sessionDateKey(session.id) ?? dateKey(new Date());
  visibleCalendarMonth = selectedCalendarDate.slice(0, 7);
  selectedAdviceSessionId = session.id;
  state.selectedGymId = domain.gymId(session.gymId);
  state.activeWorkout = null;
  selectedTab = "calendar";
  saveState(options.autoCompleted ? "auto-complete-workout" : "finish-workout");
  if (options.preserveScroll) {
    renderWithScrollRestore();
  } else if (options.skipRender !== true) {
    render();
  }
  if (!options.silent) showToast(options.toastMessage ?? "Workout finished");
  return session;
}

function autoCompleteExpiredWorkout(source = "timer", options = {}) {
  if (!state.activeWorkout || !activeWorkoutExpired(state.activeWorkout)) return false;
  const finishedAt = activeWorkoutAutoFinishAt(state.activeWorkout);
  const session = completeActiveWorkout({
    finishedAt,
    autoCompleted: true,
    toastMessage: "Workout auto-finished after 4 hours",
    preserveScroll: options.preserveScroll ?? true,
    silent: options.silent ?? false,
    skipRender: options.skipRender ?? false,
    autoCompleteSource: source
  });
  return Boolean(session);
}

function activeWorkoutExpired(workout) {
  return elapsedSeconds(workout) >= maxActiveWorkoutSeconds;
}

function activeWorkoutAutoFinishAt(workout) {
  const started = validDate(workout?.startedAt);
  if (!started) return new Date().toISOString();
  return new Date(started.getTime() + maxActiveWorkoutSeconds * 1000).toISOString();
}

function workoutDurationSecondsAt(workout, finishedAt) {
  const finished = validDate(finishedAt);
  const started = validDate(workout?.startedAt);
  if (!finished || !started) return elapsedSeconds(workout);
  return Math.max(0, Math.floor((finished - started) / 1000));
}

function editSession(id) {
  const session = state.sessions.find(item => item.id === id);
  if (!session) return;
  editingSessionId = id;
  selectedCalendarDate = sessionDateKey(id) ?? selectedCalendarDate;
  visibleCalendarMonth = selectedCalendarDate.slice(0, 7);
  selectedTab = "calendar";
  renderWithScrollRestore();
}

function finishEditingSession(id) {
  const session = state.sessions.find(item => item.id === id);
  if (session) {
    session.updatedAt = new Date().toISOString();
    session.calorieEstimate = estimateWorkoutCalories(session);
    archiveCompletedSession(session);
    selectedCalendarDate = sessionDateKey(id) ?? selectedCalendarDate;
    visibleCalendarMonth = selectedCalendarDate.slice(0, 7);
  }
  editingSessionId = null;
  saveAndRender("Workout updated", true);
}

function editTemplate(id) {
  const template = state.templates.find(item => item.id === id);
  if (!template) return;
  editingTemplate = deepClone(template);
  render();
}

function duplicateTemplate(id) {
  const template = state.templates.find(item => item.id === id);
  if (!template) return;
  const copy = deepClone(template);
  copy.id = uuid();
  copy.name = `${copy.name} Copy`;
  copy.exercises = copy.exercises.map(exercise => ({
    ...exercise,
    id: uuid(),
    sets: []
  }));
  state.templates.unshift(copy);
  selectedTemplateId = copy.id;
  saveAndRender("Template duplicated");
}

function deleteTemplate(id) {
  if (!confirm("Delete template?")) return;
  state.deletedTemplateIds = [...new Set([...state.deletedTemplateIds, id])];
  state.templates = state.templates.filter(template => template.id !== id);
  selectedTemplateId = templatesAtGym()[0]?.id ?? null;
  saveAndRender("Template deleted");
}

function deleteSession(id) {
  if (!confirm("Delete workout from history?")) return;
  state.deletedSessionIds = [...new Set([...(state.deletedSessionIds ?? []), id])];
  state.sessions = state.sessions.filter(session => session.id !== id);
  selectedAdviceSessionId = sessionsAtGym()[0]?.id ?? null;
  if (editingSessionId === id) editingSessionId = null;
  saveAndRender("Workout deleted");
}

function saveTemplate() {
  if (!editingTemplate) return;
  const normalized = {
    ...editingTemplate,
    name: editingTemplate.name.trim() || "Workout",
    revisionAt: new Date().toISOString(),
    notes: editingTemplate.notes.trim(),
    updatedAt: new Date().toISOString(),
    exercises: editingTemplate.exercises
      .map(exercise => ({
        id: exercise.id ?? uuid(),
        name: exercise.name.trim(),
        notes: exercise.notes.trim(),
        equipment: String(exercise.equipment || "").trim(),
        loadUnit: domain.unit(exercise),
        trackingMode: isUnilateralExercise(exercise) ? "unilateral" : "bilateral",
        sets: []
      }))
      .filter(exercise => exercise.name)
  };
  const index = state.templates.findIndex(template => template.id === normalized.id);
  if (index >= 0) {
    state.templates[index] = normalized;
  } else {
    state.templates.unshift(normalized);
  }
  selectedTemplateId = normalized.id;
  editingTemplate = null;
  saveAndRender("Template saved");
}

function addExerciseToScope(scope) {
  const target = workoutForScope(scope);
  if (!target) return;
  target.exercises.push(newExercise("New Exercise"));
  persistWorkoutScope(scope, "add-exercise");
  renderWithScrollRestore();
}

function removeExercise(scope, exerciseIndex) {
  const target = workoutForScope(scope);
  if (!target) return;
  target.exercises.splice(exerciseIndex, 1);
  persistWorkoutScope(scope, "remove-exercise");
  renderWithScrollRestore();
}

function setTrackingMode(scope, exerciseIndex, mode) {
  const target = workoutForScope(scope);
  if (!target) return;
  const exercise = target.exercises[exerciseIndex];
  if (!exercise) return;
  exercise.trackingMode = mode === "unilateral" ? "unilateral" : "bilateral";
  exercise.sets = (exercise.sets ?? []).map(set => hydrateSet(set, exercise.trackingMode));
  persistWorkoutScope(scope, "tracking-mode");
  renderWithScrollRestore();
}

function reorderExercise(scope, fromIndex, toIndex) {
  if (!isEditableScope(scope)) return;
  if (fromIndex === toIndex) return;
  const target = workoutForScope(scope);
  if (!target?.exercises) return;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= target.exercises.length || toIndex >= target.exercises.length) return;
  const [moved] = target.exercises.splice(fromIndex, 1);
  target.exercises.splice(toIndex, 0, moved);
  persistWorkoutScope(scope, "reorder-exercise");
  renderWithScrollRestore();
  showToast("Exercise reordered");
}

function startPointerDrag(event, handle) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  pointerDragState = {
    scope: handle.dataset.scope,
    fromIndex: Number(handle.dataset.dragExerciseIndex),
    overIndex: Number(handle.dataset.dragExerciseIndex),
    pointerId: event.pointerId
  };
  handle.setPointerCapture?.(event.pointerId);
  handle.closest(".exercise-card")?.classList.add("dragging");
  event.preventDefault();
}

function updatePointerDrag(event) {
  if (!pointerDragState || pointerDragState.pointerId !== event.pointerId) return;
  const card = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-drop-exercise-index]");
  document.querySelectorAll(".exercise-card.drag-over").forEach(item => item.classList.remove("drag-over"));
  if (!card || card.dataset.scope !== pointerDragState.scope) return;
  pointerDragState.overIndex = Number(card.dataset.dropExerciseIndex);
  card.classList.add("drag-over");
}

function finishPointerDrag(event) {
  if (!pointerDragState || pointerDragState.pointerId !== event.pointerId) return;
  const { scope, fromIndex, overIndex } = pointerDragState;
  cancelPointerDrag();
  reorderExercise(scope, fromIndex, overIndex);
}

function cancelPointerDrag() {
  pointerDragState = null;
  document.querySelectorAll(".exercise-card.dragging, .exercise-card.drag-over").forEach(card => {
    card.classList.remove("dragging", "drag-over");
  });
}

function addSet(scope, exerciseIndex) {
  const target = workoutForScope(scope);
  if (!target) return;
  const sets = target.exercises[exerciseIndex].sets;
  sets.push(newSet());
  persistWorkoutScope(scope, "add-set");
  renderWithScrollRestore();
}

function removeSet(scope, exerciseIndex, setIndex) {
  const target = workoutForScope(scope);
  if (!target) return;
  target.exercises[exerciseIndex].sets.splice(setIndex, 1);
  persistWorkoutScope(scope, "remove-set");
  renderWithScrollRestore();
}

function newWorkout(title, exercises) {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    title,
    gymId: state.selectedGymId,
    revisionAt: now,
    startedAt: now,
    updatedAt: now,
    restSeconds: "",
    workoutNotes: "",
    exercises
  };
}

function workoutFromTemplate(template, title = template.name) {
  return newWorkout(
    title,
    template.exercises.map(exercise => ({
      id: uuid(),
      name: exercise.name,
      equipment: exercise.equipment || "",
      loadUnit: domain.unit(exercise),
      notes: exercise.notes,
      trackingMode: isUnilateralExercise(exercise) ? "unilateral" : "bilateral",
      sets: [newSet()]
    }))
  );
}

function newTemplate() {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    name: "New Workout",
    gymId: state.selectedGymId,
    revisionAt: now,
    updatedAt: now,
    notes: "",
    exercises: [newTemplateExercise("New Exercise")]
  };
}

function newTemplateExercise(name) {
  return {
    id: uuid(),
    name,
    equipment: "",
    loadUnit: state.profile.weightUnit || "lb",
    notes: "",
    trackingMode: "bilateral",
    sets: []
  };
}

function newExercise(name) {
  return {
    id: uuid(),
    name,
    equipment: "",
    loadUnit: state.profile.weightUnit || "lb",
    notes: "",
    trackingMode: "bilateral",
    sets: [newSet()]
  };
}

function newSet(weight = "", reps = "", rir = "") {
  return {
    id: uuid(),
    createdAt: new Date().toISOString(),
    weight,
    reps,
    rir,
    left: newSideSet(),
    right: newSideSet()
  };
}

function newSideSet(weight = "", reps = "", rir = "") {
  return { weight, reps, rir };
}

function countSets(exercises) {
  return exercises.reduce((total, exercise) => total + (exercise.sets?.length ?? 0), 0);
}

function averageRir(exercises) {
  const rirValues = exercises
    .flatMap(exercise => loggedSetEntries(exercise))
    .map(entry => rirToNumber(entry.rir))
    .filter(value => value != null);
  if (!rirValues.length) return "—";
  return (rirValues.reduce((total, value) => total + value, 0) / rirValues.length).toFixed(1);
}

function averageWeight(exercises) {
  const weightedSets = exercises.flatMap(exercise => loggedSetEntries(exercise)).filter(set => Number(set.weight) > 0);
  if (!weightedSets.length) return "0";
  const average = weightedSets.reduce((total, set) => total + Number(set.weight || 0), 0) / weightedSets.length;
  return String(Math.round(average));
}

function displaySetValue(value) {
  return value === "" || value == null ? "-" : value;
}

function renderCalorieNote(estimate) {
  if (!estimate.ready) {
    return `
      <div class="calorie-note">
        ${icon("flame")}
        <span>Add ${escapeHtml(joinLabels(estimate.missing))} in settings for calorie estimates.</span>
      </div>
    `;
  }

  return `
    <div class="calorie-note">
      ${icon("flame")}
      <span>${estimate.rangeLow}-${estimate.rangeHigh} kcal range, ${escapeHtml(estimate.intensityLabel)}, ${escapeHtml(estimate.restLabel)} avg rest.</span>
    </div>
  `;
}

function calorieDisplayValue(estimate) {
  return estimate.ready ? String(estimate.calories) : "--";
}

function calorieReadinessLabel() {
  const missing = calorieProfileMissingFields(state.profile);
  return missing.length ? `Needs ${joinLabels(missing)}` : "Ready";
}

function estimateWorkoutCalories(workout, profile = state.profile) {
  const missing = calorieProfileMissingFields(profile);
  const durationSeconds = Math.max(60, elapsedSeconds(workout));
  if (missing.length) {
    return {
      ready: false,
      missing,
      calories: null,
      rangeLow: null,
      rangeHigh: null,
      intensityLabel: "estimate unavailable",
      restLabel: "auto"
    };
  }

  const weightKg = profileWeightKg(profile);
  const heightCm = profileHeightCm(profile);
  const age = numberFromInput(profile.age);
  const entries = calorieSetEntries(workout);
  const setCount = Math.max(1, entries.length || countSets(workout?.exercises ?? []));
  const avgRir = averageRirNumber(workout?.exercises ?? []);
  const workSeconds = estimatedWorkSeconds(entries, durationSeconds);
  const rest = estimatedRestSeconds(workout, profile, setCount, durationSeconds, workSeconds);
  const otherSeconds = Math.max(0, durationSeconds - workSeconds - rest.totalSeconds);
  const bmr = mifflinStJeor({ weightKg, heightCm, age, gender: profile.gender });
  const workMet = workoutMet(workout, entries, avgRir, rest.averageSeconds, profile);
  const restMet = rest.averageSeconds >= 180 ? 1.35 : 1.55;
  const otherMet = 1.75;
  const durationMinutes = durationSeconds / 60;
  const restingCalories = (bmr / 1440) * durationMinutes;
  const calories =
    restingCalories +
    netMetCalories(workMet, workSeconds, weightKg) +
    netMetCalories(restMet, rest.totalSeconds, weightKg) +
    netMetCalories(otherMet, otherSeconds, weightKg);
  const rounded = Math.max(1, Math.round(calories));

  return {
    ready: true,
    missing: [],
    calories: rounded,
    rangeLow: Math.max(1, Math.round(rounded * 0.82)),
    rangeHigh: Math.max(1, Math.round(rounded * 1.18)),
    intensityLabel: calorieIntensityLabel(workMet),
    restLabel: rest.source === "auto" ? `auto ${Math.round(rest.averageSeconds)}s` : `${Math.round(rest.averageSeconds)}s`
  };
}

function calorieProfileMissingFields(profile = defaultProfile()) {
  const missing = [];
  if (!profileWeightKg(profile)) missing.push("weight");
  if (!profileHeightCm(profile)) missing.push("height");
  if (!positiveNumber(profile.age)) missing.push("age");
  if (!["male", "female", "other"].includes(profile.gender)) missing.push("gender");
  return missing;
}

function calorieSetEntries(workout) {
  const entries = (workout?.exercises ?? []).flatMap(exercise => loggedSetEntries(exercise));
  const logged = entries.filter(hasLoggedSetValue);
  return logged.length ? logged : entries;
}

function averageRirNumber(exercises) {
  const values = exercises
    .flatMap(exercise => loggedSetEntries(exercise))
    .map(entry => rirToNumber(entry.rir))
    .filter(value => value != null);
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function estimatedWorkSeconds(entries, durationSeconds) {
  const rawSeconds = entries.reduce((total, entry) => {
    const reps = positiveNumber(entry.reps) || 8;
    return total + clamp(18 + reps * 3.2, 25, 80);
  }, 0);
  if (!durationSeconds) return rawSeconds;
  return Math.min(rawSeconds, durationSeconds * 0.82);
}

function estimatedRestSeconds(workout, profile, setCount, durationSeconds, workSeconds) {
  const intervals = Math.max(0, setCount - 1);
  const openSeconds = Math.max(0, durationSeconds - workSeconds);
  const configured = configuredAverageRestSeconds(workout, profile);
  if (configured && intervals) {
    return {
      averageSeconds: configured.seconds,
      totalSeconds: Math.min(openSeconds, configured.seconds * intervals),
      source: configured.source
    };
  }

  const inferredAverage = intervals ? openSeconds / intervals : 0;
  return {
    averageSeconds: inferredAverage,
    totalSeconds: openSeconds,
    source: "auto"
  };
}

function configuredAverageRestSeconds(workout, profile = state.profile) {
  const workoutRest = positiveNumber(workout?.restSeconds);
  if (workoutRest != null) return { seconds: workoutRest, source: "workout" };
  const defaultRest = positiveNumber(profile?.defaultRestSeconds);
  if (defaultRest != null) return { seconds: defaultRest, source: "settings" };
  return null;
}

function restSecondsPlaceholder(workout) {
  const durationSeconds = elapsedSeconds(workout);
  const entries = calorieSetEntries(workout);
  const setCount = Math.max(1, entries.length || countSets(workout?.exercises ?? []));
  const workSeconds = estimatedWorkSeconds(entries, durationSeconds);
  const rest = estimatedRestSeconds(workout, state.profile, setCount, durationSeconds, workSeconds);
  return rest.averageSeconds ? `Auto ${Math.round(rest.averageSeconds)}s` : "Auto";
}

function workoutMet(workout, entries, avgRir, averageRestSeconds, profile = state.profile) {
  const effortFactor = avgRir == null ? 0 : clamp((3 - avgRir) * 0.18, -0.35, 0.5);
  const densityFactor = averageRestSeconds < 60 ? 0.35 : averageRestSeconds > 240 ? -0.25 : 0;
  const loadFactor = externalLoadFactor(entries, profile);
  return clamp(5.1 + effortFactor + densityFactor + loadFactor, 3.8, 7.2);
}

function externalLoadFactor(entries, profile = state.profile) {
  const bodyKg = profileWeightKg(profile);
  if (!bodyKg) return 0;
  const totalReps = entries.reduce((total, entry) => total + (positiveNumber(entry.reps) || 0), 0);
  const totalLoad = entries.reduce((total, entry) => total + (positiveNumber(entry.weight) || 0) * (positiveNumber(entry.reps) || 0), 0);
  if (!totalReps || !totalLoad) return 0;
  const averageLoad = totalLoad / totalReps;
  const averageLoadKg = profile.weightUnit === "kg" ? averageLoad : averageLoad / 2.20462;
  const relativeLoad = averageLoadKg / bodyKg;
  return clamp((relativeLoad - 0.35) * 0.22, -0.1, 0.35);
}

function calorieIntensityLabel(met) {
  if (met >= 6.2) return "high effort";
  if (met >= 5) return "moderate effort";
  return "lower effort";
}

function netMetCalories(met, seconds, weightKg) {
  const minutes = seconds / 60;
  return Math.max(0, met - 1) * 3.5 * weightKg / 200 * minutes;
}

function mifflinStJeor({ weightKg, heightCm, age, gender }) {
  const sexConstant = gender === "male" ? 5 : gender === "female" ? -161 : -78;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;
}

function profileWeightKg(profile = defaultProfile()) {
  const weight = positiveNumber(profile.weight);
  if (!weight) return null;
  return profile.weightUnit === "kg" ? weight : weight / 2.20462;
}

function profileHeightCm(profile = defaultProfile()) {
  if (profile.heightUnit === "cm") return positiveNumber(profile.height);
  const inches = heightInchesFromInput(profile.height);
  return inches ? inches * 2.54 : null;
}

function heightInchesFromInput(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return null;
  const parts = text.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!parts.length) return null;
  const hasFeetSyntax = /'|ft|feet|\s/.test(text) && parts.length >= 2;
  if (hasFeetSyntax) {
    const inches = parts[0] * 12 + parts[1];
    return inches >= 36 && inches <= 96 ? inches : null;
  }
  const inches = parts[0];
  return inches >= 36 && inches <= 96 ? inches : null;
}

function positiveNumber(value) {
  const parsed = numberFromInput(value);
  return parsed > 0 ? parsed : null;
}

function numberFromInput(value) {
  const parsed = Number(String(value ?? "").replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function defaultProfile() {
  return {
    weight: "",
    weightUnit: "lb",
    height: "",
    heightUnit: "in",
    age: "",
    gender: "",
    defaultRestSeconds: "",
    updatedAt: null
  };
}

function hydrateProfile(profile = {}) {
  const defaults = defaultProfile();
  return {
    ...defaults,
    weight: cleanProfileText(profile.weight),
    weightUnit: profile.weightUnit === "kg" ? "kg" : "lb",
    height: cleanProfileText(profile.height),
    heightUnit: profile.heightUnit === "cm" ? "cm" : "in",
    age: cleanProfileText(profile.age),
    gender: ["male", "female", "other"].includes(profile.gender) ? profile.gender : "",
    defaultRestSeconds: cleanProfileText(profile.defaultRestSeconds),
    updatedAt: profile.updatedAt ?? null
  };
}

function hydrateCalorieEstimate(estimate) {
  if (!estimate || typeof estimate !== "object") return null;
  return {
    ready: Boolean(estimate.ready),
    missing: Array.isArray(estimate.missing) ? estimate.missing.map(String) : [],
    calories: Number.isFinite(Number(estimate.calories)) ? Math.round(Number(estimate.calories)) : null,
    rangeLow: Number.isFinite(Number(estimate.rangeLow)) ? Math.round(Number(estimate.rangeLow)) : null,
    rangeHigh: Number.isFinite(Number(estimate.rangeHigh)) ? Math.round(Number(estimate.rangeHigh)) : null,
    intensityLabel: String(estimate.intensityLabel ?? ""),
    restLabel: String(estimate.restLabel ?? "")
  };
}

function updateProfileBinding(field, value) {
  state.profile = hydrateProfile({
    ...(state.profile ?? defaultProfile()),
    [field]: value,
    updatedAt: new Date().toISOString()
  });
  saveState("profile");
}

function cleanProfileText(value) {
  return String(value ?? "").trimStart().slice(0, 24);
}

function normalizeRestSecondsValue(value) {
  if (String(value ?? "").trim() === "") return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return Math.round(Math.min(parsed, 900));
}

function joinLabels(labels) {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampNumber(value, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(max, Math.round(parsed)));
}

function clampOptionalNumber(value, max) {
  if (String(value).trim() === "") return "";
  return clampNumber(value, max);
}

function normalizeSetFieldValue(field, value) {
  if (field === "rir") return normalizeRirValue(value);
  return clampOptionalNumber(value, maxForSetField(field));
}

function normalizeRirValue(value) {
  return String(value ?? "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .trim()
    .slice(0, 20);
}

function rirToNumber(value) {
  const text = normalizeRirValue(value);
  if (!text) return null;
  const matches = text.match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return null;
  const values = matches
    .map(Number)
    .filter(Number.isFinite)
    .map(number => Math.max(0, Math.min(10, number)));
  if (!values.length) return null;
  return values.reduce((total, number) => total + number, 0) / values.length;
}

function maxForSetField(field) {
  if (field === "weight") return 2000;
  return 100;
}

function sessionScope(id) {
  return `session:${id}`;
}

function isSessionScope(scope) {
  return String(scope ?? "").startsWith("session:");
}

function sessionIdFromScope(scope) {
  return String(scope ?? "").slice("session:".length);
}

function isWorkoutEditScope(scope) {
  return scope === "active" || isSessionScope(scope);
}

function isEditableScope(scope) {
  return scope === "template" || isWorkoutEditScope(scope);
}

function workoutForScope(scope) {
  if (scope === "template") return editingTemplate;
  if (scope === "active") return state.activeWorkout;
  if (isSessionScope(scope)) return state.sessions.find(session => session.id === sessionIdFromScope(scope)) ?? null;
  return null;
}

function persistWorkoutScope(scope, reason = "workout-edit") {
  if (scope === "active") {
    saveState(reason);
    return;
  }
  if (isSessionScope(scope)) {
    const session = workoutForScope(scope);
    if (!session) return;
    session.updatedAt = new Date().toISOString();
    session.revisionAt = session.updatedAt;
    archiveCompletedSession(session);
    saveState(reason);
  }
}

function exerciseNameForSet(scope, exerciseIndex) {
  return exerciseForSet(scope, exerciseIndex)?.name ?? "";
}

function exerciseForSet(scope, exerciseIndex) {
  const target = workoutForScope(scope);
  return target?.exercises?.[exerciseIndex] ?? null;
}

function previousSetForExercise(exercise, setIndex, side = null, scope = "active") {
  const previous = domain.previous(state.sessions, workoutForScope(scope), exercise);
  const set = previous?.exercise.sets?.[setIndex];
  return set ? (side ? sideSet(set, side) : set) : null;
}

function previousPlaceholder(previous, field) {
  if (!previous || previous[field] === "" || previous[field] == null) return "—";
  return `Prev ${previous[field]}`;
}

function hasLoggedSetValue(set) {
  return Number(set?.weight) > 0 || Number(set?.reps) > 0 || String(set?.rir ?? "").trim() !== "";
}

function isUnilateralExercise(exercise) {
  return exercise?.trackingMode === "unilateral" || exercise?.unilateral === true;
}

function sideSet(set, side) {
  const source = set?.[side] ?? {};
  return {
    weight: source.weight ?? "",
    reps: source.reps ?? "",
    rir: source.rir ?? ""
  };
}

function loggedSetEntries(exercise) {
  if (!exercise) return [];
  if (!isUnilateralExercise(exercise)) return exercise.sets ?? [];
  return (exercise.sets ?? []).flatMap(set => [sideSet(set, "left"), sideSet(set, "right")]);
}

function normalizeExerciseName(name) {
  return String(name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function trackedExerciseNames() {
  return domain.series(state.sessions, state.selectedGymId).map(item => item.key);
}

function firstTrackedExerciseName() {
  return trackedExerciseNames()[0] ?? "";
}

function strengthPointsForExercise(key) {
  return domain.points(state.sessions, state.selectedGymId, key).map(point => ({ ...point, date: dateKey(new Date(point.finishedAt)) }));
}

function bestStrengthSet(exercise) {
  return loggedSetEntries(exercise)
    .filter(set => Number(set.weight) > 0 && Number(set.reps) > 0)
    .sort((a, b) => estimatedOneRepMax(b) - estimatedOneRepMax(a))[0] ?? null;
}

function estimatedOneRepMax(set) {
  return Math.round(Number(set.weight) * (1 + Number(set.reps) / 30));
}

function strengthDelta(points) {
  if (points.length < 2) return "—";
  const delta = points.at(-1).estimate - points[0].estimate;
  return `${delta > 0 ? "+" : ""}${delta}`;
}

function renderStrengthGraph(points) {
  if (!points.length) return `<div class="empty">No completed sets for this exercise yet.</div>`;
  if (points.length === 1) return `<div class="empty">One data point logged. Complete this exercise again to draw a trend.</div>`;
  const width = 640;
  const height = 220;
  const pad = 28;
  const values = points.map(point => point.estimate);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const coords = points.map((point, index) => {
    const timeSpan = points.at(-1).timestamp - points[0].timestamp;
    const fraction = timeSpan > 0 ? (point.timestamp - points[0].timestamp) / timeSpan : index / Math.max(1, points.length - 1);
    const x = pad + fraction * (width - pad * 2);
    const y = height - pad - ((point.estimate - min) / span) * (height - pad * 2);
    return { x, y, point };
  });
  const polyline = coords.map(coord => `${coord.x},${coord.y}`).join(" ");
  return `
    <svg class="strength-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="Strength trend graph">
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" />
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" />
      <polyline points="${polyline}" />
      ${coords.map(coord => `<circle cx="${coord.x}" cy="${coord.y}" r="5"><title>${coord.point.date}: ${coord.point.estimate}</title></circle>`).join("")}
      <text x="${pad}" y="${pad - 8}">${max}</text>
      <text x="${pad}" y="${height - 8}">${min}</text>
      <text x="${pad + 28}" y="${height - 8}">${points[0].date}</text>
      <text x="${width - pad}" y="${height - 8}" text-anchor="end">${points.at(-1).date}</text>
    </svg>
  `;
}

function elapsedSeconds(workout) {
  if (!workout) return 0;
  if (Number.isFinite(workout.durationSeconds)) return workout.durationSeconds;
  const end = validDate(workout.finishedAt) ?? new Date();
  const start = validDate(workout.startedAt);
  if (!start) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

function formatWorkoutDuration(workout) {
  const totalSeconds = elapsedSeconds(workout);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function durationMinutesValue(workout) {
  return String(Math.round(elapsedSeconds(workout) / 60));
}

function minutesToDurationSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(Math.min(parsed, 1440) * 60);
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = validDate(value);
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value) {
  if (!value) return null;
  return validDate(value)?.toISOString() ?? null;
}

function startTimerRefresh() {
  clearInterval(timerInterval);
  if (!state.activeWorkout) return;
  timerInterval = setInterval(() => {
    if (autoCompleteExpiredWorkout("timer", { preserveScroll: true })) {
      clearInterval(timerInterval);
      return;
    }
    document.querySelectorAll("[data-workout-timer]").forEach(element => {
      element.textContent = formatWorkoutDuration(state.activeWorkout);
    });
  }, 1000);
}

function hydrateState(rawState) {
  const normalized = {
    templates: Array.isArray(rawState.templates) ? rawState.templates : [],
    activeWorkout: rawState.activeWorkout ?? null,
    sessions: Array.isArray(rawState.sessions) ? rawState.sessions : [],
    schemaVersion: 2,
    selectedGymId: domain.gyms.some(gym => gym.id === rawState.selectedGymId) ? rawState.selectedGymId : "apartment",
    deletedTemplateIds: Array.isArray(rawState.deletedTemplateIds) ? rawState.deletedTemplateIds : [],
    deletedSessionIds: Array.isArray(rawState.deletedSessionIds) ? rawState.deletedSessionIds : [],
    profile: hydrateProfile(rawState.profile),
    updatedAt: rawState.updatedAt ?? null
  };
  normalized.templates = normalized.templates.filter(template => !isSeedTemplate(template) && !normalized.deletedTemplateIds.includes(template.id)).map(hydrateWorkoutLike);
  normalized.sessions = mergeById(normalized.sessions.map(hydrateWorkoutLike));
  normalized.deletedSessionIds = [...new Set(normalized.deletedSessionIds.filter(Boolean))];
  normalized.sessions = normalized.sessions.filter(session => !normalized.deletedSessionIds.includes(session.id));
  if (normalized.activeWorkout) normalized.activeWorkout = hydrateWorkoutLike(normalized.activeWorkout);
  if (normalized.activeWorkout && (normalized.sessions.some(session => session.id === normalized.activeWorkout.id) || normalized.deletedSessionIds.includes(normalized.activeWorkout.id))) normalized.activeWorkout = null;
  normalized.updatedAt = normalized.updatedAt ?? latestStateTimestamp(normalized);
  return normalized;
}

function hydrateWorkoutLike(workout) {
  return {
    ...workout,
    id: workout.id ?? uuid(),
    gymId: domain.gymId(workout.gymId),
    restSeconds: normalizeRestSecondsValue(workout.restSeconds ?? ""),
    calorieEstimate: hydrateCalorieEstimate(workout.calorieEstimate),
    autoCompleted: Boolean(workout.autoCompleted),
    autoCompletedAt: workout.autoCompletedAt ?? null,
    autoCompleteSource: workout.autoCompleteSource ?? null,
    exercises: Array.isArray(workout.exercises)
      ? workout.exercises.map(exercise => ({
          ...exercise,
          id: exercise.id ?? uuid(),
          equipment: String(exercise.equipment || ""),
          loadUnit: domain.unit(exercise),
          trackingMode: isUnilateralExercise(exercise) ? "unilateral" : "bilateral",
          sets: Array.isArray(exercise.sets)
            ? exercise.sets.map(set => hydrateSet(set, isUnilateralExercise(exercise) ? "unilateral" : "bilateral"))
            : []
        }))
      : []
  };
}

function hydrateSet(set = {}, trackingMode = "bilateral") {
  const hydrated = {
    ...set,
    id: set.id ?? uuid(),
    createdAt: set.createdAt ?? null,
    weight: normalizeSetFieldValue("weight", set.weight ?? ""),
    reps: normalizeSetFieldValue("reps", set.reps ?? ""),
    rir: normalizeSetFieldValue("rir", set.rir ?? ""),
    left: hydrateSideSet(set.left),
    right: hydrateSideSet(set.right)
  };

  if (trackingMode === "unilateral" && !set.left && !set.right && hasLoggedSetValue(set)) {
    hydrated.left = hydrateSideSet(set);
    hydrated.right = hydrateSideSet(set);
  }

  return hydrated;
}

function hydrateSideSet(set = {}) {
  return {
    weight: normalizeSetFieldValue("weight", set.weight ?? ""),
    reps: normalizeSetFieldValue("reps", set.reps ?? ""),
    rir: normalizeSetFieldValue("rir", set.rir ?? "")
  };
}

function sessionsByMostRecentDay() {
  const groups = new Map();
  for (const session of sessionsAtGym()) {
    const key = sessionDateKeyFromRecord(session);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(session);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, sessions]) => ({ key, sessions }));
}

function sessionsForDate(key) {
  return sessionsAtGym().filter(session => sessionDateKeyFromRecord(session) === key);
}

function adviceSession() {
  return sessionsAtGym().find(session => session.id === selectedAdviceSessionId) ?? sessionsForDate(selectedCalendarDate)[0] ?? sessionsAtGym()[0] ?? null;
}

function buildAdvice(session) {
  const recent = sessionsInLastDays(14);
  const frequency = new Set(recent.map(sessionDateKeyFromRecord)).size;
  const totalSets = session.exercises.reduce((total, exercise) => total + loggedSetEntries(exercise).filter(set => Number(set.reps) > 0).length, 0);
  const avgRir = averageRir(session.exercises);
  const cards = [{ label: "Comparison scope", title: domain.gymName(session.gymId),
    body: "Progress and previous-set hints match this gym, exercise, machine/setup, tracking mode and weight unit. Left and right sides have separate charts." },
    { label: "Consistency", title: `${frequency} training days in the last 14 days`,
    body: "This attendance count includes all gyms. Switching locations still counts as training; strength comparisons remain separate." },
    { label: "Logged work", title: `${totalSets} logged set entries`,
    body: "Only entries with reps count here; blank rows are excluded. Left and right are counted separately. Set count alone does not establish training quality or whether you need more volume." },
    { label: "Effort", title: avgRir === "—" ? "No RIR recorded" : `${avgRir} average RIR`,
    body: avgRir === "—" ? "Missing RIR is unknown, not zero. Record it when useful for comparing effort across sessions." : "This average uses only the RIR values you entered. Compare load and reps alongside effort and consistent technique." }];
  return { overview: "A summary of what you logged, with separate progress for each gym.", frequency, totalSets,
    averageRir: avgRir, muscleSummary: summarizeMuscleSets(session.exercises), cards };
}

function adviceOverview(frequency, totalSets, avgRir) {
  if (frequency <= 1) return "Biggest lever: train more consistently before chasing advanced tweaks.";
  if (totalSets > 24) return "Biggest lever: improve set quality by spreading or trimming volume.";
  if (avgRir >= 4) return "Biggest lever: make working sets harder while preserving technique.";
  return "Biggest lever: repeat this structure and progress reps or load deliberately.";
}

function sessionsInLastDays(days) {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return state.sessions.filter(session => workoutDate(session) >= cutoff && workoutDate(session) <= now);
}

function summarizeMuscleSets(exercises) {
  const totals = new Map();
  for (const exercise of exercises) {
    const bias = muscleBiasForExercise(exercise.name);
    if (!bias) continue;
    const count = loggedSetEntries(exercise).filter(set => Number(set.reps) > 0).length;
    if (!count) continue;
    for (const muscle of bias.muscles) {
      totals.set(muscle, (totals.get(muscle) ?? 0) + count);
    }
  }
  return [...totals.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets);
}

function sessionDateKey(sessionId) {
  const session = state.sessions.find(item => item.id === sessionId);
  return session ? sessionDateKeyFromRecord(session) : null;
}

function latestStateTimestamp(value) {
  const candidates = [value?.updatedAt];
  for (const session of value?.sessions ?? []) {
    candidates.push(session.updatedAt, session.finishedAt, session.startedAt);
  }
  for (const template of value?.templates ?? []) {
    candidates.push(template.updatedAt, template.startedAt);
  }
  candidates.push(value?.profile?.updatedAt);
  if (value?.activeWorkout) candidates.push(value.activeWorkout.updatedAt, value.activeWorkout.startedAt);
  const latest = candidates
    .map(item => (item ? new Date(item).getTime() : 0))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  return latest ? new Date(latest).toISOString() : new Date(0).toISOString();
}

function recordTimestamp(record) {
  return validDate(record?.updatedAt ?? record?.finishedAt ?? record?.startedAt ?? 0)?.getTime() ?? 0;
}

function stateHasUserData(value) {
  return Boolean(
    value?.activeWorkout ||
    (value?.sessions ?? []).length ||
    (value?.templates ?? []).length ||
    profileDataScore(hydrateProfile(value?.profile)) > 0
  );
}

function mergeCloudStates(localValue, remoteValue) {
  const local = hydrateState(localValue ?? {});
  const remote = hydrateState(remoteValue ?? {});
  return {
    schemaVersion: 2,
    selectedGymId: local.selectedGymId,
    deletedTemplateIds: [...new Set([...local.deletedTemplateIds, ...remote.deletedTemplateIds])],
    templates: mergeById(local.templates, remote.templates),
    sessions: mergeById(local.sessions, remote.sessions).sort((a, b) => workoutTimestamp(b) - workoutTimestamp(a)),
    activeWorkout: newestWorkout(local.activeWorkout, remote.activeWorkout),
    profile: mergeProfileRecords(local.profile, remote.profile),
    deletedSessionIds: [...new Set([...(local.deletedSessionIds ?? []), ...(remote.deletedSessionIds ?? [])])],
    updatedAt: [latestStateTimestamp(local), latestStateTimestamp(remote)].sort().at(-1)
  };
}

function mergeProfileRecords(left, right) {
  const leftProfile = hydrateProfile(left);
  const rightProfile = hydrateProfile(right);
  const leftScore = profileDataScore(leftProfile);
  const rightScore = profileDataScore(rightProfile);
  if (Math.abs(leftScore - rightScore) >= 1) return leftScore >= rightScore ? leftProfile : rightProfile;
  return recordTimestamp(leftProfile) >= recordTimestamp(rightProfile) ? leftProfile : rightProfile;
}

function profileDataScore(profile) {
  let score = 0;
  if (profileWeightKg(profile)) score += 1;
  if (profileHeightCm(profile)) score += 1;
  if (positiveNumber(profile.age)) score += 1;
  if (profile.gender) score += 1;
  if (positiveNumber(profile.defaultRestSeconds)) score += 0.5;
  return score;
}

function mergeById(...groups) {
  const items = new Map();
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      if (!item?.id) continue;
      const existing = items.get(item.id);
      items.set(item.id, existing ? mergeWorkoutRecords(existing, item) : item);
    }
  }
  return [...items.values()];
}

function newestWorkout(left, right) {
  if (!left) return right ?? null;
  if (!right) return left;
  return mergeWorkoutRecords(left, right);
}

function mergeWorkoutRecords(left, right) {
  const leftWorkout = hydrateWorkoutLike(left);
  const rightWorkout = hydrateWorkoutLike(right);
  // A complete edited record is authoritative; recovery must not resurrect removed rows or old gym labels.
  if (leftWorkout.revisionAt || rightWorkout.revisionAt) {
    const leftTime = Math.max(recordTimestamp(leftWorkout), Date.parse(leftWorkout.revisionAt) || 0);
    const rightTime = Math.max(recordTimestamp(rightWorkout), Date.parse(rightWorkout.revisionAt) || 0);
    if (leftTime === rightTime) return leftWorkout.revisionAt ? leftWorkout : rightWorkout;
    return leftTime > rightTime ? leftWorkout : rightWorkout;
  }
  const preferred = preferWorkoutRecord(leftWorkout, rightWorkout);
  const fallback = preferred === leftWorkout ? rightWorkout : leftWorkout;
  return {
    ...fallback,
    ...preferred,
    workoutNotes: preferred.workoutNotes || fallback.workoutNotes || "",
    notes: preferred.notes || fallback.notes || "",
    restSeconds: preferred.restSeconds !== "" && preferred.restSeconds != null ? preferred.restSeconds : fallback.restSeconds ?? "",
    calorieEstimate: preferred.calorieEstimate ?? fallback.calorieEstimate ?? null,
    exercises: mergeExerciseLists(preferred.exercises, fallback.exercises),
    updatedAt: preferred.updatedAt ?? fallback.updatedAt ?? new Date(Math.max(recordTimestamp(preferred), recordTimestamp(fallback))).toISOString()
  };
}

function preferWorkoutRecord(left, right) {
  const leftScore = workoutDataScore(left);
  const rightScore = workoutDataScore(right);
  if (Math.abs(leftScore - rightScore) >= 2) return leftScore >= rightScore ? left : right;
  return recordTimestamp(left) >= recordTimestamp(right) ? left : right;
}

function workoutDataScore(workout) {
  if (!workout) return 0;
  let score = 0;
  if (workout.title || workout.name) score += 1;
  if (workout.workoutNotes) score += 4 + Math.min(10, String(workout.workoutNotes).length / 20);
  if (workout.notes) score += 2 + Math.min(6, String(workout.notes).length / 30);
  for (const exercise of workout.exercises ?? []) {
    score += exerciseDataScore(exercise);
  }
  return score;
}

function mergeExerciseLists(primary = [], secondary = []) {
  const secondaryByKey = new Map();
  secondary.forEach((exercise, index) => {
    secondaryByKey.set(exerciseMergeKey(exercise, index), exercise);
  });
  const used = new Set();
  const merged = primary.map((exercise, index) => {
    const key = exerciseMergeKey(exercise, index);
    const fallback = secondaryByKey.get(key);
    used.add(key);
    return fallback ? mergeExerciseRecords(exercise, fallback) : exercise;
  });
  secondary.forEach((exercise, index) => {
    const key = exerciseMergeKey(exercise, index);
    if (!used.has(key)) merged.push(exercise);
  });
  return merged;
}

function exerciseMergeKey(exercise, index) {
  return exercise?.id || normalizeExerciseName(exercise?.name) || `exercise-${index}`;
}

function mergeExerciseRecords(left, right) {
  const preferred = preferExerciseRecord(left, right);
  const fallback = preferred === left ? right : left;
  return {
    ...fallback,
    ...preferred,
    notes: preferred.notes || fallback.notes || "",
    sets: mergeSetLists(preferred.sets, fallback.sets)
  };
}

function preferExerciseRecord(left, right) {
  const leftScore = exerciseDataScore(left);
  const rightScore = exerciseDataScore(right);
  if (Math.abs(leftScore - rightScore) >= 2) return leftScore >= rightScore ? left : right;
  return recordTimestamp(left) >= recordTimestamp(right) ? left : right;
}

function exerciseDataScore(exercise) {
  if (!exercise) return 0;
  let score = exercise.name ? 2 : 0;
  if (exercise.notes) score += 3 + Math.min(8, String(exercise.notes).length / 25);
  for (const set of exercise.sets ?? []) {
    score += 1 + setDataScore(set);
  }
  return score;
}

function mergeSetLists(primary = [], secondary = []) {
  const secondaryById = new Map();
  secondary.forEach((set, index) => {
    secondaryById.set(set?.id || `index-${index}`, { set, index });
  });
  const used = new Set();
  const merged = primary.map((set, index) => {
    const key = set?.id || `index-${index}`;
    const fallback = secondaryById.get(key)?.set ?? secondary[index];
    used.add(key);
    if (fallback) used.add(fallback.id || `index-${secondary.indexOf(fallback)}`);
    return fallback ? mergeSetRecords(set, fallback) : hydrateSet(set);
  });
  secondary.forEach((set, index) => {
    const key = set?.id || `index-${index}`;
    if (!used.has(key)) merged.push(hydrateSet(set));
  });
  return merged;
}

function mergeSetRecords(left, right) {
  const preferred = preferSetRecord(left, right);
  const fallback = preferred === left ? right : left;
  return hydrateSet({
    ...fallback,
    ...preferred,
    weight: preferred.weight !== "" && preferred.weight != null ? preferred.weight : fallback.weight,
    reps: preferred.reps !== "" && preferred.reps != null ? preferred.reps : fallback.reps,
    rir: preferred.rir !== "" && preferred.rir != null ? preferred.rir : fallback.rir,
    left: mergeSideSet(preferred.left, fallback.left),
    right: mergeSideSet(preferred.right, fallback.right)
  });
}

function preferSetRecord(left, right) {
  const leftScore = setDataScore(left);
  const rightScore = setDataScore(right);
  if (leftScore !== rightScore) return leftScore >= rightScore ? left : right;
  return recordTimestamp(left) >= recordTimestamp(right) ? left : right;
}

function setDataScore(set) {
  if (!set) return 0;
  let score = 0;
  if (Number(set.weight) > 0) score += 4;
  if (Number(set.reps) > 0) score += 4;
  if (String(set.rir ?? "").trim() !== "") score += 3;
  score += sideSetDataScore(set.left);
  score += sideSetDataScore(set.right);
  return score;
}

function sideSetDataScore(set) {
  if (!set) return 0;
  let score = 0;
  if (Number(set.weight) > 0) score += 4;
  if (Number(set.reps) > 0) score += 4;
  if (String(set.rir ?? "").trim() !== "") score += 3;
  return score;
}

function mergeSideSet(primary = {}, fallback = {}) {
  return {
    weight: primary.weight !== "" && primary.weight != null ? primary.weight : fallback.weight ?? "",
    reps: primary.reps !== "" && primary.reps != null ? primary.reps : fallback.reps ?? "",
    rir: primary.rir !== "" && primary.rir != null ? primary.rir : fallback.rir ?? ""
  };
}

function recoverStateFromLocalBackups(baseState, options = {}) {
  const allowActiveRestore = options.allowActiveRestore !== false;
  const base = hydrateState(baseState ?? {});
  const deleted = new Set(base.deletedSessionIds ?? []);
  const backupStates = readStateBackups();
  const archivedSessions = readArchivedSessions();
  const backupSessions = backupStates.flatMap(item => item.sessions ?? []);
  const sessions = mergeById(base.sessions, archivedSessions, backupSessions)
    .filter(session => !deleted.has(session.id))
    .sort((a, b) => workoutTimestamp(b) - workoutTimestamp(a));
  const activeWorkout = base.activeWorkout ?? (allowActiveRestore ? newestRecoverableActiveWorkout(backupStates, sessions, deleted) : null);
  const recovered = {
    ...base,
    sessions,
    activeWorkout,
    updatedAt: [base.updatedAt, latestStateTimestamp({ ...base, sessions, activeWorkout })].sort().at(-1)
  };
  return hydrateState(recovered);
}

function newestRecoverableActiveWorkout(backupStates, sessions, deleted) {
  const sessionIds = new Set(sessions.map(session => session.id));
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  return backupStates
    .map(item => item.activeWorkout)
    .filter(Boolean)
    .filter(workout => !sessionIds.has(workout.id) && !deleted.has(workout.id))
    .filter(workout => recordTimestamp(workout) >= cutoff && workoutDataScore(workout) > 4)
    .sort((a, b) => recordTimestamp(b) - recordTimestamp(a))[0] ?? null;
}

function archiveCompletedSession(session) {
  if (demoMode) return;
  const archived = mergeById([session], readArchivedSessions())
    .sort((a, b) => workoutTimestamp(b) - workoutTimestamp(a));
  writeArchivedSessions(archived);
}

function savePrimaryState() {
  return writeLocalStorageItem(storageKey, JSON.stringify(state), {
    cleanupBeforeRetry: true,
    label: "workout data",
    warnOnFailure: true
  });
}

function writeStateBackup(snapshot, reason) {
  if (demoMode) return;
  const safeState = hydrateState(snapshot);
  if (reason === "cloud-merge" && safeState.sessions.length) {
    const archived = mergeById(safeState.sessions, readArchivedSessions())
      .sort((a, b) => workoutTimestamp(b) - workoutTimestamp(a));
    writeArchivedSessions(archived);
  }
  if (!shouldWriteStateBackup(reason)) return;
  const backups = readStateBackupsRaw();
  if (backups[0]?.state && statesEqual(backups[0].state, safeState)) return;
  const nextBackups = [{
    id: uuid(),
    savedAt: safeState.updatedAt ?? new Date().toISOString(),
    reason,
    state: safeState
  }, ...backups].slice(0, maxStateBackups);
  if (writeLocalStorageItem(backupKey, JSON.stringify(nextBackups), { label: "recovery backups" })) {
    lastStateBackupAt = Date.now();
    return;
  }
  const compactBackups = nextBackups.slice(0, Math.min(3, nextBackups.length));
  if (writeLocalStorageItem(backupKey, JSON.stringify(compactBackups), { label: "recovery backups" })) {
    lastStateBackupAt = Date.now();
  }
}

function shouldWriteStateBackup(reason) {
  if (criticalBackupReasons.has(reason)) return true;
  if (reason === "workout-edit" && Date.now() - lastStateBackupAt < backupThrottleMs) return false;
  return true;
}

function readArchivedSessions() {
  return readJsonArray(sessionArchiveKey).map(hydrateWorkoutLike);
}

function writeArchivedSessions(sessions) {
  const archived = mergeById(sessions)
    .sort((a, b) => workoutTimestamp(b) - workoutTimestamp(a))
    .slice(0, maxArchivedSessions);
  if (writeLocalStorageItem(sessionArchiveKey, JSON.stringify(archived), { label: "session archive" })) return;
  writeLocalStorageItem(sessionArchiveKey, JSON.stringify(archived.slice(0, 100)), { label: "session archive" });
}

function readStateBackups() {
  return readStateBackupsRaw()
    .map(item => item?.state ?? item)
    .map(item => hydrateState(item ?? {}))
    .filter(stateHasUserData);
}

function readStateBackupsRaw() {
  return readJsonArray(backupKey);
}

function readJsonArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function writeLocalStorageItem(key, value, options = {}) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error) && options.cleanupBeforeRetry !== false) {
      compactLocalRecoveryStorage();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        if (key === storageKey && isQuotaExceededError(retryError)) {
          clearLocalRecoveryStorage();
          try {
            localStorage.setItem(key, value);
            return true;
          } catch (finalError) {
            reportLocalStorageIssue(finalError, options.label, options.warnOnFailure);
            return false;
          }
        }
        reportLocalStorageIssue(retryError, options.label, options.warnOnFailure);
        return false;
      }
    }
    reportLocalStorageIssue(error, options.label, options.warnOnFailure);
    return false;
  }
}

function compactLocalRecoveryStorage() {
  trimLocalJsonArray(backupKey, 3);
  trimLocalJsonArray(sessionArchiveKey, Math.min(100, maxArchivedSessions));
}

function trimLocalJsonArray(key, count) {
  const items = readJsonArray(key).slice(0, count);
  try {
    if (items.length) {
      localStorage.setItem(key, JSON.stringify(items));
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // Best effort cleanup only.
    }
  }
}

function clearLocalRecoveryStorage() {
  try {
    localStorage.removeItem(backupKey);
    localStorage.removeItem(sessionArchiveKey);
  } catch {
    // Best effort cleanup only.
  }
}

function reportLocalStorageIssue(error, label = "local storage", warnUser = false) {
  console.warn(`Could not save ${label}`, error);
  if (!warnUser) return;
  const now = Date.now();
  if (now - lastStorageWarningAt < storageWarningCooldownMs) return;
  lastStorageWarningAt = now;
  showToast(cloudUser ? "Phone storage is full; cloud sync is still running" : "Phone storage is full; old recovery copies were cleaned");
}

function isQuotaExceededError(error) {
  return (
    error?.name === "QuotaExceededError" ||
    error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error?.code === 22 ||
    error?.code === 1014 ||
    String(error?.message ?? "").toLowerCase().includes("quota")
  );
}

function friendlyErrorMessage(error) {
  if (isQuotaExceededError(error)) return "Phone storage cleaned; try again";
  return error?.message ?? "Something went wrong";
}

function friendlyCloudErrorMessage(error) {
  if (isQuotaExceededError(error)) return "Cloud sync hit a quota; workout stayed saved here";
  return error?.message ?? "Cloud sync failed";
}

function statesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function workoutDate(workout) {
  return (
    validDate(workout?.finishedAt) ??
    validDate(workout?.startedAt) ??
    validDate(workout?.updatedAt) ??
    new Date(0)
  );
}

function workoutTimestamp(workout) {
  return workoutDate(workout).getTime();
}

function sessionDateKeyFromRecord(session) {
  return dateKey(workoutDate(session));
}

function dateKey(date) {
  const safeDate = validDate(date) ?? new Date();
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarCells(monthKey) {
  const [rawYear, rawMonth] = String(monthKey ?? "").split("-").map(Number);
  const fallback = new Date();
  const year = Number.isFinite(rawYear) ? rawYear : fallback.getFullYear();
  const month = Number.isFinite(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : fallback.getMonth() + 1;
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: dateKey(date),
      inMonth: date.getMonth() === month - 1
    };
  });
}

function shiftCalendarMonth(delta) {
  const [rawYear, rawMonth] = String(visibleCalendarMonth ?? "").split("-").map(Number);
  const fallback = new Date();
  const year = Number.isFinite(rawYear) ? rawYear : fallback.getFullYear();
  const month = Number.isFinite(rawMonth) ? rawMonth : fallback.getMonth() + 1;
  const next = new Date(year, month - 1 + delta, 1);
  visibleCalendarMonth = dateKey(next).slice(0, 7);
  selectedCalendarDate = dateKey(next);
  render();
}

function formatMonthTitle(monthKey) {
  const [rawYear, rawMonth] = String(monthKey ?? "").split("-").map(Number);
  if (!Number.isFinite(rawYear) || !Number.isFinite(rawMonth)) return "Calendar";
  const date = validDate(new Date(rawYear, rawMonth - 1, 1));
  return date ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date) : "Calendar";
}

function formatCalendarHeading(key) {
  const date = validDate(`${key}T12:00:00`);
  return date ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(date) : "Unknown date";
}

function renderMuscleBias(exerciseName) {
  const bias = muscleBiasForExercise(exerciseName);
  if (!bias) {
    return `
      <details class="bias-card">
        <summary class="bias-label">Muscle involvement</summary>
        <p>Name the exercise more specifically to see likely biased muscles.</p>
      </details>
    `;
  }

  return `
    <details class="bias-card">
      <summary class="bias-label">Muscle involvement</summary>
      <div class="bias-tags">
        ${bias.muscles.map(muscle => `<span>${escapeHtml(muscle)}</span>`).join("")}
      </div>
      <p>${escapeHtml(bias.note)}</p>
    </details>
  `;
}

function muscleBiasForExercise(exerciseName) {
  const normalized = normalizeExerciseName(exerciseName);
  if (!normalized) return null;
  return exerciseBiasRules.find(rule => rule.matches.some(match => normalized.includes(match)));
}

function isSeedTemplate(template) {
  return (
    (template.name === "Upper Strength" && template.notes === "Pressing and pulling.") ||
    (template.name === "Lower Hypertrophy" && template.notes === "Controlled reps.")
  );
}

function saveAndRender(message, preserveScroll = false) {
  saveState();
  if (preserveScroll) {
    renderWithScrollRestore();
  } else {
    render();
  }
  showToast(message);
}

function showToast(message) {
  clearTimeout(toastTimer);
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.append(toast);
  toastTimer = setTimeout(() => toast.remove(), 1800);
}

async function initServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  serviceWorkerRegistration = await navigator.serviceWorker.register("./service-worker.js");
  watchServiceWorker(serviceWorkerRegistration);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

function watchServiceWorker(registration) {
  if (registration.waiting) {
    showUpdateAvailable(registration.waiting);
  }

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        showUpdateAvailable(installing);
      }
    });
  });
}

function showUpdateAvailable(worker) {
  waitingServiceWorker = worker;
  updateAvailable = true;
  renderWithScrollRestore();
  showToast("Update ready");
}

async function checkForAppUpdate(manual = false) {
  if (!serviceWorkerRegistration) {
    if (manual) showToast("Updates work after install");
    return;
  }
  await serviceWorkerRegistration.update();
  if (manual && !updateAvailable) showToast("Already up to date");
}

function applyAppUpdate() {
  if (!waitingServiceWorker) {
    window.location.reload();
    return;
  }
  waitingServiceWorker.postMessage({ type: "SKIP_WAITING" });
}

async function initCloud() {
  if (!hasCloudConfig) return;
  cloudAuthReady = false;
  cloudStatus = "Checking account...";

  await waitForSupabaseClient();
  if (!window.supabase?.createClient) {
    cloudStatus = "Cloud library unavailable";
    cloudAuthReady = true;
    render();
    return;
  }

  try {
    cloudClient = window.supabase.createClient(cloudConfig.supabaseUrl, cloudConfig.supabaseAnonKey);
    const { data, error } = await cloudClient.auth.getSession();
    if (error) throw error;
    cloudUser = data.session?.user ?? null;
    cloudStatus = cloudUser ? "Cloud connected" : "Sign in to sync";
    if (cloudUser) await pullCloudState();
  } catch (error) {
    cloudStatus = "Cloud check failed";
    showToast(error?.message ?? "Could not check account");
  } finally {
    cloudAuthReady = true;
    render();
  }

  cloudClient?.auth.onAuthStateChange(async (_event, session) => {
    const nextUser = session?.user ?? null;
    const userChanged = nextUser?.id !== cloudUser?.id;
    cloudUser = nextUser;
    cloudAuthReady = true;
    cloudStatus = cloudUser ? "Cloud connected" : "Sign in to sync";
    if (cloudUser && userChanged) await pullCloudState();
    render();
  });
}

function waitForSupabaseClient(timeoutMs = 8000) {
  if (window.supabase?.createClient) return Promise.resolve(true);
  return new Promise(resolve => {
    const startedAt = Date.now();
    const script = document.querySelector('script[src*="@supabase/supabase-js"]');
    let done = false;
    const finish = value => {
      if (done) return;
      done = true;
      clearInterval(timer);
      script?.removeEventListener?.("load", onLoad);
      script?.removeEventListener?.("error", onError);
      resolve(value);
    };
    const onLoad = () => finish(Boolean(window.supabase?.createClient));
    const onError = () => finish(false);
    script?.addEventListener?.("load", onLoad, { once: true });
    script?.addEventListener?.("error", onError, { once: true });
    const timer = setInterval(() => {
      if (window.supabase?.createClient) finish(true);
      if (Date.now() - startedAt >= timeoutMs) finish(false);
    }, 80);
  });
}

async function signIn() {
  if (!cloudClient) return showToast("Cloud is not configured yet");
  if (!cloudEmail.trim() || cloudPassword.length < 6) return showToast("Enter email and password");
  cloudStatus = "Signing in...";
  render();
  const { error } = await cloudClient.auth.signInWithPassword({
    email: cloudEmail.trim(),
    password: cloudPassword
  });
  cloudPassword = "";
  if (error) {
    cloudStatus = "Sign in failed";
    render();
    return showToast(error.message);
  }
  showToast("Signed in");
}

async function signUp() {
  if (!cloudClient) return showToast("Cloud is not configured yet");
  if (!cloudEmail.trim() || cloudPassword.length < 6) return showToast("Use a password with 6+ characters");
  cloudStatus = "Creating account...";
  render();
  const { error } = await cloudClient.auth.signUp({
    email: cloudEmail.trim(),
    password: cloudPassword
  });
  cloudPassword = "";
  if (error) {
    cloudStatus = "Create account failed";
    render();
    return showToast(error.message);
  }
  cloudStatus = "Check email or sign in";
  render();
  showToast("Account created");
}

async function signOut() {
  if (!cloudClient) return;
  await cloudClient.auth.signOut();
  cloudUser = null;
  cloudStatus = "Signed out";
  render();
}

function scheduleCloudSync() {
  if (!cloudClient || !cloudUser || demoMode) return;
  if (cloudSyncing) {
    cloudSyncPending = true;
    return;
  }
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    void pushCloudState(false);
  }, cloudSyncDebounceMs);
}

async function pullCloudState() {
  if (!cloudClient || !cloudUser || demoMode) return;
  cloudStatus = "Loading cloud data...";
  const { data, error } = await cloudClient
    .from("workout_data")
    .select("data, updated_at")
    .eq("user_id", cloudUser.id)
    .maybeSingle();

  if (error) {
    cloudStatus = "Cloud load failed";
    showToast(error.message);
    return;
  }

  if (data?.data) {
    const localState = recoverStateFromLocalBackups(hydrateState(state));
    const remoteState = hydrateState({
      ...data.data,
      updatedAt: data.updated_at ?? data.data.updatedAt
    });
    const merged = recoverStateFromLocalBackups(mergeCloudStates(localState, remoteState), { allowActiveRestore: false });
    const shouldPushLocal = stateHasUserData(localState) && (!stateHasUserData(remoteState) || !statesEqual(merged, remoteState));
    state = merged;
    savePrimaryState();
    writeStateBackup(state, "cloud-merge");
    refreshSelectionsAfterStateLoad();
    const autoCompleted = autoCompleteExpiredWorkout("cloud", { silent: true, preserveScroll: false, skipRender: true });
    cloudStatus = "Synced";
    if (shouldPushLocal || autoCompleted) await pushCloudState(false);
    return;
  }

  await pushCloudState(false);
}

async function pushCloudState(manual) {
  if (!cloudClient || !cloudUser || demoMode) return;
  if (cloudSyncing) {
    cloudSyncPending = true;
    return;
  }
  cloudSyncing = true;
  cloudSyncPending = false;
  cloudStatus = "Syncing...";
  if (manual) render();
  const outgoingState = recoverStateFromLocalBackups(hydrateState(state), { allowActiveRestore: false });
  state = outgoingState;
  savePrimaryState();
  let error = null;
  try {
    const response = await cloudClient
      .from("workout_data")
      .upsert({
        user_id: cloudUser.id,
        data: outgoingState,
        updated_at: outgoingState.updatedAt ?? new Date().toISOString()
      });
    error = response.error;
  } catch (syncError) {
    error = syncError;
  }
  cloudSyncing = false;
  cloudStatus = error ? "Sync failed" : "Synced";
  if (error) showCloudSyncError(error, manual);
  if (manual) {
    render();
    if (!error) showToast("Cloud synced");
  }
  if (cloudSyncPending) {
    cloudSyncPending = false;
    scheduleCloudSync();
  }
}

function showCloudSyncError(error, manual = false) {
  const message = friendlyCloudErrorMessage(error);
  if (manual) {
    showToast(message);
    return;
  }
  const now = Date.now();
  if (now - lastCloudErrorToastAt < cloudErrorToastCooldownMs) return;
  lastCloudErrorToastAt = now;
  showToast(message);
}

function refreshSelectionsAfterStateLoad() {
  selectedTemplateId = templatesAtGym().find(template => template.id === selectedTemplateId)?.id ?? templatesAtGym()[0]?.id ?? null;
  selectedAdviceSessionId = sessionsAtGym().find(session => session.id === selectedAdviceSessionId)?.id ?? sessionsAtGym()[0]?.id ?? null;
  selectedStrengthExercise = trackedExerciseNames().includes(selectedStrengthExercise) ? selectedStrengthExercise : firstTrackedExerciseName();
  editingSessionId = sessionsAtGym().find(session => session.id === editingSessionId)?.id ?? null;
}

function scheduleBiasRender() {
  clearTimeout(biasRenderTimer);
  biasRenderTimer = setTimeout(() => {
    document.querySelectorAll(".exercise-card[data-scope]").forEach(refreshExerciseContext);
  }, 700);
}

function refreshExerciseContext(card) {
  if (!card) return;
  const scope = card.dataset.scope;
  const exercise = exerciseForSet(scope, Number(card.dataset.exerciseIndex));
  if (!exercise) return;
  const bias = card.querySelector(".bias-card");
  if (bias) bias.outerHTML = renderMuscleBias(exercise.name);
  const previous = card.querySelector(".previous-session");
  if (previous) previous.outerHTML = renderPreviousSession(exercise, scope);
  card.querySelectorAll("input[data-bind]").forEach(input => {
    const parts = input.dataset.bind.split(".");
    if (parts[1] !== "set") return;
    const side = parts.length === 6 ? parts[4] : null;
    const field = parts.at(-1);
    input.placeholder = previousPlaceholder(previousSetForExercise(exercise, Number(parts[3]), side, scope), field);
    if (field === "weight") input.closest(".field").querySelector("label").textContent = domain.unit(exercise) === "unspecified" ? "Weight" : domain.unit(exercise);
  });
}

function formatDate(value) {
  if (!value) return "";
  const date = validDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function deepClone(value) {
  if (globalThis.structuredClone) return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function icon(name) {
  return `<span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${icons[name]}"></path></svg></span>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}

function selectedAttribute(value, expected) {
  return value === expected ? "selected" : "";
}

render();
void initCloud();
void initServiceWorker();
