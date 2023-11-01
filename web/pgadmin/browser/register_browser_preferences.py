##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import sys
from flask_babel import gettext
from pgadmin.utils.constants import PREF_LABEL_DISPLAY,\
    PREF_LABEL_KEYBOARD_SHORTCUTS, PREF_LABEL_TABS_SETTINGS, \
    PREF_LABEL_OPTIONS, QT_DEFAULT_PLACEHOLDER, VW_EDT_DEFAULT_PLACEHOLDER, \
    PREF_LABEL_BREADCRUMBS
from flask import current_app
import config


def register_browser_preferences(self):
    self.show_system_objects = self.preference.register(
        'display', 'show_system_objects',
        gettext("Show system objects?"), 'boolean', False,
        category_label=PREF_LABEL_DISPLAY
    )

    self.show_empty_coll_nodes = self.preference.register(
        'display', 'show_empty_coll_nodes',
        gettext("Show empty object collections?"), 'boolean', True,
        category_label=PREF_LABEL_DISPLAY,
        help_str=gettext(
            'If turned off, then all object collections which are empty '
            'will be hidden from browser tree.'
        )
    )

    self.show_user_defined_templates = self.preference.register(
        'display', 'show_user_defined_templates',
        gettext("Show template databases?"), 'boolean', False,
        category_label=PREF_LABEL_DISPLAY
    )

    if config.SERVER_MODE:
        self.hide_shared_server = self.preference.register(
            'display', 'hide_shared_server',
            gettext("Hide shared servers?"), 'boolean', False,
            category_label=gettext('Display'),
            help_str=gettext(
                'If set to True, then all shared servers will be '
                'hidden from browser tree'
            )
        )

    self.preference.register(
        'display', 'browser_tree_state_save_interval',
        gettext("Object explorer tree state saving interval"), 'integer',
        30, category_label=PREF_LABEL_DISPLAY,
        help_str=gettext(
            'Object explorer state saving interval in seconds. '
            'Use -1 to disable the tree saving mechanism.'
        )
    )

    self.preference.register(
        'display', 'confirm_on_refresh_close',
        gettext("Confirm on close or refresh?"), 'boolean',
        True, category_label=PREF_LABEL_DISPLAY,
        help_str=gettext(
            'Confirm closure or refresh of the browser or browser tab is '
            'intended before proceeding.'
        )
    )

    self.preference.register(
        'display', 'confirm_on_properties_close',
        gettext("Confirm before Close/Reset in object properties dialog?"),
        'boolean',
        True, category_label=PREF_LABEL_DISPLAY,
        help_str=gettext(
            'Confirm before closing or resetting the changes in the '
            'properties dialog for an object if the changes are not saved.'
        )
    )

    self.preference.register(
        'display', 'auto_expand_sole_children',
        gettext("Auto-expand sole children"), 'boolean', True,
        category_label=PREF_LABEL_DISPLAY,
        help_str=gettext(
            'If a treeview node is expanded and has only a single '
            'child, automatically expand the child node as well.'
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

    self.table_row_count_threshold = self.preference.register(
        'processes', 'process_retain_days',
        gettext("Process details/logs retention days"), 'integer', 5,
        min_val=1,
        category_label=gettext('Processes'),
        help_str=gettext(
            'After this many days, the process info and logs '
            'will be automatically cleared.'
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
        gettext('Object Explorer'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {'key_code': 66, 'char': 'b'}
        },
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
        fields=fields
    )

    if not current_app.PGADMIN_RUNTIME:
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
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'sub_menu_refresh',
        gettext('Refresh object explorer'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': False,
            'control': False,
            'key': {'key_code': 116, 'char': 'F5'}
        },
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
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
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
        fields=fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'open_quick_search',
        gettext('Quick Search'), 'keyboardshortcut',
        {
            'alt': False,
            'shift': True,
            'control': True,
            'key': {'key_code': 70, 'char': 'f'}
        },
        category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
        fields=fields
    )

    self.dynamic_tab_title = self.preference.register(
        'tab_settings', 'dynamic_tabs',
        gettext("Dynamic tab size"), 'boolean', False,
        category_label=PREF_LABEL_TABS_SETTINGS,
        help_str=gettext(
            'If set to True, the tabs will take full size as per the title, '
            'it will also applicable for already opened tabs')
    )

    self.qt_tab_title = self.preference.register(
        'tab_settings', 'qt_tab_title_placeholder',
        gettext("Query tool tab title"),
        'text', QT_DEFAULT_PLACEHOLDER,
        category_label=PREF_LABEL_DISPLAY,
        help_str=gettext(
            'Supported placeholders are %DATABASE%, %USERNAME%, and %SERVER%. '
            'Users can provide any string with or without placeholders of'
            ' their choice. The blank title will be revert back to the'
            ' default title with placeholders.'
        )
    )

    self.ve_edt_tab_title = self.preference.register(
        'tab_settings', 'vw_edt_tab_title_placeholder',
        gettext("View/Edit data tab title"),
        'text', VW_EDT_DEFAULT_PLACEHOLDER,
        category_label=PREF_LABEL_DISPLAY,
        help_str=gettext(
            'Supported placeholders are %SCHEMA%, %TABLE%, %DATABASE%, '
            '%USERNAME%, and %SERVER%. Users can provide any string with or '
            'without placeholders of their choice. The blank title will be '
            'revert back to the default title with placeholders.'
        )
    )

    self.debugger_tab_title = self.preference.register(
        'tab_settings', 'debugger_tab_title_placeholder',
        gettext("Debugger tab title"),
        'text', '%FUNCTION%(%ARGS%)',
        category_label=PREF_LABEL_DISPLAY,
        help_str=gettext(
            'Supported placeholders are %FUNCTION%, %ARGS%, %SCHEMA% and'
            ' %DATABASE%. Users can provide any string with or '
            'without placeholders of their choice. The blank title will be'
            ' revert back to the default title with placeholders.'
        )
    )

    ope_new_tab_options = [
        {'label': gettext('Query Tool'), 'value': 'qt'},
        {'label': gettext('Debugger'), 'value': 'debugger'},
        {'label': gettext('Schema Diff'), 'value': 'schema_diff'},
        {'label': gettext('ERD Tool'), 'value': 'erd_tool'}]

    # Allow psq tool to open in new browser tab if ENABLE_PSQL is set to True
    if config.ENABLE_PSQL:
        ope_new_tab_options.append(
            {'label': gettext('PSQL Tool'), 'value': 'psql_tool'})

    self.open_in_new_tab = self.preference.register(
        'tab_settings', 'new_browser_tab_open',
        gettext("Open in new browser tab"), 'select', None,
        category_label=PREF_LABEL_OPTIONS,
        options=ope_new_tab_options,
        help_str=gettext(
            'Select Query Tool, Debugger, Schema Diff, ERD Tool '
            'or PSQL Tool from the drop-down to set '
            'open in new browser tab for that particular module.'
        ),
        control_props={
            'multiple': True, 'allowClear': False,
            'tags': True, 'first_empty': False,
            'selectOnClose': False, 'emptyOptions': True,
            'tokenSeparators': [','],
            'placeholder': gettext('Select open new tab...')
        }
    )

    # Set PSQL tool tab title if ENABLE_PSQL is set to True
    if config.ENABLE_PSQL:
        self.psql_tab_title = self.preference.register(
            'tab_settings', 'psql_tab_title_placeholder',
            gettext("PSQL tool tab title"),
            'text', '%DATABASE%/%USERNAME%@%SERVER%',
            category_label=PREF_LABEL_DISPLAY,
            help_str=gettext(
                'Supported placeholders are %DATABASE%, %USERNAME%, '
                'and %SERVER%. Users can provide any string with or without'
                ' placeholders of their choice. The blank title will be revert'
                ' back to the default title with placeholders.'
            )
        )

    self.preference.register(
        'breadcrumbs', 'breadcrumbs_enable',
        gettext("Enable object breadcrumbs?"),
        'boolean',
        True, category_label=PREF_LABEL_BREADCRUMBS,
        help_str=gettext(
            'Enable breadcrumbs to show the complete path of an object in the '
            'object explorer. The breadcrumbs are displayed on object mouse '
            'hover.'
        )
    )

    self.preference.register(
        'breadcrumbs', 'breadcrumbs_show_comment',
        gettext("Show comment with object breadcrumbs?"),
        'boolean',
        True, category_label=PREF_LABEL_BREADCRUMBS,
        help_str=gettext(
            'Show object comment along with breadcrumbs.'
        )
    )
