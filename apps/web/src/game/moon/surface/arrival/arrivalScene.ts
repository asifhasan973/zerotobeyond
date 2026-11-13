import * as THREE from "three";
import type { MoonSession } from "@/game/moon/shared/session";
import { surfaceHeight } from "../surfaceTerrain";
import { createSurfaceAstronaut } from "./astronautMesh";
import { createMissionFlag } from "./missionFlag";
import { CREW_EGRESS_FRAMES, CREW_PLANTING_FRAMES } from "./crewOperations";

export function createSurfaceArrival(
  moon: MoonSession,
  landerX: number,
  landerY: number,
) {
  const root = new THREE.Group(),
    people = [moon.crew.commander, moon.crew.scientist]
      .filter((id): id is NonNullable<typeof id> => id !== null)
      .map(createSurfaceAstronaut),
    flag = createMissionFlag();
  people.forEach((person) => root.add(person.root));
  root.add(flag.root);
  const flagX = landerX - 1.65,
    flagZ = 3.6;
  flag.root.position.set(flagX, surfaceHeight(flagX, flagZ), flagZ);
  const placements = [
    new THREE.Vector3(landerX - 1.15, 0, 3.35),
    new THREE.Vector3(landerX + 0.95, 0, 3.3),
  ];
  return {
    root,
    update(
      currentMoon: MoonSession,
      sheltered: boolean,
      gentle: boolean,
      brushFrame?: number,
    ) {
      const state = currentMoon.crewOperations,
        stage = state?.stage ?? "inside",
        egress = stage === "egress" ? state.frame / CREW_EGRESS_FRAMES : 1,
        planting =
          stage === "planting" ? state.frame / CREW_PLANTING_FRAMES : 0,
        outside =
          state?.firstSteps || ["outside", "planting", "ready"].includes(stage);
      flag.root.visible = state?.flagPlanted === true || stage === "planting";
      flag.root.position.y =
        surfaceHeight(flagX, flagZ) +
        (stage === "planting" ? (1 - planting) * 0.12 : 0);
      flag.setHandling(gentle ? 0 : planting);
      people.forEach((person, index) => {
        const progress = THREE.MathUtils.clamp(egress * 2 - index, 0, 1),
          descending = stage === "egress" && progress < 0.72,
          destination = placements[index];
        person.root.visible =
          (stage === "egress" && progress > 0) || (!!outside && !sheltered);
        let climb: number | null = null;
        let walkingFeet: [THREE.Vector3, THREE.Vector3] | undefined;
        if (descending) {
          const amount = THREE.MathUtils.clamp(progress / 0.72, 0, 1);
          person.root.position.set(
            landerX,
            THREE.MathUtils.lerp(
              landerY + 2.15,
              surfaceHeight(landerX, 2.9),
              amount,
            ),
            THREE.MathUtils.lerp(1.9, 2.9, amount),
          );
          person.root.rotation.y = Math.PI;
          climb = gentle ? 0 : amount;
        } else {
          const amount =
            stage === "egress"
              ? THREE.MathUtils.smoothstep(progress, 0.72, 1)
              : 1;
          person.root.position.set(
            THREE.MathUtils.lerp(landerX, destination.x, amount),
            0,
            THREE.MathUtils.lerp(2.9, destination.z, amount),
          );
          person.root.position.y = surfaceHeight(
            person.root.position.x,
            person.root.position.z,
          );
          person.root.rotation.y =
            stage === "planting" && index === 0
              ? -0.8
              : stage === "egress" && amount < 1
                ? Math.atan2(destination.x - landerX, destination.z - 2.9)
                : -0.3;
          if (stage === "egress" && amount > 0 && amount < 1) {
            const length = Math.hypot(
                destination.x - landerX,
                destination.z - 2.9,
              ),
              heading = person.root.rotation.y;
            walkingFeet = [-1, 1].map((side, footIndex) => {
              const firstStart = footIndex * 0.25,
                secondStart = 0.5 + footIndex * 0.25,
                first = THREE.MathUtils.clamp((amount - firstStart) * 4, 0, 1),
                second = THREE.MathUtils.clamp(
                  (amount - secondStart) * 4,
                  0,
                  1,
                ),
                ease = (value: number) => value * value * (3 - 2 * value),
                distance = (ease(first) + ease(second)) * length * 0.5,
                localZ = distance - length * amount,
                localX = side * 0.14,
                worldX =
                  person.root.position.x +
                  Math.cos(heading) * localX +
                  Math.sin(heading) * localZ,
                worldZ =
                  person.root.position.z -
                  Math.sin(heading) * localX +
                  Math.cos(heading) * localZ,
                lift = gentle
                  ? 0
                  : (Math.sin(first * Math.PI) + Math.sin(second * Math.PI)) *
                    0.1;
              return new THREE.Vector3(
                localX,
                0.12 +
                  surfaceHeight(worldX, worldZ) -
                  person.root.position.y +
                  lift,
                localZ,
              );
            }) as [THREE.Vector3, THREE.Vector3];
          }
        }
        if (brushFrame !== undefined) {
          person.root.position.set(-6.5 + index * 1.5, 0, 1.6);
          person.root.position.y = surfaceHeight(
            person.root.position.x,
            person.root.position.z,
          );
          person.root.rotation.y = Math.PI / 2;
        }
        const plantedPose =
            brushFrame !== undefined
              ? 0.35 + Math.sin(brushFrame * 0.65) * 0.15
              : index === 0 && stage === "planting"
                ? Math.sin(planting * Math.PI)
                : 0,
          yaw = person.root.rotation.y,
          footOffsets = [-0.14, 0.14].map(
            (x) =>
              surfaceHeight(
                person.root.position.x + Math.cos(yaw) * x,
                person.root.position.z - Math.sin(yaw) * x,
              ) - person.root.position.y,
          ) as [number, number];
        person.pose(
          climb,
          gentle ? 0 : plantedPose,
          descending ? [0, 0] : footOffsets,
          walkingFeet,
        );
      });
    },
  };
}
