##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

PRIORITY = 100


class MenuItem(object):
    def __init__(self, **kwargs):
        self.__dict__.update(**kwargs)


class Panel(object):
    def __init__(
        self, name, title, content='', width=500, height=600, **kwargs
    ):
        self.name = name
        self.title = title
        self.content = content
        self.width = width
        self.height = height
        self.isIframe = kwargs.get('is_iframe', True)
        self.showTitle = kwargs.get('show_title', True)
        self.isCloseable = kwargs.get('is_closeable', True)
        self.isPrivate = kwargs.get('is_private', None)
        self.icon = kwargs.get('icon', None)
        self.data = kwargs.get('data', None)
        self.events = kwargs.get('events', None)
        self.limit = kwargs.get('limit', False)
        self.canHide = kwargs.get('can_hide', False)
        priority = kwargs.get('priority', None)
        if priority is None:
            global PRIORITY
            PRIORITY += 100
            priority = PRIORITY
        self.priority = priority
