
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import * as commonUtils from 'sources/utils';

import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import usePreferences from '../../../../preferences/static/js/store';
import pgAdmin from 'sources/pgadmin';
import SchemaDiff from './SchemaDiffModule';

export function relaunchSchemaDiff(state_info) {
  let tool_data = state_info.tool_data;
  let panelTitle = SchemaDiff.panelTitleCount > 1 ? gettext('Schema Diff - %s', SchemaDiff.panelTitleCount) : gettext('Schema Diff');
  SchemaDiff.panelTitleCount++;
  const trans_id = commonUtils.getRandomInt(1, 9999999);

  let url_params = {
      'trans_id': trans_id,
      'editor_title': panelTitle,
    },
    baseUrl = url_for('schema_diff.panel', url_params);

  let browserPreferences = usePreferences.getState().getPreferencesForModule('browser');
  let openInNewTab = browserPreferences.new_browser_tab_open;
  let params = {tool_data: tool_data};

  pgAdmin.Browser.Events.trigger(
    'pgadmin:tool:show',
    `${BROWSER_PANELS.SCHEMA_DIFF_TOOL}_${trans_id}`,
    baseUrl,
    {...params},
    { title: panelTitle, icon: 'pg-font-icon icon-compare', manualClose: false, renamable: true},
    Boolean(openInNewTab?.includes('schema_diff'))
  );
  return true;
}
