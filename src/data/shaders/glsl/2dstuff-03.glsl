#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359

uniform float u_time;
uniform vec2 u_resolution;

vec2 random2(vec2 p) 
{
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), 
            dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

mat2 rotate(float a)
{
    float c = cos(a);
    float s = sin(a);
    return mat2(c, s, -s, c);
}

float sdfBox(vec2 p, float s)
{
    vec2 d = abs(p) - s;

    return length(max(d, vec2(0)) + min(max(d.x, d.y), 0.0));
}

float sdfCross(vec2 p, float s)
{
    vec2 d = abs(p) - s;

    return length(max(d, vec2(0)) / min(max(d.x, d.y), 0.0));
}

float genA(vec2 p, float th)
{
    p = abs(p);

    float   m = 0.0, 
            s = 10.0, 
            r = 1.0, 
            pw = 1.2,
            brt = clamp(0.95 * length(p), 0.2, 1.0),
            dv = 0.25;

    float t = sin(u_time * p.x - cos(p.y * p.y * pow(r, pw))) * 0.5 + 0.5;
    float v = cos(u_time * p.y + sin(p.x * p.x * pow(r, pw))) * 0.5 + 0.5;

    p = abs(p * s);

    m += (brt * t) / sdfBox(p - vec2(sin(u_time * 0.5), 0), th);
    m += (brt * v) / sdfBox(p - vec2(cos(u_time), sin(u_time * 0.25)), th);
    
    return m * dv;
}

vec3 genB(vec2 p, float s)
{
    float m = 0.0;

    for (float i = 0.0; i < 10.0; ++i)
    {
        p *= rotate(PI * 0.9 * i);
        p = abs(p);
        m += genA(p, s * i); // s = 0.25
    }

    return smoothstep(0.1, 0.9, m) * vec3(m, 0.9, 0.3);
}

vec3 voronoi(vec2 p)
{
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    vec2 mp = vec2(0);
    vec2 mn = vec2(0);
    float md = 10.0;

    for (int i = -1; i <= 1; ++i)
    {
        for (int j = -1; j <= 1; ++j)
        {
            vec2 n = vec2(i, j);
            vec2 p = random2(ip + n);

            p = 0.5 + 0.5 * sin(p * u_time);

            vec2 df = n + p - fp;
            float d = length(df);

            if (d < md)
            {
                md = d;
                mp = df;
                mn = n;
            }
        }
    }

    md = 10.0;

    for (int i = -2; i <= 2; ++i)
    {
        for (int j = -2; j <= 2; ++j)
        {
            vec2 n = mn + vec2(i, j);
            vec2 p = random2(ip + n);

            p = 0.5 + 0.5 * sin(p * u_time);

            vec2 df = n + p - fp;
            float d = dot(mp + df, normalize(df - mp));

            if (d < md)
            {
                md = d;
            }
        }
    }

    return vec3(md, mp);
}

void main()
{
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    vec3 color = vec3(0);


    vec3 v = voronoi(uv * 5.0);

    for (float i = 0.0; i < 5.0; ++i)
    {
        v.zy *= rotate(u_time * 0.25);
        color += genB(v.yz * v.x, i * 10.0);
        v.yz *= rotate(u_time);
    }

    

    

    gl_FragColor = vec4(color, 1);
}