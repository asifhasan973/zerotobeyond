import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { isEngineFrozen, useLoadingStore } from "@exo/ui";
import { createCrewedPlatform } from "../../../crew/crewedMeshes";
import { disposeGroup } from "../../../workshop/lander/workshopMeshes";
/** Particle trails explain invisible radiation; they are not measured flight data. */
export function RadiationScene({
  progress,
  paused,
  gentle = false,
}: {
  progress: number;
  paused: boolean;
  gentle?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef({ progress, paused, gentle });
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    latest.current = { progress, paused, gentle };
  }, [progress, paused, gentle]);
  useEffect(() => {
    const mount = host.current!;
    let renderer: THREE.WebGLRenderer | undefined;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    const scene = new THREE.Scene();
    let disposed = false;
    const task = Promise.resolve().then(() => {
      if (disposed) return;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.setClearColor(0x070c1c);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        mount.appendChild(renderer.domElement);
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.set(6, 4, 11);
        camera.lookAt(0, 2, 0);
        scene.add(new THREE.HemisphereLight(0xc1d6ff, 0x291b35, 2.5));
        const key = new THREE.DirectionalLight(0xffdda7, 4);
        key.position.set(-6, 6, 8);
        scene.add(key);
        const platform = createCrewedPlatform();
        platform.lander.visible = false;
        platform.root.scale.setScalar(0.9);
        platform.capsule.position.set(0, 0, 0);
        const horizontalAttitude = camera.quaternion
          .clone()
          .multiply(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 0, 1),
              -Math.PI / 2,
            ),
          );
        const screenRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
          camera.quaternion,
        );
        platform.root.position.set(0, 1, 0).addScaledVector(screenRight, -3.5);
        platform.root.quaternion.copy(horizontalAttitude);
        scene.add(platform.root);
        const vertices: number[] = [];
        for (let i = 0; i < 150; i++)
          vertices.push(
            ((i * 37) % 101) / 5 - 10,
            ((i * 53) % 103) / 6 - 7,
            ((i * 71) % 107) / 5 - 10,
          );
        const stars = new THREE.Points(
          new THREE.BufferGeometry().setAttribute(
            "position",
            new THREE.Float32BufferAttribute(vertices, 3),
          ),
          new THREE.PointsMaterial({ color: 0x9eb3dc, size: 0.035 }),
        );
        scene.add(stars);
        const paths = new Float32Array(96 * 6);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(paths, 3));
        const material = new THREE.LineBasicMaterial({
          color: 0xffc381,
          transparent: true,
          opacity: 0.7,
        });
        scene.add(new THREE.LineSegments(geometry, material));
        const resize = () => {
          const w = mount.clientWidth,
            h = mount.clientHeight;
          if (!w || !h) return;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer!.setSize(w, h, false);
        };
        observer = new ResizeObserver(resize);
        observer.observe(mount);
        resize();
        const reduced = matchMedia("(prefers-reduced-motion: reduce)");
        let clock = 0,
          last = performance.now();
        const draw = () => {
          if (disposed) return;
          frame = requestAnimationFrame(draw);
          const now = performance.now();
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (document.hidden || isEngineFrozen()) return;
          if (
            !latest.current.paused &&
            !reduced.matches &&
            !latest.current.gentle
          )
            clock += dt;
          const density = 1 - latest.current.progress;
          for (let i = 0; i < 96; i++) {
            const x = 10 - ((clock * 3 + i * 0.43) % 20),
              y = ((i * 47) % 97) / 7 - 6,
              z = ((i * 23) % 89) / 8 - 5;
            const base = i * 6;
            paths[base] = x;
            paths[base + 1] = y;
            paths[base + 2] = z;
            paths[base + 3] = x + 0.65;
            paths[base + 4] = y + 0.12;
            paths[base + 5] = z;
          }
          geometry.setDrawRange(0, Math.floor(12 + 84 * density) * 2);
          geometry.attributes.position.needsUpdate = true;
          material.opacity = 0.12 + 0.5 * density;
          platform.root.quaternion.copy(horizontalAttitude);
          platform.root.rotateY(0.25 + Math.sin(clock * 0.25) * 0.06);
          renderer!.render(scene, camera);
        };
        draw();
      } catch {
        if (!disposed) setFailed(true);
      }
    });
    useLoadingStore.getState().registerLoaderTask(task);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      disposeGroup(scene);
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, []);
  return (
    <div
      className="radiation-3d"
      ref={host}
      role="img"
      aria-label="Illustrative 3D view of solar particles passing a coasting spacecraft while crew remain sheltered"
    >
      {failed && (
        <p>
          Radiation is elevated. Our crew remain sheltered while readings are
          monitored.
        </p>
      )}
    </div>
  );
}
