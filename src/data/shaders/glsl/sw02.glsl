#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359

uniform float u_time;
uniform vec2 u_resolution;

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

vec2 warp(vec2 p, float r)
{
    p *= 5.0;
    vec2 t = p;

    for (int i = 0; i < 1; ++i)
    {
        p.x += cos(p.x + u_time - 0.5 * p.y) * r;
        p.y += sin(p.y + u_time - 0.5 * p.x) * r;
        p *= 1.3;
        t *= p;
        float d = dot(p, t);
        p += d;
    }

    return p;
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

    minDist = 1.0;
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

void main()
{
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    vec3 color = vec3(0);

    float e = 0.04;
    float r = 5.0;
    vec2 ca = warp(uv + vec2(e, 0.0), r);
    vec2 cb = warp(uv + vec2(0.0, e), r);
    vec2 cc = warp(uv, r);

    vec3 cr = vec3(ca.x - cc.x, 0.1, cb.x - cc.x);

    float ambientStrength = 0.9;
    vec3 lightColor = vec3(0.2, 0.2, 0.4);
    vec3 ambient = ambientStrength * lightColor;
    vec3 ambientColor = ambient * cr;

    vec3 lp = vec3(0, 1, 0);
    vec3 rd = normalize(lp - vec3(uv, 1));
    vec3 normal = normalize(vec3(cr.x, cr.y, cr.z));
    float diffuse = max(dot(normal, rd), 0.0);
    vec3 diffuseColor = diffuse * ambientColor;
    
    color = diffuseColor;
    color += 0.5 * pow(normal.x, 128.0);

    float scale = 3.0;
    vec3 vo = voronoi(uv * scale);
    
    color += vec3(vo.yz, 1.0);

    float d = vo.x * cr.x * 0.25;
    float is = sin(d * vo.x) * 0.5;

    color *= smoothstep(0.0, 0.025, d * length(is)) - length(vo.yz) * vo.x;


    gl_FragColor = vec4(color, 1);
}