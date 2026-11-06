#ifdef GL_ES
precision mediump float;
#endif

#define FAR 80.
#define AA 2

#define WATER_ID 0
#define TERRAIN_ID 1
#define ARC_ID 2
#define LIGHT_RAIL_ID 3

uniform float u_time;
uniform vec2 u_resolution;

float noiseLow;
float noiseHigh;
float glow;

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

float terrainNoiseLow2D(vec2 p)
{
    p /= 12.;
    float amp = 1.;
    float sum = 0.;
    float res = 0.;
    for (int i = 0; i < 2; ++i)
    {
        float n = noise2D(p);
        res += amp*n;
        p = mat2(1., -.75, .75, 1.)*p*3.1;
        sum += amp;
        amp *= .33;
    }
    return res/sum;
}

float terrainNoiseHigh2D(vec2 p)
{
    p /= 8.;
    float amp = 1.;
    float sum = 0.;
    float res = 0.;
    for (int i = 0; i < 5; ++i)
    {
        float n = noise2D(p);
        res += amp*n;
        p = mat2(1., -.75, .75, 1.)*p*3.1;
        sum += amp;
        amp *= .2;
    }
    return res/sum;
}

vec2 getPath(in float z)
{ 
    return vec2(0.);
    return vec2(sin(z*.075)*2., cos(z*.1)*.75); // Windy path.
}

vec2 getTerrain(vec3 p, float n)
{
    float s = sin(p.y*0.35+n)*1.5;
    float d = mix(smax(-abs(p.x-sin(p.z*.91+n))+25., p.y+n*10., .9), p.y-6., 0.3)+n*5.;
    d -= s;
    return vec2(d, TERRAIN_ID);
}

vec2 getWater(vec3 p, float n)
{
    vec3 tp = p;
    float t = sin(tp.y+u_time)*0.01;
    float fl = tp.y+25.+t+n*2.*sin(n*n+u_time-cos(tp.x*.1+tp.z*.2));
    return vec2(fl, WATER_ID);
}

vec2 getArches(vec3 op, vec3 p, float n)
{
    float opa = 11.*sin(p.z*.1);
    float opb = 17.+dot(p-op, p-op)*.2;
    op.y += opa*sin(op.x*.09+n*2.);
    op.z += opb*sin(op.x*.0105);
    op.z = mod(op.z+15., 30.)-15.;
    float arc = length(op.yz+n*5.)-1.;//-sin(p.y*.1);
    return vec2(arc, ARC_ID);
}

vec2 getScene(vec3 p)
{
    vec2 result;
    vec3 op = p;
    noiseLow = terrainNoiseLow2D(p.xz);
    noiseHigh = terrainNoiseHigh2D(p.xz);
    p.xy -= getPath(p.z);
    p.x -= sin(p.z*0.1)*15.;

    vec2 terrain = getTerrain(p, noiseHigh);
    vec2 water = getWater(p, noiseLow);
    result.x = smin(terrain.x, water.x, .9);
    result.y = result.x < water.x ? terrain.y : water.y;    
    
    vec2 arches = getArches(op, p, noiseHigh);
    result.y = result.x < arches.x ? result.y : arches.y;
    result.x = smin(result.x, arches.x*.5, .9);

    return vec2(result.x*.7, result.y);
}

float getDensity(vec3 p)
{
    return noiseLow;
}

vec2 getRay(vec3 ro, vec3 rd)
{
    vec2 t = vec2(0.001, 0.);
    for (int i = 0; i < 100; ++i)
    {
        vec3 pos = ro+t.x*rd;
        vec2 dist = getScene(pos);
        if (abs(dist.x) < .001*(t.x*.125 + 1.) || t.x > FAR)
        {
            break;
        }
        t.x += dist.x;
        t.y = dist.y;
    }
    return t;
}

vec2 getReflectionRay(vec3 ro, vec3 rd)
{
    vec2 t = vec2(0.001, 0.);
    for (int i = 0; i < 50; ++i)
    {
        vec3 pos = ro+t.x*rd;
        vec2 dist = getScene(pos);
        if (abs(dist.x) < .001*(t.x*.125 + 1.) || t.x > FAR)
        {
            break;
        }
        t.x += dist.x;
        t.y = dist.y;
    }
    return t;
}

vec3 getVolumetricRay(in vec3 ro, in vec3 rd)
{
	vec4 sum = vec4(0.0);
	float t = 0.0;

	for (int i = 0; i < 50; ++i)
	{
        vec3 pos = ro+t*rd;
        float den = getDensity(pos);

        if (den > 0.1)
        {
            vec3 clc = mix(vec3(0.6078, 0.8549, 0.8863), vec3(0.7, .8, .9), den);
            vec4 col = vec4(clc, den);
            col.a *= 0.2;
            col.rgb *= col.a;
            sum += col*(1.0-sum.a);
        }

		if (sum.a > 0.99) break;
        t += 0.35;
	}

	return clamp(sum.xyz, 0.0, 1.0);
}

float calcAO(in vec3 p, in vec3 nor){

	float sca = 1.5, occ = 0.;
    
    for (float i=0.; i<5.; i++)
    {
        float hr = .01 + i*.5/4.;        
        float dd = getScene(nor*hr + p).x;
        occ += (hr - dd)*sca;
        sca *= .7;
    }
    
    return clamp(1. - occ, 0., 1.);    
}

float calcShadow(vec3 ro, vec3 rd) 
{
    float t = 0.2;
    float w = 0.5;
    float res = 1.0;

    for (int i = 0; i < 256; ++i) 
    {
        float h = getScene(ro+t*rd).x;
        res = min(res, h/(w*t));
        t += clamp(h, 0.5, t);
        if (res < -1.0 || t > 1.0) break;
    }

    res = max(res, -1.0);
    return 0.25*(1.0+res)*(1.0+res)*(2.0-res);
}

vec3 getNormal(vec3 p)
{
    vec2 eps = vec2(.002, -.002);
    return normalize(
        eps.xyy*getScene(p+eps.xyy).x +
        eps.yyx*getScene(p+eps.yyx).x +
        eps.yxy*getScene(p+eps.yxy).x + 
        eps.xxx*getScene(p+eps.xxx).x
    );
}

vec3 getSunColor(vec3 ro, vec3 rd, vec3 lp)
{
    float sun = max(dot(rd, normalize(lp-ro)), 0.);
    float hor = pow(1.-max(rd.y, 0.), 3.)*.3;
    vec3 sunCol = mix(vec3(0.125, 0.1, 0.2), vec3(0.3, 0.15, 0.25), sun*3.);
    sunCol += 0.9*vec3(.9, .98, .7)*pow(sun, 5.);
    sunCol += 0.7*vec3(.8, .78, .6)*pow(sun, 15.);
    sunCol += 0.3*vec3(.5, .58, .3)*pow(sun, 55.);
    return sunCol;
}

void main()
{
    vec3 tot = vec3(0.);

    for (int m = 0; m < AA; ++m)
    for (int n = 0; n < AA; ++n)
    {
        vec2 off = vec2(float(m), float(n))/float(AA);
        vec2 uv = ((gl_FragCoord.xy+off)-.5*u_resolution.xy)/u_resolution.y;
        vec3 col = vec3(0.);
        vec3 ro = vec3(0, 10, u_time*10.);
        vec3 lk = ro+vec3(0, -.4, .25);  
        vec3 lp = ro+vec3(9, FAR*.26, FAR*.52)*3.;
        
        ro.xy += getPath(ro.z);
        lk.xy += getPath(lk.z);
        lp.xy += getPath(lp.z);
        glow = 0.;   

        float FOV = 3.14159/.9;
        vec3 forward = normalize(lk-ro);
        vec3 right = normalize(vec3(forward.z, 0., -forward.x)); 
        vec3 up = cross(forward, right);
        vec3 rd = normalize(forward + FOV*uv.x*right + FOV*uv.y*up);
        vec2 t = getRay(ro, rd);

        if (t.x < FAR)
        {
            vec3 pos = ro+t.x*rd;
            vec3 nor = getNormal(pos);
            //nor += noiseLow*0.0075;
            vec3 ld = normalize(lp-pos);
            float amb = clamp(.5+.5*rd.y, 0., 1.);
            float dif = clamp(dot(nor, ld), 0., 1.);
            float spe = pow(max(dot(reflect(-ld, nor), -rd), 0.0), 64.);
            float ao = calcAO(pos, nor);
            float sha = calcShadow(pos+ld, ld);
            vec3 objColor = vec3(0.275, 0.0729, 0.0235);
            vec3 tr = smoothstep(vec3(1.), vec3(0.0667, 0.0745, 0.4784), vec3(smoothstep(.5, 1., nor.y)));
            
            objColor = mix(objColor, objColor*tr, nor);
            col += objColor*(amb+4.*dif+9.*spe+ao*.25)*sha;
            col = mix(col, vec3(0.1, 0.3, 0.9)*.05*length(nor.y+getPath(pos.y+u_time*5.)), .9);

            int materialId = int(t.y);
            if (materialId == WATER_ID)
            {
                vec3 rro = pos+nor*.001;
                vec3 rrd = reflect(rd, nor);
                vec2 rt = getReflectionRay(rro, rrd);
                if (rt.x < FAR)
                {
                    vec3 rpos = rro+rt.x*rrd;
                    vec3 rnor = getNormal(rpos);
                    float dif = clamp(dot(rnor, ld), 0., 1.);
                    float amb = rrd.y*.5;
                    float spe = pow(max(dot(reflect(-ld, rnor), -rrd), 0.0), 64.0);
                    col *= pow(rt.x, -.8)*mix(col, col+(dif+amb+spe), 1.-smoothstep(.2, .9, rnor.y));
                }
            } 
            else if (materialId == TERRAIN_ID)
            { 
            }
            else if (materialId == ARC_ID)
            {
            }
            else if (materialId == LIGHT_RAIL_ID)
            {
                vec3 rro = pos+nor*.001;
                vec3 rrd = reflect(rd, nor);
                vec2 rt = getReflectionRay(rro, rrd);
                if (rt.x < FAR)
                {
                    vec3 rpos = rro+rt.x*rrd;
                    vec3 rnor = getNormal(rpos);
                    float dif = clamp(dot(rnor, ld), 0., 1.);
                    float amb = rrd.y*.5;
                    float spe = pow(max(dot(reflect(-ld, rnor), -rrd), 0.0), 64.0);
                    col *= pow(rt.x, -.8)*mix(col, col+(dif+amb+spe), 1.-smoothstep(.2, .9, rnor.y));
                }
            }
        }

        vec3 sunColor = getSunColor(ro, rd, lp)*1.2;
        col = mix(col, sunColor, smoothstep(.3, 1., t.x/FAR));
        
        //vec3 volumeColor = getVolumetricRay(ro, rd);
        //col = mix(col, volumeColor, smoothstep(.5, 1., t.x/FAR));

        //tot += vec3(.1, .2, .3)*col;
        tot += col;
    }
    
    tot /= float(AA*AA);

    gl_FragColor = vec4(sqrt(tot), 1.);
}