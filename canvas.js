class Node {
  constructor({x, y, z, h = null, w = null, data}) {
    this.data = data;
    this.type = data.type;
    this.path = data.path;
    this.inStage = false;
    this.elem = document.createElement("div");

    // Depths:
    // 0: scene
    // 1: items in scene
    // 2: stage
    // 3: items in stage
    // 4: item in focus

    // Positioning and rendering
    this.position = new Vec({x, y});
    this.depth = z;
    this.width = w;
    this.height = h;
    this.ratio = 1;

    const content = this.populateContent(data);
    this.elem.appendChild(content);

    // Interaction helpers
    this.dragging = false;
    this.click = null;

    this.elem.addEventListener("mousedown", (e) => this.mousedown(e));
    this.elem.addEventListener('mousemove', (e) => this.mousemove(e));
    this.elem.addEventListener('mouseup', (e) => this.mouseup(e));
    this.elem.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  serialize() {
    return {
      x: this.position.x,
      y: this.position.y,
      z: this.depth,
      h: this.height,
      w: this.width,
      data: this.data,
    }
  }

  clone() {
    return new this.constructor(this.serialize());
  }

  populateContent(data) {
    let {type, path} = data;

    if (type === "image/jpeg" || type === "image/png") {
      const img = document.createElement("img");
      img.style.width = "100%";
      img.onload = () => {
        this.ratio = img.width / img.height;
      }
      img.src = path;
      return img;

    } else if (type === "video/mp4") {
      const video = document.createElement("video");
      video.controls = true;
      video.style.width = "100%";
      video.onload = () => {
        this.ratio = img.width / img.height;
      }
      video.src = path;
      return video;

    } else if (type === "application/pdf") {
      const pdf = document.createElement("iframe");
      pdf.style.width = "100%";
      this.ratio = 1 / 1.2941;
      pdf.src = path;
      return pdf;

    } else if (type === "text") {
      const p = document.createElement("p");
      p.contentEditable = "true";
      p.classList.add("textNode");
      p.innerHTML = path;
      p.onclick = () => p.focus();
      p.onkeypress = (e) => {
        if (e.key === "Enter") {
          p.blur();
        }
      }
      p.onkeyup = (e) => {
        this.path = p.innerHTML;
        this.render();
      }
      this.height = 14 / scene.scale;
      this.width = 200 / scene.scale;

      this.elem.style.margin = "0px";
      this.elem.style.backgroundColor = "#eee8d5";
      return p;

    } else if (type === "dir") {
      const p = document.createElement("p");
      p.style.border = "1px black dotted"
      p.style.padding = 20;
      p.style.textAlign = "center";
      p.style.wordBreak = "break-all";
      p.innerHTML = path;

      p.ondblclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        ws.send(JSON.stringify({
          "type": "cd",
          "path": data.absolute,
        }));
      }

      return p
    }
  }

  render() {
    const pos = scene.toViewport(this.position);
    this.elem.style.left = pos.x;
    this.elem.style.top = pos.y;
    this.elem.style.zIndex = this.depth;

    if (this.type === "text" || this.type === "dir") {
      this.elem.style.width = (this.width * scene.scale) + "px";
      this.elem.style.fontSize = (this.height * scene.scale) + "px";
    } else {
      this.elem.style.width = this.width * scene.scale;
      this.elem.style.height = this.height * scene.scale;
    }
  }

  setSizeToScale() {
    if (this.ratio > 1) {
      this.width = 200 / scene.scale;
      this.height = this.width / this.ratio;
    } else {
      this.height = 200 / scene.scale;
      this.width = this.height * this.ratio;
    }
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
    this.position = scene.toAbsolute(v);
  }

  moveInViewport(delta) {
    const pos = this.getViewportPosition();
    this.setViewportPosition(pos.add(delta));
  }

  mousedown(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.altKey) {
      scene.removeNode(this);
      return;
    }

    this.dragging = true;
    this.click = new Vec({x: e.clientX, y: e.clientY});

    if (this.inStage) {
      const copy = this.clone();
      copy.depth = 4;
      copy.ratio = this.ratio;
      copy.setSizeToScale();

      const rect = this.elem.getBoundingClientRect();
      const pos = new Vec({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      copy.position = scene.toAbsolute(this.click.sub(pos));
      scene.addNode(copy);
      copy.elem.dispatchEvent(new Event('mousedown'));

    } else {
      this.depth = 4;
      this.render();
    }
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
      this.render();
      this.depth = 1;
    }
  }
}

class Scene {
  constructor(elem) {
    this.elem = elem;
    this.origin = new Vec({x: 0, y: 0});
    this.scale = 1;
    this.children = [];

    this.elem.addEventListener("wheel", (e) => this.wheel(e));
    this.elem.addEventListener("gesturestart", (e) => e.preventDefault());
    this.elem.addEventListener("gesturechange", (e) => this.gesturechange(e));
    this.elem.addEventListener("gestureend", (e) => e.preventDefault());
    this.elem.addEventListener("mousedown", (e) => e.preventDefault());
    this.elem.addEventListener("mousemove", (e) => e.preventDefault());
    this.elem.addEventListener("mouseup", (e) => e.preventDefault());
    this.elem.addEventListener("dblclick", (e) => this.dblclick(e));
  }

  serialize() {
    return {
      origin: this.origin,
      scale: this.scale,
      children: this.children.map(c => c.serialize()),
    }
  }

  toViewport(x) {
    return x.sub(this.origin).times(this.scale);
  }

  toAbsolute(x) {
    return x.times(1/this.scale).add(this.origin);
  }

  addNode(node) {
    node.elem.classList.add("nodeInScene");
    this.elem.appendChild(node.elem);
    this.children.push(node);
    node.render();
  }

  removeNode(node) {
    node.elem.classList.remove("nodeInScene");
    this.elem.removeChild(node.elem);
    const idx = this.children.indexOf(node);
    this.children.splice(idx, 1);
  }

  render() {
    this.children.map(c => c.render());
  }

  wheel(e) {
    // dev.to/danburzo/pinch-me-i-m-zooming-gestures-in-the-dom-a0e
    e.preventDefault();

    if (e.ctrlKey) {
      const pointer = new Vec({x: e.clientX, y: e.clientY});
      const a = this.toAbsolute(pointer);

      this.scale = clamp(this.scale - 0.01 * e.deltaY, 0.3, 3.0);

      // Re-position so mouse remains where it was
      const b = this.toAbsolute(pointer);
      const delta = b.sub(a);
      this.origin = this.origin.sub(delta);
      this.render();

    } else {
      const delta = new Vec({x: -e.deltaX, y: -e.deltaY});
      this.origin = this.origin.add(delta);
      this.render();
    }
  }

  gesturechange(e) {
    e.preventDefault();
    const pointer = new Vec({x: e.clientX, y: e.clientY});
    const a = this.toAbsolute(pointer);

    // Resize the canvas
    const factor = 1 + 0.1 * (e.scale - 1);
    this.scale = clamp(this.scale * factor, 0.3, 3.0);

    // Re-position so mouse remains where it was
    const b = this.toAbsolute(pointer);
    const delta = b.sub(a);
    this.origin = this.origin.sub(delta);
    this.render();
  }

  dblclick(e) {
    const click = new Vec({x: e.clientX - 10, y: e.clientY - 10});
    const pos = scene.toAbsolute(click);

    scene.addNode(new Node({
      x: pos.x,
      y: pos.y,
      w: 200,
      h: 100,
      data: {
        type: "text",
        path: "Click to edit."
      }
    }))
  }
}

class Stage {
  constructor(elem) {
    this.elem = elem;
    this.children = [];
  }

  addNode(node) {
    node.inStage = true;
    node.elem.classList.add("nodeInStage");
    this.elem.appendChild(node.elem);
    this.children.push(node);
  }

  removeNode(node) {
    node.inStage = false;
    node.elem.classList.remove("nodeInStage");
    this.elem.removeChild(node.elem);
    const idx = this.children.indexOf(node);
    this.children.splice(idx, 1);
  }

  inStage(v) {
    const bbox = this.elem.getBoundingClientRect();
    return (
      bbox.left < v.x &&
      v.x < bbox.right &&
      bbox.top < v.y &&
      v.y < bbox.bottom
    );
  }
}
