// ========================
// DOM ELEMENTS
// ========================
const textEditor = document.getElementById('text-editor');
const fgColorInput = document.getElementById('fg-color');
const bgColorInput = document.getElementById('bg-color');
const wcagGauge = document.getElementById('wcag-gauge');
const wcagStatus = document.getElementById('wcag-status');
const fgProblemIcon = document.getElementById('fg-problem-icon');
const bgProblemIcon = document.getElementById('bg-problem-icon');

const fixDarkerBtn = document.getElementById('fix-darker-btn');
const fixLighterBtn = document.getElementById('fix-lighter-btn');

const gradeLevelEl = document.getElementById('grade-level');
const fkScoreEl = document.getElementById('fk-score');
const wordCountEl = document.getElementById('word-count');
const sentenceCountEl = document.getElementById('sentence-count');
const readingTimeEl = document.getElementById('reading-time');
const readabilityPointer = document.getElementById('readability-pointer');
const colorBlindnessToggle = document.getElementById('color-blindness-toggle');

const suggestionsEl = document.getElementById('improvement-suggestions');

// ========================
// COLOR CONTRAST LOGIC
// ========================
function getLuminance(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const lum = [r, g, b].map((v) => {
        return (v <= 0.03928)
            ? v / 12.92
            : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return (0.2126 * lum[0]) + (0.7152 * lum[1]) + (0.0722 * lum[2]);
}

function getContrastRatio(fg, bg) {
    const L1 = getLuminance(fg);
    const L2 = getLuminance(bg);
    const brighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return ((brighter + 0.05) / (darker + 0.05)).toFixed(2);
}

function updateContrastUI() {
    const fg = fgColorInput.value;
    const bg = bgColorInput.value;
    const ratio = getContrastRatio(fg, bg);

    wcagGauge.textContent = `Ratio: ${ratio}`;
    const ratioNum = parseFloat(ratio);

    wcagGauge.classList.remove('wcag-fail', 'wcag-warn', 'wcag-pass', 'wcag-aaa');
    fixDarkerBtn.classList.add('d-none');
    fixLighterBtn.classList.add('d-none');

    if (ratioNum < 3) {
        wcagGauge.classList.add('wcag-fail');
        wcagStatus.textContent = 'Contrast fails WCAG standards.';
        fgProblemIcon.style.display = 'block';
        bgProblemIcon.style.display = 'block';
    } else if (ratioNum < 4.5) {
        wcagGauge.classList.add('wcag-warn');
        wcagStatus.textContent = 'AA Large Text (≥18pt) only. Improve contrast.';
        fgProblemIcon.style.display = 'none';
        bgProblemIcon.style.display = 'none';
    } else if (ratioNum < 7) {
        wcagGauge.classList.add('wcag-pass');
        wcagStatus.textContent = 'AA compliance. Sufficient for normal text.';
        fgProblemIcon.style.display = 'none';
        bgProblemIcon.style.display = 'none';
    } else {
        wcagGauge.classList.add('wcag-aaa');
        wcagStatus.textContent = 'AAA compliance. Ideal contrast.';
        fgProblemIcon.style.display = 'none';
        bgProblemIcon.style.display = 'none';
    }

    textEditor.style.color = fg;
    textEditor.style.backgroundColor = bg;
}

fgColorInput.addEventListener('input', updateContrastUI);
bgColorInput.addEventListener('input', updateContrastUI);

// ========================
// READABILITY LOGIC
// ========================
function calculateReadability(text) {
    const words = text.trim().split(/\s+/).filter(w => w.length);
    const wordCount = words.length;

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length);
    const sentenceCountValue = sentences.length || 1;

    const syllableCount = words.reduce((count, word) => {
        const syl = word.toLowerCase().match(/[aeiouy]+/g);
        return count + (syl ? syl.length : 1);
    }, 0);

    const fleschKincaid =
        (0.39 * (wordCount / sentenceCountValue)) +
        (11.8 * (syllableCount / wordCount)) - 15.59;

    return {
        wordCount,
        sentenceCountValue,
        fleschKincaid,
        gradeLevel: Math.max(0, Math.round(fleschKincaid))
    };
}

function updateReadabilityMetrics() {
    const text = textEditor.value;
    const stats = calculateReadability(text);

    gradeLevelEl.textContent = stats.gradeLevel;
    fkScoreEl.textContent = stats.fleschKincaid.toFixed(2);
    wordCountEl.textContent = stats.wordCount;
    sentenceCountEl.textContent = stats.sentenceCountValue;
    readingTimeEl.textContent = `${Math.ceil(stats.wordCount / 200) || 0} min`;

    const pointerPos = Math.min(stats.gradeLevel, 15) / 15 * 100;
    readabilityPointer.style.left = `${pointerPos}%`;

    flashMetric(gradeLevelEl);
    flashMetric(fkScoreEl);

    // Grammar suggestions
    updateGrammarSuggestions(text);
}

function flashMetric(element) {
    element.classList.add('flash');
    setTimeout(() => {
        element.classList.remove('flash');
    }, 500);
}
// ========================
// GRAMMAR & IMPROVEMENT SUGGESTIONS (with actionable fixes + sentence number)
// ========================
function updateGrammarSuggestions(text) {
    if (!text.trim()) {
        suggestionsEl.innerHTML = '<small class="text-secondary">Start typing and suggestions will appear here based on grammar, clarity, sentence length, and structure.</small>';
        return;
    }

    const sentences = text.split(/([.!?]+)/).reduce((acc, val, idx, arr) => {
        if (/[.!?]/.test(val) && acc.length) {
            acc[acc.length - 1] += val; // append punctuation to sentence
        } else if (val.trim().length) {
            acc.push(val.trim());
        }
        return acc;
    }, []);

    let suggestions = [];

    sentences.forEach((s, idx) => {
        const sentenceNumber = idx + 1;

        // Too long sentence
        if (s.length > 200) {
            suggestions.push({
                issue: `Sentence ${sentenceNumber}: Too long.`,
                fix: 'Consider splitting this sentence into two or more shorter sentences for clarity.'
            });
        }

        // Starts with lowercase
        if (s[0] && s[0] !== s[0].toUpperCase()) {
            suggestions.push({
                issue: `Sentence ${sentenceNumber}: Should start with a capital letter.`,
                fix: 'Capitalize the first letter of this sentence.'
            });
        }

        // Missing punctuation
        if (!/[.!?]$/.test(s)) {
            suggestions.push({
                issue: `Sentence ${sentenceNumber}: Missing proper punctuation at the end.`,
                fix: 'Add a period, exclamation mark, or question mark at the end.'
            });
        }
    });

    // Basic spelling/format check
    const words = text.trim().split(/\s+/);
    words.forEach((w) => {
        if (/[^a-zA-Z0-9.,!?'-]/.test(w)) {
            suggestions.push({
                issue: `Check spelling/format of: "${w}"`,
                fix: 'Correct spelling or remove unusual characters.'
            });
        }
    });

    // Display suggestions
    if (suggestions.length) {
        suggestionsEl.innerHTML = suggestions.map(s => 
            `<div class="grammar-error mb-1">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <strong>${s.issue}</strong> <br>
                <small class="text-info">Tip: ${s.fix}</small>
            </div>`).join('');
    } else {
        suggestionsEl.innerHTML = '<small class="text-success">No obvious grammar issues detected!</small>';
    }
}



// ========================
// COLOR BLINDNESS TOGGLE
// ========================
colorBlindnessToggle.addEventListener('click', () => {
    document.body.classList.toggle('color-blindness-active');
});

// ========================
// INITIALIZE
// ========================
updateContrastUI();
updateReadabilityMetrics();
textEditor.addEventListener('input', updateReadabilityMetrics);
