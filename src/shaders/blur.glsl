// Gaussian blur shader for modal backgrounds
// Uses separable two-pass blur (horizontal + vertical)

@ctype mat4 [4][4]f32
@ctype vec2 [2]f32

// Fullscreen quad vertex shader
@vs vs_fsq
in vec4 position;
in vec2 texcoord0;
out vec2 uv;

void main() {
    gl_Position = position;
    uv = texcoord0;
}
@end

// Horizontal blur pass
@fs fs_blur_h
layout(binding=0) uniform texture2D tex;
layout(binding=0) uniform sampler smp;

layout(binding=0) uniform fs_blur_params {
    vec2 texel_size;
    float blur_amount;
    float _pad;
};

in vec2 uv;
out vec4 frag_color;

void main() {
    vec4 color = vec4(0.0);
    
    // 9-tap Gaussian kernel weights (sigma ~= 2.0)
    float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
    
    // Center sample
    color += texture(sampler2D(tex, smp), uv) * weights[0];
    
    // Horizontal samples
    for (int i = 1; i < 5; i++) {
        vec2 offset = vec2(texel_size.x * float(i) * blur_amount, 0.0);
        color += texture(sampler2D(tex, smp), uv + offset) * weights[i];
        color += texture(sampler2D(tex, smp), uv - offset) * weights[i];
    }
    
    frag_color = color;
}
@end

// Vertical blur pass
@fs fs_blur_v
layout(binding=0) uniform texture2D tex;
layout(binding=0) uniform sampler smp;

layout(binding=0) uniform fs_blur_params {
    vec2 texel_size;
    float blur_amount;
    float _pad;
};

in vec2 uv;
out vec4 frag_color;

void main() {
    vec4 color = vec4(0.0);
    
    // 9-tap Gaussian kernel weights (sigma ~= 2.0)
    float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
    
    // Center sample
    color += texture(sampler2D(tex, smp), uv) * weights[0];
    
    // Vertical samples
    for (int i = 1; i < 5; i++) {
        vec2 offset = vec2(0.0, texel_size.y * float(i) * blur_amount);
        color += texture(sampler2D(tex, smp), uv + offset) * weights[i];
        color += texture(sampler2D(tex, smp), uv - offset) * weights[i];
    }
    
    frag_color = color;
}
@end

// Simple passthrough to draw the final blurred texture
@fs fs_display
layout(binding=0) uniform texture2D tex;
layout(binding=0) uniform sampler smp;

in vec2 uv;
out vec4 frag_color;

void main() {
    vec4 color = texture(sampler2D(tex, smp), uv);
    // Slight darkening to maintain modal visibility
    frag_color = vec4(color.rgb * 0.7, 1.0);
}
@end

@program blur_h vs_fsq fs_blur_h
@program blur_v vs_fsq fs_blur_v
@program display vs_fsq fs_display
