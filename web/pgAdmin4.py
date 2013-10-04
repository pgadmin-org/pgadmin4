import os, sys, inspect

# We need to include the include/ directory in sys.path to ensure that we can
# fine everything we need when running in the standalone runtime. This tries
# to find the "real" path to use, regardless of any symlinks.
includedir = os.path.realpath(os.path.abspath(os.path.join(os.path.split(inspect.getfile(inspect.currentframe()))[0],"include")))
if includedir not in sys.path:
    sys.path.insert(0, includedir)

# Rock n' roll...
import cherrypy
from time import time,ctime


# This is the main application class that we'll run under CherryPy. For now,
# we'll just output some basic HTML so we can see that everything is running.
class pgAdmin4(object):
    def index(self):
        output = """
Today is <b>%s</b>
<br />
<i>This is CherryPy-generated HTML.</i>
<br /><br />
<a href="http://www.pgadmin.org/">pgAdmin 4</a>""" % ctime(time())

        return output

    index.exposed = True


# Start the web server. The port number should have already been set by the
# runtime if we're running in desktop mode, otherwise we'll just use the 
# CherryPy default.

try:
    cherrypy.server.socket_port = PGADMIN_PORT
except:
    pass

try:
    cherrypy.quickstart(pgAdmin4())
except IOError:
    print "Unexpected error: ", sys.exc_info()[0]
    
