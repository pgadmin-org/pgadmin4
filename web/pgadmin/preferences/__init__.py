##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
#
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Implements the routes for creating Preferences/Options Dialog on the client
side and for getting/setting preferences.
"""

import simplejson as json
from flask import render_template, url_for, Response, request
from flask_babel import gettext
from flask_login import current_user
from flask_security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import success_return, \
    make_response as ajax_response, internal_server_error
from pgadmin.utils.menu import MenuItem
from pgadmin.utils.preferences import Preferences

MODULE_NAME = 'preferences'


class PreferencesModule(PgAdminModule):
    """
    PreferenceModule represets the preferences of different modules to the
    user in UI.

    And, allows the user to modify (not add/remove) as per their requirement.
    """

    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.preferences',
            'path': url_for('preferences.index') + 'preferences',
            'when': None
        }]

    def get_own_stylesheets(self):
        return [url_for('preferences.static', filename='css/preferences.css')]

    def get_own_menuitems(self):
        return {
            'file_items': [
                MenuItem(name='mnu_preferences',
                         priority=999,
                         module="pgAdmin.Preferences",
                         callback='show',
                         icon='fa fa-cog',
                         label=gettext('Preferences'))
            ]
        }


blueprint = PreferencesModule(MODULE_NAME, __name__)


@blueprint.route("/")
@login_required
def index():
    """Render the preferences dialog."""
    return render_template(
        MODULE_NAME + "/index.html",
        username=current_user.email,
        _=gettext
    )


@blueprint.route("/preferences.js")
@login_required
def script():
    """render the required javascript"""
    return Response(response=render_template("preferences/preferences.js", _=gettext),
                    status=200,
                    mimetype="application/javascript")


@blueprint.route("/preferences", methods=["GET"])
@blueprint.route("/preferences/<module>/<preference>")
@login_required
def preferences(module=None, preference=None):
    """Fetch all/or requested preferences of pgAdmin IV."""

    if module is not None and preference is not None:
        try:
            m = Preferences.module(module, create=False)
            if m is None:
                return Response(status=404)

            p = m.preference(preference)
            if p is None:
                return Response(status=404)

            return ajax_response(
                response=p.to_json(),
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    # Load Preferences
    pref = Preferences.preferences()
    res = []

    def label(p):
        return p['label']

    for m in pref:
        if len(m['categories']):
            om = {
                "id": m['id'],
                "label": m['label'],
                "inode": True,
                "open": True,
                "branch": []
            }

            for c in m['categories']:
                oc = {
                    "id": c['id'],
                    "mid": m['id'],
                    "label": c['label'],
                    "inode": False,
                    "open": False,
                    "preferences": sorted(c['preferences'], key=label)
                }

                (om['branch']).append(oc)
            om['branch'] = sorted(om['branch'], key=label)

            res.append(om)

    return ajax_response(
        response=sorted(res, key=label),
        status=200
    )


@blueprint.route("/preferences/<int:pid>", methods=["PUT"])
@login_required
def save(pid):
    """
    Save a specific preference.
    """
    data = request.form if request.form else json.loads(request.data.decode())

    res, msg = Preferences.save(data['mid'], data['cid'], data['id'], data['value'])

    if not res:
        return internal_server_error(errormsg=msg)

    return success_return()
