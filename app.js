let editor;
let pyodide;

// 1. Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.38.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: `# Welcome to VibeCode Python Studio\n\ndef greet(name):\n    return f"Hello, {name}! Your Python Editor is Working Live!"\n\nprint(greet("Developer"))\n\n# Calculation test\na = 4\nb = 3\nprint(f"Result: {a} + {b} = {a + b}")\n`,
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: true }
    });
});

// 2. Initialize Pyodide Engine (v0.24.1) with Error Catching
async function main() {
    const outputElement = document.getElementById('output');
    try {
        outputElement.innerText = "Downloading Python Engine... Please wait.";
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
        });
        outputElement.innerText = "Python 3 Engine Ready! Click 'Run Code' to execute.";
    } catch (error) {
        outputElement.innerText = "Error loading Python Engine:\n" + error.message;
        console.error("Pyodide Load Error:", error);
    }
}
main();

// 3. Execute Python Code Function
async function runPythonCode() {
    const outputElement = document.getElementById('output');
    if (!pyodide) {
        outputElement.innerText = "Engine is still loading, please wait...";
        return;
    }

    const code = editor.getValue();
    outputElement.innerText = "Executing...";

    try {
        // Redirect Python print() output to HTML terminal box
        pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
        `);

        await pyodide.runPythonAsync(code);

        let stdout = pyodide.runPython("sys.stdout.getvalue()");
        outputElement.innerText = stdout || "Code executed successfully with no output.";
    } catch (err) {
        outputElement.innerText = `Error:\n${err.message}`;
    }
}