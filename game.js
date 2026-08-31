const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menuOverlay = document.getElementById("menu");
const shopOverlay = document.getElementById("shop");
const messageOverlay = document.getElementById("message");
const hud = document.getElementById("hud");
const scoreValue = document.getElementById("scoreValue");
const coinValue = document.getElementById("coinValue");
const healthValue = document.getElementById("healthValue");
const timeValue = document.getElementById("timeValue");
const bankCoins = document.getElementById("bankCoins");
const shopList = document.getElementById("shopList");
const menuButton = document.getElementById("menuButton");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const messagePrimary = document.getElementById("messagePrimary");
const messageSecondary = document.getElementById("messageSecondary");

const saveKey = "jungle-dash-progress";

const skins = [
  { name: "Ninja", price: 0, primary: "#f72585", accent: "#3a0ca3" },
  { name: "Robot", price: 25, primary: "#4cc9f0", accent: "#1d3557" },
  { name: "Knight", price: 40, primary: "#f8961e", accent: "#783f04" },
  { name: "Alien", price: 60, primary: "#80ed99", accent: "#073b4c" },
  { name: "Dino", price: 90, primary: "#c77dff", accent: "#2d1b46" }
];

const loadProgress = () => {
  const fallback = { coins: 0, selected: "Ninja", unlocked: ["Ninja"] };
  const raw = localStorage.getItem(saveKey);

  if (!raw) return fallback;

  try {
    const saved = JSON.parse(raw);
    return {
      coins: Number(saved.coins) || 0,
      selected: saved.selected || "Ninja",
      unlocked: Array.isArray(saved.unlocked) && saved.unlocked.length ? saved.unlocked : ["Ninja"]
    };
  } catch (error) {
    return fallback;
  }
};

const state = {
  running: false,
  mode: "adventure",
  score: 0,
  timeLeft: 60,
  health: 3,
  cameraX: 0,
  progress: loadProgress(),
  level: null,
  player: null,
  animationId: null,
  keys: {
    left: false,
    right: false,
    jump: false
  }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const getSkin = (name = state.progress.selected) => skins.find((skin) => skin.name === name) || skins[0];

const saveProgress = () => {
  localStorage.setItem(saveKey, JSON.stringify(state.progress));
  bankCoins.textContent = state.progress.coins;
};

const setOverlayVisible = (element, visible) => {
  element.classList.toggle("hidden", !visible);
  element.classList.toggle("visible", visible);
};

const showMenu = () => {
  state.running = false;
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }

  setOverlayVisible(menuOverlay, true);
  setOverlayVisible(shopOverlay, false);
  setOverlayVisible(messageOverlay, false);
  setOverlayVisible(hud, false);
  menuButton.classList.add("hidden");
  renderShop();
};

const showShop = () => {
  setOverlayVisible(menuOverlay, false);
  setOverlayVisible(shopOverlay, true);
  setOverlayVisible(messageOverlay, false);
  renderShop();
};

const backToMenu = () => {
  setOverlayVisible(shopOverlay, false);
  setOverlayVisible(menuOverlay, true);
};

const updateHud = () => {
  scoreValue.textContent = state.score;
  coinValue.textContent = state.player ? state.player.coins : 0;
  healthValue.textContent = state.health;
  timeValue.textContent = `${state.timeLeft.toFixed(1)}s`;
  bankCoins.textContent = state.progress.coins;
};

const createLevel = (mode) => {
  const groundY = 500;
  const platforms = [
    { x: 0, y: groundY, width: 420, height: 40 },
    { x: 490, y: groundY, width: 310, height: 40 },
    { x: 900, y: groundY, width: 300, height: 40 },
    { x: 1270, y: groundY, width: 280, height: 40 },
    { x: 1660, y: groundY, width: 520, height: 40 },

    { x: 220, y: 420, width: 140, height: 18 },
    { x: 560, y: 360, width: 120, height: 18 },
    { x: 760, y: 300, width: 150, height: 18 },
    { x: 1050, y: 420, width: 130, height: 18 },
    { x: 1220, y: 330, width: 140, height: 18 },
    { x: 1490, y: 270, width: 170, height: 18 },
    { x: 1760, y: 380, width: 120, height: 18 },
    { x: 1960, y: 310, width: 120, height: 18 }
  ];

  const coins = [
    { x: 170, y: 470, r: 10, value: 10, collected: false },
    { x: 330, y: 470, r: 10, value: 10, collected: false },
    { x: 590, y: 320, r: 10, value: 10, collected: false },
    { x: 820, y: 260, r: 10, value: 10, collected: false },
    { x: 1100, y: 380, r: 10, value: 10, collected: false },
    { x: 1280, y: 285, r: 10, value: 10, collected: false },
    { x: 1560, y: 230, r: 10, value: 10, collected: false },
    { x: 1800, y: 340, r: 10, value: 10, collected: false },
    { x: 2020, y: 270, r: 10, value: 10, collected: false }
  ];

  const enemies = [
    { x: 540, y: 468, width: 30, height: 30, minX: 500, maxX: 760, speed: 1.2, direction: 1, alive: true },
    { x: 1400, y: 468, width: 30, height: 30, minX: 1320, maxX: 1580, speed: 1.4, direction: -1, alive: true },
    { x: 1850, y: 468, width: 30, height: 30, minX: 1690, maxX: 2070, speed: 1.7, direction: 1, alive: true }
  ];

  return {
    width: 2200,
    goal: { x: 2100, y: 350, width: 30, height: 150 },
    platforms,
    coins,
    enemies,
    mode
  };
};

const createPlayer = () => ({
  x: 60,
  y: 440,
  width: 30,
  height: 36,
  vx: 0,
  vy: 0,
  speed: 4.6,
  jumpForce: 12,
  onGround: false,
  invulnerable: 0,
  facing: 1,
  coins: 0
});

const resetPlayerPosition = () => {
  state.player.x = 60;
  state.player.y = 440;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.onGround = false;
};

const startGame = (mode) => {
  state.mode = mode;
  state.score = 0;
  state.health = 3;
  state.timeLeft = mode === "time" ? 60 : 0;
  state.level = createLevel(mode);
  state.player = createPlayer();
  state.player.coins = 0;
  state.running = true;
  state.cameraX = 0;

  setOverlayVisible(menuOverlay, false);
  setOverlayVisible(shopOverlay, false);
  setOverlayVisible(messageOverlay, false);
  setOverlayVisible(hud, true);
  menuButton.classList.remove("hidden");
  updateHud();

  if (state.animationId) cancelAnimationFrame(state.animationId);
  state.animationId = requestAnimationFrame(gameLoop);
};

const showMessage = (title, text, primaryLabel, primaryAction) => {
  messageTitle.textContent = title;
  messageText.textContent = text;
  messagePrimary.textContent = primaryLabel;
  messagePrimary.onclick = primaryAction;
  messageSecondary.onclick = () => showMenu();

  setOverlayVisible(messageOverlay, true);
};

const endGame = (won) => {
  state.running = false;
  if (won) {
    const bonus = state.mode === "time" ? 50 : 25;
    const totalEarned = state.score + bonus;
    state.progress.coins += totalEarned;
    saveProgress();
    showMessage("You Win!", `You reached the flag with ${state.score} points. Bonus: ${bonus} coins.`, "Play Again", () => startGame(state.mode));
  } else {
    showMessage("Game Over", `You reached ${state.score} points. Try again!`, "Retry", () => startGame(state.mode));
  }
};

const updatePlayerPhysics = () => {
  const player = state.player;
  const level = state.level;

  if (state.keys.left) {
    player.vx = -player.speed;
    player.facing = -1;
  } else if (state.keys.right) {
    player.vx = player.speed;
    player.facing = 1;
  } else {
    player.vx = 0;
  }

  if (state.keys.jump && player.onGround) {
    player.vy = -player.jumpForce;
    player.onGround = false;
    state.keys.jump = false;
  }

  player.vy += 0.6;
  const previousY = player.y;

  player.x += player.vx;
  for (const platform of level.platforms) {
    if (intersects(player, platform)) {
      if (player.vx > 0) player.x = platform.x - player.width;
      if (player.vx < 0) player.x = platform.x + platform.width;
    }
  }

  player.y += player.vy;
  player.onGround = false;

  for (const platform of level.platforms) {
    if (intersects(player, platform)) {
      if (player.vy >= 0 && previousY + player.height <= platform.y + 14) {
        player.y = platform.y - player.height;
        player.vy = 0;
        player.onGround = true;
      } else if (player.vy < 0 && previousY >= platform.y + platform.height - 10) {
        player.y = platform.y + platform.height;
        player.vy = 0;
      }
    }
  }

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > level.width) player.x = level.width - player.width;
  if (player.y > canvas.height + 120) {
    player.y = 60;
    player.vy = 0;
    state.health -= 1;
    player.invulnerable = 60;
    if (state.health <= 0) {
      endGame(false);
    }
  }

  if (player.invulnerable > 0) player.invulnerable -= 1;
};

const collectCoins = () => {
  const player = state.player;
  for (const coin of state.level.coins) {
    if (coin.collected) continue;

    const coinBox = { x: coin.x - coin.r, y: coin.y - coin.r, width: coin.r * 2, height: coin.r * 2 };
    if (intersects(player, coinBox)) {
      coin.collected = true;
      player.coins += 1;
      state.score += coin.value;
      state.progress.coins += coin.value;
      saveProgress();
      updateHud();
    }
  }
};

const updateEnemies = () => {
  const player = state.player;

  for (const enemy of state.level.enemies) {
    if (!enemy.alive) continue;

    if (enemy.x <= enemy.minX) enemy.direction = 1;
    if (enemy.x + enemy.width >= enemy.maxX) enemy.direction = -1;

    enemy.x += enemy.direction * enemy.speed;

    if (intersects(player, enemy)) {
      const stomped = player.vy > 0 && player.y + player.height < enemy.y + enemy.height * 0.75;
      if (stomped) {
        enemy.alive = false;
        player.vy = -9;
        state.score += 30;
      } else if (player.invulnerable <= 0) {
        state.health -= 1;
        player.invulnerable = 80;
        player.x = Math.max(40, player.x - 60);
        player.y = Math.max(40, player.y - 20);
        if (state.health <= 0) {
          endGame(false);
          return;
        }
      }
    }
  }
};

const checkGoal = () => {
  const player = state.player;
  const goal = state.level.goal;
  if (player.x + player.width > goal.x && player.x < goal.x + goal.width && player.y + player.height > goal.y && player.y < goal.y + goal.height) {
    endGame(true);
  }
};

const update = () => {
  if (!state.running || !state.player) return;

  updatePlayerPhysics();
  collectCoins();
  updateEnemies();
  checkGoal();

  if (state.mode === "time") {
    state.timeLeft = Math.max(0, state.timeLeft - 1 / 60);
    if (state.timeLeft <= 0) {
      endGame(false);
    }
  }

  state.cameraX = clamp(state.player.x - canvas.width * 0.35, 0, state.level.width - canvas.width);
  updateHud();
};

const drawBackground = () => {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#133b5c");
  sky.addColorStop(0.5, "#1b7d7a");
  sky.addColorStop(1, "#a8d66d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 8; i += 1) {
    const x = ((i * 180) - state.cameraX * 0.2) % (canvas.width + 200);
    const y = 40 + (i % 4) * 35;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.arc(x + 28, y - 10, 18, 0, Math.PI * 2);
    ctx.arc(x + 52, y, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(22, 62, 40, 0.7)";
  for (let i = 0; i < 6; i += 1) {
    const x = i * 220 - (state.cameraX * 0.5) % 160;
    ctx.beginPath();
    ctx.moveTo(x, canvas.height);
    ctx.lineTo(x + 80, 260);
    ctx.lineTo(x + 160, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
};

const drawPlatforms = () => {
  ctx.fillStyle = "#5d8c2d";
  for (const platform of state.level.platforms) {
    const x = platform.x - state.cameraX;
    ctx.fillRect(x, platform.y, platform.width, platform.height);
    ctx.fillStyle = "#7abf54";
    ctx.fillRect(x, platform.y, platform.width, 5);
    ctx.fillStyle = "#5d8c2d";
  }
};

const drawCoins = () => {
  for (const coin of state.level.coins) {
    if (coin.collected) continue;
    const x = coin.x - state.cameraX;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(x, coin.y, coin.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5b700";
    ctx.beginPath();
    ctx.arc(x - 2, coin.y - 2, coin.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawEnemies = () => {
  for (const enemy of state.level.enemies) {
    if (!enemy.alive) continue;
    const x = enemy.x - state.cameraX;
    ctx.fillStyle = "#b5179e";
    ctx.fillRect(x, enemy.y, enemy.width, enemy.height);
    ctx.fillStyle = "#ffd6a5";
    ctx.fillRect(x + 5, enemy.y + 8, 6, 6);
    ctx.fillRect(x + 19, enemy.y + 8, 6, 6);
  }
};

const drawGoal = () => {
  const x = state.level.goal.x - state.cameraX;
  ctx.strokeStyle = "#f1faee";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 10, state.level.goal.y);
  ctx.lineTo(x + 10, state.level.goal.y + state.level.goal.height);
  ctx.stroke();

  ctx.fillStyle = "#ffbf69";
  ctx.fillRect(x + 10, state.level.goal.y + 10, 38, 28);
  ctx.fillStyle = "#f77f00";
  ctx.fillRect(x + 16, state.level.goal.y + 18, 26, 12);
};

const drawPlayer = () => {
  const skin = getSkin();
  const player = state.player;
  const x = player.x - state.cameraX;

  ctx.fillStyle = skin.accent;
  ctx.fillRect(x + 5, player.y + 4, player.width - 10, 8);

  ctx.fillStyle = skin.primary;
  ctx.fillRect(x, player.y + 12, player.width, player.height - 12);

  ctx.fillStyle = "#f9f7f3";
  ctx.fillRect(x + 8, player.y + 16, 6, 6);
  ctx.fillRect(x + player.width - 14, player.y + 16, 6, 6);

  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(x + 9, player.y + 17, 3, 3);
  ctx.fillRect(x + player.width - 12, player.y + 17, 3, 3);

  if (player.invulnerable > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 2, player.y - 2, player.width + 4, player.height + 4);
  }
};

const draw = () => {
  if (!state.running) return;

  drawBackground();
  drawPlatforms();
  drawCoins();
  drawEnemies();
  drawGoal();
  drawPlayer();
};

const gameLoop = () => {
  if (!state.running) return;
  update();
  draw();
  state.animationId = requestAnimationFrame(gameLoop);
};

const handleKeyDown = (event) => {
  const key = event.code;

  if (["ArrowLeft", "KeyA"].includes(key)) state.keys.left = true;
  if (["ArrowRight", "KeyD"].includes(key)) state.keys.right = true;
  if (["ArrowUp", "KeyW", "Space"].includes(key)) state.keys.jump = true;

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(key) || ["KeyA", "KeyD", "KeyW"].includes(key)) {
    event.preventDefault();
  }
};

const handleKeyUp = (event) => {
  const key = event.code;
  if (["ArrowLeft", "KeyA"].includes(key)) state.keys.left = false;
  if (["ArrowRight", "KeyD"].includes(key)) state.keys.right = false;
  if (["ArrowUp", "KeyW", "Space"].includes(key)) state.keys.jump = false;
};

const buyOrSelectSkin = (skin) => {
  const unlocked = state.progress.unlocked.includes(skin.name);
  if (unlocked || state.progress.coins >= skin.price) {
    if (!unlocked) {
      state.progress.coins -= skin.price;
      state.progress.unlocked.push(skin.name);
    }
    state.progress.selected = skin.name;
    saveProgress();
    renderShop();
    return;
  }

  alert(`You need ${skin.price} coins to unlock ${skin.name}.`);
};

const renderShop = () => {
  const selected = state.progress.selected;
  shopList.innerHTML = "";

  skins.forEach((skin) => {
    const unlocked = state.progress.unlocked.includes(skin.name);
    const button = document.createElement("button");
    button.className = "shop-item" + (selected === skin.name ? " selected" : "");
    button.innerHTML = `
      <span class="shop-swatch" style="background:${skin.primary}; border-color:${skin.accent};"></span>
      <span class="shop-copy">
        <strong>${skin.name}</strong>
        <small>${unlocked ? "Owned" : `${skin.price} coins`}</small>
      </span>
    `;
    button.addEventListener("click", () => buyOrSelectSkin(skin));
    shopList.appendChild(button);
  });

  bankCoins.textContent = state.progress.coins;
};

document.querySelector("[data-action='start-adventure']").addEventListener("click", () => startGame("adventure"));
document.querySelector("[data-action='start-time']").addEventListener("click", () => startGame("time"));
document.querySelector("[data-action='shop']").addEventListener("click", showShop);
document.querySelector("[data-action='reset-progress']").addEventListener("click", () => {
  state.progress = { coins: 0, selected: "Ninja", unlocked: ["Ninja"] };
  saveProgress();
  renderShop();
  alert("Progress reset. Your character skin has been restored to Ninja.");
});
document.querySelector("[data-action='back-menu']").addEventListener("click", backToMenu);
menuButton.addEventListener("click", showMenu);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

bankCoins.textContent = state.progress.coins;
renderShop();
showMenu();
