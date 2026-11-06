#ifdef GL_ES
precision mediump float;
#endif

#define MAX_STEPS 10
#define MAX_DIST 100.
#define SURF_DIST .01

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate(float a)
{
    return mat2(cos(a), sin(a), -sin(a), cos(a));
}

float smin(float a, float b, float k)
{
    float h = clamp(.5 + .5 * (b - a) / k, 0., 1.);
    return mix(b, a, h) - k * h * (1. - h);
}

float sphere(vec3 p, float s)
{
    return length(p) - s;
}

float capsule(vec3 p, vec3 a, vec3 b, float r)
{
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0 );
  return length( pa - ba * h ) - r;
}

// float map(vec3 p) {
//     p.x = fract(p.x/4.0)*4.0-2.0;
//     p.z = fract(p.z/4.0)*4.0-2.0;
//     float cube = length(max(abs(p-vec3(0.0, sin(u_time), 0.0)) - vec3(0.5), 0.0))-0.2;
//     float plane = p.y + 0.05*sin(-u_time*5.0+length(p.xz)*10.0);
//     return smin(plane,cube,0.1);
// }

vec3 bend(vec3 p)
{
    const float k = 10.0; // or some other amount
    float c = cos(k*p.x);
    float s = sin(k*p.x);
    mat2  m = mat2(c,-s,s,c);
    vec3  q = vec3(m*p.xy,p.z);
    return q;
}

float getHalfSpheres(vec3 p, float s)
{
    float sm = clamp(abs(sin(u_time * .5)), .01, .05);
    float sa = sphere(p + vec3(1, 0, 0), .25);
    float sb = sphere(p + vec3(0, 1, 0), .25);
    float d = smin(sa, sb, sm);
    
    sb = sphere(p + vec3(-1, 0, 0), .25);
    d = smin(d, sa, sm);
    d = smin(d, sb, sm);
    sa = sphere(p + vec3(0, 0, 1), .25);
    sb = sphere(p + vec3(0, 0, -1), .25);
    d = smin(d, sa, sm);
    d = smin(d, sb, sm);
    sa = sphere(p + vec3(0, -1, 0), .25);
    d = smin(d, sa, sm);
    sb = sphere(p, s);
    d = max(d, -sb);

    return d;
}

float getCapsules(vec3 p, float s)
{
    float ca = capsule(p, vec3(0, 0, -1), vec3(0, 0, 1), s);
    float d = ca;
    ca = capsule(p, vec3(0, 1, 0), vec3(0, -1, 0), s);
    d = min(d, ca);
    ca = capsule(p, vec3(1, 0, 0), vec3(-1, 0, 0), s);
    d = min(d, ca);
    return d;
}

float getShape(vec3 p)
{
    //p.yx *= rotate(3.1/2.4);
    // p.xz *= rotate(sin(u_time));
    // p.yz *= rotate(cos(u_time));

    float d = getHalfSpheres(p, .9);
    //p.yz += sin(u_time);

    d = smin(d, getCapsules(p, .15), .9525 * sin(u_time)+1.);

    float plane = abs(p.y) + .05 * sin(-u_time * 5. + length(p.xz) * 10.);
    //return smin(plane, d, .005);
    return d;
}

vec3 opRepLim(vec3 p, float c, vec3 l)
{
    vec3 q = p - c * clamp(ceil(p), -l, l);
    return q;
}

float getDist(vec3 p)
{
    //p = mod(p, 3.) - 2.;
    p.xz *= rotate(sin(u_time));
    p.yz *= rotate(cos(u_time));
    float d = getShape(p);
    p.xz *= rotate(sin(u_time));
    p.yz *= rotate(cos(u_time));
    d = smin(d, getShape(p + vec3(2, 0, 0)), .15);
    p.xz *= rotate(sin(u_time));
    p.yz *= rotate(cos(u_time));
    d = smin(d, getShape(p + vec3(0, 2, 0)), .15);
    p.xz *= rotate(sin(u_time));
    p.yz *= rotate(cos(u_time));
    d = smin(d, getShape(p + vec3(-2, 0, 0)), .15);
    p.xz *= rotate(sin(u_time));
    p.yz *= rotate(cos(u_time));
    d = smin(d, getShape(p + vec3(0, 0, -2)), .15);
    return d;

}

float rayMarch(vec3 ro, vec3 rd)
{
    float dO, dS;
    vec3 p;
    for (int i = 0; i < MAX_STEPS; ++i)
    {
        p = ro + rd * dO;
        dS = getDist(p);
        if (dS < SURF_DIST || dO > MAX_DIST) break;
        dO += dS;
    }
    return dO;
}

vec3 getNormal(vec3 p)
{
    float d = getDist(p);
    vec2 e = vec2(.01, 0.);
    vec3 n = d - vec3(  getDist(p - e.xyy),
                        getDist(p - e.yxy),
                        getDist(p - e.yyx)  );
    return normalize(n);
}

float getLight(vec3 p)
{
    vec3 light = vec3(0, 4, 6);
    vec3 l = normalize(light - p);
    vec3 n = getNormal(p);
    float diff = clamp(dot(n, l), 0., 1.);
    return diff;
}

vec3 renderPixel(vec2 fragCoord)
{
    vec2 uv = (fragCoord - .5 * u_resolution.xy) / u_resolution.y;
    
    vec3 ro = vec3(0, 6, 4);
    vec3 lookat = vec3(0, 1, 0);
    float zoom = 1.;

    vec3 f = normalize(lookat - ro);
    vec3 r = normalize(cross(vec3(0, 1, 0), f));
    vec3 u = cross(f, r);
    vec3 c = ro + f * zoom;
    vec3 i = c + uv.x * r + uv.y * u;
    vec3 rd = i - ro;

    float d = rayMarch(ro, rd);
    vec3 p = ro + rd * d;

    vec3 norm = getNormal(p);
    vec3 light = vec3(sin(u_time), 2, 1);
    vec3 reflection = rd - 2. * dot(rd, norm) * norm;
    float brightness = 1. - smoothstep(10., 20., distance(p, light) * 5.);

    vec3 color = vec3(.8, 1., .8) * max(0., dot(norm, normalize(light - p))) * brightness;
    float specular = pow(max(0.0, dot(reflection, normalize(light - p))), 100.);
    vec3 ambient = vec3(.02, .2, .4);


    color += specular * vec3(1) * brightness + ambient;


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
