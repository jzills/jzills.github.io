#ifdef GL_ES
precision mediump float;
#endif

#define AA 2
#define PI 3.14

uniform vec2 u_resolution;
uniform float u_time;

mat2 rotate(float a)
{
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

float sdSphere(vec3 pos, float rad)
{
    return length(pos) - rad;
}

vec2 map(vec3 pos)
{
    vec3 q = pos;
    //q.x = mod(q.x + 1.0, 2.0) - 1.0;
    float d = sdSphere(q, 0.5);
    float p = pos.y + 0.5;
    return vec2(min(d, p), d < p ? 0.0 : 1.0);
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
    vec2 eps = vec2(0.001, 0.0);
    return normalize(vec3(  map(pos + eps.xyy).x - map(pos - eps.xyy).x,
                            map(pos + eps.yxy).x - map(pos - eps.yxy).x,
                            map(pos + eps.yyx).x - map(pos - eps.yyx).x
                        ));
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
        sca *= 0.125;
    }

    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

float calcSoftShadow(vec3 ro, vec3 rd, float tmin, float tmax, float w)
{
 	float t = tmin;
    float res = 1.0;

    for(int i = 0; i < 256; ++i)
    {
     	float h = map(ro + t * rd).x;
        res = min(res, h / (w * t));
    	t += clamp(h, 0.5, 0.5);
        if (res < -1.0 || t > tmax) break;
    }

    res = max(res, -1.0);

    return 0.25 * (1.0 + res) * (1.0 + res) * (2.0 - res);
}

vec3 setCamera(vec2 uv, vec3 ro, float zoom)
{
    vec3 lookAt = vec3(0.0, -1.0, 2.0);
    vec3 f = normalize(lookAt - ro);
    vec3 r = cross(vec3(0.0, 1.0, 0.0), f);
    vec3 u = cross(f, r);
    vec3 c = ro + f * zoom;
    vec3 i = c + uv.x * r + uv.y * u;
    vec3 rd = i - ro;
    return rd;
}

float getCheck(vec3 pos, float t)
{
    return smoothstep(-0.1, 0.1, sin(pos.x * 5.0) + sin(pos.z * 3.0)) * (1.0 / t);
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

        vec3 ro = vec3(2.0, 1.0, -5.0);
        vec3 rd = setCamera(uv, ro, 1.0);

        vec2 t = rayMarch(ro, rd);

        if (t.x < 100.0)
        {
            vec3 pos = ro + t.x * rd;
            vec3 nor = calcNormal(pos);
            vec3 lig = vec3(2.0, 2.0, -5.0);
            vec3 lid = normalize(lig - pos);
            float amb = 0.5 * nor.y;
            float dif = clamp(dot(nor, lid), 0.0, 1.0);
            vec3 hal = normalize(vec3(-rd + lid));
            float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 10.0);
            vec3 mat = vec3(0.2, 0.3, 0.1);
            float ao = calcAO(pos, nor);
            float ss = calcSoftShadow(pos, lid, 0.01, 0.75, 0.5);

            if (t.y <= 0.9)
            {
                //Reflection
                {
                    rd = reflect(rd, nor);
                    t = rayMarch(ro, rd);
                    pos = ro + t.x * rd;
                    nor = calcNormal(pos);

                    if (t.x < 10.0)
                    {
                        float f = getCheck(pos, t.x);
                        col += vec3(0.3, 0.5, 0.0) * f * 0.195;
                    }
                }
            }
            else
            {
                float f = getCheck(pos, t.x * 0.15);
                col += vec3(0.3, 0.15, 0.0) * f;
                col += -exp(pos.z * 0.5) * 0.0025;
            }

            col += mat * (amb + dif + spe); 
            col *= ss;
        }

        tot += col;
    }
    
    tot /= float(AA * AA);

    gl_FragColor = vec4(tot, 1.0);
}