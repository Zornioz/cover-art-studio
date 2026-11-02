attribute vec2 position;
varying vec2 v_uv;

void main() {
  v_uv = vec2(position.x * 0.5 + 0.5, 1.0 - (position.y * 0.5 + 0.5));
  gl_Position = vec4(position, 0.0, 1.0);
}
