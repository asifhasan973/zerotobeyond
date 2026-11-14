import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useLoadingStore, useOrientationLifecycleStore } from "@exo/ui";
import type { CosmicObject } from "@exo/data/cosmic";
import { positionAt, solarCoordinates } from "@exo/engine/cosmic";
import { createSolarScene, ORBIT_COLOURS } from "./solarScene";

export interface SolarCamera {
  zoom(factor: number): void;
}
interface Props {
  objects: CosmicObject[];
  selectedId: string | null;
  focusVersion: number;
  overview: boolean;
  jd: number;
  rate: number;
  panelWidth: number;
  orbits: boolean;
  labels: boolean;
  lighting: boolean;
  pan: boolean;
  cameraRef: RefObject<SolarCamera | null>;
  onSelect(id: string): void;
  onReady(): void;
}
export function SolarViewport(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(props),
    dirtyRef = useRef(true),
    dateAnchor = useRef(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (current.current.jd !== props.jd || current.current.rate !== props.rate)
      dateAnchor.current = performance.now();
    current.current = props;
    dirtyRef.current = true;
  }, [props]);
  useEffect(() => {
    dateAnchor.current = performance.now();
    const cameraHandle = current.current.cameraRef;
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        logarithmicDepthBuffer: true,
        powerPreference: "high-performance",
      });
    } catch {
      queueMicrotask(() => setFailed(true));
      current.current.onReady();
      return;
    }
    renderer.setClearColor(0x080611);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "Interactive Solar System. Drag to orbit, right-drag or use Pan to move sideways, scroll or pinch to zoom. Select a labelled planet to visit it.",
    );
    element.appendChild(canvas);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(45, 1, 1e-7, 8000);
    camera.layers.enable(1);
    camera.position.set(0, 3.1, 6.5);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.085;
    controls.zoomToCursor = true;
    controls.screenSpacePanning = true;
    controls.maxDistance = 1800;
    controls.minDistance = 0.005;
    controls.minPolarAngle = 0.025;
    controls.maxPolarAngle = Math.PI - 0.025;
    const labelRoot = document.createElement("div");
    labelRoot.className = "solar-object-labels";
    element.appendChild(labelRoot);
    const labels = new Map<string, HTMLButtonElement>();
    for (const object of current.current.objects) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `solar-object-label is-${object.kind}`;
      button.setAttribute("aria-label", `Explore ${object.name}`);
      button.style.setProperty(
        "--object-color",
        ORBIT_COLOURS[object.id] ?? object.color,
      );
      const dot = document.createElement("i"),
        text = document.createElement("span");
      text.textContent = object.name;
      button.append(dot, text);
      button.onclick = () => current.current.onSelect(object.id);
      labelRoot.appendChild(button);
      labels.set(object.id, button);
    }
    let disposed = false,
      dirty = true,
      frame = 0,
      previousJd = NaN,
      focusVersion = -1,
      previousId: string | null | undefined = undefined;
    const model = createSolarScene(scene, current.current.objects, () => {
      dirty = true;
    });
    useLoadingStore.getState().registerLoaderTask(model.task);
    void model.task.then(
      () => {
        if (!disposed) current.current.onReady();
      },
      () => {
        if (!disposed) {
          setFailed(true);
          current.current.onReady();
        }
      },
    );
    const fromPosition = new THREE.Vector3(),
      fromTarget = new THREE.Vector3(),
      toPosition = new THREE.Vector3(),
      toTarget = new THREE.Vector3();
    const projected = new THREE.Vector3(),
      previousFollow = new THREE.Vector3(),
      delta = new THREE.Vector3();
    let following = false,
      flightStart = 0,
      zoomStart = 0,
      zoomFrom = 0,
      zoomTo = 0,
      width = 1,
      height = 1,
      viewPanel = current.current.panelWidth;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      const panel = Math.min(viewPanel, width * 0.42);
      camera.setViewOffset(width, height, -panel / 2, 0, width, height);
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const change = () => {
      dirty = true;
    };
    controls.addEventListener("change", change);
    const cancelFlight = () => {
      flightStart = 0;
      zoomStart = 0;
    };
    controls.addEventListener("start", cancelFlight);
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let downX = 0,
      downY = 0;
    const down = (event: PointerEvent) => {
      downX = event.clientX;
      downY = event.clientY;
    };
    const up = (event: PointerEvent) => {
      if (
        event.button !== 0 ||
        Math.hypot(event.clientX - downX, event.clientY - downY) > 4 ||
        useOrientationLifecycleStore.getState().isFrozen
      )
        return;
      const box = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - box.left) / box.width) * 2 - 1,
        (-(event.clientY - box.top) / box.height) * 2 + 1,
      );
      ray.layers.enable(1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(
        [...model.bodies.values()].map((body) => body.root),
        true,
      )[0];
      if (hit) {
        let object: THREE.Object3D | null = hit.object;
        while (object && !object.userData.id) object = object.parent;
        if (object?.userData.id) current.current.onSelect(object.userData.id);
      }
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    const syncTime = () => {
      dateAnchor.current = performance.now();
    };
    document.addEventListener("visibilitychange", syncTime);
    const lost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
      current.current.onReady();
    };
    canvas.addEventListener("webglcontextlost", lost);
    const api: SolarCamera = {
      zoom(factor) {
        cancelFlight();
        zoomFrom = camera.position.distanceTo(controls.target);
        zoomTo = THREE.MathUtils.clamp(
          zoomFrom * factor,
          controls.minDistance,
          controls.maxDistance,
        );
        zoomStart = performance.now();
        dirty = true;
      },
    };
    cameraHandle.current = api;
    const animate = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      if (document.hidden || useOrientationLifecycleStore.getState().isFrozen) {
        dateAnchor.current = now;
        return;
      }
      const p = current.current;
      if (dirtyRef.current) {
        dirty = true;
        dirtyRef.current = false;
      }
      const desiredPanel = Math.min(p.panelWidth, width * 0.42);
      if (Math.abs(viewPanel - desiredPanel) > 0.1) {
        viewPanel = reduced
          ? desiredPanel
          : THREE.MathUtils.lerp(viewPanel, desiredPanel, 0.14);
        camera.setViewOffset(width, height, -viewPanel / 2, 0, width, height);
        dirty = true;
      }
      controls.mouseButtons.LEFT = p.pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      const samples = p.objects[0].samples!;
      const renderJd = THREE.MathUtils.clamp(
        p.jd + ((now - dateAnchor.current) * p.rate) / 86400000,
        samples[0].jd,
        samples.at(-1)!.jd,
      );
      if (previousJd !== renderJd) {
        for (const body of model.bodies.values()) {
          const position = positionAt(body.object, renderJd);
          body.root.visible = !!position;
          if (position) body.root.position.set(...solarCoordinates(position));
          if (body.object.kind !== "spacecraft")
            body.surface.rotation.y =
              ((renderJd - 2451545) * Math.PI * 2) /
              (body.object.id === "10"
                ? 25
                : body.object.id === "399"
                  ? 1
                  : body.object.id === "599"
                    ? 0.414
                    : 2);
        }
        previousJd = renderJd;
        dirty = true;
      }
      const body = p.selectedId ? model.bodies.get(p.selectedId) : null;
      if (previousId !== p.selectedId || focusVersion !== p.focusVersion) {
        previousId = p.selectedId;
        focusVersion = p.focusVersion;
        fromPosition.copy(camera.position);
        fromTarget.copy(controls.target);
        toTarget.copy(
          body?.root.position ?? model.bodies.get("10")!.root.position,
        );
        const distance = body
          ? body.radius *
            (body.object.kind === "spacecraft"
              ? 11
              : body.object.id === "699"
                ? 8
                : 5.2)
          : p.overview
            ? 76
            : 3.25;
        toPosition
          .set(distance * 0.13, distance * 0.43, distance * 0.9)
          .add(toTarget);
        controls.minDistance = body
          ? body.radius * (body.object.kind === "spacecraft" ? 4 : 1.35)
          : 0.006;
        flightStart = now;
        zoomStart = 0;
        following = false;
        dirty = true;
      }
      if (flightStart) {
        if (body) {
          delta.copy(body.root.position).sub(toTarget);
          toPosition.add(delta);
          toTarget.copy(body.root.position);
        }
        const t = reduced ? 1 : Math.min(1, (now - flightStart) / 1900),
          ease = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(fromPosition, toPosition, ease);
        controls.target.lerpVectors(fromTarget, toTarget, ease);
        if (t === 1) {
          flightStart = 0;
          if (body) {
            previousFollow.copy(body.root.position);
            following = true;
          }
        }
        dirty = true;
      } else if (body && following) {
        delta.copy(body.root.position).sub(previousFollow);
        camera.position.add(delta);
        controls.target.add(delta);
        previousFollow.copy(body.root.position);
      }
      if (zoomStart) {
        const t = reduced ? 1 : Math.min(1, (now - zoomStart) / 250);
        delta
          .copy(camera.position)
          .sub(controls.target)
          .normalize()
          .multiplyScalar(
            THREE.MathUtils.lerp(zoomFrom, zoomTo, 1 - (1 - t) ** 3),
          );
        camera.position.copy(controls.target).add(delta);
        if (t === 1) zoomStart = 0;
        dirty = true;
      }
      if (controls.update()) dirty = true;
      if (!dirty) return;
      camera.near = Math.max(
        1e-9,
        camera.position.distanceTo(controls.target) * 0.00002,
      );
      camera.updateProjectionMatrix();
      model.update(
        p.orbits,
        p.lighting,
        p.selectedId ?? "",
        camera.position.distanceTo(controls.target),
      );
      for (const item of model.bodies.values()) {
        const distance = camera.position.distanceTo(item.root.position);
        const resolved =
          item.object.id === p.selectedId ||
          ((item.radius / Math.max(distance, 1e-10)) * height) /
            (2 * Math.tan((camera.fov * Math.PI) / 360)) >
            0.7;
        for (const child of item.root.children) child.visible = resolved;
      }
      renderer.render(scene, camera);
      const occupied: { x: number; y: number; w: number }[] = [];
      const labelOrder = [
        "10",
        "399",
        "499",
        "599",
        "699",
        "199",
        "299",
        "799",
        "899",
        "301",
      ];
      const ordered = [...model.bodies.values()].sort(
        (a, b) =>
          Number(b.object.id === p.selectedId) -
            Number(a.object.id === p.selectedId) ||
          (labelOrder.indexOf(a.object.id) < 0
            ? 99
            : labelOrder.indexOf(a.object.id)) -
            (labelOrder.indexOf(b.object.id) < 0
              ? 99
              : labelOrder.indexOf(b.object.id)) ||
          Number(a.object.kind === "spacecraft") -
            Number(b.object.kind === "spacecraft"),
      );
      for (const item of ordered) {
        const label = labels.get(item.object.id)!;
        projected.copy(item.root.position).project(camera);
        const x = (projected.x * 0.5 + 0.5) * width,
          y = (-projected.y * 0.5 + 0.5) * height;
        const distance = camera.position.distanceTo(item.root.position);
        const bodyPixels =
          ((item.radius / Math.max(distance, 1e-10)) * height) /
          (2 * Math.tan((camera.fov * Math.PI) / 360));
        const visible =
          p.labels &&
          item.root.visible &&
          projected.z < 1 &&
          projected.z > -1 &&
          x > 10 &&
          x < width - 80 &&
          y > 65 &&
          y < height - 85 &&
          (item.object.id !== "301" ||
            distance < 0.08 ||
            p.selectedId === "301");
        label.classList.toggle("is-resolved", bodyPixels > 8);
        label.hidden = !visible;
        if (!visible) continue;
        const offset = Math.max(9, Math.min(200, bodyPixels + 12)),
          labelWidth = item.object.name.length * 9 + offset + 15;
        const collide = occupied.some(
          (r) =>
            Math.abs(r.y - y) < 25 && x < r.x + r.w && x + labelWidth > r.x,
        );
        label.classList.toggle(
          "is-marker-only",
          collide && item.object.id !== p.selectedId,
        );
        label.classList.toggle("is-selected", item.object.id === p.selectedId);
        label.style.transform = `translate3d(${x}px,${y}px,0)`;
        label.style.setProperty("--label-offset", `${offset}px`);
        if (!collide) occupied.push({ x, y, w: labelWidth });
      }
      dirty = false;
    };
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncTime);
      controls.removeEventListener("change", change);
      controls.removeEventListener("start", cancelFlight);
      controls.dispose();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("webglcontextlost", lost);
      if (cameraHandle.current === api) cameraHandle.current = null;
      model.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      labelRoot.remove();
    };
  }, [props.objects]);
  return (
    <div className="solar-viewport" ref={host}>
      {failed && (
        <div className="solar-scene-fallback" role="alert">
          <h2>3D view unavailable</h2>
          <p>
            Your planets, spacecraft and travel tools are still available in the
            sidebar.
          </p>
          <button onClick={() => location.reload()}>Reload 3D view</button>
        </div>
      )}
    </div>
  );
}
