#ifdef GL_ES
precision mediump float;
#endif

#define AA 1

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate(float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float hash(vec2 p)
{
    return fract(sin(dot(p, vec2(12.9345, 77.9713))) * 43758.97139);
}

vec2 hash2(vec2 p) 
{ 
    p = vec2(
        dot(p, vec2(127.1, 311.7)), 
        dot(p, vec2(269.5, 183.3))
    ); 
    return fract(sin(p) * 18.5453); 
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

float sphere(vec3 p, float r)
{
    return length(p) - r;
}

float fbm(vec2 p)
{
    float t = 0.0;
    float a = 2.0;
    float sc = 0.9;
    vec2 sh = vec2(100.0);
    for (int i = 0; i < 12; ++i)
    {
        t += noise(p) * 0.5;
        p = p * rotate(float(i)+a*a) + sh * sc;
        sc *= 0.8;
    }

    return t;
}

float bump(vec3 p)
{
    float t = 10.0;
    vec3 q = p;
    for (int i = 0; i < 12; ++i)
    {
        q = abs(p) - vec3(float(i));
        q.xz *= rotate(float(i));
        q.yz *= rotate(float(i));
        p = q;
    }
    return fbm(q.xz * q.xy * 0.0435);
}

float map(vec3 p)
{
    float v = bump(p);
    float s = sphere(p, 25.0);
    float pl = p.y + 15.0 - v;
    return s;
}

float ray(vec3 ro, vec3 rd)
{
    vec3 p;
    float t = 0.0, d = 0.0;

    for (int i = 0; i < 100; ++i)
    {
        p = ro + t * rd;
        d = map(p);
        t += d;
        if (abs(d) < 0.001 || t > 100.0) break;
    }

    return t;
}

vec3 normal(vec3 p)
{
    vec2 e = vec2(0.01, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

vec3 doBump(vec3 p, vec3 n)
{
    vec2 e = vec2(0.01, 0.0);
    float f = bump(p);
    float dx = bump(p + e.xyy);
    float dy = bump(p + e.yxy);
    float dz = bump(p + e.yyx);

    dx = (dx - f) / e.x;
    dy = (dy - f) / e.x;
    dz = (dz - f) / e.x;

    return normalize(n + vec3(dx, dy, dz) * 0.75);
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
    vec3 tot = vec3(0);

    for (int m = 0; m < AA; ++m)
    for (int n = 0; n < AA; ++n)
    {
        vec2 of = vec2(float(m), float(n)) / float(AA);
        vec2 uv = ((gl_FragCoord.xy + of) - 0.5 * u_resolution.xy) / u_resolution.y;
        vec3 col = vec3(0);

        vec3 ro = vec3(100.0*sin(u_time), 50.0*sin(u_time*0.5), -100.0*cos(u_time));
        vec3 rd = setCamera(uv, ro, 1.0);

        float t = ray(ro, rd);

        if (t < 100.0)
        {
            vec3 p = ro + t * rd;
            vec3 n = doBump(p, normal(p));
            float v = bump(p);
            
            if (v < 1.5) col = vec3(1.0, 0.0, 0.0);
            else if (v < 3.0) col -= vec3(0.0, 1.0, 0.0);
            else if (v < 4.5) col -= vec3(0.0, 0.0, 1.0);
            else col -= vec3(0.5, 0.5, 0.5);

            vec3 li = normalize(vec3(50.0*sin(u_time), 50, -100.0*cos(u_time)) - p);
            vec3 df = clamp(dot(n, li), 0.0, 1.0) * vec3(0.1, 0.3, 0.2);
            float spe = pow(dot(reflect(rd, n), n), 50.0);
            col += df + spe;
        }

        tot /= float(AA * AA);
        tot += col;
        
    }
    

    gl_FragColor = vec4(tot, 1);
}