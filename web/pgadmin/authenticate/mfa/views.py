##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
"""Multi-factor Authentication (MFA) views"""

import base64
from typing import Union

from flask import Response, render_template, request, flash, \
    current_app, url_for, redirect, session
from flask_babel import gettext as _
from flask_login import current_user, login_required
from flask_login.utils import login_url

from pgadmin.utils.csrf import pgCSRFProtect
from pgadmin.utils.ajax import bad_request
from .utils import user_supported_mfa_methods, mfa_user_registered, \
    mfa_suppored_methods, ValidationException, mfa_delete, is_mfa_enabled, \
    is_mfa_session_authenticated
from pgadmin.utils.constants import MessageType


_INDEX_URL = "browser.index"
_NO_CACHE_HEADERS = dict({
    "Cache-Control": "no-cache, no-store, must-revalidate, public, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
})


def __handle_mfa_validation_request(
    mfa_method: str, user_mfa_auths: dict, form_data: dict
) -> None:
    """
    An internal utlity function to execute mfa.validate(...) method in case, it
    matched the following conditions:
    1. Method specified is a valid and in the supported methods list.
    2. User has registered for this auth method.

    Otherwise, raise an exception with appropriate error message.

    Args:
        mfa_method (str)     : Name of the authentication method
        user_mfa_auths (dict): List of the user supported authentication method
        form_data (dict)     : Form data in the request

    Raises:
        ValidationException: Raise the exception when user is not registered
                             for the given method, or not a valid MFA method.
    """

    if mfa_method is None:
        raise ValidationException(_("No authentication method provided."))

    mfa_auth = user_mfa_auths.get(mfa_method, None)

    if mfa_auth is None:
        raise ValidationException(_(
            "No user supported authentication method provided"
        ))

    mfa_auth.validate(**form_data)


@pgCSRFProtect.exempt
@login_required
def validate_view() -> Response:
    """
    An end-point to render the authentication view.

    It supports two HTTP methods:
    1. GET : Generate the view listing all the supported auth methods.
    2. POST: Validate the code/OTP, or whatever data the selected auth method
             supports.

    Returns:
        Response: Redirect to 'next' url in case authentication validate,
                  otherwise - a view with listing down all the supported auth
                  methods, and it's supporting views.
    """

    # Load at runtime to avoid circular dependency
    from pgadmin.authenticate import get_logout_url

    next_url = request.args.get("next", None)

    if next_url is None or next_url == url_for('mfa.register') or \
            next_url == url_for('mfa.validate'):
        next_url = url_for(_INDEX_URL)

    if session.get('mfa_authenticated', False) is True:
        return redirect(next_url)

    return_code = 200
    mfa_method = None
    user_mfa_auths = user_supported_mfa_methods()

    if request.method == 'POST':
        try:
            form_data = {key: request.form[key] for key in request.form}
            next_url = form_data.pop('next', url_for(_INDEX_URL))
            mfa_method = form_data.pop('mfa_method', None)

            __handle_mfa_validation_request(
                mfa_method, user_mfa_auths, form_data
            )

            session['mfa_authenticated'] = True

            return redirect(next_url)

        except ValidationException as ve:
            current_app.logger.warning((
                "MFA validation failed for the user '{}' with an error: "
                "{}"
            ).format(current_user.username, str(ve)))
            flash(str(ve), MessageType.ERROR)
            return_code = 401
        except Exception as ex:
            current_app.logger.exception(ex)
            flash(str(ex), MessageType.ERROR)
            return_code = 500

    mfa_views = {
        key: user_mfa_auths[key].validation_view_dict(mfa_method)
        for key in user_mfa_auths
    }

    if mfa_method is None and len(mfa_views) > 0:
        list(mfa_views.items())[0][1]['selected'] = True

    send_email_url = None
    if 'email' in mfa_views:
        send_email_url = url_for("mfa.send_email_code")

    return Response(render_template(
        "mfa/validate.html", _=_, views=mfa_views, base64=base64,
        logout_url=get_logout_url(),
        send_email_url=send_email_url
    ), return_code, headers=_NO_CACHE_HEADERS, mimetype="text/html")


def _mfa_registration_view(
    supported_mfa: dict, form_data: dict
) -> Union[str, None]:
    """
    An internal utility function to generate the registration view, or
    unregister for the given MFA object (passed as a dict).

    It will call 'registration_view' function, specific for the MFA method,
    only if User has clicked on 'Setup' button on the registration page, and
    current user is not already registered for the Auth method.

    If the user has not clicked on the 'Setup' button, we assume that he has
    clicked on the 'Delete' button for a specific auth method.

    Args:
        supported_mfa (dict): [description]
        form_data (dict): [description]

    Returns:
        Union[str, None]: When registration for the Auth method is completed,
                          it could return None, otherwise view for the
                          registration view.
    """
    mfa = supported_mfa['mfa']

    if form_data[mfa.name] == 'SETUP':
        if supported_mfa['registered'] is True:
            flash(_("'{}' is already registerd'").format(mfa.label),
                  MessageType.SUCCESS)
            return None

        return mfa.registration_view(form_data)

    if mfa_delete(mfa.name) is True:
        flash(_(
            "'{}' unregistered from the authentication list."
        ).format(mfa.label), MessageType.SUCCESS)

        return None

    flash(_(
        "'{}' is not found in the authentication list."
    ).format(mfa.label), MessageType.WARNING)

    return None


def _registration_view_or_deregister(
    _auth_list: dict
) -> Union[str, bool, None]:
    """
    An internal utility function to parse the request, and act upon it:
    1. Find the auth method in the request, and call the
       '_mfa_registration_view' internal utility function for the same, and
       return the result of it.

    It could return a registration view as a string, or None (on
    deregistering).

    Args:
        _auth_list (dict): List of all supported methods with a flag for the
                           current user registration.

    Returns:
        Union[str, bool, None]: When no valid request found, it will return
                                False, otherwise the response of the
                                '_mfa_registration_view(...)' method call.
    """

    for key in _auth_list:
        if key in request.form:
            return _mfa_registration_view(
                _auth_list[key], request.form
            )

    return False


def __handle_registration_view_for_post_method(
    _next_url: str, _mfa_auths: dict
) -> (Union[str, None], Union[Response, None], Union[dict, None]):
    """
    An internal utility function to handle the POST method for the registration
    view. It will pass on the request data to the appropriate Auth method, and
    may generate further registration view. When registration is completed, it
    will redirect to the 'next_url' in case the registration page is not opened
    from the internal dialog through menu, which can be identified by the
    'next_url' value is equal to 'internal'.

    Args:
        _next_url (str)  : Redirect to which url, when clicked on the
                           'continue' button on the registration page.
        _mfa_auths (dict): A dict object returned by the method -
                           'mfa_suppored_methods'.

    Returns:
        (Union[str, None], Union[Response, None], Union[dict, None]):
        Possibilities:
        1. Returns (None, redirect response to 'next' url, None) in case there
           is not valid 'auth' method found in the request.
        2. Returns (None, Registration view as Response, None) in case when
           valid method found, and it has returned a view to render.
        3. Otherwise - Returns the set as
           (updated 'next' url, None, updated Auth method list)
    """

    next_url = request.form.get("next", None)

    if next_url is None or next_url == url_for('mfa.validate'):
        next_url = url_for(_INDEX_URL)

    if request.form.get('cancel', None) is None:
        view = _registration_view_or_deregister(_mfa_auths)

        if view is False:
            if next_url != 'internal':
                return None, redirect(next_url), None
            flash(_("Please close the dialog."), MessageType.INFO)

        if view is not None:
            return None, Response(
                render_template(
                    "mfa/register.html", _=_,
                    mfa_list=list(), mfa_view=view,
                    next_url=next_url,
                    error_message=None
                ), 200,
                headers=_NO_CACHE_HEADERS
            ), None

        # Regenerate the supported MFA list after
        # registration/deregistration.
        _mfa_auths = mfa_suppored_methods()

    return next_url, None, _mfa_auths


@pgCSRFProtect.exempt
@login_required
def registration_view() -> Response:
    """
    A url end-point to register/deregister an authentication method.

    It supports two HTTP methods:
    * GET : Generate a view listing all the suppoted list with 'Setup',
            or 'Delete' buttons. If user has registered for the auth method, it
            will render a 'Delete' button next to it, and 'Setup' button
            otherwise.
    * POST: This handles multiple scenarios on the registration page:
            1. Clicked on the 'Delete' button, it will deregister the user for
               the specific auth method, and render the view same as for the
               'GET' method.
            2. Clicked on the 'Setup' button, it will render the registration
               view for the authentication method.
            3. Clicked 'Continue' button, redirect it to the url specified by
               'next' url.
            4. Clicking on 'Cancel' button on the Auth method specific view
               will render the view by 'GET' HTTP method.
            5. A registration method can run like a wizard, and generate
               different views based on the request data.

    Returns:
        Response: A response object with list of auth methods, a registration
                  view, or redirect to 'next' url
    """
    mfa_auths = mfa_suppored_methods()
    mfa_list = list()

    next_url = request.args.get("next", None)

    if request.method == 'POST':
        next_url, response, mfa_auths = \
            __handle_registration_view_for_post_method(next_url, mfa_auths)

        if response is not None:
            return response

    if next_url is None:
        next_url = url_for(_INDEX_URL)

    error_message = None
    found_one_mfa = False

    for key in mfa_auths:
        mfa = mfa_auths[key]['mfa']
        mfa = mfa.to_dict()
        mfa["registered"] = mfa_auths[key]["registered"]
        mfa_list.append(mfa)
        found_one_mfa = found_one_mfa or mfa["registered"]

    if request.method == 'GET':
        if is_mfa_enabled() is False:
            error_message = _(
                "Can't access this page, when multi factor authentication is "
                "disabled."
            )
        elif is_mfa_session_authenticated() is False and \
                found_one_mfa is True:
            flash(_("Complete the authentication process first"),
                  MessageType.ERROR)
            return redirect(login_url("mfa.validate", next_url=next_url))

    return Response(render_template(
        "mfa/register.html", _=_,
        mfa_list=mfa_list, mfa_view=None, next_url=next_url,
        error_message=error_message
    ), 200 if error_message is None else 401, headers=_NO_CACHE_HEADERS)
