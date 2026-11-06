#ifdef GL_ES
precision mediump float;
#endif

// rejected pumpkin processing line

#define TWO_PI 3.14159
#define AA 2

uniform float u_time;
uniform vec2 u_resolution;

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

float sdf(vec3 pos)
{
    vec3 q = abs(pos);
    float d = 0.0;
    float s = length(q) - 3.0;
    float g = sdGyroid(q, 5.0, 0.1025);
    float an = atan(q.y, q.z);
    d = max(s, -g);
    //d -= 0.1 * (cos(an) - sin(an));

    float m = sin(q.x * 5.0) + cos(q.y * 3.0);
    m -= 1.0 / length(sin(q * 5.0));
    float c = sdCapsule(q, vec3(0.0, 1.0, m), vec3(0.0, 2.0, 5.0), 0.25);
    d = max(d, c);

    return d;
}

float map(vec3 pos)
{
    vec3 q = pos;
    //q.z += u_time;
    q = mod(q + 2.5, 5.0) - 2.5;

    float d = 10.0;

    d = sdf(q);
    float s = sdSphere(q, 0.9);
    float an = atan(q.x, q.z);
    s -= 0.075 * pow(0.5 + 0.5 * sin(an * 9.0), 2.0);
    d = smin(d, s, 0.75);
    
    //float f = fbm(pos.xz + fbm(pos.yx));
    //d -= 0.1 * f;

    return d * 0.9;
}

float rayMarch(vec3 ro, vec3 rd)
{
    float t = 0.0;

    for (int i = 0; i < 100; ++i)
    {
        vec3 pos = ro + t * rd;
        float d = map(pos);
        t += d;

        if (abs(d) < 0.001 || t > 100.0) break;
    }

    return t;
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(  map(pos + e.xyy) - map(pos - e.xyy),
                            map(pos + e.yxy) - map(pos - e.yxy),
                            map(pos + e.yyx) - map(pos - e.yyx)
    ));
}

float calcAO(vec3 pos, vec3 nor)
{
	float occ = 0.0;
    float sca = 1.0;

    for (int i = 0; i < 5; ++i)
    {
        float h = 0.01 + 0.12 * float(i) / 4.0;
        float d = map(pos + h * nor);
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
     	float h = map(ro + t * rd);
        res = min(res, h / (w * t));
    	t += clamp(h, 0.5, 0.5);
        if (res < -1.0 || t > tmax) break;
    }

    res = max(res, -1.0);

    return 0.25 * (1.0 + res) * (1.0 + res) * (2.0 - res);
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
        vec3 ro = vec3(3.0, 0.0, -5.0);
        vec3 rd = setCamera(uv, ro, zoom);

        float t = rayMarch(ro, rd);

        if (t < 100.0)
        {
            vec3 pos = ro + t * rd;
            vec3 nor = calcNormal(pos);
            vec3 mat = vec3(0.3, 0.2, 0.3);
            vec3 lig = normalize(vec3(1.0, 1.0, -5.0));
            float amb = 0.5 * nor.y;
            float spe = clamp(dot(nor, reflect(vec3(0.0, 1.0, 0.0), nor)), 0.0, 1.0);
            float dif = clamp(dot(nor, lig), 0.0, 1.0);
            float occ = calcAO(lig, nor);
            float sha = calcSoftShadow(nor, lig, 0.5, 1.0, 0.5);
            float fog = exp(-pos.z * 0.15) * 0.95;
            col += amb * 1.0 *vec3(0.1, 0.2, 0.2);
            col += dif * 5.0 * vec3(0.15, 0.05, 0.0);
            col += spe * 3.0 * vec3(0.1, 0.2, 0.3);
            col *= occ;
            col *= sha;
            col *= fog;
        }

        tot += col;
    }

    tot /= float(AA * AA);
    tot = 1.0 - sqrt(tot);
    tot *= pow(tot, vec3(1.5, 1.1, 1.2));

    gl_FragColor = vec4(tot, 1.0);
}