import { shelterActive } from "./radiation/radiation";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createCrewedPlatform } from "@/game/moon/crew/crewedMeshes";
import { disposeGroup } from "@/game/moon/workshop/lander/workshopMeshes";
import { coastFraction, getLoiRequiredDv, TRANSFER_MODEL } from "./journey.ts";
import {
  createTransferPath,
  sampleTransferPath,
  sampleCapturePath,
  type TransferPath,
} from "@exo/engine";
import type { JourneyState } from "./journey.ts";
import type { PreparationSelection } from "@/game/moon/core/design";
import { transferSolution, LUNAR_ORBIT_TIERS } from "./transferModel.ts";
import { useLoadingStore } from "@exo/ui";
import { isEngineFrozen } from "@exo/ui";
import { SceneFallback } from "@exo/ui";

export function JourneyViewport({
  journey,
  gentle,
}: {
  journey: JourneyState;
  preparation: PreparationSelection;
  gentle: boolean;
}) {
  const initialMode = "craft";
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(journey),
    view = useRef<"craft" | "trajectory">(initialMode);
  const [mode, setMode] = useState<"craft" | "trajectory">(initialMode),
    [failed, setFailed] = useState(false);
  const reducedMotion = useRef(gentle);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedMotion.current = gentle || preference.matches;
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, [gentle]);
  useEffect(() => {
    latest.current = journey;
  }, [journey]);
  useEffect(() => {
    view.current = mode;
  }, [mode]);
  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    let disposed = false,
      frame = 0,
      renderer: THREE.WebGLRenderer | undefined,
      scene: THREE.Scene | undefined,
      controls: OrbitControls | undefined;
    let cleanup = () => {};
    const task = (async () => {
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
        renderer.setClearColor("#040814");
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;
        mount.appendChild(renderer.domElement);
        scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xa9bddc, 1.3));
        const light = new THREE.DirectionalLight(0xfff1d8, 3.5);
        scene.add(light);
        const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false;
        controls.enableDamping = false;
        controls.minDistance = 0.5;
        controls.maxDistance = 1200;
        let earthTexture: THREE.Texture | undefined;
        try {
          earthTexture = await new THREE.TextureLoader().loadAsync(
            `${import.meta.env.BASE_URL}story/flight/earth-blue-marble.jpg`,
          );
          earthTexture.colorSpace = THREE.SRGBColorSpace;
        } catch (e) {
          console.warn(
            "Could not load earth texture, falling back to blue marble tone",
            e,
          );
        }
        if (disposed) {
          earthTexture?.dispose();
          return;
        }
        const earthMat = earthTexture
          ? new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 1 })
          : new THREE.MeshStandardMaterial({
              color: 0x274e82,
              roughness: 0.9,
              metalness: 0.1,
            });
        const earth = new THREE.Mesh(
          new THREE.SphereGeometry(6.378137, 64, 48),
          earthMat,
        );
        scene.add(earth);
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(1.7374, 64, 48),
          new THREE.MeshStandardMaterial({ color: 0xaaa6a2, roughness: 1 }),
        );
        scene.add(moon);
        // Procedural relief is illustrative; trajectory positions use the ephemeris.
        const pos = moon.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i),
            y = pos.getY(i),
            z = pos.getZ(i),
            f =
              1 +
              0.003 * Math.sin(x * 37) * Math.cos(z * 29) * Math.sin(y * 31);
          pos.setXYZ(i, x * f, y * f, z * f);
        }
        moon.geometry.computeVertexNormals();
        const crew = createCrewedPlatform(),
          ship = crew.root;
        crew.capsule.position.set(0, 0, 0);
        crew.lander.position.set(0, 5.7, 0);
        crew.lander.rotation.z = Math.PI;
        crew.lander.scale.setScalar(0.7);
        ship.scale.setScalar(0.22);
        ship.name = "journey-spacecraft";
        scene.add(ship);
        const plume = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 5, 24),
          new THREE.MeshBasicMaterial({
            color: 0x96dbff,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        plume.position.y = -3.5;
        ship.add(plume);
        const guide = new THREE.ArrowHelper(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(),
          2,
          0x8ce2c2,
          0.25,
          0.15,
        );
        scene.add(guide);
        const starPositions = [];
        for (let i = 0; i < 1200; i++) {
          const a = i * 2.399,
            b = Math.acos(1 - (2 * (i + 0.5)) / 1200);
          starPositions.push(
            1800 * Math.sin(b) * Math.cos(a),
            1800 * Math.cos(b),
            1800 * Math.sin(b) * Math.sin(a),
          );
        }
        const stars = new THREE.BufferGeometry();
        stars.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(starPositions, 3),
        );
        scene.add(
          new THREE.Points(
            stars,
            new THREE.PointsMaterial({
              size: 1,
              color: 0xbccdf0,
              sizeAttenuation: false,
            }),
          ),
        );
        const line = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({
            color: 0x8ce2c2,
            transparent: true,
            opacity: 0.7,
          }),
        );
        line.name = "journey-transfer-path";
        scene.add(line);
        const beacon = new THREE.Group();
        const beaconMat = new THREE.MeshBasicMaterial({
          color: 0x8ce2c2,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const outerRing = new THREE.Mesh(
          new THREE.RingGeometry(5.8, 7.2, 48),
          beaconMat,
        );
        beacon.add(outerRing);
        const innerRing = new THREE.Mesh(
          new THREE.RingGeometry(2.8, 3.6, 32),
          beaconMat,
        );
        beacon.add(innerRing);
        for (let i = 0; i < 4; i++) {
          const tick = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 2.2),
            beaconMat,
          );
          const ang = (i * Math.PI) / 2;
          tick.position.set(Math.cos(ang) * 8.2, Math.sin(ang) * 8.2, 0);
          tick.rotation.z = ang + Math.PI / 2;
          beacon.add(tick);
        }
        beacon.visible = false;
        scene.add(beacon);
        const lunarOrbitRing = new THREE.LineLoop(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({
            color: 0x8ce2c2,
            transparent: true,
            opacity: 0.85,
          }),
        );
        lunarOrbitRing.visible = false;
        scene.add(lunarOrbitRing);
        let shelterClock = 0;
        let orbitClock = 0,
          lastTime = 0;
        let previous = "",
          previousMode = "";
        let path: TransferPath | undefined;
        let displayCoordinate: number | undefined,
          targetCoordinate = 0,
          fromCoordinate = 0,
          coordinateTime = 0;
        let stoppedAt: number | null = null;
        let cameraReady = false,
          rotatingCamera = false;
        const lastCameraOffset = new THREE.Vector3();
        let manualCamera = false;
        const lastPosition = new THREE.Vector3(),
          desiredCamera = new THREE.Vector3(),
          desiredTarget = new THREE.Vector3();
        const attitude = new THREE.Quaternion();
        controls.addEventListener("start", () => {
          rotatingCamera = false;
          manualCamera = true;
        });
        const resize = () => {
          if (!renderer) return;
          renderer.setSize(
            Math.max(1, mount.clientWidth),
            Math.max(1, mount.clientHeight),
            false,
          );
          camera.aspect =
            Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight);
          camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(mount);
        resize();
        const paint = () => {
          frame = 0;
          if (disposed) return;
          frame = requestAnimationFrame(paint);
          if (document.hidden || isEngineFrozen()) {
            stoppedAt ??= performance.now();
            lastTime = 0;
            return;
          }
          try {
            const now = performance.now();
            const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
            const moving = !latest.current.paused;
            if (!moving) stoppedAt ??= now;
            else if (stoppedAt !== null) {
              coordinateTime += now - stoppedAt;
              stoppedAt = null;
            }
            if (
              moving &&
              latest.current.stage === "complete" &&
              (displayCoordinate ?? 0) >= 1 + Math.PI * 0.9 &&
              !reducedMotion.current
            )
              orbitClock += dt;
            lastTime = now;
            const j = latest.current,
              s = transferSolution(j.date, j.route ?? "balanced"),
              key = `${j.date}-${j.route}-${j.orbitTier ?? "low"}`,
              v = view.current;
            const isTrajectory = v === "trajectory";
            if (!s) return;
            const lunarTier = LUNAR_ORBIT_TIERS[j.orbitTier ?? "low"];
            if (key !== previous || !path) {
              path = createTransferPath(
                s.path,
                s.moonPath[s.moonPath.length - 1],
                lunarTier.altitudeKm,
              );
              line.geometry.dispose();
              line.geometry = new THREE.BufferGeometry().setFromPoints(
                Array.from(
                  { length: 1441 },
                  (_, i) =>
                    new THREE.Vector3(...sampleTransferPath(path!, i / 1440)),
                ),
              );
              lunarOrbitRing.geometry.dispose();
              lunarOrbitRing.geometry =
                new THREE.BufferGeometry().setFromPoints(
                  Array.from(
                    { length: 257 },
                    (_, i) =>
                      new THREE.Vector3(
                        ...sampleCapturePath(path!, (i / 256) * Math.PI * 2),
                      ),
                  ),
                );
              displayCoordinate = undefined;
              previous = key;
            }
            const targetDest = new THREE.Vector3(...path.moon);
            const arrival = j.stage.startsWith("loi") || j.stage === "complete";
            lunarOrbitRing.visible = arrival;
            const progress =
              j.version === 2
                ? Math.min(
                    1,
                    Math.max(
                      0,
                      (j.dv ?? 0) /
                        ((j.stage === "loi-burn"
                          ? getLoiRequiredDv(j, s.loiMS)
                          : s.tliMS) *
                          0.992),
                    ),
                  )
                : Math.min(1, j.elapsed / TRANSFER_MODEL.burnScreenSeconds);
            const departureEnd = 2 / (path.points.length - 1);
            const phaseFraction =
              j.stage === "tli-burn"
                ? progress * departureEnd
                : j.stage === "coast"
                  ? departureEnd + coastFraction(j) * (1 - departureEnd)
                  : arrival
                    ? 1
                    : 0;
            const phaseCaptureAngle =
              j.stage === "complete"
                ? Math.PI * 0.9
                : j.stage === "loi-burn"
                  ? progress * Math.PI * 0.9
                  : 0;
            const coordinate = arrival ? 1 + phaseCaptureAngle : phaseFraction;
            if (displayCoordinate === undefined) {
              displayCoordinate = coordinate;
              fromCoordinate = coordinate;
              targetCoordinate = coordinate;
            }
            if (coordinate !== targetCoordinate) {
              if (moving)
                displayCoordinate = THREE.MathUtils.lerp(
                  fromCoordinate,
                  targetCoordinate,
                  Math.max(0, Math.min(1, (now - coordinateTime) / 50)),
                );
              else stoppedAt = now;
              fromCoordinate = displayCoordinate;
              targetCoordinate = coordinate;
              coordinateTime = now;
            }
            // Evaluate a fractional path coordinate on every frame between simulation updates.
            if (moving)
              displayCoordinate = THREE.MathUtils.lerp(
                fromCoordinate,
                targetCoordinate,
                Math.max(0, Math.min(1, (now - coordinateTime) / 50)),
              );
            const onCapture = displayCoordinate >= 1;
            const fraction = Math.min(1, displayCoordinate);
            const captureAngle =
              Math.max(0, displayCoordinate - 1) + orbitClock * 0.35;
            const shipPosition = new THREE.Vector3(
              ...(onCapture
                ? sampleCapturePath(path, captureAngle)
                : sampleTransferPath(path, fraction)),
            );
            const delta = onCapture
              ? new THREE.Vector3(...path.radial)
                  .multiplyScalar(-Math.sin(captureAngle))
                  .addScaledVector(
                    new THREE.Vector3(...path.along),
                    Math.cos(captureAngle),
                  )
                  .normalize()
              : new THREE.Vector3(
                  ...sampleTransferPath(path, Math.min(1, fraction + 0.00001)),
                )
                  .sub(
                    new THREE.Vector3(
                      ...sampleTransferPath(
                        path,
                        Math.max(0, fraction - 0.00001),
                      ),
                    ),
                  )
                  .normalize();

            ship.position.copy(shipPosition);
            moon.position.copy(targetDest);

            // The locator makes the same spacecraft position readable at map scale.
            ship.scale.setScalar(0.04);
            if (isTrajectory) {
              beacon.visible = true;
              beacon.position.copy(shipPosition);
              beacon.quaternion.copy(camera.quaternion);
              const pulse = reducedMotion.current
                ? 1
                : 1 + 0.12 * Math.sin(orbitClock * 6);
              beacon.scale.setScalar(pulse);
            } else {
              beacon.visible = false;
            }

            const normalUp = new THREE.Vector3(...path.radial)
              .cross(new THREE.Vector3(...path.along))
              .normalize();
            // Turn retrograde during the last part of coast; travel remains on the same path.
            const braking =
              arrival || (j.stage === "coast" && coastFraction(j) > 0.85);
            const prograde = delta.clone().multiplyScalar(braking ? -1 : 1);
            const steeredDirection = prograde
              .clone()
              .applyAxisAngle(normalUp, ((j.angle ?? 0) * Math.PI) / 180);
            const right = steeredDirection.clone().cross(normalUp).normalize();
            const up = right.clone().cross(steeredDirection).normalize();
            attitude.setFromRotationMatrix(
              new THREE.Matrix4().makeBasis(right, steeredDirection, up),
            );
            if (!cameraReady) ship.quaternion.copy(attitude);
            else if (moving)
              ship.quaternion.rotateTowards(
                attitude,
                dt * (reducedMotion.current ? 1.5 : 2.2),
              );

            guide.position.copy(shipPosition);
            guide.setDirection(prograde);

            const firing =
              j.version === 2
                ? !!j.firing && !j.paused
                : j.stage.endsWith("burn");
            plume.visible = firing;
            if (firing) {
              const time = reducedMotion.current ? 0 : j.elapsed;
              const throttle = j.throttle ?? 0.5;
              const pulse = 1 + 0.08 * Math.sin(time * 3);
              if (isTrajectory) {
                plume.scale.set(
                  (1.2 + throttle * 0.6) * pulse,
                  (2.0 + throttle * 3.5) * (1 + 0.12 * Math.sin(time * 5)),
                  (1.2 + throttle * 0.6) * pulse,
                );
              } else {
                plume.scale.set(
                  (0.7 + throttle * 0.3) * pulse,
                  (0.8 + throttle * 2.2) * (1 + 0.12 * Math.sin(time * 5)),
                  (0.7 + throttle * 0.3) * pulse,
                );
              }
              (plume.material as THREE.MeshBasicMaterial).opacity =
                0.8 + 0.2 * Math.sin(time * 4);
            }

            light.position
              .fromArray(
                (s?.sunDirection ?? [1, 1, 1]) as [number, number, number],
              )
              .multiplyScalar(1000);

            earth.visible = true;
            moon.visible = true;
            ship.visible = true;
            guide.visible = false;
            line.visible = true;

            earth.scale.setScalar(isTrajectory ? 1.4 : 1);
            moon.scale.setScalar(1);

            const outwardBlend = THREE.MathUtils.smoothstep(fraction, 0.7, 1);
            const cameraOutward = new THREE.Vector3(...path.points[0])
              .normalize()
              .lerp(new THREE.Vector3(...path.radial), outwardBlend)
              .normalize();
            if (moving && shelterActive(j.storm) && !reducedMotion.current)
              shelterClock += dt;
            const craftOffset = cameraOutward
              .multiplyScalar(1.4)
              .addScaledVector(
                normalUp,
                0.8 +
                  (shelterActive(j.storm) && !reducedMotion.current
                    ? 0.025 * Math.sin(shelterClock * 0.65)
                    : 0),
              );
            const modeChanged = v !== previousMode;
            if (modeChanged) {
              manualCamera = false;
              if (v === "craft") {
                desiredTarget.copy(shipPosition);
                desiredCamera.copy(shipPosition).add(craftOffset);
                lastCameraOffset.copy(craftOffset);
              } else {
                const bounds = new THREE.Box3().setFromPoints(
                  path.points.map((p) => new THREE.Vector3(...p)),
                );
                const sphere = bounds.getBoundingSphere(new THREE.Sphere());
                const distance =
                  ((sphere.radius / Math.sin(THREE.MathUtils.degToRad(22.5))) *
                    1.15) /
                  Math.min(1, camera.aspect);
                desiredTarget.copy(sphere.center);
                desiredCamera
                  .copy(sphere.center)
                  .add(new THREE.Vector3(0, distance * 0.65, distance * 0.76));
              }
              rotatingCamera = true;
              previousMode = v;
            }
            if (cameraReady && v === "craft" && !modeChanged) {
              const change = shipPosition.clone().sub(lastPosition);
              camera.position.add(change);
              controls!.target.add(change);
              desiredCamera.add(change);
              desiredTarget.add(change);
              if (!manualCamera && moving) {
                const offsetChange = craftOffset.clone().sub(lastCameraOffset);
                camera.position.add(offsetChange);
                desiredCamera.add(offsetChange);
                lastCameraOffset.copy(craftOffset);
              }
            }
            if (!cameraReady) {
              camera.position.copy(desiredCamera);
              controls!.target.copy(desiredTarget);
              cameraReady = true;
              rotatingCamera = false;
            } else if (rotatingCamera) {
              const blend = 1 - Math.exp(-dt * (reducedMotion.current ? 3 : 5));
              camera.position.lerp(desiredCamera, blend);
              controls!.target.lerp(desiredTarget, blend);
              if (camera.position.distanceTo(desiredCamera) < 0.01)
                rotatingCamera = false;
            }
            lastPosition.copy(shipPosition);
            controls!.update();
            renderer!.render(scene!, camera);
          } catch (paintErr) {
            console.error("JourneyViewport paint error:", paintErr);
          }
        };
        frame = requestAnimationFrame(paint);
        cleanup = () => {
          observer.disconnect();
          earthTexture?.dispose();
        };
      } catch (error) {
        if (!disposed) {
          console.warn("Journey view unavailable", error);
          setFailed(true);
        }
      }
    })();
    useLoadingStore.getState().registerLoaderTask(task);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup();
      controls?.dispose();
      if (scene) disposeGroup(scene);
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, []);
  return (
    <>
      <div
        className="journey-canvas"
        ref={host}
        role="img"
        aria-label="Spacecraft flight along a NASA ephemeris based Moon transfer; drag to look around"
      >
        {failed ? (
          <SceneFallback
            scene="journey"
            label="Flight view unavailable"
            detail="Flight controls remain available"
          />
        ) : null}
      </div>
      <div className="journey-camera-controls" aria-label="Flight camera">
        <button
          aria-pressed={mode === "craft"}
          onClick={() => setMode("craft")}
        >
          Craft view
        </button>
        <button
          aria-pressed={mode === "trajectory"}
          onClick={() => setMode("trajectory")}
        >
          Trajectory view
        </button>
      </div>
    </>
  );
}

export default JourneyViewport;
