#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.141592

uniform float u_time;
uniform vec2 u_resolution;

float heightmap(vec2 position)
{
	float height = 0.0;
	float f = 0.002;
	vec2 timevec = u_time * vec2(0.1, 0.13);
	float g = sqrt(1.25) + 0.5;
    
	position *= f;

	float c = cos(2.0 * PI * g);
	float s = sin(2.0 * PI * g);
	mat2 matcs = mat2(c, s, -s, c) * g;

	for (int i = 0; i < 14; ++i) 
    {
		vec2 v = fract(position + timevec) - 0.5;
		float dots = max(0.0, dot(v, v) - 0.1);//max(0.0, 0.13 - dot(v, v));
		dots = dots * dots * dots / f * 18.0;
		height += dots*dots*2.0;//max(height,dots);
		f *= g;
		position *= matcs;
	}
	
	return sqrt(height);
}

vec2 size = vec2(-0.4,0.0);

void main()
{
	vec2 pos = gl_FragCoord.xy;
    
    vec2 e = vec2(1.0, 0.0);
	float n1 = heightmap(pos - e.yx);
	float n2 = heightmap(pos - e);
	float n3 = heightmap(pos + e);
	float n4 = heightmap(pos + e.yx);
	
	vec3 p2m = vec3(pos, 1.0);	
	
	vec3 normal = normalize(vec3(n2-n3, n1-n4, 0.4));
	
	float color = dot(normal, normalize(p2m))*.5+.5;
	vec3 colorvec = vec3(pow(color,10.),pow(color,5.),pow(color,2.5));
	
	gl_FragColor = vec4( vec3(color), 1.0 );

}
