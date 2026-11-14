import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CosmicObject } from "@exo/data/cosmic";
import { AU_KM, orbitGuide, solarCoordinates } from "@exo/engine/cosmic";
import {
  COSMIC_TEXTURES,
  SOLAR_MODELS,
  SOLAR_DRACO_PATH,
} from "../assetRegistry";

export const ORBIT_COLOURS: Record<string, string> = {
  "199": "#9974c4",
  "299": "#c9b56e",
  "399": "#238caf",
  "499": "#b26937",
  "599": "#956b63",
  "699": "#b6ae84",
  "799": "#829c9e",
  "899": "#7091a4",
};
export interface SolarBody {
  object: CosmicObject;
  root: THREE.Group;
  radius: number;
  surface: THREE.Object3D;
}
function ringTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  for (let r = 67; r < 128; r++) {
    ctx.strokeStyle = `rgba(${175 + r / 2},${155 + r / 2},${125 + r / 2},${r > 95 && r < 100 ? 0.08 : 0.25 + (Math.sin(r * 3.3) + 1) * 0.25})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}
export function createSolarScene(
  scene: THREE.Scene,
  objects: CosmicObject[],
  redraw: () => void,
) {
  let disposed = false;
  const bodies = new Map<string, SolarBody>(),
    orbitLines: THREE.Line[] = [];
  const textureSet = new Set<THREE.Texture>();
  const ambient = new THREE.AmbientLight(0xc3d5f0, 0.18),
    sunlight = new THREE.PointLight(0xfffaf1, 3.2, 0, 0);
  scene.add(ambient, sunlight);
  const sphere = new THREE.SphereGeometry(1, 64, 40);
  for (const object of objects) {
    const root = new THREE.Group();
    root.userData.id = object.id;
    const radius =
      object.kind === "spacecraft"
        ? 0.000012
        : (object.radiusKm ?? 2000) / AU_KM;
    let surface: THREE.Object3D;
    if (object.kind === "spacecraft") surface = new THREE.Group();
    else
      surface = new THREE.Mesh(
        sphere,
        object.id === "10"
          ? new THREE.MeshBasicMaterial({ color: 0xffffff })
          : new THREE.MeshStandardMaterial({
              color: object.color,
              roughness: 1,
              metalness: 0,
            }),
      );
    root.scale.setScalar(radius);
    root.add(surface);
    scene.add(root);
    root.traverse((child) => {
      child.userData.id = object.id;
    });
    if (object.id === "399") {
      const atmosphere = new THREE.Mesh(
        sphere,
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexShader:
            "varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
          fragmentShader:
            "varying vec3 n;varying vec3 v;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(.1,.4,1.,a*.4);}",
        }),
      );
      atmosphere.scale.setScalar(1.02);
      root.add(atmosphere);
    }
    if (object.id === "699") {
      const map = ringTexture();
      textureSet.add(map);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.23, 2.35, 128),
        new THREE.MeshBasicMaterial({
          map,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          color: 0xf5e6c7,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      root.rotation.z = 0.47;
      root.add(ring);
    }
    bodies.set(object.id, { object, root, radius, surface });
    const points =
      object.kind === "planet"
        ? orbitGuide(object)
        : object.kind === "spacecraft"
          ? (object.samples?.map((s) => s.position) ?? [])
          : [];
    if (points.length) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          points.map((p) => new THREE.Vector3(...solarCoordinates(p))),
        ),
        new THREE.LineBasicMaterial({
          color: ORBIT_COLOURS[object.id] ?? object.color,
          transparent: true,
          opacity: object.kind === "spacecraft" ? 0.24 : 0.62,
        }),
      );
      line.userData.kind = object.kind;
      orbitLines.push(line);
      scene.add(line);
    }
  }
  let seed = 71831;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const stars: number[] = [],
    colours: number[] = [];
  for (let i = 0; i < 2800; i++) {
    const z = random() * 2 - 1,
      angle = random() * Math.PI * 2,
      s = Math.sqrt(1 - z * z),
      brightness = 0.14 + random() ** 4 * 0.65;
    stars.push(
      Math.cos(angle) * s * 2800,
      z * 2800,
      Math.sin(angle) * s * 2800,
    );
    colours.push(
      brightness,
      brightness * (0.9 + random() * 0.1),
      brightness * (0.8 + random() * 0.2),
    );
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(stars, 3),
  );
  starGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colours, 3),
  );
  const starfield = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      size: 1.25,
      sizeAttenuation: false,
      vertexColors: true,
      depthWrite: false,
    }),
  );
  scene.add(starfield);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!,
    gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,225,1)");
  gradient.addColorStop(0.07, "rgba(255,245,160,.8)");
  gradient.addColorStop(0.2, "rgba(255,220,80,.12)");
  gradient.addColorStop(1, "rgba(255,190,40,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const glowTexture = new THREE.CanvasTexture(canvas);
  textureSet.add(glowTexture);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffe87b,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(glow);
  // Dedicated inspection lights leave planetary day/night shading unchanged.
  const spacecraftFill = new THREE.HemisphereLight(0xe5edff, 0x77604a, 2.5);
  const spacecraftKey = new THREE.DirectionalLight(0xfff0d9, 3);
  spacecraftKey.position.set(3, 4, 5);
  spacecraftFill.layers.set(1);
  spacecraftKey.layers.set(1);
  scene.add(spacecraftFill, spacecraftKey);
  const draco = new DRACOLoader().setDecoderPath(SOLAR_DRACO_PATH);
  const modelLoader = new GLTFLoader().setDRACOLoader(draco);
  const modelTasks = [...bodies.values()]
    .filter((body) => body.object.kind === "spacecraft")
    .map(async (body) => {
      const gltf = await modelLoader.loadAsync(SOLAR_MODELS[body.object.id]);
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const scale = 3.6 / Math.max(size.x, size.y, size.z);
      model.scale.multiplyScalar(scale);
      model.position.copy(center).multiplyScalar(-scale);
      model.traverse((child) => {
        child.userData.id = body.object.id;
        child.layers.set(1);
        if (child instanceof THREE.Mesh) {
          for (const material of Array.isArray(child.material)
            ? child.material
            : [child.material]) {
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) textureSet.add(value);
            }
          }
          if (disposed) {
            child.geometry.dispose();
            for (const material of Array.isArray(child.material)
              ? child.material
              : [child.material])
              material.dispose();
          }
        }
      });
      if (disposed) {
        textureSet.forEach((texture) => texture.dispose());
        return;
      }
      body.surface.add(model);
      body.surface.rotation.set(0.3, -0.6, 0.15);
      redraw();
    });
  const task = Promise.all([
    Promise.all(modelTasks),
    Promise.all(
      [...bodies.values()]
        .filter((b) => COSMIC_TEXTURES[b.object.id])
        .map(async (body) => {
          try {
            const map = await new THREE.TextureLoader().loadAsync(
              COSMIC_TEXTURES[body.object.id],
            );
            if (disposed) {
              map.dispose();
              return;
            }
            map.colorSpace = THREE.SRGBColorSpace;
            map.anisotropy = 4;
            textureSet.add(map);
            const mesh = body.surface as THREE.Mesh<
              THREE.SphereGeometry,
              THREE.MeshStandardMaterial
            >;
            mesh.material.map = map;
            mesh.material.color.set("white");
            mesh.material.needsUpdate = true;
            redraw();
          } catch {
            /* Surface colour remains available if a texture cannot load. */
          }
        }),
    ),
  ]);
  return {
    bodies,
    task,
    update(orbits: boolean, lighting: boolean, selected: string, zoom: number) {
      ambient.intensity = lighting ? 0.18 : 1.9;
      sunlight.intensity = lighting ? 3.2 : 0;
      const sun = bodies.get("10")!;
      sunlight.position.copy(sun.root.position);
      glow.position.copy(sun.root.position);
      glow.scale.setScalar(Math.max(0.055, zoom * 0.075));
      glow.visible = selected !== "10" || zoom > 0.1;
      for (const line of orbitLines)
        line.visible =
          orbits && (zoom > 0.05 || line.userData.kind === "spacecraft");
      starfield.position.copy(sun.root.position);
    },
    dispose() {
      disposed = true;
      draco.dispose();
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((child) => {
        if (
          child instanceof THREE.Mesh ||
          child instanceof THREE.Line ||
          child instanceof THREE.Points
        ) {
          geometries.add(child.geometry);
          for (const m of Array.isArray(child.material)
            ? child.material
            : [child.material])
            materials.add(m);
        }
        if (child instanceof THREE.Sprite) materials.add(child.material);
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textureSet.forEach((t) => t.dispose());
      scene.clear();
    },
  };
}
