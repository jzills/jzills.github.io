#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926535897932
#define R 1.0
#define AA 2
#define C 35.0
#define COLOR_BUMP 0

uniform float u_time;
uniform vec2 u_resolution;
float glo = 0.0;
vec3 q, u;

//#define u_time 0.0

mat2 rotate(float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c);
}

float hash(vec2 n) 
{
    return fract(sin(dot(n, vec2(12.9898,12.1414))) * 83758.5453);
}

float noise(vec2 p)
{
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix  (a, b, u.x) 
                + (c - a) * u.y * (1.0 - u.x)
                + (d - b) * u.x * u.y;
}

float fbm(vec2 p)
{
    float t = 0.0;
    float a = 2.0;
    float sc = 0.9;
    vec2 sh = vec2(100.0);
    for (int i = 0; i < 8; ++i)
    {
        t += noise(p) * 0.5;
        p = p * rotate(float(i)+a*a) + sh * sc;
        sc *= 0.8;
    }

    return t;
}

float bump(vec3 p)
{
    for (int i = 0; i < 12; ++i)
    {
        q = abs(p) - vec3(float(i));
        q.xz *= rotate(float(i));
        q.yz *= rotate(float(i));
        p = q;
    }

    //triplanar-ish
    return fbm(vec2(q.y, dot(q.xz, vec2(10.95))));
    //return fbm(q.xz * q.yz * 0.9435);
}

float smin(float a, float b, float k)
{
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float sphere(vec3 p, float r)
{
    return length(p) - r;
}

float box(vec3 pos, vec3 b)
{
  vec3 q = abs(pos) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdCapsule(vec3 p, float h, float r)
{
  p.y -= clamp(p.y, 0.0, h);
  return length(p) - r;
}

float tor(vec3 p, float a, float b)
{
    p.yz *= rotate(PI * 0.5);
    vec2 c = vec2(length(p.xz) - a, p.y);
    float d = length(c) - b;
    return d;
}

float space(vec3 p)
{
    return tor(p, 20.0 * sin(u_time * 0.75) + 5.0, 15.0);
}

float leaf1(vec3 p)
{
    q = p;
    q.xy += 3.0*sin(q.xz*0.095+u_time);
    q.z = mod(q.z + 10.0, 20.0) - 10.0;
    float po = length(abs(q.xy) - 2.0) - 1.0;
    float si = sin(u_time) * 0.5 + 0.5;
    float b = sphere(abs(q) - vec3(2.0*si), 2.0+si);
    vec3 u = q;
    u.z = mod(u.z + 1.0, 2.0) - 1.0;
    float k = sphere(abs(u) - vec3(2.0*si), 0.95);
    
    glo += 0.1 / (0.1 + k * k);
    b = min(b, k);

    return smin(po, b, 0.9);
}

float leaf2(vec3 p)
{
    return 100.0;
    return p.y + 18.0;
}

vec2 map(vec3 p)
{
    u = p;
    p.x -= sin(p.z * 0.15 + u_time) * 2.0;
    p.z -= u_time * 15.0;
    p.z += sin(q.y * 5.0 + u_time * 2.0) * 0.15;
    p.y -= sin(p.x * 0.75 + u_time);
    
    q = p;
    

    for (int i = 0; i < 2; ++i)
    {
        q = abs(p) - vec3(15.0, 5.0, 0.0);
        q.xz *= rotate(PI * float(i));
        q.xy *= rotate(PI + float(i) + 2.0);       
        p = q;
    }


    return vec2(smin(leaf1(q), leaf2(u), 0.5), 0.0);
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

vec3 doBump(vec3 p, vec3 n)
{
    vec2 e = vec2(0.9, 0.0);
    float f = bump(p);
    float dx = bump(p + e.xyy);
    float dy = bump(p + e.yxy);
    float dz = bump(p + e.yyx);

    dx = (dx - f) / e.x;
    dy = (dy - f) / e.x;
    dz = (dz - f) / e.x;

    return normalize(n + vec3(dx, dy, dz) * 0.25);
}

vec3 bg(vec3 rd)
{
    float k = abs(rd.y) * 0.05;
    return mix(vec3(0.0, 0.0, 0.0), vec3(0.15, 0.1, 0.15), k);
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
        vec3 ro = vec3(0.0, 0.0, -25.0);
        vec3 rd = setCamera(uv, ro, 1.0);
        vec2 t = rayMarch(ro, rd);
        col = bg(rd);
        glo = 0.0;

        if (t.x < 100.0)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = doBump(q, calcNormal(pos));
            
        #if COLOR_BUMP
            float v = bump(q);
            if (v < 1.5) col = vec3(1.0, 0.0, 0.0);
            else if (v < 3.0) col -= vec3(0.0, 1.0, 0.0);
            else if (v < 4.5) col -= vec3(0.0, 0.0, 1.0);
            else col -= vec3(0.5, 0.5, 0.5);
        #endif

            vec3 ref = reflect(rd, nor);
            vec3 lid = normalize(vec3(0, 0, 0) - pos);
            vec3 hal = normalize(-rd + lid);
            vec3 mat = vec3(0.27, 0.175, 0.215);
            float amb = 0.5 * nor.y;
            float dif = clamp(dot(nor, lid), 0.0, 1.0);
            float spe = pow(clamp(dot(nor, ref), 0.0, 1.0), 50.0);
            float ao = calcAO(pos, nor);
            vec3 fog = vec3(0.00004) * (1.0 - (length(uv)));
                
        

            // if (t.y <= 0.9) {}
            // else if (t.y <= 1.9)
            // {
            //     col += vec3(0.3, 0.1, 0.2);
            // }
            // else if (t.y <= 2.9)
            // {
            //     col += vec3(0.1, 0.7, 0.9);
            // }

            col += mat * (amb + dif + spe);
            col += 0.5 * mix(col, bg(ref), nor);
            col += 0.96*glo*vec3(0.1, 0.2, 0.3);
            col = mix(col, fog, 1.0 - exp(-0.000005 * t.x * t.x * t.x));
            
            //col = mix(col, 0.05 * glo * glo * vec3(0.2, 0.4, 0.9), lid);
            //col -= 0.0025*bump(nor);
        }
        
        tot += col;
    }

    tot /= float(AA * AA);
    tot = sqrt(tot);

    gl_FragColor = vec4(tot, 1.0);
}