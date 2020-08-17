#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


class BrowserToolBarLocators():
    """This will contains element locators for browser tool bar"""

    open_query_tool_button_css = \
        ".wcFrameButton[title='Query Tool']:not(.disabled)"

    query_tool_panel_css = \
        ".wcPanelTab .wcTabIcon.pg-font-icon.icon-query-tool"

    view_table_data_button_css = \
        ".wcFrameButton[title='View Data']:not(.disabled)"

    view_data_panel_css = ".wcPanelTab .wcTabIcon.fa.fa-table"

    filter_data_button_css = \
        ".wcFrameButton[title='Filtered Rows']:not(.disabled)"

    filter_alertify_box_css = ".alertify .ajs-header[data-title~='Filter']"


class NavMenuLocators:
    "This will contains element locators of navigation menu bar"

    file_menu_css = "#mnu_file"

    preference_menu_item_css = "#mnu_preferences"

    tools_menu_link_text = "Tools"

    view_data_link_text = "View/Edit Data"

    object_menu_link_text = "Object"

    properties_obj_css = "#show_obj_properties.dropdown-item:not(.disabled)"

    backup_obj_css = "#backup_object.dropdown-item:not(.disabled)"

    restore_obj_css = "#restore_object.dropdown-item:not(.disabled)"

    maintenance_obj_css = "#maintenance.dropdown-item:not(.disabled)"

    show_system_objects_pref_label_xpath = \
        "//label[contains(text(), 'Show system objects?')]"

    maximize_pref_dialogue_css = ".ajs-dialog.pg-el-container .ajs-maximize"

    specified_pref_node_exp_status = \
        "//div[div[span[span[(@class='aciTreeText')and " \
        "(text()='{0} ' or text()='{0}')]]]]"

    specified_preference_tree_node = \
        "//div//span[(@class='aciTreeText')and " \
        "(text()='{0} ' or text()='{0}')]"

    specified_sub_node_of_pref_tree_node = \
        "//span[text()='{0}']//following::span[text()='{1}']"

    insert_bracket_pair_switch_btn = \
        "//div[span[normalize-space(text())='Insert bracket pairs?']]" \
        "//div[contains(@class,'toggle btn')]"

    backup_filename_txt_box_name = "file"

    restore_file_name_txt_box_name = "file"

    backup_btn_xpath = \
        "//button[contains(@class,'fa-save')and contains(.,'Backup')]"

    bcg_process_status_alertifier_css = \
        ".ajs-message.ajs-bg-bgprocess.ajs-visible"

    status_alertifier_more_btn_css = ".pg-bg-more-details"

    process_watcher_alertfier = \
        "//div[contains(@class,'wcFrameTitleBar')]" \
        "//div[contains(text(),'Process Watcher')]"

    process_watcher_detailed_command_canvas_css = \
        ".bg-process-details .bg-detailed-desc"

    process_watcher_close_button_xpath = \
        "//div[contains(@class,'wcFloating')]//" \
        "div[@aria-label='Close panel']//div"

    restore_file_name_xpath = "//div[contains(text(),'Restore')]" \
                              "//following::input[@name='file']"

    restore_button_xpath = \
        "//button[contains(@class,'fa-upload') and contains(.,'Restore')]"

    maintenance_operation = "//label[text()='Maintenance operation']"

    select_tab_xpath = \
        "//*[contains(@class,'wcTabTop')]//*[contains(@class,'wcPanelTab') " \
        "and contains(.,'{}')]"


class QueryToolLocators:
    btn_save_file = "#btn-save-file"

    btn_save_data = "#btn-save-data"

    btn_query_dropdown = "#btn-query-dropdown"

    btn_auto_rollback = "#btn-auto-rollback"

    btn_auto_rollback_check_status = "#btn-auto-rollback > i"

    btn_auto_commit = "#btn-auto-commit"

    btn_auto_commit_check_status = "#btn-auto-commit > i"

    btn_cancel_query = "#btn-cancel-query"

    btn_explain = "#btn-explain"

    btn_explain_analyze = "#btn-explain-analyze"

    btn_explain_options_dropdown = "#btn-explain-options-dropdown"

    btn_explain_verbose = "#btn-explain-verbose"

    btn_explain_costs = "#btn-explain-costs"

    btn_explain_buffers = "#btn-explain-buffers"

    btn_explain_timing = "#btn-explain-timing"

    btn_clear_dropdown = "#btn-clear-dropdown"

    btn_clear_history = "#btn-clear-history"

    btn_clear = "#btn-clear"

    query_editor_panel = "#output-panel"

    query_history_selected = "#query_list .selected"

    query_history_entries = "#query_list>.query-group>ul>li"

    query_history_specific_entry = \
        "#query_list>.query-group>ul>li:nth-child({})"

    query_history_detail = "#query_detail"

    invalid_query_history_entry_css = "#query_list .entry.error .query"

    editor_panel = "#output-panel"

    query_messages_panel = ".sql-editor-message"

    output_row_xpath = "//div[contains(@class, 'slick-row')][{}]/*[1]"

    output_column_header_css = "[data-column-id='{}']"

    output_column_data_xpath = "//div[contains(@class, 'slick-cell')]" \
                               "[contains(., '{}')]"
    output_cell_xpath = "//div[contains(@class, 'slick-cell') and " \
                        "contains(@class, 'l{0} r{1}')]"

    select_all_column = \
        "//div[contains(@id,'row-header-column')]"

    new_row_xpath = "//div[contains(@class, 'new-row')]"

    scratch_pad_css = ".sql-scratch > textarea"

    copy_button_css = "#btn-copy-row"

    paste_button_css = "#btn-paste-row"

    row_editor_text_area_css = ".pg-text-editor > textarea"

    text_editor_ok_btn_css = ".btn.btn-primary.long_text_editor"

    btn_load_file_css = "#btn-load-file"

    btn_execute_query_css = "#btn-flash"

    input_file_path_css = "input#file-input-path"

    select_file_content_css = "table#contents"

    query_output_canvas_css = "#datagrid .slick-viewport .grid-canvas"

    query_output_cells = ".slick-cell"

    sql_editor_message = "//div[contains(@class, 'sql-editor-message') and " \
                         "contains(string(), '{}')]"

    code_mirror_hint_box_xpath = "//ul[@class='CodeMirror-hints default']"

    code_mirror_hint_item_xpath = \
        "//ul[contains(@class, 'CodeMirror-hints') and contains(., '{}')]"

    code_mirror_data_xpath = "//pre[@class=' CodeMirror-line ']/span"

    save_data_icon = "icon-save-data-changes"

    commit_icon = "icon-commit"

    execute_icon = "fa-play"

    explain_icon = "fa-hand-pointer"

    explain_analyze_icon = "fa-list-alt"

    query_history_selected_icon = '#query_list .selected #query_source_icon'

    btn_commit = "#btn-commit"

    show_query_internally_btn = \
        "//div[label[contains(normalize-space(text())," \
        "'Show queries generated internally by')]]//" \
        "div[contains(@class,'toggle btn')]"

    editable_column_icon_xpath = "//div[contains(@class," \
                                 " 'editable-column-header-icon')]" \
                                 "/i[contains(@class, 'fa-pencil-alt')]"

    read_only_column_icon_xpath = "//div[contains(@class," \
                                  " 'editable-column-header-icon')]" \
                                  "/i[contains(@class, 'fa-lock')]"


class ConnectToServerDiv:
    # This will contain xpaths for element relating to Connect to server div

    password_field = "//input[@id='password']"

    ok_button = \
        "//div [@class='alertify  ajs-modeless ajs-movable ajs-zoom']" \
        "//button[text()='OK']"

    error_message = \
        "//form[@id='frmPassword']/div/div//div[@class='alert-text']"

    cancel_button = \
        "//div [@class='alertify  ajs-modeless ajs-movable ajs-zoom']" \
        "//button[text()='Cancel']"
