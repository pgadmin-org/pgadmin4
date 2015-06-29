from pgadmin import PgAdminModule
from flask.ext.security import login_required
from flask import redirect, url_for

MODULE_NAME = 'redirects'

blueprint = PgAdminModule(MODULE_NAME, __name__,
                          url_prefix='/')

@blueprint.route('/')
@login_required
def index():
    """Redirect users hitting the root to the browser"""
    return redirect(url_for('browser.index'))

@blueprint.route('/favicon.ico')
def favicon():
    """Redirect to the favicon"""
    return redirect(url_for('static', filename='favicon.ico'))
