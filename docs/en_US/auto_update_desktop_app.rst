Auto-Update of pgAdmin 4 Desktop Application
********************************************

pgAdmin 4's desktop application includes an automated update system built using 
Electron's ``autoUpdater`` module. This feature enables users to receive and install 
updates seamlessly, ensuring they always have access to the latest features and security fixes.

Supported Platforms
===================

- **macOS:** Fully supported with automatic updates enabled by default
- **Windows:** Not supported
- **Linux:** Not supported

Update Process Overview
=======================

1. **Check for Updates:**
   
   - Automatic check on application startup
   - Manual check available via pgAdmin 4 menu > Check for Updates
   - Uses Electron's ``autoUpdater`` API to query update server

2. **Download Process:**
   
   - Updates download automatically when detected
   - Progress shown via notifications
   - Background download prevents interruption of work

3. **Installation Flow:**
   
   - User prompted to Install & Restart or Restart Later when update ready
   - Update applied during application restart

  The flow chart for the update process is as follows:

  .. image:: images/auto_update_desktop_app.png
    :alt: Auto-update Desktop App
    :align: center

User Interface Components
=========================

1. **Notification Types:**
   
   - Update available
   - Download progress
   - Update ready to install
   - Error notifications

2. **Menu Integration:**
   
   - Check for Updates option in pgAdmin 4 menu
   - Restart to Update option when  update available

Error Handling
==============

The system includes comprehensive error handling:

1. **Network Errors:**
   
   - Connection timeouts
   - Download failures
   - Server unavailability

2. **Installation Errors:**
   
   - Corrupted downloads

3. **Recovery Mechanisms:**
   
   - Fallback to manual update
   - Error reporting to logs

Security Considerations
=======================

The update system implements below security measures:

1. **Secure Communication:**

   - Protected update metadata

Platform-Specific Notes
=======================

1. **macOS:**
   
   - Uses native update mechanisms
   - Requires signed packages

References
==========

- `Electron autoUpdater API Documentation <https://www.electronjs.org/docs/latest/api/auto-updater>`_