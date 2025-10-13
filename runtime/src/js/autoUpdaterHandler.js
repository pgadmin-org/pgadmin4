import { autoUpdater, ipcMain } from 'electron';
import { refreshMenus } from './menu.js';
import * as misc from './misc.js';

// This function stores the flags in configStore that are needed
// for auto-update and refreshes menus
export function updateConfigAndMenus(event, configStore, pgAdminMainScreen, menuCallbacks) {
  const flags = {
    'update-available': { update_downloading: true },
    'update-not-available': { update_downloading: false },
    'update-downloaded': { update_downloading: false, update_downloaded: true },
    'error-close': { update_downloading: false, update_downloaded: false },
  };
  const flag = flags[event];
  if (flag) {
    Object.entries(flag).forEach(([k, v]) => configStore.set(k, v));
    refreshMenus(pgAdminMainScreen, configStore, menuCallbacks);
  }
}

// This function registers autoUpdater event listeners ONCE
function registerAutoUpdaterEvents({ pgAdminMainScreen, configStore, menuCallbacks }) {
  autoUpdater.on('checking-for-update', () => {
    misc.writeServerLog('[Auto-Updater]: Checking for update.');
  });

  autoUpdater.on('update-available', () => {
    updateConfigAndMenus('update-available', configStore, pgAdminMainScreen, menuCallbacks);
    misc.writeServerLog('[Auto-Updater]: Update downloading.');
    pgAdminMainScreen.webContents.send('notifyAppAutoUpdate', { update_downloading: true });
  });

  autoUpdater.on('update-not-available', () => {
    updateConfigAndMenus('update-not-available', configStore, pgAdminMainScreen, menuCallbacks);
    misc.writeServerLog('[Auto-Updater]: No update available.');
    pgAdminMainScreen.webContents.send('notifyAppAutoUpdate', { no_update_available: true });
  });

  autoUpdater.on('update-downloaded', () => {
    updateConfigAndMenus('update-downloaded', configStore, pgAdminMainScreen, menuCallbacks);
    misc.writeServerLog('[Auto-Updater]: Update downloaded.');
    pgAdminMainScreen.webContents.send('notifyAppAutoUpdate', { update_downloaded: true });
  });

  autoUpdater.on('error', (message) => {
    updateConfigAndMenus('error-close', configStore, pgAdminMainScreen, menuCallbacks);
    misc.writeServerLog(`[Auto-Updater]: ${message}`);
    pgAdminMainScreen.webContents.send('notifyAppAutoUpdate', { error: true, errMsg: message });
  });
}

// Handles 'sendDataForAppUpdate' IPC event: updates config, refreshes menus, triggers update check, or installs update if requested.
function handleSendDataForAppUpdate({
  pgAdminMainScreen,
  configStore,
  menuCallbacks,
  baseUrl,
  UUID,
  forceQuitAndInstallUpdate,
}) {
  return (_, data) => {
    // Only update the auto-update enabled flag and refresh menus if the value has changed or is not set
    if (typeof data.check_for_updates !== 'undefined') {
      const currentFlag = configStore.get('auto_update_enabled');
      if (typeof currentFlag === 'undefined' || currentFlag !== data.check_for_updates) {
        configStore.set('auto_update_enabled', data.check_for_updates);
        refreshMenus(pgAdminMainScreen, configStore, menuCallbacks);
      }
    }
    // If auto-update is enabled, proceed with the update check
    if (
      data.auto_update_url &&
      data.upgrade_version &&
      data.upgrade_version_int &&
      data.current_version_int &&
      data.product_name
    ) {
      const ftpUrl = encodeURIComponent(
        `${data.auto_update_url}/pgadmin4-${data.upgrade_version}-${process.arch}.zip`
      );
      let serverUrl = `${baseUrl}/misc/auto_update/${data.current_version_int}/${data.upgrade_version}/${data.upgrade_version_int}/${data.product_name}/${ftpUrl}/?key=${UUID}`;

      try {
        autoUpdater.setFeedURL({ url: serverUrl });
        misc.writeServerLog('[Auto-Updater]: Initiating update check.');
        autoUpdater.checkForUpdates();
      } catch (err) {
        misc.writeServerLog('[Auto-Updater]: Error setting autoUpdater feed URL: ' + err.message);
        if (pgAdminMainScreen) {
          pgAdminMainScreen.webContents.send('notifyAppAutoUpdate', {
            error: true,
            errMsg: 'Failed to check for updates. Please try again later.',
          });
        }
        return;
      }
    }
    // If the user has requested to install the update immediately
    if (data.install_update_now) {
      forceQuitAndInstallUpdate();
    }
  };
}

export function setupAutoUpdater({
  pgAdminMainScreen,
  configStore,
  menuCallbacks,
  baseUrl,
  UUID,
  forceQuitAndInstallUpdate,
}) {
  // For now only macOS is supported for electron auto-update
  if (process.platform === 'darwin') {
    registerAutoUpdaterEvents({ pgAdminMainScreen, configStore, menuCallbacks });
    ipcMain.on(
      'sendDataForAppUpdate',
      handleSendDataForAppUpdate({
        pgAdminMainScreen,
        configStore,
        menuCallbacks,
        baseUrl,
        UUID,
        forceQuitAndInstallUpdate,
      })
    );
  }
}