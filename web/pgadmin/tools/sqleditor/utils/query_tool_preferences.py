##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Register preferences for query tool"""
from flask_babelex import gettext
from pgadmin.utils import SHORTCUT_FIELDS as shortcut_fields, \
    ACCESSKEY_FIELDS as accesskey_fields
from pgadmin.utils.preferences import Preferences


def RegisterQueryToolPreferences(self):
    self.info_notifier_timeout = self.preference.register(
        'display', 'info_notifier_timeout',
        gettext("Query info notifier timeout"), 'integer', 5,
        category_label=gettext('Display'),
        min_val=-1,
        max_val=999999,
        help_str=gettext(
            'The length of time to display the query info notifier after '
            'execution has completed. A value of -1 disables the notifier'
            ' and a value of 0 displays it until clicked. Values greater'
            ' than 0 display the notifier for the number of seconds'
            ' specified.'
        )
    )

    self.open_in_new_tab = self.preference.register(
        'display', 'new_browser_tab',
        gettext("Open in new browser tab"), 'boolean', False,
        category_label=gettext('Display'),
        help_str=gettext('If set to True, the Query Tool '
                         'will be opened in a new browser tab.')
    )

    self.explain_verbose = self.preference.register(
        'Explain', 'explain_verbose',
        gettext("Verbose output?"), 'boolean', False,
        category_label=gettext('Explain')
    )

    self.explain_costs = self.preference.register(
        'Explain', 'explain_costs',
        gettext("Show costs?"), 'boolean', False,
        category_label=gettext('Explain')
    )

    self.explain_buffers = self.preference.register(
        'Explain', 'explain_buffers',
        gettext("Show buffers?"), 'boolean', False,
        category_label=gettext('Explain')
    )

    self.explain_timing = self.preference.register(
        'Explain', 'explain_timing',
        gettext("Show timing?"), 'boolean', False,
        category_label=gettext('Explain')
    )

    self.auto_commit = self.preference.register(
        'Options', 'auto_commit',
        gettext("Auto commit?"), 'boolean', True,
        category_label=gettext('Options')
    )

    self.auto_rollback = self.preference.register(
        'Options', 'auto_rollback',
        gettext("Auto rollback?"), 'boolean', False,
        category_label=gettext('Options')
    )

    self.sql_font_size = self.preference.register(
        'Options', 'sql_font_size',
        gettext("Font size"), 'numeric', '1',
        min_val=0.1,
        max_val=10,
        category_label=gettext('Display'),
        help_str=gettext(
            'The font size to use for the SQL text boxes and editors. '
            'The value specified is in "em" units, in which 1 is the '
            'default relative font size. For example, to increase the '
            'font size by 20 percent use a value of 1.2, or to reduce '
            'by 20 percent, use a value of 0.8. Minimum 0.1, maximum 10.'
        )
    )

    self.tab_size = self.preference.register(
        'Options', 'tab_size',
        gettext("Tab size"), 'integer', 4,
        min_val=2,
        max_val=8,
        category_label=gettext('Options'),
        help_str=gettext(
            'The number of spaces per tab. Minimum 2, maximum 8.'
        )
    )

    self.use_spaces = self.preference.register(
        'Options', 'use_spaces',
        gettext("Use spaces?"), 'boolean', False,
        category_label=gettext('Options'),
        help_str=gettext(
            'Specifies whether or not to insert spaces instead of tabs '
            'when the tab key or auto-indent are used.'
        )
    )

    self.wrap_code = self.preference.register(
        'Options', 'wrap_code',
        gettext("Line wrapping?"), 'boolean', False,
        category_label=gettext('Options'),
        help_str=gettext(
            'Specifies whether or not to wrap SQL code in the editor.'
        )
    )

    self.insert_pair_brackets = self.preference.register(
        'Options', 'insert_pair_brackets',
        gettext("Insert bracket pairs?"), 'boolean', True,
        category_label=gettext('Options'),
        help_str=gettext(
            'Specifies whether or not to insert paired brackets in the '
            'editor.'
        )
    )

    self.brace_matching = self.preference.register(
        'Options', 'brace_matching',
        gettext("Brace matching?"), 'boolean', True,
        category_label=gettext('Options'),
        help_str=gettext(
            'Specifies whether or not to highlight matched braces '
            'in the editor.'
        )
    )

    self.show_prompt_save_query_changes = self.preference.register(
        'Options', 'prompt_save_query_changes',
        gettext("Prompt to save unsaved query changes?"), 'boolean', True,
        category_label=gettext('Options'),
        help_str=gettext(
            'Specifies whether or not to prompt user to save unsaved '
            'query on query tool exit.'
        )
    )

    self.show_prompt_save_data_changes = self.preference.register(
        'Options', 'prompt_save_data_changes',
        gettext("Prompt to save unsaved data changes?"), 'boolean', True,
        category_label=gettext('Options'),
        help_str=gettext(
            'Specifies whether or not to prompt user to save unsaved '
            'data on data grid exit.'
        )
    )

    self.csv_quoting = self.preference.register(
        'CSV_output', 'csv_quoting',
        gettext("CSV quoting"), 'options', 'strings',
        category_label=gettext('CSV Output'),
        options=[{'label': 'None', 'value': 'none'},
                 {'label': 'All', 'value': 'all'},
                 {'label': 'Strings', 'value': 'strings'}],
        select2={
            'allowClear': False,
            'tags': False
        }
    )

    self.csv_quote_char = self.preference.register(
        'CSV_output', 'csv_quote_char',
        gettext("CSV quote character"), 'options', '"',
        category_label=gettext('CSV Output'),
        options=[{'label': '"', 'value': '"'},
                 {'label': '\'', 'value': '\''}],
        select2={
            'allowClear': False,
            'tags': True
        }
    )

    self.csv_field_separator = self.preference.register(
        'CSV_output', 'csv_field_separator',
        gettext("CSV field separator"), 'options', ',',
        category_label=gettext('CSV output'),
        options=[{'label': ';', 'value': ';'},
                 {'label': ',', 'value': ','},
                 {'label': '|', 'value': '|'},
                 {'label': 'Tab', 'value': '\t'}],
        select2={
            'allowClear': False,
            'tags': True
        }
    )

    self.results_grid_quoting = self.preference.register(
        'Results_grid', 'results_grid_quoting',
        gettext("Result copy quoting"), 'options', 'strings',
        category_label=gettext('Results grid'),
        options=[{'label': 'None', 'value': 'none'},
                 {'label': 'All', 'value': 'all'},
                 {'label': 'Strings', 'value': 'strings'}],
        select2={
            'allowClear': False,
            'tags': False
        }
    )

    self.results_grid_quote_char = self.preference.register(
        'Results_grid', 'results_grid_quote_char',
        gettext("Result copy quote character"), 'options', '"',
        category_label=gettext('Results grid'),
        options=[{'label': '"', 'value': '"'},
                 {'label': '\'', 'value': '\''}],
        select2={
            'allowClear': False,
            'tags': True
        }
    )

    self.results_grid_field_separator = self.preference.register(
        'Results_grid', 'results_grid_field_separator',
        gettext("Result copy field separator"), 'options', '\t',
        category_label=gettext('Results grid'),
        options=[{'label': ';', 'value': ';'},
                 {'label': ',', 'value': ','},
                 {'label': '|', 'value': '|'},
                 {'label': 'Tab', 'value': '\t'}],
        select2={
            'allowClear': False,
            'tags': True
        }
    )

    self.display_connection_status = self.preference.register(
        'display', 'connection_status',
        gettext("Connection status"), 'boolean', True,
        category_label=gettext('Display'),
        help_str=gettext('If set to True, the Query Tool '
                         'will monitor and display the connection and '
                         'transaction status.')
    )

    self.connection_status = self.preference.register(
        'display', 'connection_status_fetch_time',
        gettext("Connection status refresh rate"), 'integer', 2,
        min_val=1, max_val=600,
        category_label=gettext('Display'),
        help_str=gettext(
            'The number of seconds between connection/transaction '
            'status polls.'
        )
    )

    self.preference.register(
        'keyboard_shortcuts',
        'execute_query',
        gettext('Execute query'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': False,
            'control': False,
            'key': {
                'key_code': 116,
                'char': 'F5'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=shortcut_fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'explain_query',
        gettext('EXPLAIN query'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': False,
            'control': False,
            'key': {
                'key_code': 118,
                'char': 'F7'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=shortcut_fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'explain_analyze_query',
        gettext('EXPLAIN ANALYZE query'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': True,
            'control': False,
            'key': {
                'key_code': 118,
                'char': 'F7'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=shortcut_fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'download_csv',
        gettext('Download CSV'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': False,
            'control': False,
            'key': {
                'key_code': 119,
                'char': 'F8'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=shortcut_fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'move_previous',
        gettext('Previous tab'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {
                'key_code': 37,
                'char': 'ArrowLeft'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=shortcut_fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'move_next',
        gettext('Next tab'),
        'keyboardshortcut',
        {
            'alt': True,
            'shift': True,
            'control': False,
            'key': {
                'key_code': 39,
                'char': 'ArrowRight'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=shortcut_fields
    )

    # All about access keys
    self.preference.register(
        'keyboard_shortcuts', 'btn_open_file',
        gettext('Accesskey (Open file)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 79,
                'char': 'o'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_save_file',
        gettext('Accesskey (Save file)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 83,
                'char': 's'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_copy_row',
        gettext('Accesskey (Copy rows)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 67,
                'char': 'c'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_paste_row',
        gettext('Accesskey (Paste rows)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 80,
                'char': 'p'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_delete_row',
        gettext('Accesskey (Delete rows)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 68,
                'char': 'd'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_filter_dialog',
        gettext('Accesskey (Filter dialog)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 70,
                'char': 'f'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_filter_options',
        gettext('Accesskey (Filter options)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 73,
                'char': 'i'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_rows_limit',
        gettext('Accesskey (Rows limit)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 82,
                'char': 'r'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_execute_options',
        gettext('Accesskey (Execute options)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 88,
                'char': 'x'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_cancel_query',
        gettext('Accesskey (Cancel query)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 81,
                'char': 'q'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_clear_options',
        gettext('Accesskey (Clear editor options)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 76,
                'char': 'l'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_conn_status',
        gettext('Accesskey (Connection status)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 84,
                'char': 't'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts', 'btn_find_options',
        gettext('Accesskey (Find options)'), 'keyboardshortcut',
        {
            'key': {
                'key_code': 78,
                'char': 'n'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=accesskey_fields
    )

    self.preference.register(
        'keyboard_shortcuts',
        'toggle_case',
        gettext('Toggle case of selected text'),
        'keyboardshortcut',
        {
            'alt': False,
            'shift': True,
            'control': True,
            'key': {
                'key_code': 91,
                'char': 'u'
            }
        },
        category_label=gettext('Keyboard shortcuts'),
        fields=shortcut_fields
    )

    self.preference.register(
        'auto_completion', 'keywords_in_uppercase',
        gettext("Keywords in uppercase"), 'boolean', True,
        category_label=gettext('Auto completion'),
        help_str=gettext('If set to True, Keywords will be displayed '
                         'in upper case for auto completion.')
    )


def get_query_tool_keyboard_shortcuts():

    """
    Fetch all the query tool shortcut preferences

    Returns:
        List of query tool shortcut preferences
    """
    qt_perf = Preferences.module('sqleditor')
    conn_status = qt_perf.preference('btn_conn_status').get()
    clear_options = qt_perf.preference('btn_clear_options').get()
    cancel_query = qt_perf.preference('btn_cancel_query').get()
    execute_options = qt_perf.preference('btn_execute_options').get()
    filter_options = qt_perf.preference('btn_filter_options').get()
    rows_limit = qt_perf.preference('btn_rows_limit').get()
    filter_dialog = qt_perf.preference('btn_filter_dialog').get()
    delete_row = qt_perf.preference('btn_delete_row').get()
    paste_row = qt_perf.preference('btn_paste_row').get()
    copy_row = qt_perf.preference('btn_copy_row').get()
    save_file = qt_perf.preference('btn_save_file').get()
    open_file = qt_perf.preference('btn_open_file').get()
    move_next = qt_perf.preference('move_next').get()
    move_previous = qt_perf.preference('move_previous').get()
    download_csv = qt_perf.preference('download_csv').get()
    execute_query = qt_perf.preference('execute_query').get()
    explain_query = qt_perf.preference('explain_query').get()
    explain_analyze_query = qt_perf.preference('explain_analyze_query').get()
    find_options = qt_perf.preference('btn_find_options').get()
    toggle_case = qt_perf.preference('toggle_case').get()

    return {
        'keys': {
            'conn_status': conn_status.get('key').get('char'),
            'clear_options': clear_options.get('key').get('char'),
            'cancel_query': cancel_query.get('key').get('char'),
            'execute_options': execute_options.get('key').get('char'),
            'filter_options': filter_options.get('key').get('char'),
            'rows_limit': rows_limit.get('key').get('char'),
            'filter_dialog': filter_dialog.get('key').get('char'),
            'delete_row': delete_row.get('key').get('char'),
            'paste_row': paste_row.get('key').get('char'),
            'copy_row': copy_row.get('key').get('char'),
            'save_file': save_file.get('key').get('char'),
            'open_file': open_file.get('key').get('char'),
            'move_next': move_next.get('key').get('char'),
            'move_previous': move_previous.get('key').get('char'),
            'download_csv': download_csv.get('key').get('char'),
            'execute_query': execute_query.get('key').get('char'),
            'explain_query': explain_query.get('key').get('char'),
            'explain_analyze_query': explain_analyze_query.get('key').get(
                'char'
            ),
            'find_options': find_options.get('key').get('char'),
            'toggle_case': toggle_case.get('key').get('char')
        },
        'shortcuts': {
            'conn_status': conn_status,
            'clear_options': clear_options,
            'cancel_query': cancel_query,
            'execute_options': execute_options,
            'filter_options': filter_options,
            'rows_limit': rows_limit,
            'filter_dialog': filter_dialog,
            'delete_row': delete_row,
            'paste_row': paste_row,
            'copy_row': copy_row,
            'save_file': save_file,
            'open_file': open_file,
            'move_next': move_next,
            'move_previous': move_previous,
            'download_csv': download_csv,
            'execute_query': execute_query,
            'explain_query': explain_query,
            'explain_analyze_query': explain_analyze_query,
            'find_options': find_options,
            'toggle_case': toggle_case
        },
    }


def get_text_representation_of_shortcut(shortcut):
    """
    Coverts shortcut object to text representation

    Args:
        shortcut: Shortcut object

    Returns:
        Text representation of given shortcut
    """
    text_representation = ''
    is_plus_required = False

    if not shortcut:
        return text_representation

    if shortcut['alt']:
        text_representation = gettext('Alt')
        is_plus_required = True

    if shortcut['shift']:
        if is_plus_required:
            text_representation += '+'
        text_representation += gettext('Shift')
        is_plus_required = True

    if shortcut['control']:
        if is_plus_required:
            text_representation += '+'
        text_representation += gettext('Ctrl')
        is_plus_required = True

    if shortcut['key'] and shortcut['key']['char']:
        if is_plus_required:
            text_representation += '+'
        text_representation += '{0}'.format(shortcut['key']['char'])

    return text_representation
