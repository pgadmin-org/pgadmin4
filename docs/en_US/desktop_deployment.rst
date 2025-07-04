.. _desktop_deployment:

***************************
`Desktop Deployment`:index:
***************************

pgAdmin may be deployed as a desktop application by configuring the application
to run in desktop mode and then utilising the desktop runtime to host the
program on a supported Windows, Mac OS X or Linux installation.

The desktop runtime is a standalone application that when launched, runs the
pgAdmin server and opens a window to render the user interface.

.. note:: Pre-compiled and configured installation packages are available for
     a number of platforms. These packages should be used by end-users whereever
     possible - the following information is useful for the maintainers of those
     packages and users interested in understanding how pgAdmin works.

.. seealso:: For detailed instructions on building and configuring pgAdmin from
    scratch, please see the README file in the top level directory of the source code.
    For convenience, you can find the latest version of the file
    `here <https://github.com/pgadmin-org/pgadmin4/blob/master/README.md>`_,
    but be aware that this may differ from the version included with the source code
    for a specific version of pgAdmin.

Configuration
*************

From pgAdmin 4 v2 onwards, the default configuration mode is server, however,
this is overridden by the desktop runtime at startup. In most environments, no
Python configuration is required unless you wish to override other default
settings.

See :ref:`config_py` for more information on configuration settings.

Desktop Runtime Standalone Application
======================================

The Desktop Runtime is based on `Electron <https://www.electronjs.org/>`_ which integrates a
browser and the Python server creating a standalone application.

.. image:: images/runtime_standalone.png
    :alt: Runtime Standalone
    :align: center

Runtime Menu Items
------------------

.. image:: images/runtime_menu.png
    :alt: Runtime Menu
    :align: center

Use the *File Menu* to access the runtime menu items:

+-------------------------+---------------------------------------------------------------------------------------------------------+
| Option                  | Action                                                                                                  |
+=========================+=========================================================================================================+
| *View logs...*          | Click to open the view log dialog to view the pgAdmin 4 logs.                                           |
+-------------------------+---------------------------------------------------------------------------------------------------------+
| *Configure runtime...*  | Click to open configuration dialog to configure fixed port, port number and connection timeout.         |
+-------------------------+---------------------------------------------------------------------------------------------------------+

Configuration Dialog
--------------------

Use the *Configure runtime...* option to access the *Configuration* dialog:

.. image:: images/runtime_configuration.png
    :alt: Runtime Configuration
    :align: center

Following are the details of the *Fixed port number?*, *Port Number*, *Connection
Timeout*, and 'Open Documentation in Default Browser?' configuration parameters:

.. table::
   :class: longtable
   :widths: 2 1 4

   +----------------------------------------+--------------------+---------------------------------------------------------------+
   | Key                                    | Type               | Purpose                                                       |
   +========================================+====================+===============================================================+
   | FixedPort                              | Boolean            | Use a fixed network port number rather than a random one.     |
   +----------------------------------------+--------------------+---------------------------------------------------------------+
   | PortNumber                             | Integer            | The port number to use, if using a fixed port.                |
   +----------------------------------------+--------------------+---------------------------------------------------------------+
   | ConnectionTimeout                      | Integer            | The number of seconds to wait for application server startup. |
   +----------------------------------------+--------------------+---------------------------------------------------------------+
   | Open Documentation in Default Browser  | Boolean            | By checking this option, all documentation links will open in |
   |                                        |                    | the default browser instead of in a new window.               |
   +----------------------------------------+--------------------+---------------------------------------------------------------+

Log dialog
----------

Use the *File Menu* to access the *View Logs* dialog:

.. image:: images/runtime_view_log.png
    :alt: Runtime View Log
    :align: center

Click on the *Reload* button at the bottom to view the latest logs of pgAdmin 4
Server.

When executed, the runtime will automatically try to execute the pgAdmin Python
application. If execution fails, it will prompt you with error message
displaying a *Configure* button at the bottom. You can configure a fixed port
number to avoid clashes of the default random port number with other
applications and a connection timeout if desired.

.. image:: images/runtime_error.png
    :alt: Runtime Error
    :align: center

If the error is related to Python Path or pgAdmin Python file then you need to
create a file named 'dev_config.json' and specify the following entries:

.. code-block:: json

    {
        "pythonPath": "/path/to/python.exe",
        "pgadminFile": "/path/to/pgAdmin4.py"
    }

Note that the *dev_config.py* file should only be required by developers who are
working outside of a standard installation.

The configuration settings are stored in *runtime_config.json* file, which
will be available on Unix systems (~/.local/share/pgadmin/),
on Mac OS X (~/Library/Preferences/pgadmin),
and on Windows (%APPDATA%/pgadmin).


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
    :alt: Runtime View Log
    :align: center

Technical Architecture
======================

1. **Main Process**

   Handles core update functionality:

   File: runtime/src/js/pgadmin.js

   .. code-block:: javascript

      autoUpdater.on('checking-for-update', () => {
         misc.writeServerLog('[Auto-Updater]: Checking for update...');
      });

      autoUpdater.on('update-available', () => {
         setConfigAndRefreshMenu('update-available');
         misc.writeServerLog('[Auto-Updater]: Update downloading...');
         pgAdminMainScreen.webContents.send('notifyAppAutoUpdate', {update_downloading: true});
      });

2. **Renderer Process**

   Manages user interface updates:

   File: web/pgadmin/static/js/BrowserComponent.jsx

   .. code-block:: javascript

      if (window.electronUI && typeof window.electronUI.notifyAppAutoUpdate === 'function') {
         window.electronUI.notifyAppAutoUpdate((data)=>{
            if (data?.check_version_update) {
               pgAdmin.Browser.check_version_update(true);
            } else if (data.update_downloading) {
               appAutoUpdateNotifier('Update downloading...', 'info', null, 10000);
            } else if (data.no_update_available) {
               appAutoUpdateNotifier('No update available.....', 'info', null, 10000);
            } else if (data.update_downloaded) {
               const UPDATE_DOWNLOADED_MESSAGE = gettext('An update is ready. Restart the app now to install it, or later to keep using the current version.');
               appAutoUpdateNotifier(UPDATE_DOWNLOADED_MESSAGE, 'warning', installUpdate, null, 'Update downloaded', 'update_downloaded');
            } else if (data.error) {
               appAutoUpdateNotifier(`${data.errMsg}`, 'error');
            } else if (data.update_installed) {
               const UPDATE_INSTALLED_MESSAGE = gettext('Update installed successfully!');
               appAutoUpdateNotifier(UPDATE_INSTALLED_MESSAGE, 'success');
            }
         });
      }

3. **Update Server Communication**

   - Configures update feed URL based on version information
   - Handles server response validation
   - Manages error conditions

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