# 🚀 VibeCode Studio — Client-Side Multi-Language Web IDE

**VibeCode Studio** is a lightweight, feature-rich, 100% in-browser IDE designed to run, preview, format, and debug multi-language code with **zero backend server costs**. Powered by **Monaco Editor** (VS Code's engine) and **Pyodide WebAssembly**, it executes Python, JavaScript, C++, Java, and HTML/CSS dynamically inside browser memory.

---

## ✨ Key Features Breakdown

### 🎨 1. Monaco Editor & UI Customization
* **VS Code Engine:** Powered by Monaco Editor CDN for syntax highlighting, code completion, and line numbers.
* **Theme Switcher:** Seamlessly switch between **VS Dark**, **VS Light**, and **High Contrast Black** themes.
* **Font Scaling:** Dynamically adjust font sizes (`12px`, `14px`, `18px`, `20px`).
* **Code Formatter:** One-click document beautifier and auto-indentation.

### 📁 2. File & Project Management
* **File Export (Download):** Save code locally as `.py`, `.cpp`, `.java`, `.html`, or `.js` using Blob API.
* **File Import:** Upload local code files directly into the editor using FileReader API with auto-language detection.
* **Auto-Save & Restore:** Persists editor state, themes, and font preferences using browser `localStorage`.

### ⚡ 3. Advanced Execution & Live Sharing
* **Execution Benchmark:** Displays exact execution runtime in milliseconds (`performance.now()`) in the status bar.
* **Shareable URL Links:** Encodes code and language into a Base64 URL hash for instant sharing.
* **HTML Multi-Tab Editor:** Dedicated sub-tabs for `index.html`, `style.css`, and `script.js` with live iFrame bundling.

### 💡 4. Smart AI Debug Helper
* **Automated Error Detection:** Scans terminal logs for execution and syntax tracebacks.
* **Structured Modal Breakdown:** Displays a modal overlay parsing:
  1. **What Went Wrong** (Plain English explanation)
  2. **Why It Happened** (Root cause)
  3. **Suggested Fix** (Corrected code snippet)

---

## 🛠️ Tech Stack & Architecture

* **Frontend UI:** HTML5, CSS3 (VS Code dark aesthetic)
* **Core Logic:** Pure Vanilla JavaScript (ES6+)
* **Editor Component:** Monaco Editor CDN
* **Python Engine:** Pyodide WebAssembly (Python 3.14 in browser RAM)
* **Browser APIs:** `localStorage`, `FileReader API`, `Blob API`, `performance.now()`