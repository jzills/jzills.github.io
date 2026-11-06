#ifdef GL_ES
precision mediump float;
#endif

#define AA 2

#define TWO_PI 6.28318530718
#define MAX_STEPS 100.0
#define MAX_DIST 30.0
#define SURF_DIST 0.0001

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate(float an)
{
    float c = cos(an);
    float s = sin(an);
    return mat2(c, -s, s, c);
}

float random(vec2 p)
{
    return fract(sin(dot(p, vec2(12.9345, 77.9713))) * 43758.97139);
}

float noise(vec2 p) 
{
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix  (a, b, u.x) 
                + (c - a) * u.y * (1.0 - u.x) 
                + (d - b) * u.x * u.y;
}

float fbm(vec2 pos) 
{
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));

    for (int i = 0; i < 6; ++i) 
    {
        v += a * noise(pos);
        pos = rot * pos * 2.0 + shift;
        a *= 0.5;
    }

    return v;
}

float smin(float a, float b, float k)
{
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float smax(float a, float b, float k)
{
    float h = max(k - abs(a - b), 0.0);
    return max(a, b) + h * h * 0.25 / k;
}


float sdSphere(vec3 pos, float r)
{
    return length(pos) - r;
}

float sdBox(vec3 pos, vec3 r)
{
    return length(max(abs(pos) - r, 0.0));
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r)
{
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

vec3 opRepLim(vec3 p, float c, vec3 l)
{
    return p - c * clamp(floor(0.5 + p / c), -l, l);
}

float sdGear(vec3 pos)
{
    float tx = sin(u_time * 0.5);
    float ty = cos(u_time) * 0.5 + 0.5;
    float angle = TWO_PI / 12.0;
    float sector = floor(0.5 + atan(pos.z, pos.x) / angle);

    vec3 q = pos;
    q.xz = rotate(sector * angle) * q.xz;

    float d = sdBox(q - vec3(0.6, ty, 0.0), vec3(0.9, 0.1, 0.05)) - 0.05;

    pos = opRepLim(pos, 0.5 * tx, vec3(1));

    float cyl = abs(length(pos.xz) - 0.2) - 0.01;
    float s = sdSphere(pos, 0.005);
    cyl = smax(cyl, abs(s - 0.1) - 0.5, 0.005);

    d = smin(d, cyl, 0.01);
    
    return d;
}

float sdGearPair(vec3 pos)
{
    float d = 0.0;
    vec3 q = pos;

    {
        float sph = sdSphere(q, 0.5);
        float gr = sdGear(q);
        float t = smin(sph, gr, 0.05);
        d = t;
    }

    q += vec3(0.0, -0.1, 0.0);

    {
        float sph = sdSphere(q, 0.5);
        float gr = sdGear(q);
        float t = smin(sph, gr, 0.05);
        d = smin(t, d, 0.05);
    }

    {
        float pol = sdCapsule(q, vec3(0), vec3(0, 1, 0), 0.0075);
        d = smin(d, pol, pos.y * 0.5);
    }

    return d;
}

float sdGearAxel(vec3 pos)
{
    vec3 q = pos;
    float angle = TWO_PI / 12.0;
    float sec = floor(0.5 + atan(q.z, q.x) / angle);

    q.xz = rotate(angle * sec) * q.xz;
    float gp = sdGearPair(q - vec3(0.5, 0.0, 0.0));

    return gp;
}

float map(vec3 pos)
{
    float d = 10.0;
    vec3 q = pos;
    float angle = TWO_PI / 24.0;
    float sec = floor(0.5 + atan(q.z, q.x) / angle);
    q.xz = rotate(angle * sec) * q.xz;

    float ga = sdGearAxel(q - vec3(1.0, 0.0, 0.0));

    return ga;
}

float castRay(vec3 ro, vec3 rd)
{
    vec3 pos = vec3(0);
    float t = 0.0;
    float d = 0.0;

    for (float i = 0.0; i < MAX_STEPS; ++i)
    {
        pos = ro + t * rd;
        d = map(pos);
        t += d;

        if (d < SURF_DIST || t > MAX_DIST) break;
    }

    return t;
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.0001, 0.0);
    return normalize(vec3(  map(pos + e.xyy) - map(pos - e.xyy),
                            map(pos + e.yxy) - map(pos - e.yxy),
                            map(pos + e.yyx) - map(pos - e.yyx)
                        ));
}

float calcAO(vec3 pos, vec3 nor, float time)
{
	float occ = 0.0;
    float sca = 1.6;

    for(int i = 0; i < 5; ++i)
    {
        float h = 0.01 + 0.12 * float(i) / 4.0;
        float d = map(pos + h * nor);
        occ += (h - d) * sca;
        sca *= 0.95;
    }

    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

float calcSoftshadow(vec3 ro, vec3 rd, float k)
{
    float res = 1.0;
    float tmax = 2.0;
    float t = 0.001;

    for(int i=0; i < 64; ++i)
    {
        float h = map(ro + rd * t);
        res = min(res, k * h / t);
        t += clamp(h, 0.012, 0.2);

        if(res < 0.001 || t > tmax) break;
    }
    
    return clamp(res, 0.0, 1.0);
}

float calcLight(vec3 pos, vec3 lp, vec3 ro, vec3 rd)
{
    vec3 ld = normalize(lp - pos);
    vec3 nor = calcNormal(pos);   

    float amb = clamp(0.5 + 0.5 * nor.y, 0.0, 1.0);
    float dif = clamp(dot(ld, nor), 0.0, 1.0);
    vec3 hw = normalize(-rd + ld);
    float spec = pow(clamp(dot(hw, nor), 0.0, 1.0), 50.0);

    return amb + dif + spec;
}

mat3 setCamera(vec3 ro, vec3 ta, float cr)
{
	vec3 cw = normalize(ta - ro);
	vec3 cp = vec3(sin(cr), cos(cr), 0.0);
	vec3 cu = normalize(cross(cw,cp));
	vec3 cv = (cross(cu,cw));
    return mat3(cu, cv, cw);
}

void main()
{
    vec3 tot = vec3(0);

    for (int m = 0; m < AA; ++m)
    for (int n = 0; n < AA; ++n)
    {
        vec2 off = vec2(float(m), float(n)) / float(AA);
        vec2 uv = ((gl_FragCoord.xy + off) - 0.5 * u_resolution.xy) / u_resolution.y;
        vec3 col = vec3(0);
	
        float m = u_time;
        float an = 6.2831 * m / 24.0;
        vec3 ta = vec3(0.0, 0.0, 0.0);
        vec3 ro = ta + vec3(6.0 * cos(an), 10.0, 6.0 * sin(an));
        
        mat3 ca = setCamera(ro, ta, 0.0);
        
        float fl = 1.5;
        vec3 rd = ca * normalize(vec3(uv, fl));

        float t = castRay(ro, rd);

        if (t < MAX_DIST)
        {
            vec3 pos = ro + t * rd;
            vec3 nor = calcNormal(pos);
            vec3 mat = vec3(0.2, 0.4 * pos.y, 0.75);
            float ao = calcAO(pos, nor, u_time);
            float ss = calcSoftshadow(ro, rd, 0.5);
            float l = calcLight(pos, normalize(vec3(0.4, 0.9, 0.1)), ro, rd);
            col += mat * ao * l;
        }
        else
        {
            float n = fbm(uv * 11.0 + fbm(uv * 25.0 + fbm(uv * 37.0)));
            col.rb += n;
        }

        tot += col;
    }

    tot /= float(AA * AA);


    gl_FragColor = vec4(tot, 1);
}