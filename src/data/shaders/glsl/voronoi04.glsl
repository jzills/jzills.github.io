#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359

uniform float u_time;
uniform vec2 u_resolution;

vec2 random(vec2 p) 
{
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), 
            dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

vec2 sineWarp(vec2 p){
    
    p = (p + 3.0) + p.y;

    float t = u_time / 2.0;

    // Layered, sinusoidal feedback, with time component.
    for (int i = 0; i < 3; ++i)
    {
        p += cos( p.yx * 5.0 + vec2(t, PI / 2.0)) / 5.0;
        p += sin( p.yx + t + vec2(PI / 2.0, 0.0)) / 2.0;
        p *= 1.3;
    }

    // A bit of jitter to counter the high frequency sections.
    p += fract(sin(p + vec2(13, 7)) * 5e5) * 0.03 - 0.015;

    return mod(p, 2.0) - 1.0; // Range: [vec2(-1), vec2(1)]
    
}

// Bump mapping function. Put whatever you want here. In this case, 
// we're returning the length of the sinusoidal warp function.
float bumpFunc(vec2 p)
{ 
	return clamp(length(sineWarp(p)) * 0.5, 0.0, 1.0);
}

vec2 voronoi(vec2 p)
{
    p *= 1.0;

    vec2 i = floor(p);
    vec2 f = fract(p);
    vec3 t = vec3(1);

    for (int y = -1; y <= 1; ++y)
    {
        for (int x = -1; x <= 1; ++x)
        {
            vec2 n = vec2(x, y);
            vec2 p = random(i + n);

            p *= 0.5 + 0.5 * cos(u_time * random(p));

            vec2 r = n + p - f;
            float d = dot(r, r) * bumpFunc(r - p);

            if (d < t.x)
            {
                t = vec3(d, p);
            }
        }
    }

    return vec2(t.x, t.y + t.z);
}

void main()
{
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    vec3 color = vec3(0);
    vec2 v = voronoi(uv);
    
    //color = 0.5 + 0.5 * cos(v.y * 2.0 * PI + vec3(0.0, 1.0, 2.0));	
    color *= clamp(1.0 - 0.5 * v.x * v.x, 0.0, 1.0);
    color -= (1.0 - smoothstep(0.08, 0.009, v.x));
    color += vec3(v.x, 0.5, 1.0) / (1.0 - v.x);
    gl_FragColor = vec4(color, 1.0);
}