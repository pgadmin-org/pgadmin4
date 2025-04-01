"""
Using Completion class from
    https://github.com/prompt-toolkit/python-prompt-toolkit/blob/master/src/prompt_toolkit/completion/base.py
"""

__all__ = (
    'Completion'
)


class Completion:
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

    def __repr__(self) -> str:
        if isinstance(self.display, str) and self.display == self.text:
            return "{}(text={!r}, start_position={!r})".format(
                self.__class__.__name__,
                self.text,
                self.start_position,
            )
        else:
            return "{}(text={!r}, start_position={!r}, display={!r})".format(
                self.__class__.__name__,
                self.text,
                self.start_position,
                self.display,
            )

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Completion):
            return False
        return (
            self.text == other.text and
            self.start_position == other.start_position and
            self.display == other.display and
            self._display_meta == other._display_meta
        )

    def __hash__(self) -> int:
        return hash((self.text, self.start_position, self.display,
                     self._display_meta))

    @property
    def display_meta(self):
        # Return meta-text. (This is lazy when using "get_display_meta".)
        if self._display_meta is not None:
            return self._display_meta

    def new_completion_from_position(self, position: int) -> "Completion":
        """
        (Only for internal use!)
        Get a new completion by splitting this one. Used by `Application` when
        it needs to have a list of new completions after inserting the common
        prefix.
        """
        assert position - self.start_position >= 0

        return Completion(
            text=self.text[position - self.start_position:],
            display=self.display,
            display_meta=self._display_meta,
        )
