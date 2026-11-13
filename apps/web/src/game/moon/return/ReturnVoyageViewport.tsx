import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SceneFallback, useLoadingStore, isEngineFrozen } from "@exo/ui";
import { sampleReturnTrajectory, RETURN_REFERENCE } from "@exo/engine";
import { createReturnEarth } from "./presentation/voyageEarth";
import { createCrewedPlatform } from "../crew/crewedMeshes";
import { disposeGroup } from "../workshop/lander/workshopMeshes";
import { returnFrameLimit, returnVisualFrame } from "./return";
import {
  createRecoveryEnvironment,
  createRecoveryRig,
} from "./presentation/voyageRecovery";
import type { ReturnState } from "./return";
export function ReturnVoyageViewport({
  flight,
  gentle,
}: {
  flight: ReturnState;
  gentle: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(flight),
    receivedAt = useRef(0),
    view = useRef("craft");
  const [mode, setMode] = useState("craft"),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    latest.current = flight;
    receivedAt.current = performance.now();
  }, [flight]);
  useEffect(() => {
    view.current = mode;
  }, [mode]);
  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    let disposed = false,
      raf = 0,
      renderer: THREE.WebGLRenderer | undefined;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#040814");
    const camera = new THREE.PerspectiveCamera(42, 1, 0.002, 1500);
    let controls: OrbitControls | undefined;
    let clean = () => {};
    const task = (async () => {
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        const loseContext = (event: Event) => {
          event.preventDefault();
          if (!disposed) setFailed(true);
        };
        renderer.domElement.addEventListener("webglcontextlost", loseContext);
        mount.append(renderer.domElement);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.enableZoom = true;
        scene.add(new THREE.HemisphereLight(0xa9cfff, 0x171322, 1.05));
        const sun = new THREE.DirectionalLight(0xfff0d9, 3);
        sun.position.set(30, 20, 40);
        scene.add(sun);
        const loader = new THREE.TextureLoader();
        const [map, moonMap] = await Promise.all([
          loader.loadAsync(
            `${import.meta.env.BASE_URL}story/flight/earth-blue-marble.jpg`,
          ),
          loader.loadAsync(
            `${import.meta.env.BASE_URL}story/flight/moon-lroc.jpg`,
          ),
        ]);
        if (disposed) {
          map.dispose();
          moonMap.dispose();
          return;
        }
        map.colorSpace = moonMap.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        const earth = createReturnEarth(map);
        scene.add(earth);
        const start = sampleReturnTrajectory(0).position.map(
          (v) => v / RETURN_REFERENCE.earthRadiusKm,
        );
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(1737.4 / 6371, 40, 32),
          new THREE.MeshStandardMaterial({ map: moonMap, roughness: 1 }),
        );
        // Displayed hardware is enlarged; reserve its full hull, not only the
        // physical 100-km orbit clearance. The analytical coast remains unchanged.
        moon.position.fromArray(start).add(new THREE.Vector3(0, -0.62, -0.25));
        moon.name = "return-moon";
        scene.add(moon);
        const points = Array.from({ length: 257 }, (_, i) =>
          new THREE.Vector3(
            ...sampleReturnTrajectory(i / 256).position,
          ).divideScalar(6371),
        );
        const route = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({
            color: 0x826295,
            transparent: true,
            opacity: 0.65,
          }),
        );
        scene.add(route);
        const trailGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const trail = new THREE.Line(
          trailGeometry,
          new THREE.LineBasicMaterial({ color: 0xa6e4cb }),
        );
        scene.add(trail);
        const craft = new THREE.Group(),
          command = new THREE.Group(),
          service = new THREE.Group();
        craft.name = "return-spacecraft";
        craft.add(command, service);
        scene.add(craft);
        const hardware = createCrewedPlatform();
        for (const child of [...hardware.capsule.children]) {
          const cabin = child.position.y >= 2.65;
          child.position.y -= 2.73;
          if (child instanceof THREE.Group && cabin) child.rotation.y = 0;
          (cabin ? command : service).add(child);
        }
        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.24, 1.4, 24),
          new THREE.MeshBasicMaterial({
            color: 0x99dfff,
            transparent: true,
            opacity: 0.8,
          }),
        );
        flame.rotation.z = Math.PI;
        flame.position.y = -3.4;
        service.add(flame);
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(
            0.86,
            32,
            20,
            0,
            Math.PI * 2,
            Math.PI / 2,
            Math.PI / 2,
          ),
          new THREE.MeshBasicMaterial({
            color: 0xff973c,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        glow.scale.y = 0.22;
        command.add(glow);
        const wakePositions = new Float32Array(90 * 3);
        const wakeGeometry = new THREE.BufferGeometry();
        wakeGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(wakePositions, 3),
        );
        const wake = new THREE.Points(
          wakeGeometry,
          new THREE.PointsMaterial({
            color: 0xffa34e,
            size: 0.055,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        wake.material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <alphatest_fragment>",
            `#include <alphatest_fragment>
             float radius = length(gl_PointCoord - 0.5);
             if (radius > 0.5) discard;
             diffuseColor.a *= smoothstep(0.5, 0.05, radius);`,
          );
        };
        command.add(wake);
        const { sea, sky, time: oceanTime } = createRecoveryEnvironment();
        scene.add(sea, sky);
        const chuteGroups = [createRecoveryRig(false), createRecoveryRig(true)];
        craft.add(...chuteGroups);
        const splash = new THREE.Mesh(
          new THREE.TorusGeometry(1.5, 0.04, 8, 80),
          new THREE.MeshBasicMaterial({
            color: 0xc9eaff,
            transparent: true,
            opacity: 0.5,
          }),
        );
        splash.rotation.x = -Math.PI / 2;
        splash.position.y = 0.04;
        scene.add(splash);
        const starPositions = [];
        for (let i = 0; i < 900; i++)
          starPositions.push(
            Math.sin(i * 17) * 400,
            Math.cos(i * 23) * 400,
            Math.sin(i * 31) * 400,
          );
        const stars = new THREE.Points(
          new THREE.BufferGeometry().setAttribute(
            "position",
            new THREE.Float32BufferAttribute(starPositions, 3),
          ),
          new THREE.PointsMaterial({
            color: 0xcdd9ef,
            size: 0.3,
            sizeAttenuation: true,
          }),
        );
        scene.add(stars);
        let last = performance.now(),
          visualTime = 0,
          lastStage = "",
          lastSeparated = false,
          lastMode = "";
        const target = new THREE.Vector3(),
          up = new THREE.Vector3(0, 1, 0),
          velocity = new THREE.Vector3(),
          desired = new THREE.Vector3(),
          delta = new THREE.Vector3(),
          midpoint = new THREE.Vector3(...start).multiplyScalar(0.5),
          mapOffset = new THREE.Vector3(0, 6, 42),
          craftOffset = new THREE.Vector3(0.55, 0.35, 0.9),
          spaceColor = new THREE.Color("#040814"),
          airColor = new THREE.Color("#101e36"),
          seaColor = new THREE.Color("#8fbcd0");
        const localOffset = new THREE.Vector3(),
          cameraLift = new THREE.Vector3(0, 0.2, 0.65);
        let visualFrame = 0,
          previousFrame = -1,
          wasFrozen = false;
        const draw = () => {
          if (disposed || !renderer) return;
          const r = latest.current,
            now = performance.now(),
            frozen = r.paused || isEngineFrozen();
          const changed =
            r.stage !== lastStage || !!r.serviceSeparated !== lastSeparated;
          if (changed || r.frame < previousFrame)
            visualFrame = returnVisualFrame(r, 0);
          if (!frozen) {
            if (wasFrozen) receivedAt.current = now;
            visualFrame = Math.max(
              visualFrame,
              returnVisualFrame(r, (now - receivedAt.current) / 1000),
            );
          }
          previousFrame = r.frame;
          wasFrozen = frozen;
          const p = Math.min(1, visualFrame / returnFrameLimit(r));
          if (r.stage !== lastStage || !!r.serviceSeparated !== lastSeparated) {
            visualTime = 0;
            lastStage = r.stage;
            lastSeparated = !!r.serviceSeparated;
            lastMode = "";
          }
          if (!frozen) visualTime += Math.min(0.05, (now - last) / 1000);
          last = now;
          const space = ["docked", "burning", "coast"].includes(r.stage),
            ocean = ["chutes", "splashdown"].includes(r.stage);
          const sample = sampleReturnTrajectory(
            r.stage === "coast" ? p : space ? 0 : 1,
          );
          route.visible = trail.visible = space;
          moon.visible = space;
          sea.visible = ocean;
          stars.visible = space || r.stage === "entry-ready";
          sky.visible = ocean;
          scene.fog = null;
          oceanTime.value = gentle ? 0 : visualTime;
          splash.visible = r.stage === "splashdown";
          earth.visible = !ocean;
          flame.visible = r.stage === "burning" && !!r.burnFiring && !r.paused;
          service.visible = space || r.stage === "entry-ready";
          glow.visible = wake.visible = r.stage === "entry";
          if (wake.visible) {
            const strength = Math.max(0, Math.sin(p * Math.PI));
            wake.material.opacity = strength * 0.85;
            for (let i = 0; i < 90; i++) {
              const along = (i / 90 + visualTime * 0.7) % 1;
              const angle = i * 2.39996;
              const radius = 0.87 - along * 0.35;
              wakePositions[i * 3] = Math.cos(angle) * radius;
              wakePositions[i * 3 + 1] = -0.1 + along * 2.8;
              wakePositions[i * 3 + 2] = Math.sin(angle) * radius;
            }
            wakeGeometry.attributes.position.needsUpdate = true;
          }
          chuteGroups[0].visible = r.stage === "chutes" && p < 0.35;
          chuteGroups[1].visible = r.stage === "chutes" && p >= 0.35;
          if (space) {
            earth.scale.setScalar(1);
            earth.position.set(0, 0, 0);
            craft.scale.setScalar(0.07);
            craft.position.fromArray(sample.position).divideScalar(6371);
            velocity.fromArray(sample.velocity).normalize();
            craftOffset.copy(velocity).multiplyScalar(-0.9).add(cameraLift);
            mapOffset.z = 90 / camera.aspect;
            flame.scale.y =
              0.9 + (gentle ? 0 : Math.sin(visualTime * 23) * 0.07);
            craft.quaternion.setFromUnitVectors(up, velocity);
            craft.rotateZ(((r.burnAngle ?? 0) * Math.PI) / 180);
            command.position.set(0, 0, 0);
            service.position.set(0, 0, 0);
            trailGeometry.setDrawRange(
              0,
              r.stage === "coast" ? Math.max(2, Math.round(p * 256)) : 0,
            );
            target.copy(
              view.current === "trajectory" ? midpoint : craft.position,
            );
            desired
              .copy(target)
              .add(view.current === "trajectory" ? mapOffset : craftOffset);
            scene.background = spaceColor;
          } else {
            craft.scale.setScalar(0.7);
            craft.position.set(
              0,
              ocean ? (r.stage === "splashdown" ? 0.03 : 8 * (1 - p)) : 2,
              0,
            );
            craft.rotation.set(
              0,
              0,
              r.stage === "entry-ready"
                ? 1.1
                : r.stage === "entry"
                  ? 1.1 + (0.16 - 1.1) * Math.min(1, p / 0.15)
                  : 0,
            );
            earth.scale.setScalar(26);
            earth.position.set(0, -26.7, -20);
            earth.rotation.z = 1.2;
            command.position.set(0, 0, 0);
            service.position.set(
              r.serviceSeparated ? Math.min(visualTime / 3, 1) * 3 : 0,
              r.serviceSeparated ? -Math.min(visualTime / 3, 1) * 2 : 0,
              r.serviceSeparated ? -Math.min(visualTime / 3, 1) * 2 : 0,
            );
            glow.material.opacity = Math.max(0, Math.sin(p * Math.PI)) * 0.65;
            // Frame the entire canopy/capsule silhouette, including narrow landscape panes.
            target.copy(craft.position).addScaledVector(up, ocean ? 2.4 : 0.4);
            const recoveryDistance = 10.5 / Math.min(1, camera.aspect);
            localOffset.set(
              ocean ? 2.7 : 5,
              ocean ? 1.8 : r.stage === "entry" ? -0.8 : 2,
              ocean ? recoveryDistance : 8,
            );
            desired.copy(target).add(localOffset);
            scene.background = ocean ? seaColor : airColor;
            earth.rotation.y = 2.3 + (gentle ? 0 : visualTime * 0.01);
            chuteGroups.forEach((group) => {
              group.rotation.z = gentle
                ? 0
                : Math.sin(visualTime * 0.7) * 0.025;
            });
            chuteGroups[0].scale.setScalar(Math.min(1, 0.15 + p * 18));
            chuteGroups[1].scale.setScalar(
              THREE.MathUtils.smoothstep(p, 0.35, 0.43),
            );
            if (r.stage === "splashdown") {
              craft.position.y =
                0.04 + (gentle ? 0 : Math.sin(visualTime) * 0.04);
              chuteGroups[1].visible = false;
              splash.scale.setScalar(1 + Math.min(visualTime, 3) * 0.5);
              splash.material.opacity = Math.max(
                0.08,
                0.55 - visualTime * 0.12,
              );
            }
          }
          if (lastMode !== view.current) {
            camera.position.copy(desired);
            controls!.target.copy(target);
            lastMode = view.current;
          } else {
            delta.copy(target).sub(controls!.target);
            camera.position.add(delta);
            controls!.target.copy(target);
          }
          controls!.enabled = !isEngineFrozen();
          if (!frozen || changed) controls!.update();
          renderer.render(scene, camera);
          raf = requestAnimationFrame(draw);
        };
        const resize = () => {
          if (!renderer) return;
          const w = Math.max(1, mount.clientWidth),
            h = Math.max(1, mount.clientHeight);
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          lastMode = "";
        };
        const observer = new ResizeObserver(resize);
        observer.observe(mount);
        resize();
        draw();
        clean = () => {
          observer.disconnect();
          controls?.dispose();
          map.dispose();
          moonMap.dispose();
          scene.traverse((object) => {
            if (
              object instanceof THREE.Line ||
              object instanceof THREE.Points
            ) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material)
                ? object.material
                : [object.material];
              materials.forEach((material) => material.dispose());
            }
          });
          disposeGroup(scene);
          disposeGroup(hardware.root);
        };
      } catch (error) {
        console.warn("Return viewport could not initialize", error);
        if (!disposed) setFailed(true);
      }
    })();
    useLoadingStore.getState().registerLoaderTask(task);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clean();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
  }, [gentle]);
  if (failed)
    return (
      <SceneFallback
        scene="return"
        label="Return flight view"
        detail="Flight controls remain available"
      />
    );
  return (
    <div className="voyage-viewport">
      <div
        ref={host}
        className="voyage-canvas"
        role="img"
        aria-label={`Return spacecraft: ${flight.stage}`}
      />
      {["docked", "burning", "coast"].includes(flight.stage) && (
        <div className="voyage-camera">
          {["craft", "trajectory"].map((value) => (
            <button
              key={value}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {value === "craft" ? "Craft" : "Trajectory"}
            </button>
          ))}
        </div>
      )}
      <span className="voyage-visual-note">
        {["docked", "burning", "coast"].includes(flight.stage)
          ? "Time accelerated · spacecraft enlarged"
          : "Apollo-style recovery · local view"}
      </span>
    </div>
  );
}
