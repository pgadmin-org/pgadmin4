##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

PRIORITY = 100


class MenuItem(object):
    def __init__(self, **kwargs):
        self.__dict__.update(**kwargs)


class Panel(object):
    def __init__(
        self, name, title, content='', width=500, height=600, is_iframe=True,
        show_title=True, is_closeable=True, is_private=False, priority=None,
        icon=None, data=None, events=None, limit=None, can_hide=False
    ):
        self.name = name
        self.title = title
        self.content = content
        self.width = width
        self.height = height
        self.isIframe = is_iframe
        self.showTitle = show_title
        self.isCloseable = is_closeable
        self.isPrivate = is_private
        self.icon = icon
        self.data = data
        self.events = events
        self.limit = limit
        self.canHide = can_hide
        if priority is None:
            global PRIORITY
            PRIORITY += 100
            priority = PRIORITY
        self.priority = priority
