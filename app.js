let editor = null;
let pyodide = null;
let debounceTimer = null;
let isSwitchingLanguage = false;

// Starter Code Templates for All Languages
const codeTemplates = {
    python: `# Python 3.14 WASM Engine (Client-Side)\n\ndef greet(name):\n    return f"Hello, {name}! Welcome to VibeCode Studio."\n\nprint(greet("Vibe Coder"))\n\n# Quick calculation\nnumbers = [1, 2, 3, 4, 5]\nprint("Squared Numbers:", [x**2 for x in numbers])\n`,
    
    html: `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: 'Segoe UI', sans-serif; text-align: center; padding-top: 50px; background: #0f172a; color: white; }\n    h1 { color: #38bdf8; font-size: 28px; }\n    p { color: #94a3b8; font-size: 16px; }\n    button { padding: 12px 24px; font-size: 15px; background: #22c55e; border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 15px; }\n    button:hover { background: #16a34a; }\n  </style>\n</head>\n<body>\n  <h1>⚡ VibeCode Live Web Preview</h1>\n  <p>Edit HTML, CSS or JS and watch the canvas update live!</p>\n  <button onclick="alert('JavaScript is working inside Live Preview!')">Click Test Alert</button>\n</body>\n</html>\n`,
    
    cpp: `// C++ Advanced Browser Engine\n#include <iostream>\n\nint square(int n) {\n    return n * n;\n}\n\nint main() {\n    std::cout << "⚡ Hello from C++ Browser Engine!" << std::endl;\n    \n    for (int i = 1; i <= 5; i++) {\n        std::cout << "Square of " << i << " is: " << square(i) << std::endl;\n    }\n    \n    return 0;\n}\n`,
    
    java: `// Java Advanced Browser Engine\npublic class Main {\n    public static int multiply(int a, int b) {\n        return a * b;\n    }\n\n    public static void main(String[] args) {\n        System.out.println("☕ Hello from Java Browser Engine!");\n        \n        for (int i = 1; i <= 4; i++) {\n            System.out.println("Multiplying 10 x " + i + " = " + multiply(10, i));\n        }\n    }\n}\n`,

    javascript: `// JavaScript Native Browser Engine\nfunction calculateFactorial(n) {\n    if (n === 0 || n === 1) return 1;\n    return n * calculateFactorial(n - 1);\n}\n\nconsole.log("Factorial of 5:", calculateFactorial(5));\n`
};

// UI Helpers
function logTerminal(msg) {
    const outputElement = document.getElementById('output');
    if (outputElement) outputElement.innerText = msg;
}

function updateStatus(text, bgColor) {
    const statusBar = document.querySelector('.status-bar');
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.innerText = text;
    if (statusBar) statusBar.style.backgroundColor = bgColor;
}

function clearTerminal() {
    logTerminal("");
    const iframe = document.getElementById('web-preview');
    if (iframe) {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write("");
            doc.close();
        } catch (e) {}
    }
    updateStatus("🧹 Cleared", "#007acc");
}

// 1. Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.38.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: codeTemplates.python,
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: true }
    });

    updateStatus("🟢 Editor Ready", "#007acc");

    // Auto-run event listener on typing
    editor.onDidChangeModelContent(() => {
        if (isSwitchingLanguage) return;
        
        updateStatus("✍️ Typing...", "#e2c044");
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            runCode();
        }, 700);
    });

    // Run initial code once editor is ready
    setTimeout(() => {
        runCode();
    }, 200);
});

// 2. Initialize Pyodide Engine for Python
async function initPyodide() {
    if (typeof loadPyodide === 'undefined') {
        logTerminal("⚠️ Pyodide CDN not loaded. Python WASM will be unavailable.");
        return;
    }
    try {
        logTerminal("⏳ Downloading Python WASM Engine (Client-Side)...");
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
        });
        logTerminal("🟢 Python 3.14 WASM Engine Ready!\nClick '▶ Manual Run' or select a language to execute.");
        updateStatus("🟢 Ready", "#007acc");
        
        // Run Python automatically if selected
        const selectedLang = document.getElementById('language-select').value;
        if (selectedLang === 'python') {
            runCode();
        }
    } catch (err) {
        logTerminal("❌ Pyodide Load Error: " + err.message);
    }
}
window.addEventListener('load', initPyodide);

// 3. Language Switch Handler
function changeLanguage() {
    if (!editor) return;

    isSwitchingLanguage = true;
    clearTimeout(debounceTimer);

    const selectedLang = document.getElementById('language-select').value;
    const langTag = document.getElementById('lang-tag');
    const outputTerminal = document.getElementById('output');
    const webPreview = document.getElementById('web-preview');
    const outputTitle = document.getElementById('output-title');

    langTag.innerText = selectedLang.toUpperCase();

    // Change Monaco Editor Language Mode
    let monacoLang = selectedLang;
    if (selectedLang === 'html') monacoLang = 'html';
    monaco.editor.setModelLanguage(editor.getModel(), monacoLang);

    // Set Code Template
    editor.setValue(codeTemplates[selectedLang] || "");

    // Toggle View: HTML gets iFrame preview, others get Text Terminal
    if (selectedLang === 'html') {
        outputTerminal.style.display = 'none';
        webPreview.style.display = 'block';
        outputTitle.innerText = "Live Web Preview Canvas";
    } else {
        outputTerminal.style.display = 'block';
        webPreview.style.display = 'none';
        outputTitle.innerText = "Live Terminal Output";
    }

    setTimeout(() => {
        isSwitchingLanguage = false;
        runCode();
    }, 50);
}

// 4. Main Router Execution Function (100% Client-Side In-Browser)
async function runCode() {
    if (!editor) return;

    const selectedLang = document.getElementById('language-select').value;
    const code = editor.getValue();

    // Engine 1: HTML / CSS Live iFrame Canvas
    if (selectedLang === 'html') {
        const iframe = document.getElementById('web-preview');
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(code);
            doc.close();
            updateStatus("🟢 HTML Rendered Live", "#007acc");
        } catch (e) {
            iframe.srcdoc = code;
        }
        return;
    }

    // Engine 2: Python (WebAssembly Pyodide - Local)
    if (selectedLang === 'python') {
        if (!pyodide) {
            logTerminal("⏳ Python WASM Engine is downloading from CDN... Please wait a few seconds.");
            return;
        }
        updateStatus("⚡ Running Python (WASM)...", "#007acc");
        try {
            pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
            `);
            await pyodide.runPythonAsync(code);
            let stdout = pyodide.runPython("sys.stdout.getvalue()");
            logTerminal(stdout || "Executed successfully (no print output).");
            updateStatus("🟢 Python WASM Success", "#007acc");
        } catch (err) {
            logTerminal(`❌ Python Error:\n${err.message}`);
            updateStatus("🔴 Execution Error", "#cd3131");
        }
        return;
    }

    // Engine 3: JavaScript (Native Browser Engine - Local)
    if (selectedLang === 'javascript') {
        updateStatus("⚡ Running JavaScript (Browser)...", "#007acc");
        executeClientJS(code);
        return;
    }

    // Engine 4: C++ (Advanced Browser Compiler Engine)
    if (selectedLang === 'cpp') {
        updateStatus("⚡ Running C++ (Browser Engine)...", "#007acc");
        executeClientCpp(code);
        return;
    }

    // Engine 5: Java (Advanced Browser Engine)
    if (selectedLang === 'java') {
        updateStatus("⚡ Running Java (Browser Engine)...", "#007acc");
        executeClientJava(code);
        return;
    }
}

// Client-Side JS Executor
function executeClientJS(code) {
    try {
        let logs = [];
        const originalLog = console.log;
        console.log = function(...args) {
            logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
            originalLog.apply(console, args);
        };

        const result = new Function(code)();
        console.log = originalLog;

        let output = logs.join('\n');
        if (result !== undefined && output === "") {
            output = String(result);
        }
        logTerminal(output || "Executed successfully (no console.log output).");
        updateStatus("🟢 JS Success", "#007acc");
    } catch (err) {
        logTerminal(`❌ JavaScript Error:\n${err.message}`);
        updateStatus("🔴 JS Error", "#cd3131");
    }
}

// Client-Side C++ Transpiler Engine
function executeClientCpp(code) {
    try {
        let clean = code
            .replace(/\/\/.*/g, "")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/#include\s*<.*?>/g, "")
            .replace(/using\s+namespace\s+std;/g, "");

        clean = clean.replace(/(?:int|void|double|float|std::string|string|bool)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)/g, function(match, fnName, args) {
            if (fnName === "main") return "function main()";
            let cleanArgs = args.split(",").map(arg => {
                return arg.trim().replace(/(?:int|void|double|float|std::string|string|bool)\s+/, "");
            }).join(", ");
            return `function ${fnName}(${cleanArgs})`;
        });

        clean = clean.replace(/\b(?:int|double|float|std::string|string|bool|auto)\s+/g, "let ");

        clean = clean.replace(/std::cout\s*<<\s*([\s\S]*?);/g, function(match, body) {
            let parts = body.split("<<").map(p => {
                let trimmed = p.trim();
                if (trimmed === "std::endl" || trimmed === "endl") return '"\\n"';
                return trimmed;
            });
            return `__cout(${parts.join(", ")});`;
        });

        clean = clean.replace(/return\s+0\s*;/g, "");

        let runnerScript = `
            let __buffer = [];
            function __cout(...args) {
                __buffer.push(args.join(""));
            }
            ${clean}
            if (typeof main === "function") {
                main();
            }
            return __buffer.join("");
        `;

        let result = new Function(runnerScript)();
        logTerminal(result || "Executed successfully (no output).");
        updateStatus("🟢 C++ Engine Success", "#007acc");
    } catch (err) {
        logTerminal(`❌ C++ Client Execution Error:\n${err.message}`);
        updateStatus("🔴 C++ Error", "#cd3131");
    }
}

// Client-Side Java Transpiler Engine
function executeClientJava(code) {
    try {
        let clean = code
            .replace(/\/\/.*/g, "")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/public\s+class\s+[a-zA-Z0-9_]+\s*\{[\s\n]*/g, "")
            .replace(/public\s+static\s+(?:int|void|double|float|String|boolean)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)/g, function(match, fnName, args) {
                if (fnName === "main") return "function main()";
                let cleanArgs = args.split(",").map(arg => {
                    return arg.trim().replace(/(?:int|double|float|String|boolean|String\[\]|int\[\])\s+/, "");
                }).join(", ");
                return `function ${fnName}(${cleanArgs})`;
            })
            .replace(/static\s+(?:int|void|double|float|String|boolean)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)/g, function(match, fnName, args) {
                let cleanArgs = args.split(",").map(arg => {
                    return arg.trim().replace(/(?:int|double|float|String|boolean|String\[\]|int\[\])\s+/, "");
                }).join(", ");
                return `function ${fnName}(${cleanArgs})`;
            })
            .replace(/(?:private|protected|public)\s+(?:int|void|double|float|String|boolean)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)/g, function(match, fnName, args) {
                let cleanArgs = args.split(",").map(arg => {
                    return arg.trim().replace(/(?:int|double|float|String|boolean|String\[\]|int\[\])\s+/, "");
                }).join(", ");
                return `function ${fnName}(${cleanArgs})`;
            });

        clean = clean.replace(/System\.out\.println\s*\(([\s\S]*?)\);/g, "__println($1);");
        clean = clean.replace(/System\.out\.print\s*\(([\s\S]*?)\);/g, "__print($1);");
        clean = clean.replace(/\b(?:int|double|float|String|boolean|long|short|char)\s+/g, "let ");

        // Remove outer class closing brace
        let lastBrace = clean.lastIndexOf('}');
        if (lastBrace !== -1) {
            clean = clean.substring(0, lastBrace) + clean.substring(lastBrace + 1);
        }

        let runnerScript = `
            let __buffer = [];
            function __println(...args) {
                __buffer.push(args.join("") + "\\n");
            }
            function __print(...args) {
                __buffer.push(args.join(""));
            }
            ${clean}
            if (typeof main === "function") {
                main();
            }
            return __buffer.join("");
        `;

        let result = new Function(runnerScript)();
        logTerminal(result || "Executed successfully (no output).");
        updateStatus("🟢 Java Engine Success", "#007acc");
    } catch (err) {
        logTerminal(`❌ Java Client Execution Error:\n${err.message}`);
        updateStatus("🔴 Java Error", "#cd3131");
    }
}
