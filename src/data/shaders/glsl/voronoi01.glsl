#ifdef GL_ES
precision mediump float;
#endif

#define MAX_ITERS 3
#define PI 3.14159265359

uniform float u_time;
uniform vec2 u_resolution;

vec2 random(vec2 p) 
{
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), 
            dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

vec2 gen(vec2 p, vec4 t)
{
    return p - 0.15 * sin(t.xz + p.x + p.y + cos(t.yw - 2.5 / PI - p.yx) + p.yx - p.yx) * 5.0;
}

vec3 popcorn(vec2 p)
{
    vec4 t = vec4(1);
    vec2 z = p;
	vec3 s = vec3(0.0);

	for(int i = 0; i < MAX_ITERS; ++i) 
	{
		z = gen(z, t);
		float d = dot(z - p, z - p); 

		s.x += 1.0 / (0.1 + d);
		s.y += sin(atan(p.x - z.x, p.y - z.y));
		s.z += exp(-0.9 * d);
	}

    return s / 10.0;
}

vec3 voronoi(vec2 p)
{
    p *= 5.0;

    vec2 i = floor(p);
    vec2 f = fract(p);

    float minDist = 1.;  // minimun distance
    vec2 minPoint = vec2(0);

    for (float y = -1.0; y <= 1.0; ++y) 
    {
        for (float x = -1.0; x <= 1.0; ++x) {
            vec2 neighbor = vec2(x, y);
            vec2 point = random(i + neighbor);
            
            point = 0.5 + 0.5 * sin(u_time + PI * point);

            vec2 diff = neighbor + point - f;
            float dist = length(diff);

            if (dist < minDist)
            {
                minDist = dist;
                minPoint = point;
            }
        }
    }

    return vec3(minDist, minPoint);
}

void main()
{
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    vec3 color = vec3(0);
    
    float e = 0.09;
    vec2 pa = uv + vec2(e, 0.0);
    vec2 pb = uv + vec2(0.0, e);
    vec2 pc = uv;

    vec3 va = voronoi(pa);
    vec3 vb = voronoi(pb);
    vec3 vc = voronoi(pc);

    vec3 pca = popcorn(va.yz);
    vec3 pcb = popcorn(vb.yz);
    vec3 pcc = popcorn(vc.yz);
    color += pca - pcb * pcc + (pca.x * pca.b * pcc.x);

    vec3 normal = normalize(vec3((pca.x - pcc.x), 0.1, (pcb.x - pca.x)));
	float diff = clamp(0.5 + 0.5 * dot(normal,vec3(0.5773) ), 0.0, 1.0);
	color *= 1.0 + 0.27 * diff * color;
	color += 0.25 * pow(normal.y, 128.0);

    gl_FragColor = vec4(color, 1);
}