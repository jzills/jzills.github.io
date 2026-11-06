#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

#define AA 2
#define PI 3.14159265359

vec3 saturate(vec3 p)
{
    return clamp(p, 0.0, 1.0);
}

float saturate(float v)
{
    return clamp(v, 0.0, 1.0);
}

vec3 ACESFilm(vec3 p)
{
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return saturate((p*(a*p+b))/(p*(c*p+d)+e));
}

mat2 rotate(float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c);
}

float hash(float n) 
{ 
    return fract(sin(n)*43758.5453123); 
}

float noise3(in vec3 x)
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
	
    float n = p.x+p.y*157.0+113.0*p.z;
    return mix(
        mix(mix(hash(n+  0.0), hash(n+  1.0), f.x), mix(hash(n+157.0), hash(n+158.0), f.x), f.y),
        mix(mix(hash(n+113.0), hash(n+114.0), f.x), mix(hash(n+270.0), hash(n+271.0), f.x), f.y), f.z);
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

float smax(float a, float b, float k)
{
    return smin(a, b, -k);
}

vec2 pMod2(inout vec2 p, in float r)
{
    float s = r*0.5;
    vec2 c = floor((p+s)/r);
    p = mod(p+s, r)-s;
    return c;
}

float cross(vec3 p)
{
    float b1 = length(p.xz)-1.0;
    float b2 = length(p.xy)-1.0;
    float b3 = length(p.yz)-1.0;
    return smin(smin(b1, b2, 0.2), b3, 0.2);
}

vec3 sabs(vec3 p)
{
    return sqrt(pow(p, vec3(2.0))+0.1);
}

vec4 map(vec3 p)
{
    //p.xz *= rotate(u_time);
    p.z += u_time;
    vec3 q = p;
    p.z = mod(p.z+1.0, 2.0)-1.0;
    float d = box(p, vec3(5.0));
    float s = 1.0;
    for (int i = 0; i < 3; ++i)
    {
        //p.xz *= rotate(float(i));
        //p.xy *= rotate(PI+sin(q.z*0.59)*float(i));
        vec3 a = mod(p*s, 2.0)-1.0;
        s *= 3.0;
        vec3 r = 1.99*sabs(a);
        float c = cross(r)/s;
        d = smax(d, c, 0.01);
    }

    return vec4(d);
    //return vec4(max(d, length(p)-15.0));
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

float calcAO(vec3 pos, vec3 nor)
{
	float occ = 0.0;
    float sca = 1.0;

    for (int i = 0; i < 5; ++i)
    {
        float h = 0.01 + 0.12 * float(i) / 4.0;
        float d = map(pos + h * nor).x;
        occ += (h - d) * sca;
        sca *= 0.95;
    }

    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

float calcSoftShadow(vec3 ro, vec3 rd)
{
 	float t = 0.2;
    float w = 1.0;
    float res = 1.0;

    for(int i = 0; i < 256; ++i)
    {
     	float h = map(ro+t*rd).x;
        res = min(res, h / (w * t));
    	t += clamp(h, 0.5, 0.5);
        if (res < -1.0 || t > 1.0) break;
    }

    res = max(res, -1.0);

    return 0.25 * (1.0 + res) * (1.0 + res) * (2.0 - res);
}

float tri(in float x)
{
    return abs(fract(x)-0.5);
}

vec3 tri3(in vec3 p)
{
    return vec3( 
        tri(p.z+tri(p.y*1.0)), 
        tri(p.z+tri(p.x*1.0)), 
        tri(p.y+tri(p.x*1.0))
    );
}

float triNoise3d(in vec3 p, in float spd)
{
    float z = 1.4;
	float rz = 0.0;
    vec3 bp = p;
	for (float i = 0.0; i <= 2.0; ++i)
	{
        vec3 dg = tri3(bp*2.0);
        p += (dg+u_time*spd);

        bp *= 1.8;
		z *= 1.5;
		p *= 1.2;

        rz+= (tri(p.z+tri(p.x+tri(p.y))))/z;
        bp += 0.14;
	}

	return rz;
}

float fogmap(in vec3 p, in float d)
{
    p.x += u_time*1.5;
    p.z += sin(p.x*0.5);
    return triNoise3d(p*3.2/(d+100.0), 0.2);
}

vec3 doFog(in vec3 col, in vec3 ro, in vec3 rd, in float mt)
{
    float d = 0.5;
    for (int i = 0; i < 7; ++i)
    {
        vec3  pos = ro + rd*d;
        float rz = fogmap(pos, d);
		float grd =  rz;
        vec3 col2 = vec3(0.0);
        col = mix(col, vec3(1.0), saturate(rz*smoothstep(d-0.4,d+2.+d*.75,mt)));
        d *= 5.0;
        if (d > mt) break;
    }
    return col;
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

void main()
{
    vec3 tot = vec3(0.0);

    for (int m = 0; m < AA; ++m)
    for (int n = 0; n < AA; ++n)
    {
        vec2 off = vec2(float(m), float(n))/float(AA);
        vec2 uv = ((gl_FragCoord.xy+off)-0.5*u_resolution.xy)/u_resolution.y;
        vec3 col = vec3(0.0);
        vec3 ro = vec3(0.0, 0.0, -2.0);
        vec3 rd = setCamera(uv, ro, 1.0);
        vec3 fog = vec3(0.0004)*(1.0-length(uv));
        vec4 t = rayMarch(ro, rd);
        if (t.x < 100.0)
        {
            vec3 pos = ro+t.x*rd;
            vec3 nor = normal(pos);
            vec3 lig = vec3(0.5, 0.5, -0.7);
            vec3 hal = normalize(lig-rd);
            vec3 ref = reflect(rd, nor);
            vec3 mat = vec3(0.5, 0.45, 0.2);
            float amb = 0.5*rd.y;
            float dif = saturate(dot(nor, lig));
            float spe = pow(saturate(dot(nor, hal)), 50.0);  
            col += (amb+dif+spe);
            col = 1.0*mix(col, fog, 1.0-exp(-0.0525*t.x*t.x*t.x));
        }
    
        tot += col;
    }

    tot /= float(AA*AA);
    tot = sqrt(tot);

    gl_FragColor = vec4(tot, 1.0);
}

