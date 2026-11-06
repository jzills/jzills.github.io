#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

vec2 hash2(vec2 p)
{
    float nx = fract(sin(dot(p.x*912.179313, p.y))*137.17193);
    float ny = fract(sin(dot(p.y*312.7139, nx+p.y))*137.17193);
    return vec2(nx, ny);
}

mat2 rotate(float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c);
}

float circle(vec2 p, float r, float s)
{
    s = pow(s, -1.0);
    float l = length(p*s);
    return  smoothstep(0.2, 0.15, l-r);
}

float ocircle(vec2 p, float r, float a, float b, float c)
{
    float l = length(p)-r;
    return  smoothstep(-c, c, l-a) - 
            smoothstep(-c, c, l-b);
}

float box(vec2 p, vec2 b)
{
    p = abs(p)-b;
    return length(max(p, 0.0))+min(max(p.x, p.y), 0.0);
}

float line(vec2 p)
{
    return smoothstep(-0.1, 0.1, -box(p, vec2(0.0, 1.0)));
}

float shape(vec2 uv)
{
    vec2 q = uv;
    float d = 0.0;
    d += ocircle(q, 0.2, 0.1, 0.105, 0.005);
    
    q *= rotate(u_time);
    d += circle(q-vec2(0.35, 0.0), 0.25, 0.1);

    vec2 p = uv;
    p *= rotate(-u_time);
    d += circle(p-vec2(0.35, 0.0), 0.25, 0.1);
    
    vec2 u = uv;
    u *= 4.0;
    u *= rotate(u_time);
    float an = 0.35;
    float sec = floor(0.5+atan(u.x, u.y)/an);
    u = rotate(an*sec)*u;
    d += line(u);
    return d;
}

vec3 voronoi(vec2 position)
{
    position *= 2.0; 

    float minDistance = 0.0; //1e9;
    vec2 floorPosition = floor(position);
    vec2 fractPosition = fract(position);
    vec2 minPosition = position;
    
    for (int y = -1; y <= 1; ++y)
    {
        for (int x = -1; x <= 1; ++x)
        {
            vec2 neighbor = vec2(x, y);
            vec2 randomPosition = hash2(floorPosition+neighbor)+vec2(0.5);
            
            //randomPosition *= rotate(dot(randomPosition, position));
            randomPosition *= sin(u_time-sin(dot(randomPosition, position)*11.0))*0.5+0.5;

            float difference = length(neighbor+randomPosition-fractPosition)-0.5;
            
            minPosition = minDistance < 0.000001*pow(1.0/difference, 4.0) ? neighbor : minPosition;
            minDistance += 0.000001*pow(1.0/difference, 4.0);
            
            //minDistance = min(minDistance, difference);
        }
    }

    //return minDistance;
    return vec3(pow(minDistance, 1.0/4.0), minPosition);
}

void main()
{
    vec2 uv = (gl_FragCoord.xy-0.5*u_resolution.xy);
    uv /= min(u_resolution.x, u_resolution.y);

    vec3 col = vec3(0.0);
    //uv = abs(uv)-0.5;
    // col += shape(uv);
    // col += shape(uv*2.0+shift);
    // col += shape(uv*3.0+shift.xx);
    // col += shape(uv*4.0+shift.yx);
    // col += shape(uv*5.0+shift.yy);

    vec3 v1 = voronoi(uv);
    col += v1.x;
    gl_FragColor = vec4(col, 1.0);
}