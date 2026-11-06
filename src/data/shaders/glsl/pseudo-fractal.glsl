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
