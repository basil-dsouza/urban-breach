import * as THREE from 'three';
import { makeDriveway } from './roads.js';

export const buildings = [];

// 6. Hyper-Realistic Architecture Matching Reference Images
// Image 1: Tropical Terracotta Clay-Tile Villa (Terracotta hipped roof, covered verandah, white pillars, coach lanterns, stone path)
function createLowPolyCottage({ x, z, width, depth, height, w, d, h, rotY = 0 }) {
    const finalW = width || w || 13;
    const finalD = depth || d || 12;
    const finalH = height || h || 5.8;

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const whiteStuccoMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.72 });
    const darkBaseMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.9 });
    const terracottaRoofMat = new THREE.MeshStandardMaterial({ color: 0xba533c, roughness: 0.76 });
    const darkFasciaMat = new THREE.MeshStandardMaterial({ color: 0x2b1c11, roughness: 0.85 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.65 });
    const teakWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x74b9ff, roughness: 0.15, metalness: 0.45, transparent: true, opacity: 0.82 });
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.95 });

    const baseH = 0.8;
    const wallH = finalH - baseH;

    // 1. Dark Stone Foundation Skirting Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(finalW + 0.3, baseH, finalD + 0.3), darkBaseMat);
    base.position.y = baseH / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // 2. Main Warm-White Stucco Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(finalW, wallH, finalD * 0.82), whiteStuccoMat);
    body.position.set(0, baseH + wallH / 2, -finalD * 0.09);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 3. Terracotta Clay-Tile Hipped Roof with Eaves & Fascia
    const roofH = 3.4;
    const roofBaseW = width + 1.6;
    const roofBaseD = depth + 1.6;

    const roofGeo = new THREE.ConeGeometry(roofBaseW * 0.65, roofH, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.scale(1.0, 1.0, roofBaseD / roofBaseW);
    const roof = new THREE.Mesh(roofGeo, terracottaRoofMat);
    roof.position.set(0, height + roofH / 2, -depth * 0.05);
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    const fascia = new THREE.Mesh(new THREE.BoxGeometry(roofBaseW, 0.22, roofBaseD), darkFasciaMat);
    fascia.position.set(0, height + 0.11, -depth * 0.05);
    group.add(fascia);

    // 4. Covered Front Verandah Porch with White Architectural Pillars
    const porchD = depth * 0.28;
    const porchW = width * 0.88;
    const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(porchW, 0.25, porchD), teakWoodMat);
    porchFloor.position.set(0, baseH + 0.125, depth / 2 - porchD / 2);
    porchFloor.receiveShadow = true;
    group.add(porchFloor);

    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(porchW + 0.6, 0.18, porchD + 0.4), terracottaRoofMat);
    porchRoof.position.set(0, baseH + 3.2, depth / 2 - porchD / 2);
    porchRoof.rotation.x = 0.12;
    porchRoof.castShadow = true;
    group.add(porchRoof);

    // 4 White Verandah Pillars
    for (let c = -1.5; c <= 1.5; c += 1.0) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.1, 0.26), pillarMat);
        pillar.position.set(c * (porchW / 3.4), baseH + 1.55, depth / 2 - 0.25);
        pillar.castShadow = true;
        group.add(pillar);

        const pillarBase = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.35, 0.36), darkBaseMat);
        pillarBase.position.set(c * (porchW / 3.4), baseH + 0.175, depth / 2 - 0.25);
        group.add(pillarBase);
    }

    // 5. Front Entrance Teak Door & Coach Lantern
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.12), teakWoodMat);
    door.position.set(0, baseH + 1.3, depth * 0.32 + 0.06);
    group.add(door);

    const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.08), glassMat);
    doorGlass.position.set(0, baseH + 2.1, depth * 0.32 + 0.1);
    group.add(doorGlass);

    // Warm Coach Lantern Fixture
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), lanternMat);
    lantern.position.set(1.2, baseH + 2.2, depth * 0.32 + 0.18);
    group.add(lantern);

    // 6. Symmetrical Multi-Pane Windows
    for (let side = -1; side <= 1; side += 2) {
        const winX = side * (width * 0.32);
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 0.1), glassMat);
        win.position.set(winX, baseH + 1.8, depth * 0.32 + 0.06);
        group.add(win);

        const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.1, 0.06), teakWoodMat);
        winFrame.position.set(winX, baseH + 1.8, depth * 0.32 + 0.03);
        group.add(winFrame);
    }

    // 7. Stone Paver Pathway
    for (let p = 0; p < 4; p++) {
        const paver = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.9), pathMat);
        paver.position.set(0, 0.03, depth / 2 + 0.7 + p * 1.05);
        paver.receiveShadow = true;
        group.add(paver);
    }

    obstacles.push({
        x,
        z,
        w: width,
        d: depth,
        rotY,
        bottom: 0,
        top: height
    });

    buildings.push({
        x,
        z,
        w: width,
        d: depth,
        h: height,
        style: 'cottage',
        rotY,
        roofHeight: roofH
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

// Image 2: American Craftsman Suburban Residence (Multi-gable slate roof, dark sage lap siding, double garage, craftsman tapered pillars)
function createLowPolyLogCabin({ x, z, width, depth, height, w, d, h, rotY = 0 }) {
    const finalW = width || w || 14;
    const finalD = depth || d || 13;
    const finalH = height || h || 6.2;

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const sageSidingMat = new THREE.MeshStandardMaterial({ color: 0x43534a, roughness: 0.82 });
    const slateShingleMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.85 });
    const trimWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.65 });
    const stoneMasonryMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.95 });
    const garageDoorWoodMat = new THREE.MeshStandardMaterial({ color: 0x3e2718, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x74b9ff, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.85 });

    // 1. Main Craftsman House Body (Sage Horizontal Siding)
    const bodyW = finalW * 0.58;
    const bodyD = finalD * 0.88;
    const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, finalH, bodyD), sageSidingMat);
    body.position.set(-finalW * 0.21, finalH / 2, -finalD * 0.06);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 2. Integrated Double Garage Wing
    const garageW = finalW * 0.44;
    const garageD = finalD * 0.78;
    const garageH = finalH * 0.78;
    const garage = new THREE.Mesh(new THREE.BoxGeometry(garageW, garageH, garageD), sageSidingMat);
    garage.position.set(finalW * 0.28, garageH / 2, finalD * 0.05);
    garage.castShadow = true;
    garage.receiveShadow = true;
    group.add(garage);

    // Double Carriage Wooden Garage Doors with Transom Panes
    for (let g = 0; g < 2; g++) {
        const gX = finalW * 0.17 + g * (garageW * 0.48);
        const gDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.12), garageDoorWoodMat);
        gDoor.position.set(gX, 1.4, depth * 0.44 + 0.06);
        group.add(gDoor);

        const gTransom = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 0.08), glassMat);
        gTransom.position.set(gX, 2.45, depth * 0.44 + 0.12);
        group.add(gTransom);

        const gFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 0.06), trimWhiteMat);
        gFrame.position.set(gX, 1.5, depth * 0.44 + 0.03);
        group.add(gFrame);
    }

    // 3. Multi-Gable Slate Shingle Rooflines
    const mainRoofH = 3.6;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-bodyW / 2 - 0.7, 0);
    roofShape.lineTo(0, mainRoofH);
    roofShape.lineTo(bodyW / 2 + 0.7, 0);
    roofShape.closePath();

    const extrudeSettings = { depth: bodyD + 1.2, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.12, bevelThickness: 0.12 };
    const mainRoof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, extrudeSettings), slateShingleMat);
    mainRoof.position.set(-width * 0.21, height - 0.1, -bodyD / 2 - 0.6);
    mainRoof.castShadow = true;
    mainRoof.receiveShadow = true;
    group.add(mainRoof);

    // Garage Gable Roof
    const garageRoofH = 2.4;
    const gRoofShape = new THREE.Shape();
    gRoofShape.moveTo(-garageW / 2 - 0.6, 0);
    gRoofShape.lineTo(0, garageRoofH);
    gRoofShape.lineTo(garageW / 2 + 0.6, 0);
    gRoofShape.closePath();

    const gRoof = new THREE.Mesh(new THREE.ExtrudeGeometry(gRoofShape, { depth: garageD + 1.0, bevelEnabled: true, steps: 1, bevelSize: 0.1 }), slateShingleMat);
    gRoof.position.set(width * 0.28, garageH - 0.1, -garageD / 2 - 0.5);
    gRoof.castShadow = true;
    group.add(gRoof);

    // 4. Craftsman Front Portico Entry with Tapered Pillars on Masonry Pedestals
    const porticoX = -finalW * 0.15;
    const porticoZ = finalD * 0.42;

    const entryStep = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.4, 1.6), stoneMasonryMat);
    entryStep.position.set(porticoX, 0.2, porticoZ);
    group.add(entryStep);

    // Stone Pedestals & Tapered Wood Pillars
    for (const side of [-1, 1]) {
        const pX = porticoX + side * 1.1;
        const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.1, 0.65), stoneMasonryMat);
        pedestal.position.set(pX, 0.55, porticoZ + 0.5);
        group.add(pedestal);

        const taperedPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 2.2, 4), trimWhiteMat);
        taperedPillar.rotation.y = Math.PI / 4;
        taperedPillar.position.set(pX, 2.2, porticoZ + 0.5);
        taperedPillar.castShadow = true;
        group.add(taperedPillar);
    }

    const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 1.8), slateShingleMat);
    porticoRoof.position.set(porticoX, 3.4, porticoZ + 0.4);
    porticoRoof.rotation.x = 0.15;
    porticoRoof.castShadow = true;
    group.add(porticoRoof);

    // 5. Craftsman Multi-Pane Double-Hung Windows
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.1), glassMat);
    win1.position.set(-finalW * 0.36, 3.0, finalD * 0.38 + 0.06);
    group.add(win1);
    const win1Frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.3, 0.06), trimWhiteMat);
    win1Frame.position.set(-finalW * 0.36, 3.0, finalD * 0.38 + 0.03);
    group.add(win1Frame);

    obstacles.push({
        x,
        z,
        w: finalW,
        d: finalD,
        rotY,
        bottom: 0,
        top: finalH
    });

    buildings.push({
        x,
        z,
        w: finalW,
        d: finalD,
        h: finalH,
        style: 'cabin',
        rotY,
        roofHeight: mainRoofH
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

// Image 3: Contemporary Modern Minimalist Luxury Villa (Cantilevered flat dark roofs, floor-to-ceiling glass curtain walls, teak sundeck, pergola & pool)
function createLowPolyModernVilla({ x, z, width, depth, height, w, d, h, rotY = 0 }) {
    const finalW = width || w || 16;
    const finalD = depth || d || 15;
    const finalH = height || h || 7.8;

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const pristineWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.55 });
    const charcoalSlateMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.65 });
    const darkRoofMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.75 });
    const teakWoodMat = new THREE.MeshStandardMaterial({ color: 0xc89666, roughness: 0.75 });
    const poolWaterMat = new THREE.MeshStandardMaterial({ color: 0x00d2d3, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.88 });
    const poolRimMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.75 });
    const panoramicGlassMat = new THREE.MeshStandardMaterial({ color: 0x4a69bd, roughness: 0.08, metalness: 0.55, transparent: true, opacity: 0.78 });
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x718093, roughness: 0.85 });
    const shrubMat = new THREE.MeshStandardMaterial({ color: 0x2ed573, roughness: 0.8, flatShading: true });

    const groundH = finalH * 0.52;
    const upperH = finalH * 0.48;

    // 1. Ground Floor Pristine White Monolith
    const groundBody = new THREE.Mesh(new THREE.BoxGeometry(finalW * 0.65, groundH, finalD * 0.75), pristineWhiteMat);
    groundBody.position.set(-finalW * 0.15, groundH / 2, -finalD * 0.05);
    groundBody.castShadow = true;
    groundBody.receiveShadow = true;
    group.add(groundBody);

    // 2. Cantilevered Charcoal Upper Volume
    const upperBody = new THREE.Mesh(new THREE.BoxGeometry(finalW * 0.72, upperH, finalD * 0.82), charcoalSlateMat);
    upperBody.position.set(0, groundH + upperH / 2, 0);
    upperBody.castShadow = true;
    upperBody.receiveShadow = true;
    group.add(upperBody);

    // 3. Wide Cantilevered Overhang Roof with Deep Soffit
    const mainRoof = new THREE.Mesh(new THREE.BoxGeometry(finalW * 0.82, 0.32, finalD * 0.92), darkRoofMat);
    mainRoof.position.set(0, finalH + 0.16, 0);
    mainRoof.castShadow = true;
    group.add(mainRoof);

    // 4. Panoramic Floor-to-Ceiling Glass Walls
    const glassW = finalW * 0.46;
    const glassH = groundH * 0.82;
    const groundGlass = new THREE.Mesh(new THREE.BoxGeometry(glassW, glassH, 0.08), panoramicGlassMat);
    groundGlass.position.set(-finalW * 0.15, groundH * 0.5, finalD * 0.32 + 0.05);
    group.add(groundGlass);

    const upperGlass = new THREE.Mesh(new THREE.BoxGeometry(finalW * 0.48, upperH * 0.78, 0.08), panoramicGlassMat);
    upperGlass.position.set(-finalW * 0.05, groundH + upperH * 0.5, finalD * 0.41 + 0.05);
    group.add(upperGlass);

    // 5. Vertical Teak Architectural Louver Screen
    for (let s = 0; s < 7; s++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, upperH * 0.9, 0.35), teakWoodMat);
        slat.position.set(finalW * 0.18 + s * 0.32, groundH + upperH * 0.5, finalD * 0.41 + 0.12);
        slat.castShadow = true;
        group.add(slat);
    }

    // 6. Integrated Concrete Planter Boxes with Lush Shrubbery
    const planterW = 3.6;
    const planter = new THREE.Mesh(new THREE.BoxGeometry(planterW, 0.7, 1.2), planterMat);
    planter.position.set(-finalW * 0.36, 0.35, finalD * 0.38 + 1.0);
    group.add(planter);

    for (let s = -1; s <= 1; s++) {
        const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), shrubMat);
        shrub.position.set(-finalW * 0.36 + s * 1.0, 0.85, finalD * 0.38 + 1.0);
        group.add(shrub);
    }

    // 7. Raised Teak Sundeck Patio, Pergola & Swimming Pool
    const deckW = finalW * 0.52;
    const deckD = finalD * 0.68;
    const deckH = 0.35;
    const deckX = finalW * 0.44;
    const deckZ = finalD * 0.34;
    const sundeck = new THREE.Mesh(new THREE.BoxGeometry(deckW, deckH, deckD), teakWoodMat);
    sundeck.position.set(deckX, deckH / 2, deckZ);
    sundeck.receiveShadow = true;
    group.add(sundeck);

    // Crystal-Blue Swimming Pool
    const poolW = 4.6;
    const poolD = 6.4;
    const poolX = deckX + 0.2;
    const poolZ = deckZ - 0.2;

    const poolRim = new THREE.Mesh(new THREE.BoxGeometry(poolW + 0.8, 0.38, poolD + 0.8), poolRimMat);
    poolRim.position.set(poolX, 0.19, poolZ);
    group.add(poolRim);

    const poolWater = new THREE.Mesh(new THREE.BoxGeometry(poolW, 0.1, poolD), poolWaterMat);
    poolWater.position.set(poolX, 0.32, poolZ);
    group.add(poolWater);

    // Modern Teak Pergola Canopy
    const pergolaPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.4, 0.14), darkRoofMat);
    pergolaPost1.position.set(deckX - deckW / 2 + 0.4, 1.7, deckZ - deckD / 2 + 0.4);
    group.add(pergolaPost1);

    const pergolaPost2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.4, 0.14), darkRoofMat);
    pergolaPost2.position.set(deckX + deckW / 2 - 0.4, 1.7, deckZ - deckD / 2 + 0.4);
    group.add(pergolaPost2);

    const pergolaRoof = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.12, deckD * 0.45), darkRoofMat);
    pergolaRoof.position.set(deckX, 3.4, deckZ - deckD / 4);
    group.add(pergolaRoof);

    obstacles.push({
        x,
        z,
        w: finalW * 0.72,
        d: finalD * 0.82,
        rotY,
        bottom: 0,
        top: finalH
    });

    buildings.push({
        x,
        z,
        w: finalW,
        d: finalD,
        h: finalH,
        style: 'villa',
        rotY,
        roofHeight: 0
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

// ==========================================
// 6d. Iconic Landmark Buildings from References
// ==========================================

// Image 1: Giant Donut Diner / Bakery
function createGiantDonutDiner({ x, z, rotY = 0 }) {
    const width = 14, depth = 12, height = 4.8;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const stuccoMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.75 });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.85 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.6 });
    const woodCounterMat = new THREE.MeshStandardMaterial({ color: 0x8e5d34, roughness: 0.7 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdfe6e9, metalness: 0.9, roughness: 0.2 });
    const grassBedMat = new THREE.MeshStandardMaterial({ color: 0x44bd32, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x74b9ff, roughness: 0.15, metalness: 0.45, transparent: true, opacity: 0.82 });

    // 1. Main Diner Body & Parapet
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height - 0.4, depth), stuccoMat);
    body.position.y = (height - 0.4) / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const parapet = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.5, depth + 0.4), darkTrimMat);
    parapet.position.y = height - 0.15;
    group.add(parapet);

    // 2. Front Gabled Portico Entrance with Twin Pillars
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.8, 0.45), stuccoMat);
    pillarL.position.set(-1.6, 1.9, depth / 2 + 1.2);
    group.add(pillarL);

    const pillarR = pillarL.clone();
    pillarR.position.x = 1.6;
    group.add(pillarR);

    // Portico Roof Gable
    const pedimentGeo = new THREE.ConeGeometry(2.4, 1.2, 4);
    const pediment = new THREE.Mesh(pedimentGeo, darkTrimMat);
    pediment.rotation.y = Math.PI / 4;
    pediment.position.set(0, 4.4, depth / 2 + 1.2);
    group.add(pediment);

    // Front Glass Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.0, 0.1), glassMat);
    door.position.set(0, 1.5, depth / 2 + 0.05);
    group.add(door);

    // 3. Orange Window Frames & Glass Shopfronts
    for (const wx of [-4.2, 4.2]) {
        const winBorder = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 0.15), orangeMat);
        winBorder.position.set(wx, 2.4, depth / 2 + 0.05);
        group.add(winBorder);

        const winGlass = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.08), glassMat);
        winGlass.position.set(wx, 2.4, depth / 2 + 0.1);
        group.add(winGlass);
    }

    // 4. Side Outdoor Dining Counter & Barstools
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 5.2), woodCounterMat);
    counter.position.set(-width / 2 - 0.7, 1.8, 0);
    group.add(counter);

    const counterBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.7, 5.0), stuccoMat);
    counterBase.position.set(-width / 2 - 0.7, 0.85, 0);
    group.add(counterBase);

    // Barstools
    for (let bz = -2.0; bz <= 2.0; bz += 1.0) {
        const stoolPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), chromeMat);
        stoolPost.position.set(-width / 2 - 1.5, 0.55, bz);
        group.add(stoolPost);

        const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12), chromeMat);
        stoolSeat.position.set(-width / 2 - 1.5, 1.14, bz);
        group.add(stoolSeat);
    }

    // Striped Canvas Awning Over Side Counter
    const stripedCanvasMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 5.8), stripedCanvasMat);
    awning.position.set(-width / 2 - 0.7, 3.6, 0);
    awning.rotation.z = -0.35;
    group.add(awning);

    // 5. Front Planter Beds
    for (const px of [-3.8, 3.8]) {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 1.8), grassBedMat);
        bed.position.set(px, 0.18, depth / 2 + 1.2);
        group.add(bed);

        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.85 }));
        bush.position.set(px, 0.7, depth / 2 + 1.2);
        group.add(bush);
    }

    // 6. Rooftop Industrial Steel Girder Truss
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.8, roughness: 0.3 });
    for (const tx of [-1.1, 1.1]) {
        for (const tz of [-1.1, 1.1]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.18), trussMat);
            leg.position.set(tx, height + 1.6, tz);
            group.add(leg);
        }
    }
    const trussCross = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 2.5), trussMat);
    trussCross.position.set(0, height + 3.2, 0);
    group.add(trussCross);

    // 7. GIANT 3D FROSTED DONUT WITH COLORFUL SPRINKLES
    const donutDoughMat = new THREE.MeshStandardMaterial({ color: 0xdfa064, roughness: 0.82 });
    const donutFrostingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32 });

    const donut = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.95, 16, 32), donutDoughMat);
    donut.position.set(0, height + 5.6, 0);
    donut.castShadow = true;
    group.add(donut);

    const frosting = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.98, 16, 32, Math.PI * 1.85), donutFrostingMat);
    frosting.position.set(0, height + 5.6, 0.05);
    frosting.rotation.z = 0.1;
    group.add(frosting);

    // Colorful Rainbow Sprinkles
    const sprinkleColors = [0xff3344, 0xf1c40f, 0x0984e3, 0x2ecc71, 0x9b59b6, 0xe67e22];
    for (let i = 0; i < 48; i++) {
        const col = sprinkleColors[i % sprinkleColors.length];
        const sMat = new THREE.MeshBasicMaterial({ color: col });
        const sprinkle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.08), sMat);
        const ang = (i / 48) * Math.PI * 2;
        const rad = 2.4 + (Math.sin(i * 3) * 0.45);
        sprinkle.position.set(Math.cos(ang) * rad, height + 5.6 + Math.sin(ang) * rad, 0.98);
        sprinkle.rotation.z = Math.sin(i * 7) * Math.PI;
        group.add(sprinkle);
    }

    // Rooftop HVAC Unit
    const hvac = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.8), darkTrimMat);
    hvac.position.set(-3.5, height + 0.6, -2.5);
    group.add(hvac);

    // Main building obstacle
    obstacles.push({
        x,
        z,
        w: width,
        d: depth,
        rotY,
        bottom: 0,
        top: height
    });

    // Rooftop Scenery Hitboxes: Steel girder truss / giant donut support & HVAC condenser unit
    obstacles.push({
        x,
        z,
        w: 2.8,
        d: 2.8,
        rotY,
        bottom: height,
        top: height + 8.5
    });

    const hvacWorldX = x + (-3.5 * Math.cos(rotY) + -2.5 * Math.sin(rotY));
    const hvacWorldZ = z - (-3.5 * Math.sin(rotY) - -2.5 * Math.cos(rotY));
    obstacles.push({
        x: hvacWorldX,
        z: hvacWorldZ,
        w: 1.8,
        d: 1.8,
        rotY,
        bottom: height,
        top: height + 1.2
    });

    buildings.push({
        x,
        z,
        w: width,
        d: depth,
        h: height,
        style: 'donut',
        rotY,
        roofHeight: 0
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

// Image 2: City Hospital & Emergency Center with Helipad & Ambulance Canopy
function createCityHospital({ x, z, rotY = 0 }) {
    const width = 28, depth = 24, height = 11.5;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.68 });
    const blueGlassMat = new THREE.MeshStandardMaterial({ color: 0x227093, metalness: 0.55, roughness: 0.2, transparent: true, opacity: 0.85 });
    const helipadMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.88 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x74b9ff, roughness: 0.15, metalness: 0.45, transparent: true, opacity: 0.82 });

    // 1. L-Shaped Multi-Story Main Complex
    const mainWing = new THREE.Mesh(new THREE.BoxGeometry(width, height, 14), whiteMat);
    mainWing.position.set(0, height / 2, -5);
    mainWing.castShadow = true;
    mainWing.receiveShadow = true;
    group.add(mainWing);

    const sideWing = new THREE.Mesh(new THREE.BoxGeometry(13, height, 10), whiteMat);
    sideWing.position.set(width / 2 - 6.5, height / 2, 7);
    sideWing.castShadow = true;
    sideWing.receiveShadow = true;
    group.add(sideWing);

    // 2. Ribbon Band Windows (3 Floors)
    for (let f = 0; f < 3; f++) {
        const fy = 2.4 + f * 3.4;
        const ribbon1 = new THREE.Mesh(new THREE.BoxGeometry(width - 2, 1.4, 0.12), blueGlassMat);
        ribbon1.position.set(0, fy, 2.05);
        group.add(ribbon1);

        const ribbon2 = new THREE.Mesh(new THREE.BoxGeometry(11, 1.4, 0.12), blueGlassMat);
        ribbon2.position.set(width / 2 - 6.5, fy, 12.05);
        group.add(ribbon2);
    }

    // 3. Ambulance Emergency Drive-Through Canopy
    const canopyFrameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.25, 7.0), canopyFrameMat);
    canopy.position.set(-6.5, 3.8, 5.5);
    group.add(canopy);

    for (const cx of [-10.8, -2.2]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.8, 0.4), canopyFrameMat);
        pillar.position.set(cx, 1.9, 8.8);
        group.add(pillar);
    }

    const canopyGlass = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.08, 5.8), glassMat);
    canopyGlass.position.set(-6.5, 3.95, 5.5);
    group.add(canopyGlass);

    // "HOSPITAL" Illuminated Marquee Signboard
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.1, 0.2), new THREE.MeshStandardMaterial({ color: 0xeb2f06, roughness: 0.5 }));
    signBoard.position.set(-6.5, 4.6, 2.15);
    group.add(signBoard);

    // 4. Rooftop Emergency Helipad
    const helipad = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.18, 32), helipadMat);
    helipad.position.set(6.5, height + 0.1, -5);
    group.add(helipad);

    const helipadRing = new THREE.Mesh(new THREE.RingGeometry(4.4, 4.8, 32), new THREE.MeshBasicMaterial({ color: 0xf1c40f, side: THREE.DoubleSide }));
    helipadRing.rotation.x = -Math.PI / 2;
    helipadRing.position.set(6.5, height + 0.2, -5);
    group.add(helipadRing);

    const hBarL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 3.6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hBarL.position.set(5.2, height + 0.21, -5);
    group.add(hBarL);

    const hBarR = hBarL.clone();
    hBarR.position.x = 7.8;
    group.add(hBarR);

    const hBarC = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.55), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hBarC.position.set(6.5, height + 0.21, -5);
    group.add(hBarC);

    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 8), beaconMat);
        beacon.position.set(6.5 + Math.cos(a) * 5.0, height + 0.3, -5 + Math.sin(a) * 5.0);
        group.add(beacon);
    }

    // 5. Rooftop Elevator Penthouse & HVAC Chillers
    const penthouse = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 4.8), whiteMat);
    penthouse.position.set(-7.5, height + 1.7, -7.5);
    group.add(penthouse);

    for (let hx = -10; hx <= -4; hx += 3.0) {
        const chiller = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.0), darkMat);
        chiller.position.set(hx, height + 0.8, -1.0);
        group.add(chiller);
    }

    // Main building obstacle
    obstacles.push({
        x,
        z,
        w: width,
        d: depth,
        rotY,
        bottom: 0,
        top: height
    });

    // Rooftop Scenery Hitboxes: Elevator Penthouse & Mechanical Chillers
    const pentWorldX = x + (-7.5 * Math.cos(rotY) + -7.5 * Math.sin(rotY));
    const pentWorldZ = z - (-7.5 * Math.sin(rotY) - -7.5 * Math.cos(rotY));
    obstacles.push({
        x: pentWorldX,
        z: pentWorldZ,
        w: 5.2,
        d: 4.8,
        rotY,
        bottom: height,
        top: height + 3.4
    });

    for (let hx = -10; hx <= -4; hx += 3.0) {
        const chillWorldX = x + (hx * Math.cos(rotY) + -1.0 * Math.sin(rotY));
        const chillWorldZ = z - (hx * Math.sin(rotY) - -1.0 * Math.cos(rotY));
        obstacles.push({
            x: chillWorldX,
            z: chillWorldZ,
            w: 2.2,
            d: 2.0,
            rotY,
            bottom: height,
            top: height + 1.6
        });
    }

    buildings.push({
        x,
        z,
        w: width,
        d: depth,
        h: height,
        style: 'hospital',
        rotY,
        roofHeight: 0
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

// Image 3: Police Headquarters & Precinct Station with Helipad & Central POLICE Tower
function createPoliceHeadquarters({ x, z, rotY = 0 }) {
    const width = 26, depth = 18, height = 10.2;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const policeBlueMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.65 });
    const whiteStuccoMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.72 });
    const darkBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9 });
    const securityGlassMat = new THREE.MeshStandardMaterial({ color: 0x74b9ff, metalness: 0.6, roughness: 0.2 });
    const badgeGoldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.85, roughness: 0.25 });

    // 1. Symmetrical White Main Precinct Wings
    for (const sx of [-7.5, 7.5]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(10.5, 8.5, depth), whiteStuccoMat);
        wing.position.set(sx, 4.25, 0);
        wing.castShadow = true;
        wing.receiveShadow = true;
        group.add(wing);

        const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.4, depth + 0.4), policeBlueMat);
        roofTrim.position.set(sx, 8.7, 0);
        group.add(roofTrim);

        const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.8, depth + 0.4), darkBaseMat);
        baseTrim.position.set(sx, 0.4, 0);
        group.add(baseTrim);
    }

    // 2. Central Elevated Police Blue Tower
    const towerH = 12.0;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(7.0, towerH, depth + 0.8), policeBlueMat);
    tower.position.set(0, towerH / 2, 0.2);
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);

    // Vertical White "POLICE" Block Letters on Tower Facade
    const letters = ['P', 'O', 'L', 'I', 'C', 'E'];
    for (let li = 0; li < letters.length; li++) {
        const letterMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        letterMesh.position.set(0, 10.4 - li * 1.35, depth / 2 + 0.7);
        group.add(letterMesh);
    }

    // Police Shield Badge Insignia
    const badgeShield = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 5), badgeGoldMat);
    badgeShield.rotation.x = Math.PI;
    badgeShield.position.set(0, 3.2, depth / 2 + 0.7);
    group.add(badgeShield);

    // 3. Reinforced Security Windows
    for (const sx of [-7.5, 7.5]) {
        for (let f = 0; f < 2; f++) {
            const fy = 2.4 + f * 3.6;
            for (let wx = -3.2; wx <= 3.2; wx += 3.2) {
                const win = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 0.1), securityGlassMat);
                win.position.set(sx + wx, fy, depth / 2 + 0.05);
                group.add(win);
            }
        }
    }

    // 4. Rooftop Tactical Helipad on Left Wing Roof
    const helipad = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.18, 32), policeBlueMat);
    helipad.position.set(-7.5, 8.8, 0);
    group.add(helipad);

    const helipadRing = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.9, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    helipadRing.rotation.x = -Math.PI / 2;
    helipadRing.position.set(-7.5, 8.9, 0);
    group.add(helipadRing);

    const hBarL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 2.8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hBarL.position.set(-8.4, 8.91, 0);
    group.add(hBarL);

    const hBarR = hBarL.clone();
    hBarR.position.x = -6.6;
    group.add(hBarR);

    const hBarC = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.45), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hBarC.position.set(-7.5, 8.91, 0);
    group.add(hBarC);

    // 5. Communications Antenna Mast on Central Tower Roof
    const antennaMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 6.0, 8), darkBaseMat);
    antennaMast.position.set(0, towerH + 3.0, 0);
    group.add(antennaMast);

    const redBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff1122 }));
    redBeacon.position.set(0, towerH + 6.0, 0);
    group.add(redBeacon);

    // Main building obstacle (Left & Right Wings)
    obstacles.push({
        x,
        z,
        w: width,
        d: depth,
        rotY,
        bottom: 0,
        top: 8.5
    });

    // Rooftop Scenery Hitboxes: Central Police Tower & Antenna Spire
    const towerWorldX = x + (0 * Math.cos(rotY) + 0.2 * Math.sin(rotY));
    const towerWorldZ = z - (0 * Math.sin(rotY) - 0.2 * Math.cos(rotY));
    obstacles.push({
        x: towerWorldX,
        z: towerWorldZ,
        w: 7.0,
        d: depth + 0.8,
        rotY,
        bottom: 8.5,
        top: 12.0
    });

    obstacles.push({
        x,
        z,
        w: 1.0,
        d: 1.0,
        rotY,
        bottom: 12.0,
        top: 18.0
    });

    buildings.push({
        x,
        z,
        w: width,
        d: depth,
        h: 8.5,
        style: 'police',
        rotY,
        roofHeight: 0
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

// Hydroelectric Concrete Dam & Reservoir Barrier
function createHydroelectricDam({ x = -180, z = 230, rotY = -0.42 }) {
    const length = 76, height = 12.5, crestWidth = 8.5;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.94 });
    const darkConcreteMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.9 });
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.88 });
    const yellowStripeMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xa4b0be, metalness: 0.7, roughness: 0.3 });

    // 1. Massive Sloped Concrete Dam Wall
    const damBody = new THREE.Mesh(new THREE.BoxGeometry(crestWidth + 6, height, length), concreteMat);
    damBody.position.set(0, height / 2, 0);
    damBody.castShadow = true;
    damBody.receiveShadow = true;
    group.add(damBody);

    // Sloped Spillway Face on Downstream Side
    const spillwayFace = new THREE.Mesh(new THREE.BoxGeometry(8.0, height, length), darkConcreteMat);
    spillwayFace.position.set(6.0, height / 2 - 1.5, 0);
    spillwayFace.rotation.z = -0.32;
    group.add(spillwayFace);

    // 2. Crest Roadway on Top of Dam
    const crestRoad = new THREE.Mesh(new THREE.BoxGeometry(crestWidth, 0.25, length), asphaltMat);
    crestRoad.position.set(0, height + 0.1, 0);
    group.add(crestRoad);

    for (let rz = -length / 2 + 4; rz <= length / 2 - 4; rz += 6.0) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 3.0), yellowStripeMat);
        stripe.position.set(0, height + 0.24, rz);
        group.add(stripe);
    }

    // Steel Safety Crash Barriers
    for (const side of [-1, 1]) {
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, length), railMat);
        barrier.position.set(side * (crestWidth / 2 - 0.2), height + 0.65, 0);
        group.add(barrier);
    }

    // 3. Hydroelectric Intake & Control Towers
    for (const tz of [-20, 20]) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.5, 5.2), concreteMat);
        tower.position.set(-2.0, height + 2.75, tz);
        tower.castShadow = true;
        group.add(tower);

        const win = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 0.1), glassMat);
        win.position.set(-2.0, height + 3.2, tz + 2.65);
        group.add(win);
    }

    // 4. Spillway Chutes & Floodgates (Downstream)
    for (let sz = -18; sz <= 18; sz += 12) {
        const chutePillar = new THREE.Mesh(new THREE.BoxGeometry(1.8, height + 1.2, 2.0), darkConcreteMat);
        chutePillar.position.set(2.8, height / 2 + 0.6, sz);
        group.add(chutePillar);
    }

    obstacles.push({
        x,
        z,
        w: 24,
        d: 78,
        rotY,
        bottom: 0,
        top: height + 0.25
    });

    buildings.push({
        x,
        z,
        w: 24,
        d: 78,
        h: height + 0.25,
        style: 'flat',
        rotY,
        roofHeight: 0
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

// Industrial Shipping Warehouse & Logistics Facility (Corrugated steel siding, concrete loading dock, roll-up shutter doors, rooftop vents)
function createIndustrialWarehouse({ x, z, width, depth, height, w, d, h, rotY = 0 }) {
    const finalW = width || w || 28;
    const finalD = depth || d || 20;
    const finalH = height || h || 9.5;

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.75, metalness: 0.35 });
    const corrugatedMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.85, metalness: 0.2 });
    const safetyYellowMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 });
    const concreteBaseMat = new THREE.MeshStandardMaterial({ color: 0x747d8c, roughness: 0.95 });
    const darkDoorMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8 });

    // 1. Concrete Loading Dock Base (Foundation skirting)
    const baseH = 1.2;
    const base = new THREE.Mesh(new THREE.BoxGeometry(finalW, baseH, finalD), concreteBaseMat);
    base.position.set(0, baseH / 2, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // 2. Main Corrugated Steel Warehouse Body
    const bodyH = finalH - baseH;
    const body = new THREE.Mesh(new THREE.BoxGeometry(finalW, bodyH, finalD), corrugatedMat);
    body.position.set(0, baseH + bodyH / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 3. Roll-up Shutter Loading Dock Doors (Front facade)
    for (let d = -1; d <= 1; d++) {
        const doorX = d * (finalW * 0.28);
        const door = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.2, 0.2), darkDoorMat);
        door.position.set(doorX, baseH + 2.1, finalD / 2 + 0.05);
        group.add(door);

        // Yellow & Black Hazard Stripe Trim above loading bays
        const hazardTrim = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.4, 0.25), safetyYellowMat);
        hazardTrim.position.set(doorX, baseH + 4.4, finalD / 2 + 0.08);
        group.add(hazardTrim);

        // Concrete Loading Bay Bumpers
        for (const bx of [-2.4, 2.4]) {
            const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.4), darkSteelMat);
            bumper.position.set(doorX + bx, baseH / 2, finalD / 2 + 0.2);
            group.add(bumper);
        }
    }

    // 4. Rooftop Industrial Ventilation Units & Skylights
    for (const vx of [-finalW * 0.25, finalW * 0.25]) {
        const vent = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.8, 12), darkSteelMat);
        vent.position.set(vx, finalH + 0.9, 0);
        group.add(vent);

        const ventCap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.8, 12), darkSteelMat);
        ventCap.position.set(vx, finalH + 2.0, 0);
        group.add(ventCap);
    }

    // Main building obstacle
    obstacles.push({
        x,
        z,
        w: finalW,
        d: finalD,
        rotY,
        bottom: 0,
        top: finalH
    });

    // Rooftop Scenery Hitboxes: 2 Industrial Cyclone Ventilation Units
    for (const vx of [-finalW * 0.25, finalW * 0.25]) {
        const ventWorldX = x + (vx * Math.cos(rotY) + 0 * Math.sin(rotY));
        const ventWorldZ = z - (vx * Math.sin(rotY) - 0 * Math.cos(rotY));
        obstacles.push({
            x: ventWorldX,
            z: ventWorldZ,
            w: 2.6,
            d: 2.6,
            rotY,
            bottom: finalH,
            top: finalH + 2.6
        });
    }

    buildings.push({
        x,
        z,
        w: finalW,
        d: finalD,
        h: finalH,
        style: 'warehouse',
        rotY,
        roofHeight: 0
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

// Corporate Glass Skyscraper (Sleek tinted curtain glass, illuminated rooftop helipad, mechanical penthouse, spire beacon)
function createCorporateSkyscraper({ x, z, width, depth, height, w, d, h, rotY = 0 }) {
    const finalW = width || w || 22;
    const finalD = depth || d || 22;
    const finalH = height || h || 36;

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const darkFacadeMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.6, metalness: 0.3 });
    const cyanGlassMat = new THREE.MeshStandardMaterial({ color: 0x00cec9, roughness: 0.15, metalness: 0.85, transparent: true, opacity: 0.9 });
    const chromeTrimMat = new THREE.MeshStandardMaterial({ color: 0xdfe6e9, metalness: 0.9, roughness: 0.2 });
    const helipadPadMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.85 });

    // 1. Ground Level Grand Entrance Plaza & Podium
    const podiumH = 4.5;
    const podium = new THREE.Mesh(new THREE.BoxGeometry(finalW + 2.4, podiumH, finalD + 2.4), darkFacadeMat);
    podium.position.set(0, podiumH / 2, 0);
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);

    // 2. Main Glass Tower Shaft
    const towerH = finalH - podiumH;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(finalW, towerH, finalD), darkFacadeMat);
    tower.position.set(0, podiumH + towerH / 2, 0);
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);

    // Floor-to-Ceiling Tinted Glass Curtain Bands
    const floors = Math.floor(towerH / 3.4);
    for (let f = 0; f < floors; f++) {
        const fy = podiumH + 1.7 + f * 3.4;
        const glassBand = new THREE.Mesh(new THREE.BoxGeometry(finalW + 0.08, 2.2, finalD + 0.08), cyanGlassMat);
        glassBand.position.set(0, fy, 0);
        group.add(glassBand);
    }

    // 3. Rooftop Mechanical Penthouse & Crown (North half of roof)
    const crownH = 3.2;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(finalW * 0.8, crownH, finalD * 0.45), chromeTrimMat);
    crown.position.set(0, finalH + crownH / 2, -finalD * 0.25);
    group.add(crown);

    // 4. Rooftop Tactical Helipad (Open South deck directly off the roof ladder)
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.2, 32), helipadPadMat);
    pad.position.set(0, finalH + 0.1, finalD * 0.22);
    group.add(pad);

    const padRing = new THREE.Mesh(new THREE.RingGeometry(4.4, 4.8, 32), new THREE.MeshBasicMaterial({ color: 0xf1c40f, side: THREE.DoubleSide }));
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(0, finalH + 0.22, finalD * 0.22);
    group.add(padRing);

    // 'H' Helipad Marking
    const hBarL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 3.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hBarL.position.set(-1.1, finalH + 0.23, finalD * 0.22);
    group.add(hBarL);
    const hBarR = hBarL.clone();
    hBarR.position.x = 1.1;
    group.add(hBarR);
    const hBarC = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hBarC.position.set(0, finalH + 0.23, finalD * 0.22);
    group.add(hBarC);

    // 5. Communications Antenna Spire on Penthouse Crown
    const antennaH = 9.0;
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, antennaH, 8), chromeTrimMat);
    antenna.position.set(0, finalH + crownH + antennaH / 2, -finalD * 0.25);
    group.add(antenna);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4757 }));
    beacon.position.set(0, finalH + crownH + antennaH, -finalD * 0.25);
    group.add(beacon);

    // Main tower body obstacle
    obstacles.push({
        x,
        z,
        w: finalW,
        d: finalD,
        rotY,
        bottom: 0,
        top: finalH
    });

    // Rooftop Scenery Hitboxes: Mechanical Penthouse Crown & Spire
    const crownWorldX = x + (0 * Math.cos(rotY) + (-finalD * 0.25) * Math.sin(rotY));
    const crownWorldZ = z - (0 * Math.sin(rotY) - (-finalD * 0.25) * Math.cos(rotY));
    obstacles.push({
        x: crownWorldX,
        z: crownWorldZ,
        w: finalW * 0.8,
        d: finalD * 0.45,
        rotY,
        bottom: finalH,
        top: finalH + crownH
    });

    obstacles.push({
        x: crownWorldX,
        z: crownWorldZ,
        w: 1.0,
        d: 1.0,
        rotY,
        bottom: finalH + crownH,
        top: finalH + crownH + antennaH
    });

    buildings.push({
        x,
        z,
        w: finalW,
        d: finalD,
        h: finalH,
        style: 'skyscraper',
        rotY,
        roofHeight: 0
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

// Master Building Creator
function createBuilding({ x, z, width, depth, height, w, d, h, style = 'flat', rotY = 0 }) {
    const finalW = width || w || 16;
    const finalD = depth || d || 16;
    const finalH = height || h || 14;

    if (style === 'cottage') {
        createLowPolyCottage({ x, z, width: finalW, depth: finalD, height: finalH, rotY });
        return;
    }
    if (style === 'cabin') {
        createLowPolyLogCabin({ x, z, width: finalW, depth: finalD, height: finalH, rotY });
        return;
    }
    if (style === 'villa') {
        createLowPolyModernVilla({ x, z, width: finalW, depth: finalD, height: finalH, rotY });
        return;
    }
    if (style === 'donut') {
        createGiantDonutDiner({ x, z, rotY });
        return;
    }
    if (style === 'hospital') {
        createCityHospital({ x, z, rotY });
        return;
    }
    if (style === 'police') {
        createPoliceHeadquarters({ x, z, rotY });
        return;
    }
    if (style === 'warehouse') {
        createIndustrialWarehouse({ x, z, width: finalW, depth: finalD, height: finalH, rotY });
        return;
    }
    if (style === 'skyscraper') {
        createCorporateSkyscraper({ x, z, width: finalW, depth: finalD, height: finalH, rotY });
        return;
    }

    // Downtown Flat High-Rises
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const houseColor = new THREE.Color(
        0.38 + Math.random() * 0.16,
        0.39 + Math.random() * 0.16,
        0.41 + Math.random() * 0.16
    );
    const bodyMat = new THREE.MeshStandardMaterial({ color: houseColor, roughness: 0.85 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(finalW, finalH, finalD), bodyMat);
    body.position.y = finalH / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofBorder = new THREE.Mesh(new THREE.BoxGeometry(finalW + 0.4, 0.4, finalD + 0.4), darkMat);
    roofBorder.position.y = finalH + 0.2;
    roofBorder.castShadow = true;
    group.add(roofBorder);

    const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), darkMat);
    hvac.position.set(finalW / 4, finalH + 0.8, finalD / 4);
    hvac.castShadow = true;
    group.add(hvac);

    const hvacTop = finalH + 1.6;
    obstacles.push({
        x: x + finalW / 4,
        z: z + finalD / 4,
        w: 2.6,
        d: 2.6,
        bottom: finalH - 0.5,
        top: hvacTop
    });

    let towerData = null;
    if (finalH > 16) {
        const tower = new THREE.Mesh(
            new THREE.CylinderGeometry(1.8, 1.8, 2.8, 10),
            new THREE.MeshStandardMaterial({ color: 0x5a483a, roughness: 0.9 })
        );
        tower.position.set(-finalW / 4, finalH + 2.2, -finalD / 4);
        tower.castShadow = true;
        group.add(tower);

        const towerTop = finalH + 2.2 + 1.4;
        obstacles.push({
            x: x - finalW / 4,
            z: z - finalD / 4,
            w: 3.8,
            d: 3.8,
            bottom: finalH - 0.5,
            top: towerTop
        });

        towerData = {
            x: x - finalW / 4,
            z: z - finalD / 4,
            radius: 1.9,
            top: towerTop
        };
    }

    const bldgData = {
        x,
        z,
        w: finalW,
        d: finalD,
        h: finalH,
        style: 'flat',
        roofHeight: 0,
        hvac: { x: x + finalW / 4, z: z + finalD / 4, w: 2.6, d: 2.6, top: finalH + 1.6 },
        tower: towerData
    };

    obstacles.push({
        x,
        z,
        w: finalW,
        d: finalD,
        bottom: 0,
        top: finalH
    });

    buildings.push(bldgData);

    const floors = Math.max(1, Math.floor(finalH / 3.2));
    const columns = Math.max(2, Math.floor(finalW / 3.2));

    for (let floor = 0; floor < floors; floor++) {
        for (let col = 0; col < columns; col++) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.08), glassMat);
            const wx = -finalW / 2 + (col + 0.6) * (finalW / columns);
            const wy = 2 + floor * 3.2;
            const wz = finalD / 2 + 0.04;
            win.position.set(wx, wy, wz);
            group.add(win);

            const winBack = win.clone();
            winBack.position.z = -finalD / 2 - 0.04;
            group.add(winBack);
        }
    }

    scene.add(group);
    staticRaycastTargets.push(group);
}

// Generate Massive Open World: 3 Major Cities & 5 Distinct Small Towns & Hamlets
export function buildMassiveCity(scene, staticRaycastTargets = []) {
    function generateMassiveCity() {
    // ==========================================
    // 1. BIG CITY 1: METRO CENTRAL (Downtown Capital & Financial Core)
    // ==========================================
    createCityHospital({ x: 56, z: -26, rotY: 0 }); // North emergency bay faces Central Boulevard Z = 0
    createPoliceHeadquarters({ x: -26, z: -56, rotY: Math.PI / 2 }); // East precinct facade faces Central Avenue X = 0
    createGiantDonutDiner({ x: 24, z: 56, rotY: -Math.PI / 2 }); // West dining patio faces Central Avenue X = 0
    createCorporateSkyscraper({ x: -56, z: 56, width: 22, depth: 22, height: 38, rotY: 0 });
    createHydroelectricDam({ x: -180, z: 230, rotY: -0.42 });

    const downtownBlocks = [
        { xs: [28, 56, 84], zs: [28, 56, 84] },
        { xs: [-84, -56, -28], zs: [28, 56, 84] },
        { xs: [28, 56, 84], zs: [-84, -56, -28] },
        { xs: [-84, -56, -28], zs: [-84, -56, -28] }
    ];
    for (const b of downtownBlocks) {
        for (const x of b.xs) {
            for (const z of b.zs) {
                // Skip roadside slots occupied by civic landmarks and corporate skyscraper
                if ((x === 28 && z === 56) || (x === -28 && z === -56) || (x === 56 && z === -28) || (x === -56 && z === 56)) {
                    continue;
                }
                const w = 14 + Math.random() * 6;
                const d = 14 + Math.random() * 6;
                const h = 16 + Math.random() * 22;
                createBuilding({ x, z, width: w, depth: d, height: h, style: 'flat' });
            }
        }
    }

    // ==========================================
    // 2. BIG CITY 2: EAST PORT & INDUSTRIAL CITY (Manufacturing & Shipping Hub)
    // ==========================================
    makeResidentialRoad(280, -185, 280, 65, 9.5);
    makeResidentialRoad(195, -40, 275, -40, 9.5);
    makeResidentialRoad(285, -40, 365, -40, 9.5);

    const eastPortBuildings = [
        // Industrial Freight Warehouses & Loading Docks (Set back safely from road corridors)
        { x: 235, z: -85, w: 26, d: 18, h: 9.5, rotY: 0, style: 'warehouse' },
        { x: 325, z: -85, w: 26, d: 18, h: 9.5, rotY: 0, style: 'warehouse' },
        { x: 235, z: 15, w: 26, d: 18, h: 9.5, rotY: Math.PI / 2, style: 'warehouse' },
        { x: 325, z: 15, w: 26, d: 18, h: 9.5, rotY: -Math.PI / 2, style: 'warehouse' },
        // Corporate Port Logistics Towers
        { x: 235, z: -135, w: 22, d: 22, h: 34, rotY: 0, style: 'skyscraper' },
        { x: 325, z: -135, w: 20, d: 20, h: 28, rotY: 0, style: 'skyscraper' }
    ];
    for (const b of eastPortBuildings) {
        createBuilding(b);
    }
    createGiantDonutDiner({ x: 280, z: -175, rotY: 0 }); // Sits on the avenue corridor with clear street frontage

    // ==========================================
    // 3. BIG CITY 3: SOUTH METRO (Modern Tech Metropolis & Commercial Hub)
    // ==========================================
    makeResidentialRoad(-105, -340, 225, -340, 9.5);
    makeResidentialRoad(0, -425, 0, -345, 8.5);
    makeResidentialRoad(0, -335, 0, -280, 8.5);
    makeResidentialRoad(120, -400, 120, -345, 8.5);
    makeResidentialRoad(120, -335, 120, -280, 8.5);

    const southMetroBuildings = [
        { x: -45, z: -295, w: 22, d: 22, h: 42, rotY: 0, style: 'skyscraper' },
        { x: 60, z: -295, w: 24, d: 24, h: 36, rotY: 0, style: 'skyscraper' },
        { x: 165, z: -295, w: 22, d: 22, h: 38, rotY: 0, style: 'skyscraper' },
        { x: -45, z: -385, w: 20, d: 20, h: 32, rotY: 0, style: 'skyscraper' },
        { x: 60, z: -385, w: 24, d: 24, h: 40, rotY: 0, style: 'skyscraper' },
        { x: 165, z: -385, w: 22, d: 22, h: 34, rotY: 0, style: 'skyscraper' }
    ];
    for (const b of southMetroBuildings) {
        createBuilding(b);
    }
    createPoliceHeadquarters({ x: -85, z: -340, rotY: Math.PI / 2 });
    createCityHospital({ x: 205, z: -340, rotY: -Math.PI / 2 });
    createGiantDonutDiner({ x: 18, z: -385, rotY: -Math.PI / 2 });

    // ==========================================
    // 4. SMALL TOWN 1: LAKESIDE HAVEN (North Shore Luxury Villa Town)
    // ==========================================
    makeResidentialRoad(-230, 185, 230, 185, 8.5);
    makeResidentialRoad(-170, 189.5, -170, 225, 7.5);
    makeResidentialRoad(-65, 189.5, -65, 225, 7.5);
    makeResidentialRoad(65, 189.5, 65, 225, 7.5);
    makeResidentialRoad(170, 189.5, 170, 225, 7.5);

    const northVillas = [
        { x: -196, z: 205, rotY: Math.PI / 2, dw: [-170, 205, -188, 205] },
        { x: -144, z: 212, rotY: -Math.PI / 2, dw: [-170, 212, -152, 212] },
        { x: -160, z: 215, rotY: Math.PI, dw: [-160, 205, -160, 210] },
        { x: -198, z: 160, rotY: 0.15, dw: [-198, 185, -198, 168] },
        { x: -140, z: 162, rotY: -0.15, dw: [-140, 185, -140, 170] },

        { x: -92, z: 205, rotY: Math.PI / 2, dw: [-65, 205, -84, 205] },
        { x: -38, z: 212, rotY: -Math.PI / 2, dw: [-65, 212, -46, 212] },
        { x: -65, z: 215, rotY: Math.PI, dw: [-65, 205, -65, 210] },
        { x: -92, z: 160, rotY: 0.2, dw: [-92, 185, -92, 168] },
        { x: -38, z: 162, rotY: -0.2, dw: [-38, 185, -38, 170] },

        { x: 38, z: 212, rotY: Math.PI / 2, dw: [65, 212, 46, 212] },
        { x: 92, z: 205, rotY: -Math.PI / 2, dw: [65, 205, 84, 205] },
        { x: 65, z: 215, rotY: Math.PI, dw: [65, 205, 65, 210] },
        { x: 38, z: 162, rotY: 0.2, dw: [38, 185, 38, 170] },
        { x: 92, z: 160, rotY: -0.2, dw: [92, 185, 92, 168] },

        { x: 144, z: 212, rotY: Math.PI / 2, dw: [170, 212, 152, 212] },
        { x: 196, z: 205, rotY: -Math.PI / 2, dw: [170, 205, 188, 205] },
        { x: 170, z: 215, rotY: Math.PI, dw: [170, 205, 170, 210] },
        { x: 140, z: 162, rotY: 0.15, dw: [140, 185, 140, 170] },
        { x: 198, z: 160, rotY: -0.15, dw: [198, 185, 198, 168] }
    ];
    for (const v of northVillas) {
        createBuilding({ x: v.x, z: v.z, width: 16, depth: 15, height: 7.8, style: 'villa', rotY: v.rotY });
        if (v.dw) makeDriveway(scene, staticRaycastTargets, v.dw[0], v.dw[1], v.dw[2], v.dw[3]);
    }

    // ==========================================
    // 5. SMALL TOWN 2: PINECREST VILLAGE (North-West Alpine Mountain Hamlet)
    // ==========================================
    makeResidentialRoad(-285, 120, -285, 230, 7.5);

    const pinecrestCabins = [
        { x: -255, z: 140, rotY: 0.3, dw: [-285, 140, -263, 140] },
        { x: -315, z: 140, rotY: -0.3, dw: [-285, 140, -307, 140] },
        { x: -255, z: 175, rotY: Math.PI / 2, dw: [-285, 175, -263, 175] },
        { x: -315, z: 175, rotY: -Math.PI / 2, dw: [-285, 175, -307, 175] },
        { x: -255, z: 210, rotY: Math.PI - 0.2, dw: [-285, 210, -263, 210] },
        { x: -315, z: 210, rotY: Math.PI + 0.2, dw: [-285, 210, -307, 210] },
        { x: -285, z: 215, rotY: Math.PI, dw: [-285, 205, -285, 210] }
    ];
    for (const c of pinecrestCabins) {
        createBuilding({ x: c.x, z: c.z, width: 14, depth: 13, height: 6.2, style: 'cabin', rotY: c.rotY });
        if (c.dw) makeDriveway(scene, staticRaycastTargets, c.dw[0], c.dw[1], c.dw[2], c.dw[3]);
    }

    // ==========================================
    // 6. SMALL TOWN 3: PALM VALLEY (West Tropical Coast Town)
    // ==========================================
    makeResidentialRoad(-185, -105, -185, 105, 8.5);
    makeResidentialRoad(-235, 65, -189.5, 65, 7.5);
    makeResidentialRoad(-235, 0, -189.5, 0, 7.5);
    makeResidentialRoad(-235, -65, -189.5, -65, 7.5);

    const palmValleyCottages = [
        { x: -210, z: 86, rotY: Math.PI, dw: [-210, 65, -210, 80] },
        { x: -210, z: 44, rotY: 0, dw: [-210, 65, -210, 50] },
        { x: -246, z: 65, rotY: -Math.PI / 2, dw: [-235, 65, -240, 65] },

        { x: -210, z: 21, rotY: Math.PI, dw: [-210, 0, -210, 15] },
        { x: -210, z: -21, rotY: 0, dw: [-210, 0, -210, -15] },
        { x: -246, z: 0, rotY: -Math.PI / 2, dw: [-235, 0, -240, 0] },

        { x: -210, z: -44, rotY: Math.PI, dw: [-210, -65, -210, -50] },
        { x: -210, z: -86, rotY: 0, dw: [-210, -65, -210, -80] },
        { x: -246, z: -65, rotY: -Math.PI / 2, dw: [-235, -65, -240, -65] },

        { x: -160, z: 75, rotY: -Math.PI / 2, dw: [-185, 75, -167, 75] },
        { x: -160, z: 25, rotY: -Math.PI / 2, dw: [-185, 25, -167, 25] },
        { x: -160, z: -25, rotY: -Math.PI / 2, dw: [-185, -25, -167, -25] },
        { x: -160, z: -75, rotY: -Math.PI / 2, dw: [-185, -75, -167, -75] }
    ];
    for (const c of palmValleyCottages) {
        createBuilding({ x: c.x, z: c.z, width: 13, depth: 12, height: 5.8, style: 'cottage', rotY: c.rotY });
        if (c.dw) makeDriveway(scene, staticRaycastTargets, c.dw[0], c.dw[1], c.dw[2], c.dw[3]);
    }

    // ==========================================
    // 7. SMALL TOWN 4: OAKRIDGE (South-West Craftsman Suburb Town)
    // ==========================================
    makeResidentialRoad(-185, -260, -185, -140, 8.5);
    makeResidentialRoad(-235, -200, -189.5, -200, 7.5);

    const oakridgeHomes = [
        { x: -196, z: -205, rotY: -Math.PI / 2, dw: [-185, -205, -190, -205] },
        { x: -144, z: -218, rotY: Math.PI / 2, dw: [-185, -218, -152, -218] },
        { x: -170, z: -246, rotY: 0, dw: [-185, -235, -170, -239] },
        { x: -198, z: -160, rotY: Math.PI - 0.15, dw: [-185, -160, -192, -160] },
        { x: -140, z: -162, rotY: Math.PI + 0.15, dw: [-185, -162, -148, -162] },
        { x: -246, z: -200, rotY: -Math.PI / 2, dw: [-235, -200, -240, -200] },
        { x: -210, z: -170, rotY: Math.PI, dw: [-210, -180, -210, -175] },
        { x: -210, z: -230, rotY: 0, dw: [-210, -220, -210, -225] }
    ];
    for (const h of oakridgeHomes) {
        createBuilding({ x: h.x, z: h.z, width: 14, depth: 13, height: 6.2, style: 'cabin', rotY: h.rotY });
        if (h.dw) makeDriveway(scene, staticRaycastTargets, h.dw[0], h.dw[1], h.dw[2], h.dw[3]);
    }

    // ==========================================
    // 8. SMALL TOWN 5: DELTA CROSS (East River Fishing Hamlet)
    // ==========================================
    makeResidentialRoad(340, 220, 340, 330, 7.5);

    const deltaCrossCottages = [
        { x: 315, z: 240, rotY: 0.2, dw: [340, 240, 323, 240] },
        { x: 365, z: 240, rotY: -0.2, dw: [340, 240, 357, 240] },
        { x: 315, z: 275, rotY: Math.PI / 2, dw: [340, 275, 323, 275] },
        { x: 365, z: 275, rotY: -Math.PI / 2, dw: [340, 275, 357, 275] },
        { x: 315, z: 310, rotY: Math.PI, dw: [340, 310, 323, 310] },
        { x: 365, z: 310, rotY: Math.PI, dw: [340, 310, 357, 310] }
    ];
    for (const c of deltaCrossCottages) {
        createBuilding({ x: c.x, z: c.z, width: 13, depth: 12, height: 5.8, style: 'cottage', rotY: c.rotY });
        if (c.dw) makeDriveway(scene, staticRaycastTargets, c.dw[0], c.dw[1], c.dw[2], c.dw[3]);
    }
}
    generateMassiveCity();
    return buildings;
}