##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Search Object feature"""

from flask import request
from flask_babelex import gettext
from flask_security import login_required

from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response, bad_request,\
    internal_server_error
from pgadmin.utils.preferences import Preferences
from pgadmin.tools.search_objects.utils import SearchObjectsHelper

MODULE_NAME = 'search_objects'


class SearchObjectsModule(PgAdminModule):
    LABEL = gettext('Search objects')

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for search_object module
        """
        return ['search_objects.search', 'search_objects.types']

    def show_system_objects(self):
        """
        return system preference objects
        """
        return self.pref_show_system_objects.get()

    def register_preferences(self):
        """
        Get show_system_objects preference
        """
        browser_preference = Preferences.module('browser')
        self.pref_show_system_objects =\
            browser_preference.preference('show_system_objects')


# Create blueprint for BackupModule class
blueprint = SearchObjectsModule(
    MODULE_NAME, __name__, static_url_path=''
)


@blueprint.route("/", endpoint='index')
@login_required
def index():
    return bad_request(errormsg=gettext("This URL cannot be called directly."))


@blueprint.route("types/<int:sid>/<int:did>", endpoint='types')
@login_required
def types(sid, did):
    so_obj = SearchObjectsHelper(sid, did, blueprint.show_system_objects())
    return make_json_response(data=so_obj.get_supported_types())


@blueprint.route("search/<int:sid>/<int:did>", endpoint='search')
@login_required
def search(sid, did):
    """
    URL args:
        text <required>: search text
        type <optional>: type of object to be searched.
    """
    text = request.args.get('text', None)
    obj_type = request.args.get('type', None)

    so_obj = SearchObjectsHelper(sid, did, blueprint.show_system_objects())

    status, res = so_obj.search(text, obj_type)

    if not status:
        return internal_server_error(errormsg=res)

    return make_json_response(data=res)
