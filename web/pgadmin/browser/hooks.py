##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser application hooks"""

import os, sys
import config

from . import nodes

def register_submodules(app):
    """Register any child node blueprints"""
    path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'nodes')
    sys.path.insert(0, path)
    files = os.listdir(path)

    for f in files:
        d = os.path.join(path, f)
        if os.path.isdir(d) and os.path.isfile(os.path.join(d, '__init__.py')):

            if f in config.NODE_BLACKLIST:
                app.logger.info('Skipping blacklisted node: %s' % f)
                continue

            # Looks like a node, so import it, and register the blueprint if present
            # We rely on the ordering of syspath to ensure we actually get the right
            # module here. 
            app.logger.info('Examining potential node: %s' % d)
            node = __import__(f, globals(), locals(), ['hooks', 'views'], -1)

            # Add the node to the global module list
            nodes.append(node)
            
            # Register the blueprint if present
            if 'views' in dir(node) and 'blueprint' in dir(node.views):
                app.logger.info('Registering blueprint node: %s' % f)
                app.register_blueprint(node.views.blueprint)
                app.logger.debug('   - root_path:       %s' % node.views.blueprint.root_path)
                app.logger.debug('   - static_folder:   %s' % node.views.blueprint.static_folder)
                app.logger.debug('   - template_folder: %s' % node.views.blueprint.template_folder)
                
            # Register any sub-modules
            if 'hooks' in dir(node) and 'register_submodules' in dir(node.hooks):
                app.logger.info('Registering sub-modules in %s' % f)
                node.hooks.register_submodules(app)