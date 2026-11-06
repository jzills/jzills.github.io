#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926535897932
#define AA 2
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
