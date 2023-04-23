import React from 'react';
import ReactDOM from 'react-dom';
import pgAdmin from 'sources/pgadmin';
import Theme from '../../../../static/js/Theme';
import ProcessDetails from './ProcessDetails';
import gettext from 'sources/gettext';

export default function showDetails(p) {
  let pgBrowser = pgAdmin.Browser;

  // Register dialog panel
  pgBrowser.Node.registerUtilityPanel();
  let panel = pgBrowser.Node.addUtilityPanel(pgBrowser.stdW.md),
    j = panel.$container.find('.obj_properties').first();
  panel.title(gettext('Process Watcher - %s', p.type_desc));
  panel.focus();

  panel.on(window.wcDocker.EVENT.CLOSED, ()=>{
    ReactDOM.unmountComponentAtNode(j[0]);
  });

  ReactDOM.render(
    <Theme>
      <ProcessDetails
        data={p}
        closeModal={()=>{
          panel.close();
        }}
      />
    </Theme>, j[0]);
}
