// The Bible Game — PoC
// A minimal Super Mario-style platformer with biblical missions.

(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;
  const H = canvas.height;

  // --- Build marker (bump this with every real change — the HUD shows it so
  //     you can confirm the browser isn't serving a stale file).
  const BUILD = "v10-cave-lock";

  // --- State -----------------------------------------------------------------
  const state = {
    screen: "menu", // menu | screen | playing | scroll | end | gameover | quiz
    missionIndex: 0,
    mission: null,
    player: null,
    enemies: [],
    scrolls: [],
    platforms: [],
    projectiles: [],
    particles: [],
    manna: [],
    quails: [],
    rain: [],
    lightningTimer: 0,
    lightningFlash: 0,
    seaWall: null,
    slingPickup: null,
    hasSling: false,
    slingStones: 0,
    riacho: null,
    pebbles: [],
    angelProtection: false,
    angelSummoned: false,
    prayed: false,
    kneeling: false,
    prayerWindows: [],
    angel: null,
    friendNPCs: [],
    dying: false,
    dyingTimer: 0,
    boss: null,
    goalX: 0,
    camera: { x: 0, y: 0 },
    score: 0,
    lives: 3,
    collected: 0,
    totalScrolls: 0,
    tileMap: [],
    mapW: 0,
    mapH: 0,
    keys: {},
    paused: false,
    t: 0,
    throwCooldown: 0,
    finishing: false,
    finishTimer: 0
  };

  // --- Audio (Web Audio API — no files, just tiny oscillator blips) ---------
  let audioCtx = null;
  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { /* ignore */ }
  }
  function tone(freq, dur, type = "square", peak = 0.08, delay = 0) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime + delay;
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
  }
  function sfx(name) {
    if (!audioCtx) return;
    switch (name) {
      case "jump":    tone(460, 0.10, "square", 0.07); tone(620, 0.08, "square", 0.05, 0.04); break;
      case "stomp":   tone(180, 0.09, "triangle", 0.12); break;
      case "scroll":  tone(840, 0.08, "sine", 0.09); tone(1260, 0.12, "sine", 0.08, 0.06); break;
      case "manna":   tone(1100, 0.06, "sine", 0.06); break;
      case "throw":   tone(280, 0.06, "sawtooth", 0.05); break;
      case "stonehit":tone(220, 0.08, "square", 0.1); break;
      case "bosshit": tone(140, 0.18, "square", 0.14); tone(90, 0.18, "sawtooth", 0.1, 0.02); break;
      case "hurt":    tone(120, 0.22, "sawtooth", 0.14); tone(80, 0.22, "square", 0.08, 0.05); break;
      case "pickup":  tone(520, 0.08, "sine", 0.08); tone(780, 0.10, "sine", 0.09, 0.07); tone(1040, 0.14, "sine", 0.08, 0.14); break;
      case "finish":  tone(520, 0.12, "square", 0.09); tone(660, 0.12, "square", 0.09, 0.12); tone(880, 0.26, "square", 0.1, 0.24); break;
      case "right":   tone(660, 0.12, "sine", 0.09); tone(990, 0.22, "sine", 0.1, 0.12); break;
      case "wrong":   tone(200, 0.18, "square", 0.12); tone(150, 0.18, "sawtooth", 0.1, 0.1); break;
      case "thunder": tone(70, 0.55, "sawtooth", 0.14); tone(50, 0.6, "square", 0.1, 0.05); tone(95, 0.3, "triangle", 0.09, 0.2); break;
      case "quail":   tone(720, 0.08, "triangle", 0.07); tone(900, 0.12, "sine", 0.08, 0.05); break;
    }
  }

  // --- Progress (localStorage) ----------------------------------------------
  const STORAGE_KEY = "bible-game-progress-v1";
  let progress = loadProgress();
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  // --- Particles -------------------------------------------------------------
  function spawnParticles(x, y, opts) {
    const n = opts.count || 8;
    for (let i = 0; i < n; i++) {
      const angle = (opts.angleStart != null ? opts.angleStart : 0) +
                    Math.random() * (opts.angleSpread != null ? opts.angleSpread : Math.PI * 2);
      const speed = (opts.speed || 2) * (0.5 + Math.random() * 0.8);
      state.particles.push({
        x: x + (Math.random() - 0.5) * (opts.jitter || 4),
        y: y + (Math.random() - 0.5) * (opts.jitter || 4),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (opts.upBias || 0),
        life: opts.life || 28,
        maxLife: opts.life || 28,
        size: opts.size || 3,
        color: opts.color || "#fff",
        gravity: opts.gravity != null ? opts.gravity : 0.18
      });
    }
  }
  function updateParticles() {
    for (const p of state.particles) {
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  }

  // --- Input -----------------------------------------------------------------
  window.addEventListener("keydown", (e) => {
    initAudio();
    state.keys[e.key.toLowerCase()] = true;

    if (e.key === "Enter" && state.screen === "scroll") {
      closeScroll();
    }
    if (e.key.toLowerCase() === "p" && state.screen === "playing") {
      togglePause();
    }
    // Kneel to pray (Daniel mission). If near a prayer window, triggers
    // the one-time Dn 6:10 popup.
    if (e.key.toLowerCase() === "b" && state.screen === "playing" && state.mission &&
        state.mission.id === "leoes") {
      state.kneeling = true;
      if (!state.prayed && state.player) {
        for (const w of state.prayerWindows) {
          if (Math.abs(state.player.x - w.x) < 56) {
            state.prayed = true;
            sfx("pickup");
            openTrigger({
              title: "Janelas abertas para Jerusalém",
              verse: "\"Três vezes no dia se punha de joelhos, e orava.\" — Daniel 6:10",
              context: "Daniel continuou orando de joelhos com as janelas abertas, mesmo sabendo do decreto. Fidelidade não escondida — visível, audível."
            });
            break;
          }
        }
      }
    }
    // Summon the angel in the lions' den (Dn 6:22). Requires that Daniel
    // has already knelt in prayer (B near the prayer window).
    if (e.key.toLowerCase() === "o" && state.screen === "playing" && state.mission &&
        state.mission.id === "leoes" && !state.angelSummoned) {
      if (!state.prayed) {
        sfx("wrong");
        openTrigger({
          title: "Ore primeiro",
          verse: "\"Humilhar-se-á o meu povo... orarem, então eu ouvirei dos céus.\" — 2 Crônicas 7:14",
          context: "Daniel primeiro se ajoelhou para orar (6:10). Só depois veio o livramento. Tecla B perto da janela para orar."
        });
        return;
      }
      state.angelSummoned = true;
      for (const en of state.enemies) {
        if (en.type === "lion") en.passive = true;
      }
      // Open the cave exit — remove the # wall tiles at col 49 rows 4-9.
      for (let y = 4; y <= 9; y++) {
        if (state.tileMap[y] && state.tileMap[y][49] === "#") {
          state.tileMap[y][49] = ".";
        }
      }
      sfx("finish");
      if (state.player) {
        spawnParticles(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, {
          count: 42, color: "#fff8dc", size: 3, life: 55, speed: 4, gravity: -0.05
        });
      }
      openTrigger({
        title: "O anjo na cova",
        verse: "\"Meu Deus enviou o seu anjo, e fechou a boca dos leões.\" — Daniel 6:22",
        context: "Os inimigos conspiraram, mas Deus respondeu. A integridade de Daniel foi preservada. O rei passou a noite em jejum e correu à cova ao alvorecer."
      });
    }
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    state.keys[e.key.toLowerCase()] = false;
    if (e.key.toLowerCase() === "b") state.kneeling = false;
  });
  window.addEventListener("mousedown", initAudio, { once: false });
  window.addEventListener("touchstart", initAudio, { once: false });
  window.addEventListener("keyup", (e) => {
    state.keys[e.key.toLowerCase()] = false;
  });

  // --- UI Bindings -----------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const menuEl = $("menu");
  const scrollEl = $("scroll-popup");
  const endEl = $("end-screen");
  const gameoverEl = $("gameover");
  const pauseEl = $("pause-menu");
  const quizEl = $("quiz-screen");

  function togglePause() {
    if (state.screen !== "playing") return;
    state.paused = !state.paused;
    if (state.paused) pauseEl.classList.remove("hidden");
    else pauseEl.classList.add("hidden");
  }

  $("hud-pause").addEventListener("click", togglePause);
  $("pause-resume").addEventListener("click", togglePause);

  // ---------- On-screen touch controls (mobile) ----------
  // Buttons set the same state.keys flags the keyboard handler uses, so the
  // game logic doesn't care whether input came from a key or a finger.
  (function bindTouchControls() {
    const buttons = document.querySelectorAll(".touch-btn[data-key]");
    if (!buttons.length) return;

    const press = (key, btn) => {
      state.keys[key] = true;
      btn.classList.add("active");
      initAudio();
    };
    const release = (key, btn) => {
      state.keys[key] = false;
      btn.classList.remove("active");
    };

    buttons.forEach((btn) => {
      const key = btn.getAttribute("data-key");
      // Touch
      btn.addEventListener("touchstart", (e) => { e.preventDefault(); press(key, btn); }, { passive: false });
      btn.addEventListener("touchend",   (e) => { e.preventDefault(); release(key, btn); }, { passive: false });
      btn.addEventListener("touchcancel",(e) => { e.preventDefault(); release(key, btn); }, { passive: false });
      // Mouse (desktop testing + hybrid devices)
      btn.addEventListener("mousedown",  (e) => { e.preventDefault(); press(key, btn); });
      btn.addEventListener("mouseup",    (e) => { e.preventDefault(); release(key, btn); });
      btn.addEventListener("mouseleave", () => { if (state.keys[key]) release(key, btn); });
      // Stop the click default so the button doesn't steal focus / trigger ghost taps
      btn.addEventListener("contextmenu", (e) => e.preventDefault());
    });

    // Auto-show on touch-capable devices that the media query may miss
    // (e.g. some hybrid laptops). Once any touch happens, lock it on.
    window.addEventListener("touchstart", () => {
      document.body.classList.add("touch-mode");
    }, { once: true, passive: true });

    // Contextual action buttons (X for Davi's sling, B/O for Daniel).
    // We dispatch synthetic KeyboardEvents so the existing keydown/keyup
    // handlers run unchanged — no duplication of game logic.
    const actionButtons = document.querySelectorAll(".touch-action[data-event-key]");
    const fireKey = (type, key) => {
      const ev = new KeyboardEvent(type, { key, bubbles: true });
      window.dispatchEvent(ev);
    };
    actionButtons.forEach((btn) => {
      const key = btn.getAttribute("data-event-key");
      const down = (e) => { e.preventDefault(); btn.classList.add("active"); initAudio(); fireKey("keydown", key); };
      const up   = (e) => { e.preventDefault(); btn.classList.remove("active"); fireKey("keyup", key); };
      btn.addEventListener("touchstart",  down, { passive: false });
      btn.addEventListener("touchend",    up,   { passive: false });
      btn.addEventListener("touchcancel", up,   { passive: false });
      btn.addEventListener("mousedown",   down);
      btn.addEventListener("mouseup",     up);
      btn.addEventListener("mouseleave",  () => { if (btn.classList.contains("active")) { btn.classList.remove("active"); fireKey("keyup", key); }});
      btn.addEventListener("contextmenu", (e) => e.preventDefault());
    });
  })();

  // Show/hide contextual action buttons based on the current mission.
  // Called from startMission() and showMenu().
  function updateMissionActions() {
    const missionId = state.mission && state.screen === "playing" ? state.mission.id : null;
    document.querySelectorAll(".touch-action[data-mission]").forEach((btn) => {
      const matches = btn.getAttribute("data-mission") === missionId;
      btn.classList.toggle("hidden", !matches);
    });
  }
  $("pause-restart").addEventListener("click", () => {
    state.paused = false;
    pauseEl.classList.add("hidden");
    startMission(state.missionIndex);
  });
  $("pause-tomenu").addEventListener("click", () => {
    state.paused = false;
    pauseEl.classList.add("hidden");
    showMenu();
  });

  $("end-quiz").addEventListener("click", startQuiz);
  $("quiz-continue").addEventListener("click", () => {
    quizEl.classList.add("hidden");
    endEl.classList.remove("hidden");
  });

  function renderMenu() {
    const list = $("missions-list");
    list.innerHTML = "";
    MISSIONS.forEach((m, i) => {
      const done = progress[m.id];
      const card = document.createElement("button");
      card.className = "mission-card" + (done ? " mission-done" : "");
      card.innerHTML = `
        <div class="ref">Missão ${i + 1} · ${m.reference} ${done ? '<span class="done-badge">✓</span>' : ''}</div>
        <div class="hero">${m.hero}</div>
        <div class="desc">${m.title}</div>
        ${done ? `<div class="best-score">🏆 recorde: ${done.bestScore} pts · ${done.bestScrolls || 0} pergaminhos</div>` : ''}
      `;
      card.addEventListener("click", () => startMission(i));
      list.appendChild(card);
    });
  }

  $("scroll-close").addEventListener("click", closeScroll);
  $("end-next").addEventListener("click", () => {
    const next = (state.missionIndex + 1) % MISSIONS.length;
    if (next === 0) {
      showMenu();
    } else {
      startMission(next);
    }
  });
  $("end-menu").addEventListener("click", showMenu);
  $("gameover-retry").addEventListener("click", () => startMission(state.missionIndex));
  $("gameover-menu").addEventListener("click", showMenu);

  function showMenu() {
    state.screen = "menu";
    state.lives = 3;
    state.score = 0;
    state.paused = false;
    menuEl.classList.remove("hidden");
    endEl.classList.add("hidden");
    gameoverEl.classList.add("hidden");
    scrollEl.classList.add("hidden");
    pauseEl.classList.add("hidden");
    quizEl.classList.add("hidden");
    updateHud();
    updateMissionActions();
  }

  function hideAllOverlays() {
    menuEl.classList.add("hidden");
    scrollEl.classList.add("hidden");
    endEl.classList.add("hidden");
    gameoverEl.classList.add("hidden");
    pauseEl.classList.add("hidden");
    quizEl.classList.add("hidden");
  }

  // --- Quiz ------------------------------------------------------------------
  function startQuiz() {
    const q = state.mission && state.mission.quiz;
    if (!q) return;
    state.screen = "quiz";
    endEl.classList.add("hidden");
    $("quiz-question").textContent = q.question;
    const optsEl = $("quiz-options");
    optsEl.innerHTML = "";
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.textContent = opt;
      btn.addEventListener("click", () => answerQuiz(i));
      optsEl.appendChild(btn);
    });
    $("quiz-result").classList.add("hidden");
    quizEl.classList.remove("hidden");
  }
  function answerQuiz(idx) {
    const q = state.mission.quiz;
    const correct = idx === q.correct;
    const buttons = document.querySelectorAll(".quiz-option");
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === q.correct) b.classList.add("correct");
      if (i === idx && !correct) b.classList.add("wrong");
    });
    const fb = $("quiz-feedback");
    if (correct) {
      fb.textContent = "✓ Resposta certa!";
      fb.className = "quiz-feedback right";
      state.score += 300;
      updateHud();
      sfx("right");
    } else {
      fb.textContent = `✗ Certa: ${q.options[q.correct]}`;
      fb.className = "quiz-feedback wrong";
      sfx("wrong");
    }
    $("quiz-explain").textContent = q.explain;
    $("quiz-result").classList.remove("hidden");
  }

  // --- Mission Loading -------------------------------------------------------
  function startMission(index) {
    state.missionIndex = index;
    const mission = MISSIONS[index];
    state.mission = mission;
    state.enemies = [];
    state.scrolls = [];
    state.platforms = [];
    state.projectiles = [];
    state.particles = [];
    state.manna = [];
    state.quails = [];
    state.rain = [];
    state.lightningTimer = 60 + Math.floor(Math.random() * 200);
    state.lightningFlash = 0;
    state.seaWall = mission.id === "mar" ? { x: -200, vx: 1.15, startDelay: 150 } : null;
    state.slingPickup = null;
    state.hasSling = false;
    state.slingStones = 0;
    state.riacho = null;
    state.pebbles = [];
    state.angelProtection = false;
    state.angelSummoned = false;
    state.prayed = false;
    state.kneeling = false;
    state.prayerWindows = [];
    state.angel = null;
    state.prayerPickup = null;
    state.jesus = null;
    state.faithActive = false;
    state.windGusts = [];
    state.nextWindAt = 120;
    state.windHits = 0;
    state.friendNPCs = [];
    state.dying = false;
    state.dyingTimer = 0;
    state.boss = null;
    state.collected = 0;
    state.paused = false;
    state.t = 0;
    state.camera.x = 0;
    state.camera.y = 0;
    state.goalX = 0;
    state.throwCooldown = 0;
    state.finishing = false;
    state.finishTimer = 0;

    const map = mission.map;
    state.mapH = map.length;
    // Normalize row widths — pad any short row with '.' so every row in the
    // tileMap has exactly mapW cells. Prevents out-of-range cell access.
    const maxW = map.reduce((m, r) => Math.max(m, r.length), 0);
    state.mapW = maxW;
    state.tileMap = map.map((row) => {
      const chars = row.split("");
      while (chars.length < maxW) chars.push(".");
      return chars;
    });

    // Find ground top (first solid row from the top) so we can spawn the
    // player safely above it regardless of where 'P' is placed in the map.
    let groundRow = state.mapH;
    for (let gy = 0; gy < state.mapH; gy++) {
      const c = state.tileMap[gy][1];
      if (c === "#" || c === "=") { groundRow = gy; break; }
    }

    let scrollIdx = 0;
    for (let y = 0; y < state.mapH; y++) {
      for (let x = 0; x < state.mapW; x++) {
        const t = state.tileMap[y][x];
        const wx = x * TILE;
        const wy = y * TILE;

        if (t === "P") {
          // Ignore P's vertical position — always spawn just above the
          // detected ground row. This prevents the player from clipping
          // into solid bedrock if the map author put P below the surface.
          state.player = {
            x: wx,
            y: Math.max(0, groundRow - 2) * TILE,
            w: 24,
            h: 28,
            vx: 0,
            vy: 0,
            onGround: false,
            facing: 1,
            invuln: 0,
            stepPhase: 0,
            ridePlatform: null
          };
          state.tileMap[y][x] = ".";
        } else if (t === "E") {
          state.enemies.push({
            x: wx + 4,
            y: wy + 4,
            w: 24,
            h: 24,
            vx: -1.2,
            vy: 0,
            alive: true,
            type: "walker"
          });
          state.tileMap[y][x] = ".";
        } else if (t === "H") {
          // Hoplite filisteu com escudo — stomp ricocheteia, só morre na funda.
          state.enemies.push({
            x: wx + 2,
            y: wy + 2,
            w: 28,
            h: 28,
            vx: -0.8,
            vy: 0,
            alive: true,
            type: "shield",
            bounceCooldown: 0
          });
          state.tileMap[y][x] = ".";
        } else if (t === "C") {
          // Carro egípcio — mais rápido que o walker comum. Stomp mata normal.
          state.enemies.push({
            x: wx + 2,
            y: wy + 4,
            w: 28,
            h: 26,
            vx: -1.9,
            vy: 0,
            alive: true,
            type: "chariot",
            bounceCooldown: 0
          });
          state.tileMap[y][x] = ".";
        } else if (t === "L") {
          // Leão — só é seguro depois de invocar o anjo (tecla O).
          state.enemies.push({
            x: wx,
            y: wy,
            w: 32,
            h: 30,
            vx: -0.9,
            vy: 0,
            alive: true,
            type: "lion",
            passive: false,
            bounceCooldown: 0
          });
          state.tileMap[y][x] = ".";
        } else if (t === "U") {
          // Urso — recordação pastoril de Davi (1 Sm 17:34-37). Stomp normal.
          state.enemies.push({
            x: wx,
            y: wy + 2,
            w: 32,
            h: 28,
            vx: -0.7,
            vy: 0,
            alive: true,
            type: "bear"
          });
          state.tileMap[y][x] = ".";
        } else if (t === "W") {
          // Janela de oração — preserva o tile (renderizado como janela).
          state.prayerWindows.push({ x: wx, y: wy });
        } else if (t === "N") {
          // Amigo NPC (Sadraque, Mesaque ou Abede-Nego).
          state.friendNPCs.push({
            x: wx, y: wy,
            w: 24, h: 28,
            color: state.friendNPCs.length % 2 === 0 ? "#6a9ae0" : "#80c890"
          });
          state.tileMap[y][x] = ".";
        } else if (t === "A") {
          // Anjo — o quarto homem (Dn 3:25). Ativa a proteção no toque.
          state.angel = {
            x: wx, y: wy,
            w: 32, h: 32,
            collected: false
          };
          state.tileMap[y][x] = ".";
        } else if (t === "Y") {
          // Ícone de oração (Pedro) — pega para acalmar o mar (Mt 14:28-29).
          state.prayerPickup = {
            x: wx + 4, y: wy + 4,
            w: 24, h: 26,
            collected: false
          };
          state.tileMap[y][x] = ".";
        } else if (t === "J") {
          // Jesus sobre as águas (Mt 14:25). Encontro confirma a vitória.
          state.jesus = {
            x: wx, y: wy,
            w: 28, h: 32,
            met: false
          };
          state.tileMap[y][x] = ".";
        } else if (t === "B") {
          state.boss = {
            x: wx - 16,
            y: wy - TILE,
            w: 48,
            h: 64,
            hp: 3,
            alive: true,
            hitCooldown: 0
          };
          state.tileMap[y][x] = ".";
        } else if (t === "S") {
          state.scrolls.push({
            x: wx + 8,
            y: wy + 8,
            w: 18,
            h: 22,
            collected: false,
            index: scrollIdx++
          });
          state.tileMap[y][x] = ".";
        } else if (t === "F") {
          state.slingPickup = {
            x: wx + 6,
            y: wy + 4,
            w: 22,
            h: 22,
            collected: false
          };
          state.tileMap[y][x] = ".";
        } else if (t === "R") {
          // Ribeiro — flowing brook, wider than one tile. Spawns 5 smooth
          // pebbles along it that David collects one by one (up to 5).
          const zoneX = wx - 24;
          const zoneY = wy + 10;
          const zoneW = 80;
          const zoneH = 20;
          state.riacho = {
            x: zoneX, y: zoneY, w: zoneW, h: zoneH,
            centerX: zoneX + zoneW / 2,
            triggered: false
          };
          state.pebbles = [];
          for (let i = 0; i < 5; i++) {
            state.pebbles.push({
              x: zoneX + 10 + i * 15,
              y: zoneY + 13,
              collected: false
            });
          }
          state.tileMap[y][x] = ".";
        } else if (t === "G") {
          state.goalX = Math.min(state.goalX || Infinity, wx);
          // keep as solid marker? Goal column acts as the finish line zone
        }
      }
    }
    state.totalScrolls = mission.scrolls.length;

    // Load moving platforms (thematic obstacles) for this mission.
    state.platforms = (mission.platforms || []).map((p) => ({
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
      vx: p.axis === "x" ? (p.speed || 1) : 0,
      vy: p.axis === "y" ? (p.speed || 1) : 0,
      minX: p.axis === "x" ? p.min : p.x,
      maxX: p.axis === "x" ? p.max : p.x,
      minY: p.axis === "y" ? p.min : p.y,
      maxY: p.axis === "y" ? p.max : p.y,
      theme: p.theme || "wood",
      trigger: p.trigger || null,
      triggered: false,
      prevX: p.x,
      prevY: p.y
    }));

    hideAllOverlays();
    state.screen = "playing";
    updateHud();
    updateMissionActions();
  }

  // --- Helpers ---------------------------------------------------------------
  function tileAt(px, py) {
    if (!Number.isFinite(px) || !Number.isFinite(py)) return ".";
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (ty < 0 || ty >= state.mapH || tx < 0 || tx >= state.mapW) return ".";
    const row = state.tileMap[ty];
    if (!row) return ".";
    const cell = row[tx];
    return cell == null ? "." : cell;
  }

  function isSolid(t) {
    // 'G' is a non-solid flagpole marker — the player walks through it.
    // In the Fornalha mission, fire tiles (`^`) act as solid floor so the
    // player stands on them (damage comes from the hazard check below).
    if (t === "^" && state.mission && state.mission.id === "fornalha") return true;
    // Em Pedro sobre as águas, o mar vira solo após a oração (Mt 14:29).
    if (t === "~" && state.mission && state.mission.id === "pedro" && state.faithActive) return true;
    return t === "#" || t === "=";
  }
  function isHazard(t) {
    return t === "^" || t === "~";
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function updateHud() {
    $("hud-mission").textContent = state.mission ? state.mission.title : "—";
    $("hud-hero").textContent = state.mission ? state.mission.hero : "—";
    $("hud-scrolls").textContent = `${state.collected} / ${state.totalScrolls}`;
    $("hud-lives").textContent = state.lives;
    $("hud-score").textContent = state.score;
  }

  // --- Physics / Movement ----------------------------------------------------
  const GRAVITY = 0.55;
  const MAX_FALL = 12;
  const MOVE_ACC = 0.7;
  const MAX_SPEED = 3.8;
  const FRICTION = 0.82;
  const JUMP_V = -13.5;

  function moveAndCollide(entity, isPlayer = false) {
    // Horizontal
    entity.x += entity.vx;
    if (entity.vx !== 0) {
      const dir = entity.vx > 0 ? 1 : -1;
      const probeX = dir > 0 ? entity.x + entity.w : entity.x;
      const ys = [entity.y + 2, entity.y + entity.h / 2, entity.y + entity.h - 2];
      for (const y of ys) {
        if (isSolid(tileAt(probeX, y))) {
          const tileEdge = dir > 0
            ? Math.floor(probeX / TILE) * TILE - entity.w - 0.01
            : (Math.floor(probeX / TILE) + 1) * TILE + 0.01;
          entity.x = tileEdge;
          entity.vx = isPlayer ? 0 : -entity.vx;
          break;
        }
      }
    }

    // Vertical
    entity.vy = Math.min(entity.vy + GRAVITY, MAX_FALL);
    entity.y += entity.vy;
    entity.onGround = false;
    if (entity.vy >= 0) {
      // falling → check feet
      const footY = entity.y + entity.h;
      const xs = [entity.x + 2, entity.x + entity.w / 2, entity.x + entity.w - 2];
      for (const x of xs) {
        if (isSolid(tileAt(x, footY))) {
          const hardLand = isPlayer && entity.vy > 5;
          entity.y = Math.floor(footY / TILE) * TILE - entity.h;
          entity.vy = 0;
          entity.onGround = true;
          if (hardLand) {
            spawnParticles(entity.x + entity.w / 2, entity.y + entity.h, {
              count: 6, color: "#d9c48a", size: 2, life: 16, speed: 1.4, gravity: 0.1
            });
          }
          break;
        }
      }
    } else {
      // rising → check head
      const headY = entity.y;
      const xs = [entity.x + 2, entity.x + entity.w / 2, entity.x + entity.w - 2];
      for (const x of xs) {
        if (isSolid(tileAt(x, headY))) {
          entity.y = (Math.floor(headY / TILE) + 1) * TILE;
          entity.vy = 0;
          break;
        }
      }
    }
  }

  function hurtPlayer() {
    if (state.player.invuln > 0) return;
    if (state.dying) return;
    state.lives -= 1;
    updateHud();
    sfx("hurt");
    state.dying = true;
    state.dyingTimer = 70; // ~1.2s slow fade before respawn/game-over
    // Soul puff — gentle blue+white rising haze instead of red blood.
    spawnParticles(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, {
      count: 18, color: "#d8e4ff", size: 3, life: 55, speed: 2.2, gravity: -0.08
    });
    spawnParticles(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, {
      count: 10, color: "#ffffff", size: 2, life: 50, speed: 1.6, gravity: -0.1
    });
  }

  function respawnOrGameOver() {
    state.dying = false;
    state.dyingTimer = 0;
    if (state.lives <= 0) {
      state.screen = "gameover";
      gameoverEl.classList.remove("hidden");
      return;
    }
    let groundRow = state.mapH;
    for (let gy = 0; gy < state.mapH; gy++) {
      const c = state.tileMap[gy][1];
      if (c === "#" || c === "=") { groundRow = gy; break; }
    }
    state.player.x = 16;
    state.player.y = Math.max(0, groundRow - 2) * TILE;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.invuln = 90;
    if (state.seaWall) {
      state.seaWall.x = -200;
      state.seaWall.startDelay = 150;
    }
  }

  // --- Update ----------------------------------------------------------------
  function update() {
    if (state.screen !== "playing" || state.paused) return;
    state.t++;

    // Death sequence — freeze the player, spawn rising soul-puffs, then either
    // respawn (if lives left) or open the game-over overlay.
    if (state.dying) {
      state.dyingTimer--;
      if (state.dyingTimer % 12 === 0 && state.player) {
        spawnParticles(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, {
          count: 5, color: "#e8eeff", size: 2, life: 35, speed: 1.4, gravity: -0.08
        });
      }
      updateParticles();
      if (state.dyingTimer <= 0) respawnOrGameOver();
      return;
    }

    const p = state.player;
    const k = state.keys;

    // Input
    const left = k["arrowleft"] || k["a"];
    const right = k["arrowright"] || k["d"];
    const jump = k[" "] || k["arrowup"] || k["w"];

    if (left)  p.vx = Math.max(p.vx - MOVE_ACC, -MAX_SPEED);
    if (right) p.vx = Math.min(p.vx + MOVE_ACC,  MAX_SPEED);
    if (!left && !right) p.vx *= FRICTION;
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
    if (p.vx > 0) p.facing = 1;
    if (p.vx < 0) p.facing = -1;

    if (jump && p.onGround && !state.finishing) {
      p.vy = JUMP_V;
      p.ridePlatform = null;
      sfx("jump");
    }

    // During the finishing celebration, override input — auto-walk the
    // hero into the safe zone past the flag.
    if (state.finishing) {
      p.vx = Math.min(p.vx + 0.2, 2.6);
      p.facing = 1;
      state.finishTimer--;
      if (state.finishTimer <= 0) {
        finishMission();
        state.finishing = false;
      }
    }

    // Sling throw (David's special) — press X or J to fling a stone. Only
    // works after picking up the sling tile `F`, and only while he has stones
    // (max 5, refilled by standing on a `R` riacho tile).
    const throwKey = (k["x"] || k["j"]) && !state.finishing;
    if (throwKey && state.mission.id === "davi" && state.hasSling &&
        state.slingStones > 0 && state.throwCooldown === 0) {
      state.projectiles.push({
        x: p.x + (p.facing > 0 ? p.w : -4),
        y: p.y + 10,
        vx: p.facing * 7,
        vy: -3,
        alive: true
      });
      state.slingStones--;
      state.throwCooldown = 20;
      sfx("throw");
    }
    if (state.throwCooldown > 0) state.throwCooldown--;

    // Ribeiro — pebbles respawn when David walks far away, so he can come
    // back and pick up another 5. First overlap triggers an educational popup.
    if (state.riacho && state.hasSling) {
      const r = state.riacho;
      const dist = Math.abs((p.x + p.w / 2) - r.centerX);
      if (dist > 220) {
        for (const peb of state.pebbles) peb.collected = false;
      }
      if (rectsOverlap(p, r) && !r.triggered) {
        r.triggered = true;
        openTrigger({
          title: "O ribeiro",
          verse: "\"E tomou cinco seixos lisos do ribeiro, e pô-los no alforje.\" — 1 Samuel 17:40",
          context: "Passe por cima de cada pedra para recolhê-la (até 5 na funda). Se faltarem, volte ao ribeiro — as pedras retornam quando você se afasta."
        });
      }
      for (const peb of state.pebbles) {
        if (peb.collected) continue;
        if (state.slingStones >= 5) break;
        if (rectsOverlap(p, { x: peb.x - 5, y: peb.y - 5, w: 10, h: 10 })) {
          peb.collected = true;
          state.slingStones++;
          sfx("manna");
          spawnParticles(peb.x, peb.y, {
            count: 5, color: "#c8d8e8", size: 2, life: 16, speed: 1.5
          });
        }
      }
    }

    if (p.invuln > 0) p.invuln--;

    // Walk cycle — advance step phase when moving along the ground.
    if (Math.abs(p.vx) > 0.3 && p.onGround) {
      p.stepPhase += Math.abs(p.vx) * 0.25;
    }

    // Move platforms first (so player rides their new position).
    for (const plat of state.platforms) {
      plat.prevX = plat.x;
      plat.prevY = plat.y;
      plat.x += plat.vx;
      plat.y += plat.vy;
      if (plat.x < plat.minX) { plat.x = plat.minX; plat.vx = Math.abs(plat.vx); }
      if (plat.x > plat.maxX) { plat.x = plat.maxX; plat.vx = -Math.abs(plat.vx); }
      if (plat.y < plat.minY) { plat.y = plat.minY; plat.vy = Math.abs(plat.vy); }
      if (plat.y > plat.maxY) { plat.y = plat.maxY; plat.vy = -Math.abs(plat.vy); }
    }

    // If riding a platform, move with it BEFORE physics (so the player
    // doesn't slide off when the platform moves horizontally).
    if (p.ridePlatform) {
      const plat = p.ridePlatform;
      p.x += plat.x - plat.prevX;
      p.y += plat.y - plat.prevY;
    }
    p.ridePlatform = null; // will be re-set below if still on one

    moveAndCollide(p, true);

    // Resolve player vs moving platforms (after tile collision).
    for (const plat of state.platforms) {
      if (!rectsOverlap(p, plat)) continue;
      const prevFoot = p.y + p.h - p.vy;
      if (p.vy >= 0 && prevFoot <= plat.y + 2) {
        // landing on top
        p.y = plat.y - p.h;
        p.vy = 0;
        p.onGround = true;
        p.ridePlatform = plat;
        if (plat.trigger && !plat.triggered) {
          plat.triggered = true;
          openTrigger(plat.trigger);
        }
      } else if (p.vy < 0 && p.y >= plat.y + plat.h - 2) {
        // bumping head on underside
        p.y = plat.y + plat.h;
        p.vy = 0;
      } else {
        // side push-out
        if (p.x + p.w / 2 < plat.x + plat.w / 2) {
          p.x = plat.x - p.w;
        } else {
          p.x = plat.x + plat.w;
        }
        p.vx = 0;
      }
    }

    // Fell off the world
    if (p.y > state.mapH * TILE + 100) {
      hurtPlayer();
    }

    // Hazards under feet — on the Fornalha mission, the angel protects
    // the player from fire (`^`) once the 3rd scroll has been collected.
    const footT1 = tileAt(p.x + 2, p.y + p.h + 1);
    const footT2 = tileAt(p.x + p.w - 2, p.y + p.h + 1);
    const inFire = footT1 === "^" || footT2 === "^";
    const inWater = footT1 === "~" || footT2 === "~";
    const protectedFromFire = state.mission.id === "fornalha" && state.angelProtection;
    const walkingOnWater = state.mission.id === "pedro" && state.faithActive;
    if ((inWater && !walkingOnWater) || (inFire && !protectedFromFire)) {
      hurtPlayer();
    }

    // Enemies
    for (const e of state.enemies) {
      if (!e.alive) continue;
      moveAndCollide(e, false);
      // turn at edges (if nothing solid under the next step)
      const aheadX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
      const belowAhead = tileAt(aheadX, e.y + e.h + 2);
      if (!isSolid(belowAhead)) e.vx = -e.vx;

      if (e.bounceCooldown > 0) e.bounceCooldown--;

      if (rectsOverlap(p, e)) {
        const lionInDen = e.type === "lion" && state.mission.id === "leoes";
        if (lionInDen && (e.passive || state.angelSummoned)) {
          // Leão pacificado — boca fechada pelo anjo, sem dano (Dn 6:22).
        } else if (lionInDen) {
          // Leão ativo na cova — só o anjo livra (Dn 6:22).
          hurtPlayer();
        } else if (p.vy > 1 && p.y + p.h - e.y < 16) {
          if (e.type === "shield") {
            p.vy = JUMP_V * 0.6;
            if (e.bounceCooldown === 0) {
              e.bounceCooldown = 20;
              sfx("stonehit");
              spawnParticles(p.x + p.w / 2, e.y, {
                count: 5, color: "#d0d0d0", size: 2, life: 18, speed: 1.6
              });
            }
          } else {
            e.alive = false;
            p.vy = JUMP_V * 0.6;
            state.score += 100;
            updateHud();
            sfx("stomp");
            spawnParticles(e.x + e.w / 2, e.y + e.h / 2, {
              count: 10, color: "#b05050", size: 3, life: 26, speed: 2.4
            });
          }
        } else {
          hurtPlayer();
        }
      }
    }
    state.enemies = state.enemies.filter((e) => e.alive);

    // Boss — behavior depends on mission.
    //   Davi:  Golias — stomp só ricocheteia, só a funda mata.
    //   Sinai: bezerro de ouro — stomp normal (3 pulos na cabeça).
    if (state.boss && state.boss.alive) {
      const b = state.boss;
      b.hitCooldown = Math.max(0, b.hitCooldown - 1);
      b.x += Math.sin(state.t / 40) * 0.8;
      const isDavi = state.mission.id === "davi";
      if (rectsOverlap(p, b)) {
        if (p.vy > 1 && p.y + p.h - b.y < 22) {
          p.vy = JUMP_V * 0.7;
          if (isDavi) {
            // armored — no damage
            if (b.hitCooldown === 0) {
              b.hitCooldown = 20;
              sfx("stonehit");
              spawnParticles(p.x + p.w / 2, b.y, {
                count: 6, color: "#d0d0d0", size: 2, life: 18, speed: 1.8, gravity: 0.1
              });
            }
          } else {
            if (b.hitCooldown === 0) {
              b.hp -= 1;
              b.hitCooldown = 30;
              state.score += 300;
              updateHud();
              sfx("bosshit");
              spawnParticles(b.x + b.w / 2, b.y + 10, {
                count: 14, color: "#ffe27a", size: 3, life: 26, speed: 3
              });
              if (b.hp <= 0) {
                b.alive = false;
                state.score += 500;
                updateHud();
                spawnParticles(b.x + b.w / 2, b.y + b.h / 2, {
                  count: 36, color: "#e0b030", size: 4, life: 48, speed: 4
                });
              }
            }
          }
        } else if (b.hitCooldown === 0) {
          hurtPlayer();
        }
      }
    }

    // Scrolls
    for (const s of state.scrolls) {
      if (s.collected) continue;
      if (rectsOverlap(p, s)) {
        s.collected = true;
        state.collected++;
        state.score += 200;
        updateHud();
        sfx("scroll");
        spawnParticles(s.x + s.w / 2, s.y + s.h / 2, {
          count: 14, color: "#ffe27a", size: 3, life: 32, speed: 2.6, gravity: 0.05
        });
        // Special onCollect FX — e.g. Sinai bezerro de ouro "breaks" the tablets.
        const entry = state.mission.scrolls[s.index];
        if (entry && entry.onCollect === "break-tablets") {
          sfx("thunder");
          for (let i = 0; i < 2; i++) {
            spawnParticles(p.x + p.w / 2, p.y + 6, {
              count: 14, color: "#b8b8b8", size: 4, life: 45, speed: 3.2, gravity: 0.25
            });
            spawnParticles(p.x + p.w / 2, p.y + 6, {
              count: 6, color: "#4a4a4a", size: 3, life: 40, speed: 2.5, gravity: 0.25
            });
          }
          state.lightningFlash = Math.max(state.lightningFlash, 6);
        }
        // Angel appears in the furnace (Dn 3:25) — activates fire immunity.
        if (entry && entry.onCollect === "angel-protect") {
          state.angelProtection = true;
          sfx("finish");
          spawnParticles(p.x + p.w / 2, p.y + p.h / 2, {
            count: 48, color: "#ffe080", size: 3, life: 60, speed: 4, gravity: -0.08
          });
          spawnParticles(p.x + p.w / 2, p.y + p.h / 2, {
            count: 20, color: "#ffffff", size: 2, life: 45, speed: 3
          });
        }
        openScroll(s.index);
      }
    }

    // Anjo na fornalha — coletar = ativar a proteção contra o fogo.
    if (state.angel && !state.angel.collected) {
      if (rectsOverlap(p, state.angel)) {
        state.angel.collected = true;
        state.angelProtection = true;
        state.score += 300;
        updateHud();
        sfx("finish");
        spawnParticles(state.angel.x + 16, state.angel.y + 16, {
          count: 48, color: "#ffe080", size: 3, life: 60, speed: 4, gravity: -0.08
        });
        spawnParticles(state.angel.x + 16, state.angel.y + 16, {
          count: 24, color: "#ffffff", size: 2, life: 50, speed: 3
        });
        openTrigger({
          title: "O quarto homem",
          verse: "\"Vejo quatro homens soltos, andando no meio do fogo... o aspecto do quarto é semelhante ao Filho de Deus.\" — Daniel 3:25",
          context: "O rei vê QUATRO onde só três foram lançados. A presença divina no meio do fogo — leitura cristológica antiga."
        });
      }
    }

    // Ícone de oração (Pedro) — coletar = mar se acalma, fé sustenta o passo.
    if (state.prayerPickup && !state.prayerPickup.collected) {
      const pp = state.prayerPickup;
      if (rectsOverlap(p, pp)) {
        pp.collected = true;
        state.faithActive = true;
        state.score += 250;
        updateHud();
        sfx("finish");
        spawnParticles(pp.x + pp.w / 2, pp.y + pp.h / 2, {
          count: 36, color: "#cfe8ff", size: 3, life: 50, speed: 3.2, gravity: -0.05
        });
        spawnParticles(pp.x + pp.w / 2, pp.y + pp.h / 2, {
          count: 18, color: "#ffffff", size: 2, life: 40, speed: 2.6
        });
        openTrigger({
          title: "Manda-me ir",
          verse: "\"Senhor, se és tu, manda-me ir ter contigo por sobre as águas... E Pedro, descendo do barco, andou sobre as águas.\" — Mateus 14:28-29",
          context: "A oração precede o passo. Quando o coração se aquieta diante do Senhor, o mar revolto também se aquieta — e a fé encontra chão onde só havia abismo."
        });
      }
    }

    // Jesus sobre as águas (Pedro) — encontro confirma a vitória (Mt 14:33).
    if (state.jesus && !state.jesus.met) {
      if (rectsOverlap(p, state.jesus)) {
        state.jesus.met = true;
        state.score += 400;
        updateHud();
        sfx("finish");
        spawnParticles(state.jesus.x + 14, state.jesus.y + 16, {
          count: 40, color: "#ffe080", size: 3, life: 60, speed: 3.5, gravity: -0.04
        });
        openTrigger({
          title: "Verdadeiramente, o Filho de Deus",
          verse: "\"Os que estavam no barco vieram e adoraram-no, dizendo: És verdadeiramente o Filho de Deus.\" — Mateus 14:33",
          context: "O encontro no meio do mar não termina na repreensão — termina em adoração. A travessia da fé revela quem é Jesus."
        });
      }
    }

    // Rajadas de vento (Pedro) — "vento contrário" / "vendo o vento forte, teve
    // medo" (Mt 14:24,30). Spawnam após a oração e empurram Pedro pra trás.
    if (state.mission.id === "pedro" && state.faithActive && !state.finishing && !(state.jesus && state.jesus.met)) {
      state.nextWindAt--;
      if (state.nextWindAt <= 0) {
        state.nextWindAt = 80 + Math.floor(Math.random() * 60);
        const camRightX = state.camera.x + W;
        const yMin = 9 * TILE - 2;
        const yMax = 10 * TILE - 8;
        state.windGusts.push({
          x: camRightX + 24,
          y: yMin + Math.random() * (yMax - yMin),
          w: 84,
          h: 14,
          vx: -3.6 - Math.random() * 0.8,
          life: 360
        });
      }
      for (const g of state.windGusts) {
        g.x += g.vx;
        g.life--;
      }
      state.windGusts = state.windGusts.filter((g) => g.life > 0 && g.x + g.w > -200);
      for (const g of state.windGusts) {
        if (rectsOverlap(p, g) && p.invuln === 0) {
          state.windHits++;
          spawnParticles(p.x + p.w / 2, p.y + p.h / 2, {
            count: 10, color: "#e6f0ff", size: 2, life: 22, speed: 2.4
          });
          spawnParticles(p.x + p.w / 2, p.y + p.h / 2, {
            count: 6, color: "#ffffff", size: 1.5, life: 18, speed: 1.8
          });
          if (state.windHits >= 3) {
            // "Vendo o vento forte, teve medo, e começando a afundar..." (Mt 14:30)
            // Três rajadas = fé exaurida. Pedro afunda — perde a fase.
            state.lives = 0;
            spawnParticles(p.x + p.w / 2, p.y + p.h, {
              count: 30, color: "#1f4f8a", size: 4, life: 50, speed: 3, gravity: 0.18
            });
            spawnParticles(p.x + p.w / 2, p.y + p.h, {
              count: 18, color: "#ffffff", size: 2, life: 40, speed: 2
            });
            hurtPlayer();
          } else {
            p.vx = -3.2;
            p.invuln = 28;
            sfx("stonehit");
          }
          break;
        }
      }
    }

    // Sling pickup (Davi) — a funda vazia. Pedras vêm separadas, do ribeiro.
    if (state.slingPickup && !state.slingPickup.collected) {
      const sp = state.slingPickup;
      if (rectsOverlap(p, sp)) {
        sp.collected = true;
        state.hasSling = true;
        state.score += 150;
        updateHud();
        sfx("pickup");
        spawnParticles(sp.x + sp.w / 2, sp.y + sp.h / 2, {
          count: 18, color: "#ffe27a", size: 3, life: 34, speed: 3, gravity: 0
        });
        openTrigger({
          title: "Funda recolhida",
          verse: "\"Tomou o seu cajado na mão, e a sua funda, e foi-se chegando ao filisteu.\" — 1 Samuel 17:40",
          context: "A funda está pronta, mas vazia. Encontre o ribeiro azul mais adiante e recolha até cinco pedras — só elas derrotam Golias."
        });
      }
    }

    // Projectiles (David's sling stones)
    for (const proj of state.projectiles) {
      if (!proj.alive) continue;
      proj.vy += 0.4;
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (isSolid(tileAt(proj.x, proj.y))) {
        proj.alive = false;
        sfx("stonehit");
        spawnParticles(proj.x, proj.y, { count: 5, color: "#c8c8c8", size: 2, life: 16, speed: 1.5 });
        continue;
      }
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (proj.x > e.x && proj.x < e.x + e.w && proj.y > e.y && proj.y < e.y + e.h) {
          e.alive = false;
          proj.alive = false;
          state.score += 100;
          updateHud();
          sfx("stonehit");
          spawnParticles(e.x + e.w / 2, e.y + e.h / 2, {
            count: 10, color: "#b05050", size: 3, life: 24, speed: 2.2
          });
          break;
        }
      }
      if (state.boss && state.boss.alive && proj.alive) {
        const b = state.boss;
        if (proj.x > b.x && proj.x < b.x + b.w && proj.y > b.y && proj.y < b.y + b.h) {
          if (b.hitCooldown === 0) {
            b.hp -= 1;
            b.hitCooldown = 30;
            state.score += 300;
            updateHud();
            sfx("bosshit");
            spawnParticles(proj.x, proj.y, {
              count: 14, color: "#ffe27a", size: 3, life: 28, speed: 3
            });
            if (b.hp <= 0) {
              b.alive = false;
              state.score += 500;
              updateHud();
              spawnParticles(b.x + b.w / 2, b.y + b.h / 2, {
                count: 40, color: "#888", size: 4, life: 50, speed: 4
              });
            }
          }
          proj.alive = false;
        }
      }
      if (proj.y > state.mapH * TILE + 100) proj.alive = false;
    }
    state.projectiles = state.projectiles.filter((pr) => pr.alive);

    updateParticles();

    // Manna from heaven (Moses) — spawns and falls; collected on touch.
    if (state.mission.id === "moises") {
      if (state.t % 35 === 0 && state.manna.length < 14) {
        state.manna.push({
          x: state.camera.x + Math.random() * W,
          y: -20,
          vx: (Math.random() - 0.5) * 0.3,
          vy: 0.6 + Math.random() * 0.4,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.15
        });
      }
      for (const m of state.manna) {
        m.vy = Math.min(m.vy + 0.015, 2.2);
        m.y += m.vy;
        m.x += m.vx;
        m.rot += m.vrot;
      }
      state.manna = state.manna.filter((m) => {
        if (isSolid(tileAt(m.x, m.y + 6))) return false;
        if (m.x > p.x && m.x < p.x + p.w && m.y > p.y && m.y < p.y + p.h) {
          state.score += 50;
          updateHud();
          sfx("manna");
          spawnParticles(m.x, m.y, {
            count: 6, color: "#fff5c0", size: 2, life: 20, speed: 1.6, gravity: -0.05
          });
          return false;
        }
        return m.y < state.mapH * TILE + 50;
      });

      // Codornizes — raras (Nm 11:31), valem o dobro do maná.
      if (state.t % 140 === 80 && state.quails.length < 3) {
        state.quails.push({
          x: state.camera.x + Math.random() * W,
          y: -30,
          vx: (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.4),
          vy: 0.9 + Math.random() * 0.4,
          flap: Math.random() * Math.PI * 2
        });
      }
      for (const q of state.quails) {
        q.vy = Math.min(q.vy + 0.02, 2.8);
        q.y += q.vy;
        q.x += q.vx;
        q.flap += 0.35;
      }
      state.quails = state.quails.filter((q) => {
        if (isSolid(tileAt(q.x, q.y + 6))) return false;
        if (q.x > p.x && q.x < p.x + p.w && q.y > p.y && q.y < p.y + p.h) {
          state.score += 100;
          updateHud();
          sfx("quail");
          spawnParticles(q.x, q.y, {
            count: 10, color: "#a06a3a", size: 3, life: 22, speed: 2
          });
          return false;
        }
        return q.y < state.mapH * TILE + 50;
      });
    }

    // Chase wall (Mar mission) — the sea closes from the left.
    if (state.seaWall && !state.finishing) {
      const w = state.seaWall;
      if (w.startDelay > 0) w.startDelay--;
      else w.x += w.vx;
      if (p.x + p.w < w.x && p.invuln === 0) {
        hurtPlayer();
      }
    }

    // Storm — rain + lightning (Jonas only).
    if (state.mission.id === "jonas") {
      for (let i = 0; i < 3; i++) {
        state.rain.push({
          x: state.camera.x + Math.random() * (W + 120) - 60,
          y: -16,
          vx: -2.2,
          vy: 9 + Math.random() * 2,
          life: 60
        });
      }
      for (const r of state.rain) {
        r.x += r.vx; r.y += r.vy; r.life--;
      }
      state.rain = state.rain.filter((r) => r.life > 0 && r.y < state.mapH * TILE);

      if (state.lightningTimer > 0) state.lightningTimer--;
      else {
        state.lightningFlash = 10;
        state.lightningTimer = 360 + Math.floor(Math.random() * 360);
        sfx("thunder");
      }
      if (state.lightningFlash > 0) state.lightningFlash--;
    }

    // Goal reached? — start the finish celebration (auto-walk into safe zone).
    if (!state.finishing) {
      const goalCol = findGoalColumn();
      if (goalCol !== -1 && p.x + p.w >= goalCol * TILE) {
        if (!state.boss || !state.boss.alive) {
          state.finishing = true;
          state.finishTimer = 110;
          state.score += 500;
          updateHud();
          sfx("finish");
          spawnParticles(goalCol * TILE + 16, 5 * TILE, {
            count: 30, color: "#ffe27a", size: 3, life: 50, speed: 3.5, gravity: 0.08
          });
        }
      }
    }

    // Camera follow
    state.camera.x = Math.max(0, Math.min(p.x - W / 2 + p.w / 2, state.mapW * TILE - W));
    state.camera.y = 0;
  }

  function findGoalColumn() {
    for (let x = 0; x < state.mapW; x++) {
      for (let y = 0; y < state.mapH; y++) {
        if (state.tileMap[y][x] === "G") return x;
      }
    }
    return -1;
  }

  function openScroll(index) {
    const entry = state.mission.scrolls[index] || state.mission.scrolls[0];
    showPopup(entry);
  }
  function openTrigger(entry) {
    showPopup(entry);
  }
  function showPopup(entry) {
    $("scroll-title").textContent = entry.title;
    $("scroll-verse").textContent = entry.verse;
    $("scroll-context").textContent = entry.context;
    scrollEl.classList.remove("hidden");
    state.screen = "scroll";
  }
  function closeScroll() {
    scrollEl.classList.add("hidden");
    state.screen = "playing";
  }

  function finishMission() {
    state.screen = "end";
    // Save progress — per-mission best score.
    const id = state.mission.id;
    const prev = progress[id];
    const isBest = !prev || state.score > (prev.bestScore || 0);
    progress[id] = {
      completed: true,
      bestScore: isBest ? state.score : prev.bestScore,
      bestScrolls: isBest ? state.collected : prev.bestScrolls
    };
    saveProgress();

    $("end-title").textContent = `Missão concluída: ${state.mission.hero}`;
    const recordLabel = isBest && prev ? " · 🏆 novo recorde!" : isBest ? "" : ` · recorde: ${prev.bestScore}`;
    $("end-summary").textContent =
      `Pergaminhos: ${state.collected}/${state.totalScrolls} · Pontos: ${state.score}${recordLabel}`;
    $("end-verse").textContent = state.mission.closingVerse;
    const hasQuiz = !!state.mission.quiz;
    $("end-quiz").style.display = hasQuiz ? "" : "none";
    endEl.classList.remove("hidden");
  }

  // --- Render ----------------------------------------------------------------
  function render() {
    // Background
    if (state.mission) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, state.mission.bgTop);
      g.addColorStop(1, state.mission.bgBottom);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = "#0b1020";
    }
    ctx.fillRect(0, 0, W, H);

    if (state.screen === "menu") return;

    // Parallax clouds
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 240 - state.camera.x * 0.3) % (W + 240)) - 120;
      const cy = 40 + (i % 3) * 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.arc(cx + 22, cy + 4, 16, 0, Math.PI * 2);
      ctx.arc(cx - 20, cy + 6, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tiles
    const camX = state.camera.x;
    const firstCol = Math.floor(camX / TILE) - 1;
    const lastCol = firstCol + Math.ceil(W / TILE) + 2;
    for (let y = 0; y < state.mapH; y++) {
      for (let x = Math.max(0, firstCol); x < Math.min(state.mapW, lastCol); x++) {
        const t = state.tileMap[y][x];
        const sx = x * TILE - camX;
        const sy = y * TILE;
        drawTile(t, sx, sy);
      }
    }

    // Casco e mastro do barco (Pedro) — sobre os '#' do começo da fase.
    if (state.mission && state.mission.id === "pedro") {
      drawBoatDecor(camX);
    }

    // Scrolls
    for (const s of state.scrolls) {
      if (s.collected) continue;
      const bob = Math.sin(state.t / 15 + s.x) * 2;
      drawScroll(s.x - camX, s.y + bob);
    }

    // Enemies
    for (const e of state.enemies) {
      drawEnemy(e.x - camX, e.y, e.vx < 0 ? -1 : 1, e.type, e.passive);
    }

    // Flag decorations — one big flag + pedestal per G column.
    drawFlagDecorations(firstCol, lastCol, camX);

    // Sling pickup (David)
    if (state.slingPickup && !state.slingPickup.collected) {
      drawSlingPickup(state.slingPickup.x - camX, state.slingPickup.y);
    }

    // Ribeiro + pedras (Davi)
    if (state.riacho) {
      drawRiacho(state.riacho, camX);
      for (const peb of state.pebbles) {
        if (peb.collected) continue;
        drawPebble(peb.x - camX, peb.y);
      }
    }

    // Amigos NPCs (Fornalha — Sadraque, Mesaque, Abede-Nego)
    for (const npc of state.friendNPCs) {
      drawFriendNPC(npc.x - camX, npc.y, npc.color);
    }

    // Anjo (Fornalha — o quarto homem)
    if (state.angel) {
      drawAngel(state.angel.x - camX, state.angel.y, state.angel.collected);
    }

    // Ícone de oração (Pedro) — coletável dentro do barco.
    if (state.prayerPickup && !state.prayerPickup.collected) {
      drawPrayerIcon(state.prayerPickup.x - camX, state.prayerPickup.y);
    }

    // Jesus sobre as águas (Pedro) — figura no fim da travessia.
    if (state.jesus) {
      drawJesus(state.jesus.x - camX, state.jesus.y, state.jesus.met);
    }

    // Manna
    for (const m of state.manna) drawManna(m.x - camX, m.y, m.rot);

    // Projectiles
    for (const pr of state.projectiles) drawProjectile(pr.x - camX, pr.y);

    // Particles
    for (const part of state.particles) {
      const a = Math.max(0, part.life / part.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x - camX, part.y, Math.max(0.5, part.size * a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Rajadas de vento (Pedro) — desenhadas sobre o mar, em frente ao jogador.
    if (state.windGusts && state.windGusts.length > 0) {
      for (const g of state.windGusts) {
        drawWindGust(g.x - camX, g.y, state.t);
      }
    }

    // Boss — render depends on mission.
    if (state.boss && state.boss.alive) {
      const drawBoss = state.mission.id === "sinai" ? drawCalf : drawGiant;
      drawBoss(state.boss.x - camX, state.boss.y, state.boss.hp, state.boss.hitCooldown > 0);
    }

    // Moving platforms (thematic obstacles)
    for (const plat of state.platforms) {
      drawPlatform(plat, camX);
    }

    // Quails (Moses)
    for (const q of state.quails) drawQuail(q.x - camX, q.y, q.flap, q.vx > 0 ? 1 : -1);

    // Sea ceiling + chase wall (Mar mission)
    if (state.mission && state.mission.id === "mar") {
      // Wavy water ceiling at the top of the view.
      ctx.fillStyle = "rgba(46, 110, 190, 0.85)";
      for (let px = 0; px < W; px += 8) {
        const wave = 14 + Math.sin((px + state.t * 2) * 0.06) * 5;
        ctx.fillRect(px, 0, 8, wave);
      }
      ctx.fillStyle = "rgba(190, 230, 255, 0.65)";
      for (let px = 0; px < W; px += 12) {
        const wave = 18 + Math.sin((px + state.t * 2) * 0.06) * 5;
        ctx.fillRect(px, wave, 12, 2);
      }
      // Bubbles drifting upward
      for (let i = 0; i < 5; i++) {
        const bx = (state.t * 0.6 + i * 180) % (W + 60) - 30;
        const by = H - 40 - ((state.t + i * 40) % (H - 80));
        ctx.fillStyle = "rgba(200, 230, 255, 0.35)";
        ctx.beginPath();
        ctx.arc(bx, by, 3 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
      // The pursuing wall of water, from the left.
      if (state.seaWall) {
        const wx = state.seaWall.x - camX;
        if (wx > -120 && wx < W + 40) {
          const grad = ctx.createLinearGradient(wx - 120, 0, wx + 14, 0);
          grad.addColorStop(0, "rgba(18, 60, 140, 0)");
          grad.addColorStop(0.4, "rgba(30, 90, 180, 0.55)");
          grad.addColorStop(1, "rgba(120, 190, 255, 0.95)");
          ctx.fillStyle = grad;
          ctx.fillRect(Math.min(wx - 120, 0), 0, Math.max(0, wx + 14 - Math.min(wx - 120, 0)), H);
          // Foam curling at the leading edge
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          for (let y = 0; y < H; y += 14) {
            const wave = Math.sin(state.t * 0.2 + y * 0.09) * 5;
            ctx.fillRect(wx + wave - 2, y, 4, 10);
          }
          // Spray droplets
          for (let i = 0; i < 12; i++) {
            const dy = (state.t * 2.6 + i * 52) % H;
            ctx.fillStyle = "rgba(220, 240, 255, 0.8)";
            ctx.fillRect(wx + 6 + Math.sin(state.t * 0.12 + i) * 10, dy, 2, 5);
          }
        }
      }
    }

    // Rain streaks (Jonas)
    if (state.rain.length) {
      ctx.strokeStyle = "rgba(190,215,255,0.55)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (const r of state.rain) {
        const x = r.x - camX;
        ctx.moveTo(x, r.y);
        ctx.lineTo(x - r.vx * 1.2, r.y - r.vy * 1.2);
      }
      ctx.stroke();
    }

    // Player
    const p = state.player;
    if (p && (p.invuln === 0 || state.t % 6 < 3)) {
      drawPlayer(
        p.x - camX,
        p.y,
        p.facing,
        state.mission && state.mission.accent,
        Math.abs(p.vx) > 0.3 && p.onGround,
        p.stepPhase || 0
      );
    }

    // Lightning flash (Jonas) — painted ABOVE the world but below the HUD.
    if (state.lightningFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(state.lightningFlash / 10) * 0.55})`;
      ctx.fillRect(0, 0, W, H);
    }

    // HUD — Fornalha
    if (state.mission && state.mission.id === "fornalha" && !state.finishing) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(12, 12, 280, 26);
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "left";
      if (state.angelProtection) {
        ctx.fillStyle = "#ffe080";
        ctx.fillText("✦ Proteção do anjo ativa — o fogo não queima", 22, 29);
      } else {
        ctx.fillStyle = "#ffb080";
        ctx.fillText("Fogo adiante — encontre o quarto homem (Dn 3:25)", 22, 29);
      }
    }

    // Build marker (bottom-right, tiny) — confirms the browser loaded the latest.
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(W - 128, H - 18, 120, 14);
    ctx.fillStyle = "#8aff8a";
    ctx.font = "10px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`build: ${BUILD}`, W - 124, H - 7);

    // Debug — show enemy count + lion positions (temporarily, until lions work)
    if (state.mission && state.mission.id === "leoes") {
      const lions = state.enemies.filter((e) => e.type === "lion");
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(W - 260, 4, 252, 48);
      ctx.fillStyle = "#ffee50";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`enemies: ${state.enemies.length} · lions: ${lions.length}`, W - 254, 18);
      if (lions.length > 0) {
        const info = lions.slice(0, 5).map((l, i) =>
          `#${i} x=${Math.round(l.x)} y=${Math.round(l.y)} alive=${l.alive ? "Y" : "N"}`
        ).join(" | ");
        // Break into 2 lines
        ctx.fillStyle = "#eeeeee";
        ctx.font = "10px monospace";
        ctx.fillText(info.substring(0, 60), W - 254, 32);
        if (info.length > 60) ctx.fillText(info.substring(60, 120), W - 254, 44);
      } else {
        ctx.fillStyle = "#ff6060";
        ctx.fillText("NENHUM LEAO SPAWNOU — bug de parsing!", W - 254, 32);
      }
    }

    // HUD — Leões
    if (state.mission && state.mission.id === "leoes" && !state.finishing) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(12, 12, 300, 50);
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffe27a";
      ctx.fillText("[B] ajoelhar · [O] chamar o anjo", 22, 28);
      ctx.fillStyle = state.prayed ? "#9aee9a" : "rgba(200,200,200,0.65)";
      ctx.fillText(`Orou: ${state.prayed ? "✓" : "—"}`, 22, 48);
      ctx.fillStyle = state.angelSummoned ? "#9aee9a" : "rgba(200,200,200,0.65)";
      ctx.fillText(`Anjo: ${state.angelSummoned ? "✓" : "—"}`, 150, 48);
    }

    // Sling hint for David
    if (state.mission && state.mission.id === "davi" && !state.finishing) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(12, 12, 240, 34);
      ctx.fillStyle = "#ffe27a";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "left";
      if (state.hasSling) {
        ctx.fillText(`Pedras: ${state.slingStones}/5 · [X] atirar`, 22, 28);
        // pedras como bolinhas
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = i < state.slingStones ? "#e0e0e0" : "rgba(120,120,120,0.5)";
          ctx.beginPath();
          ctx.arc(22 + i * 11, 40, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (state.slingStones === 0) {
          ctx.fillStyle = "#ffb0b0";
          ctx.fillText("Volte a um riacho", 82, 42);
        }
      } else {
        ctx.fillText("Recolha a funda para vencer Golias", 22, 30);
      }
    }

    // HUD — Pedro sobre as águas
    if (state.mission && state.mission.id === "pedro" && !state.finishing) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(12, 12, 300, 50);
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffe27a";
      if (!state.faithActive) {
        ctx.fillText("Mar revolto — pegue o ícone da oração", 22, 28);
        ctx.fillStyle = "rgba(200,220,255,0.75)";
        ctx.fillText("Sair do barco antes da oração = afundar", 22, 48);
      } else {
        ctx.fillStyle = "#9aee9a";
        ctx.fillText("Fé sustenta o passo · vá até Jesus", 22, 28);
        // Fé restante — 3 pontos que apagam a cada rajada (Mt 14:30).
        const remaining = Math.max(0, 3 - (state.windHits || 0));
        ctx.fillStyle = "rgba(220,235,255,0.75)";
        ctx.fillText("Fé:", 22, 48);
        for (let i = 0; i < 3; i++) {
          const filled = i < remaining;
          ctx.fillStyle = filled ? "#ffe27a" : "rgba(120,120,120,0.45)";
          ctx.beginPath();
          ctx.arc(56 + i * 14, 44, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.fillStyle = state.jesus && state.jesus.met ? "#9aee9a" : "rgba(220,235,255,0.75)";
        ctx.fillText(state.jesus && state.jesus.met ? "Encontro ✓" : "Cuidado com as rajadas", 110, 48);
      }
    }

    // Finishing banner
    if (state.finishing) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 40, W, 56);
      ctx.fillStyle = "#ffe27a";
      ctx.font = "bold 28px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Missão cumprida!", W / 2, 78);
    }

    // Pause text
    if (state.paused && state.screen === "playing") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffe27a";
      ctx.font = "bold 34px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Pausa — P para continuar", W / 2, H / 2);
    }
  }

  function drawFlagDecorations(firstCol, lastCol, camX) {
    if (!state.mission) return;
    for (let x = Math.max(0, firstCol); x < Math.min(state.mapW, lastCol); x++) {
      let topY = -1;
      let bottomY = -1;
      for (let y = 0; y < state.mapH; y++) {
        if (state.tileMap[y][x] === "G") {
          if (topY === -1) topY = y;
          bottomY = y;
        }
      }
      if (topY === -1) continue;
      const sx = x * TILE - camX;
      const sy = topY * TILE;
      // Top ball
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      ctx.arc(sx + TILE / 2, sy - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      // Big flag
      const wave = Math.sin(state.t / 18) * 3;
      ctx.fillStyle = state.mission.accent;
      ctx.beginPath();
      ctx.moveTo(sx + TILE / 2, sy + 4);
      ctx.lineTo(sx + TILE / 2 + 34, sy + 8 + wave);
      ctx.lineTo(sx + TILE / 2 + 30, sy + 18);
      ctx.lineTo(sx + TILE / 2, sy + 22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(sx + TILE / 2, sy + 4, 3, 18);
      // Pedestal at base
      const baseY = (bottomY + 1) * TILE;
      ctx.fillStyle = "#4a4a55";
      ctx.fillRect(sx + TILE / 2 - 10, baseY - 6, 20, 6);
      ctx.fillStyle = "#22222a";
      ctx.fillRect(sx + TILE / 2 - 10, baseY - 2, 20, 2);
    }
  }

  function drawManna(x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    // glow
    ctx.fillStyle = "rgba(255,250,200,0.35)";
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(rot);
    ctx.fillStyle = "#fff5c0";
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = "#ffe27a";
    ctx.fillRect(-5, -5, 10, 2);
    ctx.fillStyle = "rgba(255,240,180,0.6)";
    ctx.fillRect(-8, -1, 16, 2);
    ctx.restore();
  }

  function drawFriendNPC(x, y, accentColor) {
    const bob = Math.sin((x + state.t) * 0.05) * 1;
    // corpo
    ctx.fillStyle = "#e8ecff";
    ctx.fillRect(x + 4, y + 10 - bob, 16, 18);
    // cabeça
    ctx.fillStyle = "#f5cfa0";
    ctx.fillRect(x + 6, y - bob, 12, 12);
    // turbante (cor do amigo)
    ctx.fillStyle = accentColor;
    ctx.fillRect(x + 4, y - 2 - bob, 16, 5);
    // faixa na cintura
    ctx.fillStyle = accentColor;
    ctx.fillRect(x + 4, y + 16 - bob, 16, 3);
    // pernas
    ctx.fillStyle = "#4a3a22";
    ctx.fillRect(x + 5, y + 24, 5, 4);
    ctx.fillRect(x + 14, y + 24, 5, 4);
    // olho
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + 13, y + 5 - bob, 2, 2);
    // pequena aura dourada (protegidos pela fé)
    if (state.angelProtection) {
      ctx.fillStyle = "rgba(255,220,100,0.22)";
      ctx.beginPath();
      ctx.arc(x + 12, y + 14, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawAngel(x, y, collected) {
    const bob = Math.sin(state.t / 14) * 3;
    const pulse = 0.55 + Math.sin(state.t / 7) * 0.25;
    const cx = x + 16;
    const cy = y + 14 + bob;
    // aura ampla
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 32);
    g.addColorStop(0, `rgba(255, 245, 180, ${pulse * 0.9})`);
    g.addColorStop(0.5, `rgba(255, 220, 120, ${pulse * 0.35})`);
    g.addColorStop(1, "rgba(255, 200, 100, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fill();
    // asas
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(x + 2, cy - 2, 8, 14, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 30, cy - 2, 8, 14, 0.35, 0, Math.PI * 2);
    ctx.fill();
    // detalhes douradas nas asas
    ctx.strokeStyle = "rgba(255,220,140,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 3, cy - 2);
    ctx.lineTo(x + 5, cy + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 35, cy - 2);
    ctx.lineTo(x + 27, cy + 10);
    ctx.stroke();
    // túnica
    ctx.fillStyle = "#f8f8ff";
    ctx.fillRect(x + 11, cy - 2, 10, 20);
    // cintura dourada
    ctx.fillStyle = "#ffe080";
    ctx.fillRect(x + 11, cy + 8, 10, 2);
    // cabeça
    ctx.fillStyle = "#fbefd8";
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    // halo
    ctx.strokeStyle = `rgba(255,215,90,${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 14, 7, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    // faíscas orbitando
    for (let i = 0; i < 5; i++) {
      const a = (state.t / 18 + i * 1.25) % (Math.PI * 2);
      const rx = cx + Math.cos(a) * 20;
      const ry = cy + Math.sin(a) * 14;
      ctx.fillStyle = `rgba(255, 245, 190, ${0.7 + Math.sin(state.t / 6 + i) * 0.3})`;
      ctx.fillRect(rx - 1, ry - 1, 2.5, 2.5);
    }
    // marca de "coletado" (mais intensa após ativação)
    if (collected) {
      ctx.fillStyle = "rgba(255,245,200,0.15)";
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPrayerIcon(x, y) {
    // Ícone de oração — mãos postas dentro de um nimbo dourado, flutuando.
    const bob = Math.sin(state.t / 16) * 2;
    const pulse = 0.5 + Math.sin(state.t / 9) * 0.25;
    const cx = x + 12;
    const cy = y + 13 + bob;
    // aura
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
    g.addColorStop(0, `rgba(255,240,170,${pulse * 0.85})`);
    g.addColorStop(0.6, `rgba(255,220,120,${pulse * 0.3})`);
    g.addColorStop(1, "rgba(255,200,100,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    // cartão de oração estilizado (similar à janela do Daniel)
    ctx.fillStyle = "#f0dca4";
    ctx.fillRect(x + 3, y + 3 + bob, 18, 22);
    ctx.fillStyle = "#a88a4a";
    ctx.fillRect(x + 3, y + 3 + bob, 18, 3);
    ctx.fillRect(x + 3, y + 22 + bob, 18, 3);
    // mãos postas (silhueta simples)
    ctx.fillStyle = "#e6c08a";
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy + 2, 2.2, 4, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy + 2, 2.2, 4, 0.25, 0, Math.PI * 2);
    ctx.fill();
    // brilho central
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.fillRect(cx - 1, cy - 4, 2, 4);
    // pequeno halo acima
    ctx.strokeStyle = `rgba(255,215,90,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 6, 4, 1.8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawJesus(x, y, met) {
    // Jesus sobre as águas — túnica branca, manto azul, halo, sem asas.
    const bob = Math.sin(state.t / 18) * 2;
    const pulse = 0.5 + Math.sin(state.t / 9) * 0.2;
    const cx = x + 14;
    const cy = y + 18 + bob;
    // reflexo na água
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, y + 34, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // aura suave
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 36);
    g.addColorStop(0, `rgba(255,250,210,${pulse * 0.55})`);
    g.addColorStop(0.6, `rgba(255,235,160,${pulse * 0.18})`);
    g.addColorStop(1, "rgba(255,200,100,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.fill();
    // túnica longa branca
    ctx.fillStyle = "#fafaff";
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 4);
    ctx.lineTo(cx + 8, cy - 4);
    ctx.lineTo(cx + 11, cy + 16);
    ctx.lineTo(cx - 11, cy + 16);
    ctx.closePath();
    ctx.fill();
    // sombras suaves nas dobras
    ctx.fillStyle = "rgba(180,190,210,0.35)";
    ctx.fillRect(cx - 1, cy - 4, 2, 20);
    // manto azul atravessado no peito
    ctx.fillStyle = "#3a5a9a";
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy - 1);
    ctx.lineTo(cx + 9, cy + 4);
    ctx.lineTo(cx + 8, cy + 8);
    ctx.lineTo(cx - 9, cy + 3);
    ctx.closePath();
    ctx.fill();
    // braço estendido (lado direito, em direção ao Pedro)
    ctx.fillStyle = "#fafaff";
    ctx.fillRect(cx + 4, cy + 1, 10, 4);
    ctx.fillStyle = "#e6c08a";
    ctx.fillRect(cx + 13, cy + 1, 3, 3);
    // cabeça
    ctx.fillStyle = "#e6c08a";
    ctx.beginPath();
    ctx.arc(cx, cy - 9, 5, 0, Math.PI * 2);
    ctx.fill();
    // cabelos
    ctx.fillStyle = "#5a3a1c";
    ctx.beginPath();
    ctx.arc(cx, cy - 11, 5.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 5, cy - 10, 2, 6);
    ctx.fillRect(cx + 3, cy - 10, 2, 6);
    // barba leve
    ctx.fillStyle = "#5a3a1c";
    ctx.fillRect(cx - 3, cy - 6, 6, 2);
    // halo dourado
    ctx.strokeStyle = `rgba(255,215,90,${pulse + 0.2})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 13, 7, 2.8, 0, 0, Math.PI * 2);
    ctx.stroke();
    // raios cruciformes no halo
    ctx.strokeStyle = `rgba(255,235,150,${pulse})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + state.t * 0.005;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 7, cy - 13 + Math.sin(a) * 2.8);
      ctx.lineTo(cx + Math.cos(a) * 11, cy - 13 + Math.sin(a) * 4);
      ctx.stroke();
    }
    // confirmação do encontro — brilho extra ao redor
    if (met) {
      ctx.fillStyle = "rgba(255,250,200,0.12)";
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWindGust(x, y, t) {
    // Rajada — várias linhas brancas onduladas com pontas mais transparentes.
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const sy = y + i * 2.4;
      const baseLen = 70 + Math.sin((t + i * 30) / 9) * 14;
      const wave = Math.sin((t + i * 12) / 6) * 1.6;
      const isCore = i === 2 || i === 3;
      ctx.strokeStyle = isCore
        ? `rgba(255,255,255,${0.85 + Math.sin(t / 5 + i) * 0.1})`
        : `rgba(220,235,255,${0.45 + Math.sin(t / 7 + i) * 0.1})`;
      ctx.lineWidth = isCore ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, sy + wave);
      for (let k = 4; k <= baseLen; k += 4) {
        const yy = sy + Math.sin((k + t) / 6) * 1.2 + wave;
        ctx.lineTo(x + k, yy);
      }
      ctx.stroke();
    }
    // gotículas / respingo na cabeça da rajada
    for (let i = 0; i < 4; i++) {
      const px = x + 2 + Math.sin(t / 6 + i) * 2;
      const py = y + 2 + i * 3 + Math.cos(t / 7 + i) * 1.5;
      ctx.fillStyle = `rgba(255,255,255,${0.55 + Math.sin(t / 5 + i) * 0.2})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBoatDecor(camX) {
    // Casco do barco dos discípulos — desenhado sobre o piso de '#' nos
    // tiles 0..11 (linhas 10..16). Apenas decorativo; a colisão usa os '#'.
    const baseX = -camX;
    const deckY = 10 * TILE;       // topo da linha 10 (deck)
    const hullEnd = 16 * TILE + TILE; // fundo da linha 16
    // proa curva à direita
    ctx.fillStyle = "#5a3a1c";
    ctx.beginPath();
    ctx.moveTo(baseX + 12 * TILE - 4, deckY);
    ctx.quadraticCurveTo(baseX + 12 * TILE + 18, deckY + (hullEnd - deckY) / 2,
                         baseX + 12 * TILE - 4, hullEnd);
    ctx.lineTo(baseX + 11 * TILE, hullEnd);
    ctx.lineTo(baseX + 11 * TILE, deckY);
    ctx.closePath();
    ctx.fill();
    // ranhuras horizontais nas tábuas (toda a extensão do casco)
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 1;
    for (let row = 0; row < 6; row++) {
      const yy = deckY + 4 + row * 12;
      ctx.beginPath();
      ctx.moveTo(baseX, yy);
      ctx.lineTo(baseX + 12 * TILE + 14, yy);
      ctx.stroke();
    }
    // borda superior (corrimão)
    ctx.fillStyle = "#7a4f28";
    ctx.fillRect(baseX, deckY - 4, 12 * TILE + 4, 4);
    ctx.fillStyle = "#c89a4a";
    ctx.fillRect(baseX, deckY - 4, 12 * TILE + 4, 1);
    // mastro
    const mastX = baseX + 5 * TILE + TILE / 2;
    const mastTop = 4 * TILE + 4;
    ctx.fillStyle = "#5a3a1c";
    ctx.fillRect(mastX - 2, mastTop, 4, deckY - mastTop + 2);
    // travessão
    ctx.fillStyle = "#3a2410";
    ctx.fillRect(mastX - 18, mastTop + 8, 36, 3);
    // vela retangular esticada (com leve ondulação)
    const sailSwing = Math.sin(state.t / 26) * 2;
    ctx.fillStyle = "#f5efd6";
    ctx.beginPath();
    ctx.moveTo(mastX - 18, mastTop + 11);
    ctx.lineTo(mastX + 18, mastTop + 11);
    ctx.lineTo(mastX + 22 + sailSwing, mastTop + 11 + 78);
    ctx.lineTo(mastX - 22 + sailSwing, mastTop + 11 + 78);
    ctx.closePath();
    ctx.fill();
    // dobras na vela
    ctx.strokeStyle = "rgba(180,160,110,0.55)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const fx = mastX - 12 + i * 8;
      ctx.beginPath();
      ctx.moveTo(fx, mastTop + 12);
      ctx.lineTo(fx + sailSwing, mastTop + 88);
      ctx.stroke();
    }
    // ponta do mastro
    ctx.fillStyle = "#c89a4a";
    ctx.beginPath();
    ctx.arc(mastX, mastTop, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRiacho(r, camX) {
    const x = r.x - camX;
    const y = r.y;
    const w = r.w;
    const h = r.h;
    const t = state.t;

    // margens em areia mais escura, dando contexto de vale
    ctx.fillStyle = "#7a6a4a";
    ctx.fillRect(x - 4, y + h - 3, w + 8, 4);

    // camada profunda do rio (azul escuro) com bordas onduladas
    ctx.fillStyle = "#164a8a";
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    for (let sx = 0; sx <= w; sx += 4) {
      ctx.lineTo(x + sx, y + 2 + Math.sin((sx + t * 1.5) * 0.14) * 2);
    }
    for (let sx = w; sx >= 0; sx -= 4) {
      ctx.lineTo(x + sx, y + h - 3 + Math.sin((sx + t * 2) * 0.12) * 1.5);
    }
    ctx.closePath();
    ctx.fill();

    // camada média (azul vibrante)
    ctx.fillStyle = "#3284c8";
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 4);
    for (let sx = 2; sx <= w - 2; sx += 4) {
      ctx.lineTo(x + sx, y + 4 + Math.sin((sx + t * 2.2) * 0.16) * 1.6);
    }
    for (let sx = w - 2; sx >= 2; sx -= 4) {
      ctx.lineTo(x + sx, y + h - 5 + Math.sin((sx + t * 2.5) * 0.14) * 1.1);
    }
    ctx.closePath();
    ctx.fill();

    // shimmer correndo pela superfície
    ctx.fillStyle = "rgba(220, 240, 255, 0.75)";
    for (let i = 0; i < 6; i++) {
      const sx = ((i * 18 + t * 1.4) % w);
      const sy = y + h / 2 + Math.sin((sx + t * 1.5) * 0.2) * 1.8;
      ctx.fillRect(x + sx, sy, 5, 1.3);
    }
    // reflexo superior fininho
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let sx = 0; sx <= w; sx += 6) {
      ctx.fillRect(x + sx, y + 3 + Math.sin((sx + t * 3) * 0.18) * 1, 4, 0.8);
    }
  }

  function drawPebble(x, y) {
    const bob = Math.sin((x + state.t) * 0.08) * 0.8;
    // sombra na água
    ctx.fillStyle = "rgba(0,20,40,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // corpo da pedra
    ctx.fillStyle = "#7a8a9a";
    ctx.beginPath();
    ctx.arc(x, y + bob, 4, 0, Math.PI * 2);
    ctx.fill();
    // tom médio
    ctx.fillStyle = "#aab0ba";
    ctx.beginPath();
    ctx.arc(x - 0.8, y - 0.8 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // brilho de destaque
    ctx.fillStyle = "#e8eff2";
    ctx.beginPath();
    ctx.arc(x - 1.4, y - 1.4 + bob, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSlingPickup(x, y) {
    const bob = Math.sin(state.t / 14) * 2;
    // glow halo
    ctx.fillStyle = "rgba(255,226,122,0.28)";
    ctx.beginPath();
    ctx.arc(x + 11, y + 11 + bob, 16, 0, Math.PI * 2);
    ctx.fill();
    // leather strap
    ctx.strokeStyle = "#6b3a1c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 4 + bob);
    ctx.quadraticCurveTo(x + 11, y + 20 + bob, x + 20, y + 4 + bob);
    ctx.stroke();
    // pouch (stone cradle)
    ctx.fillStyle = "#4a3a22";
    ctx.beginPath();
    ctx.ellipse(x + 11, y + 18 + bob, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // stone resting in pouch
    ctx.fillStyle = "#bbb";
    ctx.beginPath();
    ctx.arc(x + 11, y + 17 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8e8e8";
    ctx.beginPath();
    ctx.arc(x + 10, y + 16 + bob, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawProjectile(x, y) {
    // main stone
    ctx.fillStyle = "#9a9a9a";
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    // highlight
    ctx.fillStyle = "#d0d0d0";
    ctx.beginPath(); ctx.arc(x - 1.2, y - 1.2, 1.6, 0, Math.PI * 2); ctx.fill();
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.arc(x + 1.2, y + 1.2, 1, 0, Math.PI * 2); ctx.fill();
  }

  // --- Drawing primitives ----------------------------------------------------
  function drawTile(t, x, y) {
    if (t === "#") {
      ctx.fillStyle = state.mission.groundColor;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x, y + TILE - 4, TILE, 4);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    } else if (t === "=") {
      ctx.fillStyle = "#5a3d1e";
      ctx.fillRect(x, y + 6, TILE, TILE - 12);
      ctx.fillStyle = "#3b2510";
      ctx.fillRect(x, y + TILE - 10, TILE, 4);
    } else if (t === "G") {
      // Flag-pole segment — the top decoration is drawn after the tile pass.
      ctx.fillStyle = "#e8e8e8";
      ctx.fillRect(x + TILE / 2 - 2, y, 4, TILE);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x + TILE / 2 + 2, y, 1, TILE);
    } else if (t === "^") {
      if (state.mission && state.mission.id === "fornalha") {
        // Chamas vivas — tremulam com o tempo.
        const flick = Math.sin(state.t * 0.3 + x * 0.05) * 2;
        ctx.fillStyle = "#ff5020";
        ctx.beginPath();
        ctx.moveTo(x, y + TILE);
        ctx.lineTo(x + TILE / 2, y + 2 + flick);
        ctx.lineTo(x + TILE, y + TILE);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffa040";
        ctx.beginPath();
        ctx.moveTo(x + 4, y + TILE);
        ctx.lineTo(x + TILE / 2, y + 10 + flick);
        ctx.lineTo(x + TILE - 4, y + TILE);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath();
        ctx.moveTo(x + 10, y + TILE);
        ctx.lineTo(x + TILE / 2, y + 18 + flick);
        ctx.lineTo(x + TILE - 10, y + TILE);
        ctx.closePath();
        ctx.fill();
        // brasa na base
        ctx.fillStyle = "rgba(255,100,30,0.35)";
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
      } else {
        ctx.fillStyle = "#777";
        ctx.beginPath();
        ctx.moveTo(x, y + TILE);
        ctx.lineTo(x + TILE / 2, y + 8);
        ctx.lineTo(x + TILE, y + TILE);
        ctx.closePath();
        ctx.fill();
      }
    } else if (t === "W") {
      // Janela aberta para Jerusalém (Dn 6:10) — moldura + vista da cidade.
      ctx.fillStyle = "#6a4a2a";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#d0b078";
      ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      // céu
      ctx.fillStyle = "#a8d0e8";
      ctx.fillRect(x + 3, y + 3, TILE - 6, (TILE - 6) * 0.55);
      // silhueta de Jerusalém
      ctx.fillStyle = "#6a5a4a";
      ctx.fillRect(x + 7,  y + 14, 2, 6);
      ctx.fillRect(x + 11, y + 11, 2, 9);
      ctx.fillRect(x + 15, y + 13, 3, 7);
      ctx.fillRect(x + 20, y + 12, 2, 8);
      ctx.fillRect(x + 24, y + 15, 2, 5);
      // cruzetas da janela
      ctx.fillStyle = "#3a2a18";
      ctx.fillRect(x, y + TILE / 2 - 1, TILE, 2);
      ctx.fillRect(x + TILE / 2 - 1, y, 2, TILE);
      // brilho suave (oração)
      if (state.mission && state.mission.id === "leoes" && !state.prayed) {
        const pulse = 0.4 + Math.sin(state.t / 8) * 0.15;
        ctx.fillStyle = `rgba(255, 220, 120, ${pulse})`;
        ctx.fillRect(x, y, TILE, 2);
      }
    } else if (t === "~") {
      const isPedro = state.mission && state.mission.id === "pedro";
      if (isPedro && state.faithActive) {
        // Mar acalmado pela fé — superfície quase espelhada (Mt 14:32).
        ctx.fillStyle = "#1f5fa8";
        ctx.fillRect(x, y, TILE, TILE);
        const ripple = Math.sin(state.t / 30 + x / 40) * 0.6;
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(x, y + ripple, TILE, 2);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x + 4, y + 10, TILE - 8, 1);
        ctx.fillRect(x + 8, y + 18, TILE - 16, 1);
      } else if (isPedro) {
        // Mar revolto — ondas altas com cristas brancas (Mt 14:24).
        const shift = Math.sin(state.t / 9 + x / 22) * 5;
        const foam = Math.cos(state.t / 7 + x / 18) * 2;
        ctx.fillStyle = "#0e2a55";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "#1a4a90";
        ctx.beginPath();
        ctx.moveTo(x, y + 6 + shift);
        ctx.quadraticCurveTo(x + TILE / 2, y - 1 + shift + foam, x + TILE, y + 6 + shift);
        ctx.lineTo(x + TILE, y + TILE);
        ctx.lineTo(x, y + TILE);
        ctx.closePath();
        ctx.fill();
        // crista de espuma
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(x, y + 5 + shift, TILE / 2, 1.5);
        ctx.fillRect(x + TILE / 2, y + 7 + shift + foam, TILE / 2, 1.5);
        // gotículas
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.arc(x + 6, y + 3 + shift, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 22, y + 4 + shift + foam, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const shift = Math.sin(state.t / 20 + x / 30) * 2;
        ctx.fillStyle = "#1f4f8a";
        ctx.fillRect(x, y + shift, TILE, TILE);
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(x, y + shift, TILE, 2);
      }
    }
  }

  function drawPlayer(x, y, facing, accent, walking, step) {
    // Glow do anjo — Fornalha (proteção do fogo) ou Leões (depois do anjo)
    const fornalhaGlow = state.angelProtection && state.mission && state.mission.id === "fornalha";
    const leoesGlow = state.angelSummoned && state.mission && state.mission.id === "leoes";
    if (fornalhaGlow || leoesGlow) {
      const pulse = 0.28 + Math.sin(state.t / 8) * 0.12;
      const color = fornalhaGlow ? `rgba(255, 220, 100, ${pulse})` : `rgba(210, 230, 255, ${pulse})`;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 12, y + 14, 22, 0, Math.PI * 2);
      ctx.fill();
      // raios
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + state.t * 0.02;
        ctx.beginPath();
        ctx.moveTo(x + 12 + Math.cos(a) * 18, y + 14 + Math.sin(a) * 18);
        ctx.lineTo(x + 12 + Math.cos(a) * 24, y + 14 + Math.sin(a) * 24);
        ctx.stroke();
      }
    }
    // body bob when walking
    const bob = walking ? Math.abs(Math.sin(step * 0.5)) * 1 : 0;
    // body
    ctx.fillStyle = "#d9e3ff";
    ctx.fillRect(x + 4, y + 10 - bob, 16, 18);
    // head
    ctx.fillStyle = "#f5cfa0";
    ctx.fillRect(x + 6, y - bob, 12, 12);
    // hair/turban
    ctx.fillStyle = accent || "#ffe27a";
    ctx.fillRect(x + 4, y - 2 - bob, 16, 5);
    // sash
    ctx.fillStyle = accent || "#ffe27a";
    ctx.fillRect(x + 4, y + 16 - bob, 16, 3);
    // legs — alternate up/down while walking
    ctx.fillStyle = "#4a3a22";
    const leftLift  = walking ? Math.max(0,  Math.sin(step)) * 3 : 0;
    const rightLift = walking ? Math.max(0, -Math.sin(step)) * 3 : 0;
    ctx.fillRect(x + 5,  y + 24 - leftLift,  5, 4 + leftLift);
    ctx.fillRect(x + 14, y + 24 - rightLift, 5, 4 + rightLift);
    // eye
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + (facing > 0 ? 13 : 8), y + 5 - bob, 2, 2);
  }

  function drawPlatform(plat, camX) {
    const x = plat.x - camX;
    const y = plat.y;
    const w = plat.w;
    const h = plat.h;
    if (plat.theme === "whale") {
      // Big fish — body, belly, eye, tail, spout
      ctx.fillStyle = "#3a4a6a";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // belly
      ctx.fillStyle = "#c9d3ff";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h * 0.75, w / 2.4, h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // tail
      ctx.fillStyle = "#3a4a6a";
      ctx.beginPath();
      ctx.moveTo(x - 2, y + h / 2);
      ctx.lineTo(x - 14, y);
      ctx.lineTo(x - 14, y + h);
      ctx.closePath();
      ctx.fill();
      // eye
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(x + w - 16, y + 8, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath(); ctx.arc(x + w - 15, y + 8, 1.5, 0, Math.PI * 2); ctx.fill();
      // spout (animated puff)
      const puff = Math.abs(Math.sin(state.t / 30));
      ctx.fillStyle = `rgba(255,255,255,${0.5 * puff})`;
      ctx.beginPath();
      ctx.arc(x + w - 28, y - 6 - puff * 6, 4 + puff * 3, 0, Math.PI * 2);
      ctx.fill();
      // top walkable strip
      ctx.fillStyle = "rgba(255,226,122,0.25)";
      ctx.fillRect(x + 8, y, w - 16, 3);
    } else if (plat.theme === "cloud") {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(x + 12, y + h / 2, h / 1.4, 0, Math.PI * 2);
      ctx.arc(x + w / 2, y + h / 2 - 4, h / 1.1, 0, Math.PI * 2);
      ctx.arc(x + w - 12, y + h / 2, h / 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(180,200,230,0.7)";
      ctx.fillRect(x + 8, y + h - 4, w - 16, 3);
    } else if (plat.theme === "boulder") {
      ctx.fillStyle = "#6a6a6a";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, h / 2 + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a4a4a";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x + 6 + i * (w / 5), y + h / 2 + (i % 2 ? -2 : 2), 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (plat.theme === "ship") {
      // hull
      ctx.fillStyle = "#6b3a1c";
      ctx.beginPath();
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x + w, y + 4);
      ctx.lineTo(x + w - 10, y + h);
      ctx.lineTo(x + 10, y + h);
      ctx.closePath();
      ctx.fill();
      // deck stripe
      ctx.fillStyle = "#a86a3a";
      ctx.fillRect(x + 4, y, w - 8, 5);
      // mast
      ctx.fillStyle = "#3a2510";
      ctx.fillRect(x + w / 2 - 1, y - 22, 2, 22);
      // sail
      ctx.fillStyle = "#f0e6c8";
      ctx.beginPath();
      ctx.moveTo(x + w / 2 + 1, y - 20);
      ctx.lineTo(x + w / 2 + 18, y - 6);
      ctx.lineTo(x + w / 2 + 1, y - 4);
      ctx.closePath();
      ctx.fill();
    } else {
      // plain wooden platform fallback
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#5a3d1e";
      ctx.fillRect(x, y + h - 4, w, 4);
    }
  }

  function drawEnemy(x, y, dir, type, passive) {
    if (type === "lion") {
      if (passive || state.angelSummoned) {
        // LEÃO PACIFICADO — boca fechada, deitado, dormindo (Dn 6:22).
        ctx.fillStyle = "#b87028";
        ctx.fillRect(x + 2, y + 18, 28, 10);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x + 2, y + 26, 28, 2);
        // juba ao redor da cabeça
        ctx.fillStyle = "#5a2a08";
        ctx.beginPath();
        ctx.arc(x + 8, y + 18, 10, 0, Math.PI * 2);
        ctx.fill();
        // cabeça
        ctx.fillStyle = "#d09858";
        ctx.beginPath();
        ctx.arc(x + 8, y + 20, 6, 0, Math.PI * 2);
        ctx.fill();
        // olho fechado (curvinha)
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + 7, y + 19, 2, 0, Math.PI);
        ctx.stroke();
        // boca fechada (sorriso pacífico)
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 23);
        ctx.lineTo(x + 10, y + 24);
        ctx.stroke();
        // Zzz
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "italic bold 10px serif";
        ctx.fillText("z", x + 18 + Math.sin(state.t / 20) * 1, y + 12);
        ctx.fillText("z", x + 24, y + 6);
        // cauda em repouso
        ctx.fillStyle = "#b87028";
        ctx.fillRect(x + 28, y + 22, 3, 2);
        return;
      }
      // LEÃO ATIVO — boca bem aberta com presas, feroz (Dn 6:17-18).
      // corpo grande
      ctx.fillStyle = "#d08840";
      ctx.fillRect(x + 2, y + 10, 28, 20);
      ctx.fillStyle = "#a06018";
      ctx.fillRect(x + 2, y + 25, 28, 5);
      // patas
      ctx.fillStyle = "#7a4010";
      ctx.fillRect(x + 4, y + 27, 5, 3);
      ctx.fillRect(x + 24, y + 27, 5, 3);
      // cauda com tufo (direita)
      ctx.fillStyle = "#d08840";
      ctx.fillRect(x + 30, y + 14, 2, 12);
      ctx.fillStyle = "#5a2a0a";
      ctx.beginPath();
      ctx.arc(x + 31, y + 26, 3, 0, Math.PI * 2);
      ctx.fill();
      // juba grande na face (esquerda)
      ctx.fillStyle = "#4a1a00";
      ctx.beginPath();
      ctx.arc(x + 10, y + 14, 12, 0, Math.PI * 2);
      ctx.fill();
      // picos da juba ao redor
      ctx.strokeStyle = "#3a1200";
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.2;
        const sx1 = x + 10 + Math.cos(a) * 11;
        const sy1 = y + 14 + Math.sin(a) * 11;
        const sx2 = x + 10 + Math.cos(a) * 15;
        const sy2 = y + 14 + Math.sin(a) * 15;
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }
      // face
      ctx.fillStyle = "#e8b060";
      ctx.beginPath();
      ctx.arc(x + 9, y + 15, 7, 0, Math.PI * 2);
      ctx.fill();
      // orelhas pontudas
      ctx.fillStyle = "#4a1a00";
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 6);
      ctx.lineTo(x + 6, y + 12);
      ctx.lineTo(x + 8, y + 7);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 11, y + 7);
      ctx.lineTo(x + 13, y + 12);
      ctx.lineTo(x + 16, y + 6);
      ctx.closePath();
      ctx.fill();
      // olhos amarelo ardente
      ctx.fillStyle = "#ffee50";
      ctx.fillRect(x + 5, y + 12, 3, 2);
      ctx.fillRect(x + 11, y + 12, 3, 2);
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 6, y + 12, 1, 2);
      ctx.fillRect(x + 12, y + 12, 1, 2);
      // sobrancelhas feroces
      ctx.strokeStyle = "#2a0a00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 10);
      ctx.lineTo(x + 9, y + 11);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 11);
      ctx.lineTo(x + 15, y + 10);
      ctx.stroke();
      // BOCA BEM ABERTA — buraco escuro com dentes brancos
      const roar = 1 + Math.sin(state.t * 0.18) * 0.5;
      ctx.fillStyle = "#1a0000";
      ctx.beginPath();
      ctx.ellipse(x + 9, y + 20, 5, 3 + roar, 0, 0, Math.PI * 2);
      ctx.fill();
      // presas superiores (grandes triangulos brancos)
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 18);
      ctx.lineTo(x + 6, y + 22 + roar);
      ctx.lineTo(x + 7, y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 11, y + 18);
      ctx.lineTo(x + 12, y + 22 + roar);
      ctx.lineTo(x + 13, y + 18);
      ctx.closePath();
      ctx.fill();
      // dentes inferiores
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 22 + roar);
      ctx.lineTo(x + 8, y + 19);
      ctx.lineTo(x + 9, y + 22 + roar);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 9, y + 22 + roar);
      ctx.lineTo(x + 10, y + 19);
      ctx.lineTo(x + 11, y + 22 + roar);
      ctx.closePath();
      ctx.fill();
      // língua
      ctx.fillStyle = "#c04040";
      ctx.fillRect(x + 7, y + 21 + roar * 0.6, 4, 1);
      return;
    }
    if (type === "bear") {
      // URSO — recordação pastoril (1 Sm 17:34-37). Marrom escuro, robusto,
      // orelhas redondas, focinho proeminente, garras claras.
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x + 2, y + 26, 28, 2);
      // corpo robusto
      ctx.fillStyle = "#5a3a1c";
      ctx.fillRect(x + 6, y + 12, 24, 14);
      // hump nas costas (típico do urso pardo)
      ctx.fillStyle = "#4a2e14";
      ctx.beginPath();
      ctx.arc(x + 22, y + 12, 6, Math.PI, Math.PI * 2);
      ctx.fill();
      // textura do pelo
      ctx.fillStyle = "#42280f";
      ctx.fillRect(x + 8, y + 21, 20, 2);
      // patas com garras
      ctx.fillStyle = "#3a2410";
      ctx.fillRect(x + 7, y + 24, 6, 4);
      ctx.fillRect(x + 23, y + 24, 6, 4);
      ctx.fillStyle = "#f0e0c0";
      ctx.fillRect(x + 7, y + 27, 1, 1);
      ctx.fillRect(x + 9, y + 27, 1, 1);
      ctx.fillRect(x + 11, y + 27, 1, 1);
      ctx.fillRect(x + 23, y + 27, 1, 1);
      ctx.fillRect(x + 25, y + 27, 1, 1);
      ctx.fillRect(x + 27, y + 27, 1, 1);
      // cauda curta
      ctx.fillStyle = "#3a2410";
      ctx.fillRect(x + 28, y + 18, 2, 3);
      // cabeça
      ctx.fillStyle = "#5a3a1c";
      ctx.beginPath();
      ctx.arc(x + 8, y + 14, 7, 0, Math.PI * 2);
      ctx.fill();
      // orelhas redondas
      ctx.fillStyle = "#4a2e14";
      ctx.beginPath();
      ctx.arc(x + 4, y + 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 12, y + 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // interior das orelhas
      ctx.fillStyle = "#7a5028";
      ctx.beginPath();
      ctx.arc(x + 4, y + 8, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 12, y + 8, 1, 0, Math.PI * 2);
      ctx.fill();
      // focinho claro
      ctx.fillStyle = "#a07a4a";
      ctx.beginPath();
      ctx.ellipse(x + 3, y + 16, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // nariz preto
      ctx.fillStyle = "#0a0500";
      ctx.beginPath();
      ctx.arc(x + 1, y + 15, 1.6, 0, Math.PI * 2);
      ctx.fill();
      // olhos
      ctx.fillStyle = "#0a0500";
      ctx.fillRect(x + 6, y + 11, 2, 2);
      ctx.fillRect(x + 11, y + 11, 2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 6, y + 11, 1, 1);
      ctx.fillRect(x + 11, y + 11, 1, 1);
      // boca aberta com presas
      ctx.fillStyle = "#1a0500";
      ctx.fillRect(x + 4, y + 18, 5, 2);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 18);
      ctx.lineTo(x + 5.5, y + 20);
      ctx.lineTo(x + 6, y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 18);
      ctx.lineTo(x + 7.5, y + 20);
      ctx.lineTo(x + 8, y + 18);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (type === "chariot") {
      // corpo do carro
      ctx.fillStyle = "#7a4f28";
      ctx.fillRect(x + 2, y + 10, 24, 10);
      ctx.fillStyle = "#5a3518";
      ctx.fillRect(x + 2, y + 18, 24, 2);
      // bordas douradas
      ctx.fillStyle = "#c89a4a";
      ctx.fillRect(x + 2, y + 10, 24, 2);
      // piloto (cabeça com capuz)
      ctx.fillStyle = "#e0b080";
      ctx.fillRect(x + 10, y, 8, 8);
      ctx.fillStyle = "#2a3a6a";
      ctx.fillRect(x + 9, y - 2, 10, 4);
      // chicote
      ctx.strokeStyle = "#3a2a1a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + (dir > 0 ? 18 : 8), y + 4);
      ctx.lineTo(x + (dir > 0 ? 26 : 0), y + (Math.sin(state.t * 0.3) * 2));
      ctx.stroke();
      // rodas com raios animados
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath(); ctx.arc(x + 7, y + 23, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 21, y + 23, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#c89a4a";
      ctx.lineWidth = 1;
      for (let w = 0; w < 2; w++) {
        const cx = x + (w === 0 ? 7 : 21);
        const cy = y + 23;
        for (let a = 0; a < 4; a++) {
          const ang = a * Math.PI / 2 + state.t * (dir > 0 ? -0.35 : 0.35);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang) * 4, cy + Math.sin(ang) * 4);
          ctx.stroke();
        }
      }
      return;
    }
    if (type === "shield") {
      // Filisteu com escudo — túnica escura, capacete com pluma, escudo grande.
      ctx.fillStyle = "#4a4a2a";
      ctx.fillRect(x + 4, y + 10, 20, 18);
      ctx.fillStyle = "#2a2a14";
      ctx.fillRect(x + 4, y + 24, 20, 4);
      // skin head
      ctx.fillStyle = "#e0b080";
      ctx.fillRect(x + 8, y + 4, 12, 8);
      // bronze helmet + red plume
      ctx.fillStyle = "#9a6a2a";
      ctx.fillRect(x + 7, y, 14, 6);
      ctx.fillStyle = "#c93a3a";
      ctx.fillRect(x + 12, y - 4, 4, 5);
      // shield on the facing side
      ctx.fillStyle = "#8a6a3c";
      const shx = dir > 0 ? x + 22 : x - 6;
      ctx.fillRect(shx, y + 6, 6, 20);
      ctx.fillStyle = "#c28a4a";
      ctx.fillRect(shx + 1, y + 8, 4, 2);
      ctx.fillStyle = "#5a3d1e";
      ctx.fillRect(shx, y + 24, 6, 2);
      // eye
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(x + (dir > 0 ? 16 : 10), y + 6, 2, 2);
      return;
    }
    // default spiky hazard-crab-ish
    ctx.fillStyle = "#8b3a3a";
    ctx.fillRect(x + 2, y + 6, 20, 14);
    ctx.fillStyle = "#5a2020";
    ctx.fillRect(x + 2, y + 18, 20, 2);
    ctx.fillStyle = "#3a1414";
    for (let i = 0; i < 5; i++) {
      const sx = x + 2 + i * 4;
      ctx.beginPath();
      ctx.moveTo(sx, y + 6);
      ctx.lineTo(sx + 2, y + 1);
      ctx.lineTo(sx + 4, y + 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#ffe27a";
    ctx.fillRect(x + (dir > 0 ? 14 : 6), y + 10, 2, 2);
  }

  function drawQuail(x, y, flap, dir) {
    const wing = Math.sin(flap) * 4;
    // body
    ctx.fillStyle = "#8a5a2a";
    ctx.fillRect(x - 6, y - 4, 12, 8);
    // head
    ctx.fillStyle = "#a06a3a";
    ctx.fillRect(x + (dir > 0 ? 4 : -8), y - 6, 5, 5);
    // beak
    ctx.fillStyle = "#f0c060";
    ctx.fillRect(x + (dir > 0 ? 9 : -10), y - 4, 2, 2);
    // wings flapping
    ctx.fillStyle = "#4a2a1a";
    ctx.fillRect(x - 5, y - 4 - wing, 10, 3);
    ctx.fillStyle = "rgba(160,110,70,0.8)";
    ctx.fillRect(x - 5, y + 4, 10, 2);
  }

  function drawCalf(x, y, hp, flash) {
    // Pedestal
    ctx.fillStyle = "#6a5a3a";
    ctx.fillRect(x - 2, y + 54, 52, 10);
    ctx.fillStyle = "#4a3a1c";
    ctx.fillRect(x - 2, y + 62, 52, 2);
    // Body — golden, bovine
    ctx.fillStyle = flash ? "#fff1a8" : "#e0b030";
    ctx.fillRect(x + 4, y + 24, 40, 30);
    // Highlight
    ctx.fillStyle = flash ? "#fffbe0" : "#f5d060";
    ctx.fillRect(x + 6, y + 26, 36, 4);
    // Legs
    ctx.fillStyle = flash ? "#fff1a8" : "#c08828";
    ctx.fillRect(x + 6,  y + 52, 6, 6);
    ctx.fillRect(x + 36, y + 52, 6, 6);
    // Head
    ctx.fillStyle = flash ? "#fff1a8" : "#e0b030";
    ctx.fillRect(x + 28, y + 8, 20, 22);
    // Snout
    ctx.fillStyle = "#b08020";
    ctx.fillRect(x + 40, y + 18, 8, 8);
    // Eye
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + 38, y + 14, 2, 2);
    // Horns
    ctx.fillStyle = "#f5f0cc";
    ctx.fillRect(x + 28, y + 4, 3, 6);
    ctx.fillRect(x + 45, y + 4, 3, 6);
    // Tail
    ctx.fillStyle = "#c08828";
    ctx.fillRect(x, y + 30, 5, 3);
    ctx.fillRect(x - 3, y + 33, 3, 4);
    // HP bar
    ctx.fillStyle = "#000";
    ctx.fillRect(x, y - 14, 48, 6);
    ctx.fillStyle = "#ffe27a";
    ctx.fillRect(x + 1, y - 13, (46 * Math.max(0, hp)) / 3, 4);
  }

  function drawGiant(x, y, hp, flash) {
    ctx.fillStyle = flash ? "#ffd5d5" : "#4a5a2a";
    ctx.fillRect(x + 4, y + 16, 40, 42);
    ctx.fillStyle = flash ? "#ffe0cc" : "#d4a373";
    ctx.fillRect(x + 12, y, 24, 22);
    // helmet
    ctx.fillStyle = "#7a7a7a";
    ctx.fillRect(x + 10, y - 4, 28, 8);
    // eye
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + 22, y + 8, 4, 3);
    // hp bar
    ctx.fillStyle = "#000";
    ctx.fillRect(x, y - 14, 48, 6);
    ctx.fillStyle = "#ff5a5a";
    ctx.fillRect(x + 1, y - 13, (46 * hp) / 3, 4);
  }

  function drawScroll(x, y) {
    ctx.fillStyle = "#f0dca4";
    ctx.fillRect(x, y, 18, 22);
    ctx.fillStyle = "#a88a4a";
    ctx.fillRect(x, y, 18, 3);
    ctx.fillRect(x, y + 19, 18, 3);
    ctx.fillStyle = "#5a3d1e";
    ctx.fillRect(x + 3, y + 7, 12, 1);
    ctx.fillRect(x + 3, y + 11, 12, 1);
    ctx.fillRect(x + 3, y + 15, 8, 1);
    // glow
    ctx.strokeStyle = "rgba(255,226,122,0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 2, y - 2, 22, 26);
  }

  // --- Loop ------------------------------------------------------------------
  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  renderMenu();
  updateHud();
  loop();
})();
