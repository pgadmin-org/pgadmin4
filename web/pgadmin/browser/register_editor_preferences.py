##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask_babel import gettext
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.constants import PREF_LABEL_OPTIONS,\
    PREF_LABEL_KEYBOARD_SHORTCUTS, PREF_LABEL_SQL_FORMATTING
from pgadmin.utils import SHORTCUT_FIELDS as shortcut_fields

UPPER_CASE_STR = gettext('Upper case')
LOWER_CASE_STR = gettext('Lower case')
PRESERVE_STR = gettext('Preserve')


def register_editor_preferences(self):
    """
    Registers the editor preferences
    """

    self.editor_preference = Preferences(
        'editor', gettext('Editor')
    )

    self.editor_preference.register(
        'keyboard_shortcuts',
        'find',
        gettext('Find'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': False,
            'control': True,
            'ctrl_is_meta': True,
            'key': {
                'key_code': 70,
                'char': 'f'
            }
        },
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
        fields=shortcut_fields
    )

    self.editor_preference.register(
        'keyboard_shortcuts',
        'replace',
        gettext('Replace'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': False,
            'control': True,
            'ctrl_is_meta': True,
            'key': {
                'key_code': 70,
                'char': 'f'
            }
        },
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
        fields=shortcut_fields
    )

    self.editor_preference.register(
        'keyboard_shortcuts',
        'goto_line_col',
        gettext('Go to line/column'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': False,
            'control': True,
            'ctrl_is_meta': True,
            'key': {
                'key_code': 76,
                'char': 'l'
            }
        },
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
        fields=shortcut_fields
    )

    self.editor_preference.register(
        'keyboard_shortcuts',
        'comment',
        gettext('Toggle comment'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': False,
            'control': True,
            'ctrl_is_meta': True,
            'key': {
                'key_code': 191,
                'char': '/'
            }
        },
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
        fields=shortcut_fields
    )

    self.editor_preference.register(
        'keyboard_shortcuts',
        'format_sql',
        gettext('Format SQL'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': False,
            'control': True,
            'ctrl_is_meta': True,
            'key': {
                'key_code': 75,
                'char': 'k'
            }
        },
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
        fields=shortcut_fields
    )

    self.editor_preference.register(
        'options', 'plain_editor_mode',
        gettext("Plain text mode?"), 'boolean', False,
        category_label=PREF_LABEL_OPTIONS,
        help_str=gettext(
            'When set to True, keywords won\'t be highlighted and code '
            'folding will be disabled. Plain text mode will improve editor '
            'performance with large files.'
        )
    )

    self.editor_preference.register(
        'options', 'code_folding',
        gettext("Code folding?"), 'boolean', True,
        category_label=PREF_LABEL_OPTIONS,
        help_str=gettext(
            'Enable or disable code folding. In plain text mode, this will '
            'have no effect as code folding is always disabled in that mode. '
            'Disabling will improve editor performance with large files.'
        )
    )

    self.editor_preference.register(
        'options', 'cursor_blink_rate',
        gettext("Cursor blink rate"), 'options', 'medium',
        category_label=PREF_LABEL_OPTIONS,
        options=[{'label': gettext('None'), 'value': 'none'},
                 {'label': gettext('Slow'), 'value': 'slow'},
                 {'label': gettext('Medium'), 'value': 'medium'},
                 {'label': gettext('Fast'), 'value': 'fast'}],
        control_props={
            'allowClear': False,
            'creatable': False,
        },
        help_str=gettext(
            'Adjust the speed at which the text cursor blinks within '
            'the editors.'
        )
    )

    self.editor_preference.register(
        'options', 'wrap_code',
        gettext("Line wrapping?"), 'boolean', False,
        category_label=PREF_LABEL_OPTIONS,
        help_str=gettext(
            'Specifies whether or not to wrap SQL code in the editor.'
        )
    )

    self.editor_preference.register(
        'options', 'insert_pair_brackets',
        gettext("Insert bracket pairs?"), 'boolean', True,
        category_label=PREF_LABEL_OPTIONS,
        help_str=gettext(
            'Specifies whether or not to insert paired brackets in the '
            'editor.'
        )
    )

    self.editor_preference.register(
        'options', 'highlight_selection_matches',
        gettext("Highlight selection matches?"), 'boolean', True,
        category_label=PREF_LABEL_OPTIONS,
        help_str=gettext(
            'Specifies whether or not to highlight matched selected text '
            'in the editor.'
        )
    )

    self.editor_preference.register(
        'options', 'brace_matching',
        gettext("Brace matching?"), 'boolean', True,
        category_label=PREF_LABEL_OPTIONS,
        help_str=gettext(
            'Specifies whether or not to highlight matched braces '
            'in the editor.'
        )
    )

    self.editor_preference.register(
        'options', 'sql_font_size',
        gettext("Font size"), 'numeric', '1',
        min_val=0.1,
        max_val=10,
        category_label=PREF_LABEL_OPTIONS,
        help_str=gettext(
            'The font size to use for the SQL text boxes and editors. '
            'The value specified is in "em" units, in which 1 is the '
            'default relative font size. For example, to increase the '
            'font size by 20 percent use a value of 1.2, or to reduce '
            'by 20 percent, use a value of 0.8. Minimum 0.1, maximum 10.'
        )
    )

    self.editor_preference.register(
        'options', 'sql_font_ligatures',
        gettext("Font ligatures?"), 'boolean',
        False, category_label=PREF_LABEL_OPTIONS,
        help_str=gettext(
            'If set to true, ligatures will be enabled in SQL text boxes '
            'and editors provided the configured font family supports them.'
        )
    )

    self.editor_preference.register(
        'options', 'sql_font_family',
        gettext("Font family"), 'text', 'Source Code Pro',
        category_label=PREF_LABEL_OPTIONS,
        help_str=gettext(
            'Specify the font family to be used for all SQL editors. '
            'The specified font should already be installed on your system. '
            'If the font is not found, the editor will fall back to the '
            'default font, Source Code Pro.'
        )
    )

    self.editor_preference.register(
        'options', 'indent_new_line',
        gettext("Auto-indent new line?"), 'boolean', True,
        category_label=PREF_LABEL_OPTIONS,
        help_str=gettext(
            'Specifies whether the newly added line using enter key should '
            'be auto-indented or not'
        )
    )

    self.editor_preference.register(
        'sql_formatting', 'keyword_case',
        gettext("Keyword case"), 'radioModern', 'upper',
        options=[{'label': UPPER_CASE_STR, 'value': 'upper'},
                 {'label': LOWER_CASE_STR, 'value': 'lower'},
                 {'label': PRESERVE_STR, 'value': 'preserve'}],
        category_label=PREF_LABEL_SQL_FORMATTING,
        help_str=gettext(
            'Convert keywords to upper, lower, or preserve casing.'
        )
    )

    self.editor_preference.register(
        'sql_formatting', 'identifier_case',
        gettext("Identifier case"), 'radioModern', 'upper',
        options=[{'label': UPPER_CASE_STR, 'value': 'upper'},
                 {'label': LOWER_CASE_STR, 'value': 'lower'},
                 {'label': PRESERVE_STR, 'value': 'preserve'}],
        category_label=PREF_LABEL_SQL_FORMATTING,
        help_str=gettext(
            'Convert identifiers to upper, lower, or preserve casing.'
        )
    )

    self.editor_preference.register(
        'sql_formatting', 'function_case',
        gettext("Function case"), 'radioModern', 'upper',
        options=[{'label': UPPER_CASE_STR, 'value': 'upper'},
                 {'label': LOWER_CASE_STR, 'value': 'lower'},
                 {'label': PRESERVE_STR, 'value': 'preserve'}],
        category_label=PREF_LABEL_SQL_FORMATTING,
        help_str=gettext(
            'Convert function names to upper, lower, or preserve casing.'
        )
    )

    self.editor_preference.register(
        'sql_formatting', 'data_type_case',
        gettext("Data type case"), 'radioModern', 'upper',
        options=[{'label': UPPER_CASE_STR, 'value': 'upper'},
                 {'label': LOWER_CASE_STR, 'value': 'lower'},
                 {'label': PRESERVE_STR, 'value': 'preserve'}],
        category_label=PREF_LABEL_SQL_FORMATTING,
        help_str=gettext(
            'Convert data types to upper, lower, or preserve casing.'
        )
    )

    self.editor_preference.register(
        'sql_formatting', 'spaces_around_operators',
        gettext("Spaces around operators?"), 'boolean', True,
        category_label=PREF_LABEL_SQL_FORMATTING,
        help_str=gettext('If set to True, spaces are used around all '
                         'operators.')
    )

    self.editor_preference.register(
        'sql_formatting', 'tab_size',
        gettext("Tab size"), 'integer', 4,
        min_val=2,
        max_val=8,
        category_label=PREF_LABEL_SQL_FORMATTING,
        help_str=gettext(
            'The number of spaces per tab. Minimum 2, maximum 8.'
        )
    )

    self.editor_preference.register(
        'sql_formatting', 'use_spaces',
        gettext("Use spaces?"), 'boolean', False,
        category_label=PREF_LABEL_SQL_FORMATTING,
        help_str=gettext(
            'Specifies whether or not to insert spaces instead of tabs '
            'when the tab key or auto-indent are used.'
        )
    )

    self.editor_preference.register(
        'sql_formatting', 'expression_width',
        gettext("Expression Width"), 'integer', 50,
        category_label=PREF_LABEL_SQL_FORMATTING,
        help_str=gettext(
            'maximum number of characters in parenthesized expressions to be '
            'kept on single line.'
        )
    )

    self.editor_preference.register(
        'sql_formatting', 'logical_operator_new_line',
        gettext("Logical operator new line"), 'radioModern', 'before',
        options=[{'label': gettext('Before'), 'value': 'before'},
                 {'label': gettext('After'), 'value': 'after'}],
        category_label=PREF_LABEL_SQL_FORMATTING,
        help_str=gettext(
            'Decides newline placement before or after logical operators '
            '(AND, OR, XOR).'
        )
    )

    self.editor_preference.register(
        'sql_formatting', 'lines_between_queries',
        gettext("Lines between queries"), 'integer', 1,
        min_val=0,
        max_val=5,
        category_label=PREF_LABEL_SQL_FORMATTING,
        help_str=gettext(
            'Decides how many empty lines to leave between SQL statements. '
            'If zero it puts no new line.'
        )
    )

    self.editor_preference.register(
        'sql_formatting', 'new_line_before_semicolon',
        gettext("New line before semicolon?"), 'boolean', False,
        category_label=PREF_LABEL_SQL_FORMATTING,
        help_str=gettext(
            'Whether to place query separator (;) on a separate line.'
        )
    )
