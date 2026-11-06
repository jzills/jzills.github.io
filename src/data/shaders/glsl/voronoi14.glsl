#ifdef GL_ES
precision mediump float;
#endif

#define NUM_OCTAVES 4

uniform float u_time;
uniform vec2 u_resolution;

float random(vec2 p)
{
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 random2(vec2 p) 
{
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), 
            dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float noise(vec2 uv) 
{
    vec2 i = floor(uv);
    vec2 f = fract(uv);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix  (a, b, u.x) +
                (c - a) * u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
}

float fbm(vec2 uv) 
{
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));

    for (int i = 0; i < NUM_OCTAVES; ++i) 
    {
        v += a * noise(uv);
        uv = rot * uv * 2.0 + shift;
        a *= 0.5;
    }

    return v;
}

vec3 voronoi(vec2 p)
{
    p *= 5.0;

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
            vec2 p = random2(ip + n);

            p = 0.5 + 0.5 * sin(p * u_time);

            vec2 df = n + p - fp;
            float d = length(df);

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
            vec2 p = random2(ip + n);

            p = 0.5 + 0.5 * sin(p * u_time);

            vec2 df = n + p - fp;
            float d = dot(mp + df, normalize(df - mp));

            if (d < md)
            {
                md = d;
            }
        }
    }

    return vec3(md, mp);
}

vec3 shape(in vec2 p)
{
	p *= 5.0;
	
	vec3 s = vec3(0.0);
	vec2 z = p;
	for (int i = 0; i < 8; ++i) 
	{	
		z += cos(z.yx + sin(z.yx + cos(z.yx + 0.5 * u_time)));
        z += sin(s.xy * 0.125 - cos(z.xy - sin(z.yx - 0.5 + u_time)));
        	
		float d = dot(z - p, z - p); 
 
		s.x += 1.0 / (1.0 + d);
		s.y += d;
		s.z += sin(atan(z.y - p.y, z.x - p.x));
	}
	
	return s / 3.;//vec3(z, 1.);
}

void main()
{
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;

    vec3 color = vec3(0);

    vec3 vo = voronoi(vec2(fbm(vec2(uv.x)), fbm(vec2(uv.y))) * 100.0);
    vo = voronoi(uv * fbm(uv * sin(u_time * 0.25))) / shape(uv * 2.0);
    
    color = vec3(0.4, 0.2, 0.9) * vo.x;// * cos(vo.x * 2.0);
    color -= vec3(0.3, 0.1, 0.7) * cos(vo.x * 10.0);

    gl_FragColor = vec4(color, 1);
}