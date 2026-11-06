
#ifdef GL_ES
precision mediump float;
#endif

#define MAX_ITERS 8

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
	return fract(sin(dot(p.xy, vec2(12.37973, 49.71397)) * 98.717391)) * 37.79131;
}

float noise(vec2 p)
{
	vec2 i = floor(p);
	vec2 f = fract(p);

	float a = random(i);
	float b = random(i + vec2(1, 0));
	float c = random(i + vec2(0, 1));
	float d = random(i + vec2(1, 1));

	vec2 u = f * f * (3.0 - 2.0 * f);

    return mix	(a, b, u.x) +
            	(c - a) * u.y * (1.0 - u.x) +
            	(d - b) * u.x * u.y;
}

vec3 shape(in vec2 p)
{
	p *= 5.0;
	
	vec3 s = vec3(0.0);
	vec2 z = p;
	vec2 w = p;

	for (int i = 0; i < 8; ++i) 
	{
		//p *= rotate(sin(u_time) * 0.05);

        // transform		
		z+= cos(z.yx + cos(z.yx + cos(z.yx + 0.5 * u_time)));
        w += sin(s.xy * 0.125 - cos(z.xy - sin(z.yx - 0.5 + u_time)));
        
		z *= rotate(cos(u_time) * 0.05);
		w *= rotate(sin(u_time) * 0.05);

		z -= noise(p) * 0.0125;
		w += noise(p) * 0.005255;

        // orbit traps		
		float da = dot(z - p, z - p); 
		float db = dot(w - p, w - p);
		da = min(da, db);

		s.x += 1.0 / (1.0 + da);
		s.y += da;
		s.z += sin(atan(z.y - p.y, z.x - p.x));
	}
	
	return s / 8.;
}

void main()
{
    vec2 pc = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.y, u_resolution.x);

	float eps = 0.04;
	vec2 pa = pc + vec2(eps, 0.0);
	vec2 pb = pc + vec2(0.0, eps);
	
    // shape (3 times for differentials)	
	vec3 sc = shape(pc);
	vec3 sa = shape(pa);
	vec3 sb = shape(pb);

    // color	
	vec3 color = mix(vec3(0.08, 0.02, 0.15), vec3(0.6, 1.1, 1.6), sc.x);
	color = mix(color, color.yxz, smoothstep(-0.5, 0.5, cos(0.5 * u_time)));
	color *= 0.15 * sc.y;
	color += 0.4 * abs(sc.x) - 0.15;

    //light	
	vec3 normal = normalize(vec3(sa.x - sc.x, 0.1, sb.x - sc.x));
	float diff = clamp(0.5 + 0.5 * dot(normal,vec3(0.5773) ), 0.0, 1.0);
	color *= 1.0 + 0.7 * diff * color;
	color += 0.25 * pow(normal.y, 128.0);

    // vignetting	
	//color *= 1.0 - 0.5 * length(pc);
	color *= mix(color, color * color * color, smoothstep(0.1, 0.2, color)) * 0.5 + 0.95;

    gl_FragColor = vec4(color, 1);
}