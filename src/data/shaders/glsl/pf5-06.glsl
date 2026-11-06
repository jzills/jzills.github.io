#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926535897932
#define R 1.0
#define AA 2
#define C 35.0

uniform float u_time;
uniform vec2 u_resolution;
float glo = 0.0;

//#define u_time 0.0

float rand(vec2 n) 
{
    return fract(sin(dot(n, vec2(12.9898,12.1414))) * 83758.5453);
}

float noise(vec2 n) 
{
    const vec2 d = vec2(0.0, 1.0);
    vec2 b = floor(n);
    vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
    return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
}

mat2 rotate(float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c);
}

float smin(float a, float b, float k)
{
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float sdSphere(vec3 p, float r)
{
    return length(p) - r;
}

float sdTorus(vec3 p, vec2 t)
{
  vec2 q = vec2(length(p.xy) - t.x, p.z);
  return length(q) - t.y;
}

float sdBox(vec3 pos, vec3 b)
{
  vec3 q = abs(pos) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdCapsule(vec3 p, float h, float r)
{
  p.y -= clamp(p.y, 0.0, h);
  return length(p) - r;
}

vec2 leaf(vec3 p)
{
    float t = sin(u_time) * 0.5 + 0.5;
    vec3 q = p;
    vec2 b1 = vec2(sdBox(q, vec3(1.0, 5.0 + t, 5.0)), 1.0);
    vec2 b2 = vec2(sdBox(q, vec3(5.0 + t, 1.0, 1.0)), 2.0);
    vec2 b3 = vec2(sdBox(q, vec3(5.0, 0.25, 5.0 + t)), 3.0);
    float d = smin(b1.x, b2.x, 0.1);
    float i = b1.x < b2.x ? b1.y : b2.y;
    i = b3.x < d ? b3.y : i;
    d = smin(d, b3.x, 0.1);
    return vec2(d, i);
}

float elec(vec3 p)
{
    vec3 q = abs(p) - vec3(5.0);
    float b = sdBox(q, vec3(5.0)) - 0.1;
    return b;
}

float tor(vec3 p, float a, float b)
{
    vec2 c = vec2(length(p.xz) - a, p.y);
    float d = length(c) - b;
    return d;
}

float space(vec3 p)
{
    return tor(p, 20.0 * sin(u_time * 0.75) + 5.0, 15.0);
}

vec2 map(vec3 p)
{
    vec3 u = p;
    p.x += u_time * 15.0;
    p.z += sin(p.x * 0.1215 ) * 5.0;
    p.yz *= rotate(u_time * 0.25);
    p.x = mod(p.x + C * 0.5, C) - C * 0.5;
    
    vec3 q = abs(p);
    float t = sin(u_time * 0.5) * 0.5;
    float si = sin(p.z * 0.5 + u_time - cos(q.y * 0.05)) * 0.5 + 0.5;
    float sh = elec(q);

    for (int i = 0; i < 3; ++i)
    {
        q = abs(p) - vec3(10.0 * t + si * t + 5.0, 5.0, 1.0 + float(i * i));
        q.xz *= rotate(t / PI * float(i));
        q.xy *= rotate(float(i * i) + sh * 0.005 + t);
        q.yz *= rotate(float(i * i));    
        p = q;
    }

    vec2 lf = leaf(q);
    float sp = min(space(u), space(q));
    float pl = u.y + 25.0;
    float d = smin(lf.x, pl, 0.1);

    //float pip = length(abs(u.xy) + vec2(-35.0)) - 1.0;
    //d = smin(d, pip, 0.1);
    glo += 0.1 / (0.1 + sp * sp * si);
    
    return vec2(d * R, sh < lf.x ? 0.0 : lf.y);
}

vec2 rayMarch(vec3 ro, vec3 rd)
{
    vec2 t = vec2(0.0);

    for (int i = 0; i < 100; ++i)
    {
        vec3 pos = ro + t.x * rd;
        vec2 d = map(pos);
        t.x += d.x;
        t.y = d.y;

        if (abs(d.x) < 0.001 || t.x > 100.0) break;
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
     	float h = map(ro + t * rd).x;
        res = min(res, h / (w * t));
    	t += clamp(h, 0.5, 0.5);
        if (res < -1.0 || t > 1.0) break;
    }

    res = max(res, -1.0);

    return 0.25 * (1.0 + res) * (1.0 + res) * (2.0 - res);
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(  map(pos + e.xyy).x - map(pos - e.xyy).x,
                            map(pos + e.yxy).x - map(pos - e.yxy).x,
                            map(pos + e.yyx).x - map(pos - e.yyx).x
                            ));
}

vec3 setCamera(vec2 uv, vec3 ro, float zoom)
{
    vec3 lookAt = vec3(0.0, 0.0, 0.0);
    vec3 f = normalize(lookAt - ro);
    vec3 r = cross(vec3(0.0, 1.0, 0.0), f);
    vec3 u = cross(f, r);
    vec3 cen = ro + f * zoom;
    vec3 i = cen + uv.x * r + uv.y * u;
    vec3 rd = i - ro;
    return rd;
}

vec3 bg(vec3 rd)
{
    float k = rd.y * 0.5;
    return mix(vec3(0., 0.0, 0.0), vec3(0.4, 0.02, 0.5), k);
}

float bump(vec3 p)
{
    
    vec3 q = p;
    for (int i = 0; i < 1; ++i)
    {
        q = abs(p) - float(i*i)*sin(p.y)*3.9;
        q.xy *= rotate(float(i)*sin(p.x*0.95));
        q.yz *= rotate(float(i)*cos(p.y*3.5));
        p = q;
    }
    return length(map(q));
    //return length(sin(p.z*0.9)+cos(p.xzy*0.1))*0.025;
}

void main()
{
    vec3 tot = vec3(0.0);

    for (int m = 0; m < AA; ++m)
    for (int n = 0; n < AA; ++n)
    {
        vec2 off = vec2(float(m), float(n)) / float(AA);
        vec2 uv = ((gl_FragCoord.xy + off) - 0.5 * u_resolution.xy) / u_resolution.y;
        vec3 col = vec3(0.0);
        vec3 ro = vec3(-30.0, 0.0, -80.0);
        vec3 rd = setCamera(uv, ro, 1.0);
        vec2 t = rayMarch(ro, rd);
        //col = bg(rd);
        glo = 0.0;

        if (t.x < 100.0)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = calcNormal(pos);

            vec2 eps = vec2(0.01, 0.0);
    
            float f = bump(pos); // Sample value multiplied by the amplitude.
            float fx = bump(pos-eps.xyy); // Samefor the nearby sample in the X-direction.
            float fy = bump(pos-eps.yxy); // Same for the nearby sample in the Y-direction.
            float fz = bump(pos-eps.yyx);

            // Controls how much the bump is accentuated.
            const float bumpFactor = 0.5;
            
            // Using the above to determine the dx and dy function gradients.
            fx = (fx-f)/eps.x; // Change in X
            fy = (fy-f)/eps.x; // Change in Y.
            fz = (fz-f)/eps.x;
            nor = normalize(nor+vec3(fx, fy, fz) * bumpFactor);  

            vec3 ref = reflect(rd, nor);
            vec3 lid = normalize(vec3(30.0, 60.0, -50.0) - pos);
            vec3 hal = normalize(-rd + lid);
            vec3 mat = vec3(0.27, 0.15, 0.215);
            float amb = 0.5 * nor.y;
            float dif = clamp(dot(nor, lid), 0.0, 1.0);
            float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 50.0);
            float ao = calcAO(pos, nor);
            vec3 fog = vec3(0.004) * (1.0 - (length(uv) - 0.2));
                
            if (t.y <= 0.9) {}
            else if (t.y <= 1.9)
            {
                col += vec3(0.3, 0.1, 0.2);
            }
            else if (t.y <= 2.9)
            {
                col += vec3(0.1, 0.7, 0.9);
            }

            col += mat * (amb + dif + spe);
            col += 0.5 * mix(col, bg(ref), nor);
            col = mix(col, fog, 1.0 - exp(-0.000005 * t.x * t.x * t.x));
            col = mix(col, 0.05 * glo * glo * vec3(0.2, 0.4, 0.9), lid);
        }
        
        tot += col;
    }

    tot /= float(AA * AA);
    tot = sqrt(tot);

    gl_FragColor = vec4(tot, 1.0);
}