import { app, ipcMain } from 'electron';

export function setupProgressInfo(mainWindow) {
  ipcMain.on('set-badge', (event, count) => {
    const badgeCount = parseInt(count, 10);
    if (!isNaN(badgeCount)) {
      // Set the application badge count (works on macOS and Linux)
      app.setBadgeCount(badgeCount);
    }
  });

  // Listen for 'clear-badge' message from renderer process
  ipcMain.on('clear-badge', () => {
    // Setting count to 0 removes the badge
    app.setBadgeCount(0);
  });

  // Listen for 'set-progress' message from renderer process
  ipcMain.on('set-progress', (event, progress) => {
    const progressValue = parseFloat(progress);
    if (mainWindow && !isNaN(progressValue) && progressValue >= 0 && progressValue <= 1) {
      // Set the progress bar on the taskbar icon (works on Windows, macOS, Unity)
      // Value should be between 0 and 1.
      // Use -1 to enter indeterminate mode (or remove the bar).
      mainWindow.setProgressBar(progressValue);
    } else if (mainWindow && progress === -1) {
      mainWindow.setProgressBar(-1); // Clear or set to indeterminate
    }
  });

  // Listen for 'clear-progress' message from renderer process
  ipcMain.on('clear-progress', () => {
    if (mainWindow) {
      // Setting progress to -1 removes the progress bar
      mainWindow.setProgressBar(-1);
    }
  });
}
