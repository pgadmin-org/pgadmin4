//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

module.exports = {
  'static': '/base/pgadmin/static/<path:filename>',
  'sqleditor.poll': '/sqleditor/query_tool/poll/<path:trans_id>',
  'sqleditor.query_tool_start': '/sqleditor/query_tool/start/<path:trans_id>',
  'backup.create_server_job':  '/backup/job/<int:sid>',
  'backup.create_object_job':  '/backup/job/<int:sid>/object',
  'sqleditor.initialize_viewdata': '/initialize/sqleditor/<int:cmd_type>/<obj_type>/<int:sgid>/<int:sid>/<int:did>/<int:obj_id>',
  'sqleditor.initialize_sqleditor': '/initialize/sqleditor/<int:sgid>/<int:sid>',
  'sqleditor.initialize_sqleditor_with_did': '/initialize/sqleditor/<int:sgid>/<int:sid>/<int:did>',
  'restore.create_job': '/restore/job/<int:sid>',
  'sqleditor.panel': '/panel/<int:trans_id>',
  'search_objects.types': '/search_objects/types/<int:sid>/<int:did>',
  'search_objects.search': '/search_objects/search/<int:sid>/<int:did>',
  'dashboard.dashboard_stats': '/dashboard/dashboard_stats',
  'sqleditor.load_file': '/sqleditor/load_file/',
  'sqleditor.save_file': '/sqleditor/save_file/',
  'erd.initialize': '/erd/initialize/<int:trans_id>/<int:sgid>/<int:sid>/<int:did>',
  'erd.sql': '/erd/sql/<int:trans_id>/<int:sgid>/<int:sid>/<int:did>',
  'erd.prequisite': '/erd/prequisite/<int:trans_id>/<int:sgid>/<int:sid>/<int:did>',
  'erd.tables': '/erd/tables/<int:trans_id>/<int:sgid>/<int:sid>/<int:did>',
  'file_manager.init': '/file_manager/init',
  'file_manager.filemanager': '/file_manager/init',
  'file_manager.index': '/file_manager/',
  'file_manager.delete_trans_id': '/file_manager/delete_trans_id/<int:trans_id>',
  'file_manager.save_last_dir': '/file_manager/save_last_dir/<int:trans_id>',
  'file_manager.save_file_dialog_view': '/file_manager/save_file_dialog_view/<int:trans_id>',
  'file_manager.save_show_hidden_file_option': '/file_manager/save_show_hidden_file_option/<int:trans_id>',
  'settings.save_file_format_setting': '/settings/save_file_format_setting/',
  'bgprocess.detailed_status': '/misc/bgprocess/<pid>/<int:out>/<int:err>/',
  'bgprocess.list': '/misc/bgprocess/',
  'bgprocess.stop_process': '/misc/bgprocess/stop/<pid>',
  'bgprocess.acknowledge': '/misc/bgprocess/<pid>'
};
