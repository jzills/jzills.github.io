
#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

float saturate(float v)
{
	return clamp(v, 0.0, 1.0);
}

vec3 saturate(vec3 v)
{
	return clamp(v, 0.0, 1.0);
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

float hash(vec2 p)
{
    return fract(sin(dot(p, vec2(12.9345, 77.9713))) * 43758.97139);
}

float noise2(in vec2 x)
{
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f*f*(3.0-2.0*f);
	
    float n = p.x + p.y*157.0;
    return mix(mix(hash(n+0.0), hash(n+1.0),f.x), mix(hash(n+157.0), hash(n+158.0),f.x),f.y);
}

float noise3(in vec3 x)
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
	
    float n = p.x + p.y*157.0 + 113.0*p.z;
    return mix(
        mix(mix(hash(n+  0.0), hash(n+  1.0),f.x), mix(hash(n+157.0), hash(n+158.0),f.x),f.y),
        mix(mix(hash(n+113.0), hash(n+114.0),f.x), mix(hash(n+270.0), hash(n+271.0),f.x),f.y),f.z);
}

vec3 getTexture(in vec3 p)
{
	const int it = 4;
	const float scale = 5.0;
	const float intensity = 0.675;
	float offset = 9.0;
	float cycles = 9.0;
	p *= scale;
	
	vec3 z = p;
	vec3 s = vec3(0.0);
	
	for (int i = 0; i < it; ++i) 
	{	
		z += cos(z.yxy+cos(z.xyx+cos(z.xyx*cycles)/float(it))+offset);
        z += sin(s.yxy-cos(z.yxy-sin(z.yyx*cycles)/float(it))+offset);
	
		float d = dot(z-p, z-p); 
		s.x += intensity/((1.0-intensity)+d);
		s.y += d;
		s.z += sin(atan(z.y-p.y, z.x-p.x)*atan(z.z-p.z, z.y-p.y));
	
		cycles *= 0.7;
		offset *= 0.99;
	}
	
	return s / float(it);
}

vec3 applyTexture(vec3 p, vec3 a, vec3 b, vec3 c, vec3 d)
{
	vec3 t = getTexture(p);
	t = getTexture(vec3(p.xz*p.y, dot(p.y, p.z)));
	return mix(mix(mix(a, b, t.x), c, t.y), d, t.z);
	//return mix(d, mix(c, mix(a, b, tex.x), tex.y), tex.z);
}

vec3 applyTextureSmooth(vec3 p, vec3 a, vec3 b, vec3 c, vec3 d)
{
	vec3 q = p;
	vec3 col = vec3(0.0);
	for (int i = -1; i <= 1; ++i)
	for (int j = -1; j <= 1; ++j)
	{
		vec2 off = vec2(float(i), float(j));
		q.xz -= off;
		q.yz -= off;
		col += applyTexture(q+p, a, b, c, d);
		q = p;
	}

	return col /= 9.0;
}

vec2 map(vec3 p)
{
	return vec2(length(p)-1.50, 0.0);
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

void main()
{
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
	vec3 col = vec3(0.0);
	vec3 ro = vec3(0.0, 0.0, -2.0);
	ro.xz *= rotate(u_time*0.5);
	ro.y += sin(u_time*0.35);
	vec3 rd = setCamera(uv, ro, 1.0);
	vec2 t = rayMarch(ro, rd);

	if (t.x < 100.0)
	{
		vec3 pos = ro+t.x*rd;
		vec3 nor = calcNormal(pos);
		nor = normalize(nor/getTexture(nor)*0.5);
		vec3 lig = vec3(0.2, 0.15, -0.2);
		vec3 hal = normalize(-rd+lig);
		vec3 mat = vec3(0.7, 0.75, 0.92);
		float amb = 0.5*nor.y;
		float dif = saturate(dot(nor, lig));
		float spe = pow(saturate(dot(nor, hal)), 30.0);
		vec3 fog = vec3(0.004)*(1.0-length(uv));

		if (t.y <= 0.9)
		{
			col = applyTexture(
				pos, 
				vec3(0.08, 0.02, 0.35), 
				vec3(0.6, 0.9, 0.37), 
				vec3(0.2, 0.15, 0.17), 
				vec3(0.1, 0.01, 0.03)
			);
		}
		
		col += mat*(amb+dif+spe);
		//col = mix(col, fog, 1.0-exp(-0.0005*t.x*t.x*t.x));
	}

    gl_FragColor = vec4(col, 1);
}