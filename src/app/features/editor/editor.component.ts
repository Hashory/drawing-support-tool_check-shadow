import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreeSceneService } from '../../core/services/three-scene.service';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-container">
      <div class="canvas-container">
        <canvas #renderCanvas></canvas>
      </div>
      <div class="sidebar">
        <h2>Controls</h2>
        
        <div class="control-group">
          <h3>Light</h3>
          <label>Angle: {{ threeService.lightAngle }}</label>
          <input type="range" min="0" max="360" [value]="threeService.lightAngle" (input)="updateLightAngle($event)" />
          <label>Intensity: {{ threeService.lightIntensity }}</label>
          <input type="range" min="0" max="2" step="0.1" [value]="threeService.lightIntensity" (input)="updateLightIntensity($event)" />
        </div>
        
        <div class="control-group">
          <h3>Camera</h3>
          <label>FOV: {{ threeService.cameraFov }}</label>
          <input type="range" min="20" max="100" [value]="threeService.cameraFov" (input)="updateFov($event)" />
          <label>Contrast: {{ threeService.cameraContrast }}</label>
          <input type="range" min="0.5" max="2.0" step="0.1" [value]="threeService.cameraContrast" (input)="updateContrast($event)" />
        </div>

        <div class="control-group">
            <h3>Objects</h3>
            <button (click)="fileInput.click()">Import Model</button>
            <input #fileInput type="file" (change)="onFileSelected($event)" accept=".gltf,.glb,.obj,.fbx" style="display: none;" />
            
            <button (click)="addCube()">Add Cube</button>
            <button (click)="addSphere()">Add Sphere</button>
            <button (click)="addCylinder()">Add Cylinder</button>
            <div *ngIf="threeService.selectedObject as obj">
                <p>Selected: {{ obj.name }}</p>
                
                <div class="sub-group">
                  <label>Pos X: {{ obj.position.x | number:'1.1-2' }}</label>
                  <input type="range" min="-10" max="10" step="0.1" [value]="obj.position.x" (input)="updatePosition($event, 'x')" />
                  <label>Pos Y: {{ obj.position.y | number:'1.1-2' }}</label>
                  <input type="range" min="0" max="10" step="0.1" [value]="obj.position.y" (input)="updatePosition($event, 'y')" />
                  <label>Pos Z: {{ obj.position.z | number:'1.1-2' }}</label>
                  <input type="range" min="-10" max="10" step="0.1" [value]="obj.position.z" (input)="updatePosition($event, 'z')" />
                </div>

                 <div class="sub-group">
                  <label>Rot Y: {{ obj.rotation.y | number:'1.1-2' }}</label>
                  <input type="range" min="0" max="6.28" step="0.1" [value]="obj.rotation.y" (input)="updateRotation($event, 'y')" />
                 </div>

                 <div class="sub-group">
                  <label>Scale: {{ obj.scale.x | number:'1.1-2' }}</label>
                  <input type="range" min="0.1" max="5" step="0.1" [value]="obj.scale.x" (input)="updateScale($event)" />
                 </div>

                <button (click)="deleteSelected()">Delete</button>
            </div>
        </div>

        <div class="control-group">
            <h3>Shadows</h3>
            <label>
              <input type="checkbox" [checked]="threeService.shadowEnabled" (change)="toggleShadows($event)" />
              Enable Shadows
            </label>
            <label>
              <input type="checkbox" [checked]="threeService.showShadowsOnly" (change)="toggleShadowsOnly($event)" />
              Shadows Only (Invisible Objects)
            </label>
        </div>
        <div class="control-group">
            <h3>Export</h3>
            <button (click)="exportImage('png')">Export PNG</button>
            <button (click)="exportImage('jpeg')">Export JPG</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .editor-container {
      display: flex;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    .canvas-container {
      flex: 1;
      background: #333;
      position: relative;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    .sidebar {
      width: 300px;
      padding: 20px;
      background: #1e1e1e;
      color: #e0e0e0;
      overflow-y: auto;
      border-left: 1px solid #333;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    h2, h3 { margin: 0 0 10px 0; color: #fff; }
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-bottom: 15px;
      border-bottom: 1px solid #333;
    }
    label { font-size: 0.9em; }
    input[type=range] { width: 100%; }
    button {
      padding: 8px;
      background: #333;
      color: white;
      border: 1px solid #555;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover { background: #444; }
  `]
})
export class EditorComponent implements OnInit {
  @ViewChild('renderCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(public threeService: ThreeSceneService) { }

  ngOnInit() {
    if (this.canvasRef) {
      this.threeService.initialize(this.canvasRef.nativeElement);
    }
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
