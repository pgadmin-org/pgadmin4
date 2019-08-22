.. _config_py:

***************************
`The config.py File`:index:
***************************

There are multiple configuration files that are read at startup by pgAdmin. These
are as follows:

* ``config.py``: This is the main configuration file, and should not be modified.
  It can be used as a reference for configuration settings, that may be overridden
  in one of the following files.

* ``config_distro.py``: This file is read after ``config.py`` and is intended for
  packagers to change any settings that are required for their pgAdmin distribution.
  This may typically include certain paths and file locations. This file is optional,
  and may be created by packagers in the same directory as ``config.py`` if
  needed.

* ``config_local.py``: This file is read after ``config_distro.py`` and is intended
  for end users to change any default or packaging specific settings that they may
  wish to adjust to meet local preferences or standards.This file is optional,
  and may be created by users in the same directory as ``config.py`` if
  needed.

.. note:: If the SERVER_MODE setting is changed in ``config_distro.py`` or ``config_local.py``,
     you will most likely need to re-set the LOG_FILE, SQLITE_PATH, SESSION_DB_PATH
     and STORAGE_DIR values as well as they will have been set based on the default
     configuration or overridden by the runtime.

The default ``config.py`` file is shown below for reference:

.. literalinclude:: ../../web/config.py
   :language: python
