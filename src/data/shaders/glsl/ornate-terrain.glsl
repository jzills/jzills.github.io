#ifdef GL_ES
precision mediump float;
#endif

#define FAR 80.

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate(float an)
{
    float s = sin(an);
    float c = cos(an);
    return mat2(c, -s, s, c);
}

float smax(float a, float b, float s)
{
    float h = clamp(.5+.5*(a-b)/s, 0., 1.);
    return mix(b, a, h)+h*(1.-h)*s;
}

float smin(float a, float b, float k)
{
    float h = clamp(.5+.5*(b-a)/k, .0, 1.);
    return mix(b, a, h)-k*h*(1.-h);
}

float noise2D(vec2 p) 
{
	vec2 i = floor(p); p -= i; p *= p*(3. - p*2.); //p *= p*p*(p*(p*6. - 15.) + 10.);    
    
	return dot(mat2(fract(sin(vec4(0, 41, 289, 330) + dot(i, vec2(41, 289)))*43758.5453))*
        vec2(1. - p.y, p.y), vec2(1. - p.x, p.x));
}

float terrainNoise2D(vec2 p)
{
    p /= 12.;
    float amp = 1.;
    float sum = 0.;
    float res = 0.;
    for (int i = 0; i < 4; ++i)
    {
        float n = noise2D(p);
        res += amp*n;
        p = mat2(1., -.75, .75, 1.)*p*3.1;
        sum += amp;
        amp *= .25;
    }
    return res/sum;
}

float sdTorus(vec3 p, vec2 t)
{
    vec2 q = vec2(length(p.xz)-t.x, p.y);
    return length(q)-t.y;
}

float getPath(vec3 p)
{
    return sin(p.z)*.7-sin(p.x*.6)*1.9;
}

vec4 getScene(vec3 p)
{
    float noi = terrainNoise2D(p.xz);
    p.y += 9.*sin(p.z*.05+noi*p.x*.07);

    float rf = .25*cos(p.y*5.);
    p.z -= rf;
    float d = p.y+15.1*noi+sin(p.z*.01)*25.;
    return vec4(d*.5, noi, rf, 0.);
}

vec4 rayMarch(vec3 ro, vec3 rd)
{
    vec4 t = vec4(.001);
    for (int i = 0; i < 100; ++i)
    {
        vec3 pos = ro+t.x*rd;
        vec4 d = getScene(pos);
        if (abs(d.x) < .001 || t.x > FAR)
        {
            break;
        }
        t.x += d.x;
        t.yzw = d.yzw;
    }
    return t;
}

vec3 getNormal(vec3 p)
{
    vec2 e = vec2(.001, .0);
    return normalize(vec3(
        getScene(p+e.xyy).x-getScene(p-e.xyy).x,
        getScene(p+e.yxy).x-getScene(p-e.yxy).x,
        getScene(p+e.yyx).x-getScene(p-e.yyx).x
    ));
}

void main()
{
    vec2 uv = (gl_FragCoord.xy-.5*u_resolution.xy);
    uv /= min(u_resolution.x, u_resolution.y);

    vec3 col = vec3(0.);
    vec3 ro = vec3(0., 30., 10.*u_time);
    vec3 lp = ro+vec3(.3, .3*FAR, .52*FAR)*3.;
    vec3 lk = ro+vec3(0., -.3, .3);

    vec3 fo = normalize(lk-ro);
    vec3 ri = normalize(vec3(fo.z, 0., -fo.x));
    vec3 up = normalize(cross(fo, ri));
    vec3 rd = normalize(fo+uv.x*ri+uv.y*up);

    vec4 t = rayMarch(ro, rd);
    if (t.x < FAR)
    {
        vec3 pos = ro+t.x*rd;
        vec3 nor = getNormal(pos);
        vec3 lid = normalize(lp-pos);
        vec3 hal = normalize(lid-rd);
        float amb = clamp(.5+.5*rd.y, 0., 1.);
        float dif = clamp(dot(nor, lid), 0., 1.);
        float spe = pow(clamp(dot(nor, hal), 0., 1.), 64.0);
        col += (amb+dif+spe)*vec3(.1, .2, .3);

        col = mix(col, col*vec3(.1, .3, .2), smoothstep(.6, 1., nor.y));
        col = mix(col, col*vec3(.3, .3, .2), smoothstep(.5, .6, nor.y));
        col = mix(col, col*vec3(.3, .3, .1), smoothstep(.1, .1*(1.-nor.y), 4.*t.z*t.z));
    }

    col = mix(col, vec3(.2, .2, .3+.3*uv.y), smoothstep(.74, 1., t.x/FAR));

    gl_FragColor = vec4(sqrt(col), 1.);
}