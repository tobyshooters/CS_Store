const largestZ = (layout) => Math.max(...layout.map(e => e.z || 0));

let scale = 1;

let layout = [
  {
    path: "_DSF3464.jpg",
    type: "image/jpeg",
    visible: true,
    x: 50,
    y: 50,
    z: 2,
    w: 200,
  },
  {
    path: "_DSF2796.jpg",
    type: "image/jpeg",
    visible: true,
    x: 50,
    y: 300,
    z: 1,
    w: 200,
  }
]

const makeThumbnail = (data) => {
  const img = document.createElement("img");
  img.src = data.path;
  img.style.width = "90%";
  img.style.padding = "10px";

  const div = document.createElement("div");
  div.appendChild(img)

  const mouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Duplicate data
    let dup = {
      ...data,
      visible: true,
      x: 20, 
      y: 20,
      z: largestZ(layout) + 1,
      w: 200,
    }
    layout.push(dup);
    let div = createCanvasElement(dup);
    document.getElementById('canvas').appendChild(div);
  }

  div.addEventListener('mousedown', mouseDown);
  return div;
}

const createCanvasElement = (data) => {
  let [x, y] = [data.x, data.y];

  let elem;
  if (["image/jpeg", "image/png"].includes(data.type)) {
    elem = document.createElement("img");
    elem.src = data.path;
    elem.width = data.w;
  }

  const div = document.createElement("div");
  div.style.position = 'absolute';
  div.style.left = data.x;
  div.style.top = data.y;
  div.style.zIndex = data.z;
  div.appendChild(elem);

  // Store reference for easy access
  data.canvasElem = div;

  const mouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Don't call parent's mouseDown

    [x, y] = [e.clientX, e.clientY];

    // Pop to front
    const z = largestZ(layout);
    div.style.zIndex = z + 1
    data.z = z + 1;

    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
  }

  const mouseMove = (e) => {
    const [dx, dy] = [e.clientX - x, e.clientY - y];

    div.style.left = dx + parseInt(div.style.left.slice(0, -2));
    div.style.top = dy + parseInt(div.style.top.slice(0, -2));

    [x, y] = [e.clientX, e.clientY];
  }

  const mouseUp = () => {
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('mouseup', mouseUp);
  }

  div.addEventListener('mousedown', mouseDown);
  return div;
}

const makeCanvasInfinite = (canvas) => {
  let x, y;

  let pointerFromEvent = e => {
    const rect = e.target.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  canvas.addEventListener("wheel", e => {
    // dev.to/danburzo/pinch-me-i-m-zooming-gestures-in-the-dom-a0e
    e.preventDefault();

    if (!this.interactionHandled) {
      if (e.ctrlKey) {
        // Get mouse position from event
        const pointer = pointerFromEvent(e);

        // Scale the canvas
        const sx = this.elem.scale.x - 0.01 * e.deltaY;
        const sy = this.elem.scale.y - 0.01 * e.deltaY;
        this.elem.scale.x = clamp(sx, 0.25, 3.0);
        this.elem.scale.y = clamp(sy, 0.25, 3.0);

        // Re-position such that mouse remains where it was
        const offset = this.windowToScene(pointer).minus(mouseScene);
        const delta = offset.times(this.elem.scale.x);
        this.pos = this.pos.add(delta);
        this.render();
      } else {
        const [dx, dy] = [e.deltaX, e.deltaY];
        layout.map(d => {
          if (d.visible) {
            let currX = parseInt(d.canvasElem.style.left.slice(0, -2));
            let currY = parseInt(d.canvasElem.style.top.slice(0, -2));
            d.canvasElem.style.left = currX + Math.floor(dx / 3);
            d.canvasElem.style.top = currY + Math.floor(dy / 3);
          }
        })
      }
    }
  });

  canvas.addEventListener("gesturestart", e => {
    e.preventDefault();
  });

  canvas.addEventListener("gesturechange", e => {
    e.preventDefault();

    // Scale the canvas
    console.log("TEST");
    const factor = 1 + 0.1 * (e.scale - 1);
    scale *= factor;
  });

  canvas.addEventListener("gestureend", e => {
    e.preventDefault();
  });
}

let ws = new WebSocket("ws://localhost:1234/ws");
ws.onmessage = e => {
  const state = JSON.parse(e.data);
  const files = state.files;

  const stage = document.getElementById("stage");
  const canvas = document.getElementById("canvas");

  makeCanvasInfinite(canvas);

  files.map(d => {
    let data = {
      path: d.path,
      type: d.type,
      visible: false,
    }
    layout.push(data);
    stage.appendChild(makeThumbnail(data));
  })

  layout.filter(d => d.visible)
    .map(createCanvasElement)
    .map(e => canvas.appendChild(e));
}
ws.onopen = e => {
  ws.send("initialize");
}
