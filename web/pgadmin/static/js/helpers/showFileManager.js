import pgAdmin from 'sources/pgadmin';
import 'pgadmin.tools.file_manager';

export function showFileManager(...args) {
  pgAdmin.Tools.FileManager.show(...args);
}
