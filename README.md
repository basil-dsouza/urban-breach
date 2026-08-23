# 🏙️ Urban Breach — Tactical 3D FPS

[![Three.js](https://img.shields.io/badge/Three.js-0.179.1-black?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-Passing-729B1B?logo=vitest)](https://vitest.dev/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?logo=github)](https://pages.github.com/)

A fast-paced, procedural **3D Tactical First-Person Shooter** built with **Three.js** and **Vite**. Survive endless escalating waves of hostile operatives, combat technicals, and lethal urban encounters across a massive city grid.

---

## 🎮 Key Features

* **Procedural Urban Warzone**: High-rises, residential houses with slanted roofs, rooftop terraces, solid chimneys, water towers, and climbable ladders.
* **Realistic Weapon Handling**:
  * Precision ADS (Aim-Down-Sights) with laser pinpoint accuracy and holographic reticle.
  * Hip-fire recoil bloom and dynamic spread system.
  * 30-round magazine with mechanical reload animations and sound effects.
* **Tactical Grenade System**:
  * Physics-based parabolic arcs with ground bouncing and self-damage blast radius.
  * Automatic grenade replenishment (1 grenade every 5 seconds, capped at 5).
* **Lifelike Humanoid Enemies**:
  * Realistic facial anatomy (eyes, irises, pupils, nose bridge, nostrils, lips, chin, comms headsets).
  * Authentic two-handed rifle combat grip and walking cycles.
  * Multiple archetypes: Tactical Shooters and Knife Rushers.
* **Hostile Combat Vehicles**:
  * Armored technicals with active pursuit AI, high-speed ramming surges ($32\text{m/s}$), and obstacle auto-reverse recovery.
* **Heading-Up Tactical Radar**:
  * Forward-oriented compass radar displaying enemies, vehicles, ladders, and building boundaries relative to the player's facing angle.
* **Foliage Bush Stealth**:
  * Camouflage inside leafy bushes to drop enemy visual detection range from $75\text{m}$ down to $5\text{m}$.
* **Realistic Movement & Physics**:
  * Ladder climbing with rooftop step-off and ground dismount.
  * Fall damage with hurt audio and visual feedback.

---

## 🕹️ Controls

| Key / Input | Action |
| :--- | :--- |
| **`W` `A` `S` `D`** | Move / Climb Ladders |
| **`Shift`** | Sprint |
| **`Space`** | Jump / Ascend Ladders |
| **`LMB` (Hold)** | Full-Auto Weapon Fire |
| **`RMB` (Hold)** | Aim Down Sights (ADS Precision Zoom) |
| **`R`** | Manual Reload (30-round mag) |
| **`G`** | Throw Explosive Grenade |
| **`Mouse`** | Aim & Turn Camera |

---

## 🚀 Getting Started & Local Development

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* `npm` (bundled with Node.js)

### Installation & Launch

```bash
# 1. Clone the repository (or extract files)
git clone https://github.com/<your-username>/urban-breach.git
cd urban-breach

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open `http://localhost:5173` in your web browser.

---

## 🧪 Testing & Validation

Run the automated test suite with Vitest:

```bash
# Run unit tests
npm test

# Run Python validation suite
python tests/validate.py
```

---

## 🌐 Hosting on GitHub Pages

This repository is pre-configured with **GitHub Actions** for 1-click automatic static deployment to **GitHub Pages**.

### How to Enable GitHub Pages:
1. Push this repository to GitHub.
2. Go to your repository on GitHub and click **Settings**.
3. In the left sidebar, click **Pages**.
4. Under **Build and deployment** > **Source**, select **GitHub Actions**.
5. Push a commit to `main` (or run the workflow manually under the **Actions** tab).
6. Your live game will be instantly available at:  
   `https://<your-username>.github.io/<repo-name>/`

---

## 📁 Project Architecture

```
urban-breach/
├── .github/
│   └── workflows/
│       └── deploy.yml        # Automatic GitHub Pages CI/CD workflow
├── src/
│   ├── audio.js              # Synthesized Web Audio sound effects & combat SFX
│   ├── difficulty.js         # Difficulty tiers (Easy, Medium, Hard, Veteran)
│   ├── enemies.js            # Humanoid enemy modeling, faces, 2-handed grip, AI
│   ├── grenades.js           # Parabolic grenade ballistics & replenishment
│   ├── radar.js              # Heading-up forward-oriented tactical radar
│   ├── spread.js             # Recoil bloom, ADS accuracy, and spread system
│   ├── ui.js                 # Title screen, HUD, difficulty selector, game over
│   └── vehicles.js           # Hostile vehicle pursuit AI, ramming & recovery
├── tests/
│   ├── difficulty.test.js    # Difficulty scaling unit tests
│   ├── enemies.test.js       # Facial structure & two-handed grip tests
│   ├── grenades.test.js      # Grenade trajectory & damage tests
│   ├── spread.test.js        # Accuracy & spread tests
│   ├── validate.py           # Comprehensive end-to-end test suite
│   └── vehicles.test.js      # Vehicle AI & collision tests
├── .gitignore                # Git exclusions (node_modules, dist, etc.)
├── game.js                   # Primary game loop, scene rendering, player physics
├── index.html                # Entry point HTML
├── package.json              # Project dependencies and npm scripts
├── style.css                 # HUD, title screen, radar, and responsive styling
├── test-runner.html          # In-browser visual test runner
└── vite.config.js            # Vite build configuration (base: './')
```

---

## 📜 License

MIT License. Free for personal and educational use.
