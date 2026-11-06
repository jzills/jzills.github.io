#ifdef GL_ES
precision mediump float;
#endif

#define MAP_NOISE 1

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate2D(float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c);
}

mat3 rotate3D(float a, float b, float c)
{
    float as = sin(a);
    float ac = cos(a);
    float bs = sin(b);
    float bc = cos(b);
    float cs = sin(c);
    float cc = cos(c);
    return mat3(ac*bc, ac*bs*cs-as*cc, ac*bs*cc+as*cs, 
                as*bc, as*bs*cs+ac*cc, as*bs*cc-ac*cs, 
                -bs, bc*cs, bc*cc);
}

vec2 hash2(vec2 p)
{
    return fract(sin(vec2(
        dot(p, vec2(127.1, 311.7)),
        dot(p, vec2(269.5, 183.3))))*43758.5453)*2.0-1.0;
}

vec3 hash3(vec3 p)
{
    return fract(sin(vec3(
        dot(p, vec3(127.1, 311.7, 192.193)),
        dot(p, vec3(269.5, 183.3, 213.129)),
        dot(p, vec3(269.5, 183.3, 213.129))))*43758.5453)*2.0-1.0;
}

float perlinNoise2D(vec2 p)
{
    vec2 f = floor(p);
    vec2 tl = vec2(f.x, f.y+1.0);
    vec2 tr = vec2(f.x+1.0, f.y+1.0);
    vec2 bl = vec2(f.x, f.y);
    vec2 br = vec2(f.x+1.0, f.y);
    vec2 q = fract(p);
    q *= q*(3.0-2.0*q);

    return  mix(mix(
                    dot(hash2(bl), p-bl),
                    dot(hash2(br), p-br), q.x), 
                mix(
                    dot(hash2(tl), p-tl),
                    dot(hash2(tr), p-tr), q.x), q.y)*0.5+0.5;
}

float perlinNoise3D(vec3 p)
{
    vec3 f = floor(p);
    vec3 ftl = vec3(f.x, f.y+1.0, f.z);
    vec3 ftr = vec3(f.x+1.0, f.y+1.0, f.z);
    vec3 fbl = vec3(f.x, f.y, f.z);
    vec3 fbr = vec3(f.x+1.0, f.y, f.z);
    vec3 btl = vec3(f.x, f.y+1.0, f.z+1.0);
    vec3 btr = vec3(f.x+1.0, f.y+1.0, f.z+1.0);
    vec3 bbl = vec3(f.x, f.y, f.z+1.0);
    vec3 bbr = vec3(f.x+1.0, f.y, f.z+1.0);
    vec3 q = fract(p);
    q *= q*(3.0-2.0*q); 

    return mix( mix(mix(
                    dot(hash3(fbl), p-fbl),
                    dot(hash3(fbr), p-fbr), q.x), 
                mix(
                    dot(hash3(ftl), p-ftl),
                    dot(hash3(ftr), p-ftr), q.x), q.y),
                mix(mix(
                    dot(hash3(bbl), p-bbl),
                    dot(hash3(bbr), p-bbr), q.x), 
                mix(
                    dot(hash3(btl), p-btl),
                    dot(hash3(btr), p-btr), q.x), q.y), q.z)*0.5+0.5;               
}

float perlinFBM2D(vec2 p)
{
    float amplitude = 0.5, offset = 0.5;
    float t = 0.0, k = 20.0;
    for (int i = 0; i < 6; ++i)
    {
        t += amplitude*perlinNoise2D(p*k+offset);
        p *= 2.0*rotate2D(float(i));
        k *= 0.99;
        amplitude *= 0.5;
        offset *= 0.67;
    }
    return t;
}

float perlinFBM3D(vec3 p)
{
    float amplitude = 0.35, offset = 0.5;
    float t = 0.0, k = 3.0;
    for (int i = 0; i < 2; ++i)
    {
        t += amplitude*perlinNoise3D(p*k+offset);
        p *= 2.0*rotate3D(0.0, 0.0, 0.0);
        k *= 0.99;
        amplitude *= 0.5;
        offset *= 0.67;
    }
    return t;
}

float sphere(vec3 p, float r)
{
    return length(p)-r;
}

float box(vec3 p, vec3 b)
{
  vec3 q = abs(p)-b;
  return length(max(q, 0.0))+min(max(q.x, max(q.y, q.z)), 0.0);
}

vec2 map(vec3 p)
{
    vec3 q = p;
    p.xz *= rotate2D(u_time);
    p.yz *= rotate2D(u_time);
    float s = sphere(p, 1.5);
    float t = 0.5*u_time;

    q.xz *= rotate2D(0.65);
    q.z -= 10.0;
    float w = box(q, vec3(4.0, 3.0, 1.0));

    #if MAP_NOISE == 0
        s -= perlinNoise3D(sin(p*0.5+t)*5.0)*0.5;;
    #elif MAP_NOISE == 1
        s -= perlinFBM3D(sin(p*0.25+t+0.5*dot(p.z,p.x))*1.67)*0.5;;
    #endif

    return vec2(min(s, w), s < w ? 0.0 : 1.0);
}

vec2 rayMarch(vec3 ro, vec3 rd)
{
    vec3 p;
    vec2 t = vec2(0.0), d = vec2(0.0);
    for (int i = 0; i < 100; ++i)
    {
        p = ro+t.x*rd;
        d = map(p);
        t.x += d.x;
        t.y = d.y;
        if (abs(d.x) < 0.001 || t.x > 100.0) break;
    }
    return t;
}

vec3 getNormal(vec3 p)
{
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p+e.xyy).x-map(p-e.xyy).x,
        map(p+e.yxy).x-map(p-e.yxy).x,
        map(p+e.yyx).x-map(p-e.yyx).x
    ));
}

float saturate(float v)
{
    return clamp(v, 0.0, 1.0);
}

vec3 renderPixel(vec2 fragCoord)
{
    vec2 uv = (fragCoord-0.5*u_resolution.xy)/u_resolution.y;
    vec3 col = vec3(0.0);
    vec3 ro = vec3(0.0, 0.0, -5.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    vec2 t = rayMarch(ro, rd);
    if (t.x < 100.0)
    {
        vec3 p = ro+t.x*rd;
        vec3 n = getNormal(p);
        vec3 l = vec3(0.1, 0.2, -0.8);
        vec3 h = normalize(l-rd);
        float amb = 0.5*rd.y;
        float dif = saturate(dot(n, l));
        float spe = pow(saturate(dot(n, h)), 50.0);
        col += amb+dif+spe;

        if (t.y <= 0.9)
        {
            //col += smoothstep(-0.2, 0.2, sin(n.x*2.0)+sin(n.z*1.0))*vec3(0.15, 0.2, 0.6);
        } 
        else if (t.y <= 1.9)
        {
            col += vec3(0.5, 0.2, 0.05);
            rd = reflect(rd, n);
            ro = p+n*0.01;
            t = rayMarch(ro, rd);
            if (t.x < 100.0)
            {
                p = ro+t.x*rd;
                n = getNormal(p);
                dif = saturate(dot(n, l));
                h = normalize(l-rd);
                amb = 0.5*rd.y;
                dif = saturate(dot(n, l));
                spe = pow(saturate(dot(n, h)), 50.0);
                col *= amb+dif+spe;
            }
        }
    }

    return col;
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
