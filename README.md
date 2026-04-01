# Student To‑Do List

A simple student-focused to‑do list you can run without installing anything.

## Features

- Add tasks with **subject**, **due date**, and **priority**
- Mark complete / delete
- Filters: **All**, **Active**, **Due today**, **Completed**
- Search
- Edit tasks (click the title or the Edit button)
- Auto-saves to **localStorage**
- Import / Export as JSON

## Code review

This repo is set up to get **CodeRabbit** reviews on Pull Requests.

## Run it

### Option A: Open directly

1. Open the folder: `student-to-do-list`
2. Double‑click `index.html`

### Option B: Run a local server (recommended)

If you have any local server tool available, use it (this avoids browser restrictions in some setups).

If you install Python later, you can run:

```bash
cd student-to-do-list
python -m http.server 5173
```

Then open `http://localhost:5173` in your browser.

If you use VS Code/Cursor, you can also install the **Live Server** extension and choose **“Open with Live Server”** on `index.html`.

## Data location

Tasks are saved in your browser storage (localStorage) under the key:

- `student-todo-list:v1`

