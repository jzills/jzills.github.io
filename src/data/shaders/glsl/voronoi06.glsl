#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359

uniform float u_time;
uniform vec2 u_resolution;

//#define u_time 0.9

mat2 rotate(float a)
{
    float c = cos(a);
    float s = sin(a);
    return mat2(c, s, -s, c);
}

vec2 random(vec2 p) 
{
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), 
            dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

vec3 voronoi(vec2 p)
{
    vec2 fl = floor(p);
    vec2 fr = fract(p);

    vec2 minPoint;
    vec2 minNeighbor;
    float minDist = 10.0;
    
    for (int i = -1; i <= 1; ++i)
    {
        for (int j = -1; j <= 1; ++j)
        {
            vec2 n = vec2(i, j);
            vec2 o = random(fl + n);

            o = 0.5 + 0.5 * sin(u_time + PI * o);

            vec2 df = n + o - fr;
            float d = dot(df, df);

            if (d < minDist)
            {
                minDist = d;
                minPoint = df;
                minNeighbor = n;
            }
        }
    }

    minDist = 10.0;
    for (int i = -2; i <= 2; ++i)
    {
        for (int j = -2; j <= 2; ++j)
        {
            vec2 n = minNeighbor + vec2(i, j);
            vec2 o = random(fl + n);

            o = 0.5 + 0.5 * sin(u_time + PI * o);

            vec2 df = n + o - fr;
            
            float d = dot(minPoint + df, normalize(df - minPoint));

            if (d < minDist)
            {
                minDist = d;
            }
        }
    }

    return vec3(minDist, minPoint);
}

float getBorder(vec2 p)
{
    float d = voronoi(p).x;
    return 1.0 - smoothstep(0.0, 0.05, d);
}

float bf(vec3 vo)
{
    vec2 t = vec2(0);

    for (int i = 0; i < 5; ++i)
    {
        t.x += cos(vo.x - float(i) + sin(PI * vo.y) * cos(u_time * 0.5));
        t.y += sin(vo.y - float(i) - cos(PI * vo.x) * sin(u_time * 0.5));
    }
    
    return t.x * t.y;
}

void main()
{
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    vec3 color = vec3(0);

    uv *= 2.0;

    float e = 0.04;
    vec3 va = voronoi(uv + vec2(e, 0.0));
    vec3 vb = voronoi(uv + vec2(0.0, e));
    vec3 vc = voronoi(uv);

    color += va.x * vb.x * vc.x;
    vec3 normal = vec3(va.x - vc.x, va.y - vc.y, vb.z - vc.z);

    color += vec3(0.9, 0.2, 0.8) * color;
    color += vec3(vc.yz, 1.0);
    color -= smoothstep(0.1, 0.15, vc.x);

    float f = vc.x * sin(vc.y * 100.0 - cos(vc.z * sin(u_time * 0.50) * 100. + u_time));
    f = bf(vc) * f;
    color += smoothstep(0.1, 0.5, f);

    gl_FragColor = vec4(color, 1);
}