class Scene {
  constructor(elem, stage) {
    this.elem = elem;
    this.stage = stage;
    this.origin = new Vec({x: 0, y: 0});
    this.scale = 1;
    this.children = [];

    this.elem.addEventListener("wheel", (e) => this.wheel(e))
    this.elem.addEventListener("gesturestart", (e) => this.gesturestart(e))
    this.elem.addEventListener("gesturechange", (e) => this.gesturechange(e))
    this.elem.addEventListener("gestureend", (e) => this.gestureend(e))
    this.elem.addEventListener("dblclick", (e) => this.dblclick(e))

    this.postScroll = null;
  }

  toViewport(x) {
    return x.sub(this.origin).times(this.scale);
  }

  toAbsolute(x) {
    return x.times(1/this.scale).add(this.origin);
  }

  inStage(v) {
    const bbox = this.stage.getBoundingClientRect();
    return (
      bbox.left < v.x &&
      v.x < bbox.right &&
      bbox.top < v.y &&
      v.y < bbox.bottom
    );
  }

  addNode(node) {
    this.elem.appendChild(node.elem);
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
      this.children.filter(c => !c.inStage).map(c => c.render());
      this.children.filter(c => c.inStage).map(c => {
        c.position = this.toAbsolute(c.getViewportPosition());
      });
    }
  }

  gesturestart(e) {
    e.preventDefault();
  }

  gesturechange(e) {
    e.preventDefault();
    const pointer = new Vec({x: e.clientX, y: e.clientY});
    const a = this.toAbsolute(pointer);

    // Resize the canvas
    const factor = 1 + 0.05 * (e.scale - 1);
    this.scale = clamp(this.scale * factor, 0.3, 3.0);

    // Re-position so mouse remains where it was
    const b = this.toAbsolute(pointer);
    const delta = b.sub(a);
    this.origin = this.origin.sub(delta);

    // Render all the children in the new spots
    // For staged children, keep the viewport, but update the absolute position.
    this.children.filter(c => !c.inStage).map(c => c.render());
    this.children.filter(c => c.inStage).map(c => {
      c.position = this.toAbsolute(c.getViewportPosition());
    });
  }

  gestureend(e) {
    e.preventDefault();
  }

  dblclick(e) {
    e.preventDefault();
    e.stopPropagation();

  }
}

class Node {
  constructor({x, y, z, w, type, path}) {
    this.elem = document.createElement("div");
    this.elem.style.position = "absolute";
    const content = this.createContent(type, path);
    this.elem.appendChild(content);

    // Depths:
    // 0: scene
    // 1: items in scene
    // 2: stage
    // 3: items in stage
    // 4: item in focus

    // Positioning and rendering
    this.scene = null;
    this.position = new Vec({x: x, y: y});
    this.width = w;
    this.depth = z;
    this.inStage = false;
    this.stageWidth = 120;

    // Interaction helpers
    this.dragging = false;
    this.click = null;

    this.elem.addEventListener("mousedown", (e) => this.mousedown(e));
    this.elem.addEventListener('mousemove', (e) => this.mousemove(e));
    this.elem.addEventListener('mouseup', (e) => this.mouseup(e));
  }

  serialize() {
    return {
      x: this.position.x,
      y: this.position.y,
      z: this.depth,
      w: this.width,
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
    const w = this.inStage ? this.stageWidth : this.scene.scale * this.width;
    this.elem.style.left = pos.x;
    this.elem.style.top = pos.y;
    this.elem.style.width = w;
    this.elem.style.zIndex = this.depth;
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

    this.depth = 4;
    this.render();
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
    if (this.dragging) {
      this.dragging = false;

      const click = new Vec({x: e.clientX, y: e.clientY});
      if (this.scene.inStage(click)) {
        this.inStage = true;

        const nodePos = this.getViewportPosition();
        const nodeBox = this.elem.getBoundingClientRect();
        const stageBox = this.scene.stage.getBoundingClientRect();

        this.setViewportPosition(new Vec({
          x: Math.min(click.x, stageBox.left + (stageBox.width - this.stageWidth) / 2),
          y: nodeBox.y,
        }));
        this.render();

      } else {
        this.inStage = false;
        this.render();
      }
    }

    this.scene.children.map(c => {
      c.depth = c.inStage ? 3 : 1;
      c.render();
    })
  }
}
