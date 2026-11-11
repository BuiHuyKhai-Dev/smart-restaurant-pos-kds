'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Sparkles,
  Utensils,
  Flame,
  Coffee,
  CheckCircle2,
  ChevronRight,
  Eye,
  UserCheck,
  QrCode,
  RotateCcw,
  Compass,
} from 'lucide-react';
import { RestaurantTable, TableStatus } from '@/lib/types';

interface IsometricRestaurant3DProps {
  tables?: RestaurantTable[];
  selectedBranchName?: string;
  onSelectTable?: (tableNumber: string) => void;
  onStaffClick?: () => void;
  onCustomerClick?: () => void;
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
  onStaffClick,
  onCustomerClick,
  className = '',
}: IsometricRestaurant3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Hover states
  const [hoveredTable, setHoveredTable] = useState<{
    number: string;
    status: TableStatus;
    capacity: number;
  } | null>(null);
  const [hoveredCharacter, setHoveredCharacter] = useState<'staff' | 'customer' | null>(null);
  const [isWebGLSupported, setIsWebGLSupported] = useState(true);

  // References for three.js objects
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseNormRef = useRef(new THREE.Vector2(-999, -999));
  const controlsRef = useRef<OrbitControls | null>(null);
  const tables3DRef = useRef<Table3DData[]>([]);
  const staffMeshRef = useRef<THREE.Group | null>(null);
  const customerMeshRef = useRef<THREE.Group | null>(null);
  const staffHighlightLightRef = useRef<THREE.PointLight | null>(null);
  const customerHighlightLightRef = useRef<THREE.PointLight | null>(null);

  // Reset Camera View Handler
  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseNormRef.current.x = (x / rect.width) * 2 - 1;
    mouseNormRef.current.y = -(y / rect.height) * 2 + 1;
  }, []);

  const handlePointerLeave = useCallback(() => {
    mouseNormRef.current.x = -999;
    mouseNormRef.current.y = -999;
    setHoveredTable(null);
    setHoveredCharacter(null);
  }, []);

  // Click Handler for 3D Objects
  const handleCanvasClick = useCallback(() => {
    if (hoveredCharacter === 'staff') {
      if (onStaffClick) onStaffClick();
    } else if (hoveredCharacter === 'customer') {
      if (onCustomerClick) onCustomerClick();
    } else if (hoveredTable && onSelectTable) {
      onSelectTable(hoveredTable.number);
    }
  }, [hoveredCharacter, hoveredTable, onStaffClick, onCustomerClick, onSelectTable]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Check WebGL
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

    // 2. SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = null; // Transparent to blend seamlessly with #050817 page background

    // 3. PERSPECTIVE CAMERA with Tilt-Shift Diorama Feel
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 500);

    // Initial elevated isometric vantage point
    const initCamPos = new THREE.Vector3(30, 26, 32);
    camera.position.copy(initCamPos);

    // 4. RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 5. FULL 360-DEGREE ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.2, 0); // Focus around center of the restaurant floor
    controls.minDistance = 20; // Max zoom in
    controls.maxDistance = 58; // Max zoom out
    controls.minPolarAngle = Math.PI / 6; // ~30° (no pure bird-eye flat view)
    controls.maxPolarAngle = Math.PI / 2.35; // ~76° (prevent clipping below ground floor)
    controls.enablePan = false; // Keep restaurant centered in hero view
    controls.saveState();
    controlsRef.current = controls;

    // ROOT DIORAMA GROUP
    const diorama = new THREE.Group();
    scene.add(diorama);

    // ==========================================
    // PROCEDURAL TEXTURES
    // ==========================================
    // A. Luxury Slate Floor Tile Canvas
    const createFloorCanvas = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 512, 512);

        // Grid lines
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

        // Texture noise
        for (let i = 0; i < 2400; i++) {
          const nx = Math.random() * 512;
          const ny = Math.random() * 512;
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.05)';
          ctx.fillRect(nx, ny, 2, 2);
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(5, 4);
      return tex;
    };

    // B. Kitchen Subway Tile Canvas
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
        color: 0x070c18,
        roughness: 0.6,
        metalness: 0.25,
      }),
      floor: new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.4,
        metalness: 0.1,
      }),
      floorBorder: new THREE.MeshStandardMaterial({
        color: 0x318bff,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.45,
        roughness: 0.2,
      }),
      walls: new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.7,
        metalness: 0.1,
      }),
      kitchenWall: new THREE.MeshStandardMaterial({
        map: kitchenWallTex,
        roughness: 0.35,
        metalness: 0.1,
      }),
      woodSlat: new THREE.MeshStandardMaterial({
        color: 0x92400e,
        roughness: 0.45,
        metalness: 0.05,
      }),
      stainlessSteel: new THREE.MeshStandardMaterial({
        color: 0xcfd8dc,
        roughness: 0.2,
        metalness: 0.9,
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
        roughness: 0.25,
        metalness: 0.85,
      }),
      porcelainWhite: new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.15,
        metalness: 0.05,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.45,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.85,
      }),
      plantPot: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.6,
      }),
      plantLeaf: new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.4,
      }),
      // Status Beacons
      statusAvailable: new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      }),
      statusOccupied: new THREE.MeshStandardMaterial({
        color: 0xff9500,
        emissive: 0xff9500,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      }),
      statusReserved: new THREE.MeshStandardMaterial({
        color: 0x318bff,
        emissive: 0x318bff,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      }),
      // Character Materials
      staffUniform: new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Black waistcoat
        roughness: 0.5,
      }),
      staffShirt: new THREE.MeshStandardMaterial({
        color: 0xf8fafc, // White shirt
        roughness: 0.3,
      }),
      staffBowtie: new THREE.MeshStandardMaterial({
        color: 0xb91c1c, // Crimson bowtie
        roughness: 0.4,
      }),
      staffApron: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.6,
      }),
      customerJacket: new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Vibrant modern blue jacket
        roughness: 0.4,
      }),
      customerPants: new THREE.MeshStandardMaterial({
        color: 0xd97706, // Stylish warm khaki
        roughness: 0.6,
      }),
      skinMat: new THREE.MeshStandardMaterial({
        color: 0xffd1b3,
        roughness: 0.5,
      }),
      hairDark: new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        roughness: 0.8,
      }),
      hairBrown: new THREE.MeshStandardMaterial({
        color: 0x451a03,
        roughness: 0.8,
      }),
      phoneScreen: new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.2,
      }),
    };

    // ==========================================
    // 1. DIORAMA ARCHITECTURAL BASE & FLOOR
    // ==========================================
    const baseGeo = new THREE.BoxGeometry(25, 1.4, 20);
    const baseMesh = new THREE.Mesh(baseGeo, mats.baseSlab);
    baseMesh.position.y = -0.7;
    baseMesh.receiveShadow = true;
    diorama.add(baseMesh);

    // Floor surface
    const floorGeo = new THREE.BoxGeometry(24.4, 0.1, 19.4);
    const floorMesh = new THREE.Mesh(floorGeo, mats.floor);
    floorMesh.position.y = 0.05;
    floorMesh.receiveShadow = true;
    diorama.add(floorMesh);

    // Glowing futuristic neon border around the diorama base
    const rimFront = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.06, 0.12), mats.floorBorder);
    rimFront.position.set(0, 0.1, 9.7);
    diorama.add(rimFront);

    const rimRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 19.4), mats.floorBorder);
    rimRight.position.set(12.3, 0.1, 0);
    diorama.add(rimRight);

    // ==========================================
    // 2. WALLS & CUTAWAY ARCHITECTURE
    // ==========================================
    // Back Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(24.4, 4.2, 0.6), mats.kitchenWall);
    backWall.position.set(0, 2.1, -9.7);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    diorama.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, 19.4), mats.walls);
    leftWall.position.set(-12.2, 2.1, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    diorama.add(leftWall);

    // Vertical Wood Slat Accents on Left Wall
    for (let z = -8.0; z <= 8.0; z += 0.8) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.8, 0.35), mats.woodSlat);
      slat.position.set(-11.82, 2.1, z);
      slat.castShadow = true;
      diorama.add(slat);
    }

    // Warm LED Cove Lighting Strip under top wall trim
    const coveLight = new THREE.Mesh(
      new THREE.BoxGeometry(24.0, 0.1, 0.25),
      new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    coveLight.position.set(0, 4.15, -9.35);
    diorama.add(coveLight);

    // ==========================================
    // 3. KITCHEN STATION (BẾP KDS) - BACK AREA
    // ==========================================
    const kitchenGroup = new THREE.Group();
    kitchenGroup.position.set(3.5, 0, -7.5);

    // Stainless steel pass-through counter
    const counter = new THREE.Mesh(new THREE.BoxGeometry(10.0, 1.3, 2.2), mats.stainlessSteel);
    counter.position.y = 0.65;
    counter.castShadow = true;
    counter.receiveShadow = true;
    kitchenGroup.add(counter);

    // Overhead order pickup rack
    const rack = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.12, 1.4), mats.stainlessSteel);
    rack.position.set(0, 2.7, 0);
    rack.castShadow = true;
    kitchenGroup.add(rack);

    // Mini heat lamps under rack
    [-3.2, -1.1, 1.1, 3.2].forEach((lx) => {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.4, 8), mats.brassGold);
      lamp.position.set(lx, 2.45, 0);
      kitchenGroup.add(lamp);
    });

    // Induction cooktop surfaces on counter with cooking pots
    const steamPuffMeshes: THREE.Mesh[] = [];
    [-3.0, -0.8].forEach((cx, idx) => {
      const hob = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.05, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 })
      );
      hob.position.set(cx, 1.32, 0);
      kitchenGroup.add(hob);

      // Cooking Pot
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.35, 12), mats.stainlessSteel);
      pot.position.set(cx, 1.5, 0);
      pot.castShadow = true;
      kitchenGroup.add(pot);

      // Steam particles rising from pots
      for (let s = 0; s < 4; s++) {
        const steamMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.35,
        });
        const steam = new THREE.Mesh(new THREE.SphereGeometry(0.12 + s * 0.04, 6, 6), steamMat);
        steam.position.set(cx + (Math.random() - 0.5) * 0.2, 1.8 + s * 0.28, (Math.random() - 0.5) * 0.2);
        steam.userData = { initialY: 1.8 + s * 0.28, speed: 0.008 + Math.random() * 0.005 };
        kitchenGroup.add(steam);
        steamPuffMeshes.push(steam);
      }
    });

    // Stacked porcelain ramen/pho bowls
    [1.8, 3.2].forEach((bx) => {
      for (let i = 0; i < 3; i++) {
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.24, 12), mats.porcelainWhite);
        bowl.position.set(bx, 1.42 + i * 0.19, 0.2);
        bowl.castShadow = true;
        kitchenGroup.add(bowl);
      }
    });

    // Kitchen Station Signboard (Glowing Orange)
    const signBox = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.65, 0.2),
      new THREE.MeshStandardMaterial({
        color: 0xff9500,
        emissive: 0xff7700,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      })
    );
    signBox.position.set(0, 3.3, -1.8);
    kitchenGroup.add(signBox);

    diorama.add(kitchenGroup);

    // ==========================================
    // 4. BAR & BEVERAGE STATION - LEFT AREA
    // ==========================================
    const barGroup = new THREE.Group();
    barGroup.position.set(-9.5, 0, -3.0);

    // Dark walnut bar counter with marble top
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 8.5), mats.warmWood);
    barBase.position.y = 0.65;
    barBase.castShadow = true;
    barBase.receiveShadow = true;
    barGroup.add(barBase);

    const barTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 8.7), mats.darkMarble);
    barTop.position.y = 1.36;
    barTop.castShadow = true;
    barGroup.add(barTop);

    // Overhead brass glass rack
    const brassRack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 6.8), mats.brassGold);
    brassRack.position.set(0, 2.8, 0);
    barGroup.add(brassRack);

    // Hanging glasses
    [-2.4, -1.2, 0, 1.2, 2.4].forEach((gz) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6), mats.glass);
      stem.position.set(0, 2.5, gz);
      barGroup.add(stem);

      const cup = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 8), mats.glass);
      cup.rotation.x = Math.PI;
      cup.position.set(0, 2.32, gz);
      barGroup.add(cup);
    });

    // Espresso Machine
    const coffeeMachine = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.6), mats.stainlessSteel);
    coffeeMachine.position.set(0, 1.9, -2.6);
    coffeeMachine.castShadow = true;
    barGroup.add(coffeeMachine);

    // Bar Stools
    [-2.6, 0, 2.6].forEach((sz) => {
      const stoolGroup = new THREE.Group();
      stoolGroup.position.set(1.9, 0, sz);

      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.16, 16), mats.darkMarble);
      seat.position.y = 0.96;
      seat.castShadow = true;
      stoolGroup.add(seat);

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), mats.brassGold);
      leg.position.y = 0.45;
      stoolGroup.add(leg);

      const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 12), mats.brassGold);
      baseRing.position.y = 0.05;
      stoolGroup.add(baseRing);

      barGroup.add(stoolGroup);
    });

    diorama.add(barGroup);

    // ==========================================
    // 5. DINING ROOM: 6 TABLES (T-01 to T-06)
    // ==========================================
    const tableConfigs = [
      { id: 't1', number: 'T-01', x: -5.0, z: 4.8, defaultStatus: 'available' as TableStatus },
      { id: 't2', number: 'T-02', x: 0.8, z: 4.8, defaultStatus: 'occupied' as TableStatus },
      { id: 't3', number: 'T-03', x: 6.6, z: 4.8, defaultStatus: 'available' as TableStatus },
      { id: 't4', number: 'T-04', x: -5.0, z: -0.2, defaultStatus: 'reserved' as TableStatus },
      { id: 't5', number: 'T-05', x: 0.8, z: -0.2, defaultStatus: 'occupied' as TableStatus },
      { id: 't6', number: 'T-06', x: 6.6, z: -0.2, defaultStatus: 'available' as TableStatus },
    ];

    const tables3DList: Table3DData[] = [];

    tableConfigs.forEach((cfg) => {
      const liveTable = tables.find((t) => t.number === cfg.number);
      const status: TableStatus = liveTable ? liveTable.status : cfg.defaultStatus;

      const tableGroup = new THREE.Group();
      tableGroup.position.set(cfg.x, 0, cfg.z);
      tableGroup.userData = {
        isTable: true,
        tableNumber: cfg.number,
        status,
        capacity: liveTable?.capacity || 4,
      };

      // Table Top
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.14, 24), mats.warmWood);
      top.position.y = 1.05;
      top.castShadow = true;
      top.receiveShadow = true;
      tableGroup.add(top);

      // Central Base
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.0, 12), mats.baseSlab);
      leg.position.y = 0.5;
      leg.castShadow = true;
      tableGroup.add(leg);

      const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 16), mats.baseSlab);
      baseDisc.position.y = 0.03;
      tableGroup.add(baseDisc);

      // Plates & Glasses
      [-0.65, 0.65].forEach((px) => {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.04, 16), mats.porcelainWhite);
        plate.position.set(px, 1.14, 0);
        plate.castShadow = true;
        tableGroup.add(plate);

        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.24, 10), mats.glass);
        glass.position.set(px + 0.3, 1.24, 0.26);
        tableGroup.add(glass);
      });

      // Centerpiece Succulent
      const miniPot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.18, 10), mats.plantPot);
      miniPot.position.set(0, 1.21, 0);
      tableGroup.add(miniPot);

      const miniPlant = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), mats.plantLeaf);
      miniPlant.position.set(0, 1.34, 0);
      tableGroup.add(miniPlant);

      // 4 Chairs around each table
      const chairAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      chairAngles.forEach((ang) => {
        const chair = new THREE.Group();
        const dist = 1.8;
        chair.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
        chair.rotation.y = -ang + Math.PI / 2;

        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.7), mats.darkMarble);
        seat.position.y = 0.55;
        seat.castShadow = true;
        chair.add(seat);

        const back = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.08), mats.warmWood);
        back.position.set(0, 0.88, -0.31);
        back.castShadow = true;
        chair.add(back);

        [-0.3, 0.3].forEach((lx) => {
          [-0.27, 0.27].forEach((lz) => {
            const chairLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.5, 6), mats.brassGold);
            chairLeg.position.set(lx, 0.25, lz);
            chair.add(chairLeg);
          });
        });

        tableGroup.add(chair);
      });

      // Holographic Floating Status Beacon
      const indicatorGeo = new THREE.TorusGeometry(0.38, 0.07, 12, 24);
      indicatorGeo.rotateX(Math.PI / 2);
      const indicatorMat =
        status === 'occupied'
          ? mats.statusOccupied
          : status === 'reserved'
          ? mats.statusReserved
          : mats.statusAvailable;

      const indicator = new THREE.Mesh(indicatorGeo, indicatorMat.clone());
      indicator.position.set(0, 2.2, 0);
      tableGroup.add(indicator);

      // Localized point light for hover
      const hoverLight = new THREE.PointLight(0xffedd5, 0, 4);
      hoverLight.position.set(0, 2.4, 0);
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
    entranceGroup.position.set(10.2, 0, 6.2);

    // Host Podium
    const podium = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 0.85), mats.warmWood);
    podium.position.y = 0.7;
    podium.castShadow = true;
    entranceGroup.add(podium);

    // Glowing POS iPad on podium
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.04, 0.38),
      new THREE.MeshStandardMaterial({
        color: 0x318bff,
        emissive: 0x2563eb,
        emissiveIntensity: 0.9,
      })
    );
    pad.position.set(0, 1.45, 0);
    pad.rotation.x = -0.3;
    entranceGroup.add(pad);

    diorama.add(entranceGroup);

    // Glass Entrance Sliding Doors
    const glassDoor1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.6, 2.4), mats.glass);
    glassDoor1.position.set(12.0, 1.8, 6.2);
    diorama.add(glassDoor1);

    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.8, 0.15), mats.brassGold);
    doorFrame.position.set(12.0, 1.9, 5.0);
    diorama.add(doorFrame);

    // Decorative Plants
    const plantLocations = [
      { x: -11.0, z: 8.0 },
      { x: 11.0, z: -8.0 },
      { x: -11.0, z: -8.0 },
      { x: 11.0, z: 2.5 },
    ];

    plantLocations.forEach((p) => {
      const plantGroup = new THREE.Group();
      plantGroup.position.set(p.x, 0, p.z);

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.45, 1.3, 16), mats.plantPot);
      pot.position.y = 0.65;
      pot.castShadow = true;
      plantGroup.add(pot);

      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 5), mats.plantLeaf);
        leaf.rotation.z = 0.45;
        leaf.rotation.y = (i * Math.PI * 2) / 7;
        leaf.position.set(0, 1.3 + (i % 2) * 0.22, 0);
        leaf.castShadow = true;
        plantGroup.add(leaf);
      }

      diorama.add(plantGroup);
    });

    // =========================================================================
    // 7. ARTICULATED 3D CHARACTER A: RESTAURANT STAFF (NHÂN VIÊN PHỤC VỤ)
    // =========================================================================
    const staffGroup = new THREE.Group();
    staffGroup.position.set(3.5, 0, -4.5);
    staffGroup.userData = { isStaff: true };

    // Hips / Pelvis
    const staffHips = new THREE.Group();
    staffHips.position.y = 1.05;
    staffGroup.add(staffHips);

    // Torso (Shirt + Waistcoat)
    const staffTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), mats.staffUniform);
    staffTorso.position.y = 0.35;
    staffTorso.castShadow = true;
    staffHips.add(staffTorso);

    // Shirt Collar & Bowtie
    const staffShirtBib = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.05), mats.staffShirt);
    staffShirtBib.position.set(0, 0.45, 0.16);
    staffHips.add(staffShirtBib);

    const staffBowtie = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.06), mats.staffBowtie);
    staffBowtie.position.set(0, 0.62, 0.18);
    staffHips.add(staffBowtie);

    // Apron
    const staffApron = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.5, 0.38), mats.staffApron);
    staffApron.position.set(0, 0.05, 0);
    staffHips.add(staffApron);

    // Head & Hair
    const staffHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), mats.skinMat);
    staffHead.position.set(0, 0.95, 0);
    staffHead.castShadow = true;
    staffHips.add(staffHead);

    const staffHair = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), mats.hairDark);
    staffHair.position.set(0, 1.02, -0.04);
    staffHips.add(staffHair);

    // Articulated Legs
    const staffLeftLeg = new THREE.Group();
    staffLeftLeg.position.set(-0.16, 0, 0);
    const sLeftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), mats.staffUniform);
    sLeftThigh.position.y = -0.27;
    sLeftThigh.castShadow = true;
    staffLeftLeg.add(sLeftThigh);
    const sLeftShin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), mats.staffUniform);
    sLeftShin.position.y = -0.75;
    sLeftShin.castShadow = true;
    staffLeftLeg.add(sLeftShin);
    const sLeftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.28), mats.baseSlab);
    sLeftShoe.position.set(0, -1.0, 0.05);
    staffLeftLeg.add(sLeftShoe);
    staffHips.add(staffLeftLeg);

    const staffRightLeg = new THREE.Group();
    staffRightLeg.position.set(0.16, 0, 0);
    const sRightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), mats.staffUniform);
    sRightThigh.position.y = -0.27;
    sRightThigh.castShadow = true;
    staffRightLeg.add(sRightThigh);
    const sRightShin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), mats.staffUniform);
    sRightShin.position.y = -0.75;
    sRightShin.castShadow = true;
    staffRightLeg.add(sRightShin);
    const sRightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.28), mats.baseSlab);
    sRightShoe.position.set(0, -1.0, 0.05);
    staffRightLeg.add(sRightShoe);
    staffHips.add(staffRightLeg);

    // Left Arm (Swings naturally)
    const staffLeftArm = new THREE.Group();
    staffLeftArm.position.set(-0.35, 0.6, 0);
    const sLeftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), mats.staffShirt);
    sLeftArmMesh.position.y = -0.25;
    staffLeftArm.add(sLeftArmMesh);
    staffHips.add(staffLeftArm);

    // Right Arm (Bent forward carrying food tray horizontally)
    const staffRightArm = new THREE.Group();
    staffRightArm.position.set(0.35, 0.6, 0);
    const sRightUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.14), mats.staffShirt);
    sRightUpperArm.position.y = -0.15;
    staffRightArm.add(sRightUpperArm);

    const sRightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.14), mats.staffShirt);
    sRightForearm.position.set(0, -0.3, 0.16);
    sRightForearm.rotation.x = -Math.PI / 2.3;
    staffRightArm.add(sRightForearm);

    // The Serving Tray & Food
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16), mats.stainlessSteel);
    tray.position.set(0.05, -0.3, 0.38);
    staffRightArm.add(tray);

    const trayBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.14, 10), mats.porcelainWhite);
    trayBowl.position.set(0.05, -0.2, 0.38);
    staffRightArm.add(trayBowl);

    const trayDrink = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 8), mats.glass);
    trayDrink.position.set(0.2, -0.18, 0.44);
    staffRightArm.add(trayDrink);

    staffHips.add(staffRightArm);

    // Invisible clickable interaction cylinder for raycaster
    const staffHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 2.4, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, wireframe: false })
    );
    staffHitbox.position.y = 1.2;
    staffHitbox.userData = { isStaff: true };
    staffGroup.add(staffHitbox);

    // Hover Highlight Spotlight / PointLight
    const staffPointLight = new THREE.PointLight(0xff9500, 0, 5);
    staffPointLight.position.set(0, 2.6, 0);
    staffGroup.add(staffPointLight);
    staffHighlightLightRef.current = staffPointLight;

    diorama.add(staffGroup);
    staffMeshRef.current = staffGroup;

    // =========================================================================
    // 8. ARTICULATED 3D CHARACTER B: RESTAURANT CUSTOMER (KHÁCH HÀNG GỌI MÓN)
    // =========================================================================
    const customerGroup = new THREE.Group();
    customerGroup.position.set(7.5, 0, 4.5);
    customerGroup.userData = { isCustomer: true };

    const customerHips = new THREE.Group();
    customerHips.position.y = 1.05;
    customerGroup.add(customerHips);

    // Torso (Modern Blue Jacket)
    const customerTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), mats.customerJacket);
    customerTorso.position.y = 0.35;
    customerTorso.castShadow = true;
    customerHips.add(customerTorso);

    const customerTee = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.04), mats.staffShirt);
    customerTee.position.set(0, 0.35, 0.16);
    customerHips.add(customerTee);

    // Head & Hair
    const customerHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), mats.skinMat);
    customerHead.position.set(0, 0.95, 0);
    customerHead.castShadow = true;
    customerHips.add(customerHead);

    const customerHair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10), mats.hairBrown);
    customerHair.position.set(0, 1.03, -0.02);
    customerHips.add(customerHair);

    // Legs (Modern Khaki Pants + White Sneakers)
    const cLeftLeg = new THREE.Group();
    cLeftLeg.position.set(-0.16, 0, 0);
    const cLeftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.55, 0.19), mats.customerPants);
    cLeftThigh.position.y = -0.27;
    cLeftThigh.castShadow = true;
    cLeftLeg.add(cLeftThigh);
    const cLeftShin = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.5, 0.17), mats.customerPants);
    cLeftShin.position.y = -0.75;
    cLeftShin.castShadow = true;
    cLeftLeg.add(cLeftShin);
    const cLeftSneaker = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.28), mats.staffShirt);
    cLeftSneaker.position.set(0, -1.0, 0.05);
    cLeftLeg.add(cLeftSneaker);
    customerHips.add(cLeftLeg);

    const cRightLeg = new THREE.Group();
    cRightLeg.position.set(0.16, 0, 0);
    const cRightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.55, 0.19), mats.customerPants);
    cRightThigh.position.y = -0.27;
    cRightThigh.castShadow = true;
    cRightLeg.add(cRightThigh);
    const cRightShin = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.5, 0.17), mats.customerPants);
    cRightShin.position.y = -0.75;
    cRightShin.castShadow = true;
    cRightLeg.add(cRightShin);
    const cRightSneaker = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.28), mats.staffShirt);
    cRightSneaker.position.set(0, -1.0, 0.05);
    cRightLeg.add(cRightSneaker);
    customerHips.add(cRightLeg);

    // Left Arm (Natural swing)
    const cLeftArm = new THREE.Group();
    cLeftArm.position.set(-0.35, 0.6, 0);
    const cLeftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), mats.customerJacket);
    cLeftArmMesh.position.y = -0.25;
    cLeftArm.add(cLeftArmMesh);
    customerHips.add(cLeftArm);

    // Right Arm (Holding glowing smartphone)
    const cRightArm = new THREE.Group();
    cRightArm.position.set(0.35, 0.6, 0);
    const cRightUpper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.14), mats.customerJacket);
    cRightUpper.position.y = -0.15;
    cRightArm.add(cRightUpper);

    const cRightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.14), mats.customerJacket);
    cRightForearm.position.set(0, -0.3, 0.16);
    cRightForearm.rotation.x = -Math.PI / 2.2;
    cRightArm.add(cRightForearm);

    // Smartphone
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.03), mats.baseSlab);
    phone.position.set(0, -0.28, 0.35);
    phone.rotation.x = -0.2;
    cRightArm.add(phone);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.21, 0.01), mats.phoneScreen);
    screen.position.set(0, -0.28, 0.37);
    screen.rotation.x = -0.2;
    cRightArm.add(screen);

    customerHips.add(cRightArm);

    // Hitbox
    const customerHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 2.4, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, wireframe: false })
    );
    customerHitbox.position.y = 1.2;
    customerHitbox.userData = { isCustomer: true };
    customerGroup.add(customerHitbox);

    const customerPointLight = new THREE.PointLight(0x318bff, 0, 5);
    customerPointLight.position.set(0, 2.6, 0);
    customerGroup.add(customerPointLight);
    customerHighlightLightRef.current = customerPointLight;

    diorama.add(customerGroup);
    customerMeshRef.current = customerGroup;

    // ==========================================
    // 9. LIGHTING DESIGN
    // ==========================================
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff1e6, 2.5);
    sunLight.position.set(32, 45, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 22;
    sunLight.shadow.camera.bottom = -22;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    rimLight.position.set(-30, 25, -30);
    scene.add(rimLight);

    // Warm Point Lights
    const kitchenLight = new THREE.PointLight(0xff9900, 2.2, 14);
    kitchenLight.position.set(3.5, 3.2, -7.0);
    diorama.add(kitchenLight);

    const barLight = new THREE.PointLight(0xffaa33, 1.8, 12);
    barLight.position.set(-9.5, 3.0, -3.0);
    diorama.add(barLight);

    const diningCenterLight = new THREE.PointLight(0xffedd5, 1.2, 18);
    diningCenterLight.position.set(0, 6.5, 1.5);
    diorama.add(diningCenterLight);

    // ==========================================
    // 10. ANIMATION & PATH-BASED LOOPS
    // ==========================================
    let animationFrameId: number;
    const clock = new THREE.Clock();

    // Staff Waypoints: Kitchen pass -> Dining aisle -> Table T-02 -> Serve -> Back
    const staffWaypoints = [
      { x: 3.5, z: -5.0, wait: 1.5 },
      { x: 0.8, z: -2.0, wait: 0 },
      { x: 0.8, z: 2.8, wait: 2.5 }, // Serving near table
      { x: 0.8, z: -2.0, wait: 0 },
      { x: 3.5, z: -5.0, wait: 1.5 },
    ];
    let staffWaypointIdx = 0;
    let staffWaitTimer = 0;

    // Customer Waypoints: Entrance -> Table T-03 -> Table T-06 -> Bar -> Entrance
    const customerWaypoints = [
      { x: 8.5, z: 4.8, wait: 1.0 },
      { x: 5.0, z: 2.0, wait: 2.0 },
      { x: -1.5, z: 1.8, wait: 1.5 },
      { x: -5.5, z: 1.0, wait: 2.0 }, // Near bar checking menu
      { x: 2.0, z: 2.0, wait: 0 },
      { x: 8.5, z: 4.8, wait: 1.0 },
    ];
    let customerWaypointIdx = 0;
    let customerWaitTimer = 0;

    let walkCycleStaff = 0;
    let walkCycleCustomer = 0;

    const render = () => {
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Update OrbitControls
      controls.update();

      // A. Animate Kitchen Steam Particles
      steamPuffMeshes.forEach((steam) => {
        steam.position.y += steam.userData.speed;
        if (steam.position.y > steam.userData.initialY + 0.8) {
          steam.position.y = steam.userData.initialY;
        }
      });

      // B. Animate Staff Movement & Walking Joints
      const staffTarget = staffWaypoints[staffWaypointIdx];
      const dxStaff = staffTarget.x - staffGroup.position.x;
      const dzStaff = staffTarget.z - staffGroup.position.z;
      const distStaff = Math.sqrt(dxStaff * dxStaff + dzStaff * dzStaff);

      if (distStaff > 0.1) {
        // Move towards waypoint
        const speed = 1.6 * delta;
        staffGroup.position.x += (dxStaff / distStaff) * speed;
        staffGroup.position.z += (dzStaff / distStaff) * speed;

        // Rotate facing direction
        const targetAngle = Math.atan2(dxStaff, dzStaff);
        staffGroup.rotation.y = targetAngle;

        // Walking cycle
        walkCycleStaff += delta * 7.5;
        staffLeftLeg.rotation.x = Math.sin(walkCycleStaff) * 0.65;
        staffRightLeg.rotation.x = -Math.sin(walkCycleStaff) * 0.65;
        staffLeftArm.rotation.x = -Math.sin(walkCycleStaff) * 0.35;
        staffHips.position.y = 1.05 + Math.abs(Math.sin(walkCycleStaff * 2)) * 0.05;
      } else {
        // Arrived at waypoint -> idle / wait
        staffWaitTimer += delta;
        // Idle breathing
        staffHips.position.y = 1.05 + Math.sin(elapsedTime * 2) * 0.02;
        staffLeftLeg.rotation.x *= 0.85;
        staffRightLeg.rotation.x *= 0.85;
        staffLeftArm.rotation.x *= 0.85;

        if (staffWaitTimer >= staffTarget.wait) {
          staffWaitTimer = 0;
          staffWaypointIdx = (staffWaypointIdx + 1) % staffWaypoints.length;
        }
      }

      // C. Animate Customer Movement & Walking Joints
      const customerTarget = customerWaypoints[customerWaypointIdx];
      const dxCust = customerTarget.x - customerGroup.position.x;
      const dzCust = customerTarget.z - customerGroup.position.z;
      const distCust = Math.sqrt(dxCust * dxCust + dzCust * dzCust);

      if (distCust > 0.1) {
        const speed = 1.35 * delta;
        customerGroup.position.x += (dxCust / distCust) * speed;
        customerGroup.position.z += (dzCust / distCust) * speed;

        const targetAngle = Math.atan2(dxCust, dzCust);
        customerGroup.rotation.y = targetAngle;

        walkCycleCustomer += delta * 6.5;
        cLeftLeg.rotation.x = Math.sin(walkCycleCustomer) * 0.6;
        cRightLeg.rotation.x = -Math.sin(walkCycleCustomer) * 0.6;
        cLeftArm.rotation.x = -Math.sin(walkCycleCustomer) * 0.3;
        customerHips.position.y = 1.05 + Math.abs(Math.sin(walkCycleCustomer * 2)) * 0.04;
      } else {
        customerWaitTimer += delta;
        customerHips.position.y = 1.05 + Math.sin(elapsedTime * 1.8) * 0.02;
        cLeftLeg.rotation.x *= 0.85;
        cRightLeg.rotation.x *= 0.85;
        cLeftArm.rotation.x *= 0.85;

        // Subtle phone check motion when standing
        customerHead.rotation.x = Math.sin(elapsedTime * 1.5) * 0.15 + 0.15;

        if (customerWaitTimer >= customerTarget.wait) {
          customerWaitTimer = 0;
          customerWaypointIdx = (customerWaypointIdx + 1) % customerWaypoints.length;
        }
      }

      // D. Raycasting: Detect hover on Staff, Customer, or Dining Tables
      if (mouseNormRef.current.x > -900) {
        raycasterRef.current.setFromCamera(mouseNormRef.current, camera);

        // Check characters
        const staffHits = raycasterRef.current.intersectObjects(staffGroup.children, true);
        const customerHits = raycasterRef.current.intersectObjects(customerGroup.children, true);

        if (staffHits.length > 0) {
          setHoveredCharacter('staff');
          setHoveredTable(null);
          if (staffHighlightLightRef.current) staffHighlightLightRef.current.intensity = 2.2;
          if (customerHighlightLightRef.current) customerHighlightLightRef.current.intensity = 0;
        } else if (customerHits.length > 0) {
          setHoveredCharacter('customer');
          setHoveredTable(null);
          if (customerHighlightLightRef.current) customerHighlightLightRef.current.intensity = 2.2;
          if (staffHighlightLightRef.current) staffHighlightLightRef.current.intensity = 0;
        } else {
          setHoveredCharacter(null);
          if (staffHighlightLightRef.current) staffHighlightLightRef.current.intensity = 0;
          if (customerHighlightLightRef.current) customerHighlightLightRef.current.intensity = 0;

          // Check dining tables
          let foundTable: Table3DData | null = null;
          for (const tData of tables3DRef.current) {
            tData.indicator.rotation.z += 0.015;
            const tableHits = raycasterRef.current.intersectObjects(tData.group.children, true);
            if (tableHits.length > 0) {
              foundTable = tData;
              break;
            }
          }

          tables3DRef.current.forEach((tData) => {
            if (foundTable && tData.id === foundTable.id) {
              if (!tData.highlighted) {
                tData.highlighted = true;
                tData.hoverLight.intensity = 1.6;
                setHoveredTable({
                  number: tData.number,
                  status: tData.status,
                  capacity: (tData.group.userData.capacity as number) || 4,
                });
              }
              tData.group.position.y += (0.22 - tData.group.position.y) * 0.15;
            } else {
              if (tData.highlighted) {
                tData.highlighted = false;
                tData.hoverLight.intensity = 0;
              }
              tData.group.position.y += (tData.baseY - tData.group.position.y) * 0.15;
            }
          });

          if (!foundTable) {
            setHoveredTable(null);
          }
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      Object.values(mats).forEach((m) => m.dispose());
      floorTex.dispose();
      kitchenWallTex.dispose();
    };
  }, [tables]);

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleCanvasClick}
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        title="Kéo chuột để xoay 360° • Cuộn để phóng to/thu nhỏ • Bấm vào nhân viên hoặc khách để tương tác"
      />

      {/* WEBGL FALLBACK IF UNSUPPORTED */}
      {!isWebGLSupported && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-8 text-center backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
            <Utensils className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Mô hình nhà hàng 3D</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Trình duyệt của bạn đang tắt tăng tốc phần cứng WebGL. Bạn vẫn có thể truy cập đầy đủ
            các chức năng gọi món và đăng nhập bên dưới.
          </p>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE 3D HUD: CHARACTER A (STAFF) HOVER POPUP
          ========================================================================= */}
      {hoveredCharacter === 'staff' && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-fadeIn">
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (onStaffClick) onStaffClick();
            }}
            className="flex items-center gap-3 rounded-2xl border-2 border-[#FF9500] bg-slate-950/95 px-5 py-3 shadow-2xl shadow-[#FF9500]/30 backdrop-blur-xl cursor-pointer hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF9500] to-amber-400 font-black text-slate-950 text-base shadow-lg shadow-[#FF9500]/30">
              <UserCheck className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#FF9500]">
                  STAFF LOGIN
                </span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                  Phân quyền RBAC
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">Đăng nhập nhân viên</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 group-hover:text-amber-300 transition-colors mt-0.5">
                <span>Thu Ngân • Bếp KDS • Quản Lý Kho</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE 3D HUD: CHARACTER B (CUSTOMER) HOVER POPUP
          ========================================================================= */}
      {hoveredCharacter === 'customer' && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-fadeIn">
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (onCustomerClick) onCustomerClick();
            }}
            className="flex items-center gap-3 rounded-2xl border-2 border-[#318BFF] bg-slate-950/95 px-5 py-3 shadow-2xl shadow-[#318BFF]/30 backdrop-blur-xl cursor-pointer hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#318BFF] to-sky-400 font-black text-white text-base shadow-lg shadow-[#318BFF]/30">
              <QrCode className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#318BFF]">
                  ORDER FOOD
                </span>
                <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[9px] font-bold text-blue-300">
                  QR Bàn
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">Khám phá thực đơn và gọi món</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 group-hover:text-sky-300 transition-colors mt-0.5">
                <span>Chọn bàn & gửi món trực tiếp vào bếp</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE 3D HUD: TABLE HOVER POPUP
          ========================================================================= */}
      {hoveredTable && !hoveredCharacter && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-fadeIn">
          <div
            onClick={handleCanvasClick}
            className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-slate-950/95 px-5 py-3 shadow-2xl shadow-amber-500/10 backdrop-blur-xl cursor-pointer hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF9500] to-amber-500 font-black text-slate-950 text-base shadow-lg shadow-amber-500/25">
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
              <p className="text-[10px] text-amber-300 font-medium flex items-center gap-1 mt-0.5 group-hover:text-amber-200">
                <span>Nhấn để gọi món bàn {hoveredTable.number}</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTROLS HINT & CAMERA RESET BUTTON (Top Right of Canvas)
          ========================================================================= */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={handleResetCamera}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/85 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title="Đặt lại góc nhìn mặc định"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[#FF9500]" />
          <span>Góc nhìn chuẩn</span>
        </button>
      </div>

      {/* =========================================================================
          BOTTOM FLOATING INSTRUCTION PILL
          ========================================================================= */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-auto max-w-[95%]">
        <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 shadow-2xl backdrop-blur-xl text-[11px] text-slate-300 font-medium text-center">
          <Compass className="h-3.5 w-3.5 text-[#FF9500] shrink-0 animate-spin" style={{ animationDuration: '8s' }} />
          <span>
            <strong className="text-white">KÉO CHUỘT:</strong> Xoay 360° •{' '}
            <strong className="text-white">CUỘN:</strong> Phóng to/thu nhỏ •{' '}
            <strong className="text-[#FF9500]">BẤM VÀO NHÂN VIÊN / KHÁCH:</strong> Trải nghiệm ngay
          </span>
        </div>
      </div>
    </div>
  );
}
