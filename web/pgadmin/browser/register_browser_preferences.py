##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from flask_babelex import gettext


def register_browser_preferences(self):
    self.show_system_objects = self.preference.register(
        'display', 'show_system_objects',
        gettext("Show system objects?"), 'boolean', False,
        category_label=gettext('Display')
    )

    self.preference.register(
        'display', 'enable_acitree_animation',
        gettext("Enable browser tree animation?"), 'boolean', True,
        category_label=gettext('Display')
    )

    self.preference.register(
        'display', 'enable_alertify_animation',
        gettext("Enable dialogue/notification animation?"), 'boolean',
        True, category_label=gettext('Display')
    )

    self.table_row_count_threshold = self.preference.register(
        'properties', 'table_row_count_threshold',
        gettext("Count rows if estimated less than"), 'integer', 2000,
        category_label=gettext('Properties')
    )

    self.pg_agent_row_threshold = self.preference.register(
        'properties', 'pgagent_row_threshold',
        gettext("Maximum job history rows"), 'integer', 250,
        category_label=gettext('Properties'),
        min_val=1, max_val=9999,
        help_str=gettext(
            'The maximum number of history rows to show on '
            'the Statistics tab for pgAgent jobs'
        )
    )

    fields = [
        {'name': 'key', 'type': 'keyCode', 'label': gettext('Key')},
        {'name': 'shift', 'type': 'checkbox', 'label': gettext('Shift')},
        {'name': 'control', 'type': 'checkbox', 'label': gettext('Ctrl')},
        {'name': 'alt', 'type': 'checkbox', 'label': gettext('Alt/Option')}
    ]

    self.preference.register(
        'keyboard_shortcuts',
        'browser_tree',
        gettext('Browser tree'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 66, 'char': 'b'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'tabbed_panel_backward',
        gettext('Tabbed panel backward'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 91, 'char': '['}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'tabbed_panel_forward',
        gettext('Tabbed panel forward'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 93, 'char': ']'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'main_menu_file',
        gettext('File main menu'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 70, 'char': 'f'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'main_menu_object',
        gettext('Object main menu'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 79, 'char': 'o'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'main_menu_tools',
        gettext('Tools main menu'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 76, 'char': 'l'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'main_menu_help',
        gettext('Help main menu'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 72, 'char': 'h'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'sub_menu_query_tool',
        gettext('Open query tool'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 81, 'char': 'q'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'sub_menu_view_data',
        gettext('View data'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 86, 'char': 'v'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'sub_menu_create',
        gettext('Create object'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 78, 'char': 'n'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'sub_menu_properties',
        gettext('Edit object properties'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 69, 'char': 'e'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'sub_menu_delete',
        gettext('Delete object'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 68, 'char': 'd'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'context_menu',
        gettext('Open context menu'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 67, 'char': 'c'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'direct_debugging',
        gettext('Direct debugging'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 71, 'char': 'g'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'dialog_tab_forward',
        gettext('Dialog tab forward'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': True,
            'control': True,
            'key': {'key_code': 93, 'char': ']'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'dialog_tab_backward',
        gettext('Dialog tab backward'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': True,
            'control': True,
            'key': {'key_code': 91, 'char': '['}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'sub_menu_refresh',
        gettext('Refresh browser tree'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': False,
            'control': False,
            'key': {'key_code': 116, 'char': 'F5'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )
