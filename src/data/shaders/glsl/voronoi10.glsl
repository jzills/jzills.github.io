#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

#define PI 3.14159265359
#define ITERS 4
#define SCALE 10.0
#define COMPLEXITY 12.

vec2 random(vec2 p) 
{
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), 
            dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

vec3 shape(vec2 p)
{
	p *= SCALE;
	
	vec3 s = vec3(0.0);
	vec2 z = p;
	for(int i = 0; i < ITERS; ++i) 
	{
		z += cos(z.yx + cos(z.yx + cos(z.yx + 0.5 * u_time)));
	
		float d = dot(z - p, z - p); 
        
		s.x += 1.0 / (1.0 + d);
		s.y += d;
		s.z += sin(atan(z.y - p.y, z.x - p.x));
	}
	
	return s / COMPLEXITY;
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
            vec2 o = random(ip + n);

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
            vec2 o = random(ip + n);

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

void main()
{
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    vec3 color = vec3(0);

    float scale = 1.0;
    float intensity = 0.5;

    vec3 vo = voronoi(uv * scale - shape(uv * intensity).xy);
    color += vo.x * abs(cos(vo.x * vo.z * 10.0 + sin(vo.y + vo.x) * 10.0));
    color += vo;
    color -= vo.y;
    gl_FragColor = vec4(color, 1);
}