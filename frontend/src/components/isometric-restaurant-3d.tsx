'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Sparkles, Utensils, Flame, Coffee, CheckCircle2, ChevronRight, Eye } from 'lucide-react';
import { RestaurantTable, TableStatus } from '@/lib/types';

interface IsometricRestaurant3DProps {
  tables?: RestaurantTable[];
  selectedBranchName?: string;
  onSelectTable?: (tableNumber: string) => void;
  className?: string;
}

interface Table3DData {
  id: string;
  number: string;
  status: TableStatus;
  group: THREE.Group;
  indicator: THREE.Mesh;
  hoverLight: THREE.PointLight;
  baseY: number;
  highlighted: boolean;
}

export function IsometricRestaurant3D({
  tables = [],
  selectedBranchName = 'Chi nhánh Flagship',
  onSelectTable,
  className = '',
}: IsometricRestaurant3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredTable, setHoveredTable] = useState<{
    number: string;
    status: TableStatus;
    capacity: number;
  } | null>(null);
  const [isWebGLSupported, setIsWebGLSupported] = useState(true);
  const [activeViewMode, setActiveViewMode] = useState<'all' | 'hot' | 'bar' | 'tables'>('all');

  // Interactive mouse tracking
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseNormRef = useRef(new THREE.Vector2(-999, -999));
  const tables3DRef = useRef<Table3DData[]>([]);
  const dioramaGroupRef = useRef<THREE.Group | null>(null);
  const lightsRef = useRef<{
    kitchenPoint?: THREE.PointLight;
    barPoint?: THREE.PointLight;
    ambient?: THREE.AmbientLight;
  }>({});

  // Handle pointer move inside canvas
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized -1 to +1 for camera parallax tilt
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;
    mouseRef.current.targetX = normX;
    mouseRef.current.targetY = normY;

    // For raycaster
    mouseNormRef.current.x = normX;
    mouseNormRef.current.y = -normY;
  }, []);

  const handlePointerLeave = useCallback(() => {
    mouseRef.current.targetX = 0;
    mouseRef.current.targetY = 0;
    mouseNormRef.current.x = -999;
    mouseNormRef.current.y = -999;
    setHoveredTable(null);
  }, []);

  const handleClick = useCallback(() => {
    if (hoveredTable && onSelectTable) {
      onSelectTable(hoveredTable.number);
    }
  }, [hoveredTable, onSelectTable]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setIsWebGLSupported(false);
        return;
      }
    } catch {
      setIsWebGLSupported(false);
      return;
    }

    // SCENE
    const scene = new THREE.Scene();
    scene.background = null; // Transparent to blend seamlessly with page

    // CAMERA: True Isometric Orthographic Camera
    const aspect = container.clientWidth / container.clientHeight;
    const frustumSize = 22;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );

    // Classic isometric angle: 45° azimuth, ~35.264° elevation
    const cameraDist = 45;
    camera.position.set(cameraDist, cameraDist * 0.85, cameraDist);
    camera.lookAt(0, 0.5, 0);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // ROOT DIORAMA GROUP (Everything tilts smoothly from this node)
    const diorama = new THREE.Group();
    diorama.position.set(0, -1.0, 0);
    scene.add(diorama);
    dioramaGroupRef.current = diorama;

    // ==========================================
    // PROCEDURAL TEXTURES (Instant load, zero assets)
    // ==========================================
    // 1. Luxury Dark Slate Tile Floor
    const createFloorCanvas = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 512, 512);

        // Grid tiles with subtle bevel
        const tileSize = 64;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        for (let x = 0; x <= 512; x += tileSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 512);
          ctx.stroke();
        }
        for (let y = 0; y <= 512; y += tileSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(512, y);
          ctx.stroke();
        }

        // Subtle slate micro-noise
        for (let i = 0; i < 2000; i++) {
          const nx = Math.random() * 512;
          const ny = Math.random() * 512;
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.04)';
          ctx.fillRect(nx, ny, 2, 2);
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      return tex;
    };

    // 2. Kitchen Wall Grid
    const createKitchenWallCanvas = () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        const s = 32;
        for (let x = 0; x <= 256; x += s) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 256);
          ctx.stroke();
        }
        for (let y = 0; y <= 256; y += s) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(256, y);
          ctx.stroke();
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 2);
      return tex;
    };

    const floorTex = createFloorCanvas();
    const kitchenWallTex = createKitchenWallCanvas();

    // ==========================================
    // MATERIALS PALETTE
    // ==========================================
    const mats = {
      baseSlab: new THREE.MeshStandardMaterial({
        color: 0x090d16,
        roughness: 0.6,
        metalness: 0.2,
      }),
      floor: new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.45,
        metalness: 0.1,
      }),
      floorBorder: new THREE.MeshStandardMaterial({
        color: 0x318bff,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.35,
        roughness: 0.2,
      }),
      walls: new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.7,
        metalness: 0.1,
      }),
      kitchenWall: new THREE.MeshStandardMaterial({
        map: kitchenWallTex,
        roughness: 0.3,
        metalness: 0.1,
      }),
      woodSlat: new THREE.MeshStandardMaterial({
        color: 0x92400e,
        roughness: 0.5,
        metalness: 0.05,
      }),
      stainlessSteel: new THREE.MeshStandardMaterial({
        color: 0xcfd8dc,
        roughness: 0.25,
        metalness: 0.85,
      }),
      warmWood: new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.4,
        metalness: 0.05,
      }),
      darkMarble: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.2,
        metalness: 0.3,
      }),
      brassGold: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.3,
        metalness: 0.85,
      }),
      porcelainWhite: new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.2,
        metalness: 0.05,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.45,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.8,
      }),
      plantPot: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.6,
      }),
      plantLeaf: new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.4,
      }),
      // Status Beacon Materials
      statusAvailable: new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      }),
      statusOccupied: new THREE.MeshStandardMaterial({
        color: 0xff9500,
        emissive: 0xff9500,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      }),
      statusReserved: new THREE.MeshStandardMaterial({
        color: 0x318bff,
        emissive: 0x318bff,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      }),
    };

    // ==========================================
    // 1. DIORAMA PLATFORM BASE & FLOOR
    // ==========================================
    // Base slab (chunky architectural foundation)
    const baseGeo = new THREE.BoxGeometry(22, 1.2, 17);
    const baseMesh = new THREE.Mesh(baseGeo, mats.baseSlab);
    baseMesh.position.y = -0.6;
    baseMesh.receiveShadow = true;
    diorama.add(baseMesh);

    // Floor surface
    const floorGeo = new THREE.BoxGeometry(21.4, 0.1, 16.4);
    const floorMesh = new THREE.Mesh(floorGeo, mats.floor);
    floorMesh.position.y = 0.05;
    floorMesh.receiveShadow = true;
    diorama.add(floorMesh);

    // Futuristic cyan rim highlight around floor edge
    const rimGeo = new THREE.BoxGeometry(21.6, 0.05, 0.1);
    const rimMeshFront = new THREE.Mesh(rimGeo, mats.floorBorder);
    rimMeshFront.position.set(0, 0.1, 8.2);
    diorama.add(rimMeshFront);

    const rimGeoSide = new THREE.BoxGeometry(0.1, 0.05, 16.4);
    const rimMeshRight = new THREE.Mesh(rimGeoSide, mats.floorBorder);
    rimMeshRight.position.set(10.8, 0.1, 0);
    diorama.add(rimMeshRight);

    // ==========================================
    // 2. WALLS & ARCHITECTURAL STRUCTURE
    // ==========================================
    // Back Wall (Separates dining from kitchen pass)
    const backWallGeo = new THREE.BoxGeometry(21.4, 3.6, 0.6);
    const backWall = new THREE.Mesh(backWallGeo, mats.kitchenWall);
    backWall.position.set(0, 1.8, -8.2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    diorama.add(backWall);

    // Left Wall
    const leftWallGeo = new THREE.BoxGeometry(0.6, 3.6, 16.4);
    const leftWall = new THREE.Mesh(leftWallGeo, mats.walls);
    leftWall.position.set(-10.7, 1.8, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    diorama.add(leftWall);

    // Decorative vertical wood slats on Left Wall
    for (let z = -6.5; z <= 6.5; z += 0.8) {
      const slatGeo = new THREE.BoxGeometry(0.15, 3.2, 0.3);
      const slat = new THREE.Mesh(slatGeo, mats.woodSlat);
      slat.position.set(-10.35, 1.8, z);
      slat.castShadow = true;
      diorama.add(slat);
    }

    // Warm cove lighting strip under back wall trim
    const coveLightGeo = new THREE.BoxGeometry(21.0, 0.1, 0.2);
    const coveMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const coveLight = new THREE.Mesh(coveLightGeo, coveMat);
    coveLight.position.set(0, 3.55, -7.8);
    diorama.add(coveLight);

    // ==========================================
    // 3. KITCHEN STATION (BẾP KDS) - BACK AREA
    // ==========================================
    const kitchenGroup = new THREE.Group();
    kitchenGroup.position.set(2.5, 0, -6.2);

    // Stainless steel pass-through counter
    const counterGeo = new THREE.BoxGeometry(9.0, 1.3, 2.0);
    const counter = new THREE.Mesh(counterGeo, mats.stainlessSteel);
    counter.position.y = 0.65;
    counter.castShadow = true;
    counter.receiveShadow = true;
    kitchenGroup.add(counter);

    // Overhead order pickup rack / heat lamps
    const rackGeo = new THREE.BoxGeometry(8.6, 0.1, 1.2);
    const rack = new THREE.Mesh(rackGeo, mats.stainlessSteel);
    rack.position.set(0, 2.5, 0);
    rack.castShadow = true;
    kitchenGroup.add(rack);

    // Mini heat lamps under rack
    [-3, -1, 1, 3].forEach((lx) => {
      const lampGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.35, 8);
      const lamp = new THREE.Mesh(lampGeo, mats.brassGold);
      lamp.position.set(lx, 2.3, 0);
      kitchenGroup.add(lamp);
    });

    // Induction cooktop surfaces on counter
    [-2.5, -0.5].forEach((cx) => {
      const hobGeo = new THREE.BoxGeometry(1.6, 0.05, 1.2);
      const hobMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 });
      const hob = new THREE.Mesh(hobGeo, hobMat);
      hob.position.set(cx, 1.32, 0);
      kitchenGroup.add(hob);

      // Frying pan with handle
      const panGeo = new THREE.CylinderGeometry(0.5, 0.45, 0.15, 12);
      const pan = new THREE.Mesh(panGeo, mats.stainlessSteel);
      pan.position.set(cx, 1.45, 0);
      kitchenGroup.add(pan);

      const handleGeo = new THREE.BoxGeometry(0.6, 0.05, 0.1);
      const handle = new THREE.Mesh(handleGeo, mats.stainlessSteel);
      handle.position.set(cx + 0.6, 1.48, 0);
      kitchenGroup.add(handle);
    });

    // Stacked porcelain ramen/pho bowls
    [1.8, 2.8].forEach((bx) => {
      for (let i = 0; i < 3; i++) {
        const bowlGeo = new THREE.CylinderGeometry(0.4, 0.25, 0.22, 12);
        const bowl = new THREE.Mesh(bowlGeo, mats.porcelainWhite);
        bowl.position.set(bx, 1.4 + i * 0.18, 0.2);
        bowl.castShadow = true;
        kitchenGroup.add(bowl);
      }
    });

    // Kitchen Station Signboard (Glowing Orange)
    const signBoxGeo = new THREE.BoxGeometry(3.6, 0.6, 0.2);
    const signBoxMat = new THREE.MeshStandardMaterial({
      color: 0xff9500,
      emissive: 0xff7700,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const signBox = new THREE.Mesh(signBoxGeo, signBoxMat);
    signBox.position.set(0, 3.1, -1.8);
    kitchenGroup.add(signBox);

    diorama.add(kitchenGroup);

    // ==========================================
    // 4. BAR & BEVERAGE STATION - LEFT AREA
    // ==========================================
    const barGroup = new THREE.Group();
    barGroup.position.set(-8.2, 0, -2.5);

    // Dark walnut bar counter with marble top
    const barBaseGeo = new THREE.BoxGeometry(2.2, 1.3, 7.5);
    const barBase = new THREE.Mesh(barBaseGeo, mats.warmWood);
    barBase.position.y = 0.65;
    barBase.castShadow = true;
    barBase.receiveShadow = true;
    barGroup.add(barBase);

    const barTopGeo = new THREE.BoxGeometry(2.4, 0.1, 7.7);
    const barTop = new THREE.Mesh(barTopGeo, mats.darkMarble);
    barTop.position.y = 1.35;
    barTop.castShadow = true;
    barGroup.add(barTop);

    // Overhead brass glass rack
    const brassRackGeo = new THREE.BoxGeometry(1.6, 0.08, 6.0);
    const brassRack = new THREE.Mesh(brassRackGeo, mats.brassGold);
    brassRack.position.set(0, 2.7, 0);
    barGroup.add(brassRack);

    // Hanging cocktail glasses
    [-2, -1, 0, 1, 2].forEach((gz) => {
      const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6);
      const stem = new THREE.Mesh(stemGeo, mats.glass);
      stem.position.set(0, 2.45, gz);
      barGroup.add(stem);

      const cupGeo = new THREE.ConeGeometry(0.2, 0.25, 8);
      cupGeo.rotateX(Math.PI);
      const cup = new THREE.Mesh(cupGeo, mats.glass);
      cup.position.set(0, 2.3, gz);
      barGroup.add(cup);
    });

    // Espresso Coffee Machine (Stainless steel + black panel)
    const coffeeGeo = new THREE.BoxGeometry(1.1, 0.9, 1.4);
    const coffeeMachine = new THREE.Mesh(coffeeGeo, mats.stainlessSteel);
    coffeeMachine.position.set(0, 1.85, -2.2);
    coffeeMachine.castShadow = true;
    barGroup.add(coffeeMachine);

    // Bar Stools
    [-2.2, 0, 2.2].forEach((sz) => {
      const stoolGroup = new THREE.Group();
      stoolGroup.position.set(1.7, 0, sz);

      // Cushion
      const seatGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.15, 16);
      const seat = new THREE.Mesh(seatGeo, mats.darkMarble);
      seat.position.y = 0.95;
      seat.castShadow = true;
      stoolGroup.add(seat);

      // Center post & footrest
      const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8);
      const leg = new THREE.Mesh(legGeo, mats.brassGold);
      leg.position.y = 0.45;
      stoolGroup.add(leg);

      const baseRingGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 12);
      const baseRing = new THREE.Mesh(baseRingGeo, mats.brassGold);
      baseRing.position.y = 0.05;
      stoolGroup.add(baseRing);

      barGroup.add(stoolGroup);
    });

    diorama.add(barGroup);

    // ==========================================
    // 5. DINING ROOM: 6 TABLES (T-01 to T-06)
    // ==========================================
    const tableConfigs = [
      { id: 't1', number: 'T-01', x: -4.5, z: 4.2, defaultStatus: 'available' as TableStatus },
      { id: 't2', number: 'T-02', x: 0.5, z: 4.2, defaultStatus: 'occupied' as TableStatus },
      { id: 't3', number: 'T-03', x: 5.5, z: 4.2, defaultStatus: 'available' as TableStatus },
      { id: 't4', number: 'T-04', x: -4.5, z: -0.2, defaultStatus: 'reserved' as TableStatus },
      { id: 't5', number: 'T-05', x: 0.5, z: -0.2, defaultStatus: 'occupied' as TableStatus },
      { id: 't6', number: 'T-06', x: 5.5, z: -0.2, defaultStatus: 'available' as TableStatus },
    ];

    const tables3DList: Table3DData[] = [];

    tableConfigs.forEach((cfg) => {
      // Find matching live table if available
      const liveTable = tables.find((t) => t.number === cfg.number);
      const status: TableStatus = liveTable ? liveTable.status : cfg.defaultStatus;

      const tableGroup = new THREE.Group();
      tableGroup.position.set(cfg.x, 0, cfg.z);
      tableGroup.userData = { tableNumber: cfg.number, status, capacity: liveTable?.capacity || 4 };

      // Table Top (Rounded Rectangular / Soft Cylinder)
      const topGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.12, 24);
      const top = new THREE.Mesh(topGeo, mats.warmWood);
      top.position.y = 1.05;
      top.castShadow = true;
      top.receiveShadow = true;
      tableGroup.add(top);

      // Central Metal Pedestal Leg & Base
      const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 12);
      const leg = new THREE.Mesh(legGeo, mats.baseSlab);
      leg.position.y = 0.5;
      leg.castShadow = true;
      tableGroup.add(leg);

      const baseDiscGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.06, 16);
      const baseDisc = new THREE.Mesh(baseDiscGeo, mats.baseSlab);
      baseDisc.position.y = 0.03;
      tableGroup.add(baseDisc);

      // Tableware: 2 Plates & Glasses
      [-0.6, 0.6].forEach((px) => {
        const plateGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.04, 16);
        const plate = new THREE.Mesh(plateGeo, mats.porcelainWhite);
        plate.position.set(px, 1.13, 0);
        plate.castShadow = true;
        tableGroup.add(plate);

        const glassGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.22, 10);
        const glass = new THREE.Mesh(glassGeo, mats.glass);
        glass.position.set(px + 0.3, 1.22, 0.25);
        tableGroup.add(glass);
      });

      // Centerpiece: Succulent plant pot
      const miniPotGeo = new THREE.CylinderGeometry(0.14, 0.1, 0.16, 10);
      const miniPot = new THREE.Mesh(miniPotGeo, mats.plantPot);
      miniPot.position.set(0, 1.19, 0);
      tableGroup.add(miniPot);

      const miniPlantGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const miniPlant = new THREE.Mesh(miniPlantGeo, mats.plantLeaf);
      miniPlant.position.set(0, 1.32, 0);
      tableGroup.add(miniPlant);

      // 4 Chairs around each table
      const chairAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      chairAngles.forEach((ang) => {
        const chair = new THREE.Group();
        const dist = 1.65;
        chair.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
        chair.rotation.y = -ang + Math.PI / 2;

        // Seat Cushion
        const seatGeo = new THREE.BoxGeometry(0.7, 0.1, 0.65);
        const seat = new THREE.Mesh(seatGeo, mats.darkMarble);
        seat.position.y = 0.55;
        seat.castShadow = true;
        chair.add(seat);

        // Curved Backrest
        const backGeo = new THREE.BoxGeometry(0.7, 0.5, 0.08);
        const back = new THREE.Mesh(backGeo, mats.warmWood);
        back.position.set(0, 0.85, -0.28);
        back.castShadow = true;
        chair.add(back);

        // 4 Slender Legs
        [-0.28, 0.28].forEach((lx) => {
          [-0.25, 0.25].forEach((lz) => {
            const chairLegGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.5, 6);
            const chairLeg = new THREE.Mesh(chairLegGeo, mats.brassGold);
            chairLeg.position.set(lx, 0.25, lz);
            chair.add(chairLeg);
          });
        });

        tableGroup.add(chair);
      });

      // Holographic Floating Status Beacon (Ring / Torus)
      const indicatorGeo = new THREE.TorusGeometry(0.35, 0.06, 12, 24);
      indicatorGeo.rotateX(Math.PI / 2);
      const indicatorMat =
        status === 'occupied'
          ? mats.statusOccupied
          : status === 'reserved'
          ? mats.statusReserved
          : mats.statusAvailable;

      const indicator = new THREE.Mesh(indicatorGeo, indicatorMat.clone());
      indicator.position.set(0, 2.1, 0);
      tableGroup.add(indicator);

      // Subtle localized hover point light
      const hoverLight = new THREE.PointLight(0xffedd5, 0, 4);
      hoverLight.position.set(0, 2.3, 0);
      tableGroup.add(hoverLight);

      diorama.add(tableGroup);

      tables3DList.push({
        id: cfg.id,
        number: cfg.number,
        status,
        group: tableGroup,
        indicator,
        hoverLight,
        baseY: 0,
        highlighted: false,
      });
    });

    tables3DRef.current = tables3DList;

    // ==========================================
    // 6. ENTRANCE & RECEPTION AREA - FRONT RIGHT
    // ==========================================
    const entranceGroup = new THREE.Group();
    entranceGroup.position.set(8.5, 0, 5.0);

    // Host Podium
    const podiumGeo = new THREE.BoxGeometry(1.2, 1.4, 0.8);
    const podium = new THREE.Mesh(podiumGeo, mats.warmWood);
    podium.position.y = 0.7;
    podium.castShadow = true;
    entranceGroup.add(podium);

    // Glowing POS iPad on podium
    const padGeo = new THREE.BoxGeometry(0.45, 0.04, 0.35);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x318bff,
      emissive: 0x2563eb,
      emissiveIntensity: 0.9,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(0, 1.45, 0);
    pad.rotation.x = -0.3;
    entranceGroup.add(pad);

    diorama.add(entranceGroup);

    // ==========================================
    // 7. DECORATIVE INDOOR PLANTS & ACCENTS
    // ==========================================
    const plantLocations = [
      { x: -9.5, z: 6.8 },
      { x: 9.2, z: -7.0 },
      { x: -9.5, z: -7.0 },
      { x: 9.2, z: 1.5 },
    ];

    plantLocations.forEach((p) => {
      const plantGroup = new THREE.Group();
      plantGroup.position.set(p.x, 0, p.z);

      // Tall fluted ceramic pot
      const potGeo = new THREE.CylinderGeometry(0.55, 0.4, 1.2, 16);
      const pot = new THREE.Mesh(potGeo, mats.plantPot);
      pot.position.y = 0.6;
      pot.castShadow = true;
      plantGroup.add(pot);

      // Layered monstera/ficus foliage
      for (let i = 0; i < 7; i++) {
        const leafGeo = new THREE.ConeGeometry(0.45, 0.9, 5);
        leafGeo.rotateZ(0.45);
        leafGeo.rotateY((i * Math.PI * 2) / 7);
        const leaf = new THREE.Mesh(leafGeo, mats.plantLeaf);
        leaf.position.set(0, 1.2 + (i % 2) * 0.2, 0);
        leaf.castShadow = true;
        plantGroup.add(leaf);
      }

      diorama.add(plantGroup);
    });

    // ==========================================
    // 8. LIGHTING DESIGN (Cinematic F&B Atmosphere)
    // ==========================================
    // Deep navy ambient foundation
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.5);
    scene.add(ambientLight);
    lightsRef.current.ambient = ambientLight;

    // Warm Sun Key Light (Directional with soft shadows)
    const sunLight = new THREE.DirectionalLight(0xfff1e6, 2.4);
    sunLight.position.set(30, 42, 28);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Cool Sky Rim Fill Light (Deep cyan rim highlights)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-28, 20, -28);
    scene.add(rimLight);

    // Amber Point Light above Kitchen Pass
    const kitchenLight = new THREE.PointLight(0xff9900, 2.2, 14);
    kitchenLight.position.set(2.5, 3.2, -6.0);
    kitchenLight.castShadow = true;
    diorama.add(kitchenLight);
    lightsRef.current.kitchenPoint = kitchenLight;

    // Warm Bar Point Light
    const barLight = new THREE.PointLight(0xffaa33, 1.8, 12);
    barLight.position.set(-8.2, 3.0, -2.5);
    diorama.add(barLight);
    lightsRef.current.barPoint = barLight;

    // Gentle Dining Central Point Light
    const centerCeilingLight = new THREE.PointLight(0xffedd5, 1.1, 18);
    centerCeilingLight.position.set(0, 6.0, 1.5);
    diorama.add(centerCeilingLight);

    // ==========================================
    // 9. ANIMATION LOOP WITH MOUSE DAMPING
    // ==========================================
    let animationFrameId: number;
    const clock = new THREE.Clock();

    // Base isometric orientation angles
    const baseRotY = -Math.PI / 4; // 45 deg angle
    const baseRotX = 0;

    // Check user accessibility preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      const elapsedTime = clock.getElapsedTime();

      // Lerp mouse target for buttery smooth damping
      const lerpSpeed = 0.055;
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * lerpSpeed;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * lerpSpeed;

      if (!prefersReducedMotion && dioramaGroupRef.current) {
        // Subtle Mouse Rotation:
        // Horizontal: +/- 11 degrees (0.19 rad)
        // Vertical: +/- 7 degrees (0.12 rad)
        const rotYOffset = mouseRef.current.x * 0.19;
        const rotXOffset = mouseRef.current.y * 0.12;

        dioramaGroupRef.current.rotation.y = baseRotY + rotYOffset;
        dioramaGroupRef.current.rotation.x = baseRotX + rotXOffset;

        // Gentle Idle Floating
        const idleFloat = Math.sin(elapsedTime * 0.85) * 0.14;
        dioramaGroupRef.current.position.y = -1.0 + idleFloat;
      }

      // Pulse kitchen and bar lighting gently
      if (lightsRef.current.kitchenPoint) {
        lightsRef.current.kitchenPoint.intensity = 2.0 + Math.sin(elapsedTime * 1.6) * 0.3;
      }

      // Rotate status beacons & pulse hovered tables
      tables3DRef.current.forEach((tData) => {
        tData.indicator.rotation.z += 0.015;

        // Raycasting check for table hover
        if (mouseNormRef.current.x > -900) {
          raycasterRef.current.setFromCamera(mouseNormRef.current, camera);
          const intersects = raycasterRef.current.intersectObjects(tData.group.children, true);

          if (intersects.length > 0) {
            if (!tData.highlighted) {
              tData.highlighted = true;
              tData.hoverLight.intensity = 1.6;
              setHoveredTable({
                number: tData.number,
                status: tData.status,
                capacity: (tData.group.userData.capacity as number) || 4,
              });
            }
            // Elevate table slightly on hover
            tData.group.position.y += (0.2 - tData.group.position.y) * 0.15;
          } else {
            if (tData.highlighted) {
              tData.highlighted = false;
              tData.hoverLight.intensity = 0;
            }
            tData.group.position.y += (tData.baseY - tData.group.position.y) * 0.15;
          }
        }
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const newAspect = w / h;

      camera.left = (-frustumSize * newAspect) / 2;
      camera.right = (frustumSize * newAspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // Dispose materials & geometries
      Object.values(mats).forEach((m) => m.dispose());
      floorTex.dispose();
      kitchenWallTex.dispose();
    };
  }, [tables]);

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden rounded-3xl ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* WEBGL FALLBACK IF UNSUPPORTED */}
      {!isWebGLSupported && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-8 text-center backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
            <Utensils className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Mô hình nhà hàng thông minh 3D</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Trình duyệt của bạn đang tắt tăng tốc phần cứng WebGL. Bạn vẫn có thể tương tác đầy đủ với các chức năng chọn bàn và đặt món.
          </p>
        </div>
      )}

      {/* ==========================================
          FLOATING UI ELEMENTS (Part 5)
          ========================================== */}

      {/* 1. TOP-LEFT: POS LIVE ORDER PANEL */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none transition-all duration-300">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25">
            <Utensils className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                POS LIVE #ORD-108
              </span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                Đang chuẩn bị
              </span>
            </div>
            <p className="text-[11px] font-semibold text-white truncate max-w-[170px]">
              Ramen Chashu x2 • Trà Đào x1
            </p>
          </div>
        </div>
      </div>

      {/* 2. TOP-RIGHT: TABLE OCCUPANCY LIVE STATS */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none transition-all duration-300">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
              {selectedBranchName}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-slate-300 font-medium">Trống: <strong className="text-emerald-400">8</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-slate-300 font-medium">Có khách: <strong className="text-amber-400">3</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-slate-300 font-medium">Đặt trước: <strong className="text-sky-400">1</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM-LEFT: KDS KITCHEN STATION ROUTING PANEL */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none transition-all duration-300">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 p-2.5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-amber-300">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-bold">Bếp Nóng: <strong>2</strong></span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 px-2.5 py-1.5 text-sky-300">
            <Coffee className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-[11px] font-bold">Quầy Bar: <strong>1</strong></span>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5 text-emerald-400 text-[10px] font-bold">
            <CheckCircle2 className="h-3 w-3" />
            <span>0 trễ</span>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM-CENTER: HOVERED TABLE DETAIL CARD & INTERACTION CUE */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
        {hoveredTable ? (
          <div
            onClick={handleClick}
            className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-slate-900/95 px-4 py-2.5 shadow-2xl shadow-amber-500/10 backdrop-blur-xl cursor-pointer hover:bg-slate-800 transition-all group active:scale-95 animate-fadeIn"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 font-black text-slate-950 text-sm shadow-md shadow-amber-500/20">
              {hoveredTable.number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">Bàn {hoveredTable.number}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                    hoveredTable.status === 'occupied'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : hoveredTable.status === 'reserved'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {hoveredTable.status === 'occupied'
                    ? 'Có khách'
                    : hoveredTable.status === 'reserved'
                    ? 'Đã đặt'
                    : 'Bàn trống'}
                </span>
              </div>
              <p className="text-[10px] text-amber-300/90 font-medium flex items-center gap-1 mt-0.5 group-hover:text-amber-200">
                <span>Nhấn để gọi món bàn này</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-slate-900/60 px-3 py-2 text-[10px] text-slate-400 backdrop-blur-md">
            <Eye className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>Di chuột để xoay 3D • Nhấp vào bàn để chọn</span>
          </div>
        )}
      </div>
    </div>
  );
}
