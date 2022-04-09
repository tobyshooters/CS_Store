## CS_Store

An infinite canvas for your filesystem. 

### Some design decisions
1. All canvas state is stored in `.CS_Store` files. To send a canvas to
   someone, simply zip the directory and email it over.
2. Human-readable format for `.CS_Store` which can be manually edited with any
   text editor.
3. Size-as-context: When an element is added to the canvas, it's a fixed size
   in pixel width. To add a small comment, zoom-in to the context it concerns.
4. Audio as region: Sound files are played when visible in the canvas. Drop a
   file in to function as a soundtrack for a region of space.

### Installation
1. Make sure you have the packages in `requirements.txt` installed
2. Add `display` to your path or move it to a bin in your path.
3. Run `display`!

### To Do:
1. Watch for changes to the `.CS_Store`
2. Store text as `.txt` files, rather than in `.CS_Store`
