##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

class AbsProvider:
    """ Abstract provider """
    parser = None

    def init_args(self, parsers):
        """Not Required."""
        pass

    def commands(self):
        """ Get the list of commands for the current provider. """
        attrs = filter(lambda attr: attr.startswith('cmd_'), dir(self))
        commands = {}

        for attr in attrs:
            method = getattr(self, attr)
            commands[attr[4:]] = method

        return commands

    def cmd_help(self):
        """ Prints the provider level help """
        self.parser.print_help()
