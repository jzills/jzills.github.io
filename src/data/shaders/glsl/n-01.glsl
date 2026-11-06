#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate(float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c);
}

float saturate(float v)
{
    return clamp(v, 0.0, 1.0);
}

float sphere(vec3 p, float k)
{
    return length(p)-k;
}

float box(vec3 p, vec3 b)
{
  vec3 q = abs(p)-b;
  return length(max(q, 0.0))+min(max(q.x, max(q.y, q.z)), 0.0);
}

float bbox(vec3 p, vec3 b, float e)
{
       p = abs(p  )-b;
  vec3 q = abs(p+e)-e;
  return min(min(
      length(max(vec3(p.x,q.y,q.z),0.0))+min(max(p.x,max(q.y,q.z)),0.0),
      length(max(vec3(q.x,p.y,q.z),0.0))+min(max(q.x,max(p.y,q.z)),0.0)),
      length(max(vec3(q.x,q.y,p.z),0.0))+min(max(q.x,max(q.y,p.z)),0.0));
}

float smin(float a, float b, float k)
{
    float h = saturate(0.5+0.5*(b-a)/k);
    return mix(b, a, h)-k*h*(1.0-h);
}

vec2 pMod2(inout vec2 p, in float r)
{
    float s = r*0.5;
    vec2 c = floor((p+s)/r);
    p = mod(p+s, r)-s;
    return c;
}

vec3 movement(vec3 p, float k)
{
    float t = u_time*0.5;
    vec3 q = p;
    q.z += t*5.0;//fract(t*5.0);// for stutter effect
    q.x -= q.y*sin(t)*0.5-q.y*0.5;
    q.xz *= rotate(sin(t*0.25));
    vec2 id = pMod2(q.xz, k);
    q.y -= sin(t+id.y)*1.0;
    q.y -= cos(sqrt(t)-id.x)*1.0;
    return vec3(q);
}

vec4 cell(vec3 p, float k, float h)
{
    vec3 q = p;
    float s = 1e9;
    for (int i = 0; i < 2; ++i)
    {
        q = movement(p, k);
        s = smin(sphere(q.xyz, k*0.45), s, 0.9);
        k *= 2.0; // play with this value
    }
    return vec4(max(-s, sphere(p, h)), 0.0, 0.0, dot(q, p));
}

vec3 sabs(vec3 p)
{
    return sqrt(pow(p, vec3(2.0))+0.1);
}

vec4 map(vec3 p)
{
    vec3 q = p;
    q.xz *= rotate(u_time*0.25);
    q.xy *= rotate(u_time*0.5);
    for (int i = 0; i < 10; ++i)
    {
        q = sabs(q)-1.0;
        q.xz *= rotate(3.14+float(i));
        q.yz *= rotate(float(i));
    }
    return cell(q, 5.0, 10.0);
}

vec4 rayMarch(vec3 ro, vec3 rd)
{
    vec3 p;
    vec4 t = vec4(0.0);
    vec4 d = vec4(1e9);
    for (int i = 0; i < 100; ++i)
    {
        if (abs(d.x) < 0.001 || t.x > 100.0) break;
        p = ro+t.x*rd;
        d = map(p);
        t.x += d.x;
        t.yzw = d.yzw;
    }
    return t;
}

vec3 normal(vec3 p)
{
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p+e.xyy).x-map(p-e.xyy).x,
        map(p+e.yxy).x-map(p-e.yxy).x,
        map(p+e.yyx).x-map(p-e.yyx).x
    ));
}

vec3 setCamera(vec2 uv, vec3 ro, float zoom)
{
    vec3 lookAt = vec3(0.0, 0.0, 0.0);
    vec3 f = normalize(lookAt-ro);
    vec3 r = cross(vec3(0.0, 1.0, 0.0), f);
    vec3 u = cross(f, r);
    vec3 cen = ro+f*zoom;
    vec3 i = cen+uv.x*r+uv.y*u;
    vec3 rd = i-ro;
    return rd;
}

vec3 renderPixel(vec2 fragCoord)
{
    vec2 uv = (fragCoord-0.5*u_resolution.xy)/u_resolution.y;
    vec3 col = vec3(0.0);
    vec3 ro = vec3(0.0, 0.0, -75.0);
    vec3 rd = setCamera(uv, ro, 1.0);
    vec3 fog = vec3(0.004)*(1.0-length(uv));
    vec4 t = rayMarch(ro, rd);
    if (t.x < 100.0)
    {
        vec3 pos = ro+t.x*rd;
        vec3 nor = normal(pos);
        vec3 lig = vec3(0.3, 0.75, -0.5);
        vec3 hal = normalize(lig-rd);
        vec3 ref = reflect(rd, nor);
        vec3 mat = vec3(0.5, 0.15, 0.2);
        float amb = 0.5*rd.y;
        float dif = saturate(dot(nor, lig));
        float spe = pow(saturate(dot(nor, hal)), 100.0);  
        col += mat*(amb+dif+spe)+sin(t.w*0.5)*vec3(0.1, 0.3, 0.3);
        col = mix(col, fog, 1.0-exp(-0.0000025*t.x*t.x*t.x));
    }

    col = sqrt(col);

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
