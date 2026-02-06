import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls, TransformControls, GLTFLoader, OBJLoader, FBXLoader } from 'three-stdlib';

@Injectable({
  providedIn: 'root'
})
export class ThreeSceneService {
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  public controls!: OrbitControls;
  public transformControls!: TransformControls;
  public directionalLight!: THREE.DirectionalLight;
  public ambientLight!: THREE.AmbientLight;

  // Scene Settings
  private _lightAngle: number = 45;
  private _lightIntensity: number = 1.0;
  private _shadowEnabled: boolean = true;
  private _showShadowsOnly: boolean = false;

  // Camera settings
  private _cameraFov: number = 45;
  private _cameraContrast: number = 1.0;

  // Object State
  public selectedObject: THREE.Object3D | null = null;

  private canvas!: HTMLCanvasElement;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Cache original materials to restore from ShadowOnly mode
  private materialCache = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>();

  constructor(private ngZone: NgZone) { }

  // Getters and Setters
  get lightAngle(): number { return this._lightAngle; }
  set lightAngle(v: number) {
    this._lightAngle = v;
    this.updateLightPosition();
  }

  get lightIntensity(): number { return this._lightIntensity; }
  set lightIntensity(v: number) {
    this._lightIntensity = v;
    this.updateLightPosition();
  }

  get shadowEnabled(): boolean { return this._shadowEnabled; }
  set shadowEnabled(v: boolean) {
    this._shadowEnabled = v;
    this.updateShadowMode();
  }

  get showShadowsOnly(): boolean { return this._showShadowsOnly; }
  set showShadowsOnly(v: boolean) {
    this._showShadowsOnly = v;
    this.updateShadowMode();
  }

  get cameraFov(): number { return this._cameraFov; }
  set cameraFov(v: number) {
    this._cameraFov = v;
    this.updateCameraSettings();
  }

  get cameraContrast(): number { return this._cameraContrast; }
  set cameraContrast(v: number) {
    this._cameraContrast = v;
    this.updateCameraSettings();
  }

  initialize(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // 2. Camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(this.cameraFov, aspect, 0.1, 1000);
    this.camera.position.set(5, 5, 5);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;

    // Transform Controls
    this.transformControls = new TransformControls(this.camera, canvas);
    (this.transformControls as any).addEventListener('dragging-changed', (event: any) => {
      this.controls.enabled = !event.value;
    });
    this.scene.add(this.transformControls);

    // 5. Lighting
    this.ambientLight = new THREE.AmbientLight(0x404040, 1.0);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, this.lightIntensity);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    const d = 10;
    this.directionalLight.shadow.camera.left = -d;
    this.directionalLight.shadow.camera.right = d;
    this.directionalLight.shadow.camera.top = d;
    this.directionalLight.shadow.camera.bottom = -d;
    this.scene.add(this.directionalLight);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
    this.scene.add(gridHelper);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'GroundPlane';
    this.scene.add(floor);

    // Listeners
    canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    new ResizeObserver(() => this.onResize()).observe(canvas.parentElement!);

    this.updateLightPosition();
    this.updateShadowMode();
    this.updateCameraSettings();
    this.updateTransformControl();

    this.animate();
  }

  private animate() {
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        requestAnimationFrame(loop);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };
      loop();
    });
  }

  private onResize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  private onPointerDown(event: PointerEvent) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 1 + 1; // Note: Original was * 2 + 1, waiting.. actually original was correct? Let's check original logic: -((event.clientY - rect.top) / rect.height) * 2 + 1 is correct for NDC.
    // Wait, let's keep the coordinate calculation exactly as it was or correct if needed.
    // Original: this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 全オブジェクトに対してレイキャスト（ギズモも含む）
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const hit of intersects) {
      // 1. ギズモ判定 (最優先)
      if (this.isGizmoObject(hit.object)) {
        return;
      }

      // 2. 選択可能オブジェクト判定
      if (this.isSelectableObject(hit.object)) {
        const found = this.findSelectableRoot(hit.object);
        if (found !== this.selectedObject) {
          this.selectedObject = found;
          this.updateTransformControl();
        }
        return; // 選択したら終了
      }

      // 3. 床やグリッドで選択解除 (選択可能でない特定のオブジェクト)
      // isSelectableObject で false になるが、明示的に選択解除トリガーとするもの
      // GroundPlane や GridHelper がこれに当たる
      // ここに到達するということは isSelectableObject は false
      if (hit.object.name === 'GroundPlane' || hit.object instanceof THREE.GridHelper) {
        this.selectedObject = null;
        this.updateTransformControl();
        return; // 解除したら終了
      }

      // その他 (例: LightHelperなど) は無視して次のヒットへ
    }

    // 何もヒットしない場合も解除
    this.selectedObject = null;
    this.updateTransformControl();
  }

  // ギズモの一部かどうか判定
  private isGizmoObject(obj: THREE.Object3D): boolean {
    let parent = obj.parent;
    while (parent) {
      if (parent instanceof TransformControls) return true;
      parent = parent.parent;
    }
    return false;
  }

  // 選択可能なオブジェクトかどうかを判定
  private isSelectableObject(obj: THREE.Object3D): boolean {
    if (obj.name === 'GroundPlane') return false;
    if (obj instanceof THREE.GridHelper) return false;
    if (obj instanceof TransformControls) return false;
    if (obj instanceof THREE.Light) return false;
    return true;
  }

  // インポートモデルなどのグループの場合、ルートグループを取得
  private findSelectableRoot(obj: THREE.Object3D): THREE.Object3D {
    let current = obj;
    while (current.parent && current.parent !== this.scene) {
      if (current.parent instanceof TransformControls) break;
      current = current.parent;
    }
    return current;
  }

  private updateTransformControl() {
    if (!this.transformControls) return;
    const obj = this.selectedObject;
    if (obj) {
      this.transformControls.attach(obj);
    } else {
      this.transformControls.detach();
    }
  }

  private updateLightPosition() {
    if (!this.directionalLight) return;
    // Signal dependencies
    const angle = this.lightAngle;
    const intensity = this.lightIntensity;

    // Logic
    const angleRad = angle * (Math.PI / 180);
    const radius = 10;
    this.directionalLight.position.set(
      Math.sin(angleRad) * radius,
      10,
      Math.cos(angleRad) * radius
    );
    this.directionalLight.intensity = intensity;
    this.directionalLight.updateMatrixWorld();
  }

  private updateShadowMode() {
    if (!this.scene || !this.renderer) return;

    // Signal dependencies
    const shadowsEnabled = this.shadowEnabled;
    const shadowsOnly = this.showShadowsOnly;

    // 1. Toggle Renderer Shadow Map
    this.renderer.shadowMap.enabled = shadowsEnabled;
    // We need to trigger material updates if shadow map state changes effectively
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.needsUpdate = true);
        } else {
          obj.material.needsUpdate = true;
        }
      }
    });

    // 2. Handle Shadows Only (Visibility)
    this.scene.traverse((obj) => {
      if (!obj) return;
      if (obj.name === 'GroundPlane') return;
      if (obj instanceof THREE.GridHelper || obj instanceof THREE.AxesHelper || obj instanceof THREE.CameraHelper) return;

      let parent = obj.parent;
      let isGizmo = false;
      while (parent) {
        if (parent instanceof TransformControls) {
          isGizmo = true;
          break;
        }
        parent = parent.parent;
      }
      if (isGizmo) return;
      if (obj.parent instanceof TransformControls) return;

      if (obj instanceof THREE.Mesh) {
        // Toggle color write based on 'shadowsOnly'
        // If shadowsOnly is true, we want invisible objects (colorWrite=false) but casting shadows (depthWrite=true usually sufficient?)
        // Actually for standard shadow maps, the mesh MUST be in the shadow map pass.
        // colorWrite=false prevents it from being in the color buffer, but it stays in shadow map if castShadow=true.

        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          if (m) {
            m.colorWrite = !shadowsOnly;
            m.needsUpdate = true;
          }
        });
      }
    });
  }

  private updateCameraSettings() {
    if (!this.camera || !this.renderer) return;

    // Signal dependencies
    const fov = this.cameraFov;
    const contrast = this.cameraContrast;

    this.camera.fov = this._cameraFov;
    this.camera.updateProjectionMatrix();

    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = this._cameraContrast;
  }

  // --- Primitives ---
  public addPrimitive(type: 'cube' | 'sphere' | 'cylinder') {
    let geometry: THREE.BufferGeometry;
    const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });

    switch (type) {
      case 'cube': geometry = new THREE.BoxGeometry(1, 1, 1); break;
      case 'sphere': geometry = new THREE.SphereGeometry(0.5, 32, 16); break;
      case 'cylinder': geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
      default: return;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = 0.5;
    mesh.name = `Primitive_${type}_${Date.now()}`;

    this.scene.add(mesh);
    this.selectedObject = mesh;
    this.updateTransformControl();
  }

  // --- Import ---
  public async importModel(file: File) {
    const url = URL.createObjectURL(file);
    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      let object: THREE.Group | THREE.Object3D | null = null;

      if (extension === 'gltf' || extension === 'glb') {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);
        object = gltf.scene;
      } else if (extension === 'obj') {
        const loader = new OBJLoader();
        object = await loader.loadAsync(url);
      } else if (extension === 'fbx') {
        const loader = new FBXLoader();
        object = await loader.loadAsync(url);
      } else {
        console.warn('Unsupported format');
        return;
      }

      if (object) {
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        object.position.set(0, 0, 0); // Reset position
        this.scene.add(object);
        this.selectedObject = object;
        this.updateTransformControl();
      }
    } catch (err) {
      console.error('Error loading model', err);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
