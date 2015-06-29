from collections import namedtuple

PRIORITY = 100

class MenuItem(object):

    def __init__(self, **kwargs):
        self.__dict__.update(**kwargs)

class Panel(object):

    def __init__(self, name, title, content, width=500, height=600, isIframe=True,
                 showTitle=True, isCloseable=True, isPrivate=False, priority=None):
        self.name = name
        self.title = title
        self.content = content
        self.width = width
        self.height = height
        self.isIfframe = isIframe
        self.showTitle = showTitle
        self.isCloseable = isCloseable
        self.isPrivate = isPrivate
        if priority is None:
            global PRIORITY
            PRIORITY += 100
            priority = PRIORITY
        self.priority = priority
