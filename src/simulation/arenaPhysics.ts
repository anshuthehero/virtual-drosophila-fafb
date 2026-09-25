import { HeatZone, PredatorShadow, SucroseDrop } from '../types/simulation';

export class ArenaPhysics {
  public width: number;
  public height: number;
  public radius: number;
  public centerX: number;
  public centerY: number;

  public sucroseDrops: SucroseDrop[] = [];
  public predatorShadow: PredatorShadow;
  public heatZones: HeatZone[] = [];

  constructor(width: number = 800, height: number = 550) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.radius = Math.min(width, height) * 0.44;

    this.predatorShadow = {
      x: this.centerX - 100,
      y: this.centerY - 60,
      currentRadius: 20,
      targetRadius: 110,
      growthRate: 35,
      opacity: 0,
      active: false,
      loomingSpeed: 1.0
    };

    // Default initial entities
    this.spawnDefaultEntities();
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.radius = Math.min(width, height) * 0.44;
  }

  public spawnDefaultEntities() {
    this.sucroseDrops = [
      { id: 'sucrose_1', x: this.centerX + 120, y: this.centerY - 80, radius: 14, amount: 100 },
      { id: 'sucrose_2', x: this.centerX - 130, y: this.centerY + 70, radius: 16, amount: 100 },
      { id: 'sucrose_3', x: this.centerX + 70, y: this.centerY + 110, radius: 12, amount: 80 }
    ];

    this.heatZones = [
      { id: 'heat_1', x: this.centerX - 110, y: this.centerY - 100, radius: 45, intensity: 0.85 }
    ];
  }

  public addSucrose(x: number, y: number) {
    // Keep within arena radius
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, this.radius - 20);
    const angle = Math.atan2(dy, dx);

    const safeX = this.centerX + Math.cos(angle) * clampedDist;
    const safeY = this.centerY + Math.sin(angle) * clampedDist;

    this.sucroseDrops.push({
      id: `sucrose_${Date.now()}`,
      x: safeX,
      y: safeY,
      radius: 14,
      amount: 100
    });
  }

  public triggerPredatorShadow(targetX?: number, targetY?: number) {
    this.predatorShadow.active = true;
    this.predatorShadow.currentRadius = 15;
    this.predatorShadow.opacity = 0.85;
    if (targetX !== undefined && targetY !== undefined) {
      this.predatorShadow.x = targetX;
      this.predatorShadow.y = targetY;
    } else {
      // Near center with slight jitter
      this.predatorShadow.x = this.centerX + (Math.random() - 0.5) * 80;
      this.predatorShadow.y = this.centerY + (Math.random() - 0.5) * 80;
    }
  }

  public clearArena() {
    this.sucroseDrops = [];
    this.heatZones = [];
    this.predatorShadow.active = false;
  }

  public step(dt: number) {
    // Update predator shadow looming dynamics
    if (this.predatorShadow.active) {
      if (this.predatorShadow.currentRadius < this.predatorShadow.targetRadius) {
        this.predatorShadow.currentRadius += this.predatorShadow.growthRate * dt * 2.5;
        this.predatorShadow.opacity = Math.min(0.85, this.predatorShadow.opacity + dt);
      } else {
        // Lingers then fades
        this.predatorShadow.opacity -= dt * 0.45;
        if (this.predatorShadow.opacity <= 0.05) {
          this.predatorShadow.active = false;
          this.predatorShadow.currentRadius = 15;
          this.predatorShadow.opacity = 0;
        }
      }
    }

    // Clean up fully consumed food drops
    this.sucroseDrops = this.sucroseDrops.filter(drop => drop.amount > 0.5);
  }

  /**
   * Sample sensory cues at fly position and heading
   */
  public sampleSensors(flyX: number, flyY: number, headingRad: number) {
    // 1. Sugar odor concentration at antennae (Gaussian dispersion with decay)
    let totalSugarOdor = 0;
    let closestSugarDist = 9999;
    let sugarBearing = 0;
    let inContact = false;

    for (const drop of this.sucroseDrops) {
      const dx = drop.x - flyX;
      const dy = drop.y - flyY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < closestSugarDist) {
        closestSugarDist = dist;
        sugarBearing = Math.atan2(dy, dx);
      }

      // Odor plume decay: lambda ~ 120px
      const odor = Math.exp(-dist / 110.0) * (drop.amount / 100.0);
      totalSugarOdor += odor;

      // Contact sensation
      if (dist < drop.radius + 8) {
        inContact = true;
      }
    }
    const sugarOdor = Math.min(1.0, totalSugarOdor);

    // 2. Looming visual threat from predator shadow
    let loomingThreat = 0;
    let shadowBearing = 0;
    if (this.predatorShadow.active && this.predatorShadow.opacity > 0.1) {
      const dx = this.predatorShadow.x - flyX;
      const dy = this.predatorShadow.y - flyY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      shadowBearing = Math.atan2(dy, dx);

      // Looming function: angular expansion rate theta_dot = radius / dist
      const effectiveDist = Math.max(20, dist);
      const angularSize = this.predatorShadow.currentRadius / effectiveDist;
      if (dist < this.predatorShadow.currentRadius * 2.2) {
        loomingThreat = Math.min(1.0, angularSize * this.predatorShadow.opacity * 1.4);
      }
    }

    // 3. Heat hazard level
    let heatLevel = 0;
    for (const zone of this.heatZones) {
      const dx = zone.x - flyX;
      const dy = zone.y - flyY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < zone.radius) {
        heatLevel = Math.max(heatLevel, zone.intensity * (1 - dist / zone.radius));
      }
    }

    // 4. Circular arena boundary proximity
    const centerDx = flyX - this.centerX;
    const centerDy = flyY - this.centerY;
    const distFromCenter = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
    const distToWall = Math.max(0, this.radius - distFromCenter);
    const boundaryProximity = distToWall < 35 ? (35 - distToWall) / 35 : 0;

    // 5. Retinal 36-ommatidia projection (visual field around fly)
    const retinaSectors = new Array(36).fill(0.05); // Ambient illumination
    for (let i = 0; i < 36; i++) {
      const sectorAngle = headingRad + (i / 36) * Math.PI * 2 - Math.PI;
      // If predator is in this sector, darken ommatidia (contrast detection)
      if (this.predatorShadow.active) {
        let diff = Math.abs(sectorAngle - shadowBearing);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 0.6) {
          retinaSectors[i] = Math.max(0, 0.85 - loomingThreat);
        }
      }
    }

    return {
      sugarOdor,
      sugarContact: inContact,
      closestSugarDist,
      sugarBearing,
      loomingThreat,
      shadowBearing,
      heatLevel,
      boundaryProximity,
      distFromCenter,
      retinaSectors
    };
  }

  /**
   * Keep fly inside circular petri dish boundary with smooth wall deflection
   */
  public constrainFly(flyX: number, flyY: number): { x: number; y: number; hitWall: boolean } {
    const dx = flyX - this.centerX;
    const dy = flyY - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.radius - 12;

    if (dist > maxDist) {
      const angle = Math.atan2(dy, dx);
      return {
        x: this.centerX + Math.cos(angle) * maxDist,
        y: this.centerY + Math.sin(angle) * maxDist,
        hitWall: true
      };
    }

    return { x: flyX, y: flyY, hitWall: false };
  }
}
