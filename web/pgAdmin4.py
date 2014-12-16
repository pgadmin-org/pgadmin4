import os, sys, inspect
from time import time,ctime
from flask import Flask

app = Flask(__name__)

# The main index page
@app.route("/")
def index():

    output = """
Today is <b>%s</b>
<br />
<i>This is Flask-generated HTML.</i>
<br /><br />
<a href="http://www.pgadmin.org/">pgAdmin 4</a>""" % ctime(time())

    return output


# A special URL used to "ping" the server
@app.route("/ping")
def ping():
    return "PING"

# Start the web server. The port number should have already been set by the
# runtime if we're running in desktop mode, otherwise we'll just use the 
# Flask default.
if 'PGADMIN_PORT' in globals():
    server_port = PGADMIN_PORT
else:
    server_port = 5000

if __name__ == '__main__':
    try:
        app.run(port=server_port)
    except IOError:
        print "Unexpected error: ", sys.exc_info()[0]

