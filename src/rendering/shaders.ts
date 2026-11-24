/**
 * Custom Photorealistic Shaders (Babylon.js WebGPU & WebGL2 Compatible)
 * 1. Rayleigh/Mie Atmospheric Sky Dome + Sun/Moon Disc + Starfield Rotation
 * 2. Parallax Interior Mapping for Non-Enterable City Building Facades
 * 3. Volumetric-Approximated Cloud Layer & Swamp Ground Fog
 */

import { Color3, Effect, Material, Mesh, Scene, ShaderMaterial, Vector2, Vector3 } from '@babylonjs/core';

let shadersRegistered = false;

export function registerCustomShaders(): void {
  if (shadersRegistered) return;
  shadersRegistered = true;

  // 1. Rayleigh/Mie Sky Dome Shader
  Effect.ShadersStore['leonidaSkyVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    varying vec3 vWorldPos;
    void main(void) {
      vec4 wp = world * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  Effect.ShadersStore['leonidaSkyFragmentShader'] = `
    precision highp float;
    varying vec3 vWorldPos;
    uniform vec3 cameraPosition;
    uniform vec3 sunDirection;
    uniform vec3 zenithColor;
    uniform vec3 horizonColor;
    uniform vec3 sunTint;
    uniform float starVisibility;
    uniform float starRotation;
    uniform float cloudDensity;
    uniform float time;

    float hash(vec3 p) {
      p = fract(p * vec3(443.897, 441.423, 437.195));
      p += dot(p, p.yzx + 19.19);
      return fract((p.x + p.y) * p.z);
    }

    float noise2(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
      float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
      float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbmCloud(vec2 uv) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * noise2(uv);
        uv = uv * 2.04 + vec2(13.1, 7.7);
        a *= 0.5;
      }
      return v;
    }

    void main(void) {
      vec3 dir = normalize(vWorldPos - cameraPosition);
      float elev = clamp(dir.y, 0.0, 1.0);
      float rayleigh = pow(1.0 - elev, 2.2);
      vec3 sky = mix(zenithColor, horizonColor, rayleigh);

      // Mie scattering & sun disc
      float sunDot = max(dot(dir, normalize(sunDirection)), 0.0);
      float mieHalo = pow(sunDot, 12.0) * 0.45 + pow(sunDot, 128.0) * 0.85;
      float sunDisc = smoothstep(0.9992, 0.9997, sunDot);
      sky += sunTint * (mieHalo + sunDisc * 2.4);

      // Rotating starfield at night
      if (starVisibility > 0.01 && dir.y > 0.02) {
        float c = cos(starRotation);
        float s = sin(starRotation);
        vec3 rotDir = vec3(dir.x * c - dir.z * s, dir.y, dir.x * s + dir.z * c);
        vec3 cell = floor(rotDir * 240.0);
        float h = hash(cell);
        if (h > 0.994) {
          float twinkle = 0.65 + 0.35 * sin(time * 2.5 + h * 100.0);
          sky += vec3(0.85, 0.9, 1.0) * starVisibility * twinkle * smoothstep(0.02, 0.25, dir.y);
        }
      }

      // Approximated volumetric cloud layer projection
      if (dir.y > 0.04 && cloudDensity > 0.01) {
        vec2 cloudUV = dir.xz / (dir.y + 0.14) * 1.35 + vec2(time * 0.008, time * 0.004);
        float cVal = fbmCloud(cloudUV);
        float coverage = smoothstep(1.0 - cloudDensity * 0.78, 0.95, cVal);
        vec3 cloudLit = mix(horizonColor * 0.65, vec3(0.98, 0.95, 0.92), clamp(sunDirection.y * 1.4 + 0.3, 0.15, 1.0));
        cloudLit += sunTint * pow(sunDot, 8.0) * 0.35;
        sky = mix(sky, cloudLit, coverage * smoothstep(0.04, 0.22, dir.y) * 0.85);
      }

      gl_FragColor = vec4(sky, 1.0);
    }
  `;

  // 2. Parallax Interior Mapping Shader for Non-Enterable Building Windows
  Effect.ShadersStore['parallaxInteriorVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    varying vec2 vUV;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    void main(void) {
      vUV = uv;
      vec4 wp = world * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      vWorldNormal = normalize(mat3(world) * normal);
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  Effect.ShadersStore['parallaxInteriorFragmentShader'] = `
    precision highp float;
    varying vec2 vUV;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    uniform vec3 cameraPosition;
    uniform float nightFactor;
    uniform vec2 roomGrid;
    uniform float facadeSeed;

    float roomHash(vec2 p) {
      return fract(sin(dot(p + facadeSeed, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main(void) {
      vec2 scaled = vUV * roomGrid;
      vec2 roomId = floor(scaled);
      vec2 localUV = fract(scaled);

      // Mullion frame
      float frame = step(localUV.x, 0.07) + step(0.93, localUV.x) + step(localUV.y, 0.09) + step(0.91, localUV.y);
      if (frame > 0.5) {
        gl_FragColor = vec4(0.14, 0.16, 0.19, 1.0);
        return;
      }

      vec3 viewDir = normalize(vWorldPos - cameraPosition);
      vec3 n = normalize(vWorldNormal);
      vec3 up = abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
      vec3 tangent = normalize(cross(up, n));
      vec3 bitangent = cross(n, tangent);
      vec3 viewTS = vec3(dot(viewDir, tangent), dot(viewDir, bitangent), dot(viewDir, n));

      // Ray-box intersection for pseudo-3D room depth
      vec2 p = localUV * 2.0 - 1.0;
      float depthScale = 0.75;
      vec3 rayDir = normalize(vec3(viewTS.xy, -max(abs(viewTS.z), 0.15) * depthScale));
      vec2 tWall = (sign(rayDir.xy) - p) / (rayDir.xy + vec2(0.0001));
      float tBack = 1.6 / max(-rayDir.z, 0.05);
      float tMin = min(min(tWall.x, tWall.y), tBack);
      vec3 hit = vec3(p, 0.0) + rayDir * tMin;

      float seed = roomHash(roomId);
      float isLit = step(0.38, seed) * nightFactor;
      vec3 wallTint = mix(vec3(0.75, 0.72, 0.66), vec3(0.55, 0.66, 0.72), fract(seed * 7.3));
      vec3 lightColor = mix(vec3(1.0, 0.78, 0.45), vec3(0.72, 0.9, 1.0), fract(seed * 13.7));
      float ceilingGlow = smoothstep(-0.3, 1.0, hit.y) * 0.7 + 0.3;

      vec3 roomColor = wallTint * (0.12 + isLit * 0.95 * ceilingGlow) * mix(vec3(1.0), lightColor, isLit);
      // Exterior glass fresnel reflection
      float fresnel = pow(1.0 - max(dot(-viewDir, n), 0.0), 3.0);
      vec3 skyRefl = mix(vec3(0.22, 0.38, 0.56), vec3(0.05, 0.08, 0.16), nightFactor);
      vec3 finalCol = mix(roomColor, skyRefl, fresnel * 0.65 + 0.12);

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `;
}

export function createSkyDomeMaterial(scene: Scene): ShaderMaterial {
  registerCustomShaders();
  const mat = new ShaderMaterial(
    'leonidaSkyMat',
    scene,
    { vertex: 'leonidaSky', fragment: 'leonidaSky' },
    {
      attributes: ['position'],
      uniforms: [
        'worldViewProjection',
        'world',
        'cameraPosition',
        'sunDirection',
        'zenithColor',
        'horizonColor',
        'sunTint',
        'starVisibility',
        'starRotation',
        'cloudDensity',
        'time',
      ],
    }
  );
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  mat.setVector3('sunDirection', new Vector3(0.4, 0.7, 0.4));
  mat.setColor3('zenithColor', new Color3(0.14, 0.44, 0.85));
  mat.setColor3('horizonColor', new Color3(0.58, 0.78, 0.94));
  mat.setColor3('sunTint', new Color3(1.0, 0.94, 0.84));
  mat.setFloat('starVisibility', 0);
  mat.setFloat('starRotation', 0);
  mat.setFloat('cloudDensity', 0.35);
  mat.setFloat('time', 0);
  return mat;
}

export function createParallaxFacadeMaterial(
  name: string,
  scene: Scene,
  gridX: number,
  gridY: number,
  seed: number
): ShaderMaterial {
  registerCustomShaders();
  const mat = new ShaderMaterial(
    name,
    scene,
    { vertex: 'parallaxInterior', fragment: 'parallaxInterior' },
    {
      attributes: ['position', 'normal', 'uv'],
      uniforms: ['worldViewProjection', 'world', 'cameraPosition', 'nightFactor', 'roomGrid', 'facadeSeed'],
    }
  );
  mat.setFloat('nightFactor', 0);
  mat.setVector2('roomGrid', new Vector2(gridX, gridY));
  mat.setFloat('facadeSeed', seed);
  mat.sideOrientation = Material.ClockWiseSideOrientation;
  return mat;
}

export function buildSkyDomeMesh(scene: Scene, mat: ShaderMaterial): Mesh {
  const sky = Mesh.CreateSphere('leonidaSkyDome', 24, 2400, scene);
  sky.material = mat;
  sky.infiniteDistance = true;
  sky.isPickable = false;
  sky.applyFog = false;
  return sky;
}
