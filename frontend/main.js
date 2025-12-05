const CELL_SIZE = 8; // px
const GRID_SIZE = 20; // 20x20
const CANVAS_SIZE = CELL_SIZE * GRID_SIZE; // 160
const TICKS_PER_SECOND = 20; // game logic ticks per second (2x faster)
const MS_PER_TICK = 1000 / TICKS_PER_SECOND;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;
canvas.focus();

// HUD
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('highscore');
const pauseBtn = document.getElementById('pauseBtn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const resumeBtn = document.getElementById('resumeBtn');

// Audio (simple Web Audio API synthesized beeps)
let audioContext = null;
let audioEnabled = false;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBeep(freq = 800, duration = 100, volume = 0.3) {
  if (!audioEnabled || !audioContext) return;
  try {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + duration / 1000);
  } catch (e) {}
}

const sounds = {
  eat: () => playBeep(1200, 100, 0.3),
  die: () => playBeep(400, 300, 0.3),
  pause: () => playBeep(600, 80, 0.2)
};

// Input handling
const DIRECTIONS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0]
};

let inputQueue = [];
let lastKey = null;

window.addEventListener('keydown', (e) => {
  // enable audio on first interaction
  if (!audioEnabled) { audioEnabled = true; initAudio(); }

  const key = e.key;
  if (key === 'p' || key === 'P' || key === 'Escape') {
    togglePause();
    e.preventDefault();
    return;
  }

  if (DIRECTIONS[key]) {
    inputQueue.push(DIRECTIONS[key]);
    lastKey = key;
    e.preventDefault();
  }
});

// Game state
function makeEmptySnake() {
  const mid = Math.floor(GRID_SIZE / 2);
  return [ [mid, mid], [mid-1, mid], [mid-2, mid] ];
}

let snake = makeEmptySnake();
let dir = [1, 0]; // moving right initially
let food = spawnFood();
let score = 0;
let highscore = loadHighscore();
highEl.textContent = `High: ${highscore}`;
let lastTick = performance.now();
let accumulator = 0;
let paused = false;
let gameOver = false;
let lastRenderAlpha = 0; // freeze render alpha while paused

function spawnFood() {
  while (true) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    if (!snake.some(s => s[0] === x && s[1] === y)) return [x, y];
  }
}

function loadHighscore(){
  try { return parseInt(localStorage.getItem('snake.highscore')) || 0; } catch(e){ return 0; }
}

function saveHighscore(val){
  try { localStorage.setItem('snake.highscore', String(val)); } catch(e){}
}

function tick() {
  if (gameOver || paused) return;

  // process input queue
  if (inputQueue.length) {
    const next = inputQueue.shift();
    // prevent reverse
    if (!(next[0] === -dir[0] && next[1] === -dir[1])) dir = next;
  }

  const head = snake[0];
  const newHeadX = head[0] + dir[0];
  const newHeadY = head[1] + dir[1];

  // collision with borders (kill zone)
  if (newHeadX < 0 || newHeadX >= GRID_SIZE || newHeadY < 0 || newHeadY >= GRID_SIZE) {
    gameOver = true;
    if (audioEnabled) sounds.die();
    overlayTitle.textContent = 'Game Over';
    overlay.classList.remove('hidden');
    if (score > highscore) { highscore = score; saveHighscore(highscore); highEl.textContent = `High: ${highscore}`; }
    return;
  }

  const newHead = [newHeadX, newHeadY];

  // collision with self
  if (snake.some(seg => seg[0] === newHead[0] && seg[1] === newHead[1])) {
    gameOver = true;
    if (audioEnabled) sounds.die();
    overlayTitle.textContent = 'Game Over';
    overlay.classList.remove('hidden');
    if (score > highscore) { highscore = score; saveHighscore(highscore); highEl.textContent = `High: ${highscore}`; }
    return;
  }

  snake.unshift(newHead);

  // eat food?
  if (newHead[0] === food[0] && newHead[1] === food[1]) {
    score += 1;
    scoreEl.textContent = `Score: ${score}`;
    if (audioEnabled) sounds.eat();
    food = spawnFood();
  } else {
    snake.pop();
  }
}

function gameLoop(now) {
  const delta = now - lastTick;
  lastTick = now;
  accumulator += delta;

  while (accumulator >= MS_PER_TICK) {
    tick();
    accumulator -= MS_PER_TICK;
  }

  const alpha = paused ? lastRenderAlpha : accumulator / MS_PER_TICK;
  lastRenderAlpha = alpha;
  render(alpha);
  requestAnimationFrame(gameLoop);
}

function render(alpha) {
  // alpha: interpolation factor between previous and current tick
  // For snake we can interpolate position between cells for smoother motion
  ctx.clearRect(0,0,CANVAS_SIZE,CANVAS_SIZE);

  // draw food
  ctx.fillStyle = '#ff4d6d';
  ctx.fillRect(food[0]*CELL_SIZE, food[1]*CELL_SIZE, CELL_SIZE, CELL_SIZE);

  // draw snake with interpolation
  ctx.fillStyle = '#34d399';
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    let x = seg[0];
    let y = seg[1];

    if (i === 0) {
      // head interpolation using dir
      x = seg[0] - dir[0] * (1 - alpha);
      y = seg[1] - dir[1] * (1 - alpha);
    } else {
      // simple approach: no interpolation for body segments to keep it cheap
    }

    ctx.fillRect(Math.floor(x*CELL_SIZE), Math.floor(y*CELL_SIZE), CELL_SIZE, CELL_SIZE);
  }
}

function togglePause(){
  if (gameOver) return;
  paused = !paused;
  if (paused) {
    overlayTitle.textContent = 'Paused';
    overlay.classList.remove('hidden');
    if (audioEnabled) sounds.pause();
  } else {
    overlay.classList.add('hidden');
    if (audioEnabled) sounds.pause();
    // reset timing so we don't get a big delta
    lastTick = performance.now();
    accumulator = 0;
  }
}

function restartGame(){
  snake = makeEmptySnake();
  dir = [1,0];
  food = spawnFood();
  score = 0;
  gameOver = false;
  scoreEl.textContent = `Score: ${score}`;
  overlay.classList.add('hidden');
}

pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', () => {
  if (gameOver) {
    restartGame();
  } else {
    togglePause();
  }
});

// click canvas to focus and enable audio on first click
canvas.addEventListener('mousedown', () => { canvas.focus(); if (!audioEnabled) { audioEnabled = true; initAudio(); } });

// start
scoreEl.textContent = `Score: ${score}`;
requestAnimationFrame((ts) => { lastTick = ts; requestAnimationFrame(gameLoop); });

// simple restart on double click
canvas.addEventListener('dblclick', () => {
  if (!gameOver) return;
  snake = makeEmptySnake();
  dir = [1,0];
  food = spawnFood();
  score = 0;
  gameOver = false;
  scoreEl.textContent = `Score: ${score}`;
  overlay.classList.add('hidden');
});
