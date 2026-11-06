#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

mat2 rotate(float an)
{
    float s = sin(an);
    float c = cos(an);
    return mat2(c, s, -s, c);
}

float hashlessNoise(vec2 uv, float t)
{
    uv.x -= sin(1.4*uv.y+t*0.1);
    float m = 0.0;
    for (int i = 0; i < 6; ++i)
    {
        float g = 0.1*pow(sin(sin(sin(uv.x*12.0-(1.0-uv.x)*11.0)+sin(uv.y*1.0+uv.x*3.0)*1.0)*1.0), float(i));
        m += g;
        uv *= rotate(3.14*float(i));
    }

    return clamp(m, 0.0, 1.0);
}

vec2 geometry(vec2 uv, float t)
{
    float k = 1.0;
    float m = 1e9;
    vec2 p = uv, q = uv;
    for (int i = 0; i < 12; ++i)
    {
        p = abs(p-1.)-0.1*float(i);
        m = min(m, hashlessNoise(p+t*0.1, t));
        p *= rotate(3.14+float(i));
        p.x -= 0.2*cos(uv.x*5.0+sin(uv.y*5.0));
        p.y -= 0.2*sin(uv.y*3.0-cos(uv.x*7.0));
        uv.x = -uv.x;
        k += 0.25/dot(p-uv+cos(t), p-uv+cos(t));
    }

    return vec2(k, m);
}

void main()
{
    vec2 uv = (gl_FragCoord.xy-0.5*u_resolution.xy)/min(u_resolution.x, u_resolution.y);
    vec3 col = vec3(0.0);
    float t = u_time;
    vec2 geo_a = geometry(uv, t);
    vec2 geo_b = geometry(uv+vec2(0.0, 0.01), t);
    vec2 geo_c = geometry(uv+vec2(0.01, 0.0), t);

    col += vec3(0.1, 0.27, 0.6)-(geo_a.y-geo_b.y);
    col += vec3(0.4, 0.1, 0.3)*geo_a.x*0.1;
    // col += geo.x*geo.y+vec3(0.1, 0.27, 0.6)/geo.x;
    //col = sqrt(col);

    gl_FragColor = vec4(col, 1.0);
}