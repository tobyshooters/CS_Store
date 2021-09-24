const clamp = (x, min, max) =>
  Math.min(Math.max(x, min), max)

class Vec {
  constructor({x, y, z=0}) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  add(other) {
    return new Vec({
      x: this.x + other.x,
      y: this.y + other.y,
      z: this.z + other.z
    });
  }
  times(c) {
    return new Vec({
      x: c * this.x,
      y: c * this.y,
      z: c * this.z
    });
  }
  sub(other) {
    return this.add(other.times(-1));
  }
  dot(other) {
    return this.x * other.x
         + this.y * other.y
         + this.z * other.z;
  }
}
