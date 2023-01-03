#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


class BrowserToolBarLocators():
    """This will contains element locators for browser tool bar"""

    open_query_tool_button_css = \
        ".wcFrameButton[aria-label='Query Tool']:not(.disabled)"

    query_tool_panel_css = \
        ".wcPanelTab .wcTabIcon.pg-font-icon.icon-query_tool"

    view_table_data_button_css = \
        ".wcFrameButton[aria-label='View Data']:not(.disabled)"

    view_data_panel_css = ".wcPanelTab .wcTabIcon.pg-font-icon.icon-view_data"

    filter_data_button_css = \
        ".wcFrameButton[aria-label='Filtered Rows']:not(.disabled)"

    filter_box_css = "//*[@id='0']/div[contains(text(), 'Data Filter')]"


class NavMenuLocators:
    "This will contains element locators of navigation menu bar"

    file_menu_css = "button[data-label='File']"

    preference_menu_item_css = "li[data-label='Preferences']"

    tools_menu_css = "button[data-label='Tools']"

    view_data_link_css = "div[data-label='View/Edit Data']"

    object_menu_css = "button[data-label='Object']"

    properties_obj_css = "li[data-label='Properties...']"

    backup_obj_css = "li[data-label='Backup...']"

    restore_obj_css = "li[data-label='Restore...']"

    maintenance_obj_css = "li[data-label='Maintenance...']"

    show_system_objects_pref_label_xpath = \
        "//label[contains(text(), 'Show system objects?')]"

    maximize_pref_dialogue_css = "//div[text()='Preferences']" \
                                 "//following::div//span[1]"

    specified_pref_node_exp_status = \
        "//*[@id='treeContainer']//div//span[text()='{0}']"

    specified_preference_tree_node = \
        "//*[@id='treeContainer']//div//span[text()='{0}']" \

    specified_sub_node_of_pref_tree_node = \
        "//*[@id='treeContainer']//div//span[text()='{1}']"
    insert_bracket_pair_switch_btn = \
        "//label[text()='Insert bracket pairs?']//following::div[1]//span"

    copy_sql_to_query_tool_switch_btn = \
        "//label[text()='Copy SQL from main window to query tool?']" \
        "//following::div[1]//span"

    backup_filename_txt_box_name = "file"

    restore_file_name_txt_box_name = "file"

    backup_btn_xpath = \
        "//button/span[text()='Backup']"

    bcg_process_status_alertifier_css = \
        ".ajs-message.ajs-bg-bgprocess.ajs-visible"

    status_alertifier_more_btn_css = ".pg-bg-more-details"

    process_watcher_alertfier = \
        "//div[contains(@class,'wcFrameTitleBar')]" \
        "//div[contains(text(),'Process Watcher')]"

    process_watcher_detailed_message_css = \
        "div[data-test='process-details'] div[data-test='process-message']"
    process_watcher_detailed_command_css = \
        "div[data-test='process-details'] div[data-test='process-cmd']"

    process_watcher_close_button_xpath = \
        "//div[contains(@class,'wcFloating')]//" \
        "div[@aria-label='Close panel']//div"

    restore_file_name_xpath = "//div[contains(text(),'Restore')]" \
                              "//following::input[@name='file']"

    restore_button_xpath = \
        "//button[ contains(.,'Restore')]"

    maintenance_operation = "//label[text()='Maintenance operation']"

    select_tab_xpath = \
        "//*[contains(@class,'wcTabTop')]//*[contains(@class,'wcPanelTab') " \
        "and contains(.,'{}')]"

    rcdock_tab = "div.dock-tab-btn[id$='{0}']"

    process_start_close_selector = \
        "div[data-test='process-popup-start'] button[data-label='Close']"
    process_end_close_selector = \
        "div[data-test='process-popup-end'] button[data-label='Close']"
    process_watcher_error_close_xpath = \
        ".btn.btn-sm-sq.btn-primary.pg-bg-close > i"


class QueryToolLocators:
    btn_save_file = "button[data-label='Save File']"

    btn_save_data = "button[data-label='Save Data Changes']"

    btn_query_dropdown = "button[data-label='Execute options']"

    btn_auto_rollback = "li[data-label='Auto rollback on error?']"

    btn_auto_rollback_check_status = "#btn-auto-rollback > i"

    btn_auto_commit = "li[data-label='Auto commit?']"

    btn_auto_commit_check_status = "#btn-auto-commit > i"

    btn_cancel_query = "button[data-label='Cancel query']"

    btn_explain = "button[data-label='Explain']"

    btn_explain_analyze = "button[data-label='Explain Analyze']"

    btn_explain_options_dropdown = "button[data-label='Explain Settings']"

    btn_explain_verbose = "li[data-label='Verbose']"

    btn_explain_costs = "li[data-label='Costs']"

    btn_explain_buffers = "li[data-label='Buffers']"

    btn_explain_timing = "li[data-label='Timing']"

    btn_edit_dropdown = "button[data-label='Edit']"

    btn_clear_history = "#btn-clear-history"

    btn_clear = "li[data-label='Clear Query']"

    btn_add_row = "button[data-label='Add row']"

    query_tool_menu = "ul[aria-label='{0}']"

    query_editor_panel = "#id-query"

    query_history_selected = \
        "#id-history li[data-label='history-entry'].Mui-selected"

    query_history_entries = "#id-history li[data-label='history-entry']"

    query_history_specific_entry = \
        "#id-history li[data-label='history-entry']:nth-child({0})"

    query_history_detail = "#id-history div[data-label='history-detail']"

    query_history_selected_icon = query_history_selected + ' svg'

    invalid_query_history_entry_css = \
        "#id-history li[data-label='history-entry']"

    explain_details = "#id-explain div[data-label='explain-details']"

    editor_panel = "#output-panel"

    query_messages_panel = "#id-messages"

    output_row = "#id-dataoutput div.rdg-row[aria-rowindex={0}]"

    output_row_col = "#id-dataoutput div.rdg-row[aria-rowindex='{0}']" \
                     " div.rdg-cell[aria-colindex='{1}']"

    output_column_header_css = \
        "#id-dataoutput div.rdg-cell div[data-column-key='{0}']"

    output_column_data_xpath = "//div[contains(@class, 'rdg-cell')]" \
                               "[contains(., '{}')]"
    output_row_xpath = "//div[@aria-rowindex='{0}']"
    output_cell_xpath = "//div[@aria-rowindex='{0}']/div[@aria-colindex='{1}']"

    select_all_column = \
        "//div[@role='columnheader'][@aria-colindex='1']"

    new_row_xpath = "//div[contains(@class, 'new-row')]"

    scratch_pad_css = "#id-scratch textarea"

    copy_button_css = "#id-dataoutput button[data-label='Copy']"

    copy_options_css = "#id-dataoutput button[data-label='Copy options']"

    copy_headers_btn_css = "li[data-label='Copy with headers']"

    paste_button_css = "#id-dataoutput button[data-label='Paste']"

    row_editor_text_area_css = "div[data-label='pg-editor'] textarea"

    json_editor_text_area_css = \
        "div.ace_layer.ace_text-layer .ace_line_group .ace_line"

    row_editor_checkbox_css = "div[data-label='pg-checkbox-editor']"

    text_editor_ok_btn_css = \
        "div[data-label='pg-editor'] button[data-label='OK']"

    btn_load_file_css = "button[data-label='Open File']"

    btn_execute_query_css = "button[data-label='Execute/Refresh']"

    folder_path_css = \
        "div[data-label='file-path'] input"

    search_file_edit_box_css = "div [data-label='search'] input"

    save_file_path_xpath = \
        "//span[text()='Save As']/following-sibling::div/input"

    change_file_types_dd_xpath = \
        "//span[text()='File Format']/following-sibling::div"

    select_file_content_css = \
        "div [role='grid'] div[aria-selected='true'] span"

    query_output_canvas_css = "#id-dataoutput .rdg"

    query_output_cells = ".rdg-cell[role='gridcell']"

    sql_editor_message = "//div[@id='id-messages'][contains(string(), '{}')]"

    code_mirror_hint_box_xpath = "//ul[@class='CodeMirror-hints default']"

    code_mirror_hint_item_xpath = \
        "//ul[contains(@class, 'CodeMirror-hints') and contains(., '{}')]"

    code_mirror_data_xpath = "//pre[@class=' CodeMirror-line ']/span"

    btn_commit = "button[data-label='Commit']"

    btn_history_remove_all = "#id-history button[data-label='Remove All']"

    show_query_internally_btn = \
        "//div[contains(normalize-space(text())," \
        "'Show queries generated internally by')]/span/span[1]"

    editable_column_icon_xpath = \
        "//div[@role='columnheader']/div/div/*[@data-label='EditIcon']"

    read_only_column_icon_xpath = \
        "//div[@role='columnheader']/div/div/*[@data-label='LockIcon']"


class ConnectToServerDiv:
    # This will contain xpaths for element relating to Connect to server div

    password_field = "//input[@id='password']"

    ok_button = \
        "//button[@class='ajs-button btn btn-primary fa fa-check']"

    error_message = \
        "//form[@id='frmPassword']/div/div//div[@class='alert-text']"

    cancel_button = \
        "//div [@class='ajs-modeless ajs-movable ajs-zoom']" \
        "//button[text()='Cancel']"


class PropertyDialogueLocators:
    # This will contain xpaths for elements in properties dialogue
    server_dialogue_title = "//div[text()='Register - Server']"

    server_connection_tab = "//button/span[text()='Connection']"

    server_tab_save = "//button/span[text()='Save']"
