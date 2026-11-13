import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Vented, scalloped fabric gores with suspension lines attached to the skirt. */
export function createRecoveryRig(mains: boolean): THREE.Group {
  const rig = new THREE.Group();
  rig.name = mains ? "main-parachutes" : "drogue-parachutes";
  rig.position.y = 1.5;
  const canopies: THREE.BufferGeometry[] = [];
  const seams: THREE.Vector3[] = [],
    cords: THREE.Vector3[] = [];
  const cream = new THREE.Color("#fff1d9"),
    orange = new THREE.Color("#ed6031");
  const count = mains ? 3 : 2,
    gores = mains ? 20 : 12;
  for (let canopy = 0; canopy < count; canopy++) {
    const radius = mains ? 1.28 : 0.48;
    const cx = (canopy - (count - 1) / 2) * (mains ? 2.15 : 1.1);
    const cy = mains ? (canopy === 1 ? 6.65 : 6.05) : 4;
    const cz = mains && canopy === 1 ? -1.6 : 0.25;
    const positions: number[] = [],
      colors: number[] = [],
      indices: number[] = [];
    const point = (angle: number, row: number) => {
      const theta = 0.11 + (row / 12) * 1.62;
      const billow = 1 + 0.022 * Math.sin((angle * gores) / 2) ** 2;
      const r = Math.sin(theta) * radius * billow;
      return new THREE.Vector3(
        cx + Math.cos(angle) * r,
        cy - 1.5 + Math.cos(theta) * radius * 0.78,
        cz + Math.sin(angle) * r,
      );
    };
    for (let gore = 0; gore < gores; gore++) {
      const offset = positions.length / 3;
      const color = mains && gore % 4 < 2 ? orange : cream;
      for (let row = 0; row <= 12; row++) {
        for (let column = 0; column <= 4; column++) {
          const angle = ((gore + column / 4) / gores) * Math.PI * 2;
          point(angle, row).toArray(positions, positions.length);
          color.toArray(colors, colors.length);
          if (row < 12 && column < 4) {
            const i = offset + row * 5 + column;
            indices.push(i, i + 5, i + 1, i + 1, i + 5, i + 6);
          }
        }
        if (row < 12) {
          const angle = (gore / gores) * Math.PI * 2;
          seams.push(point(angle, row), point(angle, row + 1));
        }
      }
      const angle = (gore / gores) * Math.PI * 2;
      cords.push(new THREE.Vector3((cx / 4) * 0.15, 0, 0), point(angle, 12));
      for (let edge = 0; edge < 4; edge++) {
        const a = ((gore + edge / 4) / gores) * Math.PI * 2;
        const b = ((gore + (edge + 1) / 4) / gores) * Math.PI * 2;
        seams.push(point(a, 0), point(b, 0), point(a, 12), point(b, 12));
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    canopies.push(geometry);
  }
  const fabric = new THREE.Mesh(
    mergeGeometries(canopies)!,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.94,
      metalness: 0,
    }),
  );
  fabric.name = "recovery-fabric";
  rig.add(fabric);
  canopies.forEach((g) => g.dispose());
  rig.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(seams),
      new THREE.LineBasicMaterial({
        color: 0x815d42,
        transparent: true,
        opacity: 0.24,
      }),
    ),
  );
  rig.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(cords),
      new THREE.LineBasicMaterial({
        color: 0xf5eadb,
        transparent: true,
        opacity: 0.72,
      }),
    ),
  );
  return rig;
}

/** Static ocean buffers; analytic waves and sun reflections run on the GPU. */
export function createRecoveryEnvironment() {
  const time = { value: 0 };
  // Tileable surface normals avoid several trigonometric evaluations per pixel.
  const size = 128,
    pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2,
        v = (y / size) * Math.PI * 2;
      const i = (y * size + x) * 4;
      pixels[i] = 128 + Math.round(Math.cos(u * 4 + Math.sin(v * 2)) * 50);
      pixels[i + 1] = 128 + Math.round(Math.cos(v * 7 + Math.sin(u * 3)) * 50);
      pixels[i + 2] = 128;
      pixels[i + 3] = 255;
    }
  }
  const ripples = new THREE.DataTexture(pixels, size, size);
  ripples.wrapS = ripples.wrapT = THREE.RepeatWrapping;
  ripples.magFilter = ripples.minFilter = THREE.LinearFilter;
  ripples.needsUpdate = true;
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800, 72, 72),
    new THREE.ShaderMaterial({
      uniforms: { time, ripples: { value: ripples } },
      vertexShader: `
        uniform float time;
        varying vec3 worldPosition;
        varying vec3 waveNormal;
        void main() {
          vec3 p = position;
          waveNormal = normalize(vec3(
            -0.0198 * cos(p.x * 0.22 + time * 0.7), 1.0,
             0.01705 * cos(p.y * 0.31 - time * 0.5)));
          p.z += sin(p.x * 0.22 + time * 0.7) * 0.09
               + sin(p.y * 0.31 - time * 0.5) * 0.055;
          worldPosition = (modelMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
        }`,
      fragmentShader: `
        uniform float time;
        uniform sampler2D ripples;
        varying vec3 worldPosition;
        varying vec3 waveNormal;
        void main() {
          vec2 detail = texture2D(ripples, worldPosition.xz * 0.12 + vec2(time * 0.006, -time * 0.004)).rg - 0.5;
          vec3 n = normalize(waveNormal + vec3(detail.x * 0.08, 0.0, detail.y * 0.08));
          vec3 v = normalize(cameraPosition - worldPosition);
          float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0);
          float ripple = detail.x + detail.y;
          vec3 color = mix(vec3(0.002, 0.018, 0.044), vec3(0.05, 0.16, 0.24), fresnel);
          float glint = pow(max(dot(reflect(-normalize(vec3(-0.6, 0.7, -0.6)), n), v), 0.0), 80.0);
          color += glint * vec3(1.0, 0.80, 0.49) * (0.4 + ripple * 0.25);
          color += ripple * 0.003;
          float haze = 1.0 - exp(-length(cameraPosition - worldPosition) * 0.005);
          gl_FragColor = vec4(mix(color, vec3(0.20, 0.38, 0.48), haze), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  sea.material.addEventListener("dispose", () => ripples.dispose());
  sea.name = "recovery-ocean";
  sea.rotation.x = -Math.PI / 2;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(700, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 direction;
        void main() {
          direction = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 direction;
        void main() {
          vec3 d = normalize(direction);
          float height = pow(max(d.y, 0.0), 0.45);
          vec3 color = mix(vec3(0.25, 0.45, 0.60), vec3(0.008, 0.07, 0.20), height);
          float sun = pow(max(dot(d, normalize(vec3(-0.6, 0.18, -0.6))), 0.0), 180.0);
          color += vec3(1.0, 0.71, 0.34) * sun * 0.45;
          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.name = "recovery-sky";
  return { sea, sky, time };
}
