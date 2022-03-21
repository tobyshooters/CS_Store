import os
import mimetypes
import json

import tornado.ioloop
import tornado.web
import tornado.websocket

FILE_PATH = os.getcwd()
SRC_PATH = os.path.dirname(__file__)
VALID_TYPES = ["image/png", "image/jpeg", "video/mp4", "application/pdf", "audio/mpeg"]

def pwd():
    files = [{
        "type": "dir", 
        "path": "parent",
        "absolute": os.path.split(FILE_PATH)[0],
    }]

    listing = os.listdir(FILE_PATH)
    for f in listing:
        t = mimetypes.guess_type(f)[0]
        if t in VALID_TYPES:
            files.append({ 
                "type": t,
                "path": f"/files/{f}", 
            })
        elif os.path.isdir(f) and f[0] != ".":
            files.append({
                "type": "dir", 
                "path": f,
                "absolute": os.path.join(FILE_PATH, f)
            })

    layout = {}
    if ".CS_Store" in listing:
        with open(f"{FILE_PATH}/.CS_Store", "r") as f:
            layout = json.loads(f.read())

    return { 
        "path": FILE_PATH,
        "files": files,
        "layout": layout,
    }


class WSHandler(tornado.websocket.WebSocketHandler):
    def on_message(self, message):
        global FILE_PATH

        message = json.loads(message)
        if message["type"] == "initialize":
            self.write_message(json.dumps(pwd()))

        elif message["type"] ==  "layout":
            with open(f"{FILE_PATH}/.CS_Store", "w") as f:
                f.write(json.dumps(message["layout"], indent=4))

        elif message["type"] == "cd":
            FILE_PATH = message["path"]
            os.chdir(FILE_PATH)
            server.redirect()
            self.write_message(json.dumps(pwd()))


class Server:
    def __init__(self):
        pass

    def start(self):
        self.app = tornado.web.Application([
            (r'/ws', WSHandler),
            (r'/static/(.*)', tornado.web.StaticFileHandler, { "path": SRC_PATH  }),
            (r'/files/(.*)',  tornado.web.StaticFileHandler, { "path": FILE_PATH }),
        ])
        self.server = self.app.listen(1234)
        tornado.ioloop.IOLoop.current().start()

    def redirect(self):
        global FILE_PATH, SRC_PATH
        
        self.app.default_router.rules = []
        self.app.add_handlers(r".*", [
            (r'/ws', WSHandler),
            (r'/static/(.*)', tornado.web.StaticFileHandler, { "path": SRC_PATH  }),
            (r'/files/(.*)',  tornado.web.StaticFileHandler, { "path": FILE_PATH }),
        ])

server = Server()

if __name__ == "__main__":
    print("Files:", FILE_PATH)
    print("Code:", SRC_PATH)
    server.start()
