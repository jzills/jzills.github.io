#ifdef GL_ES
precision mediump float;
#endif

#define s(a, b, t) smoothstep(a, b, t)
#define NUM_OCTAVES 4

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate(float a)
{
    float c = cos(a);
    float s = sin(a);
    
    return mat2(c, s, -s, c);
}

float p(vec4 b) 
{
	return 0.125 * (b.x + b.y + b.z + b.w);
}

vec4 T(vec2 b)
{
    vec4 t = vec4(b * rotate(b.x), b * rotate(b.y));
    t *= p(t) / t;

    return vec4(t);
}

vec2 v(vec4 b) 
{
	return vec2(1); //vec2(b.x - b.y, b.z - b.w);
}

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

    vec4 q = A(uv * 50.0);
    vec3 n = cross(vec3(q.x, q.y, q.z), vec3(0.0, 0.5, 1.0));
    color = q.xyz * vec3(0.2, 0.4, 0.7) * n * 5.0;

    gl_FragColor = vec4(color, 1);
}