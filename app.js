let editor = null;
let pyodide = null;
let debounceTimer = null;

// Terminal Log Helper
function logTerminal(msg) {
    const outputElement = document.getElementById('output');
    if (outputElement) {
        outputElement.innerText = msg;
    }
}

// Status Bar Helper
function updateStatus(text, bgColor) {
    const statusBar = document.querySelector('.status-bar');
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.innerText = text;
    if (statusBar) statusBar.style.backgroundColor = bgColor;
}

// Clear Terminal Helper
function clearTerminal() {
    logTerminal("");
    updateStatus("🧹 Terminal Cleared", "#007acc");
}

// 1. Initialize Monaco Editor
try {
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.38.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(document.getElementById('editor'), {
            value: `# VibeCode Python 3.14 Studio\n\nprint("Hello World from Python!")\n\na = 10\nb = 20\nprint(f"Sum of {a} + {b} = {a + b}")\n`,
            language: 'python',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: true }
        });

        // Auto-run event listener on typing
        editor.onDidChangeModelContent(() => {
            updateStatus("✍️ Typing...", "#e2c044");
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                runPythonCode();
            }, 700);
        });

        console.log("Monaco Editor Initialized Successfully.");
    });
} catch (e) {
    console.error("Monaco Load Error:", e);
    logTerminal("❌ Monaco Editor Load Error: " + e.message);
}

// 2. Initialize Pyodide Engine
async function initEngine() {
    logTerminal("Step 2: Downloading Python WebAssembly Engine... (Please wait)");
    updateStatus("🟡 Downloading Python Engine...", "#e2c044");

    if (typeof loadPyodide === 'undefined') {
        logTerminal("❌ ERROR: Pyodide script CDN link is blocked by network or browser extensions.\nPlease check internet connection or disable AdBlocker.");
        updateStatus("🔴 CDN Error", "#cd3131");
        return;
    }

    try {
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
        });
        
        logTerminal("🟢 Python Engine Ready! Click '▶ Manual Run' or type code to auto-execute.");
        updateStatus("🟢 Python Engine Ready", "#007acc");

        // First test run
        runPythonCode();
    } catch (err) {
        logTerminal("❌ Pyodide Engine Failed to Initialize:\n" + err.message);
        updateStatus("🔴 Load Failed", "#cd3131");
    }
}

// Run Engine Setup after window loads
window.addEventListener('load', initEngine);

// 3. Execute Python Code Function
async function runPythonCode() {
    if (!pyodide) {
        logTerminal("⚠️ Engine is still downloading Python WebAssembly files... Please wait.");
        updateStatus("🟡 Engine Loading...", "#e2c044");
        return;
    }

    if (!editor) {
        logTerminal("⚠️ Monaco Editor is initializing... Please wait.");
        return;
    }

    const code = editor.getValue();
    updateStatus("⚡ Running Code...", "#007acc");

    try {
        // Redirect stdout to capture print statements
        pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
        `);

        await pyodide.runPythonAsync(code);

        let output = pyodide.runPython("sys.stdout.getvalue()");
        logTerminal(output || "Code executed successfully (no print output).");
        updateStatus("🟢 Execution Success", "#007acc");
    } catch (err) {
        logTerminal(`❌ Execution Error:\n${err.message}`);
        updateStatus("🔴 Execution Error", "#cd3131");
    }
}
