import os
import mimetypes
import json

import tornado.ioloop
import tornado.web
import tornado.websocket

VALID_TYPES = ["image/png", "image/jpeg"]

def get_files():
    listing = [(f, mimetypes.guess_type(f)[0]) for f in os.listdir(".")]
    return [
        {
            "path": f,
            "type": t,
        } 
        for f, t in listing if t in VALID_TYPES
    ]


class WSHandler(tornado.websocket.WebSocketHandler):
    def on_message(self, message):
        if message == "initialize":
            self.write_message(json.dumps(get_files()))

if __name__ == "__main__":
    app = tornado.web.Application([
        ("/ws", WSHandler),
        ("/(.*)", tornado.web.StaticFileHandler, {"path": "./", "default_filename": "index.html"}), 
    ])
    app.listen(1234)
    tornado.ioloop.IOLoop.current().start()
