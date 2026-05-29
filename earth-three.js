import * as THREE from "./vendor/three.module.js";

const TEXTURES = {
  earth: "./assets/earth/earth_day_4k.jpg",
  earthGrade: "./assets/earth/earth_atmos_2048.jpg",
  clouds: "./assets/earth/earth_webgl_clouds_2048.png",
  lights: "./assets/earth/earth_lights_2048.png",
  normal: "./assets/earth/react-earth-lite/earth-normal.webp",
  specular: "./assets/earth/react-earth-lite/earth-specular.webp",
};

const VIEW_LIGHT_DIRECTION = new THREE.Vector3(-0.9, 0.2, 0.38).normalize();
export const EARTH_TUNING_PRESET = Object.freeze({
  atmosphereColor: "#2a45b2",
  atmosphereShellSize: 1.004,
  atmosphereShellStrength: 0.33,
  backgroundHaloSize: 1,
  backgroundHaloStrength: 0.1,
  blackRimStrength: 0.35,
  cameraZ: 5.45,
  cloudContrast: 1,
  cloudOpacity: 1,
  darkStrength: 0.68,
  innerAtmosphereSize: 1,
  innerAtmosphereStrength: 0.34,
  lightIntensity: 0.76,
  lightX: -0.72,
  lightY: 0.2,
  lightZ: 0.38,
  nightLightStrength: 0.012,
  outerAtmosphereSize: 1.007,
  outerAtmosphereStrength: 0.06,
  rotationSpeed: 0.000036,
});

const QUALITY_PROFILES = Object.freeze({
  low: {
    desktopPixelRatio: 1.25,
    desktopSamples: 0,
    desktopSegments: [72, 48],
    mobilePixelRatio: 1.1,
    mobileSamples: 0,
    mobileSegments: [48, 32],
    textureAnisotropy: 4,
    useAntialias: false,
  },
  balanced: {
    desktopPixelRatio: 1.65,
    desktopSamples: 2,
    desktopSegments: [96, 64],
    mobilePixelRatio: 1.25,
    mobileSamples: 0,
    mobileSegments: [56, 40],
    textureAnisotropy: 8,
    useAntialias: true,
  },
  high: {
    desktopPixelRatio: 2,
    desktopSamples: 4,
    desktopSegments: [112, 72],
    mobilePixelRatio: 1.45,
    mobileSamples: 0,
    mobileSegments: [72, 48],
    textureAnisotropy: 16,
    useAntialias: true,
  },
});

function resolveQualityProfile({ anisotropyCap, isMobile, pixelRatioCap, quality = "balanced", samples } = {}) {
  const baseProfile = QUALITY_PROFILES[quality] || QUALITY_PROFILES.balanced;
  const [widthSegments, heightSegments] = isMobile ? baseProfile.mobileSegments : baseProfile.desktopSegments;

  return {
    heightSegments,
    pixelRatioCap: pixelRatioCap ?? (isMobile ? baseProfile.mobilePixelRatio : baseProfile.desktopPixelRatio),
    samples: samples ?? (isMobile ? baseProfile.mobileSamples : baseProfile.desktopSamples),
    textureAnisotropy: anisotropyCap ?? baseProfile.textureAnisotropy,
    useAntialias: baseProfile.useAntialias,
    widthSegments,
  };
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

function setTextureColorSpace(texture) {
  if ("colorSpace" in texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    texture.encoding = THREE.sRGBEncoding;
  }
}

function setTextureDataSpace(texture) {
  if ("colorSpace" in texture) {
    texture.colorSpace = THREE.NoColorSpace;
  } else {
    texture.encoding = THREE.LinearEncoding;
  }
}

function configureTexture(texture, renderer, { color = true, repeat = true, anisotropyCap = Infinity } = {}) {
  if (color) {
    setTextureColorSpace(texture);
  } else {
    setTextureDataSpace(texture);
  }

  texture.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = Math.max(1, Math.min(renderer.capabilities.getMaxAnisotropy(), anisotropyCap));
  texture.needsUpdate = true;
}

function createStarField(isMobile) {
  const count = isMobile ? 90 : 180;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.9 + Math.random() * 1.25;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = -1.15 - Math.random() * 1.8;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x9dc9ff,
    opacity: 0.2,
    size: isMobile ? 0.012 : 0.01,
    sizeAttenuation: true,
    transparent: true,
  });

  return new THREE.Points(geometry, material);
}

function createEarthSurfaceMaterial({ dayMap, gradeMap, lightDirection, nightMap, normalMap, settings, specularMap }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      atmosphereColor: { value: new THREE.Color(settings.atmosphereColor) },
      blackRimStrength: { value: settings.blackRimStrength },
      dayMap: { value: dayMap },
      darkStrength: { value: settings.darkStrength },
      gradeMap: { value: gradeMap },
      lightDirection: { value: lightDirection },
      lightIntensity: { value: settings.lightIntensity },
      nightMap: { value: nightMap },
      nightLightStrength: { value: settings.nightLightStrength },
      nightTint: { value: new THREE.Color(1.0, 0.68, 0.34) },
      normalMap: { value: normalMap },
      normalScale: { value: 0.24 },
      specularMap: { value: specularMap },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 atmosphereColor;
      uniform float blackRimStrength;
      uniform sampler2D dayMap;
      uniform float darkStrength;
      uniform sampler2D gradeMap;
      uniform vec3 lightDirection;
      uniform float lightIntensity;
      uniform sampler2D nightMap;
      uniform float nightLightStrength;
      uniform vec3 nightTint;
      uniform sampler2D normalMap;
      uniform float normalScale;
      uniform sampler2D specularMap;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      vec3 surfaceNormal(vec3 n) {
        vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), n));
        if (length(tangent) < 0.001) {
          tangent = vec3(1.0, 0.0, 0.0);
        }

        vec3 bitangent = normalize(cross(n, tangent));
        vec3 mapNormal = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
        mapNormal.xy *= normalScale;

        return normalize(tangent * mapNormal.x + bitangent * mapNormal.y + n * mapNormal.z);
      }

      void main() {
        vec3 detailMap = pow(texture2D(dayMap, vUv).rgb, vec3(1.04));
        vec3 gradeMapColor = pow(texture2D(gradeMap, vUv).rgb, vec3(0.96));
        float detailLuma = dot(detailMap, vec3(0.2126, 0.7152, 0.0722));
        float gradeLuma = dot(gradeMapColor, vec3(0.2126, 0.7152, 0.0722));
        vec3 base = mix(gradeMapColor, detailMap, 0.18);
        base += (detailMap - vec3(detailLuma)) * 0.18;
        base += vec3(detailLuma - gradeLuma) * 0.12;
        float baseLuma = dot(base, vec3(0.2126, 0.7152, 0.0722));
        base = mix(vec3(baseLuma), base, 0.9);
        base = max(vec3(0.0), (base - 0.035) * 1.16 + 0.035);
        base *= vec3(0.86, 0.91, 1.0);

        vec3 n = surfaceNormal(normalize(vWorldNormal));
        vec3 l = normalize(lightDirection);
        vec3 v = normalize(cameraPosition - vWorldPosition);
        float ndl = dot(n, l);
        float daylight = max(ndl, 0.0);
        float softDay = smoothstep(-0.08, 0.86, ndl);
        float darkWeight = clamp((darkStrength - 0.1) / 0.65, 0.0, 1.0);
        float edgeWeight = clamp((blackRimStrength - 0.35) / 0.65, 0.0, 1.0);
        float terminator = smoothstep(mix(-0.02, 0.08, darkWeight), mix(0.26, 0.4, darkWeight), ndl);
        float limb = pow(1.0 - max(dot(normalize(vWorldNormal), v), 0.0), 1.42);

        float ocean = texture2D(specularMap, vUv).r;
        float oceanMask = smoothstep(0.16, 0.52, ocean);
        vec3 oceanGrade = mix(vec3(0.0, 0.006, 0.025), vec3(0.0, 0.034, 0.082), softDay);
        vec3 landGrade = vec3(0.022, 0.018, 0.012);
        base = mix(base + landGrade * (1.0 - oceanMask), base * vec3(0.12, 0.22, 0.4) + oceanGrade, oceanMask * 0.9);

        vec3 daylightColor = base * (0.03 + pow(daylight, 0.72) * 1.04 * lightIntensity);
        daylightColor += vec3(0.006, 0.028, 0.074) * pow(daylight, 2.35) * oceanMask;

        float frontFacing = max(dot(normalize(vWorldNormal), v), 0.0);
        float directHotspot = pow(daylight, 4.4) * pow(frontFacing, 1.6);
        daylightColor *= 1.0 - directHotspot * 0.055;

        vec3 halfVector = normalize(l + v);
        float oceanGlint = pow(max(dot(n, halfVector), 0.0), 160.0) * oceanMask * smoothstep(0.08, 0.68, ndl);
        daylightColor += vec3(0.28, 0.5, 0.78) * oceanGlint * 0.12 * lightIntensity;

        float cityLight = max(max(texture2D(nightMap, vUv).r, texture2D(nightMap, vUv).g), texture2D(nightMap, vUv).b);
        vec3 nightColor = base * mix(vec3(0.12, 0.14, 0.19), vec3(0.045, 0.052, 0.072), darkWeight);
        nightColor += atmosphereColor * mix(0.006, 0.002, darkWeight) + vec3(0.0, 0.0012, 0.004);
        nightColor += nightTint * pow(cityLight, 1.24) * smoothstep(0.12, -0.2, ndl) * nightLightStrength;

        vec3 color = mix(nightColor, daylightColor, terminator);
        color *= mix(1.0, mix(0.5, 0.34, edgeWeight), limb);
        vec3 atmosphereTint = atmosphereColor * vec3(0.86, 0.98, 1.16);
        color += atmosphereTint * 0.11 * pow(limb, 3.4) * smoothstep(-0.12, 0.78, ndl);
        color += atmosphereTint * 0.14 * pow(limb, 6.6) * softDay;
        color = pow(color, vec3(1.02));
        float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
        color = mix(vec3(luminance), color, 0.9);
        color = max(vec3(0.0), (color - 0.022) * 1.1 + 0.022);
        color *= vec3(0.9, 0.96, 1.035);

        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

function createCloudMaterial(texture, lightDirection, settings) {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    uniforms: {
      cloudContrast: { value: settings.cloudContrast },
      cloudMap: { value: texture },
      lightDirection: { value: lightDirection },
      lightIntensity: { value: settings.lightIntensity },
      opacity: { value: settings.cloudOpacity },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vViewNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float cloudContrast;
      uniform sampler2D cloudMap;
      uniform vec3 lightDirection;
      uniform float lightIntensity;
      uniform float opacity;
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        vec3 cloud = texture2D(cloudMap, vUv).rgb;
        float low = mix(0.22, 0.07, cloudContrast);
        float high = mix(0.82, 0.56, cloudContrast);
        float power = mix(1.55, 0.72, cloudContrast);
        float density = smoothstep(low, high, cloud.r);
        density = pow(density, power);
        density *= smoothstep(0.035, 0.18, cloud.r);
        float day = dot(normalize(vWorldNormal), normalize(lightDirection));
        float light = smoothstep(-0.08, 0.74, day);
        float viewFacing = max(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)), 0.0);
        float limb = pow(1.0 - viewFacing, 2.35);
        float alpha = density * opacity * mix(0.018, 0.68, light) * mix(0.48, 0.92, viewFacing);
        vec3 color = mix(vec3(0.13, 0.16, 0.23), vec3(0.9, 0.92, 0.9) * lightIntensity, light);
        color += vec3(0.012, 0.052, 0.13) * limb * light;
        color = max(vec3(0.0), (color - 0.04) * 1.16 + 0.04);

        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
}

function createCloudShadowMaterial(texture, lightDirection, settings) {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    uniforms: {
      cloudContrast: { value: settings.cloudContrast },
      cloudMap: { value: texture },
      lightDirection: { value: lightDirection },
      opacity: { value: settings.cloudOpacity },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vViewNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float cloudContrast;
      uniform sampler2D cloudMap;
      uniform vec3 lightDirection;
      uniform float opacity;
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        float cloud = texture2D(cloudMap, vUv).r;
        float low = mix(0.22, 0.07, cloudContrast);
        float high = mix(0.82, 0.56, cloudContrast);
        float power = mix(1.45, 0.68, cloudContrast);
        float density = smoothstep(low, high, cloud);
        density = pow(density, power);
        density *= smoothstep(0.035, 0.18, cloud);
        float day = dot(normalize(vWorldNormal), normalize(lightDirection));
        float light = smoothstep(-0.1, 0.72, day);
        float viewFacing = max(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)), 0.0);
        float alpha = density * opacity * 0.17 * light * smoothstep(0.08, 0.88, viewFacing);

        gl_FragColor = vec4(0.0, 0.0, 0.0, clamp(alpha, 0.0, 0.18));
      }
    `,
  });
}

function createTerminatorMaterial(lightDirection, settings) {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    uniforms: {
      blackRimStrength: { value: settings.blackRimStrength },
      darkStrength: { value: settings.darkStrength },
      lightDirection: { value: lightDirection },
    },
    vertexShader: `
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        vViewNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float blackRimStrength;
      uniform float darkStrength;
      uniform vec3 lightDirection;
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        float day = dot(normalize(vWorldNormal), normalize(lightDirection));
        float night = smoothstep(0.28, -0.08, day);
        float limb = pow(1.0 - max(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)), 0.0), 1.08);
        float darkWeight = clamp((darkStrength - 0.1) / 0.65, 0.0, 1.0);
        float blackVeil = night * mix(0.24, 0.78, darkWeight);
        float edgeVeil = limb * blackRimStrength * mix(0.034, 0.07, darkWeight);
        float alpha = clamp(blackVeil + edgeVeil, 0.0, 0.84);

        gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
      }
    `,
  });
}

function createBackgroundHaloMaterial(settings) {
  return new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    side: THREE.BackSide,
    transparent: true,
    uniforms: {
      backgroundHaloStrength: { value: settings.backgroundHaloStrength },
    },
    vertexShader: `
      varying vec3 vViewNormal;

      void main() {
        vViewNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float backgroundHaloStrength;
      varying vec3 vViewNormal;

      void main() {
        float viewRim = 1.0 - abs(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)));
        float broadHalo = smoothstep(0.42, 1.0, viewRim) * 0.18;
        float fineHalo = smoothstep(0.72, 1.0, viewRim) * 0.28;
        float outerLine = smoothstep(0.9, 1.0, viewRim) * 0.22;
        float alpha = (broadHalo + fineHalo + outerLine) * backgroundHaloStrength;

        gl_FragColor = vec4(vec3(0.86, 0.91, 1.0), clamp(alpha, 0.0, 0.18));
      }
    `,
  });
}

function createSilhouetteMaterial(settings) {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    side: THREE.BackSide,
    transparent: true,
    uniforms: {
      blackRimStrength: { value: settings.blackRimStrength },
    },
    vertexShader: `
      varying vec3 vViewNormal;

      void main() {
        vViewNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float blackRimStrength;
      varying vec3 vViewNormal;

      void main() {
        float viewRim = 1.0 - abs(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)));
        float ink = smoothstep(0.7, 0.984, viewRim);
        float hardInk = smoothstep(0.88, 0.997, viewRim);
        float alpha = (ink * 0.28 + hardInk * 1.06) * blackRimStrength;

        gl_FragColor = vec4(0.0, 0.0, 0.0, clamp(alpha, 0.0, 1.0));
      }
    `,
  });
}

function createEdgeShadowMaterial(settings) {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    transparent: true,
    uniforms: {
      blackRimStrength: { value: settings.blackRimStrength },
    },
    vertexShader: `
      varying vec3 vViewNormal;

      void main() {
        vViewNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float blackRimStrength;
      varying vec3 vViewNormal;

      void main() {
        vec3 normal = normalize(vViewNormal);
        float viewRim = 1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
        float softRing = smoothstep(0.76, 0.982, viewRim);
        float hardRing = smoothstep(0.9, 0.996, viewRim);
        float alpha = (softRing * 0.12 + hardRing * 0.72) * blackRimStrength;

        gl_FragColor = vec4(0.0, 0.0, 0.0, clamp(alpha, 0.0, 0.88));
      }
    `,
  });
}

function createAtmosphereMaterial(lightDirection, settings) {
  return new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    side: THREE.BackSide,
    transparent: true,
    uniforms: {
      atmosphereColor: { value: new THREE.Color(settings.atmosphereColor) },
      lightDirection: { value: lightDirection },
      outerAtmosphereStrength: { value: settings.outerAtmosphereStrength },
    },
    vertexShader: `
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        vViewNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 atmosphereColor;
      uniform vec3 lightDirection;
      uniform float outerAtmosphereStrength;
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        vec3 viewNormal = normalize(vViewNormal);
        vec3 worldNormal = normalize(vWorldNormal);
        float viewRim = 1.0 - abs(dot(viewNormal, vec3(0.0, 0.0, 1.0)));
        float rim = smoothstep(0.52, 1.0, viewRim);
        float hardRim = smoothstep(0.82, 1.0, viewRim);
        float day = smoothstep(-0.18, 0.66, dot(worldNormal, normalize(lightDirection)));
        vec3 color = mix(atmosphereColor * 0.18, atmosphereColor, day);
        float alpha = (rim * mix(0.004, 0.09, day) + hardRim * mix(0.012, 0.2, day)) * outerAtmosphereStrength * 1.55;
        gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.24));
        #include <colorspace_fragment>
      }
    `,
  });
}

function createInnerAtmosphereMaterial(lightDirection, settings) {
  return new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    uniforms: {
      atmosphereColor: { value: new THREE.Color(settings.atmosphereColor) },
      innerAtmosphereStrength: { value: settings.innerAtmosphereStrength },
      lightDirection: { value: lightDirection },
    },
    vertexShader: `
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        vViewNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 atmosphereColor;
      uniform vec3 lightDirection;
      uniform float innerAtmosphereStrength;
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        vec3 viewNormal = normalize(vViewNormal);
        vec3 worldNormal = normalize(vWorldNormal);
        float viewRim = 1.0 - max(dot(viewNormal, vec3(0.0, 0.0, 1.0)), 0.0);
        float day = smoothstep(-0.12, 0.72, dot(worldNormal, normalize(lightDirection)));
        float ring = smoothstep(0.44, 0.98, viewRim) * day;
        float core = smoothstep(0.78, 1.0, viewRim) * day;
        vec3 color = mix(atmosphereColor * 0.26, atmosphereColor, day);
        float alpha = (ring * 0.07 + core * 0.24) * innerAtmosphereStrength * 1.28;

        gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.3));
        #include <colorspace_fragment>
      }
    `,
  });
}

function createAtmosphereShellMaterial(lightDirection, settings) {
  return new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    uniforms: {
      atmosphereColor: { value: new THREE.Color(settings.atmosphereColor) },
      atmosphereShellStrength: { value: settings.atmosphereShellStrength },
      lightDirection: { value: lightDirection },
    },
    vertexShader: `
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        vViewNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 atmosphereColor;
      uniform float atmosphereShellStrength;
      uniform vec3 lightDirection;
      varying vec3 vViewNormal;
      varying vec3 vWorldNormal;

      void main() {
        vec3 viewNormal = normalize(vViewNormal);
        vec3 worldNormal = normalize(vWorldNormal);
        float viewFacing = max(dot(viewNormal, vec3(0.0, 0.0, 1.0)), 0.0);
        float viewRim = 1.0 - viewFacing;
        float day = smoothstep(-0.22, 0.76, dot(worldNormal, normalize(lightDirection)));
        float nightFade = smoothstep(-0.34, 0.16, dot(worldNormal, normalize(lightDirection)));
        float broadGlass = pow(viewRim, 1.9) * 0.32;
        float innerWash = pow(viewRim, 3.8) * 0.46;
        float horizonBand = smoothstep(0.54, 0.94, viewRim) * 0.42;
        float alpha = (broadGlass + innerWash + horizonBand) * day * nightFade * atmosphereShellStrength;
        vec3 shellHighlight = mix(atmosphereColor * 1.36, vec3(0.9), 0.12);
        vec3 color = mix(atmosphereColor * 0.56, shellHighlight, day);

        gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.24));
        #include <colorspace_fragment>
      }
    `,
  });
}

function createCompositePass(renderer, samples) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    stencilBuffer: false,
  });
  if ("samples" in target) {
    target.samples = samples;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    uniforms: {
      sceneMap: { value: target.texture },
      texelSize: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D sceneMap;
      uniform vec2 texelSize;
      varying vec2 vUv;

      void main() {
        vec4 center = texture2D(sceneMap, vUv);
        vec4 left = texture2D(sceneMap, vUv - vec2(texelSize.x, 0.0));
        vec4 right = texture2D(sceneMap, vUv + vec2(texelSize.x, 0.0));
        vec4 up = texture2D(sceneMap, vUv + vec2(0.0, texelSize.y));
        vec4 down = texture2D(sceneMap, vUv - vec2(0.0, texelSize.y));

        vec3 blur = (left.rgb + right.rgb + up.rgb + down.rgb) * 0.25;
        vec3 detail = center.rgb - blur;
        vec3 color = center.rgb + detail * 0.42;

        float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
        color = mix(vec3(luma), color, 1.02);
        color = max(vec3(0.0), (color - 0.032) * 1.11 + 0.032);
        color *= vec3(0.95, 0.99, 1.035);

        float neighborAlpha = max(max(left.a, right.a), max(up.a, down.a));
        float alpha = max(center.a, neighborAlpha * 0.012);
        vec3 edgeInk = mix(color, vec3(0.0), smoothstep(0.015, 0.28, neighborAlpha - center.a) * 0.3);
        float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        edgeInk += dither * 0.0026 * smoothstep(0.02, 0.95, alpha);

        gl_FragColor = vec4(edgeInk, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
  material.toneMapped = false;
  const quad = new THREE.Mesh(geometry, material);
  scene.add(quad);

  return {
    render(sourceScene, sourceCamera) {
      renderer.setRenderTarget(target);
      renderer.clear(true, true, true);
      renderer.render(sourceScene, sourceCamera);
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
    },
    resize(width, height) {
      target.setSize(width, height);
      material.uniforms.texelSize.value.set(1 / width, 1 / height);
    },
    dispose() {
      target.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}

export async function createHeroEarth({
  globe,
  canvas,
  anisotropyCap,
  reducedMotion = false,
  showStars = true,
  initialRotationY = -0.12,
  pauseWhenHidden = true,
  pauseWhenOutsideViewport = true,
  pixelRatioCap,
  quality = "balanced",
  samples,
  settings = {},
  tiltX = 0.16,
  tiltY = -0.18,
  tiltZ = 0,
  rotationSpeed = 0.000036,
} = {}) {
  if (!globe || !canvas || !supportsWebGL()) return null;

  let tuning = { ...EARTH_TUNING_PRESET, rotationSpeed, ...settings };
  let currentRotationSpeed = tuning.rotationSpeed;
  const lightDirection = new THREE.Vector3(tuning.lightX, tuning.lightY, tuning.lightZ).normalize();
  const isMobile = window.matchMedia("(max-width: 680px)").matches;
  const qualityProfile = resolveQualityProfile({
    anisotropyCap,
    isMobile,
    pixelRatioCap,
    quality,
    samples,
  });
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: qualityProfile.useAntialias && !isMobile,
    canvas,
    powerPreference: isMobile ? "default" : "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qualityProfile.pixelRatioCap));

  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(25.5, 1, 0.1, 100);
  camera.position.set(0, 0, tuning.cameraZ);
  const compositePass = createCompositePass(renderer, qualityProfile.samples);

  const system = new THREE.Group();
  system.rotation.set(tiltX, tiltY, tiltZ);
  scene.add(system);

  const loader = new THREE.TextureLoader();
  const [earthMap, earthGradeMap, cloudMap, lightsMap, normalMap, specularMap] = await Promise.all([
    loader.loadAsync(TEXTURES.earth),
    loader.loadAsync(TEXTURES.earthGrade),
    loader.loadAsync(TEXTURES.clouds),
    loader.loadAsync(TEXTURES.lights),
    loader.loadAsync(TEXTURES.normal),
    loader.loadAsync(TEXTURES.specular),
  ]);

  configureTexture(earthMap, renderer, { anisotropyCap: qualityProfile.textureAnisotropy });
  configureTexture(earthGradeMap, renderer, { anisotropyCap: qualityProfile.textureAnisotropy });
  configureTexture(lightsMap, renderer, { anisotropyCap: qualityProfile.textureAnisotropy });
  configureTexture(cloudMap, renderer, { anisotropyCap: qualityProfile.textureAnisotropy, color: false });
  configureTexture(normalMap, renderer, { anisotropyCap: qualityProfile.textureAnisotropy, color: false });
  configureTexture(specularMap, renderer, { anisotropyCap: qualityProfile.textureAnisotropy, color: false });

  function createSphereGeometry(radius) {
    return new THREE.SphereGeometry(radius, qualityProfile.widthSegments, qualityProfile.heightSegments);
  }

  const earthGeometry = createSphereGeometry(1);
  const backgroundHalo = new THREE.Mesh(
    createSphereGeometry(1.075),
    createBackgroundHaloMaterial(tuning),
  );
  backgroundHalo.rotation.y = initialRotationY;
  backgroundHalo.renderOrder = -1;
  system.add(backgroundHalo);

  const silhouette = new THREE.Mesh(
    createSphereGeometry(1.031),
    createSilhouetteMaterial(tuning),
  );
  silhouette.rotation.y = initialRotationY;
  silhouette.renderOrder = 0;
  system.add(silhouette);

  const earthMaterial = createEarthSurfaceMaterial({
    dayMap: earthMap,
    gradeMap: earthGradeMap,
    lightDirection,
    nightMap: lightsMap,
    normalMap,
    settings: tuning,
    specularMap,
  });
  const earth = new THREE.Mesh(earthGeometry, earthMaterial);
  earth.rotation.y = initialRotationY;
  earth.renderOrder = 1;
  system.add(earth);

  const cloudGeometry = createSphereGeometry(1.012);
  const clouds = new THREE.Mesh(
    cloudGeometry,
    createCloudMaterial(cloudMap, lightDirection, tuning),
  );
  clouds.rotation.y = earth.rotation.y + 0.08;
  clouds.renderOrder = 2.2;
  system.add(clouds);

  const cloudShadow = new THREE.Mesh(
    earthGeometry,
    createCloudShadowMaterial(cloudMap, lightDirection, tuning),
  );
  cloudShadow.rotation.copy(clouds.rotation);
  cloudShadow.scale.setScalar(1.007);
  cloudShadow.renderOrder = 2;
  system.add(cloudShadow);

  const shadow = new THREE.Mesh(earthGeometry, createTerminatorMaterial(lightDirection, tuning));
  shadow.rotation.copy(earth.rotation);
  shadow.scale.setScalar(1.004);
  shadow.renderOrder = 3;
  system.add(shadow);

  const innerAtmosphere = new THREE.Mesh(
    createSphereGeometry(1.016),
    createInnerAtmosphereMaterial(lightDirection, tuning),
  );
  innerAtmosphere.renderOrder = 4;
  system.add(innerAtmosphere);

  const atmosphere = new THREE.Mesh(
    createSphereGeometry(1.046),
    createAtmosphereMaterial(lightDirection, tuning),
  );
  atmosphere.renderOrder = 6;
  system.add(atmosphere);

  const atmosphereShell = new THREE.Mesh(
    createSphereGeometry(1.018),
    createAtmosphereShellMaterial(lightDirection, tuning),
  );
  atmosphereShell.renderOrder = 7;
  system.add(atmosphereShell);

  const edgeShadow = new THREE.Mesh(
    createSphereGeometry(1.017),
    createEdgeShadowMaterial(tuning),
  );
  edgeShadow.renderOrder = 5;
  system.add(edgeShadow);

  const stars = showStars ? createStarField(isMobile) : null;
  if (stars) scene.add(stars);

  let manualVisible = true;
  let documentVisible = pauseWhenHidden ? !document.hidden : true;
  let viewportVisible = true;
  let animationFrame = 0;
  let disposed = false;
  let lastTime = 0;
  let renderSize = 0;
  let renderPixelRatio = 0;

  function canRender() {
    return manualVisible && documentVisible && viewportVisible;
  }

  function shouldAnimate() {
    return canRender() && !reducedMotion && currentRotationSpeed > 0;
  }

  function resize() {
    const rect = globe.getBoundingClientRect();
    const size = Math.max(260, Math.floor(rect.width || globe.clientWidth || 620));
    const pixelRatio = renderer.getPixelRatio();
    if (size !== renderSize || pixelRatio !== renderPixelRatio) {
      renderSize = size;
      renderPixelRatio = pixelRatio;
      renderer.setSize(size, size, false);
      const targetSize = Math.max(1, Math.floor(size * pixelRatio));
      compositePass.resize(targetSize, targetSize);
    }
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    render();
  }

  function render() {
    if (disposed || !canRender()) return;
    compositePass.render(scene, camera);
  }

  function syncTuning(nextSettings = {}) {
    tuning = { ...tuning, ...nextSettings };
    currentRotationSpeed = tuning.rotationSpeed;

    lightDirection.set(tuning.lightX, tuning.lightY, tuning.lightZ);
    if (lightDirection.lengthSq() < 0.0001) {
      lightDirection.copy(VIEW_LIGHT_DIRECTION);
    } else {
      lightDirection.normalize();
    }

    camera.position.z = tuning.cameraZ;
    camera.updateProjectionMatrix();

    earthMaterial.uniforms.blackRimStrength.value = tuning.blackRimStrength;
    earthMaterial.uniforms.atmosphereColor.value.set(tuning.atmosphereColor);
    earthMaterial.uniforms.darkStrength.value = tuning.darkStrength;
    earthMaterial.uniforms.lightIntensity.value = tuning.lightIntensity;
    earthMaterial.uniforms.nightLightStrength.value = tuning.nightLightStrength;
    silhouette.material.uniforms.blackRimStrength.value = tuning.blackRimStrength;
    clouds.material.uniforms.opacity.value = tuning.cloudOpacity;
    clouds.material.uniforms.cloudContrast.value = tuning.cloudContrast;
    clouds.material.uniforms.lightIntensity.value = tuning.lightIntensity;
    cloudShadow.material.uniforms.opacity.value = tuning.cloudOpacity;
    cloudShadow.material.uniforms.cloudContrast.value = tuning.cloudContrast;
    shadow.material.uniforms.blackRimStrength.value = tuning.blackRimStrength;
    shadow.material.uniforms.darkStrength.value = tuning.darkStrength;
    innerAtmosphere.material.uniforms.atmosphereColor.value.set(tuning.atmosphereColor);
    innerAtmosphere.material.uniforms.innerAtmosphereStrength.value = tuning.innerAtmosphereStrength;
    atmosphere.material.uniforms.atmosphereColor.value.set(tuning.atmosphereColor);
    atmosphere.material.uniforms.outerAtmosphereStrength.value = tuning.outerAtmosphereStrength;
    atmosphereShell.material.uniforms.atmosphereColor.value.set(tuning.atmosphereColor);
    atmosphereShell.material.uniforms.atmosphereShellStrength.value = tuning.atmosphereShellStrength;
    backgroundHalo.material.uniforms.backgroundHaloStrength.value = tuning.backgroundHaloStrength;
    edgeShadow.material.uniforms.blackRimStrength.value = tuning.blackRimStrength;

    backgroundHalo.scale.setScalar(Math.max(tuning.backgroundHaloSize, 1));
    innerAtmosphere.scale.setScalar(Math.max(tuning.innerAtmosphereSize, 1));
    atmosphere.scale.setScalar(Math.max(tuning.outerAtmosphereSize, 1));
    atmosphereShell.scale.setScalar(Math.max(tuning.atmosphereShellSize, 1));
    render();
    if (shouldAnimate()) {
      start();
    } else {
      stop();
    }
  }

  function animate(time = 0) {
    animationFrame = 0;
    if (disposed || !canRender()) return;

    const delta = lastTime ? Math.min(time - lastTime, 64) : 16;
    lastTime = time;

    const earthStep = delta * currentRotationSpeed;
    earth.rotation.y += earthStep;
    shadow.rotation.y = earth.rotation.y;
    clouds.rotation.y += delta * currentRotationSpeed * 1.18;
    cloudShadow.rotation.y = clouds.rotation.y - 0.012;
    if (stars) stars.rotation.z += delta * 0.000008;

    render();

    if (shouldAnimate()) {
      animationFrame = requestAnimationFrame(animate);
    }
  }

  function start() {
    if (disposed || animationFrame || !shouldAnimate()) return;
    lastTime = 0;
    animationFrame = requestAnimationFrame(animate);
  }

  function stop() {
    if (!animationFrame) return;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function refreshRuntimeVisibility() {
    if (canRender()) {
      render();
      start();
    } else {
      stop();
    }
  }

  function handleDocumentVisibility() {
    documentVisible = !document.hidden;
    refreshRuntimeVisibility();
  }

  const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(() => resize()) : null;
  resizeObserver?.observe(globe);

  const intersectionObserver =
    pauseWhenOutsideViewport && "IntersectionObserver" in window
      ? new IntersectionObserver(
          ([entry]) => {
            viewportVisible = Boolean(entry?.isIntersecting);
            refreshRuntimeVisibility();
          },
          { threshold: 0.01 },
        )
      : null;
  intersectionObserver?.observe(globe);

  if (pauseWhenHidden) {
    document.addEventListener("visibilitychange", handleDocumentVisibility);
  }

  syncTuning();
  resize();
  render();
  start();

  return {
    resize,
    getTuning() {
      return { ...tuning };
    },
    setTuning(nextSettings) {
      syncTuning(nextSettings);
    },
    setVisible(nextVisible) {
      manualVisible = Boolean(nextVisible);
      refreshRuntimeVisibility();
    },
    dispose() {
      disposed = true;
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (pauseWhenHidden) {
        document.removeEventListener("visibilitychange", handleDocumentVisibility);
      }
      renderer.dispose();
      [
        earthGeometry,
        backgroundHalo.geometry,
        silhouette.geometry,
        cloudGeometry,
        innerAtmosphere.geometry,
        atmosphere.geometry,
        atmosphereShell.geometry,
        edgeShadow.geometry,
        stars?.geometry,
      ].forEach((geometry) => geometry?.dispose());
      [
        earthMaterial,
        backgroundHalo.material,
        silhouette.material,
        cloudShadow.material,
        clouds.material,
        shadow.material,
        innerAtmosphere.material,
        atmosphere.material,
        atmosphereShell.material,
        edgeShadow.material,
        stars?.material,
      ].forEach((material) => material?.dispose());
      compositePass.dispose();
      [earthMap, earthGradeMap, cloudMap, lightsMap, normalMap, specularMap].forEach((texture) => texture.dispose());
    },
  };
}
