##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from flask_babelex import gettext

LOCK_LAYOUT_LEVEL = {
    'PREVENT_DOCKING': 'docking',
    'FULL': 'full',
    'NONE': 'none'
}


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

    self.preference.register(
        'display', 'browser_tree_state_save_interval',
        gettext("Browser tree state saving interval"), 'integer',
        30, category_label=gettext('Display'),
        help_str=gettext(
            'Browser tree state saving interval in seconds. '
            'Use -1 to disable the tree saving mechanism.'
        )
    )

    self.preference.register(
        'display', 'confirm_on_refresh_close',
        gettext("Confirm on close or refresh?"), 'boolean',
        True, category_label=gettext('Display'),
        help_str=gettext(
            'Confirm closure or refresh of the browser or browser tab is '
            'intended before proceeding.'
        )
    )

    self.preference.register(
        'display', 'confirm_on_properties_close',
        gettext("Confirm before Close/Reset in object properties dialog?"),
        'boolean',
        True, category_label=gettext('Display'),
        help_str=gettext(
            'Confirm before closing or resetting the changes in the '
            'properties dialog for an object if the changes are not saved.'
        )
    )

    self.preference.register(
        'display', 'auto_expand_sole_children',
        gettext("Auto-expand sole children"), 'boolean', True,
        category_label=gettext('Display'),
        help_str=gettext(
            'If a treeview node is expanded and has only a single '
            'child, automatically expand the child node as well.'
        )
    )

    self.lock_layout = self.preference.register(
        'display', 'lock_layout',
        gettext('Lock Layout'), 'radioModern', LOCK_LAYOUT_LEVEL['NONE'],
        category_label=gettext('Display'), options=[
            {'label': gettext('None'), 'value': LOCK_LAYOUT_LEVEL['NONE']},
            {'label': gettext('Prevent Docking'),
             'value': LOCK_LAYOUT_LEVEL['PREVENT_DOCKING']},
            {'label': gettext('Full Lock'),
             'value': LOCK_LAYOUT_LEVEL['FULL']},
        ],
        help_str=gettext(
            'Lock the UI layout at different levels'
        )
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
        'sub_menu_search_objects',
        gettext('Search objects'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 83, 'char': 's'}
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
        'grid_menu_drop_multiple',
        gettext('Delete/Drop multiple objects'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 77, 'char': 'm'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'grid_menu_drop_cascade_multiple',
        gettext('Drop Cascade multiple objects'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 85, 'char': 'u'}
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

    self.preference.register(
        'keyboard_shortcuts',
        'add_grid_row',
        gettext('Add grid row'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': True,
            'control': True,
            'key': {'key_code': 65, 'char': 'a'}
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=fields
    )
