import * as THREE from "three";

/** Textured Earth and a view-dependent atmosphere for both map and entry cameras. */
export function createReturnEarth(map: THREE.Texture): THREE.Mesh {
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 80),
    new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0 }),
  );
  earth.name = "return-earth";
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.018, 128, 80),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `
        varying vec3 viewNormal;
        varying vec3 viewDirection;
        void main() {
          vec4 p = modelViewMatrix * vec4(position, 1.0);
          viewNormal = normalize(normalMatrix * normal);
          viewDirection = -p.xyz;
          gl_Position = projectionMatrix * p;
        }`,
      fragmentShader: `
        varying vec3 viewNormal;
        varying vec3 viewDirection;
        void main() {
          float facing = abs(dot(normalize(viewNormal), normalize(viewDirection)));
          float rim = pow(1.0 - facing, 3.0) * smoothstep(0.0, 0.16, facing);
          gl_FragColor = vec4(0.10, 0.44, 0.95, rim * 0.65);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  earth.add(atmosphere);
  return earth;
}
