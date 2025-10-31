// 총알 피하기 게임 JS

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: true });

// HTML 요소
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start");
const restartBtn = document.getElementById("restart");
const toggleSoundBtn = document.getElementById("toggle-sound");
const toggleAutoBtn = document.getElementById("toggle-auto");

let player, bullets, running, elapsed, difficulty, autoDifficulty, soundOn, best;
let spawnTimer, lastTime;

// 오디오
let audioCtx = null;
function beep(freq = 440, dur = 0.05, vol = 0.08) {
  if (!soundOn) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    setTimeout(() => o.stop(), dur * 1000 + 20);
  } catch (e) {}
}

// 플레이어 / 총알 클래스
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 12;
    this.speed = 380;
  }
  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "#86f0c8";
    ctx.shadowColor = "#86f0c8";
    ctx.shadowBlur = 15;
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Bullet {
  constructor(x, y, vx, vy, speed, r, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.speed = speed;
    this.r = r;
    this.color = color;
  }
  update(dt) {
    this.x += this.vx * this.speed * dt;
    this.y += this.vy * this.speed * dt;
  }
  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// 초기화
function resetGame() {
  const w = canvas.width, h = canvas.height;
  player = new Player(w / 2, h / 2);
  bullets = [];
  running = false;
  elapsed = 0;
  difficulty = 1;
  autoDifficulty = true;
  soundOn = true;
  spawnTimer = 0;
  lastTime = 0;
  statusEl.textContent = "대기 중";
  best = parseFloat(localStorage.getItem("bullet-dodge-best") || "0") || 0;
  bestEl.textContent = best.toFixed(2) + " s";
  scoreEl.textContent = "0.00 s";
}

function startGame() {
  if (running) return;
  running = true;
  elapsed = 0;
  statusEl.textContent = "생존 중";
  lastTime = performance.now();
  requestAnimationFrame(update);
  beep(800, 0.05, 0.06);
}

function spawnBullet() {
  const w = canvas.width;
  const h = canvas.height;
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  const pad = 10;

  if (edge === 0) { x = Math.random() * w; y = -pad; }
  else if (edge === 1) { x = w + pad; y = Math.random() * h; }
  else if (edge === 2) { x = Math.random() * w; y = h + pad; }
  else { x = -pad; y = Math.random() * h; }

  const dx = player.x - x, dy = player.y - y;
  const dist = Math.hypot(dx, dy) || 1;
  const vx = dx / dist, vy = dy / dist;

  const speed = 120 + difficulty * 40;
  const r = 6;
  const color = `hsl(${20 + difficulty * 10}, 80%, 60%)`;
  bullets.push(new Bullet(x, y, vx, vy, speed, r, color));
}

function checkCollision(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < (a.r + b.r) ** 2;
}

const keys = {};
window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

function update(ts) {
  if (!running) return;
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;
  const w = canvas.width, h = canvas.height;

  // 이동
  let dx = 0, dy = 0;
  if (keys["arrowup"] || keys["w"]) dy -= 1;
  if (keys["arrowdown"] || keys["s"]) dy += 1;
  if (keys["arrowleft"] || keys["a"]) dx -= 1;
  if (keys["arrowright"] || keys["d"]) dx += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;
  }

  // 화면 밖 제한
  player.x = Math.max(player.r, Math.min(w - player.r, player.x));
  player.y = Math.max(player.r, Math.min(h - player.r, player.y));

  // 총알 생성
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnBullet();
    spawnTimer = Math.max(0.2, 1.0 - difficulty * 0.05);
  }

  // 총알 이동 및 충돌
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update(dt);
    if (checkCollision(player, bullets[i])) {
      gameOver();
      return;
    }
  }

  // 점수
  elapsed += dt;
  scoreEl.textContent = elapsed.toFixed(2) + " s";
  if (autoDifficulty) difficulty = 1 + elapsed * 0.08;

  render();
  requestAnimationFrame(update);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const b of bullets) b.draw();
  player.draw();
}

function gameOver() {
  running = false;
  statusEl.textContent = "사망";
  beep(120, 0.2, 0.15);
  if (elapsed > best) {
    best = elapsed;
    localStorage.setItem("bullet-dodge-best", best);
    bestEl.textContent = best.toFixed(2) + " s";
  }
}

// 버튼
startBtn.onclick = startGame;
restartBtn.onclick = resetGame;
toggleSoundBtn.onclick = () => {
  soundOn = !soundOn;
  toggleSoundBtn.textContent = `사운드: ${soundOn ? "ON" : "OFF"}`;
};
toggleAutoBtn.onclick = () => {
  autoDifficulty = !autoDifficulty;
  toggleAutoBtn.textContent = `자동 난이도: ${autoDifficulty ? "ON" : "OFF"}`;
};

// 초기 실행
resetGame();
render();