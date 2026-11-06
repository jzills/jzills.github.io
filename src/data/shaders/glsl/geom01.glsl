#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359
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

float tunnel(vec3 pos)
{
    vec3 q = pos;
    q.x += 3.0 * sin(q.z * 0.1 + 5.0);
    q.z = mod(q.z + 3.0, 6.0) - 3.0;

    float angle = PI / 2.0;
    float sec = floor(0.5 + atan(q.y, q.x) / angle);
    q.xy = rotate(angle * sec) * q.xy;

    float s = sdSphere(vec3(q.x - 5.0, q.yz), 1.0);
    float c = sdCapsule(vec3(q.x - 3.0, q.yz), vec3(0.0), vec3(5.0), 1.0);

    return min(s, c);
}

vec2 map(vec3 pos)
{
    float d = 10.0, id = 1.0;

    float t = tunnel(pos);
 
    return vec2(t, id);
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

        if (abs(d.x) < 0.0001 || t.x > 100.0) break;
    }

    return t;
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.0001, 0.0);
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
        vec3 ro = vec3(0.0, 2.0, -30.0);
        vec3 rd = setCamera(uv, ro, zoom);

        vec2 t = rayMarch(ro, rd);

        if (t.x < 100.0)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = calcNormal(pos);
            vec3 mat = vec3(0.05, 0.01, 0.1);
            vec3 lig = normalize(vec3(10.0, 0.0, -10.0));
            vec3 hal = normalize(vec3(-rd + lig));
            float amb = 0.5 * nor.y;
            float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 20.0);
            float dif = clamp(dot(nor, lig), 0.0, 1.0);
            float occ = calcAO(pos, nor);
            float ss = calcSoftShadow(pos, nor, 0.1, 0.5, 0.9);

            col += amb * 3.0 *vec3(0.01, 0.182, 0.2);
            col += dif * 5.0 * vec3(0.15, 0.05, 0.0);
            col += spe * 3.0 * vec3(0.1, 0.2, 0.3);
            col *= occ;
            col *= ss;

            if (t.y <= 0.9)
            {
                col += mat;
            }
            else if (t.y <= 1.9)
            {   
                col += mat;  
            }
            else if (t.y <= 2.9)
            {
                col += mat;
            }
            else
            {
                col += vec3(0.1);
            }

            
            
            float fog = exp(-pos.z * 0.02725) * 0.9935;
            col *= fog;
        }

        tot += col;
    }

    tot /= float(AA * AA);

    gl_FragColor = vec4(tot, 1.0);
}