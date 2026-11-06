#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.141592

#define MAX_STEPS 100
#define MAX_DISTANCE 100.0
#define SCENE_DISTANCE 0.001
#define ANTIALIASING 2

#define MODELING 1

#define PLANE_ID 0
#define TERRAIN_ID 1
#define ORB_ID 2

uniform float u_time;
uniform vec2 u_resolution;

mat2 rotate(float angle)
{
    float sine = sin(angle);
    float cosine = cos(angle);
    return mat2(cosine, -sine, sine, cosine);
}

float noise(float n,float s,float res)
{    
	float a = fract(sin(((floor((n)/s-0.5)*s)/res)*4362.6326)*53356.6426);
	float b = fract(sin(((floor((n)/s+0.5)*s)/res)*4362.6326)*53356.6426);
	return mix(a, b, smoothstep(0.0, 1.0, mod(n/s+0.5,1.0)))*0.5+0.5;
}


vec2 getTurbulence(vec2 position, float frequency, float amplitude, float phase)
{    
    vec2 np = position;
    for (int i = 0; i < 5; ++i)
    {        
    	np.x += noise(np.y*frequency+phase+0.1, 1.1, 11.1)*amplitude;
    	np.y += noise(np.x*frequency+phase+0.1, 1.1, 11.1)*amplitude;
        frequency *= 1.5;
    	amplitude *= 0.6;
    }
    return np;
}  

float smoothMin(float distanceA, float distanceB, float scale)
{
    float mixAmount = clamp(0.5+0.5*(distanceB-distanceA)/scale, 0.0, 1.0);
    return mix(distanceB, distanceA, mixAmount)-scale*mixAmount*(1.0-mixAmount);
}

vec2 hash2D(vec2 p)
{
    return fract(sin(vec2(
        dot(p, vec2(127.1, 311.7)),
        dot(p, vec2(269.5, 183.3))))*43758.5453)*2.0-1.0;
}

float noise2D(vec2 p) 
{
	vec2 i = floor(p); p -= i; p *= p*(3. - p*2.); //p *= p*p*(p*(p*6. - 15.) + 10.);    
    
	return dot(mat2(fract(sin(vec4(0, 41, 289, 330) + dot(i, vec2(41, 289)))*43758.5453))*
               vec2(1. - p.y, p.y), vec2(1. - p.x, p.x));
}

float perlinNoise2D(vec2 p)
{
    vec2 f = floor(p);
    vec2 tl = vec2(f.x, f.y+1.0);
    vec2 tr = vec2(f.x+1.0, f.y+1.0);
    vec2 bl = vec2(f.x, f.y);
    vec2 br = vec2(f.x+1.0, f.y);
    vec2 q = fract(p);
    q *= q*(3.0-2.0*q);

    return  mix(mix(
                    dot(hash2D(bl), p-bl),
                    dot(hash2D(br), p-br), q.x), 
                mix(
                    dot(hash2D(tl), p-tl),
                    dot(hash2D(tr), p-tr), q.x), q.y)*0.5+0.5;
}

float terrainNoise2D(vec2 p)
{
    p /= 20.0;
    float amp = 1.0;
    float sum = 0.0;
    float res = 0.0;
    for (int i = 0; i < 2; ++i)
    {
        float n = noise2D(p+getTurbulence(p, 3.0, 1.0, 0.0));
        res += amp*n;
        p = mat2(1.0, -0.75, 0.75, 1.0)*p*3.1;
        sum += amp;
        amp *= 0.25;
    }
    return res/sum;
}

float sdSphere(vec3 position, float radius)
{
    return length(position)-radius;
}

float sdBox(vec3 position, vec3 dimensions)
{
  position = abs(position)-dimensions;
  return length(max(position, 0.0))+min(max(position.x, max(position.y, position.z)), 0.0);
}

float sdGyroid(vec3 position, float scale, float thickness, bool isExternal)
{
    position *= scale;
    float gyroidDistance = dot(cos(position), sin(position.yzx))/scale;
    gyroidDistance = isExternal ? abs(gyroidDistance) : gyroidDistance;
    return gyroidDistance-thickness;
}

// vec2 getOrb(vec3 position)
// {
//     float sphere = abs(sdSphere(position, 5.0))-0.1;
//     float gyroid = sdGyroid(position, 0.9, 0.25, true);
//     float orb = smoothMin(sphere, gyroid, -0.15);
//     return vec2(orb, ORB_ID);
// }

vec2 getOrb(vec3 position)
{
    float sphere = abs(sdSphere(position, 5.0))-0.1;
    float gyroid = 0.9*sdGyroid(position, 1.0, 0.25, true);
    float orb = smoothMin(sphere, gyroid, -0.05);
    return vec2(orb, ORB_ID);
}

vec2 getBrain(vec3 position)
{
    float sphere = abs(sdSphere(position, 10.0))-0.1;
    float gyroid = sdGyroid(position, 0.9, 0.15, true);
    float brain = smoothMin(sphere, gyroid, -0.105);
    return vec2(brain, 0.0);
}

vec2 getTerrain(vec3 position)
{
    float noise = terrainNoise2D(position.xz*0.5);
    float terrain = position.y+8.0-noise*10.0;
    return vec2(terrain, TERRAIN_ID);
}

float getTentacle(vec3 position)
{
    float noise = perlinNoise2D(position.xz*0.27);
    float k = 0.7/exp(0.119*abs(position.x));
    position.y -= k*sin(position.x*0.71*noise+1.5+u_time)*9.0;
    position.z -= k*cos(position.y*0.1*noise+1.5)*3.0;
    return length(position.yz)-5.0*noise*(1.0-k);
}

float getTentacles(vec3 position)
{
    float d;
    float tent1 = getTentacle(position);
    position.xz *= rotate(1.5);
    float tent2 = getTentacle(position);
    d = smoothMin(tent1, tent2, 0.7);
    d = smoothMin(d, sdSphere(position, 9.0), -0.5);
    return d;
}

float getAlien(vec3 position)
{
    float tentacles = 0.6*getTentacles(position);
    float brain = 0.8*getBrain(position-vec3(0.0, 1.0, 0.0)).x;
    //return tentacles;
    return smoothMin(tentacles, brain, 0.5);
}

vec2 getScene(vec3 position)
{
    #if MODELING == 1

    position.xz *= rotate(u_time);
    return vec2(getAlien(position), 0.0);

    #endif

    float repetition = 25.0;
    vec2 scene;
    vec2 terrain = getTerrain(position);
    vec2 index = floor((position.xz+repetition)/(2.0*repetition));
    position.xz = mod(position.xz+repetition, 2.0*repetition)-repetition;
    vec2 hash = hash2D(index);
    position.x -= hash.x*15.0;
    position.y -= hash.y*2.0;
    vec2 orb = getOrb(position);
    float alien = getAlien(position-vec3(0.0, 10.0, 0.0));
    scene.x = smoothMin(alien, terrain.x, 0.9);

    return scene;
}

vec2 getSceneDistance(vec3 rayOrigin, vec3 rayDirection)
{
    vec2 sceneRay = vec2(0.001, -1.0);
    for (int i = 0; i < MAX_STEPS; ++i)
    {
        vec3 position = rayOrigin+sceneRay.x*rayDirection;
        vec2 sceneObject = getScene(position);
        if (abs(sceneObject.x) < SCENE_DISTANCE || sceneRay.x > MAX_DISTANCE)
            break;
        sceneRay.x += sceneObject.x;
        sceneRay.y = sceneObject.y;
    }
    return sceneRay;
}

vec3 getNormal(vec3 position)
{
    vec2 epsilon = vec2(0.001, 0.0);
    return normalize(vec3(
        getScene(position+epsilon.xyy).x-getScene(position-epsilon.xyy).x,
        getScene(position+epsilon.yxy).x-getScene(position-epsilon.yxy).x,
        getScene(position+epsilon.yyx).x-getScene(position-epsilon.yyx).x
    ));
}

vec3 getRayDirection(vec2 uv, vec3 rayOrigin, float zoom, float speed)
{
    vec3 lookAt = vec3(0.0, 0.0, 10.0+speed);
    vec3 forward = normalize(lookAt-rayOrigin);
    vec3 right = cross(vec3(0.0, 1.0, 0.0), forward);
    vec3 up = cross(forward, right);
    vec3 cameraDirection = rayOrigin+forward*zoom+uv.x*right+uv.y*up;
    return cameraDirection-rayOrigin;
}

float getHeightMap(vec2 position)
{
	float h = 0.0;
	float f = 0.002;
	vec2 time = vec2(0.1, 0.13);
	float g = sqrt(3.25) + 0.5;
	for (int i = 0; i < 6; ++i) 
    {
		vec2 v = fract(position+time)-0.5;
		float t = max(0.0, 0.15-dot(v, v));
		t = t*t*t/f*8.0;
		h += t*t*4.0;
		f *= g;
		position *= rotate(2.0*PI*g)*g;
	}
	
	return sqrt(h);
}

vec3 getTileColor(vec2 position)
{
    position = getTurbulence(position, 5.0, 0.19, 0.0);
    
    vec2 epsilon = vec2(0.001/(position.y+0.5), 0.0);
    float heightA = getHeightMap(position-epsilon);
	float heightB = getHeightMap(position+epsilon);
	float heightC = getHeightMap(position-epsilon.yx);
	float heightD = getHeightMap(position+epsilon.yx);
	
	vec3 rayDirection = vec3(position, 0.0);	
	vec3 normal = normalize(vec3(heightB-heightA, heightD-heightC, 0.74));
	float diffuse = dot(normal, normalize(rayDirection))*0.5+0.5;
	vec3 color = vec3(pow(diffuse, 1.0), pow(diffuse, 0.75), pow(diffuse, 0.5));
    return color-0.75*length(pow(position, vec2(1.5)))-0.5;
}

vec3 getSunColor(vec3 ro, vec3 rd, vec3 lp)
{
    float sun = max(dot(rd, normalize(lp-ro)), 0.0);
    float hor = pow(1.0-max(rd.y, 0.0), 3.0)*0.3;
    vec3 sunCol = mix(vec3(0.702, 0.549, 0.502), vec3(0.7333, 0.3608, 0.349), sun*3.0);
    //sunCol += 0.9*vec3(.9, .98, .7)*pow(sun, 5.);
    //sunCol += 0.7*vec3(.8, .78, .6)*pow(sun, 15.);
    //sunCol += 0.3*vec3(.5, .58, .3)*pow(sun, 55.);
    return sunCol;
}


void main()
{
    vec3 totalColor = vec3(0.0);

    for (int i = 0; i < ANTIALIASING; ++i)
    for (int j = 0; j < ANTIALIASING; ++j)
    {
        vec2 offset = vec2(float(i), float(j))/float(ANTIALIASING);
        vec2 uv = ((gl_FragCoord.xy+offset)-0.5*u_resolution.xy);
        uv /= u_resolution.y;

        float cameraSpeed = 5.0*u_time;

        #if MODELING == 1
            cameraSpeed = 0.0;
        #endif

        vec3 color = vec3(0.0);
        vec3 rayOrigin = vec3(0.0, 30.0, -50.0+cameraSpeed);       
        vec3 rayDirection = getRayDirection(uv, rayOrigin, 1.0, cameraSpeed);

        vec2 sceneObject = getSceneDistance(rayOrigin, rayDirection);
        if (sceneObject.x < MAX_DISTANCE)
        {
            vec3 position = rayOrigin+sceneObject.x*rayDirection;
            vec3 normal = getNormal(position);
            
            // Internal lighting
            vec3 internalLightPosition = vec3(0.0);
            vec3 internalLightDirection = normalize(internalLightPosition-position);
            float internalDiffuse = max(dot(normal, internalLightDirection), 0.0);
            vec3 internalColor = internalDiffuse*vec3(0.7, 0.3, 0.1);

            // External lighting
            vec3 externalLightPosition = rayOrigin+vec3(100.0, 100.0, 100.0);
            vec3 externalLightDirection = normalize(externalLightPosition-position);
            float externalDiffuse = max(dot(normal, externalLightDirection), 0.0);
            float externalAmbient = clamp(0.5-0.5*rayDirection.z, 0.0, 1.0);
            float externalSpecular = pow(clamp(dot(normal, normalize(externalLightDirection-rayDirection)), 0.0, 1.0), 64.0);
            vec3 externalColor = 
                externalAmbient*vec3(0.07, 0.5, 0.8)+
                externalDiffuse*vec3(0.07, 0.5, 0.8)+
                externalSpecular*vec3(0.8431, 0.902, 0.0706);

            color = internalColor+externalColor;

            //vec3 sunColor = getSunColor(rayOrigin, rayDirection, vec3(100.0));
            //color = mix(color, sunColor, smoothstep(0.2, 1.0, sceneObject.x/MAX_DISTANCE));
            //color += internalColor+externalColor;            
            //vec2 tilePosition = fract(abs(position.xz*0.051)*0.2)-0.5;
            //color += smoothstep(0.1, 0.9, getTileColor(tilePosition)*normal.y);
        }

        //vec3 sunColor = getSunColor(rayOrigin, rayDirection, rayOrigin+vec3(100.0));
        //color = mix(color, sunColor, smoothstep(0.7, 1.0, sceneObject.x/MAX_DISTANCE));

        vec3 fogColor = vec3(0.01, 0.0, 0.01);
        color = mix(color, fogColor, smoothstep(0.05, 0.2, sceneObject.x*0.2/MAX_DISTANCE));

        totalColor += color;
    }   

    totalColor /= float(ANTIALIASING*ANTIALIASING);

    gl_FragColor = vec4(sqrt(totalColor), 1.0);
}