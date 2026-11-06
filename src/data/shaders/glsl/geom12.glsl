#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359
#define AA 2
#define MAX_DIST 100.0
#define DEPTH 0.6
#define PRECISION 0.1

uniform float u_time;
uniform vec2 u_resolution;

float hash(float p)
{
    return fract(sin(dot(vec2(p), vec2(12.9345, 77.9713))) * 43758.97139);
}

float hash(vec2 p)
{
    return fract(sin(dot(p, vec2(12.9345, 77.9713))) * 43758.97139);
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

float fbm(vec2 pos) 
{
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));

    for (int i = 0; i < 4; ++i) 
    {
        v += a * noise(pos);
        pos = rot * pos * 2.0 + shift;
        a *= 0.5;
    }

    return v;
}

mat2 rotate(float an)
{
    float s = sin(an);
    float c = cos(an);
    return mat2(c, -s, s, c);
}

float smin(float a, float b, float k)
{
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

vec3 rep(vec3 p, float c, vec3 l)
{
    return p - c * clamp(0.5 + floor(p / c), -l, l);
}

float sdBox(vec3 pos, vec3 b)
{
    return length(max(abs(pos) - b, 0.0));
}

float sdSphere(vec3 pos, float r)
{
    return length(pos) - r;
}

float sdCapsule(vec3 pos, vec3 a, vec3 b, float r)
{
    vec3 pa = pos - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

float sdGyroid(vec3 pos, float scl, float th)
{
    pos *= scl;
    return abs(dot(sin(pos), cos(pos.zxy))) / scl - th;
}

float sdEllipsoid(vec3 p, vec3 r)
{
    float k0 = length(p / r);
    float k1 = length(p / (r * r));
    return k0 * (k0 - 1.0) / k1;
}

float sdCappedTorus(vec3 p, vec2 sc, float ra, float rb)
{
    p.x = abs(p.x);
    float k = (sc.y*p.x>sc.x*p.y) ? dot(p.xy,sc) : length(p.xy);
    return sqrt( dot(p,p) + ra*ra - 2.0*ra*k ) - rb;
}

float sdPlane(vec3 p, vec3 n, float h)
{
    return dot(p, n) + h;
}

float tunnel(vec3 pos, float div, float m, vec2 f)
{
    vec3 q = pos;
    q.x -= q.y * 0.9 * sin(q.z + 5.0);
    q.z = mod(q.z + m * 0.5, m) - m * 0.5;

    float angle = PI / div;
    float sec = floor(0.5 + atan(q.y, q.x) / angle);
    q.xy = rotate(angle * sec) * q.xy;

    vec2 e = vec2(cos(q.x * 10.0) * 0.05, sin(q.x * 15.0) * 0.05);
    vec2 dir = normalize(vec2(hash(pos.x)));
    vec2 u = normalize(e * dir);

    float s = sdSphere(vec3(q.x - f.x, q.y - f.y, q.z), 0.5);
    float c = sdCapsule(vec3(q.x, q.y, q.z), vec3(10.0, 0.0, 9.0), vec3(30.0, 0.0, 10.0), 0.05);
    return s;
    return smin(s, c, 1.0);
}

vec2 map(vec3 pos)
{
    vec3 q = pos;

    float d = 10.0, id = 1.0;

    for (int i = 0; i < 6; ++i)
    {
        float t = tunnel(q, float(i * i) * sin(q.z * 0.0125), 0.5 * float(i) * clamp(q.z, 0.0, 1.0) + 0.5, vec2(5.0, 0.005));   
        q = q - 0.095 * pow((sin(q.x) + sin(q.z)) * 0.5 + 5.0, pow(float(i * i * i) * 1.5, 0.05));
        q.xz *= rotate(PI / (7.0 - 2.0 * float(i * i)));
        q -= dot(q, q) * 0.004;
        if (t < d) { d = t; }
    }

    float s = sdSphere(pos - vec3(5.0, 20.0, 0.0), 4.0);
    s = smin(s, sdSphere(pos - vec3(-5.0, 10.0, -4.0), 1.0), 0.5);
    s = smin(s, sdSphere(pos - vec3(-14.0, 0.0, 0.0), 9.0), 0.5);
    s = smin(s, sdSphere(pos - vec3(10.0, 10.0, 5.0), 2.0), 0.5);

    id = s < d ? 0.0 : 1.0;
    d = smin(s, d, 6.0);
    
    return vec2(d * DEPTH, id);
}

vec2 rayMarch(vec3 ro, vec3 rd)
{
    vec2 t = vec2(0.0);

    for (float i = 0.0; i < MAX_DIST; ++i)
    {
        vec3 pos = ro + t.x * rd;
        vec2 d = map(pos);
        t.x += d.x;
        t.y = d.y;

        if (abs(d.x) < PRECISION || t.x > 100.0) break;
    }

    return t;
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(PRECISION, 0.0);
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

vec3 setCamera(vec2 uv, vec3 ro, float zoom)
{
    vec3 lookAt = vec3(0.0, 1.0, 0.0);
    vec3 f = normalize(lookAt - ro);
    vec3 r = cross(vec3(0.0, 1.0, 0.0), f);
    vec3 u = cross(f, r);
    vec3 cen = ro + f * zoom;
    vec3 i = cen + uv.x * r + uv.y * u;
    vec3 rd = i - ro;
    return rd;
}

vec3 getColor(vec3 a, vec3 b, vec3 c, vec3 d, float t)
{
    return a + b * cos(2.0 * PI * (c * t + d));
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

        float zoom = 1.0;
        vec3 ro = vec3(1.0, 100.0, 37.0);
        vec3 rd = setCamera(uv, ro, zoom);

        vec2 t = rayMarch(ro, rd);

        if (t.x < MAX_DIST)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = calcNormal(pos);
            vec3 mat = vec3(0.05, 0.01, 0.1);
            vec3 lig = normalize(vec3(10.0, 10.0, -20.0) - pos);
            vec3 hal = normalize(vec3(-rd + lig));
            float amb = 0.5 * nor.y;
            float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 5.0);
            float dif = clamp(dot(nor, lig), 0.0, 1.0);
            float occ = calcAO(pos, nor);
            float ss = calcSoftShadow(pos, nor, 0.1, 0.5, 0.9);
            //float f = fbm(pos.xz);

            col += amb * 2.0 *vec3(0.01, 0.182, 0.2);
            col += dif * 11.0 * vec3(0.15, 0.05, 0.0);
            col += spe * 6.0 * vec3(0.1, 0.2, 0.13);
            col *= occ;
            col *= ss;

            if (t.y <= 0.9)
            {
                float f = sin(pos.x * 5.0) + sin(pos.y * 7.0) + sin(pos.z * 5.0);
                col += mat * smoothstep(-0.5, 0.5, f);
            }
            else if (t.y <= 1.9)
            {   
                col += mat;
            }

            float fog = exp(-pos.z * 0.00525) * 1.35;
            col *= fog;
            vec3 bc = vec3(0.5, 0.5, 0.15);
            col *= 1.0 - pow(getColor(bc, bc, vec3(0.25, 0.25, 0.25), vec3(0.25, 0.5, 0.75), length(pos * length(pos * 0.00015)) * t.x), vec3(0.6, 0.9, 0.4));
        
        }
        
        col *= 1.0 - 1.0 * length(uv);
        tot += col;
    }

    tot /= float(AA * AA);
    tot = sqrt(tot);

    gl_FragColor = vec4(tot, 1.0);
}