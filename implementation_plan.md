# DendroDoc Phase 3: Intelligent Document Platform

This phase transforms DendroDoc from a data extractor into a smart document analysis platform. We will implement "Ask Your Documents", Voice Search, Auto-Insights, Document Tagging, and an advanced Timeline History view.

> [!IMPORTANT]
> **User Review Required**
> Please review this plan, particularly the open questions below, and approve it so development can begin.

## Open Questions
1. **Data Parsing Heuristics**: To answer questions like "What are my total marks?" and generate "Performance trend charts", the system needs to understand the structure of the documents. Since document structures can vary wildly, is it acceptable to build heuristic parsers that look for common keywords like "Total", "Marks", and "Semester" near numerical values? 
2. **"Ask Your Documents" Engine**: Without using an external LLM API (like OpenAI), we will build a custom keyword/NLP intent engine using Python's `nltk` or basic regex matching to answer questions. Is this local-only approach correct, or do you want to integrate an external AI?
3. **Voice Search**: Voice search relies on the browser's built-in Web Speech API (`webkitSpeechRecognition`). This requires microphone permissions and works best on Chrome/Edge. Is this acceptable?

---

## 1. Smart Analysis Engine (Backend)

### [MODIFY] `document_processor.py`
Add intelligent analysis modules:
- `tag_document(text)`: Scans for keywords to automatically assign tags like `Result`, `Report`, `Certificate`.
- `generate_summary(text)`: Creates a one-sentence summary based on document length, tags, and detected entities.
- `extract_insights(text, name)`: Heuristic engine to extract numerical data (Highest, Lowest, Average marks) for a specific user.
- `smart_merge_data(data_list)`: Data cleaner that deduplicates records and aligns formats before generating the final Excel/PDF.

### [NEW] `nlp_engine.py` (or integrated into processor)
- Implement a basic query intent parser for "Ask Your Documents". 
- Maps questions like "Show my Sem 2 result" to internal actions (filtering by semester).

---

## 2. Interactive Dashboard Features

### [MODIFY] `templates/dashboard.html` & `static/js/app.js`
- **Voice Search & Chat Box**: Add a smart search bar with a microphone icon. Clicking the mic triggers the browser's Web Speech API to transcribe voice to text.
- **Auto Insight Charts**: Integrate **Chart.js** to display performance trends and average marks when a user is searched.
- **Cross-Document Linking**: When a user's data is extracted, the results will feature clickable links to view exactly which source file the data came from.

---

## 3. Timeline View & History Upgrades

### [MODIFY] `templates/dashboard.html` & `static/css/styles.css`
- **Timeline History**: Overhaul the "History" tab to feature a vertical timeline UI instead of just cards. Group history by Year and Semester.
- Add filter dropdowns (by Date, File Type).

### [MODIFY] `models.py` & `app.py`
- Update `History` model to store `document_tags` and `summary`.
- Add routes to serve the new timeline format and chart data.

---

## 4. Premium Animations

### [MODIFY] `static/js/app.js` & `styles.css`
- **Smart Transitions**: Use GSAP to animate the charts rendering, the chat box expanding, and voice recording visualizers (pulsing mic icon).
- Add floating glassmorphism tooltips over the timeline points.

---

## Verification Plan
1. **Analysis Testing**: Upload a dummy PDF containing grades. Verify that the system tags it as "Result", generates a summary, and correctly plots a chart of the marks.
2. **Voice Search**: Click the microphone, speak "Find John", and verify the text input populates and triggers a search.
3. **Timeline**: Process 3 documents, navigate to the History tab, and verify they appear chronologically on a vertical timeline UI.
