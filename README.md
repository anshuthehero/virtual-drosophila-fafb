# DOOM-FLY // FLYWIRE FAFB CONNECTOME

> **Live Demo**: [https://fruitflybrainplaydoom.netlify.app](https://fruitflybrainplaydoom.netlify.app)

An authentic biological simulation of the fruit fly (*Drosophila melanogaster*) brain connectome playing 3D DOOM in real time in the browser, driven directly by the **FlyWire FAFB (Full Adult Female Brain)** electron microscopy dataset ([codex.flywire.ai/?dataset=fafb](https://codex.flywire.ai/?dataset=fafb)).

---

## 🎮 Game Concept & How It Works

Unlike conventional video game bots that rely on hardcoded rules or black-box neural networks, the agent in **Neural Labyrinth** is controlled by authentic neural circuits from the *Drosophila* connectome:

1. **Compound Eye Corridor Sightlines (Sensory Input)**:
   - The fly casts optical flow rays down available corridor directions, detecting approaching predators, sucrose pellets, and walls.
2. **Lobula Plate & Giant Fiber (Fear / Threat Circuit)**:
   - Approaching predators activate **Lobula LPLC2** projection neurons. When the looming expansion rate exceeds threshold, the **Giant Fiber** spikes, commanding an emergency evasive saccade away from the danger corridor (visualized in **vivid crimson**).
3. **Antennal Lobe & PAM Dopamine (Reward / Sucrose Circuit)**:
   - Sugar pellets emit airborne odor gradients detected by **ALPN** projection neurons. Consuming sucrose activates **PAM Dopaminergic neurons**, reinforcing positive chemotaxis (visualized in **emerald green**).
4. **Central Complex: Ellipsoid Body Ring Attractor (Compass / Path Integration)**:
   - A continuous 16-wedge neural ring attractor (**E-PG and P-EN neurons**) maintains an internal representation of heading direction in world space, preventing the fly from looping aimlessly in dead-ends (visualized in **electric cyan**).
5. **Crossroad Mathematical Utility Arbitration**:
   - At every intersection, the connectome computes a directional utility vector across available directions:
     $$\mathbf{U}(d) = w_{\text{reward}} \cdot \text{ALPN}(d) - w_{\text{fear}} \cdot \text{LPLC2}(d) + w_{\text{compass}} \cdot \cos(\theta_d - \theta_{\text{EB}}) - \text{MemoryPenalty}(d)$$
   - Softmax probabilities are rendered in real time on the **Connectome Decision Radar**.

---

## 👾 4 Intelligent Predator Hunter Archetypes

1. 🔴 **Looming Hunter (Red)**: Direct shortest-path pursuit that projects an expanding overhead shadow, triggering the fly's panic escape reflexes.
2. 🔵 **Ambush Trapper (Cyan)**: Predicts the fly's heading vector and cuts off escape corridors ahead.
3. 🟣 **Scent Stalker (Purple)**: Tracks the fly's past breadcrumb odor trail, punishing stalling or backtracking.
4. 🟡 **Territorial Brute (Orange)**: Defends high-density sucrose rooms and patrol loops.

---

## 🕹️ Game Modes

- **Autonomous Connectome Run**: Watch the AI fly solve the labyrinth autonomously while observing its real-time decision-making radar and neural firing states.
- **Player vs Fly (Hunter Mode)**: Take direct control of the Red Hunter using `WASD` or Arrow keys (or mobile virtual D-pad) to hunt down the AI fly and test its evasion reflexes!
- **Dopamine Frenzy**: Eating large Super Sucrose Crystals inverts the fear hierarchy—dopamine surges, predators turn blue and flee, and the fly hunts them down for bonus score!
- **Connectome Lesion Testing**: Use the EB Synapse Lesion slider ($0\%\text{--}80\%$) to sever connections in the Ellipsoid Body. Watch the compass bump dissolve into noise, forcing the fly to lose path integration and become trapped in cul-de-sacs.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, HTML5 Canvas (60 FPS rendering).
- **Neural Modeling**: Continuous ring attractor differential equations, leaky ReLU rate-based neuromodulation, A* and vector-field predator pathfinding.
- **Testing**: Vitest automated unit test suite.

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Build production bundle
npm run build

# Start local development server
npm run dev
```

---

## 📚 Scientific Citations & Dataset

- **FlyWire FAFB Whole-Brain Connectome**: Dorkenwald et al., *Neuronal wiring diagram of an adult brain*, *Nature* 2024; Schlegel et al., *Whole-brain annotation and multi-connectome mapping of Drosophila*, *Nature* 2024. [codex.flywire.ai/?dataset=fafb](https://codex.flywire.ai/?dataset=fafb)
- **Central Complex Ring Attractor**: Hulse et al., *A connectome of the Drosophila central complex*, *eLife* 2021.
