#ifdef GL_ES
precision mediump float;
#endif

#define s(a, b, t) smoothstep(a, b, t)
#define NUM_OCTAVES 4
#define MAX_ITERS 4
#define PI 3.14159265359

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate(float a)
{
    float c = cos(a);
    float s = sin(a);
    
    return mat2(c, s, -s, c);
}

float random(vec2 p)
{
    return fract(sin(dot(p, vec2(12.9345, 77.9713))) * 43758.97139);
}

vec2 random2(vec2 p) 
{
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), 
            dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float noise(vec2 p) 
{
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix  (a, b, u.x) 
                + (c - a) * u.y * (1.0 - u.x) 
                + (d - b) * u.x * u.y;
}

float fbm(vec2 p) 
{
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(
                    cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50)
                    );

    for (int i = 0; i < NUM_OCTAVES; ++i) 
    {
        v += a * noise(p);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
    }

    return v;
}

vec3 voronoi(vec2 p)
{
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    vec2 mp = vec2(0);
    vec2 mn = vec2(0);
    float md = 10.0;

    for (int i = -1; i <= 1; ++i)
    {
        for (int j = -1; j <= 1; ++j)
        {
            vec2 n = vec2(i, j);
            vec2 o = random2(ip + n);

            o = 0.5 + 0.5 * sin(u_time * o);

            vec2 df = n + o - fp;
            float d = dot(df, df);

            if (d < md)
            {
                md = d;
                mp = df;
                mn = n;
            }
        }
    }

    md = 10.0;

    for (int i = -2; i <= 2; ++i)
    {
        for (int j = -2; j <= 2; ++j)
        {
            vec2 n = mn + vec2(i, j);
            vec2 o = random2(ip + n);

            o = 0.5 + 0.5 * sin(u_time * o);

            vec2 df = n + o - fp;
            float d = dot(mp + df, normalize(df - mp));

            if (d < md)
            {
                md = d;
            }
        }
    }

    return vec3(md, mp);
}

vec2 gen(vec2 p, vec4 t)
{
    p *= rotate(PI * 0.0025);
    return p - 0.005 * sin(t.xz + p.x + p.y + cos(t.yw - 0.5 / PI - p.yx) + p.yx - p.yx) * 1.;
}

vec3 shape(vec2 p)
{
    p *= 5.0;

	vec4 t = vec4(1);
    vec2 z = p;
	vec3 s = vec3(0.0);

	for(int i = 0; i < MAX_ITERS; ++i) 
	{
		z = gen(z, t);
        
		float d = dot(z - p, z - p); 
		float dd = fbm(z);

		s.x += 1.0 / (1.0 + d);
		s.y += d;
		s.z += sin(atan(z.y - p.y, z.x - p.x));
	}

    s /= 6.0;

    return s;
}

// change the literal scalar values in this function
vec4 T(vec2 b)
{
    float t = fbm(b * sin(b * 25.0 * cos(u_time * 0.05))) - voronoi(b * 5.0).x;
    t -= voronoi(b * 2.0).x;
    return vec4(t);
}

float map(float start1, float stop1, float start2, float stop2, float value)
{
    float outgoing = start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    return outgoing;
}

vec2 v(vec4 b) 
{
    vec3 pc = shape(b.xy);    
    float p = pc.x * map(1.0, 0.5, 1.4, 1.45, abs(cos(u_time * 0.5)));
	return vec2(b.x - b.y * p, b.z - b.w * p);
}

// Pressure
float p(vec4 b) 
{
	return 0.25 * (b.x + b.y + b.z + b.w);
}

// TRANSLATE COORD BY Velocity THEN LOOKUP STATE
vec4 A(vec2 p) 
{
    p -= v(T(p));
    p -= v(T(p));

	return T(p);
}

void main()
{
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 color = vec3(0);

    vec4 q = A(uv * 5.0);

    vec3 amb = vec3(0.4, 0.5, 0.94) * 1.2;
    vec3 n = vec3(uv.x - q.x, uv.y - q.y, uv.x - q.z);
    float m = smoothstep(-0.04, 0.9, length(q.xyz));

    
    color = amb * n + (1.0 - m);

    color += length(q * 2.0) - 0.95;

    color -= smoothstep(0.4, 0.45, length(uv)) * 8.0;

    gl_FragColor = vec4(color, 1);
}