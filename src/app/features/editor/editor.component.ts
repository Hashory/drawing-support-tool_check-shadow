import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreeSceneService } from '../../core/services/three-scene.service';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-container" [class.sidebar-open]="isSidebarOpen">
      <div class="canvas-container">
        <canvas #renderCanvas></canvas>
      </div>
      
      <button class="sidebar-toggle" (click)="toggleSidebar()" [attr.aria-label]="isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'">
        <span class="icon">{{ isSidebarOpen ? '→' : '☰' }}</span>
      </button>

      <div class="sidebar">
        <header>
          <h2>Controls</h2>
        </header>
        
        <div class="sidebar-content">
          <div class="control-group">
            <h3>Light</h3>
            <div class="control-item">
              <label>Angle: {{ threeService.lightAngle }}°</label>
              <input type="range" min="0" max="360" [value]="threeService.lightAngle" (input)="updateLightAngle($event)" />
            </div>
            <div class="control-item">
              <label>Intensity: {{ threeService.lightIntensity }}</label>
              <input type="range" min="0" max="2" step="0.1" [value]="threeService.lightIntensity" (input)="updateLightIntensity($event)" />
            </div>
          </div>
          
          <div class="control-group">
            <h3>Camera</h3>
            <div class="control-item">
              <label>FOV: {{ threeService.cameraFov }}</label>
              <input type="range" min="20" max="100" [value]="threeService.cameraFov" (input)="updateFov($event)" />
            </div>
            <div class="control-item">
              <label>Contrast: {{ threeService.cameraContrast }}</label>
              <input type="range" min="0.5" max="2.0" step="0.1" [value]="threeService.cameraContrast" (input)="updateContrast($event)" />
            </div>
          </div>

          <div class="control-group">
              <h3>Objects</h3>
              <div class="button-grid">
                <button (click)="fileInput.click()" class="primary">Import Model</button>
                <input #fileInput type="file" (change)="onFileSelected($event)" accept=".gltf,.glb,.obj,.fbx" style="display: none;" />
                <button (click)="addCube()">Cube</button>
                <button (click)="addSphere()">Sphere</button>
                <button (click)="addCylinder()">Cylinder</button>
              </div>

              <div *ngIf="threeService.selectedObject as obj" class="selected-object-panel">
                  <header>
                    <p>Selected: <strong>{{ obj.name }}</strong></p>
                  </header>
                  
                  <div class="sub-group">
                    <label>Position</label>
                    <div class="axis-controls">
                      <div>
                        <span>X: {{ obj.position.x | number:'1.1-1' }}</span>
                        <input type="range" min="-10" max="10" step="0.1" [value]="obj.position.x" (input)="updatePosition($event, 'x')" />
                      </div>
                      <div>
                        <span>Y: {{ obj.position.y | number:'1.1-1' }}</span>
                        <input type="range" min="0" max="10" step="0.1" [value]="obj.position.y" (input)="updatePosition($event, 'y')" />
                      </div>
                      <div>
                        <span>Z: {{ obj.position.z | number:'1.1-1' }}</span>
                        <input type="range" min="-10" max="10" step="0.1" [value]="obj.position.z" (input)="updatePosition($event, 'z')" />
                      </div>
                    </div>
                  </div>

                   <div class="sub-group">
                    <label>Rotation Y: {{ obj.rotation.y | number:'1.1-1' }}</label>
                    <input type="range" min="0" max="6.28" step="0.1" [value]="obj.rotation.y" (input)="updateRotation($event, 'y')" />
                   </div>

                   <div class="sub-group">
                    <label>Scale: {{ obj.scale.x | number:'1.1-1' }}</label>
                    <input type="range" min="0.1" max="5" step="0.1" [value]="obj.scale.x" (input)="updateScale($event)" />
                   </div>

                  <button (click)="deleteSelected()" class="danger">Delete Object</button>
              </div>
          </div>

          <div class="control-group">
              <h3>Shadows</h3>
              <label class="checkbox-container">
                <input type="checkbox" [checked]="threeService.shadowEnabled" (change)="toggleShadows($event)" />
                <span class="checkmark"></span>
                Enable Shadows
              </label>
              <label class="checkbox-container">
                <input type="checkbox" [checked]="threeService.showShadowsOnly" (change)="toggleShadowsOnly($event)" />
                <span class="checkmark"></span>
                Shadows Only
              </label>
          </div>
          <div class="control-group">
              <h3>Export</h3>
              <div class="button-grid">
                <button (click)="exportImage('png')">PNG</button>
                <button (click)="exportImage('jpeg')">JPG</button>
              </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --sidebar-width: 320px;
      --bg-dark: #0f0f0f;
      --bg-sidebar: rgba(30, 30, 30, 0.85);
      --accent: #3a86ff;
      --accent-hover: #4895ef;
      --border: rgba(255, 255, 255, 0.1);
      --text: #e0e0e0;
      --text-muted: #a0a0a0;
      --danger: #ef233c;
    }

    .editor-container {
      display: flex;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-dark);
      position: relative;
    }

    .canvas-container {
      flex: 1;
      position: relative;
      z-index: 1;
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    .sidebar-toggle {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--accent);
      color: white;
      border: none;
      cursor: pointer;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sidebar-open .sidebar-toggle {
      right: calc(var(--sidebar-width) + 20px);
    }

    .sidebar-toggle:hover {
      background: var(--accent-hover);
      transform: translateY(-2px);
    }

    .sidebar {
      width: var(--sidebar-width);
      height: 100%;
      background: var(--bg-sidebar);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: var(--text);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      position: fixed;
      right: 0;
      top: 0;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 90;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
    }

    .sidebar-open .sidebar {
      transform: translateX(0);
    }

    .sidebar header {
      padding: 24px;
      border-bottom: 1px solid var(--border);
    }

    .sidebar h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .sidebar-content::-webkit-scrollbar {
      width: 6px;
    }
    .sidebar-content::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 3px;
    }

    h3 {
      margin: 0 0 16px 0;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .control-group {
      display: flex;
      flex-direction: column;
    }

    .control-item {
      margin-bottom: 16px;
    }

    label {
      display: block;
      font-size: 0.85rem;
      margin-bottom: 8px;
    }

    input[type=range] {
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      outline: none;
    }

    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      background: var(--accent);
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.1s;
    }

    input[type=range]::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    .button-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    button {
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
      white-space: nowrap;
    }

    button:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    button.primary {
      background: var(--accent);
      border-color: transparent;
      grid-column: span 2;
    }

    button.danger {
      background: rgba(239, 35, 60, 0.1);
      color: var(--danger);
      border-color: rgba(239, 35, 60, 0.2);
      margin-top: 10px;
    }

    button.danger:hover {
      background: var(--danger);
      color: white;
    }

    .selected-object-panel {
      margin-top: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .axis-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .axis-controls span {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      margin-bottom: 12px;
      user-select: none;
    }

    /* Media Queries for responsive behavior */
    @media (max-width: 768px) {
      :host {
        --sidebar-width: 100%;
      }

      .sidebar {
        width: 100%;
        background: var(--bg-dark);
        z-index: 200;
      }

      .sidebar-open .sidebar-toggle {
        right: 20px;
        top: 20px;
      }
      
      .sidebar-toggle {
        width: 48px;
        height: 48px;
        border-radius: 50%;
      }
    }
  `]
})
export class EditorComponent implements OnInit {
  @ViewChild('renderCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  isSidebarOpen = true;

  constructor(public threeService: ThreeSceneService) { }

  ngOnInit() {
    // Hide sidebar by default on small screens
    if (window.innerWidth <= 768) {
      this.isSidebarOpen = false;
    }

    if (this.canvasRef) {
      this.threeService.initialize(this.canvasRef.nativeElement);
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  updateLightAngle(event: Event) {
    this.threeService.lightAngle = (event.target as HTMLInputElement).valueAsNumber;
  }

  updateLightIntensity(event: Event) {
    this.threeService.lightIntensity = (event.target as HTMLInputElement).valueAsNumber;
  }

  updateFov(event: Event) {
    this.threeService.cameraFov = (event.target as HTMLInputElement).valueAsNumber;
  }

  updateContrast(event: Event) {
    this.threeService.cameraContrast = (event.target as HTMLInputElement).valueAsNumber;
  }

  addCube() { this.threeService.addPrimitive('cube'); }
  addSphere() { this.threeService.addPrimitive('sphere'); }
  addCylinder() { this.threeService.addPrimitive('cylinder'); }

  deleteSelected() {
    const obj = this.threeService.selectedObject;
    if (obj) {
      this.threeService.scene.remove(obj);
      this.threeService.transformControls.detach();
      this.threeService.selectedObject = null;
    }
  }

  updatePosition(event: Event, axis: 'x' | 'y' | 'z') {
    const val = (event.target as HTMLInputElement).valueAsNumber;
    const obj = this.threeService.selectedObject;
    if (obj) {
      obj.position[axis] = val;
    }
  }

  updateRotation(event: Event, axis: 'x' | 'y' | 'z') {
    const val = (event.target as HTMLInputElement).valueAsNumber;
    const obj = this.threeService.selectedObject;
    if (obj) {
      obj.rotation[axis] = val;
    }
  }

  updateScale(event: Event) {
    const val = (event.target as HTMLInputElement).valueAsNumber;
    const obj = this.threeService.selectedObject;
    if (obj) {
      obj.scale.set(val, val, val);
    }
  }

  toggleShadows(event: Event) {
    this.threeService.shadowEnabled = (event.target as HTMLInputElement).checked;
  }

  toggleShadowsOnly(event: Event) {
    this.threeService.showShadowsOnly = (event.target as HTMLInputElement).checked;
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.threeService.importModel(file);
    }
  }

  exportImage(type: 'png' | 'jpeg') {
    const canvas = this.canvasRef.nativeElement;
    const dataUrl = canvas.toDataURL(`image/${type}`);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `render.${type}`;
    link.click();
  }
}
