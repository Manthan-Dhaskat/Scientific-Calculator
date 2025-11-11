// ---------------------- Core UI elements ----------------------
const displayEl = document.getElementById('display');
const previousEl = document.querySelector('.previous');
const buttons = document.querySelectorAll('.keys .btn');
const degRadBtn = document.getElementById('degRadBtn');
const ansBtn = document.getElementById('ansBtn');
const themeToggle = document.getElementById('themeToggle');
// History
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const errorMsg = document.getElementById('errorMsg');

// --- MODAL & FEATURE BUTTONS ---
const matrixBtn = document.getElementById('open-matrix');
const vectorBtn = document.getElementById('open-vector');
const complexBtn = document.getElementById('open-complex');
const statsBtn = document.getElementById('open-stats');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const modalOverlay = document.getElementById('modal-overlay');
// -------------------------------------------------------------

let expression = '';
let isDegree = true;
let lastAns = 0;
let history = JSON.parse(localStorage.getItem('calcHistory') || '[]');

// --- Display Updater ---
function updateDisplay() {
    displayEl.textContent = expression === '' ? '0' : expression;
    errorMsg.textContent = '';
}
updateDisplay();

// --- History Rendering ---
function renderHistory() {
    historyList.innerHTML = '';
    history.slice(-10).reverse().forEach(entry => {
        const el = document.createElement('div');
        el.className = 'history-entry';
        el.innerHTML = `<span>${entry.input} = ${entry.result}</span>`;
        el.onclick = () => {
            expression = entry.input;
            updateDisplay();
        };
        historyList.appendChild(el);
    });
}
renderHistory();
clearHistoryBtn.onclick = () => {
    history = [];
    localStorage.setItem('calcHistory', JSON.stringify(history));
    renderHistory();
};

// --- Handle Button Clicks (calculator keys) ---
buttons.forEach(b => {
    b.addEventListener('click', () => {
        const action = b.dataset.action;
        const value = b.dataset.value;
        const func = b.dataset.func;
        flashButton(b);
        if (action === 'clear') return handleClear();
        if (action === 'delete') return handleDelete();
        if (action === 'equals') return handleEquals();
        if (func) return handleFunction(func);
        if (value !== undefined) {
            // --- FIXED 'Ans' BUTTON LOGIC ---
            if (value === 'Ans') {
                expression += String(lastAns);
            } else {
                expression += value;
            }
            updateDisplay();
        }
    });
});

// --- DEG & ANS BUTTONS ---
degRadBtn.addEventListener('click', () => {
    flashButton(degRadBtn);
    isDegree = !isDegree;
    degRadBtn.textContent = isDegree ? 'DEG' : 'RAD';
});
ansBtn.addEventListener('click', () => {
    flashButton(ansBtn);
    expression += String(lastAns);
    updateDisplay();
});

// --- Modal open/close helpers ---
function openModal(title) {
    modalTitle.textContent = title;
    modal.classList.add('active');
    modalOverlay.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
    modal.classList.remove('active');
    modalOverlay.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// ---------------- Matrix mode ----------------
function openMatrixModal() {
    openModal('Matrix Operations');
    renderMatrixModalContent();
}
matrixBtn.addEventListener('click', openMatrixModal);

// ---------------- Vector mode ----------------
function openVectorModal() {
    openModal('Vector Operations');
    renderVectorModalContent();
}
vectorBtn.addEventListener('click', openVectorModal);

// ---------------- Complex mode (new) ----------------
function openComplexModal() {
    openModal('Complex Numbers');
    renderComplexModalContent();
}
complexBtn.addEventListener('click', openComplexModal);

// ---------------- Matrix & Vector shared helpers (kept) ----------------

function createGrid(containerId, rows, cols, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.classList.add('generated');

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.step = 'any';
            input.className = 'matrix-input';
            input.dataset.row = r;
            input.dataset.col = c;
            input.dataset.prefix = prefix;
            input.placeholder = '0';
            container.appendChild(input);
        }
    }

    const inputs = Array.from(container.querySelectorAll('input.matrix-input'));
    inputs.forEach((inp, i) => {
        inp.addEventListener('keydown', e => {
            const key = e.key;
            const currentRow = parseInt(e.target.dataset.row, 10);
            const currentCol = parseInt(e.target.dataset.col, 10);
            let nextInput = null;
            if (key === 'ArrowRight' || (key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                nextInput = inputs[i + 1] || inputs[0];
            } else if (key === 'ArrowLeft' || (key === 'Tab' && e.shiftKey)) {
                e.preventDefault();
                nextInput = inputs[i - 1] || inputs[inputs.length - 1];
            } else if (key === 'ArrowDown' || key === 'Enter') {
                e.preventDefault();
                const next = inputs.find(inp =>
                    parseInt(inp.dataset.row) === currentRow + 1 &&
                    parseInt(inp.dataset.col) === currentCol
                );
                nextInput = next || inputs[i];
            } else if (key === 'ArrowUp') {
                e.preventDefault();
                const prev = inputs.find(inp =>
                    parseInt(inp.dataset.row) === currentRow - 1 &&
                    parseInt(inp.dataset.col) === currentCol
                );
                nextInput = prev || inputs[i];
            }
            if (nextInput) nextInput.focus();
        });
        inp.addEventListener('input', () => clearResult());
    });

    if (inputs.length > 0) inputs[0].focus();
}

function readMatrix(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    const inputs = Array.from(container.querySelectorAll('input.matrix-input'));
    if (inputs.length === 0) return null;
    const rows = Math.max(...inputs.map(i => parseInt(i.dataset.row, 10))) + 1;
    const cols = Math.max(...inputs.map(i => parseInt(i.dataset.col, 10))) + 1;
    const M = Array.from({ length: rows }, () => Array(cols).fill(0));
    inputs.forEach(inp => {
        const r = parseInt(inp.dataset.row, 10);
        const c = parseInt(inp.dataset.col, 10);
        const val = inp.value.trim();
        const v = val === '' ? 0 : parseFloat(val);
        if (isNaN(v)) throw new Error('All matrix entries must be numbers');
        M[r][c] = v;
    });
    return M;
}

function renderResult(matrix) {
    const res = document.getElementById('matrixResult');
    if (!res) return;
    res.innerHTML = '';
    if (!matrix) {
        res.textContent = 'No result';
        return;
    }
    let mat = matrix;
    if (!Array.isArray(matrix[0])) mat = [matrix];
    const rows = mat.length;
    const cols = mat[0].length;
    const table = document.createElement('div');
    table.className = 'matrix-display';
    table.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell';
            const value = formatNumber(mat[r][c]);
            cell.textContent = value;
            table.appendChild(cell);
        }
    }
    res.appendChild(table);
}

function renderError(msg) {
    const res = document.getElementById('matrixResult');
    if (!res) return;
    res.innerHTML = `<div class="matrix-error">${msg}</div>`;
}

function clearResult() {
    const res = document.getElementById('matrixResult');
    if (res) res.innerHTML = '';
}

// ---------------- Matrix algorithms ----------------
function formatNumber(n) {
    if (typeof n === 'undefined') return '';
    if (typeof n === 'number') {
        if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
        if (Math.abs(n) < 1e-12) return '0';
        if (Math.abs(n) >= 1e12 || Math.abs(n) <= 1e-6) return Number.parseFloat(n.toExponential(9));
        return parseFloat(n.toPrecision(12));
    }
    // If string (used for complex formatted outputs), return directly
    return String(n);
}

function determinant(M) {
    const n = M.length;
    if (!Array.isArray(M) || n === 0 || M.some(row => row.length !== n)) throw new Error('Determinant needs a non-empty square matrix');
    if (n === 1) return M[0][0];
    if (n === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0];
    let det = 0;
    for (let col = 0; col < n; col++) {
        const sub = [];
        for (let i = 1; i < n; i++) {
            const row = [];
            for (let j = 0; j < n; j++) {
                if (j === col) continue;
                row.push(M[i][j]);
            }
            sub.push(row);
        }
        det += ((col % 2 === 0 ? 1 : -1) * M[0][col] * determinant(sub));
    }
    return det;
}

function transpose(A) {
    const r = A.length;
    const c = A[0].length;
    const T = Array.from({ length: c }, () => Array(r));
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = A[i][j];
    return T;
}

function addMatrices(A, B) {
    if (A.length !== B.length || A[0].length !== B[0].length) throw new Error('Addition requires matrices of same dimensions');
    const r = A.length, c = A[0].length;
    const C = Array.from({ length: r }, () => Array(c));
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) C[i][j] = A[i][j] + B[i][j];
    return C;
}

function subtractMatrices(A, B) {
    if (A.length !== B.length || A[0].length !== B[0].length) throw new Error('Subtraction requires matrices of same dimensions');
    const r = A.length, c = A[0].length;
    const C = Array.from({ length: r }, () => Array(c));
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) C[i][j] = A[i][j] - B[i][j];
    return C;
}

function multiplyMatrices(A, B) {
    if (A[0].length !== B.length) throw new Error('Multiplication requires A.columns === B.rows');
    const r = A.length, c = B[0].length, common = A[0].length;
    const C = Array.from({ length: r }, () => Array(c).fill(0));
    for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
            let sum = 0;
            for (let k = 0; k < common; k++) sum += A[i][k] * B[k][j];
            C[i][j] = sum;
        }
    }
    return C;
}

function inverseMatrix(A) {
    const n = A.length;
    if (!A || n === 0 || A.some(row => row.length !== n)) throw new Error('Inverse requires a non-empty square matrix');
    const aug = A.map((row, i) => row.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
        }
        if (Math.abs(aug[maxRow][i]) < 1e-12) throw new Error('Matrix is singular (non-invertible)');
        if (maxRow !== i) {
            const tmp = aug[i];
            aug[i] = aug[maxRow];
            aug[maxRow] = tmp;
        }
        const pivot = aug[i][i];
        for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
        for (let r = 0; r < n; r++) {
            if (r === i) continue;
            const factor = aug[r][i];
            for (let j = 0; j < 2 * n; j++) aug[r][j] -= factor * aug[i][j];
        }
    }
    const inv = aug.map(row => row.slice(n));
    return inv;
}

// ---------------- Matrix modal rendering ----------------
function renderMatrixModalContent() {
    modalBody.innerHTML = `
        <div class="matrix-controls">
            <div class="matrix-setup">
                <div class="matrix-block">
                    <label><strong>Matrix A</strong></label>
                    <div class="row-col">
                        <input type="number" id="a-rows" min="1" max="10" value="2" /> x
                        <input type="number" id="a-cols" min="1" max="10" value="2" />
                    </div>
                </div>

                <div class="matrix-block">
                    <label><strong>Matrix B (optional)</strong></label>
                    <div class="row-col">
                        <input type="number" id="b-rows" min="1" max="10" value="2" /> x
                        <input type="number" id="b-cols" min="1" max="10" value="2" />
                    </div>
                </div>
            </div>

            <div class="matrix-actions">
                <button class="btn" id="detA">Determinant A</button>
                <button class="btn" id="invA">Inverse A</button>
                <button class="btn" id="transA">Transpose A</button>

                <button class="btn" id="addAB">A + B</button>
                <button class="btn" id="subAB">A - B</button>
                <button class="btn" id="mulAB">A × B</button>
            </div>
        </div>

        <div class="matrix-grids">
            <div>
                <h3>Matrix A</h3>
                <div id="matrixA" class="matrix-grid"></div>
            </div>
            <div>
                <h3>Matrix B</h3>
                <div id="matrixB" class="matrix-grid"></div>
            </div>
        </div>

        <div class="matrix-result-area">
            <h3>Result</h3>
            <div id="matrixResult" class="matrix-result"></div>
        </div>
    `;

    // Auto-generate listeners
    const aRows = document.getElementById('a-rows');
    const aCols = document.getElementById('a-cols');
    const bRows = document.getElementById('b-rows');
    const bCols = document.getElementById('b-cols');

    function autoGenMatrixA() {
        const r = parseInt(aRows.value, 10);
        const c = parseInt(aCols.value, 10);
        if (!isNaN(r) && !isNaN(c) && r > 0 && c > 0) createGrid('matrixA', r, c, 'A');
    }

    function autoGenMatrixB() {
        const r = parseInt(bRows.value, 10);
        const c = parseInt(bCols.value, 10);
        if (!isNaN(r) && !isNaN(c) && r > 0 && c > 0) createGrid('matrixB', r, c, 'B');
    }

    ['input', 'change', 'blur', 'keyup'].forEach(evt => {
        aRows.addEventListener(evt, autoGenMatrixA);
        aCols.addEventListener(evt, autoGenMatrixA);
        bRows.addEventListener(evt, autoGenMatrixB);
        bCols.addEventListener(evt, autoGenMatrixB);
    });

    // Actions
    document.getElementById('detA').addEventListener('click', () => {
        try {
            const A = readMatrix('matrixA');
            if (!A) throw new Error('Generate Matrix A first');
            if (A.length !== A[0].length) throw new Error('Determinant requires a square matrix');
            const d = determinant(A);
            renderResult([[d]]);
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('invA').addEventListener('click', () => {
        try {
            const A = readMatrix('matrixA');
            if (!A) throw new Error('Generate Matrix A first');
            if (A.length !== A[0].length) throw new Error('Inverse requires a square matrix');
            const inv = inverseMatrix(A);
            renderResult(inv);
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('transA').addEventListener('click', () => {
        try {
            const A = readMatrix('matrixA');
            if (!A) throw new Error('Generate Matrix A first');
            renderResult(transpose(A));
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('addAB').addEventListener('click', () => {
        try {
            const A = readMatrix('matrixA');
            const B = readMatrix('matrixB');
            if (!A || !B) throw new Error('Generate both matrices first');
            renderResult(addMatrices(A, B));
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('subAB').addEventListener('click', () => {
        try {
            const A = readMatrix('matrixA');
            const B = readMatrix('matrixB');
            if (!A || !B) throw new Error('Generate both matrices first');
            renderResult(subtractMatrices(A, B));
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('mulAB').addEventListener('click', () => {
        try {
            const A = readMatrix('matrixA');
            const B = readMatrix('matrixB');
            if (!A || !B) throw new Error('Generate both matrices first');
            renderResult(multiplyMatrices(A, B));
        } catch (e) {
            renderError(e.message);
        }
    });

    autoGenMatrixA();
    autoGenMatrixB();
    clearResult();
}

// ---------------- Vector modal rendering & logic ----------------
function renderVectorModalContent() {
    modalBody.innerHTML = `
        <div class="matrix-controls">
            <div class="matrix-setup">
                <div class="matrix-block">
                    <label><strong>Vector A</strong></label>
                    <div class="row-col">
                        <input type="number" id="a-len" min="1" max="20" value="3" />
                    </div>
                </div>

                <div class="matrix-block">
                    <label><strong>Vector B (optional)</strong></label>
                    <div class="row-col">
                        <input type="number" id="b-len" min="1" max="20" value="3" />
                    </div>
                </div>
            </div>

            <div class="matrix-actions">
                <button class="btn" id="magA">|A|</button>
                <button class="btn" id="unitA">Unit A</button>
                <button class="btn" id="addV">A + B</button>
                <button class="btn" id="subV">A - B</button>
                <button class="btn" id="dotV">A · B</button>
                <button class="btn" id="crossV">A × B</button>
                <button class="btn" id="angleV">Angle(A,B)</button>
                <button class="btn" id="projV">Projᵦ(A)</button>
            </div>
        </div>

        <div class="matrix-grids">
            <div>
                <h3>Vector A</h3>
                <div id="vectorA" class="matrix-grid vector-grid"></div>
            </div>
            <div>
                <h3>Vector B</h3>
                <div id="vectorB" class="matrix-grid vector-grid"></div>
            </div>
        </div>

        <div class="matrix-result-area">
            <h3>Result</h3>
            <div id="matrixResult" class="matrix-result"></div>
        </div>
    `;

    // auto-generate on length change
    const aInput = document.getElementById('a-len');
    const bInput = document.getElementById('b-len');

    function autoGenA() {
        const n = parseInt(aInput.value, 10);
        if (!isNaN(n) && n > 0) createVectorInputs('vectorA', n, 'A');
    }
    function autoGenB() {
        const n = parseInt(bInput.value, 10);
        if (!isNaN(n) && n > 0) createVectorInputs('vectorB', n, 'B');
    }

    ['input', 'change', 'blur', 'keyup'].forEach(evt => {
        aInput.addEventListener(evt, autoGenA);
        bInput.addEventListener(evt, autoGenB);
    });

    document.getElementById('magA').addEventListener('click', () => {
        try {
            const A = readVector('vectorA');
            if (!A) throw new Error('Generate Vector A first');
            const m = magnitude(A);
            renderResult([[m]]);
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('unitA').addEventListener('click', () => {
        try {
            const A = readVector('vectorA');
            if (!A) throw new Error('Generate Vector A first');
            const m = magnitude(A);
            if (m === 0) throw new Error('Zero vector has no unit vector');
            const unit = A.map(v => v / m);
            renderResult([unit]);
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('addV').addEventListener('click', () => {
        try {
            const A = readVector('vectorA');
            const B = readVector('vectorB');
            if (!A || !B) throw new Error('Generate both vectors first');
            renderResult([addVectors(A, B)]);
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('subV').addEventListener('click', () => {
        try {
            const A = readVector('vectorA');
            const B = readVector('vectorB');
            if (!A || !B) throw new Error('Generate both vectors first');
            renderResult([subtractVectors(A, B)]);
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('dotV').addEventListener('click', () => {
        try {
            const A = readVector('vectorA');
            const B = readVector('vectorB');
            if (!A || !B) throw new Error('Generate both vectors first');
            const d = dotProduct(A, B);
            renderResult([[d]]);
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('crossV').addEventListener('click', () => {
        try {
            const A = readVector('vectorA');
            const B = readVector('vectorB');
            if (!A || !B) throw new Error('Generate both vectors first');
            if (A.length !== 3 || B.length !== 3) throw new Error('Cross product is defined for 3D vectors only');
            const c = crossProduct(A, B);
            renderResult([c]);
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('angleV').addEventListener('click', () => {
        try {
            const A = readVector('vectorA');
            const B = readVector('vectorB');
            if (!A || !B) throw new Error('Generate both vectors first');
            const ang = angleBetween(A, B);
            renderResult([[ang]]);
        } catch (e) {
            renderError(e.message);
        }
    });

    document.getElementById('projV').addEventListener('click', () => {
        try {
            const A = readVector('vectorA');
            const B = readVector('vectorB');
            if (!A || !B) throw new Error('Generate both vectors first');
            const proj = projectionOfAonB(A, B);
            renderResult([proj]);
        } catch (e) {
            renderError(e.message);
        }
    });

    autoGenA();
    autoGenB();
    clearResult();
}

function createVectorInputs(containerId, length, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    container.classList.add('generated');
    container.style.gridTemplateColumns = `repeat(${length}, 1fr)`;

    for (let i = 0; i < length; i++) {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = 'any';
        input.className = 'matrix-input';
        input.dataset.index = i;
        input.dataset.prefix = prefix;
        input.placeholder = '0';
        container.appendChild(input);
    }

    const inputs = Array.from(container.querySelectorAll('input.matrix-input'));
    inputs.forEach((inp, i) => {
        inp.addEventListener('keydown', e => {
            const key = e.key;
            let next = null;
            if (key === 'ArrowRight' || (key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                next = inputs[i + 1] || inputs[0];
            } else if (key === 'ArrowLeft' || (key === 'Tab' && e.shiftKey)) {
                e.preventDefault();
                next = inputs[i - 1] || inputs[inputs.length - 1];
            } else if (key === 'Enter' || key === 'ArrowDown') {
                e.preventDefault();
                next = inputs[i + 1] || inputs[0];
            } else if (key === 'ArrowUp') {
                e.preventDefault();
                next = inputs[i - 1] || inputs[inputs.length - 1];
            }
            if (next) next.focus();
        });
        inp.addEventListener('input', () => clearResult());
    });

    if (inputs.length > 0) inputs[0].focus();
}

function readVector(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    const inputs = Array.from(container.querySelectorAll('input.matrix-input'));
    if (inputs.length === 0) return null;
    const V = [];
    inputs.forEach(inp => {
        const val = inp.value.trim();
        const v = val === '' ? 0 : parseFloat(val);
        if (isNaN(v)) throw new Error('All vector entries must be numbers');
        V.push(v);
    });
    return V;
}

// Vector algorithms
function magnitude(V) {
    return Math.sqrt(V.reduce((s, x) => s + x * x, 0));
}
function addVectors(A, B) {
    if (A.length !== B.length) throw new Error('Addition requires vectors of same length');
    return A.map((v, i) => v + B[i]);
}
function subtractVectors(A, B) {
    if (A.length !== B.length) throw new Error('Subtraction requires vectors of same length');
    return A.map((v, i) => v - B[i]);
}
function dotProduct(A, B) {
    if (A.length !== B.length) throw new Error('Dot product requires vectors of same length');
    return A.reduce((s, v, i) => s + v * B[i], 0);
}
function crossProduct(A, B) {
    return [
        A[1] * B[2] - A[2] * B[1],
        A[2] * B[0] - A[0] * B[2],
        A[0] * B[1] - A[1] * B[0]
    ];
}
function angleBetween(A, B) {
    const dot = dotProduct(A, B);
    const magA = magnitude(A);
    const magB = magnitude(B);
    if (magA === 0 || magB === 0) throw new Error('Cannot compute angle with zero vector');
    let cos = dot / (magA * magB);
    cos = Math.max(-1, Math.min(1, cos));
    const rad = Math.acos(cos);
    const deg = rad * (180 / Math.PI);
    return parseFloat(deg.toPrecision(8));
}
function projectionOfAonB(A, B) {
    const magBsq = dotProduct(B, B);
    if (magBsq === 0) throw new Error('Cannot project onto zero vector');
    const scalar = dotProduct(A, B) / magBsq;
    return B.map(v => v * scalar);
}

// ---------------- Complex modal rendering & logic ----------------
function renderComplexModalContent() {
    modalBody.innerHTML = `
        <div class="matrix-controls">
            <div class="matrix-setup">
                <div class="matrix-block">
                    <label><strong>Complex A</strong></label>
                    <div class="row-col compact-complex">
                        A = <input type="number" id="a-real" placeholder="0" /> + <input type="number" id="a-imag" placeholder="0" /> i
                    </div>
                </div>
                <div class="matrix-block">
                    <label><strong>Complex B (optional)</strong></label>
                    <div class="row-col compact-complex">
                        B = <input type="number" id="b-real" placeholder="0" /> + <input type="number" id="b-imag" placeholder="0" /> i
                    </div>
                </div>
            </div>

            <div class="matrix-actions">
                <button class="btn" id="conjA">Conj(A)</button>
                <button class="btn" id="magA">|A|</button>
                <button class="btn" id="argA">Arg(A)</button>
                <button class="btn" id="polarA">To Polar</button>

                <button class="btn" id="addC">A + B</button>
                <button class="btn" id="subC">A - B</button>
                <button class="btn" id="mulC">A × B</button>
                <button class="btn" id="divC">A ÷ B</button>

                <button class="btn" id="rectFromPolar">Rect(r,θ)</button>
            </div>
        </div>

        <div class="matrix-result-area">
            <h3>Result</h3>
            <div id="matrixResult" class="matrix-result"></div>
        </div>
    `;

    // get inputs
    const aReal = document.getElementById('a-real');
    const aImag = document.getElementById('a-imag');
    const bReal = document.getElementById('b-real');
    const bImag = document.getElementById('b-imag');

    // keyboard navigation: focus order aReal -> aImag -> bReal -> bImag
    const compactInputs = [aReal, aImag, bReal, bImag];
    compactInputs.forEach((inp, idx) => {
        inp.addEventListener('keydown', e => {
            const key = e.key;
            let next = null;
            if (key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                next = compactInputs[idx + 1] || compactInputs[0];
            } else if (key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                next = compactInputs[idx - 1] || compactInputs[compactInputs.length - 1];
            } else if (key === 'Enter' || key === 'ArrowRight') {
                e.preventDefault();
                next = compactInputs[idx + 1] || compactInputs[0];
            } else if (key === 'ArrowLeft') {
                e.preventDefault();
                next = compactInputs[idx - 1] || compactInputs[compactInputs.length - 1];
            }
            if (next) next.focus();
        });
        inp.addEventListener('input', () => clearResult());
    });

    // helpers to read complex numbers
    function readComplexA() {
        const ar = aReal.value.trim(); const ai = aImag.value.trim();
        const re = ar === '' ? 0 : parseFloat(ar);
        const im = ai === '' ? 0 : parseFloat(ai);
        if (isNaN(re) || isNaN(im)) throw new Error('Complex entries must be numbers');
        return { re, im };
    }
    function readComplexB() {
        const br = bReal.value.trim(); const bi = bImag.value.trim();
        if (br === '' && bi === '') return null; // optional B
        const re = br === '' ? 0 : parseFloat(br);
        const im = bi === '' ? 0 : parseFloat(bi);
        if (isNaN(re) || isNaN(im)) throw new Error('Complex entries must be numbers');
        return { re, im };
    }

    // complex operations
    function conj(z) { return { re: z.re, im: -z.im }; }
    function complexAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
    function complexSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
    function complexMul(a, b) {
        return {
            re: a.re * b.re - a.im * b.im,
            im: a.re * b.im + a.im * b.re
        };
    }
    function complexDiv(a, b) {
        const denom = b.re * b.re + b.im * b.im;
        if (denom === 0) throw new Error('Division by zero (B is 0 + 0i)');
        return {
            re: (a.re * b.re + a.im * b.im) / denom,
            im: (a.im * b.re - a.re * b.im) / denom
        };
    }
    function complexMag(z) { return Math.sqrt(z.re * z.re + z.im * z.im); }
    function complexArg(z) { // radians
        return Math.atan2(z.im, z.re);
    }
    function toPolar(z) {
        const r = complexMag(z);
        const theta = complexArg(z); // radians
        return { r, theta }; // theta in radians
    }
    function fromPolar(r, thetaDeg) {
        const theta = thetaDeg * Math.PI / 180;
        return { re: r * Math.cos(theta), im: r * Math.sin(theta) };
    }
    function formatComplex(z) {
        // z can be object or number (if scalar)
        if (typeof z === 'number') return formatNumber(z);
        if (z === null || z === undefined) return '';
        const re = parseFloat(parseFloat(z.re).toPrecision(12));
        const im = parseFloat(parseFloat(z.im).toPrecision(12));
        const reStr = Math.abs(re) < 1e-12 ? '0' : String(re);
        const imAbs = Math.abs(im);
        if (im === 0) return reStr;
        const imStr = (im >= 0 ? '+ ' : '- ') + (imAbs === 1 ? 'i' : (imAbs < 1e-12 ? '0' : `${imAbs}i`));
        return `${reStr} ${imStr}`;
    }

    // attach action listeners
    document.getElementById('conjA').addEventListener('click', () => {
        try {
            const A = readComplexA();
            renderResult([[formatComplex(conj(A))]]);
        } catch (e) { renderError(e.message); }
    });
    document.getElementById('magA').addEventListener('click', () => {
        try {
            const A = readComplexA();
            renderResult([[formatNumber(complexMag(A))]]);
        } catch (e) { renderError(e.message); }
    });
    document.getElementById('argA').addEventListener('click', () => {
        try {
            const A = readComplexA();
            const rad = complexArg(A);
            const deg = rad * (180 / Math.PI);
            renderResult([[parseFloat(deg.toPrecision(10))]]);
        } catch (e) { renderError(e.message); }
    });
    document.getElementById('polarA').addEventListener('click', () => {
        try {
            const A = readComplexA();
            const p = toPolar(A);
            // display [r, theta(deg)] as 1x2 row
            renderResult([[formatNumber(p.r), parseFloat((p.theta * 180 / Math.PI).toPrecision(10))]]);
        } catch (e) { renderError(e.message); }
    });

    document.getElementById('addC').addEventListener('click', () => {
        try {
            const A = readComplexA();
            const B = readComplexB();
            if (!B) throw new Error('Generate Complex B first');
            renderResult([[formatComplex(complexAdd(A, B))]]);
        } catch (e) { renderError(e.message); }
    });

    document.getElementById('subC').addEventListener('click', () => {
        try {
            const A = readComplexA();
            const B = readComplexB();
            if (!B) throw new Error('Generate Complex B first');
            renderResult([[formatComplex(complexSub(A, B))]]);
        } catch (e) { renderError(e.message); }
    });

    document.getElementById('mulC').addEventListener('click', () => {
        try {
            const A = readComplexA();
            const B = readComplexB();
            if (!B) throw new Error('Generate Complex B first');
            renderResult([[formatComplex(complexMul(A, B))]]);
        } catch (e) { renderError(e.message); }
    });

    document.getElementById('divC').addEventListener('click', () => {
        try {
            const A = readComplexA();
            const B = readComplexB();
            if (!B) throw new Error('Generate Complex B first');
            renderResult([[formatComplex(complexDiv(A, B))]]);
        } catch (e) { renderError(e.message); }
    });

    document.getElementById('rectFromPolar').addEventListener('click', () => {
        try {
            // read two inputs for r and theta inline prompt
            const rStr = prompt('Enter r (magnitude):', '1');
            if (rStr === null) return;
            const thetaStr = prompt('Enter θ in degrees:', '0');
            if (thetaStr === null) return;
            const r = parseFloat(rStr);
            const theta = parseFloat(thetaStr);
            if (isNaN(r) || isNaN(theta)) throw new Error('Invalid r or θ');
            const z = fromPolar(r, theta);
            renderResult([[formatComplex(z)]]);
        } catch (e) { renderError(e.message); }
    });

    // auto-focus first input
    aReal.focus();
}

// ---------------- Statistics Modal Rendering & Logic ----------------
function openStatsModal() {
    openModal('Statistics Mode');
    renderStatsModalContent();
}
statsBtn.addEventListener('click', openStatsModal);

function renderStatsModalContent() {
    modalBody.innerHTML = `
        <div class="matrix-controls">
            <div class="matrix-block">
                <label><strong>Data Set</strong></label>
                <textarea id="statsInput" class="stats-input" placeholder="Enter numbers separated by commas, spaces, or newlines"></textarea>
            </div>

            <div class="matrix-block toggle-group">
                <label><strong>Mode</strong></label>
                <div class="toggle-row">
                    <label><input type="radio" name="statsMode" value="sample" checked> Sample</label>
                    <label><input type="radio" name="statsMode" value="population"> Population</label>
                </div>
            </div>

            <div class="matrix-actions">
                <button class="btn" id="meanBtn">Mean</button>
                <button class="btn" id="medianBtn">Median</button>
                <button class="btn" id="modeBtn">Mode</button>
                <button class="btn" id="rangeBtn">Range</button>
                <button class="btn" id="varianceBtn">Variance</button>
                <button class="btn" id="stddevBtn">Std. Dev</button>
                <button class="btn" id="sumBtn">Sum</button>
                <button class="btn" id="countBtn">Count</button>
                <button class="btn" id="minBtn">Min</button>
                <button class="btn" id="maxBtn">Max</button>
            </div>
        </div>

        <div class="matrix-result-area">
            <h3>Result</h3>
            <div id="matrixResult" class="matrix-result"></div>
        </div>
    `;

    const inputEl = document.getElementById('statsInput');
    const modeRadios = document.querySelectorAll('input[name="statsMode"]');

    // --- Helper: parse data ---
    function parseData() {
        const raw = inputEl.value.trim();
        if (!raw) throw new Error('Please enter data');
        const nums = raw.split(/[\s,]+/)
            .map(v => parseFloat(v))
            .filter(v => !isNaN(v));
        if (nums.length === 0) throw new Error('No valid numbers found');
        return nums;
    }

    // --- Helper: get mode (sample/population) ---
    function getStatsMode() {
        return Array.from(modeRadios).find(r => r.checked).value;
    }

    // --- Math functions ---
    const sum = arr => arr.reduce((a, b) => a + b, 0);
    const mean = arr => sum(arr) / arr.length;
    const median = arr => {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    };
    const mode = arr => {
        const freq = {};
        arr.forEach(n => freq[n] = (freq[n] || 0) + 1);
        const max = Math.max(...Object.values(freq));
        const modes = Object.keys(freq).filter(k => freq[k] === max).map(Number);
        return modes.length === arr.length ? 'No mode' : modes.join(', ');
    };
    const range = arr => Math.max(...arr) - Math.min(...arr);
    const variance = (arr, isSample) => {
        const m = mean(arr);
        const sq = arr.reduce((s, x) => s + (x - m) ** 2, 0);
        return sq / (isSample ? arr.length - 1 : arr.length);
    };
    const stddev = (arr, isSample) => Math.sqrt(variance(arr, isSample));
    const min = arr => Math.min(...arr);
    const max = arr => Math.max(...arr);

    // --- Render result ---
    function showResult(label, value) {
        const res = document.getElementById('matrixResult');
        res.innerHTML = `<div class="stats-result"><strong>${label}:</strong> ${formatNumber(value)}</div>`;
    }

    function showTextResult(label, text) {
        const res = document.getElementById('matrixResult');
        res.innerHTML = `<div class="stats-result"><strong>${label}:</strong> ${text}</div>`;
    }

    // --- Button Handlers ---
    document.getElementById('meanBtn').onclick = () => {
        try {
            const data = parseData();
            showResult('Mean', mean(data));
        } catch (e) { renderError(e.message); }
    };
    document.getElementById('medianBtn').onclick = () => {
        try {
            const data = parseData();
            showResult('Median', median(data));
        } catch (e) { renderError(e.message); }
    };
    document.getElementById('modeBtn').onclick = () => {
        try {
            const data = parseData();
            showTextResult('Mode', mode(data));
        } catch (e) { renderError(e.message); }
    };
    document.getElementById('rangeBtn').onclick = () => {
        try {
            const data = parseData();
            showResult('Range', range(data));
        } catch (e) { renderError(e.message); }
    };
    document.getElementById('varianceBtn').onclick = () => {
        try {
            const data = parseData();
            const isSample = getStatsMode() === 'sample';
            showResult(`Variance (${isSample ? 'Sample' : 'Population'})`, variance(data, isSample));
        } catch (e) { renderError(e.message); }
    };
    document.getElementById('stddevBtn').onclick = () => {
        try {
            const data = parseData();
            const isSample = getStatsMode() === 'sample';
            showResult(`Std. Dev (${isSample ? 'Sample' : 'Population'})`, stddev(data, isSample));
        } catch (e) { renderError(e.message); }
    };
    document.getElementById('sumBtn').onclick = () => {
        try {
            const data = parseData();
            showResult('Sum', sum(data));
        } catch (e) { renderError(e.message); }
    };
    document.getElementById('countBtn').onclick = () => {
        try {
            const data = parseData();
            showResult('Count', data.length);
        } catch (e) { renderError(e.message); }
    };
    document.getElementById('minBtn').onclick = () => {
        try {
            const data = parseData();
            showResult('Min', min(data));
        } catch (e) { renderError(e.message); }
    };
    document.getElementById('maxBtn').onclick = () => {
        try {
            const data = parseData();
            showResult('Max', max(data));
        } catch (e) { renderError(e.message); }
    };

    clearResult(); // reset display on open
    inputEl.focus();
}

// ---------------- Calculator evaluation (kept) ----------------
function handleClear() {
    expression = '';
    previousEl.textContent = '';
    updateDisplay();
}
function handleDelete() {
    expression = expression.slice(0, -1);
    updateDisplay();
}
function handleFunction(f) {
    const oneArg = ['sin', 'cos', 'tan', 'sqrt', 'log', 'ln', 'exp'];
    if (oneArg.includes(f)) expression += f + '(';
    else if (f === 'pow') expression += '^';
    updateDisplay();
}
function sanitizeExpression(e) {
    return e.replace(/×|x/g, '*').replace(/÷/g, '/');
}
function replaceFactorials(s) {
    while (/(\d+|\([^\(\)]+\))!/.test(s)) {
        s = s.replace(/(\d+|\([^\(\)]+\))!/g, 'fact($1)');
    }
    return s;
}
function evaluateExpression(expr) {
    let s = sanitizeExpression(expr)
        .replace(/\^/g, '**')
        .replace(/π/g, 'Math.PI')
        .replace(/\be\b/g, 'Math.E')
        .replace(/sin\(/g, 'Trig.sin(')
        .replace(/cos\(/g, 'Trig.cos(')
        .replace(/tan\(/g, 'Trig.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/exp\(/g, 'Math.exp(');
    s = replaceFactorials(s);
    const Trig = {
        sin: x => Math.sin(isDegree ? x * Math.PI / 180 : x),
        cos: x => Math.cos(isDegree ? x * Math.PI / 180 : x),
        tan: x => Math.tan(isDegree ? x * Math.PI / 180 : x)
    };
    const fact = n => {
        n = Math.floor(n);
        if (n < 0) throw 'Negative factorial';
        if (n > 170) throw 'Factorial too large';
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
    };
    try {
        return new Function('Trig', 'Math', 'fact', `"use strict"; return ${s}`)(Trig, Math, fact);
    } catch (err) {
        if (s.match(/\/0(?!\.)/)) throw new Error('Division by zero');
        if (s.match(/[^\d)(a-zA-Z+*\-\/.^ %]/)) throw new Error('Invalid character'); // Allow %
        throw new Error('Invalid syntax');
    }
}
function formatResult(r) {
    if (typeof r !== "number" || isNaN(r)) return 'Error';
    if (Math.abs(r) > 1e15 || (Math.abs(r) < 1e-10 && r !== 0))
        return r.toExponential(9);
    return parseFloat(r.toPrecision(14));
}
function handleEquals() {
    if (!expression.trim()) return;
    try {
        const result = evaluateExpression(expression);
        const formatted = formatResult(result);

        if (formatted === 'Error' || !isFinite(formatted)) {
            throw new Error('Invalid Result');
        }

        previousEl.textContent = expression;
        expression = String(formatted);
        lastAns = formatted;
        updateDisplay();
        errorMsg.textContent = '';
        errorMsg.classList.remove('show');
        history.push({ input: previousEl.textContent, result: expression });
        localStorage.setItem('calcHistory', JSON.stringify(history));
        renderHistory();
    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.classList.add('show');
        displayEl.textContent = 'Error';
    }
}

// --- Keyboard global handler: block calculator input when modal & input focused ---
document.addEventListener('keydown', e => {
    const k = e.key;
    const isModalActive = modal.classList.contains('active');
    const isInputFocused = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (isModalActive && isInputFocused) return;
    if (k === 'Escape' && modal.classList.contains('active')) {
        closeModal();
        e.preventDefault();
        return;
    }
    if (k === 'Enter' || k === '=') {
        handleEquals();
        e.preventDefault();
        return;
    }
    if (k === 'Backspace') {
        handleDelete();
        e.preventDefault();
        return;
    }
    if (k === 'Escape') {
        handleClear();
        e.preventDefault();
        return;
    }
    if ('0123456789+-*/().^!%'.includes(k)) {
        expression += k;
        updateDisplay();
        e.preventDefault();
    }
    if (k.toLowerCase() === 'p') {
        expression += 'π';
        updateDisplay();
        e.preventDefault();
    }
    if (k.toLowerCase() === 'e') {
        expression += 'e';
        updateDisplay();
        e.preventDefault();
    }
});

// --- Button flash and theme toggle ---
function flashButton(b) {
    b.classList.add('active');
    setTimeout(() => b.classList.remove('active'), 150);
}
if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark', savedTheme === 'dark');
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    });
}