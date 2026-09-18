let editor = null;
let pyodide = null;
let debounceTimer = null;
let isSwitchingLanguage = false;
let currentHtmlTab = 'html';
let htmlTabContents = {
    html: '',
    css: '',
    js: ''
};

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
    if (outputElement) {
        // Check if message contains an error
        if (isErrorOutput(msg)) {
            // Create error message with explain button
            outputElement.innerHTML = msg + '\n\n<button class="explain-btn" onclick="explainError(\'' + msg.replace(/'/g, "\\'") + '\')">💡 Explain Error</button>';
        } else {
            outputElement.innerText = msg;
        }
    }
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

// File Management Functions
function downloadCode() {
    if (!editor) return;
    
    const code = editor.getValue();
    const selectedLang = document.getElementById('language-select').value;
    
    const extensionMap = {
        'python': '.py',
        'html': '.html',
        'cpp': '.cpp',
        'java': '.java',
        'javascript': '.js'
    };
    
    const extension = extensionMap[selectedLang] || '.txt';
    const filename = `vibecode_code${extension}`;
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    updateStatus("📥 Code Downloaded", "#007acc");
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        
        // Auto-detect language from file extension
        const filename = file.name.toLowerCase();
        const extensionMap = {
            '.py': 'python',
            '.html': 'html',
            '.htm': 'html',
            '.css': 'css',
            '.js': 'javascript',
            '.cpp': 'cpp',
            '.cc': 'cpp',
            '.cxx': 'cpp',
            '.java': 'java'
        };
        
        let detectedLang = null;
        for (const [ext, lang] of Object.entries(extensionMap)) {
            if (filename.endsWith(ext)) {
                detectedLang = lang;
                break;
            }
        }
        
        if (detectedLang) {
            // Special handling for HTML/CSS/JS files for multi-tab
            if (detectedLang === 'html') {
                htmlTabContents.html = content;
                htmlTabContents.css = '';
                htmlTabContents.js = '';
            } else if (detectedLang === 'css') {
                htmlTabContents.css = content;
                htmlTabContents.html = '';
                htmlTabContents.js = '';
            } else if (detectedLang === 'javascript') {
                htmlTabContents.js = content;
                htmlTabContents.html = '';
                htmlTabContents.css = '';
            } else {
                // For non-HTML languages, set directly to editor
                if (editor) {
                    editor.setValue(content);
                }
            }
            
            const langSelect = document.getElementById('language-select');
            langSelect.value = detectedLang;
            changeLanguage();
            updateStatus(`📂 Imported: ${file.name}`, "#007acc");
        } else {
            // Unknown extension, just set content
            if (editor) {
                editor.setValue(content);
            }
            updateStatus(`📂 Imported: ${file.name} (Unknown extension)`, "#e2c044");
        }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// localStorage Functions
function saveToLocalStorage() {
    if (!editor) return;
    
    const code = editor.getValue();
    const selectedLang = document.getElementById('language-select').value;
    const selectedTheme = document.getElementById('theme-select').value;
    const selectedFontSize = document.getElementById('font-size-select').value;
    
    try {
        localStorage.setItem('vibecode_code', code);
        localStorage.setItem('vibecode_language', selectedLang);
        localStorage.setItem('vibecode_theme', selectedTheme);
        localStorage.setItem('vibecode_fontsize', selectedFontSize);
    } catch (e) {
        console.warn('localStorage save failed:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const savedCode = localStorage.getItem('vibecode_code');
        const savedLang = localStorage.getItem('vibecode_language');
        const savedTheme = localStorage.getItem('vibecode_theme');
        const savedFontSize = localStorage.getItem('vibecode_fontsize');
        
        if (savedLang) {
            const langSelect = document.getElementById('language-select');
            langSelect.value = savedLang;
        }
        
        if (savedTheme) {
            const themeSelect = document.getElementById('theme-select');
            themeSelect.value = savedTheme;
        }
        
        if (savedFontSize) {
            const fontSizeSelect = document.getElementById('font-size-select');
            fontSizeSelect.value = savedFontSize;
        }
        
        return savedCode;
    } catch (e) {
        console.warn('localStorage load failed:', e);
        return null;
    }
}

// Theme Switching Function
function changeTheme() {
    if (!editor) return;
    
    const selectedTheme = document.getElementById('theme-select').value;
    
    // Update Monaco Editor theme
    monaco.editor.setTheme(selectedTheme);
    
    // Update page body class for CSS theme styling
    document.body.className = '';
    if (selectedTheme === 'vs-light') {
        document.body.classList.add('theme-vs-light');
    } else if (selectedTheme === 'hc-black') {
        document.body.classList.add('theme-hc-black');
    }
    
    // Save to localStorage
    saveToLocalStorage();
    
    updateStatus(`🎨 Theme: ${selectedTheme}`, "#007acc");
}

// Font Size Changing Function
function changeFontSize() {
    if (!editor) return;
    
    const selectedSize = parseInt(document.getElementById('font-size-select').value);
    
    // Update Monaco Editor font size
    editor.updateOptions({
        fontSize: selectedSize
    });
    
    // Save to localStorage
    saveToLocalStorage();
    
    updateStatus(`🔤 Font Size: ${selectedSize}px`, "#007acc");
}

// Code Formatting Function
function formatCode() {
    if (!editor) return;
    
    try {
        // Try to use Monaco's built-in format action
        const action = editor.getAction('editor.action.formatDocument');
        if (action) {
            action.run();
            updateStatus("✨ Code Formatted", "#007acc");
        } else {
            // Fallback: simple auto-indent
            const code = editor.getValue();
            const formattedCode = simpleAutoIndent(code);
            editor.setValue(formattedCode);
            updateStatus("✨ Code Auto-Indented", "#007acc");
        }
    } catch (e) {
        // Fallback to simple auto-indent
        const code = editor.getValue();
        const formattedCode = simpleAutoIndent(code);
        editor.setValue(formattedCode);
        updateStatus("✨ Code Auto-Indented", "#007acc");
    }
    
    // Save to localStorage after formatting
    saveToLocalStorage();
}

// Simple auto-indent helper function
function simpleAutoIndent(code) {
    const lines = code.split('\n');
    let indentLevel = 0;
    const indentSize = 4;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // Decrease indent for closing braces
        if (line.startsWith('}') || line.startsWith(']') || line.startsWith(')')) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        
        // Apply current indent
        if (line.length > 0) {
            lines[i] = ' '.repeat(indentLevel * indentSize) + line;
        }
        
        // Increase indent for opening braces
        if (line.endsWith('{') || line.endsWith('[') || line.endsWith('(')) {
            indentLevel++;
        }
    }
    
    return lines.join('\n');
}

// Share Code Function
function shareCode() {
    if (!editor) return;
    
    const code = editor.getValue();
    const selectedLang = document.getElementById('language-select').value;
    
    // Create shareable data object
    const shareData = {
        code: code,
        lang: selectedLang
    };
    
    // Encode to Base64
    const encodedData = btoa(JSON.stringify(shareData));
    
    // Create shareable URL
    const shareUrl = `${window.location.origin}${window.location.pathname}#code=${encodedData}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        updateStatus("🔗 Share Link Copied!", "#007acc");
        logTerminal("🔗 Shareable URL copied to clipboard:\n" + shareUrl);
    }).catch(err => {
        updateStatus("❌ Copy Failed", "#cd3131");
        logTerminal("❌ Failed to copy to clipboard: " + err.message);
    });
}

// Load Shared Code from URL Hash
function loadSharedCode() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#code=')) {
        try {
            const encodedData = hash.substring(6); // Remove '#code='
            const decodedData = JSON.parse(atob(encodedData));
            
            if (decodedData.code && decodedData.lang) {
                // Set language
                const langSelect = document.getElementById('language-select');
                langSelect.value = decodedData.lang;
                
                // Set code after editor is ready
                if (editor) {
                    editor.setValue(decodedData.code);
                    changeLanguage();
                    updateStatus("📥 Shared Code Loaded", "#007acc");
                    logTerminal("📥 Shared code loaded successfully!");
                }
            }
        } catch (e) {
            console.warn('Failed to load shared code:', e);
        }
    }
}

// HTML Multi-Tab Functions
function switchHtmlTab(tabName) {
    if (!editor) return;
    
    // Save current tab content
    htmlTabContents[currentHtmlTab] = editor.getValue();
    
    // Update current tab
    currentHtmlTab = tabName;
    
    // Update tab UI
    document.querySelectorAll('.html-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Load new tab content
    editor.setValue(htmlTabContents[tabName] || '');
    
    // Update Monaco Editor language mode
    let monacoLang = 'html';
    if (tabName === 'css') monacoLang = 'css';
    if (tabName === 'js') monacoLang = 'javascript';
    monaco.editor.setModelLanguage(editor.getModel(), monacoLang);
    
    // Save to localStorage
    saveToLocalStorage();
}

function bundleHtmlCode() {
    const htmlContent = htmlTabContents.html || '';
    const cssContent = htmlTabContents.css || '';
    const jsContent = htmlTabContents.js || '';
    
    let bundledCode = htmlContent;
    
    // Inject CSS if present
    if (cssContent.trim()) {
        if (bundledCode.includes('<head>')) {
            bundledCode = bundledCode.replace('<head>', `<head>\n  <style>\n${cssContent}\n  </style>`);
        } else if (bundledCode.includes('<html>')) {
            bundledCode = bundledCode.replace('<html>', `<html>\n<head>\n  <style>\n${cssContent}\n  </style>\n</head>`);
        } else {
            bundledCode = `<head>\n  <style>\n${cssContent}\n  </style>\n</head>\n` + bundledCode;
        }
    }
    
    // Inject JS if present
    if (jsContent.trim()) {
        if (bundledCode.includes('</body>')) {
            bundledCode = bundledCode.replace('</body>', `  <script>\n${jsContent}\n  </script>\n</body>`);
        } else if (bundledCode.includes('</html>')) {
            bundledCode = bundledCode.replace('</html>', `  <script>\n${jsContent}\n  </script>\n</html>`);
        } else {
            bundledCode = bundledCode + `\n  <script>\n${jsContent}\n  </script>`;
        }
    }
    
    return bundledCode;
}

// Error Explanation Functions
function closeErrorModal() {
    document.getElementById('error-modal').style.display = 'none';
}

function explainError(errorMessage) {
    const explanation = generateErrorExplanation(errorMessage);
    
    document.getElementById('error-what').textContent = explanation.what;
    document.getElementById('error-why').textContent = explanation.why;
    document.getElementById('error-fix').textContent = explanation.fix;
    
    document.getElementById('error-modal').style.display = 'flex';
}

function generateErrorExplanation(errorMessage) {
    const error = errorMessage.toLowerCase();
    
    // Python Errors
    if (error.includes('syntaxerror')) {
        return {
            what: 'Syntax Error - Your Python code has invalid syntax.',
            why: 'Python could not parse your code. This usually happens due to missing colons, incorrect indentation, or unmatched parentheses.',
            fix: '# Check for:\n# - Missing colons after if/for/while/def\n# - Incorrect indentation (use 4 spaces)\n# - Unmatched parentheses/brackets\n# - Missing quotes around strings\n\n# Example fix:\nif True:\n    print("Hello")  # Correct indentation'
        };
    }
    
    if (error.includes('nameerror') || error.includes('is not defined')) {
        return {
            what: 'NameError - A variable or function is used before being defined.',
            why: 'You tried to use a variable or function that hasn\'t been declared or is out of scope.',
            fix: '# Define variables before using them\nmy_var = 10\nprint(my_var)\n\n# Or check if variable exists\nif "my_var" in locals():\n    print(my_var)'
        };
    }
    
    if (error.includes('typeerror')) {
        return {
            what: 'TypeError - An operation was performed on an incompatible data type.',
            why: 'You tried to use an operation or function on the wrong type of data (e.g., adding a string to a number).',
            fix: '# Convert types before operations\nnum = 10\ntext = "5"\nresult = num + int(text)  # Convert string to int\nprint(result)'
        };
    }
    
    if (error.includes('indentationerror')) {
        return {
            what: 'IndentationError - Incorrect indentation in Python code.',
            why: 'Python uses indentation to define code blocks. Mixed tabs and spaces or inconsistent spacing causes this error.',
            fix: '# Use consistent 4-space indentation\ndef my_function():\n    if True:\n        print("Correct indentation")\n    return True'
        };
    }
    
    // JavaScript Errors
    if (error.includes('syntaxerror') && error.includes('javascript')) {
        return {
            what: 'Syntax Error - Your JavaScript code has invalid syntax.',
            why: 'The JavaScript parser encountered code it couldn\'t understand. Common causes: missing brackets, semicolons, or quotes.',
            fix: '// Check for:\n// - Missing closing brackets/parentheses\n// - Missing semicolons\n// - Unmatched quotes\n\n// Example fix:\nfunction greet() {\n    console.log("Hello");\n}'
        };
    }
    
    if (error.includes('referenceerror') || (error.includes('is not defined') && error.includes('javascript'))) {
        return {
            what: 'ReferenceError - A variable is being referenced that hasn\'t been declared.',
            why: 'You tried to use a variable that doesn\'t exist in the current scope.',
            fix: '// Declare variables before use\nlet myVar = 10;\nconsole.log(myVar);\n\n// Or use const for constants\nconst PI = 3.14;'
        };
    }
    
    if (error.includes('typeerror') && error.includes('javascript')) {
        return {
            what: 'TypeError - An operation was performed on the wrong data type.',
            why: 'You tried to use a value in a way that doesn\'t match its type (e.g., calling a non-function as a function).',
            fix: '// Check types before operations\nlet num = 10;\nlet str = "5";\nlet result = num + Number(str); // Convert string to number\nconsole.log(result);'
        };
    }
    
    // C++ Errors
    if (error.includes('cout is not defined') || error.includes('__cout')) {
        return {
            what: 'C++ cout Error - The cout statement could not be transpiled.',
            why: 'The C++ transpiler failed to convert the cout statement to JavaScript. This may be due to complex cout expressions.',
            fix: '// Use simple cout statements:\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello" << endl;\n    int x = 5;\n    cout << x << endl;\n    return 0;\n}'
        };
    }
    
    if (error.includes('c++') && error.includes('error')) {
        return {
            what: 'C++ Transpilation Error - The C++ code could not be converted to JavaScript.',
            why: 'The C++ transpiler encountered syntax it couldn\'t handle. This may be due to advanced C++ features not supported in the browser engine.',
            fix: '// Use basic C++ syntax:\n// - Simple types: int, double, string, bool\n// - Basic functions\n// - cout for output\n// Avoid: templates, advanced STL, pointers\n\nint main() {\n    int a = 5;\n    cout << a << endl;\n    return 0;\n}'
        };
    }
    
    // Java Errors
    if (error.includes('java') && error.includes('error')) {
        return {
            what: 'Java Transpilation Error - The Java code could not be converted to JavaScript.',
            why: 'The Java transpiler encountered syntax it couldn\'t handle. This may be due to advanced Java features not supported.',
            fix: '// Use basic Java syntax:\n// - Simple types: int, double, String, boolean\n// - Basic methods\n// - System.out.println for output\n// Avoid: advanced OOP, generics, complex libraries\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello");\n    }\n}'
        };
    }
    
    // Generic Error
    return {
        what: 'Execution Error - An error occurred while running your code.',
        why: 'The code execution failed. Check the error message for specific details about what went wrong.',
        fix: '// General debugging tips:\n// 1. Check for syntax errors\n// 2. Verify variable names are correct\n// 3. Ensure all brackets/parentheses are matched\n// 4. Check data types match operations\n// 5. Review the error message for line numbers'
    };
}

function isErrorOutput(message) {
    const errorKeywords = [
        'error', 'Error', 'ERROR',
        'exception', 'Exception', 'EXCEPTION',
        'failed', 'Failed', 'FAILED',
        'undefined', 'null',
        'syntaxerror', 'referenceerror', 'typeerror',
        'nameerror', 'indentationerror',
        '❌'
    ];
    return errorKeywords.some(keyword => message.includes(keyword));
}

// 1. Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.38.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
    // Try to load saved code from localStorage
    const savedCode = loadFromLocalStorage();
    const initialCode = savedCode || codeTemplates.python;
    
    // Get the language from localStorage or default to python
    const savedLang = localStorage.getItem('vibecode_language');
    const initialLang = savedLang || 'python';
    
    // Get the theme from localStorage or default to vs-dark
    const savedTheme = localStorage.getItem('vibecode_theme');
    const initialTheme = savedTheme || 'vs-dark';
    
    // Get the font size from localStorage or default to 14
    const savedFontSize = localStorage.getItem('vibecode_fontsize');
    const initialFontSize = savedFontSize ? parseInt(savedFontSize) : 14;
    
    // Update language selector if saved language exists
    if (savedLang) {
        const langSelect = document.getElementById('language-select');
        if (langSelect) langSelect.value = savedLang;
    }
    
    // Apply initial theme to page body
    if (initialTheme === 'vs-light') {
        document.body.classList.add('theme-vs-light');
    } else if (initialTheme === 'hc-black') {
        document.body.classList.add('theme-hc-black');
    }
    
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: initialCode,
        language: initialLang,
        theme: initialTheme,
        automaticLayout: true,
        fontSize: initialFontSize,
        minimap: { enabled: true }
    });

    updateStatus("🟢 Editor Ready", "#007acc");

    // Auto-run event listener on typing
    editor.onDidChangeModelContent(() => {
        if (isSwitchingLanguage) return;
        
        // Auto-save to localStorage on every change
        saveToLocalStorage();
        
        updateStatus("✍️ Typing...", "#e2c044");
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            runCode();
        }, 700);
    });

    // Run initial code once editor is ready
    setTimeout(() => {
        // Load shared code from URL hash if present
        loadSharedCode();
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
    const htmlTabs = document.getElementById('html-tabs');

    langTag.innerText = selectedLang.toUpperCase();

    // Change Monaco Editor Language Mode
    let monacoLang = selectedLang;
    if (selectedLang === 'html') monacoLang = 'html';
    monaco.editor.setModelLanguage(editor.getModel(), monacoLang);

    // Toggle HTML multi-tab visibility
    if (selectedLang === 'html') {
        htmlTabs.style.display = 'flex';
        // Initialize HTML tabs with template only if completely empty
        if (!htmlTabContents.html && !htmlTabContents.css && !htmlTabContents.js) {
            htmlTabContents.html = codeTemplates.html;
            htmlTabContents.css = '';
            htmlTabContents.js = '';
        }
        // Switch to HTML tab
        switchHtmlTab('html');
    } else {
        htmlTabs.style.display = 'none';
        // Set Code Template for non-HTML languages
        editor.setValue(codeTemplates[selectedLang] || "");
    }

    // Save to localStorage after language change
    saveToLocalStorage();

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
    
    // Start benchmark timer
    const startTime = performance.now();

    // Engine 1: HTML / CSS Live iFrame Canvas
    if (selectedLang === 'html') {
        // Save current tab content before bundling
        htmlTabContents[currentHtmlTab] = code;
        
        // Bundle all HTML tabs
        const bundledCode = bundleHtmlCode();
        
        const iframe = document.getElementById('web-preview');
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(bundledCode);
            doc.close();
            const endTime = performance.now();
            const executionTime = (endTime - startTime).toFixed(2);
            updateStatus(`🟢 HTML Rendered Live (${executionTime}ms)`, "#007acc");
        } catch (e) {
            iframe.srcdoc = bundledCode;
            const endTime = performance.now();
            const executionTime = (endTime - startTime).toFixed(2);
            updateStatus(`🟢 HTML Rendered Live (${executionTime}ms)`, "#007acc");
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
            const endTime = performance.now();
            const executionTime = (endTime - startTime).toFixed(2);
            updateStatus(`🟢 Python WASM Success (${executionTime}ms)`, "#007acc");
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
        const endTime = performance.now();
        const executionTime = (endTime - startTime).toFixed(2);
        updateStatus(`🟢 JS Success (${executionTime}ms)`, "#007acc");
        return;
    }

    // Engine 4: C++ (Advanced Browser Compiler Engine)
    if (selectedLang === 'cpp') {
        updateStatus("⚡ Running C++ (Browser Engine)...", "#007acc");
        executeClientCpp(code);
        const endTime = performance.now();
        const executionTime = (endTime - startTime).toFixed(2);
        updateStatus(`🟢 C++ Engine Success (${executionTime}ms)`, "#007acc");
        return;
    }

    // Engine 5: Java (Advanced Browser Engine)
    if (selectedLang === 'java') {
        updateStatus("⚡ Running Java (Browser Engine)...", "#007acc");
        executeClientJava(code);
        const endTime = performance.now();
        const executionTime = (endTime - startTime).toFixed(2);
        updateStatus(`🟢 Java Engine Success (${executionTime}ms)`, "#007acc");
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

        // Handle std::cout first
        clean = clean.replace(/std::cout\s*<<\s*([\s\S]*?);/g, function(match, body) {
            let parts = body.split("<<").map(p => {
                let trimmed = p.trim();
                if (trimmed === "std::endl" || trimmed === "endl") return '"\\n"';
                return trimmed;
            });
            return `__cout(${parts.join(", ")});`;
        });

        // Handle plain cout (after using namespace std is removed)
        clean = clean.replace(/\bcout\s*<<\s*([\s\S]*?);/g, function(match, body) {
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
