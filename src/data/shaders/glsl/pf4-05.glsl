#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926535897932
#define R 1.0
#define AA 2

uniform float u_time;
uniform vec2 u_resolution;
float glo = 0.0;

//#define u_time 34.0

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

float omega() 
{
    return 2.0 * PI * 0.075 * u_time;
}

vec3 fourier(vec3 p)
{
    float w = 1.0;
    float h = 1.0;
    float div = 0.2;
    float k = div * PI / h;
    vec3 q = p;

    for (int n = 1; n < 33; n+=3)
    {
        q.x += w / 3.5 * sin(float(n) * p.y * k + omega()) / float(n);
        q.y += h / 3.5 * cos(float(n) * p.x * k + omega()) / float(n);
        q.xy *= rotate(float(n) + sin(PI * omega() * 0.05));
        p = q;
    }

    return q;
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
    vec3 q = p;
    vec2 b1 = vec2(sdBox(q, vec3(1.0, 9.0, 5.0)), 1.0);
    vec2 b2 = vec2(sdBox(q, vec3(7.0, 5.0, 1.0)), 2.0);
    vec2 b3 = vec2(sdBox(q, vec3(5.0, 0.25, 10.0)), 3.0);
    float d = smin(b1.x, b2.x, 0.1);
    float i = b1.x < b2.x ? b1.y : b2.y;
    i = b3.x < d ? b3.y : i;
    d = smin(d, b3.x, 0.1);

    vec2 ca = vec2(10.0);//vec2(sdCapsule(q, 15.0, 0.5), 4.0);
    d = smin(d, ca.x, 0.1);

    return vec2(d, i);
}

vec2 elec(vec3 p)
{
    //p = fourier(p);
    vec3 q = abs(p);
    
    float b = sdBox(q, vec3(1.5, 1.0, 2.0)) - 5.0;
    
    float an = (PI * 2.0) / 12.0;
    float sec = floor(0.5 + atan(q.y, q.x) / an);
    q.xy = rotate(an * sec) * q.yx;
    float t = sin(u_time);
    float c = 10.0;//sdCapsule(q, 25.0, 0.21515);
    return vec2(smin(b, c, 0.01), b < c ? 7.0 : 8.0);
}

vec2 map(vec3 p)
{
    p = abs(p);
    p.x += sin(p.z * 0.15 + p.x * 0.05) * 7.0 * sin(u_time);
    p.z += u_time * 10.0;
    p.y -= 0.1 * pow(5.0 * sin(p.z * 0.5), 1.0);
    
    vec3 q = abs(p);
    q.y += 0.1 * pow(5.0 * sin(q.z + u_time), 0.5);

    q.xz = mod(q.xz + 10.0, 20.0) - 10.0;
    float an = (PI * 2.0) / (16.0 + 6.0 * sin(u_time));
    float sec = floor(0.5 + atan(q.y, q.x) / an);
    q.xy = rotate(an * sec) * q.yx;
    
    float t = sin(u_time * 0.5);
    vec2 e = elec(q);
    float si = sin((p.x + p.y) * 0.5 + cos(p.z + t)) * 0.5 + 0.5;
    q = abs(q) - vec3(9.0, 5.0, 1.0);

    for (int i = 0; i < 2; ++i)
    {
        q = abs(q) - vec3(1.0);
        q.xz *= rotate(t / PI * float(i));
        q.xy *= rotate(cos(float(i + 1) * float(i * i) / PI));
        q.yz *= rotate(sin(float(i * i) + PI + t));   
    }

    vec2 lf = leaf(q);
    glo += 0.1 / (0.1 + e.x * e.x * si);

    return vec2(smin(e.x, lf.x, 0.1) * R, e.x < lf.x ? e.y : lf.y);
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

        vec3 ro = vec3(0.0, 30.0, -70.0);
        vec3 rd = setCamera(uv, ro, 1.0);

        vec2 t = rayMarch(ro, rd);
        glo = 0.0;

        if (t.x < 100.0)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = calcNormal(pos);
            vec3 lid = normalize(vec3(5.0, 50.0, 50.0) - pos);
            vec3 hal = normalize(-rd + lid);
            vec3 mat = vec3(0.17, 0.15, 0.215);
            float amb = 0.5 * nor.y;
            float dif = clamp(dot(nor, lid), 0.0, 1.0);
            float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 50.0);
            float ao = calcAO(pos, nor);
            float ss = calcSoftShadow(pos, nor);
            vec3 fog = vec3(0.004) * (1.0 - (length(uv) - 0.2));
                
            if (t.y <= 0.9)
            {
                col += vec3(0.1, 0.4, 0.1);
            }
            else if (t.y <= 1.9)
            {
                col += vec3(0.3, 0.1, 0.2);
            }
            else if (t.y <= 2.9)
            {
                col += vec3(0.1, 0.05, 0.2);
            }
            else if (t.y <= 7.9)
            {
                col += 0.2 * glo * vec3(0.14, 0.42, 0.95);
            }
            else if (t.y <= 8.9)
            {
                col += 0.2 * glo * vec3(0.14, 0.42, 0.915);
            }
            
            col += mat * (amb + dif + spe) * ss;
            col += 0.25 * (smoothstep(-0.9, 0.3, col) - smoothstep(1.0, 0.6, col));
            col = mix(col, fog, 1.0 - exp(-0.000005 * t.x * t.x * t.x));
        }
        
        tot += col;
    }

    tot /= float(AA * AA);
    tot = sqrt(tot);

    gl_FragColor = vec4(tot, 1.0);
}