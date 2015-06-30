##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from collections import namedtuple

PRIORITY = 100

class MenuItem(object):

    def __init__(self, **kwargs):
        self.__dict__.update(**kwargs)

class Panel(object):

    def __init__(self, name, title, content, width=500, height=600, isIframe=True,
                 showTitle=True, isCloseable=True, isPrivate=False, priority=None,
                 icon=None, data=None):
        self.name = name
        self.title = title
        self.content = content
        self.width = width
        self.height = height
        self.isIframe = isIframe
        self.showTitle = showTitle
        self.isCloseable = isCloseable
        self.isPrivate = isPrivate
        self.icon = icon
        self.data = None
        if priority is None:
            global PRIORITY
            PRIORITY += 100
            priority = PRIORITY
        self.priority = priority
