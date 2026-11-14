import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useOrientationLifecycleStore, useLoadingStore } from "@exo/ui";
import type { CosmicObject } from "@exo/data/cosmic";
import { positionAt } from "@exo/engine/cosmic";
import { COSMIC_TEXTURES } from "./assetRegistry";
import { createSolarEffects } from "./SolarEffects";
interface Props {
  objects: CosmicObject[];
  selected: CosmicObject;
  exponent: number;
  jd: number;
  focusId: string;
  focusVersion: number;
  navigation: string;
  physical: boolean;
  grid: boolean;
  orbits: boolean;
  light: boolean;
  follow: boolean;
  onSelect(id: string): void;
  onZoom(delta: number): void;
}
export function CosmicViewport(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(props);
  useEffect(() => {
    current.current = props;
  }, [props]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    renderer.setClearColor(0x070b16);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    element.appendChild(renderer.domElement);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      "aria-label",
      "3D atlas. Use Orbit or Pan mode. Drag to move; scroll toward the cursor to zoom. W A S D moves in Fly mode.",
    );
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(48, 1, 0.01, 10000);
    camera.position.set(0, 90, 210);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enableZoom = true;
    controls.zoomToCursor = true;
    controls.minDistance = 25;
    controls.maxDistance = 2000;
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      vertexShader: `attribute float glyphSize; attribute float kind; varying vec3 vColor; varying float vKind; void main(){vColor=color;vKind=kind;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=glyphSize;}`,
      fragmentShader: `varying vec3 vColor; varying float vKind; void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);if(vKind>1.5){if(abs(p.x)+abs(p.y)>1.)discard;}else if(vKind>.5){if(length(vec2(p.x,p.y*1.8))>1.)discard;}else if(r>1.)discard;gl_FragColor=vec4(vColor,smoothstep(1.,.1,r)*.9+.1);}`,
    });
    const cloud = new THREE.Points(geometry, material);
    scene.add(cloud);
    const sphere = new THREE.SphereGeometry(1, 40, 24),
      meshes = new Map<
        string,
        THREE.Mesh<
          THREE.SphereGeometry,
          THREE.MeshBasicMaterial | THREE.MeshStandardMaterial
        >
      >();
    const labelRoot = document.createElement("div");
    labelRoot.className = "cosmic-object-labels";
    element.appendChild(labelRoot);
    const labels = new Map<string, HTMLButtonElement>();
    const initial = current.current;
    for (const o of initial.objects.filter((o) => o.samples)) {
      const mesh = new THREE.Mesh(
        sphere,
        o.id === "10"
          ? new THREE.MeshBasicMaterial({ color: o.color })
          : new THREE.MeshStandardMaterial({ color: o.color, roughness: 1 }),
      );
      mesh.userData.id = o.id;
      meshes.set(o.id, mesh);
      scene.add(mesh);
      const label = document.createElement("button");
      label.textContent = (o.kind === "spacecraft" ? "◇ " : "") + o.name;
      label.onclick = () => current.current.onSelect(o.id);
      labelRoot.appendChild(label);
      labels.set(o.id, label);
    }
    const effects = createSolarEffects(scene, initial.objects);
    const saturnRing = new THREE.Mesh(
      new THREE.RingGeometry(1.25, 2.3, 96),
      new THREE.MeshBasicMaterial({
        color: 0xcbbd9b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      }),
    );
    saturnRing.rotation.x = 1.15;
    scene.add(saturnRing);
    const highlight = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 2.86, 64),
      new THREE.MeshBasicMaterial({
        color: 0x8ce2c2,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    scene.add(highlight);
    const grid = new THREE.GridHelper(1000, 20, 0x345269, 0x172737);
    scene.add(grid);
    const textures: THREE.Texture[] = [];
    const task = Promise.all(
      [...meshes.entries()]
        .filter(([id]) => COSMIC_TEXTURES[id])
        .map(async ([id, mesh]) => {
          try {
            const t = await new THREE.TextureLoader().loadAsync(
              COSMIC_TEXTURES[id],
            );
            t.colorSpace = THREE.SRGBColorSpace;
            textures.push(t);
            mesh.material.map = t;
            mesh.material.color.set("white");
            mesh.material.needsUpdate = true;
            dirty = true;
          } catch {
            /* The labelled body marker remains usable. */
          }
        }),
    );
    useLoadingStore.getState().registerLoaderTask(task);
    let dirty = true,
      disposed = false,
      frame = 0,
      previous = "",
      focusVersion = -1,
      unit = 10 ** initial.exponent / 100,
      updating = false,
      flightStart = 0;
    const flightPose = new THREE.Vector3(0, 90, 210);
    let origin = new THREE.Vector3(
      ...(positionAt(initial.selected, initial.jd) ??
        initial.selected.position),
    );
    let pickable: CosmicObject[] = [];
    let lastObjects: CosmicObject[] | null = null;
    let wheelExponent: number | null = null;
    const ray = new THREE.Raycaster();
    ray.params.Points = { threshold: 1.2 };
    const changed = () => {
      dirty = true;
      if (updating) return;
      const distance = camera.position.distanceTo(controls.target),
        normal = Math.hypot(90, 210),
        delta = Math.log10(distance / normal);
      if (Math.abs(delta) > 0.001) {
        const p = current.current;
        const next = Math.max(3, Math.min(24, p.exponent + delta));
        const f = 10 ** (next - p.exponent);
        wheelExponent = next;
        updating = true;
        camera.position.divideScalar(f);
        controls.target.divideScalar(f);
        controls.update();
        updating = false;
        flightStart = 0;
        p.onZoom(next - p.exponent);
      }
    };
    controls.addEventListener("change", changed);
    let down = [0, 0];
    const onDown = (e: PointerEvent) => {
      flightStart = 0;
      down = [e.clientX, e.clientY];
    };
    const onUp = (e: PointerEvent) => {
      if (
        e.button !== 0 ||
        useOrientationLifecycleStore.getState().isFrozen ||
        Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4
      )
        return;
      const r = element.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const body = ray.intersectObjects(
        [...meshes.values()].filter((m) => m.visible),
      )[0];
      if (body) {
        current.current.onSelect(String(body.object.userData.id));
        return;
      }
      const hit = ray.intersectObject(cloud)[0];
      if (hit?.index !== undefined && pickable[hit.index])
        current.current.onSelect(pickable[hit.index].id);
    };
    const onKey = (e: KeyboardEvent) => {
      if (
        current.current.navigation !== "fly" ||
        useOrientationLifecycleStore.getState().isFrozen
      )
        return;
      const axes: Record<string, [number, number, number]> = {
        w: [0, 0, -12],
        s: [0, 0, 12],
        a: [-12, 0, 0],
        d: [12, 0, 0],
        q: [0, -12, 0],
        e: [0, 12, 0],
      };
      const a = axes[e.key.toLowerCase()];
      if (!a) return;
      e.preventDefault();
      const shift = new THREE.Vector3(...a).applyQuaternion(camera.quaternion);
      camera.position.add(shift);
      controls.target.add(shift);
      dirty = true;
    };
    const lost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("keydown", onKey);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const resize = new ResizeObserver(() => {
      renderer.setSize(element.clientWidth, element.clientHeight);
      camera.aspect = element.clientWidth / Math.max(1, element.clientHeight);
      camera.updateProjectionMatrix();
      dirty = true;
    });
    resize.observe(element);
    const vector = new THREE.Vector3();
    const animate = () => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const p = current.current;
      const frozen = useOrientationLifecycleStore.getState().isFrozen;
      controls.enabled = !frozen;
      if (frozen || document.hidden) return;
      controls.mouseButtons.LEFT =
        p.navigation === "orbit" ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
      controls.touches.ONE =
        p.navigation === "orbit" ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN;
      grid.visible = p.grid;
      const key = [
        p.exponent,
        p.jd,
        p.selected.id,
        p.focusVersion,
        p.physical,
        p.grid,
        p.navigation,
        p.orbits,
        p.light,
        p.follow,
      ].join(":");
      // Keep the rendered frame camera-relative, including after long pans.
      if (controls.target.length() > 1000) {
        origin.addScaledVector(controls.target, unit);
        camera.position.sub(controls.target);
        controls.target.set(0, 0, 0);
        previous = "";
      }
      const mergedSolarMarker = (o: CosmicObject) =>
        !!o.samples &&
        p.exponent >= 12 &&
        o.id !== p.selected.id &&
        (o.id !== "10" || p.exponent >= 20);
      if (key !== previous || lastObjects !== p.objects) {
        lastObjects = p.objects;
        if (focusVersion !== p.focusVersion) {
          const focus = initial.objects.find((o) => o.id === p.focusId);
          if (focus) {
            origin.set(...(positionAt(focus, p.jd) ?? focus.position));
            updating = true;
            controls.target.set(0, 0, 0);
            const pos = positionAt(focus, p.jd) ?? focus.position;
            if (focus.kind === "planet" && p.exponent < 8)
              flightPose
                .set(...pos)
                .normalize()
                .negate()
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.45)
                .multiplyScalar(Math.hypot(90, 210));
            else flightPose.set(0, 90, 210);
            camera.position.copy(flightPose);
            controls.update();
            updating = false;
            flightStart = 0;
          }
          flightStart = performance.now();
          focusVersion = p.focusVersion;
        }
        if (p.follow) {
          const pos = positionAt(p.selected, p.jd);
          if (pos) origin.set(...pos);
        }
        const nextUnit = 10 ** p.exponent / 100;
        if (
          nextUnit !== unit &&
          (wheelExponent === null ||
            Math.abs(wheelExponent - p.exponent) > 0.0001)
        ) {
          origin.addScaledVector(controls.target, unit);
          camera.position.sub(controls.target);
          controls.target.set(0, 0, 0);
        }
        wheelExponent = null;
        unit = nextUnit;
        const positions: number[] = [],
          colors: number[] = [],
          sizes: number[] = [],
          kinds: number[] = [];
        pickable = [];
        for (const mesh of meshes.values()) mesh.visible = false;
        for (const o of p.objects) {
          if (mergedSolarMarker(o)) continue;
          const v = positionAt(o, p.jd);
          if (!v) continue;
          const relative = v.map((x, i) => (x - origin.getComponent(i)) / unit);
          if (Math.hypot(...relative) > 5000) continue;
          const mesh = meshes.get(o.id);
          if (mesh) {
            mesh.visible = o.kind !== "spacecraft";
            mesh.position.set(...(relative as [number, number, number]));
            mesh.scale.setScalar(
              p.physical
                ? (o.radiusKm ?? 0) / unit
                : Math.max(0.7, (o.radiusKm ?? 0) / unit),
            );
          }
          if (p.physical && o.radiusKm && o.kind !== "spacecraft") continue;
          positions.push(...relative);
          const c = new THREE.Color(o.color);
          colors.push(c.r, c.g, c.b);
          sizes.push(
            o.kind === "spacecraft"
              ? 9
              : o.samples
                ? 5
                : o.magnitude === undefined
                  ? 5
                  : Math.max(1.2, Math.min(7, 5 - o.magnitude / 2)),
          );
          kinds.push(
            o.kind === "spacecraft" || o.kind === "quasar"
              ? 2
              : o.kind === "galaxy"
                ? 1
                : 0,
          );
          pickable.push(o);
        }
        geometry.dispose();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3),
        );
        geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(colors, 3),
        );
        geometry.setAttribute(
          "glyphSize",
          new THREE.Float32BufferAttribute(sizes, 1),
        );
        geometry.setAttribute(
          "kind",
          new THREE.Float32BufferAttribute(kinds, 1),
        );
        geometry.computeBoundingSphere();
        const selectedPosition = positionAt(p.selected, p.jd);
        highlight.visible =
          !!selectedPosition && p.objects.some((o) => o.id === p.selected.id);
        highlight.scale.setScalar(
          Math.max(1, (p.selected.radiusKm ?? 0) / unit / 2.5),
        );
        if (selectedPosition)
          highlight.position.set(
            ...(selectedPosition.map(
              (v, i) => (v - origin.getComponent(i)) / unit,
            ) as [number, number, number]),
          );
        const saturn = meshes.get("699")!;
        saturnRing.visible = saturn.visible;
        saturnRing.position.copy(saturn.position);
        saturnRing.scale.copy(saturn.scale);
        effects.update(
          origin,
          unit,
          new Set(p.objects.map((o) => o.id)),
          p.orbits,
          p.light,
          meshes.get("399"),
          meshes.get("10"),
        );
        previous = key;
        dirty = true;
      }
      if (flightStart) {
        const t = Math.min(1, (performance.now() - flightStart) / 700);
        camera.position.copy(flightPose).multiplyScalar(1 + 0.7 * (1 - t) ** 3);
        updating = true;
        controls.update();
        updating = false;
        dirty = true;
        if (t === 1) flightStart = 0;
      }
      controls.update();
      if (dirty) {
        highlight.lookAt(camera.position);
        renderer.render(scene, camera);
        const rect = element.getBoundingClientRect();
        if (!labels.has(p.selected.id)) {
          const label = document.createElement("button");
          label.textContent = p.selected.name;
          const id = p.selected.id;
          label.onclick = () => current.current.onSelect(id);
          labelRoot.appendChild(label);
          labels.set(id, label);
        }
        for (const [id, label] of labels) {
          if (!meshes.has(id) && id !== p.selected.id) {
            label.remove();
            labels.delete(id);
          }
        }
        const occupied: { x: number; y: number }[] = [];
        for (const [id, label] of [...labels].sort(
          ([a], [b]) =>
            Number(b === p.selected.id) - Number(a === p.selected.id),
        )) {
          const o = p.objects.find((o) => o.id === id);
          const pos = o && !mergedSolarMarker(o) && positionAt(o, p.jd);
          label.hidden = true;
          if (!pos) continue;
          vector
            .set(
              ...(pos.map((v, i) => (v - origin.getComponent(i)) / unit) as [
                number,
                number,
                number,
              ]),
            )
            .project(camera);
          const x = ((vector.x + 1) * rect.width) / 2,
            y = ((1 - vector.y) * rect.height) / 2;
          if (
            vector.z > 1 ||
            vector.z < -1 ||
            x < 0 ||
            x > rect.width - 90 ||
            y < 0 ||
            y > rect.height - 30
          )
            continue;
          if (
            id !== p.selected.id &&
            occupied.some(
              (a) => Math.abs(a.x - x) < 100 && Math.abs(a.y - y) < 25,
            )
          )
            continue;
          label.hidden = false;
          label.style.transform = `translate(${x + 8}px,${y + 8}px)`;
          occupied.push({ x, y });
        }
        dirty = false;
      }
    };
    animate();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.removeEventListener("change", changed);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("keydown", onKey);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      effects.dispose();
      geometry.dispose();
      material.dispose();
      sphere.dispose();
      meshes.forEach((m) => m.material.dispose());
      saturnRing.geometry.dispose();
      saturnRing.material.dispose();
      highlight.geometry.dispose();
      highlight.material.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      task.then(() => textures.forEach((t) => t.dispose()));
      renderer.dispose();
      labelRoot.remove();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div ref={host} className="cosmic-viewport">
      {failed && (
        <div className="cosmic-fallback" role="status">
          3D unavailable. Use the object browser, distances and sources.
        </div>
      )}
    </div>
  );
}
