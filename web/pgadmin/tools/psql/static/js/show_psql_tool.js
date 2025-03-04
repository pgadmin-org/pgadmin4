
import { getRandomInt  } from 'sources/utils';
import { generateTitle } from 'tools/sqleditor/static/js/sqleditor_title';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import usePreferences from '../../../../preferences/static/js/store';
import 'pgadmin.browser.keyboard';
import pgAdmin from 'sources/pgadmin';
import url_for from 'sources/url_for';

export function relaunchPsqlTool(state_info) {
  const transId = getRandomInt(1, 9999999);
  let connection_info = state_info.connection_info;  
  let db_name = connection_info.db;  
  // Set psql tab title as per prefrences setting.
  let title_data = {
    'database': db_name ? _.unescape(db_name) : 'postgres' ,
    'username': connection_info.user,
    'server': connection_info.server_name,
    'type': 'psql_tool',
  };
  let tab_title_placeholder = usePreferences.getState().getPreferencesForModule('browser').psql_tab_title_placeholder;
  let panelTitle = generateTitle(tab_title_placeholder, title_data);
  let openUrl = url_for('psql.panel', {
    trans_id: transId,
  });
  const misc_preferences = usePreferences.getState().getPreferencesForModule('misc');
  let theme = misc_preferences.theme;
  
  openUrl += `?sgid=${1}`
      +`&sid=${connection_info.sid}`
      +`&did=${connection_info.did}`
      +`&server_type=${connection_info.server_type}`
      + `&theme=${theme}`;
  
  if(connection_info.did) {
    openUrl += `&db=${encodeURIComponent(db_name)}`;
  } else {
    openUrl += `&db=${''}`;
  }
  
  const escapedTitle = _.escape(panelTitle);
  const open_new_tab = usePreferences.getState().getPreferencesForModule('browser').new_browser_tab_open;
  pgAdmin.Browser.Events.trigger(
    'pgadmin:tool:show',
    `${BROWSER_PANELS.PSQL_TOOL}_${transId}`,
    openUrl,
    {title: escapedTitle, db_name: db_name, server_name: connection_info.server_name, user: connection_info.user},
    {title: panelTitle, icon: 'pg-font-icon icon-terminal', manualClose: false, renamable: true},
    Boolean(open_new_tab?.includes('psql_tool'))
  );
  return true;
};
  