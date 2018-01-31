"""
Using Completion class from
    https://github.com/jonathanslenders/python-prompt-toolkit/
            blob/master/prompt_toolkit/completion.py
"""

from __future__ import unicode_literals

__all__ = (
    'Completion'
)


class Completion(object):
    """
    :param text: The new string that will be inserted into the document.
    :param start_position: Position relative to the cursor_position where the
        new text will start. The text will be inserted between the
        start_position and the original cursor position.
    :param display: (optional string) If the completion has to be displayed
        differently in the completion menu.
    :param display_meta: (Optional string) Meta information about the
        completion, e.g. the path or source where it's coming from.
    :param get_display_meta: Lazy `display_meta`. Retrieve meta information
        only when meta is displayed.
    """

    def __init__(self, text, start_position=0, display=None, display_meta=None,
                 get_display_meta=None):
        self.text = text
        self.start_position = start_position
        self._display_meta = display_meta
        self._get_display_meta = get_display_meta

        if display is None:
            self.display = text
        else:
            self.display = display

        assert self.start_position <= 0

    def __repr__(self):
        return '%s(text=%r, start_position=%r)' % (
            self.__class__.__name__, self.text, self.start_position)

    def __eq__(self, other):
        return (
            self.text == other.text and
            self.start_position == other.start_position and
            self.display == other.display and
            self.display_meta == other.display_meta)

    def __hash__(self):
        return hash(
            (self.text, self.start_position, self.display, self.display_meta)
        )

    @property
    def display_meta(self):
        # Return meta-text. (This is lazy when using "get_display_meta".)
        if self._display_meta is not None:
            return self._display_meta

        elif self._get_display_meta:
            self._display_meta = self._get_display_meta()
            return self._display_meta

        else:
            return ''
