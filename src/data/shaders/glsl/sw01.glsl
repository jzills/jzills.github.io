#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359
#define MAX_ITERS 5

uniform float u_time;
uniform vec2 u_resolution;

vec2 random(vec2 p) 
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

vec3 voronoi(vec2 p)
{
    vec2 i = floor(p);
    vec2 f = fract(p);

    float minDist = 1.0;
    vec2 minPoint = vec2(0);

    for (int y = -1; y <= 1; ++y)
    {
        for (int x = -1; x <= 1; ++x)
        {
            vec2 n = vec2(x, y);
            vec2 o = random(i + n);
            
            vec2 diff = n + o - f;
            float dist = length(diff);

            if (dist < minDist)
            {
                minDist = dist;
                minPoint = diff;
            }
        }
    }

    return vec3(minDist, minPoint);
}

vec2 warp(vec2 p)
{
    p *= 10.0;
    vec2 n = p * rotate(PI / 2.0 * u_time * 0.25);

    for (int i = 0; i < MAX_ITERS; ++i)
    {
        p.x += cos(p.y - u_time * 0.5 - sin(p.x + length(p - n)));
        p.y += sin(p.x + u_time * 0.25);
        p *= PI / 6.0 * rotate(float(i));
    }

    return mod(p, 2.0) - 1.0;
}

void main()
{
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;

    vec3 color = vec3(0);

    float e = 0.004;
    vec2 sa = warp(uv + vec2(e, 0.0));
    vec2 sb = warp(uv + vec2(0.0, e));
    vec2 sc = warp(uv);

    float a = length(sa);
    float b = length(sb);
    float c = length(sc);
    float d = a * b * c;
    color = vec3(0.6, 0.4, 0.4) * c * 2.5 - d;
    color *= mix(color, pow(1.0 - sc.x * color, vec3(20.0)), smoothstep(0.1, 0.02, d)) * 1.05;

    vec3 normal = normalize(vec3(sa.x - sc.x, 0.1, sb.x - sc.x));
    float diff = clamp(0.5 + 0.5 * dot(normal,vec3(0.5773)), 0.0, 1.0);
	color *= 1.0 + 0.7 * diff * color;
	color += smoothstep(0.1, 1.0, pow(normal.y, 2568.0));
    color *= 0.7;


    gl_FragColor = vec4(color, 1.0);
}