import os, sys, inspect

# We need to include the include/ directory in sys.path to ensure that we can
# fine everything we need when running in the standalone runtime. This tries
# to find the "real" path to use, regardless of any symlinks.
includedir = os.path.realpath(os.path.abspath(os.path.join(os.path.split(inspect.getfile(inspect.currentframe()))[0],"include")))
if includedir not in sys.path:
    sys.path.insert(0, includedir)

# Do some stuff
import cherrypy
from time import time,ctime

class HelloWorld(object):
    def index(self):
        output = """
Today is <b>%s</b>
<br />
<i>This is CherryPy-generated HTML.</i>
<br /><br />
<a href="http://www.pgadmin.org/">pgAdmin 4</a>""" % ctime(time())

        return output
    index.exposed = True

cherrypy.quickstart(HelloWorld())
