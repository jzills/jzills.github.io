export type ShaderItem = {
  kind: 'shader'
  title: string
  description: string
  tags: string[]
  fragmentShader: string
}

export type AudioItem = {
  kind: 'audio'
  title: string
  description: string
  tags: string[]
  audioSrc: string
}

export type CreativeItem = ShaderItem | AudioItem

const spiralTunnel = `
#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate(float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c);
}

float hash(float p)
{
    return fract(sin(dot(p, 48.7931))*25192.5829);
}

vec2 hash2(vec2 p)
{
    p = vec2( dot(p, vec2(127.1, 311.7)),
              dot(p, vec2(269.5, 183.3))
        );

    return -1.0+2.0*fract(sin(p)*43758.5453123);
}

float perlinNoise(vec2 p)
{
    float x0 = floor(p.x);
    float y0 = floor(p.y);
    float x1 = x0+1.0;
    float y1 = y0+1.0;

    vec2 gtl = hash2(vec2(x0, y1));
    vec2 gtr = hash2(vec2(x1, y1));
    vec2 gbl = hash2(vec2(x0, y0));
    vec2 gbr = hash2(vec2(x1, y0));

    vec2 dtl = p-vec2(x0, y1);
    vec2 dtr = p-vec2(x1, y1);
    vec2 dbl = p-vec2(x0, y0);
    vec2 dbr = p-vec2(x1, y0);

    p = fract(p);
    p *= p*(3.0-2.0*p);

    float dttl = dot(gtl, dtl);
    float dttr = dot(gtr, dtr);
    float dtbl = dot(gbl, dbl);
    float dtbr = dot(gbr, dbr);

    float xb = mix(dtbl, dtbr, p.x);
    float xt = mix(dttl, dttr, p.x);

    float e = mix(xb, xt, p.y)*0.5+0.5;

    return e;
}

float box(vec3 p, vec3 b)
{
    p = abs(p)-b;
    return length(max(p, 0.0))+min(max(p.x, max(p.y, p.z)), 0.0);
}

float lef(vec3 p)
{
    vec3 q = p;
    float b1 = box(q, vec3(0.1, 0.7, 0.7));
    float b2 = box(q, vec3(1.0, 0.5, 0.5));
    float d = min(b1, b2);
    float b3 = box(abs(q)-0.33, vec3(0.25, 0.25, 0.25));
    return min(d, b3);
}

vec2 sincos(float x) { return vec2(sin(x), cos(x)); }

float spiral(vec2 p, float z)
{
    float d = 1e9;

    for (int i = 0; i < 12; ++i)
    {
        vec2 p = p;
        p.xy += 0.9*sincos(z+float(i));
        p.y -= 0.3*sin(z+float(i)*u_time);
        float h = length(p);
        float f = h-0.2525*(0.8+0.2*sin(2.0*h));
        d = min(d, f);
    }

    return d;
}

vec2 map(vec3 p)
{
    vec3 q = abs(p)-2.5;
    q.y -= 0.25*sin(q.z+u_time+0.25*cos(0.2*u_time+q.z*5.));
    float zsp = spiral(q.xy, q.z);
    return vec2(zsp, 0.0);
}

vec2 rayMarch(vec3 ro, vec3 rd)
{
    vec2 t;
    for (int i = 0; i < 100; ++i)
    {
        vec3 p = ro+t.x*rd;
        vec2 d = map(p);
        if (abs(d.x) < 0.001 || t.x > 100.0) break;
        t.x += d.x;
        t.y = d.y;
    }
    return t;
}

vec3 calcNormal(vec3 p)
{
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p+e.xyy).x-map(p-e.xyy).x,
        map(p+e.yxy).x-map(p-e.yxy).x,
        map(p+e.yyx).x-map(p-e.yyx).x
    ));
}

float calcShadow(vec3 ro, vec3 rd)
{
    float t = 0.2;
    float w = 0.5;
    float res = 1.0;

    for (int i = 0; i < 256; ++i)
    {
        float h = map(ro+t*rd).x;
        res = min(res, h/(w*t));
        t += clamp(h, 0.5, t);
        if (res < -1.0 || t > 1.0) break;
    }

    res = max(res, -1.0);
    return 0.25*(1.0+res)*(1.0+res)*(2.0-res);
}

void main()
{
    vec2 uv = (gl_FragCoord.xy-0.5*u_resolution.xy);
    uv /= min(u_resolution.x, u_resolution.y);

    vec3 col = vec3(0.0);
    vec3 ro = vec3(0.0, 0.0, -10.0);
    ro.z += u_time*5.0;
    vec3 rd = normalize(vec3(uv, 1.0));
    vec3 fg = vec3(0.0004)*(1.0-length(uv));
    vec2 t = rayMarch(ro, rd);
    if (t.x < 100.0)
    {
        vec3 pos = ro+t.x*rd;
        vec3 nor = calcNormal(pos);
        vec3 lig = vec3(0.5, 0.83, -0.5);
        vec3 hal = normalize(lig-rd);
        float amb = rd.y*0.5;
        float dif = clamp(dot(nor, lig), 0.0, 1.0);
        float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 50.0);
        float nse = perlinNoise(pos.xz);

        col += (amb+dif+spe);
        col *= calcShadow(pos, lig);

        col = mix(col, fg, 1.0-exp(-0.00025*t.x*t.x*t.x));
    }

    gl_FragColor = vec4(col, 1.0);
}
`

const rippleGrid = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv = uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.6;
  float d = length(uv);
  float rings = sin(d * 14.0 - t * 3.0) * 0.5 + 0.5;
  float grid = sin(uv.x * 10.0 + t) * sin(uv.y * 10.0 - t * 0.7);
  float v = mix(rings, grid, 0.4);

  vec3 a = vec3(0.05, 0.07, 0.09);
  vec3 b = vec3(0.13, 0.82, 0.94);
  gl_FragColor = vec4(mix(a, b * 0.65, v), 1.0);
}
`

const voronoi = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv *= 5.0;

  vec2 i = floor(uv);
  vec2 f = fract(uv);

  float minDist = 1e9;
  float secondMin = 1e9;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash2(i + neighbor);
      point = 0.5 + 0.5 * sin(u_time * 0.5 + 6.28 * point);
      float d = length(neighbor + point - f);
      if (d < minDist) { secondMin = minDist; minDist = d; }
      else if (d < secondMin) { secondMin = d; }
    }
  }

  float edge = secondMin - minDist;
  float v = smoothstep(0.0, 0.08, edge);

  vec3 dark = vec3(0.05, 0.07, 0.09);
  vec3 cyan = vec3(0.13, 0.82, 0.94);
  gl_FragColor = vec4(mix(dark, cyan * 0.6 * minDist, v), 1.0);
}
`

export const creativeItems: CreativeItem[] = [
  {
    kind: 'shader',
    title: 'Spiral Tunnel',
    description: 'Ray-marched spiral geometry with Perlin noise shading — infinite procedural depth.',
    tags: ['GLSL', 'Ray Marching', 'Generative'],
    fragmentShader: spiralTunnel,
  },
  {
    kind: 'shader',
    title: 'Ripple Grid',
    description: 'Interference between concentric rings and a travelling sine grid.',
    tags: ['GLSL', 'Generative'],
    fragmentShader: rippleGrid,
  },
  {
    kind: 'shader',
    title: 'Voronoi',
    description: 'Animated Voronoi cells with smooth edge detection.',
    tags: ['GLSL', 'Generative'],
    fragmentShader: voronoi,
  },
  // Add audio items like this:
  // {
  //   kind: 'audio',
  //   title: 'Drone I',
  //   description: 'Evolving drone built from additive synthesis and slow LFO modulation.',
  //   tags: ['Generative Audio', 'Synthesis'],
  //   audioSrc: '/audio/drone-i.mp3',
  // },
]
