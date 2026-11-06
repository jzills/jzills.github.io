#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

float sdCapsule(vec3 p, vec3 a, vec3 b, float r)
{
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0 );
  
  return length( pa - ba * h ) - r;
}

float sdEllipsoid(vec3 pos, vec3 rad)
{
    float k0 = length(pos / rad);
    float k1 = length(pos / rad / rad);
    return k0 * (k0 - 1.0) / k1;
}

float smin(float a, float b, float k)
{
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float surfer(vec3 pos)
{
    float m = 0.0;

    float tx = cos(u_time);
    float ty = sin(u_time);

    vec3 mv = vec3(pos.x + tx, pos.y + ty, pos.z);
    float b1 = sdEllipsoid(mv, vec3(0.25));

    float ta = sdCapsule(mv, vec3(0.9 * cos(u_time * 1.0), 0.9 * sin(u_time * 5.0), 0.9 * cos(u_time * 10.0)), vec3(0.0, 0.1, 0.2), 0.125);
    
    m = smin(b1, ta, 0.5);

    //float ey1 = sdEllipsoid(mv + vec3(0.5, 0.1, 0.9), vec3(0.15));
    //float ey2 = sdEllipsoid(mv - vec3(0.5, 0.1, 0.9), vec3(0.15));

    //m = smin(m, ey1, 0.05);
    //m = smin(m, ey2, 0.05);

    return m;
}

float map(vec3 pos)
{
    float d = 0.0;
    
    float tx = cos(u_time + pos.x) / pos.x;
    float ty = sin(u_time - pos.y) / pos.y;
    float th = 1.0 - pos.y * 0.5 + 0.5;

    float d1 = sdEllipsoid(vec3(pos.x * tx, pos.y * ty, pos.z), vec3(0.2, 0.5, 0.9));
    float d2 = pos.z + 0.5;

    d = smin(d1, d2, th);

    float surfer = surfer(pos);

    return smin(d, surfer, 0.25);
}

float castRay(vec3 ro, vec3 rd)
{
    float t = 0.0;

    for (int i = 0; i < 100; ++i)
    {
        vec3 p = ro + t * rd;
        float d = map(p);

        if (d < 0.0001) break;

        t += d;

        if (t > 20.0) break;
    }

    if (t > 20.0) t = -1.0;

    return t;
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.0001, 0.0);
    return normalize(vec3(  map(pos + e.xyy) - map(pos - e.xyy),
                            map(pos + e.yxy) - map(pos - e.yxy),
                            map(pos + e.yyx) - map(pos - e.yyx)));
}

vec3 renderPixel(vec2 fragCoord)
{
    vec2 uv = (fragCoord - 0.5 * u_resolution.xy) / u_resolution.y;

    float an = 1.0 * sin(u_time);

    vec3 ro = vec3(4.0 * sin(an), 4.0 * cos(an), 4.0 * cos(an));
    vec3 ta = vec3(0.0, 0.0, 0.0);

    vec3 ww = normalize(ta - ro);
    vec3 uu = normalize(cross(ww, vec3(0, 1, 0)));
    vec3 vv = normalize(cross(uu, ww));
    
    vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.5 * ww);

    vec3 pos, color = vec3(0.1, 0.9, 0.6);
    float t = castRay(ro, rd);

    color *= vec3(uv.x, uv.y, 1.0);

    if (t > 0.0)
    {
        pos = ro + t * rd;
        vec3 material = vec3(0.15);
        vec3 nor = calcNormal(pos);
        vec3 sunDir = normalize(vec3(0.8, 0.4, 0.2));
        float sunSha = step(castRay(pos + nor * 0.0001, sunDir), 0.0);
        float sunDif = clamp(dot(nor, sunDir), 0.0, 1.0);
        float skyDif = clamp(0.5 + 0.5 * dot(nor, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
        float bounceDif = clamp(0.5 + 0.5 * dot(nor, vec3(0.0, -1.0, 0.0)), 0.0, 1.0);

        color += material * vec3(4.0, 3.0, 6.0) * sunDif * sunSha;
        color += material * vec3(1.0, 1.0, 4.0) * bounceDif;
        color += material * vec3(4.0, 6.0, 4.0) * skyDif;
    }

    color *= pow(color, vec3(0.4545));

    return color;
}

#define AA 2

// Supersampling: AA x AA samples spread evenly across the pixel, averaged.
void main()
{
    vec3 tot = vec3(0.0);
    for (int m = 0; m < AA; ++m)
    for (int n = 0; n < AA; ++n)
    {
        vec2 off = (vec2(float(m), float(n)) + 0.5) / float(AA) - 0.5;
        tot += renderPixel(gl_FragCoord.xy + off);
    }
    gl_FragColor = vec4(tot / float(AA * AA), 1.0);
}
