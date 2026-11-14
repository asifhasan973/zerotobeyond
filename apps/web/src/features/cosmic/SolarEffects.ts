import * as THREE from "three";
import type { CosmicObject } from "@exo/data/cosmic";
import { orbitGuide } from "@exo/engine/cosmic";
export function createSolarEffects(
  scene: THREE.Scene,
  objects: CosmicObject[],
) {
  const ambient = new THREE.AmbientLight(0xb7d5ff, 0.22),
    sun = new THREE.PointLight(0xfff5df, 2.7, 0, 0);
  scene.add(ambient, sun);
  const paths = objects
    .filter((o) => o.kind === "planet")
    .map((o) => {
      const points = orbitGuide(o),
        geometry = new THREE.BufferGeometry();
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: o.color,
          transparent: true,
          opacity: 0.45,
        }),
      );
      scene.add(line);
      return { id: o.id, points, line };
    });
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,250,210,1)");
  g.addColorStop(0.12, "rgba(255,210,100,.65)");
  g.addColorStop(0.4, "rgba(255,170,40,.15)");
  g.addColorStop(1, "rgba(255,170,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas),
    glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
  scene.add(glow);
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 24),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader:
        "varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
      fragmentShader:
        "varying vec3 n;varying vec3 v;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(.18,.5,1.,a*.55);}",
    }),
  );
  scene.add(atmosphere);
  return {
    update(
      origin: THREE.Vector3,
      unit: number,
      visibleIds: Set<string>,
      guides: boolean,
      lighting: boolean,
      earth: THREE.Mesh | undefined,
      sunMesh: THREE.Mesh | undefined,
    ) {
      sun.position.copy(origin).multiplyScalar(-1 / unit);
      ambient.intensity = lighting ? 0.22 : 2.4;
      sun.intensity = lighting ? 2.7 : 0;
      glow.position.copy(sun.position);
      glow.visible = !!sunMesh?.visible;
      glow.scale.setScalar(Math.max(7, (695700 / unit) * 8));
      atmosphere.visible =
        !!earth?.visible && !!earth && earth.scale.x > 1 && lighting;
      if (earth) {
        atmosphere.position.copy(earth.position);
        atmosphere.scale.copy(earth.scale).multiplyScalar(1.025);
      }
      for (const { id, points, line } of paths) {
        line.visible =
          guides && visibleIds.has(id) && unit >= 1e5 && unit < 1e11;
        if (!line.visible) continue;
        line.geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            points.flatMap((p) =>
              p.map((v, k) => (v - origin.getComponent(k)) / unit),
            ),
            3,
          ),
        );
        line.geometry.computeBoundingSphere();
      }
    },
    dispose() {
      for (const { line } of paths) {
        line.geometry.dispose();
        line.material.dispose();
        scene.remove(line);
      }
      texture.dispose();
      glow.material.dispose();
      atmosphere.geometry.dispose();
      atmosphere.material.dispose();
      scene.remove(glow, atmosphere, ambient, sun);
    },
  };
}
