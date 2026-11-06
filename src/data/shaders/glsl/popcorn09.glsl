#ifdef GL_ES
precision mediump float;
#endif

#define MAX_ITERS 100
#define PI 3.14159265359

uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_texture_1;

float random (in vec2 uv) 
{
    return fract(sin(dot(uv.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

float noise (vec2 uv) 
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

#define NUM_OCTAVES 8

float fbm (in vec2 uv) 
{
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(    cos(a), sin(a),
                        -sin(a), cos(a)
                    );
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(uv);
        uv = rot * uv * 0.25 + shift;
        a *= 0.575;
    }
    return v;
}

vec2 gen(vec2 p, vec4 t)
{
    return p - .005 * sin(t.xz + p.x + p.y + cos(t.yw - 10.0 / PI - p.yx) + p.yx - p.yx) * 1.;
}

void main()
{
	vec2 q = gl_FragCoord.xy / u_resolution.xy;
	vec2 p = -1.0 + 2.0 * q;
	p.x *= u_resolution.x / u_resolution.y;
    p *= 5.;

	vec4 t = vec4(1);
	
    vec2 z = p;
	vec3 s = vec3(0.0);

	for(int i = 0; i < MAX_ITERS; ++i) 
	{
		z = gen(z, t);
		float d = dot(z - p, z - p); 
		float dd = fbm(z);

		s.x += 1.0 / (0.9 + d);
		s.y += sin(atan(p.x - z.x, p.y - z.y));
		s.z += exp(-0.9 * d);
        t.xyz += -s * .005;
        s -= fbm(s.xy) * length(p * 0.025);
        
	}
    s /= 1.0;
	
	vec3 col = 0.5 + 0.5 * cos( vec3(0.0, 0.4, 0.8) * length(p * sin(s.z * .5)) + s.z - PI);
	//col /= texture2D(u_texture_1, p * s.yz * .005 * length(p * .05)).yxz;
	
	vec3 normal = normalize(vec3((s.x), 0.2, (s.x)));
	float dif = dot(normal, vec3(0.7, 0.1, 0.7));
	col *= 1.0 + .05 * dif * col;

	gl_FragColor = vec4(col, 1.0);
}
