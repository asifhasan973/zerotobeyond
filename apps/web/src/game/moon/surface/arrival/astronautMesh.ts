import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { CrewId } from "@/game/moon/shared/catalog";

/** Batch static parts while retaining the independent joints used by crew animation. */
export function batchStaticMeshes(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert(),
    batches = new Map<THREE.Material, THREE.BufferGeometry[]>(),
    meshes: THREE.Mesh[] = [];
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material))
      return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    const list = batches.get(object.material) ?? [];
    list.push(geometry);
    batches.set(object.material, list);
    meshes.push(object);
  });
  meshes.forEach((mesh) => {
    mesh.removeFromParent();
    mesh.geometry.dispose();
  });
  for (const [material, geometries] of batches) {
    const expanded = geometries.map((value) =>
      value.index ? value.toNonIndexed() : value,
    );
    const geometry = mergeGeometries(expanded);
    new Set([...geometries, ...expanded]).forEach((value) => value.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

export function createSurfaceAstronaut(id: CrewId) {
  const root = new THREE.Group(),
    torso = new THREE.Group(),
    suit = new THREE.MeshStandardMaterial({ color: 0xe4e1db, roughness: 0.78 }),
    trim = new THREE.MeshStandardMaterial({
      color:
        id === "commander"
          ? 0xb84d54
          : id === "geologist"
            ? 0xb2a0d9
            : 0x72bca5,
      roughness: 0.7,
    }),
    dark = new THREE.MeshStandardMaterial({ color: 0x383b4b, roughness: 0.87 }),
    visor = new THREE.MeshStandardMaterial({
      color: 0xa87526,
      metalness: 0.86,
      roughness: 0.21,
    });
  root.name = `surface-crew-${id}`;
  root.add(torso);
  const mesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    torso.add(part);
    return part;
  };
  mesh(new THREE.BoxGeometry(0.4, 0.46, 0.3), suit, 0, 0.92, 0);
  mesh(new THREE.BoxGeometry(0.32, 0.41, 0.19), suit, 0, 0.92, -0.22);
  mesh(new THREE.BoxGeometry(0.33, 0.055, 0.04), trim, 0, 1.04, 0.17);
  mesh(new THREE.BoxGeometry(0.22, 0.16, 0.045), dark, 0, 0.89, 0.18);
  mesh(new THREE.BoxGeometry(0.14, 0.07, 0.05), trim, 0, 0.91, 0.21);
  mesh(new THREE.SphereGeometry(0.25, 16, 12), suit, 0, 1.37, 0);
  mesh(
    new THREE.SphereGeometry(0.215, 16, 10, 0, Math.PI),
    visor,
    0,
    1.37,
    0.085,
  );
  mesh(
    new THREE.TorusGeometry(0.16, 0.035, 6, 16),
    dark,
    0,
    1.16,
    0,
  ).rotation.x = Math.PI / 2;
  batchStaticMeshes(torso);
  const legs = [-1, 1].map((side) => {
    const upper = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.085, 0.16, 3, 8),
        suit,
      ),
      lower = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.075, 0.13, 3, 8),
        suit,
      ),
      boot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.26), dark);
    root.add(upper, lower, boot);
    return { upper, lower, boot, side };
  });
  const arms = [-1, 1].map((side) => {
    const joint = new THREE.Group();
    joint.position.set(side * 0.265, 1.08, 0);
    const sleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.074, 0.25, 3, 8),
      suit,
    );
    sleeve.position.y = -0.18;
    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.078, 0.05, 8),
      trim,
    );
    cuff.position.y = -0.32;
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), suit);
    glove.position.y = -0.39;
    joint.add(sleeve, cuff, glove);
    batchStaticMeshes(joint);
    root.add(joint);
    return joint;
  });
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  const axis = new THREE.Vector3(0, 1, 0),
    delta = new THREE.Vector3();
  const segment = (
    part: THREE.Mesh,
    a: THREE.Vector3,
    b: THREE.Vector3,
    length: number,
  ) => {
    delta.copy(b).sub(a);
    part.position.copy(a).add(b).multiplyScalar(0.5);
    part.quaternion.setFromUnitVectors(axis, delta.clone().normalize());
    part.scale.y = delta.length() / length;
  };
  return {
    root,
    pose(
      climbing: number | null,
      planting = 0,
      groundOffsets: [number, number] = [0, 0],
      walkingFeet?: [THREE.Vector3, THREE.Vector3],
    ) {
      torso.rotation.x = planting * 0.26;
      torso.position.y = -planting * 0.09;
      legs.forEach(({ upper, lower, boot, side }, index) => {
        const cycle =
            climbing === null
              ? 0
              : Math.sin(climbing * Math.PI * 12 + index * Math.PI),
          hip = new THREE.Vector3(side * 0.13, 0.68 - planting * 0.08, 0),
          foot =
            walkingFeet?.[index] ??
            new THREE.Vector3(
              side * 0.14,
              0.12 + groundOffsets[index] + Math.max(0, cycle) * 0.14,
              climbing === null ? 0 : 0.1 + cycle * 0.09,
            ),
          knee = hip.clone().lerp(foot, 0.52);
        knee.z += 0.08 + Math.abs(cycle) * 0.05 + planting * 0.08;
        segment(upper, hip, knee, 0.33);
        segment(lower, knee, foot, 0.28);
        boot.position.copy(foot);
        boot.position.y -= 0.06;
        boot.position.z += 0.055;
      });
      arms.forEach((arm, index) => {
        arm.rotation.set(
          climbing === null
            ? -planting * 1.25
            : -2.15 +
                Math.sin(climbing * Math.PI * 12 + index * Math.PI) * 0.15,
          0,
          (index ? 1 : -1) * (0.12 + planting * 0.1),
        );
      });
    },
  };
}
