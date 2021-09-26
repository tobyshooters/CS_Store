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

    layout = {}
    if ".CS_Store" in all_files:
        with open(f"{FILE_PATH}/.CS_Store", "r") as f:
            layout = json.loads(f.read())

    return { 
        "files": files, 
        "layout": layout,
        "path": FILE_PATH,
    }


class WSHandler(tornado.websocket.WebSocketHandler):
    def on_message(self, message):
        message = json.loads(message)
        if message["type"] == "initialize":
            self.write_message(json.dumps(get_state()))

        elif message["type"] ==  "layout":
            with open(f"{FILE_PATH}/.CS_Store", "w") as f:
                f.write(json.dumps(message["layout"]))


if __name__ == "__main__":
    print("Files:", FILE_PATH)
    print("Code:", SRC_PATH)

    app = tornado.web.Application([
        (r'/ws', WSHandler),
        (r'/static/(.*)', tornado.web.StaticFileHandler, { "path": SRC_PATH      }),
        (r'/files/(.*)',  tornado.web.StaticFileHandler, { "path": FILE_PATH     }),
    ])
    app.listen(1234)
    tornado.ioloop.IOLoop.current().start()
