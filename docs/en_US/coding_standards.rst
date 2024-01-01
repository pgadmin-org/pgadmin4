.. _coding_standards:

*************************
`Coding Standards`:index:
*************************

pgAdmin uses multiple technologies and multiple languages, each of which have
their own coding standards.

General
*******

In all languages, indentations should be made with 4 spaces, and excessively long
lines wrapped where appropriate to ensure they can be read on smaller displays
(80 characters is used in many places, but this is not a required maximum size
as it's quite wasteful on modern displays). Typically lines should not be longer
than 120 characters.

Comments should be included in all code where required to explain its
purpose or how it works if not obvious from a quick review of the code itself.

CSS 3
*****

CSS3 is used for styling and layout throughout the application.

Most custom styling comes from individual modules which may advertise static
stylesheets to be included in the module that is loading them via hooks.

Styling overrides (for example, to alter the look and feel) will
typically be found in the **overrides.css** file in the main static file
directory for the application.

Styling should never be applied inline in HTML, always through an external
stylesheet, which should contain comments as appropriate to explain the usage
or purpose for the style.

Styles should be specified clearly, one per line. For example:

.. code-block:: css

    /* iFrames should have no border */
    iframe {
        border-width: 0;
    }

    /* Ensure the codemirror editor displays full height gutters when resized */
    .CodeMirror, .CodeMirror-gutters {
        height: 100% !important;
    }

All stylesheets must be CSS3 compliant.

HTML 5
******

HTML 5 is used for page structure throughout the application, in most cases
being rendered from templates by the Jinja2 template engine in Flask.

All HTML must be HTML 5 compliant.

Javascript
**********

Client-side code is written in Javascript using ReactJS and various plugins.
Whilst much of the code is rendered from static files, there is also code that
is rendered from templates using Jinja2 (often to inject the users settings) or
constructed on the fly from module hooks.

A typical Javascript function might be formatted like this (this snipped is from
a template):

.. code-block:: javascript

    // Delete a server group
    function delete_server_group(item) {
        alertify.confirm(
            'Delete server group?',
            'Are you sure you wish to delete the server group "{0}"?'.replace('{0}', tree.getLabel(item)),
            function() {
                var id = tree.getId(item)
                $.post("{{ url_for('NODE-server-group.delete') }}", { id: id })
                    .done(function(data) {
                        if (data.success == 0) {
                            report_error(data.errormsg, data.info);
                        } else {
                            var next = tree.next(item);
                            var prev = tree.prev(item);
                            tree.remove(item);
                            if (next.length) {
                                tree.select(next);
                            } else if (prev.length) {
                                tree.select(prev);
                            }
                        }
                    }
                )
            },
            null
        )
    }

Note the use of a descriptive function name, using the underscore character to
separate words in all lower case, and short but descriptive lower case variable
names.

.. note:: From version 3.0 onwards, new or refactored code should be written using
     ES6 features and conventions.

Python
******

Python is used for the backend web server. All code must be compatible with
Python 2.7 and should include PyDoc comments whilst following the official
Python coding standards defined in
`PEP 8 <https://www.python.org/dev/peps/pep-0008/>`_. An example function along
with the required file header is shown below::

    ##########################################################################
    #
    # pgAdmin 4 - PostgreSQL Tools
    #
    # Copyright (C) 2013 - 2024, The pgAdmin Development Team
    # This software is released under the PostgreSQL Licence
    #
    ##########################################################################

    """Integration hooks for server groups."""

    from flask import render_template, url_for
    from flask.ext.security import current_user

    from pgadmin.settings.settings_model import db, ServerGroup

    def get_nodes():
        """Return a JSON document listing the server groups for the user"""
        groups = ServerGroup.query.filter_by(user_id=current_user.id)

        value = ''
        for group in groups:
            value += '{"id":%d,"label":"%s","icon":"icon-server-group","inode":true},' \
                     % (group.id, group.name)

        value = value[:-1]

        return value
