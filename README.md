# 🏙️ Urban Breach — Tactical 3D FPS & Wave Survival

[![Three.js](https://img.shields.io/badge/Three.js-0.179.1-black?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-Passing-729B1B?logo=vitest)](https://vitest.dev/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?logo=github)](https://pages.github.com/)

**Urban Breach** is a high-octane, procedural **3D Tactical First-Person Shooter** built from the ground up using **Three.js** and **Vite**. Engage in intense urban warfare across a sprawling metropolis, endure escalating waves of hostile operatives and combat pursuit technicals, survive compound bone fractures and aquatic hazards, and conquer Wave 50 or push forward into **Endless Combat Mode**!

---

## 📑 Table of Contents

1. [Key Features Overview](#-key-features-overview)
2. [Weapons Arsenal & Unlock System](#-weapons-arsenal--unlock-system)
3. [Wave Escalation, Bosses & Endless Mode](#-wave-escalation-bosses--endless-mode)
4. [Anatomical Medical & Fracture System](#-anatomical-medical--fracture-system)
5. [Humanoid Operatives & Pursuit Vehicles](#-humanoid-operatives--pursuit-vehicles)
6. [Tactical World, Terrain & Environmental Hazards](#-tactical-world-terrain--environmental-hazards)
7. [Military Achievements & Victory Engine](#-military-achievements--victory-engine)
8. [Multiplayer (Home & School WebRTC Modes)](#-multiplayer-home--school-webrtc-modes)
9. [Classified Developer Test Mode](#-classified-developer-test-mode)
10. [Controls & Keybindings](#-controls--keybindings)
11. [Installation & Development](#-installation--development)
12. [Deploying to GitHub Pages](#-deploying-to-github-pages)
13. [License](#-license)

---

## 🌟 Key Features Overview

* **3D Procedural Urban Warzone**: A vast cityscape framed by gentle mountain rings, featuring skyscrapers, suburban residences with gabled roofs, water towers, rooftop scenery with collision physics, climbable ladders, and roadside emergency facilities (donut shops, hospitals, police precincts).
* **Deep Weapons Sandbox**: AK-47 Tactical Rifle, Combat Shotgun, Bolt-Action Sniper Rifle with dual zoom scopes, M134 Vulcan Rotary Minigun, and physics-based fragmentation grenades.
* **Continuous Wave Escalation**: 50 official waves of increasing tactical difficulty across 4 difficulty tiers, capped with an epic Wave 50 victory ceremony and an instant **"🔥 PLAY ON (WAVE 50+)"** endless combat mode.
* **Lethal Machine Gunner Boss Encounters**: Giant 1.4x scale titanium-armored Heavy Juggernauts deployed every 5 waves with dedicated boss health bars and rotary suppression cannons.
* **Biometric Skeleton Medical System**: Localized anatomical damage tracking (Head, Torso, Arms, Legs), realistic compound bone fractures with debilitating movement/handling debuffs, arterial bleeding over time, and field medkits.
* **Dynamic Enemy AI & Vehicle Ramming**: Humanoid infantry with authentic facial modeling, two-handed firearm grips, tactical flankers, knife rushers, and pursuit vehicles with high-speed ramming surges.
* **Environmental Danger**: Fatal fall damage, deep water hazards with buoyancy and drowning mechanics (*"Oh, So That's What It Does"*), and concealment vegetation bushes.
* **Heading-Up Tactical Radar**: Forward-facing mini-radar dynamically tracking hostiles, pursuit cars, ladders, and building boundaries relative to the player's orientation.
* **Military Achievements Engine**: 69 military milestones with sliding cyber notification toasts, category filter tabs, and full progress reset with Minigun re-locking.
* **Dual-Mode Multiplayer**: Built-in WebRTC networking supporting both standard online matchmaking (**Home Mode**) and direct offline/firewall-friendly SDP exchange (**School Mode**).
* **Secret Developer Test Console**: In-game classified hotspot with credential authentication, game pause, entity telemetry, wave jumping, and parameter overrides.

---

## 🔫 Weapons Arsenal & Unlock System

| Weapon | Capacity | Fire Rate | Spread / Recoil | Special Attributes |
| :--- | :--- | :--- | :--- | :--- |
| **AK-47 Tactical Rifle** | 30 rounds | Full-Auto (600 RPM) | Moderate bloom; pinpoint ADS | Reliable all-rounder, holographic optics |
| **Combat Shotgun** | 8 shells | Semi-Auto | Heavy 8-pellet spread cone | Lethal point-blank room clearer |
| **Precision Sniper Rifle** | 5 rounds | Bolt-Action | 0 spread; high recoil | Dual-zoom optical scope, high crit multiplier |
| **M134 Vulcan Minigun** | 100 rounds | Ultra High (1200 RPM) | Progressive heat accumulation | **Unlocked at Wave 50!** Rotary barrel spin, trigger cutoff |
| **Frag Grenades** | Max 5 held | Thrown (Key `G`) | Parabolic physics trajectory | Bounces off walls/floors, auto-refills 1 every 5s |

### Advanced Weapon Mechanics:
* **Precision Aim-Down-Sights (ADS)**: Holding `RMB` brings the weapon into precision stance, tightening bullet spread to absolute zero and rendering custom holographic reticles.
* **Recoil & Spread Bloom**: Continuous hip-firing causes bullet spread to bloom outward; pausing fire or aiming down sights resets accuracy.
* **Audio Cutoff on Trigger Release**: Releasing the trigger immediately stops weapon loop sounds with a smooth fade, preventing lingering machine gun audio.
* **Empty Mag Click & Mechanical Reloads**: Visual magazine insertion, chamber cycling, brass casing ejection, and auditory cues.

---

## 🌊 Wave Escalation, Bosses & Endless Mode

Urban Breach features an exponential 7-round compound scaling formula where enemy density, health, speed, and aggression scale progressively:

$$	ext{Multiplier} = (	ext{BaseRate})^{rac{	ext{Wave} - 1}{7}}$$

### 4 Difficulty Tiers
1. **Recruit (Easy)**: Reduced enemy health ($70\text{ HP}$), generous reaction delays, slower vehicles.
2. **Survivor (Normal)**: Baseline tactical experience ($100\text{ HP}$), balanced spawns.
3. **Veteran (Hard)**: Aggressive hostiles ($140\text{ HP}$), faster pursuit vehicles, rapid firing cycles.
4. **Apocalypse (Nightmare)**: Relentless military pressure ($180\text{ HP}$), maximum spawns, lethal bullet damage.

### Juggernaut Machine Gunner Bosses (Every 5 Waves)
* Boss encounters trigger on **Wave 5, 10, 15, 20... 50, 55, 60+**.
* Bosses stand at **1.4x scale**, clad in black titanium composite armor, carrying an M134 Minigun.
* Boss health scales progressively ($1.5^n$ multiplier), accompanied by a dedicated top-screen boss health bar.

### Wave 50 Victory & "Play On" Endless Mode
* **Total Victory**: Surviving Wave 50 triggers the official victory screen, celebrating the liberation of the urban zone and permanently unlocking the **M134 Vulcan Minigun** in the weapon loadout!
* **🔥 PLAY ON (Wave 50+) Button**: Want to keep fighting? Click **"PLAY ON"** to re-engage pointer lock and dive straight into **Endless Survival Mode**, taking on Wave 51, 52, 53... with continuously escalating hostile waves and recurring juggernaut bosses!

---

## 🩺 Anatomical Medical & Fracture System

Urban Breach features an interactive biometric anatomical model tracking damage across 6 bodily zones:

* **Head**: Cranial trauma causes severe screen blur and $+40\%$ weapon sway.
* **Torso**: Cracked ribs reduce sprint stamina breath recovery by $-50\%$.
* **Left / Right Arm**: Arm fractures increase reload times by $+50\%$.
* **Left / Right Leg**: Compound bone fractures cause a severe $-35\%$ movement speed penalty and an authentic limping gait.
* **Arterial Bleeding**: Open bullet wounds cause progressive blood loss over time until treated.

### Medical Kits (`F` Key or World Pickups)
Using a field medkit sutures bullet wounds, sets splints on fractured bones, and restores health, returning the player to optimal operational condition.

---

## 🪖 Humanoid Operatives & Pursuit Vehicles

### Lifelike Enemy Modeling
* **Detailed Humanoid Heads**: Complete 3D facial geometry including brow, nose bridge, nostrils, lips, chin, comms earpieces, and expressive eyes with pupils and irises.
* **Two-Handed Firearm Grip**: Operatives wield weapons with an authentic two-handed stance, tracking the player with realistic torso and arm articulation.
* **Archetypes**:
  * *Tactical Shooters*: Use cover, align line of sight, and fire bursts.
  * *Knife Rushers*: Charge with combat blades, leaping in for lethal close-range melee slashes.

### Armored Pursuit Technicals
* Hostile pickup trucks equipped with roll cages, bull bars, and combat tires.
* **Aggressive Pursuit AI**: Patrols roads and charges toward the player at speeds up to $32\text{ m/s}$.
* **Ramming & Recovery**: Delivers heavy impact damage upon collision and automatically shifts into reverse when hitting buildings or obstacles before re-engaging pursuit.
* **Destructible**: Can be disabled and detonated with gunfire or explosive grenades!

---

## 🗺️ Tactical World, Terrain & Environmental Hazards

* **Uniform Gentle Mountain Ring**: Beautiful natural mountainous terrain enclosing the city grid with rolling hills and pine forests.
* **Aquatic Buoyancy & Drowning**: Stepping into deep water initiates buoyancy physics and swimming speed. Submerging past head height starts a drowning timer; succumbing to water awards the achievement *"Oh, So That's What It Does"*.
* **Fall Damage Physics**: Dropping from high rooftops or ladders inflicts blunt trauma and compound leg fractures.
* **Climbable High-Ground Ladders**: Seamlessly climb to rooftops to gain overwatch sniper positions; features auto step-off colliders onto roofs.
* **Solid Rooftop Scenery**: Chimneys, air conditioning units, antennas, and water towers all feature solid collision boundaries.
* **Roadside Facilities**: Donut shops, hospitals, and police departments are realistically positioned along city streets.
* **Bush Camouflage**: Crouching inside dense green bushes triggers stealth camouflage, dropping enemy visual detection range from $75\text{ m}$ down to $5\text{ m}$.
* **Heading-Up Tactical Radar**: A circular HUD compass that rotates with the player's camera, pinpointing enemies, cars, ladders, and building perimeters.

---

## 🏆 Military Achievements & Victory Engine

Urban Breach tracks **69 tactical achievements** across 5 distinct categories, stored locally in `localStorage`:

1. **Hostile Eliminations (40 Milestones)**: Every 5 kills from 5 all the way to 200 (`KILL_5` to `KILL_200`).
2. **Wave Survival (10 Milestones)**: Multiples of 5 up to Wave 50 (`SURVIVE_WAVE_5` to `SURVIVE_WAVE_50`, unlocking the Minigun).
3. **Casualties & Environmental Hazards (12 Milestones)**:
   * Multiples of 5 deaths up to 50 (`DEATH_5` to `DEATH_50`).
   * *"Oh, So That's What It Does"* (drowning in water).
   * *"Broken Bones"* (perishing from fall impact fractures).
4. **Special Operations & Tactics (5 Milestones)**:
   * *First Blood* (first confirmed kill).
   * *High-Rise Overwatch* (scaling a tactical rooftop ladder).
   * *Guerilla Ghost* (bush stealth camouflage).
   * *Combat Medic* (treating fractures and bleeding with a medkit).
   * *Road Demolisher* (destroying an enemy pursuit vehicle).
5. **Classified Secrets (2 Milestones)**:
   * *Classified Anomaly* (discovering the hidden developer hotspot).
   * *Developer Cleared* (authenticating into the developer console).

* **Cyberpunk Achievements Modal**: Press `ESC` or click the trophy icon on screen to view detailed milestone progress, category filters, and clearance percentage.
* **Reset Button**: Click `🗑️ RESET PROGRESS & LOCK MINIGUN` inside the viewer to clear all achievements and re-lock the Minigun.
* **Unified Cyber Scrollbars**: All scrollable menus and chat boxes use thin, glowing cyan cyberpunk scrollbars.

---

## 🌐 Multiplayer (Home & School WebRTC Modes)

Play cooperatively with friends online or over restricted local networks via peer-to-peer WebRTC!

### 🏠 Home Mode (Online Matchmaking)
* Connects through online cloud PeerJS signaling servers.
* Simply create a room name or join an existing lobby to team up.

### 🏫 School Mode (Direct SDP P2P for Restricted Networks)
* Designed specifically for school, university, or corporate networks where WebSocket signaling servers are blocked.
* Generates a direct WebRTC SDP offer string.
* Copy and paste the description between peers to establish a direct connection with zero outside servers required!

### Multiplayer Features:
* Full 3D player avatar synchronization with weapon models and muzzle flashes.
* Synchronized wave state, enemy health, vehicle positions, and scoreboards (`Tab` key).
* Real-time in-game tactical chat (`Enter` key).

---

## 🕵️ Classified Developer Test Mode

A hidden developer console built directly into the game for testing and balance tuning:

* **Status**: Highly classified developer console protected by secure authorization protocols.
* **Game Pause**: Opening the test console freezes the entire game world so you can adjust parameters safely without taking damage.
* **Capabilities**:
  * **Wave Jump**: Instantly jump to any wave (Wave 1 to 50+).
  * **Spawn Hostiles / Bosses**: Spawn riflemen, knife rushers, or heavy machine gunner bosses instantly.
  * **Spawn Vehicles**: Deploy pursuit technicals on demand.
  * **Freeze Wave Timer**: Halt wave timers for endless testing.
  * **God Mode & Infinite Ammo**: Invulnerability and unlimited ammunition.
  * **Game Speed & Lighting**: Adjust simulation delta and sun angles.
  * **Telemetry HUD**: Real-time stats on active enemies, memory, car counts, and player coordinates.

---

## 🕹️ Controls & Keybindings

| Key / Input | Action |
| :--- | :--- |
| **`W` `A` `S` `D`** | Move forward, left, backward, right / Climb ladders |
| **`Shift`** | Tactical Sprint |
| **`Space`** | Jump / Ascend Ladders |
| **`C`** | Crouch (reduces profile and enters bush stealth) |
| **`LMB` (Hold)** | Full-Auto Weapon Fire |
| **`RMB` (Hold)** | Aim Down Sights (ADS Precision Optics) |
| **`R`** | Reload Magazine |
| **`1` `2` `3` `4`** | Switch Weapons (AK-47, Shotgun, Sniper, Minigun) |
| **`Scroll Wheel`** | Cycle Weapons |
| **`G`** | Throw Fragmentation Grenade |
| **`F`** | Use Medical Kit (treat fractures & stop bleeding) |
| **`Tab` (Hold)** | View Multiplayer Scoreboard |
| **`Enter`** | Open In-Game Tactical Chat |
| **`M`** | Toggle Background Music Mute / Unmute |
| **`Mouse`** | Aim and Look Around (Pointer Lock) |

---

## 🚀 Installation & Development

### Prerequisites
* [Node.js](https://nodejs.org/) (version 20 or higher recommended)
* `npm` (bundled with Node.js)

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/basil-dsouza/urban-breach.git
cd urban-breach

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open your browser at `http://localhost:5173`.

### Testing

Run the Vitest test suite covering all game systems:

```bash
# Run unit & integration test suites
npm test

# Build production bundle
npm run build
```

---

## 🌐 Deploying to GitHub Pages

This project is pre-configured with **GitHub Actions** for automated build and static deployment:

1. Push your changes to the `main` branch on GitHub.
2. In your repository on GitHub, navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, choose **GitHub Actions**.
4. The workflow will automatically compile the Vite bundle and publish the game to:
   `https://<username>.github.io/urban-breach/`

---

## 📜 License

Distributed under the **MIT License**. Free for personal, academic, and non-commercial open-source development.
