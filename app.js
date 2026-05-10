const storageKey = "codex.workoutLoggerWeb.v1";
const backupKey = "codex.workoutLoggerWeb.backups.v1";
const sessionArchiveKey = "codex.workoutLoggerWeb.sessionArchive.v1";
const maxStateBackups = 60;
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
let selectedTemplateId = state.templates[0]?.id ?? null;
let selectedCalendarDate = dateKey(new Date());
let visibleCalendarMonth = selectedCalendarDate.slice(0, 7);
let selectedAdviceSessionId = state.sessions[0]?.id ?? null;
let selectedStrengthExercise = firstTrackedExerciseName();
if (demoMode === "advice") selectedTab = "advice";
if (demoMode === "strength") selectedTab = "strength";
let editingTemplate = null;
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
let cloudStatus = hasCloudConfig ? "Sign in to sync" : "Local only";
let cloudSyncTimer = null;
let cloudSyncing = false;
let cloudSyncPending = false;

function loadState() {
  const emptyState = {
    templates: [],
    activeWorkout: null,
    sessions: [],
    deletedSessionIds: []
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
  if (state.activeWorkout) state.activeWorkout.updatedAt = now;
  state = recoverStateFromLocalBackups(hydrateState(state), { allowActiveRestore: false });
  localStorage.setItem(storageKey, JSON.stringify(state));
  writeStateBackup(state, reason);
  scheduleCloudSync();
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <div class="mark">${icon("bolt")}</div>
        <div>
          <h1>Workout Logger</h1>
          <p class="subline">${state.activeWorkout ? `<span data-workout-timer>${formatWorkoutDuration(state.activeWorkout)}</span> in progress` : cloudStatus}</p>
        </div>
      </div>
      ${renderAccountPanel()}
    </header>
    <div class="layout">
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
  `;
  wireEvents();
  startTimerRefresh();
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
      ${tabButton("advice", "Advice", "target")}
      ${tabButton("strength", "Stats", "chart")}
    </nav>
  `;
}

function tabButton(id, label, iconName) {
  return `<button class="tab ${selectedTab === id ? "active" : ""}" data-tab="${id}">${icon(iconName)}<span>${label}</span></button>`;
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
        ${state.sessions.length ? sessionsByMostRecentDay().map(renderWorkoutDayButton).join("") : `<div class="empty">No finished workouts.</div>`}
      </div>
    `;
  }

  if (selectedTab === "advice") {
    return `
      <div class="panel-title">
        <h2>Pick Workout</h2>
      </div>
      <div class="history-list">
        ${state.sessions.length ? state.sessions.map(renderAdviceWorkoutButton).join("") : `<div class="empty">Finish a workout to get advice.</div>`}
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
      ${state.templates.length ? state.templates.map(renderTemplateButton).join("") : `<div class="empty">No templates.</div>`}
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

function renderStrengthExerciseButton(name) {
  const selected = normalizeExerciseName(name) === normalizeExerciseName(selectedStrengthExercise) ? "selected" : "";
  return `
    <button class="row ${selected}" data-strength-exercise="${escapeAttribute(name)}">
      <span class="row-title">${escapeHtml(name)}</span>
      <span class="meta">${strengthPointsForExercise(name).length} logged sessions</span>
    </button>
  `;
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
  const selectedTemplate = state.templates.find(template => template.id === selectedTemplateId) ?? state.templates[0];
  return `
    <div class="section-head">
      <h2>Start Workout</h2>
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
        : `<div class="empty">Create a workout template or start empty.</div>`
    }
  `;
}

function renderActiveWorkout() {
  const workout = state.activeWorkout;
  return `
    <div class="section-head">
      <h2>Active Workout</h2>
      <div class="action-row">
        <button class="danger-button" data-action="discard-workout">${icon("trash")} Discard</button>
        <button class="button" data-action="finish-workout" ${workout.exercises.length ? "" : "disabled"}>${icon("check")} Finish</button>
      </div>
    </div>
    <section class="summary-band">
      <div class="field">
        <label for="workout-title">Workout</label>
        <input id="workout-title" value="${escapeAttribute(workout.title)}" data-bind="active.title">
      </div>
      <div class="stat"><strong>${workout.exercises.length}</strong><span>Exercises</span></div>
      <div class="stat"><strong>${countSets(workout.exercises)}</strong><span>Sets</span></div>
      <div class="stat"><strong>${averageWeight(workout.exercises)}</strong><span>Avg Weight</span></div>
      <div class="stat"><strong>${averageRir(workout.exercises)}</strong><span>Avg RIR</span></div>
      <div class="stat"><strong data-workout-timer>${formatWorkoutDuration(workout)}</strong><span>Timer</span></div>
      <div class="field full">
        <label for="finish-notes">Finish notes</label>
        <textarea id="finish-notes" data-bind="active.workoutNotes">${escapeHtml(workout.workoutNotes)}</textarea>
      </div>
    </section>
    <div class="exercise-list">
      ${workout.exercises.map((exercise, index) => renderEditableExercise(exercise, index, "active")).join("")}
    </div>
    <div class="action-row" style="margin-top:14px">
      <button class="ghost-button" data-action="add-active-exercise">${icon("plus")} Exercise</button>
    </div>
  `;
}

function renderTemplatesMain() {
  const selectedTemplate = state.templates.find(template => template.id === selectedTemplateId);
  return `
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
  if (!session) return `<div class="empty">Finish a workout to unlock specific advice.</div>`;
  const advice = buildAdvice(session);
  return `
    <div class="section-head">
      <h2>Advice</h2>
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
      <div class="calendar-title">Muscle Bias This Workout</div>
      <div class="bias-tags">
        ${advice.muscleSummary.length ? advice.muscleSummary.map(item => `<span>${escapeHtml(item.muscle)} - ${item.sets} sets</span>`).join("") : `<span>No known muscle matches yet</span>`}
      </div>
    </section>
    <section class="calendar-frame">
      <div class="calendar-title">Evidence basis</div>
      <p class="note-preview">Recommendations use current resistance-training evidence: prioritize enough weekly hard sets, recoverable frequency, mostly 0-3 RIR work, progressive overload, and occasional lower-fatigue weeks when performance stalls.</p>
    </section>
  `;
}

function renderStrengthMain() {
  const names = trackedExerciseNames();
  const selected = selectedStrengthExercise || names[0];
  if (!selected) return `<div class="empty">Finish workouts to build strength graphs.</div>`;
  const points = strengthPointsForExercise(selected);
  return `
    <div class="section-head">
      <h2>Strength</h2>
      <span class="meta">${escapeHtml(selected)}</span>
    </div>
    <section class="summary-band">
      <div class="field">
        <label>Exercise</label>
        <strong>${escapeHtml(selected)}</strong>
        <span class="note-preview">Graph uses estimated 1RM from your best set each session: weight × (1 + reps / 30).</span>
      </div>
      <div class="stat"><strong>${points.length}</strong><span>Sessions</span></div>
      <div class="stat"><strong>${points.at(-1)?.estimate ?? "0"}</strong><span>Latest e1RM</span></div>
      <div class="stat"><strong>${strengthDelta(points)}</strong><span>Change</span></div>
    </section>
    <section class="calendar-frame">
      <div class="calendar-title">Estimated Strength Trend</div>
      ${renderStrengthGraph(points)}
    </section>
    <div class="exercise-list">
      ${points.map(point => `
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
  return `
    <button class="calendar-cell ${selected} ${muted} ${hasWorkouts}" data-calendar-date="${cell.key}">
      <span>${new Date(`${cell.key}T12:00:00`).getDate()}</span>
      ${sessions.length ? `<strong>${sessions.length}</strong>` : ""}
    </button>
  `;
}

function renderSessionDetail(session) {
  return `
    <article class="session-detail">
      <div class="section-head">
        <h3>${escapeHtml(session.title)}</h3>
        <button class="danger-button" data-action="delete-session" data-session-id="${session.id}">${icon("trash")} Delete</button>
      </div>
      <section class="summary-band">
        <div class="field">
          <label>Finished</label>
          <strong>${formatDate(session.finishedAt)}</strong>
          ${session.workoutNotes ? `<span class="note-preview">${escapeHtml(session.workoutNotes)}</span>` : ""}
        </div>
        <div class="stat"><strong>${session.exercises.length}</strong><span>Exercises</span></div>
        <div class="stat"><strong>${countSets(session.exercises)}</strong><span>Sets</span></div>
        <div class="stat"><strong>${formatWorkoutDuration(session)}</strong><span>Duration</span></div>
        <div class="stat"><strong>${averageWeight(session.exercises)}</strong><span>Avg Weight</span></div>
        <div class="stat"><strong>${averageRir(session.exercises)}</strong><span>Avg RIR</span></div>
      </section>
      <div class="exercise-list">
        ${session.exercises.map(exercise => renderReadOnlyExercise(exercise)).join("")}
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
          <div class="meta">${unilateral ? "Unilateral" : "Bilateral"}</div>
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
          <div class="meta">${isUnilateralExercise(exercise) ? "Unilateral" : "Bilateral"}</div>
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
      ${renderTrackingToggle(exercise, index, scope)}
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
  const previous = previousSetForExercise(exerciseName, setIndex);
  return `
    <div class="set-row">
      <div class="set-number">#${setIndex + 1}</div>
      <div class="field">
        <label>Weight</label>
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
  const previous = previousSetForExercise(exerciseName, setIndex, side);
  return `
    <div class="side-set">
      <span class="side-label">${side}</span>
      <div class="field">
        <label>Weight</label>
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
          <h2>Template</h2>
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

  document.querySelectorAll("[data-session-id]").forEach(element => {
    element.addEventListener("click", () => {
      selectedCalendarDate = sessionDateKey(element.dataset.sessionId) ?? selectedCalendarDate;
      visibleCalendarMonth = selectedCalendarDate.slice(0, 7);
      render();
    });
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
      if (action === "close-modal" && event.target.closest("[data-modal]") && event.target !== element) return;
      void handleAction(action, element);
    });
  });

  document.querySelectorAll("[data-bind]").forEach(field => {
    field.addEventListener("input", () => {
      updateBinding(field.dataset.bind, field.value);
    });
    field.addEventListener("blur", () => {
      if (field.dataset.bind.includes(".exercise.") && field.dataset.bind.endsWith(".name")) {
        renderWithScrollRestore();
      }
    });
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
    case "start-empty":
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

  if (parts[0] === "active" && state.activeWorkout) {
    if (parts[1] === "title") state.activeWorkout.title = value.trimStart() || "Workout";
    if (parts[1] === "workoutNotes") state.activeWorkout.workoutNotes = value;
    if (parts[1] === "exercise") {
      state.activeWorkout.exercises[Number(parts[2])][parts[3]] = value;
      if (parts[3] === "name") scheduleBiasRender();
    }
    if (parts[1] === "set") {
      const set = state.activeWorkout.exercises[Number(parts[2])].sets[Number(parts[3])];
      if (parts.length === 6) {
        const side = parts[4];
        set[side] = sideSet(set, side);
        set[side][parts[5]] = normalizeSetFieldValue(parts[5], value);
      } else {
        set[parts[4]] = normalizeSetFieldValue(parts[4], value);
      }
    }
    saveState("active-edit");
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

function startTemplate(id) {
  const template = state.templates.find(item => item.id === id);
  if (!template) return;
  state.activeWorkout = workoutFromTemplate(template);
  selectedTab = "train";
  saveAndRender("Workout started");
}

function finishWorkout() {
  if (!state.activeWorkout) return;
  const finishedAt = new Date().toISOString();
  const session = hydrateWorkoutLike({
    ...deepClone(state.activeWorkout),
    finishedAt,
    durationSeconds: elapsedSeconds(state.activeWorkout),
    updatedAt: finishedAt
  });
  archiveCompletedSession(session);
  state.sessions = mergeById([session], state.sessions)
    .filter(item => !state.deletedSessionIds?.includes(item.id))
    .sort((a, b) => new Date(b.finishedAt ?? b.startedAt) - new Date(a.finishedAt ?? a.startedAt));
  selectedCalendarDate = sessionDateKey(session.id) ?? dateKey(new Date());
  visibleCalendarMonth = selectedCalendarDate.slice(0, 7);
  selectedAdviceSessionId = session.id;
  state.activeWorkout = null;
  selectedTab = "calendar";
  saveAndRender("Workout finished");
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
  state.templates = state.templates.filter(template => template.id !== id);
  selectedTemplateId = state.templates[0]?.id ?? null;
  saveAndRender("Template deleted");
}

function deleteSession(id) {
  if (!confirm("Delete workout from history?")) return;
  state.deletedSessionIds = [...new Set([...(state.deletedSessionIds ?? []), id])];
  state.sessions = state.sessions.filter(session => session.id !== id);
  selectedAdviceSessionId = state.sessions[0]?.id ?? null;
  saveAndRender("Workout deleted");
}

function saveTemplate() {
  if (!editingTemplate) return;
  const normalized = {
    ...editingTemplate,
    name: editingTemplate.name.trim() || "Workout",
    notes: editingTemplate.notes.trim(),
    updatedAt: new Date().toISOString(),
    exercises: editingTemplate.exercises
      .map(exercise => ({
        id: exercise.id ?? uuid(),
        name: exercise.name.trim(),
        notes: exercise.notes.trim(),
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

function removeExercise(scope, exerciseIndex) {
  const target = scope === "template" ? editingTemplate : state.activeWorkout;
  if (!target) return;
  target.exercises.splice(exerciseIndex, 1);
  if (scope === "active") saveState();
  renderWithScrollRestore();
}

function setTrackingMode(scope, exerciseIndex, mode) {
  const target = scope === "template" ? editingTemplate : state.activeWorkout;
  if (!target) return;
  const exercise = target.exercises[exerciseIndex];
  if (!exercise) return;
  exercise.trackingMode = mode === "unilateral" ? "unilateral" : "bilateral";
  exercise.sets = (exercise.sets ?? []).map(set => hydrateSet(set, exercise.trackingMode));
  if (scope === "active") saveState();
  renderWithScrollRestore();
}

function reorderExercise(scope, fromIndex, toIndex) {
  if (scope !== "active" && scope !== "template") return;
  if (fromIndex === toIndex) return;
  const target = scope === "template" ? editingTemplate : state.activeWorkout;
  if (!target?.exercises) return;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= target.exercises.length || toIndex >= target.exercises.length) return;
  const [moved] = target.exercises.splice(fromIndex, 1);
  target.exercises.splice(toIndex, 0, moved);
  if (scope === "active") saveState();
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
  const target = scope === "template" ? editingTemplate : state.activeWorkout;
  if (!target) return;
  const sets = target.exercises[exerciseIndex].sets;
  sets.push(newSet());
  if (scope === "active") saveState();
  renderWithScrollRestore();
}

function removeSet(scope, exerciseIndex, setIndex) {
  const target = scope === "template" ? editingTemplate : state.activeWorkout;
  if (!target) return;
  target.exercises[exerciseIndex].sets.splice(setIndex, 1);
  if (scope === "active") saveState();
  renderWithScrollRestore();
}

function newWorkout(title, exercises) {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    title,
    startedAt: now,
    updatedAt: now,
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
    updatedAt: now,
    notes: "",
    exercises: [newTemplateExercise("New Exercise")]
  };
}

function newTemplateExercise(name) {
  return {
    id: uuid(),
    name,
    notes: "",
    trackingMode: "bilateral",
    sets: []
  };
}

function newExercise(name) {
  return {
    id: uuid(),
    name,
    notes: "",
    trackingMode: "bilateral",
    sets: [newSet()]
  };
}

function newSet(weight = "", reps = "", rir = "") {
  return {
    id: uuid(),
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
  if (!rirValues.length) return "0";
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
    .replace(/[–—]/g, "-")
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

function exerciseNameForSet(scope, exerciseIndex) {
  return exerciseForSet(scope, exerciseIndex)?.name ?? "";
}

function exerciseForSet(scope, exerciseIndex) {
  const target = scope === "template" ? editingTemplate : state.activeWorkout;
  return target?.exercises?.[exerciseIndex] ?? null;
}

function previousSetForExercise(exerciseName, setIndex, side = null) {
  const normalized = normalizeExerciseName(exerciseName);
  if (!normalized) return null;
  const sorted = [...state.sessions].sort((a, b) => new Date(b.finishedAt ?? b.startedAt) - new Date(a.finishedAt ?? a.startedAt));
  for (const session of sorted) {
    const exercise = session.exercises.find(item => normalizeExerciseName(item.name) === normalized);
    const set = exercise?.sets?.[setIndex];
    if (!set) continue;
    const entry = side ? sideSet(set, side) : set;
    if (hasLoggedSetValue(entry)) return entry;
  }
  return null;
}

function previousPlaceholder(previous, field) {
  if (!previous || previous[field] === "" || previous[field] == null) return "No previous";
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
  const names = new Map();
  for (const session of state.sessions) {
    for (const exercise of session.exercises) {
      const key = normalizeExerciseName(exercise.name);
      if (key && bestStrengthSet(exercise) && !names.has(key)) names.set(key, exercise.name);
    }
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

function firstTrackedExerciseName() {
  return trackedExerciseNames()[0] ?? "";
}

function strengthPointsForExercise(name) {
  const normalized = normalizeExerciseName(name);
  if (!normalized) return [];
  return state.sessions
    .map(session => {
      const exercise = session.exercises.find(item => normalizeExerciseName(item.name) === normalized);
      if (!exercise) return null;
      const best = bestStrengthSet(exercise);
      if (!best) return null;
      return {
        date: dateKey(new Date(session.finishedAt ?? session.startedAt)),
        weight: best.weight,
        reps: best.reps,
        rir: best.rir,
        estimate: estimatedOneRepMax(best)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
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
  if (points.length < 2) return "0";
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
    const x = pad + (index / Math.max(1, points.length - 1)) * (width - pad * 2);
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
    </svg>
  `;
}

function elapsedSeconds(workout) {
  if (!workout) return 0;
  if (Number.isFinite(workout.durationSeconds)) return workout.durationSeconds;
  const end = workout.finishedAt ? new Date(workout.finishedAt) : new Date();
  const start = new Date(workout.startedAt);
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

function startTimerRefresh() {
  clearInterval(timerInterval);
  if (!state.activeWorkout) return;
  timerInterval = setInterval(() => {
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
    deletedSessionIds: Array.isArray(rawState.deletedSessionIds) ? rawState.deletedSessionIds : [],
    updatedAt: rawState.updatedAt ?? null
  };
  normalized.templates = normalized.templates.filter(template => !isSeedTemplate(template)).map(hydrateWorkoutLike);
  normalized.sessions = mergeById(normalized.sessions.map(hydrateWorkoutLike));
  normalized.deletedSessionIds = [...new Set(normalized.deletedSessionIds.filter(Boolean))];
  normalized.sessions = normalized.sessions.filter(session => !normalized.deletedSessionIds.includes(session.id));
  if (normalized.activeWorkout) normalized.activeWorkout = hydrateWorkoutLike(normalized.activeWorkout);
  normalized.updatedAt = normalized.updatedAt ?? latestStateTimestamp(normalized);
  return normalized;
}

function hydrateWorkoutLike(workout) {
  return {
    ...workout,
    id: workout.id ?? uuid(),
    exercises: Array.isArray(workout.exercises)
      ? workout.exercises.map(exercise => ({
          ...exercise,
          id: exercise.id ?? uuid(),
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
  for (const session of state.sessions) {
    const key = dateKey(new Date(session.finishedAt ?? session.startedAt));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(session);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, sessions]) => ({ key, sessions }));
}

function sessionsForDate(key) {
  return state.sessions.filter(session => dateKey(new Date(session.finishedAt ?? session.startedAt)) === key);
}

function adviceSession() {
  return state.sessions.find(session => session.id === selectedAdviceSessionId) ?? sessionsForDate(selectedCalendarDate)[0] ?? state.sessions[0] ?? null;
}

function buildAdvice(session) {
  const recent = sessionsInLastDays(14);
  const frequency = new Set(recent.map(item => dateKey(new Date(item.finishedAt ?? item.startedAt)))).size;
  const totalSets = countSets(session.exercises);
  const avgRir = Number(averageRir(session.exercises));
  const duration = elapsedSeconds(session);
  const muscleSummary = summarizeMuscleSets(session.exercises);
  const weeklyMuscles = summarizeMuscleSets(recent.flatMap(item => item.exercises));
  const cards = [];

  if (frequency <= 1) {
    cards.push({
      label: "Frequency",
      title: "Add another training day",
      body: "One day in the last two weeks is too sparse for fast progress. Aim for 2-4 training days weekly, spreading hard sets so each target muscle gets hit at least twice when possible."
    });
  } else if (frequency >= 8) {
    cards.push({
      label: "Frequency",
      title: "Watch recovery pressure",
      body: "You are training often. Keep hard sets recoverable, rotate emphasis, and use easier days before performance drops across multiple sessions."
    });
  } else {
    cards.push({
      label: "Frequency",
      title: "Frequency looks usable",
      body: "Your recent training frequency can support growth if weekly muscle volume is high enough and loads or reps trend upward."
    });
  }

  if (totalSets < 8) {
    cards.push({
      label: "Volume",
      title: "This workout is low volume",
      body: "For hypertrophy, add sets over time if performance is stable and technique stays consistent. A practical target is roughly 10-20 hard weekly sets per priority muscle, adjusted by load/reps trends and repeated performance drop-off, not DOMS."
    });
  } else if (totalSets > 24) {
    cards.push({
      label: "Volume",
      title: "This may be too much in one session",
      body: "Large single-session volume can become junk volume. Split the work across more days or trim low-quality sets if reps or load fall sharply."
    });
  } else {
    cards.push({
      label: "Volume",
      title: "Volume is in a productive range",
      body: "Keep this amount if performance is climbing. Add only 1-2 sets for a lagging muscle after two steady weeks without progress."
    });
  }

  if (avgRir >= 4) {
    cards.push({
      label: "Effort",
      title: "Push sets closer to failure",
      body: "Average RIR is high. Most growth-focused work should land around 0-3 RIR, with compounds often safer at 1-3 RIR and isolations occasionally closer."
    });
  } else if (avgRir <= 0.5 && totalSets > 12) {
    cards.push({
      label: "Effort",
      title: "Reduce all-out fatigue",
      body: "A lot of failure work can raise fatigue without clearly beating near-failure work. Keep some sets at 1-2 RIR so progression survives the next session."
    });
  } else {
    cards.push({
      label: "Effort",
      title: "Effort is close enough",
      body: "Your RIR is near the useful zone. Progress load or reps when you repeat the workout and the target RIR still holds."
    });
  }

  if (duration > 5400) {
    cards.push({
      label: "Session length",
      title: "Consider splitting the workout",
      body: "Past about 90 minutes, fatigue and focus often become limiting. Move lower-priority exercises to another day if later sets are lower quality."
    });
  } else if (duration < 1800 && totalSets >= 12) {
    cards.push({
      label: "Rest",
      title: "Rest may be too rushed",
      body: "If this was a hard session under 30 minutes, make sure heavy compound sets get enough rest to preserve performance."
    });
  }

  const underdosed = weeklyMuscles.filter(item => item.sets > 0 && item.sets < 6).slice(0, 3);
  const dominant = weeklyMuscles[0];
  if (underdosed.length) {
    cards.push({
      label: "Balance",
      title: `Bring up ${underdosed.map(item => item.muscle).join(", ")}`,
      body: "These muscles have low recent direct volume. Add a small amount of targeted work before adding more to already-dominant areas."
    });
  } else if (dominant) {
    cards.push({
      label: "Balance",
      title: `${dominant.muscle} is your current emphasis`,
      body: "That is fine if intentional. To avoid plateaus, keep other major movement patterns present with enough sets to maintain progress."
    });
  }

  cards.push({
    label: "Progression",
    title: "Use a double-progression rule",
    body: "Keep the same weight until all sets reach the top of your rep target at the planned RIR, then raise weight slightly and rebuild reps."
  });

  return {
    overview: adviceOverview(frequency, totalSets, avgRir),
    frequency,
    totalSets,
    averageRir: Number.isFinite(avgRir) ? avgRir.toFixed(1) : "0",
    muscleSummary,
    cards
  };
}

function adviceOverview(frequency, totalSets, avgRir) {
  if (frequency <= 1) return "Biggest lever: train more consistently before chasing advanced tweaks.";
  if (totalSets > 24) return "Biggest lever: improve set quality by spreading or trimming volume.";
  if (avgRir >= 4) return "Biggest lever: make working sets harder while preserving technique.";
  return "Biggest lever: repeat this structure and progress reps or load deliberately.";
}

function sessionsInLastDays(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return state.sessions.filter(session => new Date(session.finishedAt ?? session.startedAt) >= cutoff);
}

function summarizeMuscleSets(exercises) {
  const totals = new Map();
  for (const exercise of exercises) {
    const bias = muscleBiasForExercise(exercise.name);
    if (!bias) continue;
    for (const muscle of bias.muscles) {
      totals.set(muscle, (totals.get(muscle) ?? 0) + exercise.sets.length);
    }
  }
  return [...totals.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets);
}

function sessionDateKey(sessionId) {
  const session = state.sessions.find(item => item.id === sessionId);
  return session ? dateKey(new Date(session.finishedAt ?? session.startedAt)) : null;
}

function latestStateTimestamp(value) {
  const candidates = [value?.updatedAt];
  for (const session of value?.sessions ?? []) {
    candidates.push(session.updatedAt, session.finishedAt, session.startedAt);
  }
  for (const template of value?.templates ?? []) {
    candidates.push(template.updatedAt, template.startedAt);
  }
  if (value?.activeWorkout) candidates.push(value.activeWorkout.updatedAt, value.activeWorkout.startedAt);
  const latest = candidates
    .map(item => (item ? new Date(item).getTime() : 0))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  return latest ? new Date(latest).toISOString() : new Date(0).toISOString();
}

function recordTimestamp(record) {
  return new Date(record?.updatedAt ?? record?.finishedAt ?? record?.startedAt ?? 0).getTime() || 0;
}

function stateHasUserData(value) {
  return Boolean(
    value?.activeWorkout ||
    (value?.sessions ?? []).length ||
    (value?.templates ?? []).length
  );
}

function mergeCloudStates(localValue, remoteValue) {
  const local = hydrateState(localValue ?? {});
  const remote = hydrateState(remoteValue ?? {});
  return {
    templates: mergeById(local.templates, remote.templates),
    sessions: mergeById(local.sessions, remote.sessions).sort((a, b) => new Date(b.finishedAt ?? b.startedAt) - new Date(a.finishedAt ?? a.startedAt)),
    activeWorkout: newestWorkout(local.activeWorkout, remote.activeWorkout),
    deletedSessionIds: [...new Set([...(local.deletedSessionIds ?? []), ...(remote.deletedSessionIds ?? [])])],
    updatedAt: [latestStateTimestamp(local), latestStateTimestamp(remote)].sort().at(-1)
  };
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
  const preferred = preferWorkoutRecord(leftWorkout, rightWorkout);
  const fallback = preferred === leftWorkout ? rightWorkout : leftWorkout;
  return {
    ...fallback,
    ...preferred,
    workoutNotes: preferred.workoutNotes || fallback.workoutNotes || "",
    notes: preferred.notes || fallback.notes || "",
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
    .sort((a, b) => new Date(b.finishedAt ?? b.startedAt) - new Date(a.finishedAt ?? a.startedAt));
  const activeWorkout = base.activeWorkout ?? (allowActiveRestore ? newestRecoverableActiveWorkout(backupStates, sessions, deleted) : null);
  const recovered = {
    ...base,
    sessions,
    activeWorkout,
    updatedAt: [base.updatedAt, latestStateTimestamp({ ...base, sessions, activeWorkout })].sort().at(-1)
  };
  return recovered;
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
    .sort((a, b) => new Date(b.finishedAt ?? b.startedAt) - new Date(a.finishedAt ?? a.startedAt));
  writeArchivedSessions(archived);
}

function writeStateBackup(snapshot, reason) {
  if (demoMode) return;
  const safeState = hydrateState(snapshot);
  if (safeState.sessions.length) {
    const archived = mergeById(safeState.sessions, readArchivedSessions())
      .sort((a, b) => new Date(b.finishedAt ?? b.startedAt) - new Date(a.finishedAt ?? a.startedAt));
    writeArchivedSessions(archived);
  }
  const backups = readStateBackupsRaw();
  if (backups[0]?.state && statesEqual(backups[0].state, safeState)) return;
  backups.unshift({
    id: uuid(),
    savedAt: safeState.updatedAt ?? new Date().toISOString(),
    reason,
    state: safeState
  });
  localStorage.setItem(backupKey, JSON.stringify(backups.slice(0, maxStateBackups)));
}

function readArchivedSessions() {
  return readJsonArray(sessionArchiveKey).map(hydrateWorkoutLike);
}

function writeArchivedSessions(sessions) {
  localStorage.setItem(sessionArchiveKey, JSON.stringify(mergeById(sessions).slice(0, 1000)));
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

function statesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarCells(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
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
  const [year, month] = visibleCalendarMonth.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  visibleCalendarMonth = dateKey(next).slice(0, 7);
  selectedCalendarDate = dateKey(next);
  render();
}

function formatMonthTitle(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function formatCalendarHeading(key) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${key}T12:00:00`));
}

function renderMuscleBias(exerciseName) {
  const bias = muscleBiasForExercise(exerciseName);
  if (!bias) {
    return `
      <div class="bias-card">
        <span class="bias-label">Muscle bias</span>
        <p>Name the exercise more specifically to see likely biased muscles.</p>
      </div>
    `;
  }

  return `
    <div class="bias-card">
      <span class="bias-label">Muscle bias</span>
      <div class="bias-tags">
        ${bias.muscles.map(muscle => `<span>${escapeHtml(muscle)}</span>`).join("")}
      </div>
      <p>${escapeHtml(bias.note)}</p>
    </div>
  `;
}

function muscleBiasForExercise(exerciseName) {
  const normalized = exerciseName.toLowerCase();
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
  if (!window.supabase?.createClient) {
    cloudStatus = "Cloud library unavailable";
    render();
    return;
  }

  cloudClient = window.supabase.createClient(cloudConfig.supabaseUrl, cloudConfig.supabaseAnonKey);
  const { data } = await cloudClient.auth.getSession();
  cloudUser = data.session?.user ?? null;
  cloudStatus = cloudUser ? "Cloud connected" : "Sign in to sync";
  if (cloudUser) await pullCloudState();
  render();

  cloudClient.auth.onAuthStateChange(async (_event, session) => {
    cloudUser = session?.user ?? null;
    cloudStatus = cloudUser ? "Cloud connected" : "Sign in to sync";
    if (cloudUser) await pullCloudState();
    render();
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
  }, 700);
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
    localStorage.setItem(storageKey, JSON.stringify(state));
    writeStateBackup(state, "cloud-merge");
    refreshSelectionsAfterStateLoad();
    cloudStatus = "Synced";
    if (shouldPushLocal) await pushCloudState(false);
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
  localStorage.setItem(storageKey, JSON.stringify(state));
  const { error } = await cloudClient
    .from("workout_data")
    .upsert({
      user_id: cloudUser.id,
      data: outgoingState,
      updated_at: outgoingState.updatedAt ?? new Date().toISOString()
    });
  cloudSyncing = false;
  cloudStatus = error ? "Sync failed" : "Synced";
  if (error) showToast(error.message);
  if (manual) {
    render();
    if (!error) showToast("Cloud synced");
  }
  if (cloudSyncPending) {
    cloudSyncPending = false;
    scheduleCloudSync();
  }
}

function refreshSelectionsAfterStateLoad() {
  selectedTemplateId = state.templates.find(template => template.id === selectedTemplateId)?.id ?? state.templates[0]?.id ?? null;
  selectedAdviceSessionId = state.sessions.find(session => session.id === selectedAdviceSessionId)?.id ?? state.sessions[0]?.id ?? null;
  selectedStrengthExercise = trackedExerciseNames().find(name => normalizeExerciseName(name) === normalizeExerciseName(selectedStrengthExercise)) ?? firstTrackedExerciseName();
}

function scheduleBiasRender() {
  clearTimeout(biasRenderTimer);
  biasRenderTimer = setTimeout(() => {
    const active = document.activeElement;
    if (active?.matches?.("[data-bind]")) return;
    renderWithScrollRestore();
  }, 700);
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
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

render();
void initCloud();
void initServiceWorker();
