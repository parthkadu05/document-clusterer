# DendroDoc — Intelligent Document Processing Platform

> **Version 3.0** | Flask · SQLite · D3.js · Chart.js · PyMuPDF

---

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Installation & Setup](#installation--setup)
6. [Running Locally](#running-locally)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Document Processing Engine](#document-processing-engine)
10. [Frontend Architecture](#frontend-architecture)
11. [Known Limitations & Future Work](#known-limitations--future-work)

---

## Overview

**DendroDoc** is a full-stack, intelligent document processing web application built with Flask. It allows users to upload multiple documents in various formats, search for a name or keyword across all documents using fuzzy matching, extract relevant pages/rows, and download a merged result — either as a PDF or Excel file.

Beyond simple extraction, DendroDoc v3 includes an AI-inspired insight engine, voice-activated search, an interactive D3.js file hierarchy builder, smart document tagging, and a visual timeline of past activity.

---

## Features

### Core
| Feature | Description |
|---|---|
| **Multi-format Upload** | Supports `.pdf`, `.docx`, `.xlsx`, `.xls`, `.csv`, `.txt` |
| **Fuzzy Search** | Uses `thefuzz` (Levenshtein distance) with an 80% partial match threshold |
| **PDF Output** | Merges all matching pages into one downloadable PDF with keyword highlights |
| **Excel Output** | Merges all matching rows from all documents into one `.xlsx` file with duplicates removed |

### Intelligence & Insights
| Feature | Description |
|---|---|
| **Smart Document Tagging** | Auto-classifies each document as `Result`, `Report`, `Certificate`, or `Data Table` |
| **Auto Summary** | Generates a brief extraction summary (e.g. "Extracted 4 records from Result files.") |
| **Insight Engine** | Heuristically detects numerical data (marks/scores) in extracted rows and computes Highest, Lowest, Average |
| **Performance Chart** | Chart.js line chart renders the numerical trend across all extracted documents post-processing |

### UI/UX
| Feature | Description |
|---|---|
| **Hierarchical Upload Mode** | Interactive D3.js tree builder — add Semesters → Subjects → Files visually |
| **Voice Search** | Browser-native Web Speech API — speak your query into the search box |
| **Intent Detection** | Basic NLP parser detects query type (marks/insights vs. standard search) |
| **Timeline History** | All past extractions displayed as a vertical animated timeline with tag-based filters |
| **Dark/Light Mode** | System-wide theme toggle persisted in `localStorage` |
| **Toast Notifications** | Non-blocking Toastify alerts replace browser popups |
| **GSAP Animations** | Smooth page entries, staggered timeline items, mic pulse animation |
| **Particles.js Login** | Interactive floating particle network on Login and Signup pages |

---

## Tech Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| `Flask` | 3.0.3 | Web framework |
| `Flask-SQLAlchemy` | 3.1.1 | ORM for SQLite |
| `Flask-Login` | 0.6.3 | Session & auth management |
| `Flask-Bcrypt` | 1.0.1 | Password hashing |
| `PyMuPDF` (fitz) | 1.24.2 | PDF parsing & annotation |
| `pandas` | latest | Excel/CSV reading & writing |
| `python-docx` | latest | Word document parsing |
| `thefuzz` | latest | Fuzzy string matching |
| `python-Levenshtein` | latest | Speed boost for thefuzz |
| `openpyxl` | latest | Excel file writing engine |

### Frontend (CDN)
| Library | Purpose |
|---|---|
| `D3.js v7` | Hierarchical file tree visualization |
| `Chart.js` | Performance insight line charts |
| `GSAP 3.12` | Smooth animations & transitions |
| `Toastify JS` | Non-blocking toast notifications |
| `Particles.js` | Animated particle background on auth pages |
| `Lottie Player` | JSON-based animation (How To Use section) |

---

## Project Structure

```
DendroDoc/
├── app.py                    # Flask application, routes, API endpoints
├── document_processor.py     # Core file processing engine (PDF, Excel, DOCX, TXT)
├── models.py                 # SQLAlchemy database models (User, History)
├── requirements.txt          # Python dependencies
│
├── templates/
│   ├── base.html             # Base layout (Navbar, Theme Toggle, CDN scripts)
│   ├── login.html            # Login page (with Particles.js)
│   ├── signup.html           # Signup page (with Particles.js)
│   └── dashboard.html        # Main dashboard (Workspace + History tabs)
│
├── static/
│   ├── css/
│   │   └── styles.css        # Full CSS (dark mode vars, glassmorphism, timeline, D3)
│   └── js/
│       └── app.js            # All frontend JS (D3, Voice, Chart.js, Timeline, Forms)
│
├── uploads/                  # Temporary upload storage (auto-cleared after processing)
├── processed/                # Generated output files (PDF/Excel downloads)
└── instance/
    └── database.db           # SQLite database file
```

---

## Installation & Setup

### Prerequisites
- **Python 3.10+**
- **pip**

### Steps

**1. Navigate to the project folder:**
```bash
cd "d:\Study\OneDrive\Desktop\DendroDoc"
```

**2. Create and activate a virtual environment:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**3. Install all dependencies:**
```powershell
pip install -r requirements.txt
```

> **Note:** `PyMuPDF` requires its own build. If it fails, install manually:
> ```powershell
> pip install pymupdf
> ```

---

## Running Locally

```powershell
.\venv\Scripts\python.exe app.py
```

The server will start at:
```
http://127.0.0.1:5000
```

> **First run:** SQLite database (`instance/database.db`) is auto-created. Sign up for a new account at `/signup`.

---

## API Reference

All endpoints require authentication (active session). Unauthenticated requests are redirected to `/login`.

### `GET /`
Redirects to `/dashboard` if logged in, otherwise to `/login`.

---

### `GET /login` | `POST /login`
Authenticate an existing user.

**POST Body (form-data):**
| Field | Type | Description |
|---|---|---|
| `username` | `string` | Account username |
| `password` | `string` | Account password |

---

### `GET /signup` | `POST /signup`
Register a new user.

**POST Body (form-data):**
| Field | Type | Description |
|---|---|---|
| `username` | `string` | Desired username (must be unique) |
| `password` | `string` | Password (auto-hashed with bcrypt) |

---

### `POST /process`
**Main extraction endpoint.** Accepts files, searches for a keyword, and returns a download link.

**Body (multipart/form-data):**
| Field | Type | Required | Description |
|---|---|---|---|
| `files` | `File[]` | ✅ | One or more documents (PDF, XLSX, DOCX, CSV, TXT) |
| `search_name` | `string` | ✅ | Name or keyword to search for |
| `output_format` | `string` | ✅ | `"pdf"` or `"excel"` |

**Success Response `200`:**
```json
{
  "success": true,
  "matches": 12,
  "tags": ["Result", "Data Table"],
  "summary": "Extracted 12 records from Result, Data Table files.",
  "insights": {
    "highest": 95,
    "lowest": 42,
    "average": 72.5,
    "total_records": 12,
    "trend": [65.0, 78.5, 80.2]
  },
  "download_url": "/downloads/merged_result_a3f91c2b.pdf"
}
```

**Failure Response `404`:**
```json
{
  "success": false,
  "message": "No matches found for the given search name."
}
```

---

### `GET /status`
Returns real-time processing progress for the current user (polled every 800ms by the frontend).

**Response:**
```json
{
  "status": "Extracting & Matching content...",
  "progress": 50
}
```

---

### `GET /downloads/<filename>`
Serves a generated output file from the `/processed` folder.

---

### `GET /api/history`
Returns all past extraction records for the current user, ordered newest first.

**Response:**
```json
{
  "history": [
    {
      "id": 5,
      "search_name": "John Doe",
      "upload_names": ["result_sem3.pdf", "result_sem4.xlsx"],
      "output_format": "pdf",
      "tags": ["Result"],
      "summary": "Extracted 4 records from Result files.",
      "insights": { "highest": 92, "lowest": 55, "average": 74.0, "trend": [74.0] },
      "created_at": "2026-04-24 00:30",
      "download_url": "/downloads/merged_result_c1d2e3f4.pdf"
    }
  ]
}
```

---

### `DELETE /api/history/delete/<id>`
Deletes a specific history record and its associated output file from disk.

**Response `200`:**
```json
{ "success": true }
```

**Response `404`:**
```json
{ "success": false, "message": "Not found" }
```

---

## Database Schema

### `User`
| Column | Type | Notes |
|---|---|---|
| `id` | `Integer` | Primary key |
| `username` | `String(100)` | Unique, not null |
| `password` | `String(200)` | Bcrypt hash |
| `created_at` | `DateTime` | Auto UTC timestamp |

### `History`
| Column | Type | Notes |
|---|---|---|
| `id` | `Integer` | Primary key |
| `user_id` | `Integer` | Foreign key → `User.id` |
| `upload_names` | `String(500)` | JSON array of original filenames |
| `search_name` | `String(100)` | The keyword searched |
| `output_filename` | `String(200)` | Generated output filename |
| `output_format` | `String(50)` | `"pdf"` or `"excel"` |
| `tags` | `String(200)` | JSON array of detected tags |
| `summary` | `Text` | Human-readable extraction summary |
| `insights` | `Text` | JSON object with numerical insights |
| `created_at` | `DateTime` | Auto UTC timestamp |

---

## Document Processing Engine

File: `document_processor.py`

### Processing Flow

```
process_documents(saved_paths, search_name, output_filename, output_format)
    │
    ├── For each file:
    │     ├── .pdf   → process_pdf()       returns (matches, pages, excel_data, text_sample)
    │     ├── .csv   → process_excel()     returns (matches, data)
    │     ├── .xlsx  → process_excel()     returns (matches, data)
    │     ├── .docx  → process_docx()      returns (matches, data, text_sample)
    │     └── .txt   → process_txt()       returns (matches, data, text_sample)
    │
    ├── tag_document(text_sample)          → ["Result", "Certificate", ...]
    ├── generate_summary(tags, matches)    → "Extracted N records from X files."
    ├── extract_insights(excel_data)       → { highest, lowest, average, trend }
    │
    └── Output:
          ├── PDF mode: Merge pages → Highlight keyword → Save
          └── Excel mode: Concat rows → Drop duplicates → Save .xlsx
```

### Fuzzy Matching

The `is_match()` function uses `thefuzz.fuzz.partial_ratio` with an **80% threshold**. This means partial matches (e.g. "John" matching "John Doe") succeed, while completely unrelated strings do not.

```python
def is_match(search_name, text, threshold=80):
    score = fuzz.partial_ratio(search_name.lower(), text.lower())
    return score >= threshold
```

### Insight Extraction Heuristic

Numerical values found in non-`Source` columns of extracted rows are treated as potential marks if they fall in the range `0–200`. The engine computes per-row averages to build the `trend` array used by Chart.js.

---

## Frontend Architecture

### `app.js` — Module Responsibilities

| Section | Responsibility |
|---|---|
| **GSAP Animations** | Page entry animation for navbar and main card |
| **Tabs** | Switch between Workspace and History views |
| **Voice Search** | `webkitSpeechRecognition` → auto-fills search box |
| **Intent Parser** | Detects "marks/insights" vs. "semester filter" vs. "standard search" intents |
| **D3.js Tree** | Interactive SVG tree for hierarchical file organization (Sem → Sub → File) |
| **Standard Upload** | Drag-and-drop dropzone with per-file remove buttons |
| **Form Submission** | `fetch('/process')` with polling of `/status` every 800ms |
| **Insights Display** | Chart.js line chart + tags chips + summary text from API response |
| **Timeline History** | Fetches `/api/history`, renders staggered timeline items with GSAP, supports tag filters and delete |

### Theme System (`styles.css`)

All colors are defined as CSS custom properties on `:root` (dark mode default). Light mode overrides are applied via `[data-theme="light"]`. The theme is toggled via JavaScript and persisted to `localStorage`.

```css
:root {                                /* Dark mode (default) */
  --primary: #3b82f6;
  --secondary: #8b5cf6;
  --bg-dark: #0f1729;
  --text-main: #e2e8f0;
  ...
}
[data-theme="light"] {                 /* Light mode overrides */
  --bg-dark: #f0f4ff;
  --text-main: #1e293b;
  ...
}
```

---

## Known Limitations & Future Work

| Limitation | Future Fix |
|---|---|
| Voice Search only works in Chrome/Edge (Web Speech API) | Add `annyang.js` for broader browser support |
| Insight engine only works on structured tabular data (Excel/CSV) | Extend to parse tabular data inside PDFs using regex |
| No LLM integration — query answering is keyword/intent-based only | Integrate a local LLM (e.g. Ollama / Llama) or external API (OpenAI) |
| In-memory `user_status` dict is lost on server restart | Use Redis or a DB table for persistent progress tracking |
| No email/password reset flow | Add Flask-Mail for account recovery |
| `SECRET_KEY` is hardcoded | Move to `.env` file using `python-dotenv` |
| Max upload size is 50MB | Make configurable in a config file |
