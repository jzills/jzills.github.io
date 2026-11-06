#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926535897932
#define R 1.0
#define AA 1

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

float hash(float n) 
{ 
    return fract(sin(n)*43758.5453123); 
}

float noise2(in vec2 x)
{
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f*f*(3.0-2.0*f);
	
    float n = p.x + p.y*157.0;
    return mix(mix(hash(n+0.0), hash(n+1.0),f.x), mix(hash(n+157.0), hash(n+158.0),f.x),f.y);
}

float noise3(in vec3 x)
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
	
    float n = p.x + p.y*157.0 + 113.0*p.z;
    return mix(
        mix(mix(hash(n+  0.0), hash(n+  1.0),f.x), mix(hash(n+157.0), hash(n+158.0),f.x),f.y),
        mix(mix(hash(n+113.0), hash(n+114.0),f.x), mix(hash(n+270.0), hash(n+271.0),f.x),f.y),f.z);
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

float vmax(vec2 v)
{
    return max(v.x, v.y);
}

float box2(vec2 p, vec2 b) {
	vec2 d = abs(p) - b;
	return length(max(d, vec2(0))) + vmax(min(d, vec2(0)));
}

float box(vec3 pos, vec3 b)
{
  vec3 q = abs(pos) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float tor(vec3 p, float a, float b)
{
    p.yz *= rotate(PI * 0.5);
    vec2 c = vec2(length(p.xz) - a, p.y);
    float d = length(c) - b;
    return d;
}

float capsule(vec3 p, float h, float r)
{
  p.y -= clamp(p.y, 0.0, h);
  return length(p) - r;
}

float space(vec3 p)
{
    return tor(p, 20.0 * sin(u_time * 0.75) + 5.0, 15.0);
}

float leaf1(vec3 p)
{
    q = p;
    //q.xy += 3.0*sin(q.xz*0.095+u_time);
    q.z = mod(q.z + 10.0, 20.0) - 10.0;
    float po = length(abs(q.yz) - 2.0) - 1.0;
    float si = sin(u_time) * 0.5 + 0.5;
    float b = sphere(abs(q) - vec3(4.0), 0.0);
    vec3 u = q;
    u.z = mod(u.z + 1.0, 2.0) - 1.0;
    float k = sphere(abs(u) - vec3(1.0), 1.95);
    
    glo += 0.1 / (0.1 + k * k);
    //b = min(b, k);

    return smin(po, b, 0.09);
}

float leaf2(vec3 p)
{
    return 100.0;
    p.x -= 2.*sin(u.x+u_time);
    return p.x + 5.0;
}

vec2 alien(vec3 p)
{
    u = p;
    //p.x -= sin(p.z * 0.15 + u_time) * 2.0;
    //p.z -= u_time * 15.0;
    //p.z += sin(q.y * 5.0 + u_time * 2.0) * 0.15;
    //p.y -= sin(p.x * 0.75 + u_time);
    
    q = p;
    

    for (int i = 0; i < 3; ++i)
    {
        q = abs(p) - vec3(15.0, 6.0, 9.0);
        q.xz *= rotate(PI * float(i));
        q.xy *= rotate(PI + float(i) + 2.0);       
        p = q;
    }


    return vec2(smin(leaf1(q), leaf2(u), 0.5), 0.0);
}

vec2 mod2(inout vec2 p, float r)
{
    float s = r * 0.5;
    vec2 c = floor((p+s)/r);
    p = mod(p+s, r)-s;
    return c;
}

float fOpUnionChamfer(float a, float b, float r) {
	return min(min(a, b), (a - r + b)*sqrt(0.5));
}

vec3 tileGrid3(vec3 p, float m1, float m2, vec2 b1, vec2 b2)
{
    vec3 q = p;
    vec3 u = p;

    vec2 qid = mod2(q.xz, m1);
    vec2 uid = mod2(u.xz, m2);

    float qd = box2(q.xy, b1);
    float ud = box2(u.yz, b2);
    return vec3(min(qd, ud), min(qid, uid));
}

bool modEvenOr(float x)
{
    return mod(x, 2.0) >= 0.0;
}

vec2 grid3(vec3 p)
{
    vec3 q = p;
    vec3 qg = tileGrid3(q, 12.0, 28.0, vec2(1.0, 4.0), vec2(1.0, 3.0));
    vec3 ug = tileGrid3(q, 9.0, 24.0, vec2(1.0, 1.0), vec2(3.0, 1.0));    
    vec3 vg = tileGrid3(q, 15.0, 20.0, vec2(3.0, 10.0), vec2(1.0, 5.0));

    if (modEvenOr(qg.z))
    {
        qg.x -= 0.5;
    }

    if (modEvenOr(ug.z))
    {
        ug.x -= 0.5;
    }

    if (modEvenOr(vg.z))
    {
        vg.x -= 0.15;
    }

    float id = qg.x < ug.x ? 0.0 : 1.0;
    return vec2(min(min(qg.x, ug.x)-1.0, vg.x), id);
}

vec2 gear(vec3 p, float r)
{
    vec3 q = p;
    float an = (1.0*PI)/9.0;
    float sec = floor(0.5+atan(q.z, q.x)/an);
    q.xz *= rotate(sec*an);
    q.xz = abs(q.xz)-14.0;
    q = abs(q)-r;
    return grid3(q);
}

vec2 column(vec3 p)
{
    vec3 q = p.yxz;
    float an = (2.0*PI)/(12.0+p.z*0.25+sin(u_time));
    float sec = floor(0.5+atan(q.z, q.y)/an);
    q.yz *= rotate(sec*an);
    float m = 3.0*sin(u_time*0.5);
    q = abs(q)-m;
    vec2 g = gear(q, 14.0);
    return g;
}

vec2 map(vec3 p)
{
    vec3 q = p.yzx;
    q.y+= u_time*10.0;
    mod2(q.xy, 30.0);
    return min(column(q), alien(q));
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

vec3 bg(vec3 rd)
{
    float k = rd.y * 0.5;
    return mix(vec3(0., 0.0, 0.0), vec3(0.1, 0.02, 0.05), k);
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
        vec3 ro = vec3(0.0, 0.0, -100.0);
        vec3 rd = setCamera(uv, ro, 1.0);
        vec2 t = rayMarch(ro, rd);

        if (t.x < 100.0)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = calcNormal(pos);
            vec3 ref = reflect(rd, nor);
            vec3 lid = normalize(vec3(0, 0, -100) - pos);
            vec3 hal = normalize(-rd + lid);
            vec3 mat = vec3(0.07, 0.0175, 0.00215);
            float amb = 0.5 * nor.y;
            float dif = clamp(dot(nor, lid), 0.0, 1.0);
            float spe = pow(clamp(dot(nor, ref), 0.0, 12.0), 0.0);
            vec3 fog = vec3(0.004)*(1.0-length(uv));
            
            col = vec3(0.09, 0.1, 0.2)*(amb+dif+spe);
            col += 0.025*glo;
            col = mix(col, fog, 1.0-exp(-0.000005*t.x*t.x*t.x));
        }
        
        tot += col;
    }

    tot /= float(AA * AA);
    tot = sqrt(tot);

    gl_FragColor = vec4(tot, 1.0);
}