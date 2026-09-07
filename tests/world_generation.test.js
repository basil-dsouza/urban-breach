import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildBridges } from '../Game Code/JavaScript/world/bridges.js';
import { buildRoadNetwork } from '../Game Code/JavaScript/world/roads.js';
import { buildMassiveCity, buildings, obstacles } from '../Game Code/JavaScript/world/buildings.js';
import { createTerrainMesh } from '../Game Code/JavaScript/world/terrain.js';
import { buildVegetation } from '../Game Code/JavaScript/world/vegetation.js';
import { buildLadders } from '../Game Code/JavaScript/world/ladders.js';

describe('World Generation & Procedural City Synthesis', () => {
    it('should generate bridges, roads, cities, terrain, vegetation, and ladders without reference errors', () => {
        const scene = new THREE.Scene();
        const staticRaycastTargets = [];

        expect(() => buildBridges(scene, staticRaycastTargets)).not.toThrow();
        expect(() => buildRoadNetwork(scene, staticRaycastTargets)).not.toThrow();
        expect(() => buildMassiveCity(scene, staticRaycastTargets)).not.toThrow();
        expect(() => createTerrainMesh(scene, buildings, [])).not.toThrow();
        expect(() => buildVegetation(scene, buildings, [], staticRaycastTargets)).not.toThrow();
        expect(() => buildLadders(scene, buildings, staticRaycastTargets)).not.toThrow();

        expect(buildings.length).toBeGreaterThan(50);
        expect(obstacles.length).toBeGreaterThan(100);
        expect(staticRaycastTargets.length).toBeGreaterThan(100);
    });
});
