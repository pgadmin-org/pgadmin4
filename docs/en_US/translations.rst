*********************
`Translations`:index:
*********************

pgAdmin supports multiple languages using the `Flask-Babel
<https://pythonhosted.org/Flask-Babel/>`_ Python module. A list of supported
languages is included in the **web/config.py** configuration file and must be
updated whenever languages are added or removed with
`ISO 639-1 <https://en.wikipedia.org/wiki/ISO_639-1>`_ (two letter) language
codes. The codes are named **$LANG** in this document.

Translation Marking
*******************

Strings can be marked for translation in either Python code (using **gettext()**)
or Jinja templates (using **_()**). Here are some examples that show how this
is achieved.

Python:

.. code-block:: python

    errormsg = gettext('No server group name was specified')

Jinja:

.. code-block:: html

    <input type="submit" value="{{ _('Change Password') }}">

.. code-block:: html

    <title>{{ _('%(appname)s Password Change', appname=config.APP_NAME) }}</title>

.. code-block:: javascript

    define(['sources/gettext', ...], function(gettext, ...){
        ...
        var alert = alertify.prompt(
            gettext('Password Change'),
            gettext('New password for %(userName)s', {userName: 'jsmith' }),
            ...
        )
    })


Updating and Merging
********************

Whenever new strings are added to the application, the template catalogue
(**web/pgadmin/messages.pot**) and the existing translation
catalogues (**web/pgadmin/translations/$LANG/LC_MESSAGES/messages.po**) must be
updated and compiled. This can be achieved using the following commands from the
**web** directory in the Python virtual environment for pgAdmin:

.. code-block:: bash

    (pgadmin4) user$ pybabel extract -F babel.cfg -o pgadmin/messages.pot pgadmin

Once the template has been updated it needs to be merged into the existing
message catalogues:

.. code-block:: bash

    (pgadmin4) user$ pybabel update -i pgadmin/messages.pot -d pgadmin/translations

Finally, the message catalogues can be compiled for use:

.. code-block:: bash

    (pgadmin4) user$ pybabel compile -d pgadmin/translations

Adding a New Language
*********************

Adding a new language is simple. First, add the language name and identifier to
**web/config.py**::

    # Languages we support in the UI
    LANGUAGES = {
        'en': 'English',
        'zh': 'Chinese (Simplified)',
        'de': 'German',
        'pl': 'Polish'
    }

Then, create the new message catalogue from the **web** directory in the source
tree in the Python virtual environment for pgAdmin:

.. code-block:: bash

    (pgadmin4) user$ pybabel init -i pgadmin/messages.pot -d pgadmin/translations -l $LANG
