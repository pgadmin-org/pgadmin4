************
Translations
************

pgAdmin supports multiple languages using the `Flask-Babel 
<https://pythonhosted.org/Flask-Babel/>`_ Python module. A list of supported 
languages is included in the **web/config.py** configuration file and must be 
updated whenever langauges are added or removed.

Translation Marking
===================

Strings can be marked for translation in either Python code (using **gettext()**)
or Jinja templates (using **_()**). Here are some examples that show how this 
is achieved.

Python::

    errormsg = gettext('No server group name was specified')
    
Jinja:

.. code-block:: html

    <input type="submit" value="{{ _('Change Password') }}">
    
.. code-block:: html

    <title>{{ _('%(appname)s Password Change', appname=config.APP_NAME) }}</title>
    
.. code-block:: javascript

    var alert = alertify.prompt(
        '{{ _('Add a server group') }}',
        '{{ _('Enter a name for the new server group') }}', 
        ''
        ...
    )
    
Updating and Merging
====================

Whenever new strings are added to the application, the template catalogues
(**web/pgadmin/messages.pot**) must be updated and the existing catalogues 
merged with the updated template and compiled. This can be achieved using the 
following command from the **web** directory, in the Python virtual environment 
used for pgAdmin:

.. code-block:: bash

    (pgadmin4)piranha:web dpage$ pybabel extract -F babel.cfg -o pgadmin/messages.pot pgadmin
    
For example:

.. code-block:: bash

    (pgadmin4)piranha:web dpage$ pybabel extract -F babel.cfg -o pgadmin/messages.pot pgadmin
    extracting messages from pgadmin/__init__.py
    extracting messages from pgadmin/about/__init__.py
    extracting messages from pgadmin/about/hooks.py
    extracting messages from pgadmin/about/views.py
    extracting messages from pgadmin/about/templates/about/index.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/browser/__init__.py
    extracting messages from pgadmin/browser/hooks.py
    extracting messages from pgadmin/browser/views.py
    extracting messages from pgadmin/browser/nodes/CollectionNode.py
    extracting messages from pgadmin/browser/nodes/ObjectNode.py
    extracting messages from pgadmin/browser/nodes/__init__.py
    extracting messages from pgadmin/browser/nodes/server_groups/__init__.py
    extracting messages from pgadmin/browser/nodes/server_groups/hooks.py
    extracting messages from pgadmin/browser/nodes/server_groups/views.py
    extracting messages from pgadmin/browser/templates/browser/body.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/browser/templates/browser/index.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/browser/templates/browser/messages.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/help/__init__.py
    extracting messages from pgadmin/help/hooks.py
    extracting messages from pgadmin/help/views.py
    extracting messages from pgadmin/redirects/__init__.py
    extracting messages from pgadmin/redirects/views.py
    extracting messages from pgadmin/settings/__init__.py
    extracting messages from pgadmin/settings/hooks.py
    extracting messages from pgadmin/settings/settings_model.py
    extracting messages from pgadmin/settings/views.py
    extracting messages from pgadmin/templates/base.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/templates/security/change_password.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/templates/security/fields.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/templates/security/forgot_password.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/templates/security/login_user.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/templates/security/messages.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/templates/security/panel.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/templates/security/reset_password.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/templates/security/watermark.html (extensions="jinja2.ext.autoescape,jinja2.ext.with_")
    extracting messages from pgadmin/test/__init__.py
    extracting messages from pgadmin/test/hooks.py
    extracting messages from pgadmin/test/views.py
    extracting messages from pgadmin/utils/__init__.py
    extracting messages from pgadmin/utils/views.py
    writing PO template file to pgadmin/messages.pot

Once the template has been updated, it needs to be merged into the existing 
message catalogues, for example:

.. code-block:: bash

    (pgadmin4)piranha:web dpage$ pybabel update -i pgadmin/messages.pot -d pgadmin/translations
    updating catalog 'pgadmin/translations/fr/LC_MESSAGES/messages.po' based on 'pgadmin/messages.pot'

Finally, the message catalogues can be compiled for use:

.. code-block:: bash

    (pgadmin4)piranha:web dpage$ pybabel compile -d pgadmin/translations
    compiling catalog 'pgadmin/translations/fr/LC_MESSAGES/messages.po' to 'pgadmin/translations/fr/LC_MESSAGES/messages.mo'

Adding a new Language
=====================

Adding a new language is simple. First, add the language name and identifier to
**web/config.py**::

    # Languages we support in the UI
    LANGUAGES = {
        'en': 'English',
        'fr': 'Français'
    }

Then, create the new message catalogue from the **web** directory in the source 
tree, in the Python virtual environment used for pgAdmin:

.. code-block:: bash

    (pgadmin4)piranha:web dpage$ pybabel init -i pgadmin/messages.pot -d pgadmin/translations -l fr
    
This will initialise a new catalogue for a French translation.

