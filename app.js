/* Student To‑Do List (no dependencies) */

const STORAGE_KEY = "student-todo-list:v1";

/**
 * @typedef {"low"|"medium"|"high"} Priority
 * @typedef {{ id:string, title:string, subject:string, due:string|null, priority:Priority, completed:boolean, createdAt:number, completedAt:number|null }} Task
 */

const $ = (sel) => /** @type {HTMLElement} */ (document.querySelector(sel));
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function safeText(s) {
  return String(s ?? "").trim();
}

function clampSubject(s) {
  return safeText(s).slice(0, 24);
}

function clampTitle(s) {
  return safeText(s).slice(0, 120);
}

function normalizePriority(p) {
  return p === "low" || p === "high" || p === "medium" ? p : "medium";
}

function parseTasks(raw) {
  if (!Array.isArray(raw)) return [];
  /** @type {Task[]} */
  const out = [];
  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    const title = clampTitle(t.title);
    if (!title) continue;
    out.push({
      id: typeof t.id === "string" ? t.id : uid(),
      title,
      subject: clampSubject(t.subject),
      due: typeof t.due === "string" && t.due ? t.due : null,
      priority: normalizePriority(t.priority),
      completed: Boolean(t.completed),
      createdAt: Number.isFinite(t.createdAt) ? t.createdAt : Date.now(),
      completedAt: Number.isFinite(t.completedAt) ? t.completedAt : null,
    });
  }
  return out;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: /** @type {Task[]} */ ([]), ui: { filter: "all", q: "" } };
    const parsed = JSON.parse(raw);
    return {
      tasks: parseTasks(parsed?.tasks),
      ui: {
        filter: typeof parsed?.ui?.filter === "string" ? parsed.ui.filter : "all",
        q: typeof parsed?.ui?.q === "string" ? parsed.ui.q : "",
      },
    };
  } catch {
    return { tasks: /** @type {Task[]} */ ([]), ui: { filter: "all", q: "" } };
  }
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tasks: state.tasks,
        ui: state.ui,
      })
    );
    pulseSavedHint();
  } catch {
    // ignore (storage blocked/quota)
  }
}

let savePulseTimer = 0;
function pulseSavedHint() {
  const el = $("#saveHint");
  if (!el) return;
  el.textContent = "Saved.";
  clearTimeout(savePulseTimer);
  savePulseTimer = setTimeout(() => {
    el.textContent = "Saved locally in your browser.";
  }, 1100);
}

/** @type {{ tasks: Task[], ui: { filter: string, q: string }, edit: { id: string | null } }} */
const state = {
  ...loadState(),
  edit: { id: null },
};

const els = {
  addForm: /** @type {HTMLFormElement} */ ($("#addForm")),
  taskList: /** @type {HTMLUListElement} */ ($("#taskList")),
  emptyState: /** @type {HTMLDivElement} */ ($("#emptyState")),
  searchBox: /** @type {HTMLInputElement} */ ($("#searchBox")),
  clearCompletedBtn: /** @type {HTMLButtonElement} */ ($("#clearCompletedBtn")),
  statLeft: /** @type {HTMLDivElement} */ ($("#statLeft")),
  statDone: /** @type {HTMLDivElement} */ ($("#statDone")),
  statToday: /** @type {HTMLDivElement} */ ($("#statToday")),
  seedBtn: /** @type {HTMLButtonElement} */ ($("#seedBtn")),
  exportBtn: /** @type {HTMLButtonElement} */ ($("#exportBtn")),
  importInput: /** @type {HTMLInputElement} */ ($("#importInput")),
  editDialog: /** @type {HTMLDialogElement} */ ($("#editDialog")),
  editForm: /** @type {HTMLFormElement} */ ($("#editForm")),
  editTitle: /** @type {HTMLInputElement} */ ($("#editTitle")),
  editSubject: /** @type {HTMLInputElement} */ ($("#editSubject")),
  editDue: /** @type {HTMLInputElement} */ ($("#editDue")),
  editPriority: /** @type {HTMLSelectElement} */ ($("#editPriority")),
};

function compareTasks(a, b) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;

  const aDue = a.due ?? "9999-12-31";
  const bDue = b.due ?? "9999-12-31";
  if (aDue !== bDue) return aDue < bDue ? -1 : 1;

  const pr = { high: 0, medium: 1, low: 2 };
  const ap = pr[a.priority] ?? 1;
  const bp = pr[b.priority] ?? 1;
  if (ap !== bp) return ap - bp;

  return a.createdAt - b.createdAt;
}

function matchesFilter(task) {
  const f = state.ui.filter;
  if (f === "active") return !task.completed;
  if (f === "done") return task.completed;
  if (f === "today") return (task.due ?? "") === todayISO() && !task.completed;
  return true;
}

function matchesQuery(task) {
  const q = safeText(state.ui.q).toLowerCase();
  if (!q) return true;
  return (
    task.title.toLowerCase().includes(q) ||
    task.subject.toLowerCase().includes(q) ||
    (task.due ?? "").includes(q) ||
    task.priority.toLowerCase().includes(q)
  );
}

function formatDue(task) {
  if (!task.due) return "No due date";
  const t = todayISO();
  if (task.due === t) return "Due today";

  const due = new Date(`${task.due}T00:00:00`);
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const delta = Math.round((due.getTime() - new Date(`${t}T00:00:00`).getTime()) / msPerDay);
  if (delta === 1) return "Due tomorrow";
  if (delta === -1) return "Due yesterday";
  if (delta < 0) return `${Math.abs(delta)} day(s) overdue`;
  if (delta <= 7) return `Due in ${delta} day(s)`;
  return `Due ${task.due}`;
}

function render() {
  const tasks = state.tasks.slice().sort(compareTasks).filter(matchesFilter).filter(matchesQuery);

  els.taskList.innerHTML = "";
  els.emptyState.hidden = tasks.length !== 0;

  for (const task of tasks) {
    const li = document.createElement("li");
    li.className = "task";
    li.dataset.id = task.id;

    const check = document.createElement("button");
    check.className = "check";
    check.type = "button";
    check.setAttribute("aria-label", task.completed ? "Mark as not completed" : "Mark as completed");
    check.dataset.checked = task.completed ? "true" : "false";
    check.innerHTML = `<span class="checkMark" aria-hidden="true">✓</span>`;
    check.addEventListener("click", () => toggleTask(task.id));

    const main = document.createElement("div");
    main.className = "taskMain";

    const titleRow = document.createElement("div");
    titleRow.className = "taskTitleRow";

    const title = document.createElement("div");
    title.className = "taskTitle" + (task.completed ? " is-done" : "");
    title.textContent = task.title;
    title.tabIndex = 0;
    title.setAttribute("role", "button");
    title.setAttribute("aria-label", "Edit task");
    title.addEventListener("click", () => openEdit(task.id));
    title.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEdit(task.id);
      }
    });

    titleRow.appendChild(title);

    const chips = document.createElement("div");
    chips.className = "chips";

    if (task.subject) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = task.subject;
      chips.appendChild(chip);
    }

    const prChip = document.createElement("span");
    prChip.className = `chip ${task.priority}`;
    prChip.textContent = task.priority === "high" ? "High" : task.priority === "low" ? "Low" : "Medium";
    chips.appendChild(prChip);

    if (task.due) {
      const dueChip = document.createElement("span");
      dueChip.className = "chip";
      dueChip.textContent = task.due;
      chips.appendChild(dueChip);
    }

    const meta = document.createElement("div");
    meta.className = "taskMeta";
    meta.textContent = formatDue(task);

    main.appendChild(titleRow);
    main.appendChild(chips);
    main.appendChild(meta);

    const btns = document.createElement("div");
    btns.className = "taskBtns";

    const editBtn = document.createElement("button");
    editBtn.className = "iconBtn";
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEdit(task.id));

    const delBtn = document.createElement("button");
    delBtn.className = "iconBtn";
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteTask(task.id));

    btns.appendChild(editBtn);
    btns.appendChild(delBtn);

    li.appendChild(check);
    li.appendChild(main);
    li.appendChild(btns);
    els.taskList.appendChild(li);
  }

  updateStats();
  updateTabsUI();
}

function updateTabsUI() {
  const f = state.ui.filter;
  for (const b of $$(".tab")) {
    const active = b.getAttribute("data-filter") === f;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  }
}

function updateStats() {
  const left = state.tasks.filter((t) => !t.completed).length;
  const done = state.tasks.filter((t) => t.completed).length;
  const today = state.tasks.filter((t) => !t.completed && (t.due ?? "") === todayISO()).length;
  els.statLeft.textContent = String(left);
  els.statDone.textContent = String(done);
  els.statToday.textContent = String(today);
}

function addTask({ title, subject, due, priority }) {
  const t = clampTitle(title);
  if (!t) return;
  const normalizedSubject = clampSubject(subject);
  const normalizedDue = due ? String(due) : null;

  // Prevent accidental duplicate active tasks with same title/subject/due.
  const duplicate = state.tasks.some(
    (x) =>
      !x.completed &&
      x.title.toLowerCase() === t.toLowerCase() &&
      x.subject.toLowerCase() === normalizedSubject.toLowerCase() &&
      (x.due ?? null) === normalizedDue
  );
  if (duplicate) {
    alert("That task already exists in your active list.");
    return;
  }

  /** @type {Task} */
  const task = {
    id: uid(),
    title: t,
    subject: normalizedSubject,
    due: normalizedDue,
    priority: normalizePriority(priority),
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
  };
  state.tasks.push(task);
  saveState();
  render();
}

function toggleTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  t.completedAt = t.completed ? Date.now() : null;
  saveState();
  render();
}

function deleteTask(id) {
  const idx = state.tasks.findIndex((x) => x.id === id);
  if (idx === -1) return;
  const title = state.tasks[idx].title;
  const ok = confirm(`Delete “${title}”?`);
  if (!ok) return;
  state.tasks.splice(idx, 1);
  saveState();
  render();
}

function setFilter(filter) {
  state.ui.filter = filter;
  saveState();
  render();
}

function openEdit(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  state.edit.id = id;
  els.editTitle.value = t.title;
  els.editSubject.value = t.subject;
  els.editDue.value = t.due ?? "";
  els.editPriority.value = t.priority;
  els.editDialog.showModal();
  els.editTitle.focus();
  els.editTitle.select();
}

function closeEdit() {
  state.edit.id = null;
  if (els.editDialog.open) els.editDialog.close();
}

function saveEdit() {
  const id = state.edit.id;
  if (!id) return;
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;

  const nextTitle = clampTitle(els.editTitle.value);
  if (!nextTitle) return;
  t.title = nextTitle;
  t.subject = clampSubject(els.editSubject.value);
  t.due = els.editDue.value ? String(els.editDue.value) : null;
  t.priority = normalizePriority(els.editPriority.value);

  saveState();
  render();
  closeEdit();
}

function seedSample() {
  const t = todayISO();
  const tomorrow = (() => {
    const d = new Date(`${t}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  const samples = [
    { title: "Submit English assignment", subject: "English", due: tomorrow, priority: "high" },
    { title: "Practice 20 minutes (math)", subject: "Math", due: t, priority: "medium" },
    { title: "Pack bag for tomorrow", subject: "", due: t, priority: "low" },
  ];

  for (const s of samples) addTask(s);
}

function exportJson() {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          tasks: state.tasks,
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      ),
    ],
    { type: "application/json" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "student-todo-list.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

async function importJson(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const next = parseTasks(parsed?.tasks ?? parsed);
  if (!next.length) {
    alert("No tasks found in that file.");
    return;
  }
  const ok = confirm(`Import ${next.length} task(s)? This will replace your current list.`);
  if (!ok) return;
  state.tasks = next;
  saveState();
  render();
}

function initEvents() {
  els.addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(els.addForm);
    const title = String(fd.get("title") ?? "");
    const subject = String(fd.get("subject") ?? "");
    const due = String(fd.get("due") ?? "");
    const priority = String(fd.get("priority") ?? "medium");
    addTask({ title, subject, due: due || null, priority });
    els.addForm.reset();
    $("#taskTitle").focus();
  });

  for (const b of $$(".tab")) {
    b.addEventListener("click", () => setFilter(b.getAttribute("data-filter") || "all"));
  }

  els.searchBox.value = state.ui.q || "";
  els.searchBox.addEventListener("input", () => {
    state.ui.q = els.searchBox.value;
    saveState();
    render();
  });

  els.clearCompletedBtn.addEventListener("click", () => {
    const done = state.tasks.filter((t) => t.completed).length;
    if (!done) return;
    const ok = confirm(`Clear ${done} completed task(s)?`);
    if (!ok) return;
    state.tasks = state.tasks.filter((t) => !t.completed);
    saveState();
    render();
  });

  els.seedBtn.addEventListener("click", () => seedSample());

  els.exportBtn.addEventListener("click", () => exportJson());

  els.importInput.addEventListener("change", async () => {
    const f = els.importInput.files?.[0];
    if (!f) return;
    try {
      await importJson(f);
    } catch {
      alert("Could not import that file (invalid JSON).");
    } finally {
      els.importInput.value = "";
    }
  });

  els.editForm.addEventListener("submit", (e) => {
    e.preventDefault();
  });

  els.editForm.addEventListener("close", () => {
    state.edit.id = null;
  });

  els.editDialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeEdit();
  });

  els.editForm.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) {
      // Let "Save" button handle submit; prevent accidental dialog close.
      e.preventDefault();
      saveEdit();
    }
  });

  els.editForm.addEventListener("submit", () => saveEdit());

  els.editForm.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (target instanceof HTMLButtonElement && target.value === "save") {
      e.preventDefault();
      saveEdit();
    }
    if (target instanceof HTMLButtonElement && target.value === "cancel") {
      e.preventDefault();
      closeEdit();
    }
  });
}

initEvents();
render();

