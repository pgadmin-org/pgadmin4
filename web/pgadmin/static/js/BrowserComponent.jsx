import React, {useEffect, useMemo, useState } from 'react';
import AppMenuBar from './AppMenuBar';
import ObjectBreadcrumbs from './components/ObjectBreadcrumbs';
import Layout, { LayoutDocker, getDefaultGroup } from './helpers/Layout';
import gettext from 'sources/gettext';
import ObjectExplorer from './tree/ObjectExplorer';
import Properties from '../../misc/properties/Properties';
import SQL from '../../misc/sql/static/js/SQL';
import Statistics from '../../misc/statistics/static/js/Statistics';
import { BROWSER_PANELS } from '../../browser/static/js/constants';
import Dependencies from '../../misc/dependencies/static/js/Dependencies';
import Dependents from '../../misc/dependents/static/js/Dependents';
import UtilityView from './UtilityView';
import ModalProvider from './helpers/ModalProvider';
import { NotifierProvider } from './helpers/Notifier';
import ToolView from './ToolView';
import ObjectExplorerToolbar from './helpers/ObjectExplorerToolbar';
import MainMoreToolbar from './helpers/MainMoreToolbar';
import Dashboard from '../../dashboard/static/js/Dashboard';
import usePreferences from '../../preferences/static/js/store';
import { getBrowser } from './utils';
import PropTypes from 'prop-types';
import Processes from '../../misc/bgprocess/static/js/Processes';


const objectExplorerGroup  = {
  tabLocked: true,
  floatable: false,
  panelExtra: () => <ObjectExplorerToolbar />
};

const mainPanelGroup  = {
  ...getDefaultGroup(),
  panelExtra: () => <MainMoreToolbar />
};

export const processesPanelData = {
  id: BROWSER_PANELS.PROCESSES, title: gettext('Processes'), content: <Processes />, closable: true, group: 'playground'
};

export const defaultTabsData = [
  {
    id: BROWSER_PANELS.DASHBOARD, title: gettext('Dashboard'), content: <Dashboard />, closable: true, group: 'playground'
  },
  {
    id: BROWSER_PANELS.PROPERTIES, title: gettext('Properties'), content: <Properties />, closable: true, group: 'playground'
  },
  {
    id: BROWSER_PANELS.SQL, title: gettext('SQL'), content: <SQL />, closable: true, group: 'playground'
  },
  {
    id: BROWSER_PANELS.STATISTICS, title: gettext('Statistics'), content: <Statistics />, closable: true, group: 'playground'
  },
  {
    id: BROWSER_PANELS.DEPENDENCIES, title: gettext('Dependencies'), content: <Dependencies />, closable: true, group: 'playground'
  },
  {
    id: BROWSER_PANELS.DEPENDENTS, title: gettext('Dependents'), content: <Dependents />, closable: true, group: 'playground'
  },
  processesPanelData,
];


export default function BrowserComponent({pgAdmin}) {
  let defaultLayout = {
    dockbox: {
      mode: 'vertical',
      children: [
        {
          mode: 'horizontal',
          children: [
            {
              size: 20,
              tabs: [
                LayoutDocker.getPanel({
                  id: BROWSER_PANELS.OBJECT_EXPLORER, title: gettext('Object Explorer'),
                  content: <ObjectExplorer />, group: 'object-explorer'
                }),
              ],
            },
            {
              size: 80,
              id: BROWSER_PANELS.MAIN,
              group: 'playground',
              tabs: defaultTabsData.map((t)=>LayoutDocker.getPanel(t)),
              panelLock: {panelStyle: 'playground'},
            }
          ]
        },
      ]
    },
  };
  const {isLoading, failed} = usePreferences();
  let { name: browser } = useMemo(()=>getBrowser(), []);
  const [uiReady, setUiReady] = useState(false);

  useEffect(()=>{
    if(uiReady) {
      pgAdmin?.Browser?.uiloaded?.();
    }
  }, [uiReady]);

  if(isLoading) {
    return <></>;
  }
  if(failed) {
    return <>Failed to load preferences</>;
  }

  return (
    <PgAdminContext.Provider value={pgAdmin}>
      <ModalProvider>
        <NotifierProvider pgAdmin={pgAdmin} onReady={()=>setUiReady(true)}/>
        {browser != 'Nwjs' && <AppMenuBar />}
        <div style={{height: (browser != 'Nwjs' ? 'calc(100% - 30px)' : '100%')}}>
          <Layout
            getLayoutInstance={(obj)=>{
              pgAdmin.Browser.docker = obj;
            }}
            defaultLayout={defaultLayout}
            layoutId='Browser/Layout'
            savedLayout={pgAdmin.Browser.utils.layout}
            groups={{
              'object-explorer': objectExplorerGroup,
              'playground': mainPanelGroup,
            }}
            noContextGroups={['object-explorer']}
            resetToTabPanel={BROWSER_PANELS.MAIN}
          />
        </div>
        <UtilityView />
        <ToolView />
      </ModalProvider>
      <ObjectBreadcrumbs pgAdmin={pgAdmin} />
    </PgAdminContext.Provider>
  );
}

BrowserComponent.propTypes = {
  pgAdmin: PropTypes.object,
};

export const PgAdminContext = React.createContext();

export function usePgAdmin() {
  const pgAdmin = React.useContext(PgAdminContext);
  return pgAdmin;
}
