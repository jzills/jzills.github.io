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
#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926535897932
#define R 0.7
#define AA 1

uniform float u_time;
uniform vec2 u_resolution;
float glo = 0.0;

float rand(vec2 n) 
{
    return fract(sin(dot(n, vec2(12.9898,12.1414))) * 83758.5453);
}

float noise(vec2 n) 
{
    const vec2 d = vec2(0.0, 1.0);
    vec2 b = floor(n);
    vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
    return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
}

mat2 rotate(float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c);
}

float smin(float a, float b, float k)
{
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float sdSphere(vec3 p, float r)
{
    return length(p) - r;
}

float sdTorus(vec3 p, vec2 t)
{
  vec2 q = vec2(length(p.xy) - t.x, p.z);
  return length(q) - t.y;
}

float sdBox(vec3 pos, vec3 b)
{
  vec3 q = abs(pos) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdCapsule(vec3 p, float h, float r)
{
  p.y -= clamp(p.y, 0.0, h);
  return length(p) - r;
}

vec2 leaf(vec3 p)
{
    float t = sin(u_time);
    vec3 q = p;
    vec2 b1 = vec2(sdBox(q, vec3(1.0, 1.0, 5.0)), 1.0);
    vec2 b2 = vec2(sdBox(q, vec3(1.0, 15.0, 1.0)), 2.0);
    vec2 b3 = vec2(sdBox(q, vec3(5.0, 0.25, 10.0 + t * 5.0)), 3.0);
    float d = smin(b1.x, b2.x, 0.1);
    float i = b1.x < b2.x ? b1.y : b2.y;
    i = b3.x < d ? b3.y : i;
    d = smin(d, b3.x, 0.1);
    return vec2(d, i);
}

float elec(vec3 p)
{
    vec3 q = abs(p) - vec3(5.0);
    float b = sdBox(q, vec3(5.0)) - 0.1;
    return b;
}

float tor(vec3 p, float a, float b)
{
    vec2 c = vec2(length(p.xz) - a, p.y);
    float d = length(c) - b;
    return d;
}

float space(vec3 p)
{
    return tor(p, 20.0, 15.0);
}

vec2 map(vec3 p)
{
    p.xy *= rotate(u_time * 0.25);
    //p.xz *= rotate(u_time * 0.5);
    vec3 q = abs(p);
    float t = sin(u_time * 0.5) * 0.5;
    float si = sin(p.z * 0.5 + u_time - cos(q.y * 0.05)) * 0.5 + 0.5;
    float sh = elec(q);

    for (int i = 0; i < 3; ++i)
    {
        q = abs(p) - vec3(3.0 + si, 5.0, 1.0 + float(i * i));
        q.xz *= rotate(t / PI * float(i));
        q.xy *= rotate(float(i * i) + sh * 0.005 + t);
        q.yz *= rotate(float(i * i));
        p = q;
    }

    vec2 lf = leaf(q);
    float sp = space(q);
    float d = smin(lf.x, lf.x, 0.1);
    glo += 0.1 / (0.1 + sp * sp * si);
    
    return vec2(d * R, sh < lf.x ? 0.0 : lf.y);
}

vec2 rayMarch(vec3 ro, vec3 rd)
{
    vec2 t = vec2(0.0);

    for (int i = 0; i < 128; ++i)
    {
        vec3 pos = ro + t.x * rd;
        vec2 d = map(pos);
        t.x += d.x;
        t.y = d.y;

        if (abs(d.x) < 0.001 || t.x > 100.0) break;
    }

    return t;
}

float calcAO(vec3 pos, vec3 nor)
{
	float occ = 0.0;
    float sca = 1.0;

    for (int i = 0; i < 5; ++i)
    {
        float h = 0.01 + 0.12 * float(i) / 4.0;
        float d = map(pos + h * nor).x;
        occ += (h - d) * sca;
        sca *= 0.95;
    }

    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

float calcSoftShadow(vec3 ro, vec3 rd)
{
 	float t = 0.2;
    float w = 1.0;
    float res = 1.0;

    for(int i = 0; i < 256; ++i)
    {
     	float h = map(ro + t * rd).x;
        res = min(res, h / (w * t));
    	t += clamp(h, 0.5, 0.5);
        if (res < -1.0 || t > 1.0) break;
    }

    res = max(res, -1.0);

    return 0.25 * (1.0 + res) * (1.0 + res) * (2.0 - res);
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(  map(pos + e.xyy).x - map(pos - e.xyy).x,
                            map(pos + e.yxy).x - map(pos - e.yxy).x,
                            map(pos + e.yyx).x - map(pos - e.yyx).x
                            ));
}

vec3 setCamera(vec2 uv, vec3 ro, float zoom)
{
    vec3 lookAt = vec3(0.0, 0.0, 0.0);
    vec3 f = normalize(lookAt - ro);
    vec3 r = cross(vec3(0.0, 1.0, 0.0), f);
    vec3 u = cross(f, r);
    vec3 cen = ro + f * zoom;
    vec3 i = cen + uv.x * r + uv.y * u;
    vec3 rd = i - ro;
    return rd;
}

vec3 bg(vec2 uv)
{
    vec3 mat = vec3(0.01, 0.02, 0.05);
    return mat;
}

void main()
{
    vec3 tot = vec3(0.0);

    for (int m = 0; m < AA; ++m)
    for (int n = 0; n < AA; ++n)
    {
        vec2 off = vec2(float(m), float(n)) / float(AA);
        vec2 uv = ((gl_FragCoord.xy + off) - 0.5 * u_resolution.xy) / u_resolution.y;
        vec3 col = vec3(0.0);
        vec3 ro = vec3(0.0, 0.0, -70.0);
        vec3 rd = setCamera(uv, ro, 1.0);
        vec2 t = rayMarch(ro, rd);
        glo = 0.0;

        if (t.x < 100.0)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = calcNormal(pos);
            vec3 ref = reflect(rd, nor);
            vec3 lid = normalize(vec3(50.0, 50.0, 0.0) - pos);
            vec3 hal = normalize(-rd + lid);
            vec3 mat = vec3(0.27, 0.15, 0.215);
            float amb = 0.5 * nor.y;
            float dif = clamp(dot(nor, lid), 0.0, 1.0);
            float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 50.0);
            float ao = calcAO(pos, nor);
            vec3 fog = vec3(0.004) * (1.0 - (length(uv) - 0.2));
                
            if (t.y <= 0.9)
            {
                //col = vec3(0.5, 0.9, 0.1);
            }
            else if (t.y <= 1.9)
            {
                col += vec3(0.3, 0.1, 0.2);
            }
            else if (t.y <= 2.9)
            {
                col += vec3(0.1, 0.7, 0.9);
            }

            col += mat * (amb + dif + spe) + 0.125 * ao;
            col = mix(col, fog, 1.0 - exp(-0.000005 * t.x * t.x * t.x));
            col = mix(col, 0.05 * glo * glo * vec3(0.2, 0.4, 0.9), lid);
        }
        
        tot += col;
    }

    tot /= float(AA * AA);
    tot = sqrt(tot);

    gl_FragColor = vec4(tot, 1.0);
}
`

const voronoi = `
#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926535897932
#define AA 1
#define R 1.0
#define CAMERA 0
#define S 4.0

uniform float u_time;
uniform vec2 u_resolution;
float glo = 0.0;

//#define u_time 02.90

mat2 rotate(float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c);
}

float smin(float a, float b, float k)
{
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float sdSphere(vec3 p, float r)
{
    return length(p) - r;
}

float sdTorus(vec3 p, vec2 t)
{
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float sdBox(vec3 pos, vec3 b)
{
  vec3 q = abs(pos) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdCapsule(vec3 p, float h, float r)
{
  p.y -= clamp(p.y, 0.0, h);
  return length(p) - r;
}

float omega() 
{
    return 2.0 * PI * 0.075 * u_time;
}

vec3 fourier(vec3 p)
{
    float w = 1.0;
    float h = 1.0;
    float div = 0.0;
    float k = div * PI / h;
    vec3 q = p;

    for (int n = 1; n < 9; n += 3)
    {
        q.x += w / 3.5 * sin(float(n) * p.y * k + omega()) / float(n);
        q.y += h / 3.5 * cos(float(n) * p.x * k + omega()) / float(n);
        q.xy *= rotate(float(n) + sin(PI * omega() * 0.05));
        p = q;
    }

    return q;
}

vec2 leaf(vec3 p)
{
    vec3 q = vec3(abs(p.x) - S, abs(p.y) - S, mod(p.z + S * 0.5, S) - S * 0.5);
    vec2 t = vec2(0.0);
    t.x = sdBox(q, vec3(1.0, 0.25, 0.5));
    float sh = length(q.yz) - 0.15;
    t.y  = t.x < sh ? 0.0 : 1.0;
    t.x = smin(t.x, sh, 0.1);
    sh = length(abs(vec2(abs(q.x) - 0.5, q.y)) - 0.105) - 0.15;
    t.y = t.x < sh ? t.y : 2.0;
    t.x = smin(t.x, sh, 0.1);
    t.x = max(t.x, sdSphere(q, 2.0));
    return t;
}

vec2 vehicle(vec3 p)
{
    vec3 q = vec3(abs(p.x) - S, abs(p.y) - S, mod(p.z + S, S * 2.0) - S);
    
    float an = PI / 9.0;
    float sec = floor(0.5 * atan(q.x, q.y));
    q.yx = rotate(an * sec) * q.yx;

    float si = 0.5 * sin(0.015 * dot(q - p, q - p) + u_time) + 0.1;

    float b = sdBox(q + vec3(0.0, S, 0.0), vec3(2.0, 0.5 * si, 0.5));
    float pl1 = length(q.xy + vec2(0.0, S)) - 0.0125;
    float pl2 = length(q.xy + vec2(0.0, S + cos(0.25 * abs(q.z) - u_time))) - 0.025;
    return vec2(min(b, min(pl1, pl2)), 3.0);
}

vec2 map(vec3 p)
{
    p.z += u_time * 10.0;
    p.y += sin(p.z * 0.15 + u_time) * p.x * 0.25;
    vec3 q = p;
    vec2 v = vehicle(p);
    vec2 t = leaf(q);
    t.y = t.x < v.x ? t.y : v.y;
    t.x = min(t.x, v.x);
    glo += 0.1 / (0.1 + v.x * v.x * 10.0);



    return vec2(t.x * R, t.y);
}

vec2 rayMarch(vec3 ro, vec3 rd)
{
    vec2 t = vec2(0.0);

    for (int i = 0; i < 100; ++i)
    {
        vec3 pos = ro + t.x * rd;
        vec2 d = map(pos);
        t.x += d.x;
        t.y = d.y;

        if (abs(d.x) < 0.001 || t.x > 100.0) break;
    }

    return t;
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(  map(pos + e.xyy).x - map(pos - e.xyy).x,
                            map(pos + e.yxy).x - map(pos - e.yxy).x,
                            map(pos + e.yyx).x - map(pos - e.yyx).x
                            ));
}

float calcAO(vec3 pos, vec3 nor)
{
	float occ = 0.0;
    float sca = 1.0;

    for (int i = 0; i < 5; ++i)
    {
        float h = 0.01 + 0.12 * float(i) / 4.0;
        float d = map(pos + h * nor).x;
        occ += (h - d) * sca;
        sca *= 0.95;
    }

    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

float calcSoftShadow(vec3 ro, vec3 rd, float tmin, float tmax, float w)
{
 	float t = tmin;
    float res = 1.0;

    for(int i = 0; i < 256; ++i)
    {
     	float h = map(ro + t * rd).x;
        res = min(res, h / (w * t));
    	t += clamp(h, 0.5, 0.5);
        if (res < -1.0 || t > tmax) break;
    }

    res = max(res, -1.0);

    return 0.25 * (1.0 + res) * (1.0 + res) * (2.0 - res);
}

mat3 setCamera(vec3 ro, vec3 ta, float cr)
{
	vec3 cw = normalize(ta - ro);
	vec3 cp = vec3(sin(cr), cos(cr), 0.0);
    
#if CAMERA == 1
    cp = fourier(cp);
#endif
	vec3 cu = normalize(cross(cw,cp));
#if CAMERA == 1
    cu = fourier(cu);
#endif
	vec3 cv = (cross(cu,cw));
    return mat3(cu, cv, cw);
}

void main()
{
    vec3 tot = vec3(0.0);

    for (int m = 0; m < AA; ++m)
    for (int n = 0; n < AA; ++n)
    {
        vec2 off = vec2(float(m), float(n)) / float(AA);
        vec2 uv = ((gl_FragCoord.xy + off) - 0.5 * u_resolution.xy) / u_resolution.y;
        vec3 col = vec3(0.0);

        float an = PI / 12.0;
        vec3 ta = vec3(0.0, 0.0, 0.0);
        vec3 ro = ta + vec3(0.0, 0.0, -20.0);
        
        mat3 ca = setCamera(ro, ta, 0.0);
        
        float fl = 1.0;
        vec3 rd = ca * normalize(vec3(uv, fl));

        glo = 0.0;
        vec2 t = rayMarch(ro, rd);

        if (t.x < 100.0)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = calcNormal(pos);
            vec3 lid = normalize(vec3(0.0, 10.0, 0.0) - pos);
            vec3 hal = normalize(-rd + lid);
            vec3 mat = vec3(0.097, 0.0105, 0.005);
            float amb = 0.5 * nor.y;
            float dif = clamp(dot(nor, lid), 0.0, 1.0);
            float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 20.0);
            float ao = calcAO(pos, nor);
            float ss = calcSoftShadow(ro, rd, 0.1, 1.0, 1.0);
            float fog = exp(-pos.z * 0.09475) * 0.39215;

            if (t.y <= 0.9)
            {
                col += vec3(0.2, 0.1, 0.9);
            }
            else if (t.y <= 1.9)
            {
                col += vec3(0.2, 0.9, 0.9);
            }
            else if (t.y <= 2.9)
            {
                col += vec3(0.4, 0.9, 0.8);
            }
            else
            {
                col += glo * 0.075 * vec3(0.2, 0.5, 0.5);
                //col += vec3(0.2, 0.5, 0.5);
            }

            col += mat * (1.0 * amb);
            col += mat * (7.0 * dif);
            col += mat * (5.0 * spe);
            col *= ao;
            col *= ss;
            col *= fog;
        }

        tot += col;
    }

    tot /= float(AA * AA);
    tot = sqrt(tot);

    gl_FragColor = vec4(tot, 1.0);
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
    title: 'Psuedo Fractal #5',
    description: 'Procedural SDF generated through iterative coordinate folding, rotation, and domain repetition.',
    tags: ['GLSL', 'Ray Marching', 'Generative'],
    fragmentShader: rippleGrid,
  },
  {
    kind: 'shader',
    title: 'Electric Railway to Nowhere-Ville',
    description: 'Ray-marched infinite railway assembled from tiled signed distance fields, animated electrical arcs, and procedural atmospheric glow.',
    tags: ['GLSL', 'Ray Marching', 'Generative'],
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
