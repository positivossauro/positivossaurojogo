// script.js

// Configurações do Jogo
const CONFIG = {
    gridSize: 12, // Tabuleiro 12x12
    words: ['RESPIRA', 'CORAGEM', 'CALMA', 'CONFIA', 'GENTILEZA', 'PACIÊNCIA', 'ABRAÇO'], // Palavras oficiais
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Estado do Jogo
let grid = [];
let foundWords = new Set();
let isSelecting = false;
let startCell = null;
let currentSelection = []; // array of {row, col}

// Elementos da UI
const boardEl = document.getElementById('game-board');
const wordListEl = document.getElementById('word-list');
const modalEl = document.getElementById('victory-modal');
const restartBtn = document.getElementById('restart-btn');
const speechBubbleEl = document.getElementById('dino-speech');

const DINO_MESSAGES = [
    "você consegue!",
    "respira fundo...",
    "um passo de cada vez.",
    "tudo no seu tempo.",
    "estou aqui com você!",
    "vai dar tudo certo."
];
let messageInterval = null;

/* -------------------------------------------------------------
   1. INICIALIZAÇÃO
------------------------------------------------------------- */

function initGame() {
    foundWords.clear();
    isSelecting = false;
    startCell = null;
    currentSelection = [];
    modalEl.classList.add('hidden');
    wordListEl.innerHTML = '';
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${CONFIG.gridSize}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${CONFIG.gridSize}, 1fr)`;

    // Renderiza a lista de palavras na UI
    CONFIG.words.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        li.dataset.word = word;
        wordListEl.appendChild(li);
    });

    createEmptyGrid();
    placeWords();
    fillRandomLetters();
    renderBoard();
    
    // Inicia os encorajamentos do Positivossauro (a cada 10-15s)
    if(messageInterval) clearInterval(messageInterval);
    scheduleNextMessage();
}

function scheduleNextMessage() {
    const nextTime = Math.random() * 5000 + 10000; // Entre 10s e 15s
    messageInterval = setTimeout(() => {
        showDinoMessage();
    }, nextTime);
}

function showDinoMessage() {
    // Se o jogo acabou não fala nada
    if(!modalEl.classList.contains('hidden')) return;

    const randomMsg = DINO_MESSAGES[Math.floor(Math.random() * DINO_MESSAGES.length)];
    speechBubbleEl.textContent = randomMsg;
    speechBubbleEl.classList.remove('hidden');

    // Esconde depois de 4 segundos
    setTimeout(() => {
        speechBubbleEl.classList.add('hidden');
        scheduleNextMessage(); // Programa a próxima
    }, 4000);
}

/* -------------------------------------------------------------
   2. GERAÇÃO DO GRID
------------------------------------------------------------- */

function createEmptyGrid() {
    grid = [];
    for (let r = 0; r < CONFIG.gridSize; r++) {
        let row = [];
        for (let c = 0; c < CONFIG.gridSize; c++) {
            row.push(''); // Célula vazia
        }
        grid.push(row);
    }
}

function placeWords() {
    // Para simplificar o protótipo, tentaremos encaixar aleatoriamente.
    // Direções: 0(Dir), 1(Esq), 2(Baixo), 3(Cima), 4(Diag-BaixoDir), 5(Diag-CimaEsq)
    const dirs = [
        {dr: 0, dc: 1},   // Horizontal Direita
        {dr: 0, dc: -1},  // Horizontal Esquerda
        {dr: 1, dc: 0},   // Vertical Baixo
        {dr: -1, dc: 0},  // Vertical Cima
        {dr: 1, dc: 1},   // Diagonal Baixo-Direita
        {dr: -1, dc: -1}  // Diagonal Cima-Esquerda
    ];

    CONFIG.words.forEach(word => {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 100) {
            attempts++;
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            const rStart = Math.floor(Math.random() * CONFIG.gridSize);
            const cStart = Math.floor(Math.random() * CONFIG.gridSize);

            if (canPlaceWord(word, rStart, cStart, dir.dr, dir.dc)) {
                // Coloca a palavra
                for (let i = 0; i < word.length; i++) {
                    grid[rStart + i * dir.dr][cStart + i * dir.dc] = word[i];
                }
                placed = true;
                console.log(`Placed ${word} at (${rStart},${cStart}) dir [${dir.dr},${dir.dc}]`);
            }
        }
        if(!placed) console.warn(`Couldn't place word: ${word}`);
    });
}

function canPlaceWord(word, r, c, dr, dc) {
    const endR = r + (word.length - 1) * dr;
    const endC = c + (word.length - 1) * dc;

    // Checa limites do grid
    if (endR < 0 || endR >= CONFIG.gridSize || endC < 0 || endC >= CONFIG.gridSize) {
        return false;
    }

    // Checa colisões
    for (let i = 0; i < word.length; i++) {
        const currentLetter = grid[r + i * dr][c + i * dc];
        // Se a célula não está vazia e a letra é diferente, há colisão incompatível
        if (currentLetter !== '' && currentLetter !== word[i]) {
            return false;
        }
    }
    return true;
}

function fillRandomLetters() {
    for (let r = 0; r < CONFIG.gridSize; r++) {
        for (let c = 0; c < CONFIG.gridSize; c++) {
            if (grid[r][c] === '') {
                grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
            }
        }
    }
}

function renderBoard() {
    for (let r = 0; r < CONFIG.gridSize; r++) {
        for (let c = 0; c < CONFIG.gridSize; c++) {
            const cellDiv = document.createElement('div');
            cellDiv.className = 'cell';
            cellDiv.textContent = grid[r][c];
            cellDiv.dataset.row = r;
            cellDiv.dataset.col = c;
            
            // Eventos Mouse
            cellDiv.addEventListener('mousedown', handleStart);
            cellDiv.addEventListener('mouseenter', handleMove);
            
            boardEl.appendChild(cellDiv);
        }
    }
    // Finalizador Global
    document.addEventListener('mouseup', handleEnd);

    // Eventos Touch (Mobile) precisam focar no grid preventDefault
    boardEl.addEventListener('touchstart', handleTouchStart, {passive: false});
    boardEl.addEventListener('touchmove', handleTouchMove, {passive: false});
    boardEl.addEventListener('touchend', handleEnd);
}

/* -------------------------------------------------------------
   3. INTERAÇÃO E SELEÇÃO
------------------------------------------------------------- */
function clearSelectionStyles() {
    document.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));
}

function getCellDiv(r, c) {
    return document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
}

function applySelection(r1, c1, r2, c2) {
    clearSelectionStyles();
    currentSelection = [];

    const dr = r2 - r1;
    const dc = c2 - c1;
    
    // Verifica se é uma reta (horizontal, vertical ou diagonal perfeita)
    const stepsR = Math.abs(dr);
    const stepsC = Math.abs(dc);
    
    if (stepsR !== 0 && stepsC !== 0 && stepsR !== stepsC) {
       // Movimento inválido (não é reto)
       return;
    }

    const steps = Math.max(stepsR, stepsC);
    const stepR = stepsR === 0 ? 0 : dr / stepsR;
    const stepC = stepsC === 0 ? 0 : dc / stepsC;

    for (let i = 0; i <= steps; i++) {
        const currR = r1 + i * stepR;
        const currC = c1 + i * stepC;
        currentSelection.push({row: currR, col: currC});
        const domEl = getCellDiv(currR, currC);
        if(domEl) domEl.classList.add('selected');
    }
}


// --- Handlers ---
function handleStart(e) {
    if (e.target.classList.contains('cell')) {
        isSelecting = true;
        const r = parseInt(e.target.dataset.row);
        const c = parseInt(e.target.dataset.col);
        startCell = {r, c};
        applySelection(r, c, r, c);
    }
}

function handleMove(e) {
    if (!isSelecting || !startCell) return;
    if (e.target.classList.contains('cell')) {
        const r = parseInt(e.target.dataset.row);
        const c = parseInt(e.target.dataset.col);
        applySelection(startCell.r, startCell.c, r, c);
    }
}

function handleTouchStart(e) {
    e.preventDefault(); // Previne scroll
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if(target && target.classList.contains('cell')) {
        handleStart({target});
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if(!isSelecting) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if(target && target.classList.contains('cell') && startCell) {
         const r = parseInt(target.dataset.row);
         const c = parseInt(target.dataset.col);
         applySelection(startCell.r, startCell.c, r, c);
    }
}

function handleEnd() {
    if (!isSelecting) return;
    isSelecting = false;
    checkWord();
    clearSelectionStyles();
    startCell = null;
    currentSelection = [];
}

/* -------------------------------------------------------------
   4. VALIDAÇÃO E VITÓRIA
------------------------------------------------------------- */

function checkWord() {
    if(currentSelection.length === 0) return;

    // Extrai a palavra formada pela seleção
    const selectedWord = currentSelection.map(pos => grid[pos.row][pos.col]).join('');
    // Extrai a palavra invertida (caso selecionado de trás pra frente)
    const reversedWord = selectedWord.split('').reverse().join('');

    // Verifica se alguma dessas formações está na lista CONFIG.words e não foi encontrada ainda
    let matchedWord = null;
    if (CONFIG.words.includes(selectedWord) && !foundWords.has(selectedWord)) {
        matchedWord = selectedWord;
    } else if (CONFIG.words.includes(reversedWord) && !foundWords.has(reversedWord)) {
        matchedWord = reversedWord;
    }

    if (matchedWord) {
        // Marca como encontrada
        foundWords.add(matchedWord);
        console.log("Encontrou:", matchedWord);

        // UI: Risca na lista
        const li = document.querySelector(`li[data-word="${matchedWord}"]`);
        if(li) li.classList.add('found');

        // UI: Destaca permanentemente as células no board
        currentSelection.forEach(pos => {
            const domEl = getCellDiv(pos.row, pos.col);
            if(domEl) {
                // Se já faz parte de outra palavra, usa a cor escura de sobreposição (both)
                if(domEl.classList.contains('found')) {
                    domEl.classList.add('both');
                } else {
                    domEl.classList.add('found');
                }
            }
        });

        checkWinCondition();
    }
}

function checkWinCondition() {
    if (foundWords.size === CONFIG.words.length) {
        // Dispara evento de "Jogo Completo" para o Google Analytics (se configurado)
        if (typeof gtag === 'function') {
            gtag('event', 'level_complete', {
                'level_name': 'Semana 1 - Afirmações'
            });
        }

        setTimeout(() => {
            modalEl.classList.remove('hidden');
        }, 500); // pequeno delay para curtir o verde final
    }
}

// Instanciação e Listeners
restartBtn.addEventListener('click', () => {
    initGame();
});

// --- Áudio de Fundo ---
const audioToggleBtn = document.getElementById('audio-toggle');
const bgMusic = document.getElementById('bg-music');
let isMusicPlaying = false;

function startAmbientMusic() {
    if (!isMusicPlaying) {
        bgMusic.volume = 0.3; // Volume agradável de fundo
        bgMusic.play().then(() => {
            isMusicPlaying = true;
            audioToggleBtn.textContent = "música: 🔊";
        }).catch(err => {
            console.log("Áudio bloqueado aguardando interação direta do usuário.");
        });
    }
}

// Navegadores bloqueiam áudio automático, então tentamos ligar na primeira vez que a pessoa tocar na tela
document.body.addEventListener('click', startAmbientMusic, {once: true});
document.body.addEventListener('touchstart', startAmbientMusic, {once: true});

audioToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Evita disparar o evento do body simultaneamente
    if (isMusicPlaying) {
        bgMusic.pause();
        isMusicPlaying = false;
        audioToggleBtn.textContent = "música: 🔇";
    } else {
        bgMusic.play();
        isMusicPlaying = true;
        audioToggleBtn.textContent = "música: 🔊";
    }
});

// --- LGPD e Cookies ---
const cookieBanner = document.getElementById('cookie-banner');
const btnAcceptCookies = document.getElementById('accept-cookies');
const btnDeclineCookies = document.getElementById('decline-cookies');

// Verifica se a pessoa já tomou uma decisão
if (!localStorage.getItem('cookieConsent')) {
    // Pequeno atraso para a animação inicial do jogo aparecer antes
    setTimeout(() => {
        cookieBanner.classList.remove('hidden');
    }, 1500);
} else if (localStorage.getItem('cookieConsent') === 'accepted') {
     // Se já tinha aceitado antes e recarregar a página, libera o GA logo de cara
    if (typeof gtag === 'function') {
        gtag('consent', 'update', {
            'analytics_storage': 'granted'
        });
    }
}

btnAcceptCookies.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'accepted');
    cookieBanner.classList.add('hidden');
    
    // Libera os cookies do Google Analytics nesta sessão
    if (typeof gtag === 'function') {
        gtag('consent', 'update', {
            'analytics_storage': 'granted'
        });
    }
});

btnDeclineCookies.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'declined');
    cookieBanner.classList.add('hidden');
});

// Start Game
window.onload = initGame;
