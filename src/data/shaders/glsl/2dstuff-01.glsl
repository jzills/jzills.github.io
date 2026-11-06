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

float genA(vec2 p)
{
    p = abs(p);

    float m = 0.0, s = 4.0, r = 10.0, pw = 2.2;

    float t = sin(u_time * p.x - cos(p.y * p.y * pow(r, pw))) * 0.5 + 0.5;
    float v = cos(u_time * p.y + sin(p.x * p.x * pow(r, pw))) * 0.5 + 0.5;

    p = abs(p * s);

    m += 0.1 * t/sdfBox(p - vec2(sin(u_time * 0.25), 0), 0.25);
    m += 0.1 * v/sdfBox(p - vec2(0, cos(u_time)), 0.25);
    
    return m * 0.125;
}


void main()
{
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    vec3 color = vec3(0);

    float m = 0.0;

    for (float i = 0.0; i < 5.0; ++i)
    {
        uv *= rotate(PI * 0.25 * i);
        m += genA(uv);
    }

    color += m;

    gl_FragColor = vec4(color, 1);
}