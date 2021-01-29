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
    `here <https://git.postgresql.org/gitweb/?p=pgadmin4.git;a=blob_plain;f=README>`_,
    but be aware that this may differ from the version included with the source code
    for a specific version of pgAdmin.

Configuration
*************

From pgAdmin 4 v2 onwards, the default configuration mode is server, however,
this is overridden by the desktop runtime at startup. In most environments, no
Python configuration is required unless you wish to override other default
settings.

See :ref:`config_py` for more information on configuration settings.

Runtime
*******

When executed, the runtime will automatically try to execute the pgAdmin Python
application. If execution fails, it will prompt you with error message
displaying a *Configure* button at the bottom. You can configure a fixed port
number to avoid clashes of the default random port number with other
applications and a connection timeout if desired.

If the error is related to Python Path or pgAdmin Python file then you need to
create a file named 'dev_config.json' and specify the following entries:

{
    "pythonPath": <PATH OF THE PYTHON BINARY> For Example: "../../venv/bin/python3",

    "pgadminFile": <PATH OF THE pgAdmin4.py> For Example: "../web/pgAdmin4.py"

}

Note that the dev_config.py file should only be required by developers who are
working outside of a standard installation.

The configuration settings are stored in *runtime_config.json* file, which
will be available on Unix systems (~/.local/share/pgadmin/),
on Mac OS X (~/Library/Preferences/pgadmin),
and on Windows (%APPDATA%/pgadmin).

The configuration settings:

.. table::
   :class: longtable
   :widths: 2 1 4

   +--------------------------+--------------------+---------------------------------------------------------------+
   | Key                      | Type               | Purpose                                                       |
   +==========================+====================+===============================================================+
   | FixedPort                | Boolean            | Use a fixed network port number rather than a random one.     |
   +--------------------------+--------------------+---------------------------------------------------------------+
   | PortNumber               | Integer            | The port number to use, if using a fixed port.                |
   +--------------------------+--------------------+---------------------------------------------------------------+
   | ConnectionTimeout        | Integer            | The number of seconds to wait for application server startup. |
   +--------------------------+--------------------+---------------------------------------------------------------+

