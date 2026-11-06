#ifdef GL_ES
precision mediump float;
#endif

#define TWO_PI 6.28318530718
#define AA 2
#define MAX_DIST 100.0

uniform vec2 u_resolution;
uniform float u_time;

mat2 rotate(float an)
{
    float c = cos(an);
    float s = sin(an);
    return mat2(c, s, -s, c);
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

float onion(float d, float h, float k)
{
    return abs(d - k) - h;
}

vec2 rep(vec2 pos, float c, vec2 l)
{
    return pos - c * clamp(0.5 + floor(pos / c), -l, l);
}

vec3 rep(vec3 p, float c, vec3 l)
{
    return p - c * clamp(0.5 + floor(p / c), -l, l);
}

float sdSphere(vec3 pos, float rad)
{
    return length(pos) - rad;
}

float sdBox(vec3 pos, vec3 b)
{
  vec3 q = abs(pos) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float blob(vec3 pos, float w, float h, float d)
{
    vec3 q = abs(pos);
    float rad = 1.5;
    float s = length(q) - rad;
    s += 0.0295 * (sin(pos.x * w) - sin(pos.y * h) - sin(pos.z * d));
    float m = 0.05 * pow(0.5 + 0.5 * (sin(10.0 * atan(pos.y, pos.z))), 1.5);
    s -= m;
    return s;
}

vec2 leg(vec3 pos)
{
    vec3 q = abs(pos);
    float an = TWO_PI / 16.0;
    float sec = floor(0.5 + atan(q.x, q.z) / an);
    q.xz = rotate(an * sec) * q.xz;

    vec3 u = q;
    u.yz = rep(q.yz, 5.0, vec2(10.0, 0.0));
    float s = blob(u - vec3(0.0, 0.0, 3.0), 5.0, 5.0, 9.0);
    
    float pl = length(q.z) - 2.5 - sin(pos.y + 2.0);
    pl -= 2.9 * pow(atan(q.x, q.z), 2.0) - 0.5;
    float d = smin(s, pl, 1.5);

    return vec2(d, 0.0);
}

vec2 map(vec3 pos)
{
    pos.y += sin(pos.y+u_time*0.6) * 0.75;
    pos.x += cos(pos.x-u_time*1.9) * 0.25;
    vec3 q = pos;
    float an = TWO_PI / 16.0;
    float sec = floor(0.5 + atan(q.x, q.y) / an);
    q.xy = rotate(an * sec) * q.xy;
    vec2 l = leg(q);
    
    return l;
}

vec2 castRay(vec3 ro, vec3 rd)
{
    vec2 t = vec2(0.0);

    for (int i = 0; i < 100; ++i)
    {
        vec3 pos = ro + t.x * rd;
        vec2 d = map(pos);
        t.y = d.y;
        t.x += d.x;

        if (abs(d.x) < 0.001 || t.x > MAX_DIST) break;
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

    res = max(res, -1.0); // clamp to [-1,1]

    return 0.25 * (1.0 + res) * (1.0 + res) * (2.0 - res); // smoothstep
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
        vec3 ro = vec3(0.0, 0.0, -40.0);   
        vec3 rd = normalize(vec3(uv, 1.0));
        
        vec2 t = castRay(ro, rd);

        if (t.x < 100.0)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = calcNormal(pos);
            vec3 kld = normalize(vec3(0.9, 0.20, -10.0));
            float amb = 0.5 * nor.y;
            float spe = clamp(dot(nor, reflect(vec3(0.0, 1.0, 0.0), nor)), 0.0, 1.0);
            float dif = clamp(dot(nor, kld), 0.0, 1.0);
            float occ = calcAO(pos, nor);
            float sha = calcSoftShadow(pos, kld, 0.15, 1.0, 0.5);

            col = mix(col, nor * 0.309, kld);
            col += amb * 1.0 *vec3(0.1, 0.2, 0.6);
            col += dif * 6.0 * vec3(0.15, 0.075, 0.07);
            col += spe * 4.0 * vec3(0.1, 0.25, 0.3);
            col *= occ;
            col *= sha;

            if (t.y <= 0.9)
            {
             
                col += vec3(0.0, 0.103, 0.2) * nor;
            }
            else if (t.y <= 1.9)
            {
                float f = sin(pos.x * 2.0) + sin(pos.z * 1.0);
                f = smoothstep(-0.01, 0.5, f * f * f);
                col *= smoothstep(-0.1, 0.9, f + vec3(0.1, 0.2, 0.2)) * 2.0;
            }
            else if (t.y <= 2.9)
            {
                vec3 mat = vec3(0.2, 0.4, 0.4 * nor.z);
                col += mat;
            }
            else if (t.y <= 3.9)
            {
                //col = vec3(0.0, 1.0, 0.0);
            }

        }

        tot += col;
    }

    tot /= float(AA * AA);
    tot = sqrt(tot);
    tot = pow(tot, vec3(1.109, 1.2, 0.79) * 2.009);
    

    gl_FragColor = vec4(tot, 1.0);
}