class Vec {
  constructor({x, y, z=0}) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  add(other) {
    return new Vec({x: this.x + other.x, y: this.y + other.y, z: this.z + other.z});
  }
  times(c) {
    return new Vec({x: c * this.x, y: c * this.y, z: c * this.z});
  }
  sub(other) {
    return this.add(other.times(-1));
  }
}

const clamp = (x, min, max) =>
  Math.min(Math.max(x, min), max)

const pointerFromEvent = (e) => {
  // const rect = e.target.getBoundingClientRect();
  return new Vec({
    x: e.clientX, // - rect.left,
    y: e.clientY, // - rect.top
  });
}

class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.origin = new Vec({x: 0, y: 0});
    this.scale = 1;
    this.children = [];

    this.canvas.addEventListener("wheel", (e) => this.wheel(e))
    this.canvas.addEventListener("gesturestart", (e) => this.gesturestart(e))
    this.canvas.addEventListener("gesturechange", (e) => this.gesturechange(e))
    this.canvas.addEventListener("gestureend", (e) => this.gestureend(e))

    this.canvas.addEventListener("click", (e) => {
      const pointer = pointerFromEvent(e);
      console.log("CLICK", pointer, this.toAbsolute(pointer));
    })
  }

  toViewport(x) {
    return x.sub(this.origin).times(this.scale);
  }

  toAbsolute(x) {
    return x.times(1/this.scale).add(this.origin);
  }

  addNode(node) {
    this.canvas.appendChild(node.elem);
    this.children.push(node);
    node.scene = this;
    node.render();
  }

  wheel(e) {
    // dev.to/danburzo/pinch-me-i-m-zooming-gestures-in-the-dom-a0e
    e.preventDefault();

    if (e.ctrlKey) {
      // TODO: handle zoom in Chrome

    } else {
      const delta = new Vec({x: -e.deltaX, y: -e.deltaY});
      this.origin = this.origin.add(delta);
      this.children.map(c => c.render());
    }
  }

  gesturestart(e) {
    e.preventDefault();
  }

  gesturechange(e) {
    e.preventDefault();
    const pointer = pointerFromEvent(e);
    const a = this.toAbsolute(pointer);

    // Resize the canvas
    const factor = 1 + 0.05 * (e.scale - 1);
    this.scale = clamp(this.scale * factor, 0.3, 3.0);

    // Re-position so mouse remains where it was
    const b = this.toAbsolute(pointer);
    const delta = b.sub(a);
    this.origin = this.origin.sub(delta);

    // Render all the children in the new spots
    this.children.map(c => c.render());
  }

  gestureend(e) {
    e.preventDefault();
  }
}

class Node {
  constructor({x, y, z, w, type, path}) {
    this.elem = document.createElement("div");
    this.elem.style.position = "absolute";
    const content = this.createContent(type, path);
    this.elem.appendChild(content);

    this.elem.addEventListener("mousedown", (e) => this.mousedown(e));
    this.elem.addEventListener('mousemove', (e) => this.mousemove(e));
    this.elem.addEventListener('mouseup', (e) => this.mouseup(e));

    // Positioning and rendering
    this.scene = null;
    this.position = new Vec({x: x, y: y});
    this.width = w;

    // Interaction helpers
    this.dragging = false;
    this.click = null;
  }


  serialize() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      w: this.w,
      type: this.type,
      path: this.path
    }
  }

  createContent(type, path) {
    if (type == "image/jpeg") {
      const img = document.createElement("img");
      img.style.width = "100%";
      img.src = path;
      return img;
    }
  }

  render() {
    const pos = this.scene.toViewport(this.position);
    const w = this.scene.scale * this.width;
    this.elem.style.left = pos.x;
    this.elem.style.top = pos.y;
    this.elem.style.width = w;
  }

  getViewportPosition() {
    return new Vec({
      x: parseInt(this.elem.style.left.slice(0, -2)),
      y: parseInt(this.elem.style.top.slice(0, -2)),
    })
  }

  setViewportPosition(v) {
    this.elem.style.left = v.x;
    this.elem.style.top = v.y;
    this.position = this.scene.toAbsolute(v);
  }

  moveInViewport(delta) {
    const pos = this.getViewportPosition();
    this.setViewportPosition(pos.add(delta));
  }

  mousedown(e) {
    e.preventDefault();
    e.stopPropagation();

    this.dragging = true;
    this.click = new Vec({x: e.clientX, y: e.clientY});
  }

  mousemove(e) {
    if (this.dragging) {
      const click = new Vec({x: e.clientX, y: e.clientY});
      const delta = click.sub(this.click);
      this.moveInViewport(delta);
      this.click = click;
    }
  }

  mouseup(e) {
    this.dragging = false;
  }
}
