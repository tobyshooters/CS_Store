import os
import mimetypes
import json

import tornado.ioloop
import tornado.web
import tornado.websocket

FILE_PATH = os.getcwd()
SRC_PATH = os.path.dirname(__file__)
VALID_TYPES = ["image/png", "image/jpeg", "video/mp4", "application/pdf"]

def get_state():
    all_files = os.listdir(FILE_PATH)

    listing = [(f, mimetypes.guess_type(f)[0]) for f in all_files]
    files = [{ "path": f"/files/{f}", "type": t } for f, t in listing if t in VALID_TYPES]

    user_dirs = [f for f in all_files if os.path.isdir(f) and f[0] != "."]
    directories = sorted([
        {
            "type": "dir", 
            "path": f,
            "absolute": os.path.join(FILE_PATH, f)
        } 
        for f in user_dirs
    ], key=lambda x: x["path"].lower())

    parent = {
        "type": "dir", 
        "path": "parent",
        "absolute": os.path.split(FILE_PATH)[0],
    }

    directories = [parent] + directories

    layout = {}
    if ".CS_Store" in all_files:
        with open(f"{FILE_PATH}/.CS_Store", "r") as f:
            layout = json.loads(f.read())

    return { 
        "files": [*directories, *files], 
        "layout": layout,
        "path": FILE_PATH,
    }


class WSHandler(tornado.websocket.WebSocketHandler):
    def on_message(self, message):
        global FILE_PATH

        message = json.loads(message)
        if message["type"] == "initialize":
            self.write_message(json.dumps(get_state()))

        elif message["type"] ==  "layout":
            with open(f"{FILE_PATH}/.CS_Store", "w") as f:
                f.write(json.dumps(message["layout"], indent=4))

        elif message["type"] == "cd":
            FILE_PATH = message["path"]
            os.chdir(FILE_PATH)
            server.restart()
            self.write_message(json.dumps(get_state()))


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

    def restart(self):
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
