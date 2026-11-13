import * as THREE from "three";

/** A supported fabric panel for this fictional mission; the Moon has no wind. */
export function createMissionFlag() {
  const root = new THREE.Group(),
    fabric = new THREE.Group(),
    metal = new THREE.MeshStandardMaterial({
      color: 0xd3d8e1,
      metalness: 0.75,
      roughness: 0.35,
    });
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.026, 2.25, 8),
    metal,
  );
  pole.position.y = 1.1;
  const support = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 1.35, 8),
    metal,
  );
  support.rotation.z = Math.PI / 2;
  support.position.set(0.66, 2.19, 0);
  root.add(pole, support, fabric);
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 448;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#24133d";
    context.fillRect(0, 0, 768, 448);
    context.strokeStyle = "#8ce2c2";
    context.lineWidth = 9;
    context.strokeRect(17, 17, 734, 414);
    context.strokeStyle = "#ed8def";
    context.lineWidth = 7;
    context.beginPath();
    context.ellipse(384, 163, 95, 45, -0.35, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#ffdf89";
    context.beginPath();
    context.arc(384, 163, 36, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#fff2d1";
    context.textAlign = "center";
    context.font = "bold 66px sans-serif";
    context.fillText("ExoVisionaries", 384, 291);
    context.fillStyle = "#8ce2c2";
    context.font = "29px sans-serif";
    context.fillText("ZERO TO BEYOND", 384, 350);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.PlaneGeometry(1.3, 0.78, 12, 4),
    original = Float32Array.from(geometry.attributes.position.array),
    cloth = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: 0.92,
        metalness: 0,
      }),
    );
  cloth.position.set(0.67, 1.8, 0);
  fabric.add(cloth);
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return {
    root,
    setHandling(progress: number) {
      const strength =
        progress > 0 && progress < 1 ? Math.sin(progress * Math.PI) * 0.065 : 0;
      const positions = geometry.attributes.position;
      for (let index = 0; index < positions.count; index++) {
        const x = original[index * 3],
          y = original[index * 3 + 1];
        positions.setZ(
          index,
          Math.sin(x * 11 + y * 4 + progress * 15) *
            strength *
            ((x + 0.65) / 1.3),
        );
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      root.rotation.z = strength * 0.25;
    },
  };
}
