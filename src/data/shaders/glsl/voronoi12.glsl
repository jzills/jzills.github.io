#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

//#define u_time 21.

vec2 random(vec2 p) 
{
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), 
            dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

vec3 voronoi(vec2 p)
{
    p *= 2.0;

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
            vec2 o = random(ip + n);

            o = 0.5 + 0.5 * sin(u_time * o);

            vec2 df = n + o - fp;
            float d = dot(df, df);

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
            vec2 o = random(ip + n);

            o = 0.5 + 0.5 * sin(u_time * o);

            vec2 df = n + o - fp;
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
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    vec3 color = vec3(0);

    uv = abs(uv - sin(u_time * 0.05 - cos(length(uv) - sin(uv * 5.0))));

    vec3 vo = voronoi(uv);
    color -= vo.x + sin(vo.x * 20.0);
    color.gb *= vo.yz + cos(vo.yz * 5.0);

    gl_FragColor = vec4(color, 1);
}