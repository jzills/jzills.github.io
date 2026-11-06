#ifdef GL_ES
precision mediump float;
#endif

#define AA 4
#define M_STEPS 100
#define M_DIST 20.0
#define S_DIST 0.0001

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate(float ang)
{
    float c = cos(ang);
    float s = sin(ang);
    
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

float sdPlane(vec3 p, vec4 n)
{
  return dot(p, n.xyz) + n.w;
}

float sdSphere(vec3 pos, float rad)
{
    return length(pos) - rad;
}

vec2 map(vec3 pos)
{
    float d = 0.0, id = 0.0;
    float sf = 0.125;
    float t = u_time;
    float att = 0.75 * sin(t * 0.5);
    vec3 aa = vec3(0.0, 1.0, 0.0) + vec3(cos(t), -1.0, sin(t)) * att;
    vec3 ab = vec3(0.0, 0.5, 0.0) + vec3(cos(t - 10.0), 0.0, sin(t)) * att;
    vec3 ac = vec3(sin(t), 1.0, cos(t)) * att;

    float sa = sdSphere(pos + aa, 0.25);
    float sb = sdSphere(pos + ab, 0.25);
    float sc = sdSphere(pos + ac, 0.25);
    float sm = sdSphere(pos, 0.35);

    float n = noise(pos.xy * 5.0);
    float f = sin(pos.x * 2.0) + sin(pos.y * 5.0);// + n;
    float p = sdPlane(pos, normalize(vec4(1.0, 0.0, -0.75, 1.0))) - f;

    if (sb < sa) id = 1.0;
    d = smin(sa, sb, sf);

    if (sc < d) id = 2.0;
    d = smin(d, sc, sf);

    if (sm < d) id = 3.0;
    d = smin(d, sm, sf);

    if (p < d) id = 4.0;
    d = smin(d, p, sf);

    return vec2(d * 0.5, id);
}

vec2 castRay(vec3 ro, vec3 rd)
{
    vec3 pos = vec3(0.0);
    float t = 0.0;
    vec2 di = vec2(0.0);

    for (int i = 0; i < M_STEPS; ++i)
    {
        pos = ro + t * rd;
        di = map(pos);

        if (abs(di.x) < S_DIST || t > M_DIST) break;

        t += di.x;
    }

    return vec2(t, di.y);
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.0001, 0.0);
    return normalize(vec3( map(pos + e.xyy).x - map(pos - e.xyy).x,
                           map(pos + e.yxy).x - map(pos - e.yxy).x,
                           map(pos + e.yyx).x - map(pos - e.yyx).x
                        ));
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

float calcOcclusion(vec3 pos, vec3 nor) 
{
    const int aoIter = 5;
    const float aoDist = 0.125;
    const float aoPower = 0.9;

    float dist = aoDist;
    float occ = 1.0;

    for (int i = 0; i < aoIter; ++i) 
    {
        occ = min(occ, map(pos + dist * nor).x / dist);
        dist *= aoPower;
    }

    occ = max(occ, 0.0);

    return occ;
}

void main()
{
    vec3 tot = vec3(0.0);

    // Supersampling for antialiasing
    for (int m = 0; m < AA; ++m)
    for (int n = 0; n < AA; ++n)
    {
        vec2 off = vec2(float(m), float(n)) / float(AA);
        vec2 uv = ((gl_FragCoord.xy + off) - 0.5 * u_resolution.xy) / u_resolution.y;
        vec3 col = vec3(0.0);
        vec3 ro = vec3(0.0, -0.25, -2.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        vec2 t = castRay(ro, rd);

        if (t.x < M_DIST)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = calcNormal(pos);
            vec3 lp = normalize(vec3(6.0 * sin(u_time), 1, -1.0 * cos(u_time)));
            float lig = calcLight(pos, lp, ro, rd);
            float occ = calcOcclusion(pos, nor);
            float fog = exp(-pos.z * 0.725);

            // if (t.y <= 0.9)
            // {

            // }
            // else if (t.y <= 1.9)
            // {

            // }
            // else if (t.y <= 2.9)
            // {

            // }
            if (t.y <= 3.9)
            {
                // float fb = fbm(pos.xz * 10.0 + fbm(pos.yz * 15.0));
                // col += fb;
            }
            else if (t.y <= 4.9)
            {
                float f = smoothstep(-0.1, 0.1, sin(pos.x * 10.0) + sin(pos.z * 6.0));
                col += f - vec3(0.2, 0.9, 0.9);
            }

            col += lig * vec3(0.1, 0.2, 0.9) * 1.;
            col *= occ;
            col *= fog;
        }

        tot += col;
    }

    tot /= float(AA * AA);

    gl_FragColor = vec4(tot, 1.0);
}