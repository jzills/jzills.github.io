#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359
#define AA 1

uniform float u_time;
uniform vec2 u_resolution;
#define u_time 24.0;

mat2 rotate(float an)
{
    float s = sin(an);
    float c = cos(an);
    return mat2(c, s, -s, c);
}

float random(float p)
{
    return fract(sin(dot(vec2(p), vec2(12.9345, 77.9713))) * 43758.97139);
}

float random(vec2 p)
{
    return fract(sin(dot(p, vec2(12.9345, 77.9713))) * 43758.97139);
}

float random(vec3 p)
{
    return fract(sin(dot(p, vec3(12.9345, 77.9713, 126.82713))) * 43758.97139);
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

    for (int i = 0; i < 2; ++i) 
    {
        v += a * noise(pos);
        pos = rot * pos * 2.0 + shift;
        a *= 0.5;
    }

    return v;
}

float sdSphere(vec3 p, float b)
{
    return length(p) - b;
}

float sdBox(vec3 p, vec3 b)
{
    return length(max(abs(p) - b, 0.0));
}

float M(vec3 p)
{
    vec3 w = p;
    float m = dot(w, w);

    vec4 trap = vec4(abs(w), m);
	float dz = 1.0;
    const float mult = 8.0;
    
    
	for (int i = 0; i < 1; ++i)
    {
        dz = mult * pow(sqrt(m), 7.0) * dz + 1.0;
        float r = length(w);
        float b = mult * acos(w.y / r);
        float a = mult * atan(w.x, w.z);
        w = p + pow(r, mult) * vec3(sin(b) * sin(a), cos(b), sin(b) * cos(a));  
        trap = min(trap, vec4(abs(w), m));
        m = dot(w, w);

		if (m > 256.0) break;
    }

    return 0.25 * log(m) * sqrt(m) / dz;
}

float omega() 
{
    return 2.0 * PI * 0.075 * u_time;
}

vec3 fourier(vec3 p)
{
    float w = 1.0;
    float h = 2.0;
    float div = 1.50;
    float k = div * PI / h;
    vec3 q = p;

    for (int n = 1; n < 15; n += 3)
    {
        q.x += w / 3.5 * sin(float(n) * p.y * k + omega()) / float(n);
        q.y += h / 3.5 * cos(float(n) * p.x * k + omega()) / float(n);
        q.xy *= rotate(float(n) + sin(PI * omega() * 0.05));
        p = q;
    }

    return q;
}

vec2 map(vec3 pos)
{ 
    //pos.xy = abs(mod(pos.xy + 0.5, 1.0) - 0.5);
    pos.xz += 0.16 * pow(sin(pos.z * 1.0), 1.0);
    vec3 q = fourier(pos);
    float m = M(q);
    //m -= fbm(q.xy)*0.1;
    return vec2(m*0.7, 0.0);
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
    vec2 eps = vec2(0.001, 0.0);
    return normalize(vec3(  map(pos + eps.xyy).x - map(pos - eps.xyy).x,
                            map(pos + eps.yxy).x - map(pos - eps.yxy).x,
                            map(pos + eps.yyx).x - map(pos - eps.yyx).x
                        ));
}

vec3 setCamera(vec2 uv, vec3 ro, float zoom)
{
    vec3 lookAt = vec3(0.0, 0.0, 5.0);
    vec3 f = normalize(lookAt - ro);
    vec3 r = cross(vec3(0.0, 1.0, 0.0), f);
    vec3 u = cross(f, r);
    vec3 c = ro + f * zoom;
    vec3 i = c + uv.x * r + uv.y * u;
    vec3 rd = i - ro;
    return rd;
}

float getCheck(vec3 pos, float t)
{
    return smoothstep(-0.1, 0.1, sin(pos.x * 5.0) + sin(pos.z * 3.0)) * (1.0 / t);
}

vec3 doColor(vec3 p)
{
    float r = sin(p.x * 7.0 + PI);
    float g = sin(p.y * 3.0 + PI);
    float b = cos(p.z * 5.0);

    return pow(vec3(r, g, b), vec3(1.0, 1.0, 1.0));
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
        
        vec3 ro = vec3(0.0, 0.0, -3.0);
        vec3 rd = setCamera(uv, ro, 1.0);
        vec2 t = rayMarch(ro, rd);

        if (t.x < 100.0)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = calcNormal(pos);
            vec3 mat = vec3(0.3, 0.5, 0.0);
            vec3 lid = normalize(vec3(50.0, 10.0, -100.0) - pos);
            float amb = 0.5 * nor.y;
            float dif = clamp(dot(nor, lid), 0.0, 1.0);
            vec3 hal = normalize(-rd + lid);
            float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 10.0);

            if (t.y <= 0.9)
            {
                col += (amb + dif + spe) * mat;
                
            }
        }

        tot += col;
    }
    
    tot /= float(AA * AA);

    gl_FragColor = vec4(tot, 1.0);
}