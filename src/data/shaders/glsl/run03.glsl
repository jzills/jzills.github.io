#ifdef GL_ES
precision mediump float;
#endif

#define AA 2
#define TWO_PI 6.28318530718

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate(float an)
{
    float c = cos(an);
    float s = sin(an);
    return mat2(c, s, -s, c);
}

float sdSphere(vec3 pos, float rad)
{
    return length(pos) - rad;
}

float sdBox(vec3 pos, vec3 b)
{
  vec3 q = abs(pos) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

vec3 rep(vec3 pos, float c, vec3 l)
{
    return pos - c * clamp(0.5 + floor(pos / c), -l, l);
}

float smin(float a, float b, float k)
{
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * (1.0 / 4.0);
}

float sdRing(vec3 pos, float div, float b, float s)
{
    vec3 q = pos;
    
    float an = TWO_PI / div;
    float sec = floor(0.5 + atan(q.z, q.y) / an);
    q.zy = rotate(an * sec) * q.zy;

    float d = sdBox(q - vec3(0.0, 5.0, 0.0), vec3(b)) - 0.06;
    d = smin(d, sdSphere(abs(q) - vec3(2.0, 5.0, 0.0), s), 0.2);

    return d;
}

float sdStruct(vec3 pos)
{
    float d = 0.0;
    float t = 0.5 + 0.5 * sin(u_time) / (0.5 + 0.5 * pow(pos.x, 0.1));

    vec3 q = abs(rep(pos, 0.25, vec3(4.95)));
    float ba = sdBox(q, vec3(0.25));
    float bb = sdBox(q - vec3(0.9 * t, 0.5, 0.0), vec3(0.2 * t));
    float bc = sdBox(q - vec3(0.1 * t, 1.5 * t, 0.0), vec3(0.0525));
    
    d = min(ba, bb);
    d = min(d, bc);

    return d;
}

float sdFullStruct(vec3 pos)
{
   
    float d = 0.0;

    vec3 q = pos;

    float an = TWO_PI / (12.0 + sin(u_time * 0.5));
    float sec = floor(0.5 + atan(q.z, q.y) / an);

    q.zy = rotate(sec * an) * q.zy;
    float s = sdStruct(q - vec3(0.0, 0.5, 0.0)) - 0.0515;

    return s;
}

float map(vec3 pos)
{
    pos.yz *= rotate(u_time * 0.25);
    pos.xz *= rotate(u_time * 0.125);
    
    float d = 0.0;

    vec3 q = pos;

    float an = TWO_PI / (9.0 + sin(u_time * 0.5));
    float sec = floor(0.5 + atan(q.x, q.y) / an);

    q.xy = rotate(sec * an) * q.xy;
    float s = sdFullStruct(q - vec3(0.0, 1.5, 0.0)) - 0.0515;

    return s;
}

float castRay(vec3 ro, vec3 rd)
{
    float t = 0.0;
    
    for (int i = 0; i < 100; ++i)
    {
        vec3 pos = ro + t * rd;
        float d = map(pos);
        t += d;

        if (abs(d) < 0.0001 || t > 30.0) break;
    }

    return t;
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.0001, 0.0);
    return normalize(vec3(  map(pos + e.xyy) - map(pos - e.xyy),
                            map(pos + e.yxy) - map(pos - e.yxy),
                            map(pos + e.yyx) - map(pos - e.yyx)
                            ));
}

float calcAO(vec3 pos, vec3 nor)
{
	float occ = 0.0;
    float sca = 1.0;

    for (int i = 0; i < 8; ++i)
    {
        float h = 0.01 + 0.12 * float(i) / 4.0;
        float d = map(pos + h * nor);
        occ += (h - d) * sca;
        sca *= 0.95;
    }

    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
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
        vec3 ro = vec3(0.0, 0.0, -10.0);   
        vec3 rd = normalize(vec3(uv, 1.0));
        float t = castRay(ro, rd);

        if (t < 30.0)
        {
            vec3 pos = ro + t * rd;
            vec3 nor = calcNormal(pos);
            vec3 mat = vec3(0.3, 0.1, 0.2);

            {
                vec3 ld = normalize(pos - vec3(0.0, -1.0, 2.0));
                float dif = clamp(dot(nor, ld), 0.0, 1.0);
                col += dif * vec3(0.2, 0.5, 0.8);
            }

            {
                vec3 ld = normalize(pos - vec3(0.3, 0.4, -0.2));
                float dif = clamp(dot(nor, ld), 0.0, 1.0);
                col += dif * vec3(0.6, 0.7, 0.1) * 0.42;
            }

            float occ = calcAO(pos, nor);
            col += mat * occ;
        }

        tot += col;
    }

    tot /= float(AA * AA);
    tot *= pow(tot, vec3(1.07));
    //tot = clamp(tot, 0.0, 1.0);
    //tot = tot * tot * (3.0 - 2.0 * tot);

    gl_FragColor = vec4(tot, 1.0);
}