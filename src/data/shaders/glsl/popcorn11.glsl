
#ifdef GL_ES
precision mediump float;
#endif

#define MAX_ITERS 8

uniform float u_time;
uniform vec2 u_resolution;

vec3 shape(in vec2 p)
{
	p *= 10.0;
	
	vec3 s = vec3(0.0);
	vec2 z = p;
	for (int i = 0; i < 10; ++i) 
	{
        // transform		
		z += cos(z.yx + cos(z.yx + cos(z.yx + 0.5 * u_time)));
        z += sin(s.xy * 0.005 - cos(z.xy - sin(z.yx - 0.5 + u_time)));
        
        // orbit traps		
		float d = dot(z - p, z - p); 
        //d = length(z - p);
		s.x += 1.0 / (1.0 + d);
		s.y += d;
		s.z += sin(atan(z.y - p.y, z.x - p.x));
	}
	
	return s / 8.0;//vec3(z, 1.);
}

void main()
{
    vec2 pc = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.y, u_resolution.x);

	vec2 pa = pc + vec2(0.04,0.0);
	vec2 pb = pc + vec2(0.0,0.04);
	
    // shape (3 times for diferentials)	
	vec3 sc = shape(pc);
	vec3 sa = shape(pa);
	vec3 sb = shape(pb);

    // color	
	vec3 col = mix(vec3(0.08, 0.02, 0.15), vec3(0.6, 1.1, 1.6), sc.x);
	col = mix(col, col.yxz, smoothstep(-0.5, 0.5, cos(0.5 * u_time)));
	col *= 0.15 * sc.y;
	col += 0.4 * abs(sc.x) - 0.15;

    // light	
	vec3 nor = normalize(vec3(sa.x - sc.x, 0.1, sb.x - sc.x));
	float dif = clamp(0.5 + 0.5 * dot(nor,vec3(0.5773) ), 0.0, 1.0);
	col *= 1.0 + 0.7 * dif * col;
	col += 0.3 * pow(nor.y,128.0);

    // vignetting	
	col *= 1.0 - 0.5 * length(pc);

    gl_FragColor = vec4(col, 1);
}