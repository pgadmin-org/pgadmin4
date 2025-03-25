import pgAdmin from 'sources/pgadmin';
import current_user from 'pgadmin.user_management.current_user';
import gettext from 'sources/gettext';

export default function withCheckPermission(options, callback) {
  // Check if the user has permission to access the menu item
  return ()=>{
    if(!options.permission || (options.permission && current_user.permissions?.includes(options.permission))) {
      callback();
    } else {
      pgAdmin.Browser.notifier.alert(
        gettext('Permission Denied'),
        gettext('You do not have permission to access this menu item.')
      );
    }
  };
}
