##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
"""Multi-factor Authentication implementation by sending OTP through email"""

from flask import url_for, session, Response, render_template, current_app, \
    flash
from flask_babel import gettext as _
from flask_login import current_user
from flask_security import send_mail

import config
from pgadmin.utils.csrf import pgCSRFProtect
from .registry import BaseMFAuth
from .utils import ValidationException, mfa_add, fetch_auth_option
from pgadmin.utils.constants import MessageType


def __generate_otp() -> str:
    """
    Generate a six-digits one-time-password (OTP) for the current user.

    Returns:
        str: A six-digits OTP for the current user
    """
    import time
    import codecs
    import secrets

    code = codecs.encode("{}{}{}".format(
        time.time(), current_user.username, secrets.choice(range(1000, 9999))
    ).encode(), "hex")

    res = 0
    idx = 0

    while idx < len(code):
        res += int((code[idx:idx + 6]).decode('utf-8'), base=16)
        res %= 1000000
        idx += 5

    return str(res).zfill(6)


def _send_code_to_email(_email: str = None) -> (bool, int, str):
    """
    Send the code to the email address, provided in the argument or to the
    email address of the current user, provided during the registration.

    Args:
        _email (str, optional): Email Address, where to send the OTP code.
                                Defaults to None.

    Returns:
        (bool, int, str): Returns a set as (failed?, HTTP Code, message string)
                          If 'failed?' is True, message contains the error
                          message for the user, else it contains the success
                          message for the user to consume.
    """

    if not current_user.is_authenticated:
        return False, 401, _("Not accessible")

    if _email is None:
        _email = getattr(current_user, 'email', None)

    if _email is None:
        return False, 401, _("No email address is available.")

    try:
        session["mfa_email_code"] = __generate_otp()
        subject = getattr(config, 'MFA_EMAIL_SUBJECT', None)

        if subject is None:
            subject = _("{} - Verification Code").format(config.APP_NAME)

        send_mail(
            subject,
            _email,
            "send_email_otp",
            user=current_user,
            code=session["mfa_email_code"]
        )
    except OSError as ose:
        current_app.logger.exception(ose)
        return False, 503, _("Failed to send the code to email.") + \
            "\n" + str(ose)

    message = _(
        "A verification code was sent to {}. Check your email and enter "
        "the code."
    ).format(_mask_email(_email))

    return True, 200, message


def _mask_email(_email: str) -> str:
    """

    Args:
        _email (str): Email address to be masked

    Returns:
        str: Masked email address
    """
    import re
    email_split = re.split('@', _email)
    username, domain = email_split
    domain_front, *domain_back_list = re.split('[.]', domain)
    users = re.split('[.]', username)

    def _mask_except_first_char(_str: str) -> str:
        """
        Mask all characters except first character of the input string.
        Args:
            _str (str): Input string to be masked

        Returns:
            str: Masked string
        """
        return _str[0] + '*' * (len(_str) - 1)

    return '.'.join([_mask_except_first_char(user) for user in users]) + \
        '@' + _mask_except_first_char(domain_front) + '.' + \
        '.'.join(domain_back_list)


def send_email_code() -> Response:
    """
    Send the code to the users' email address, stored during the registration.

    Raises:
        ValidationException: Raise this exception when user is not registered
        for this authentication method.

    Returns:
        Flask.Response: Response containing the HTML portion after sending the
                        code to the registered email address of the user.
    """

    options, found = fetch_auth_option(EMAIL_AUTH_METHOD)

    if found is False:
        raise ValidationException(_(
            "User has not registered for email authentication"
        ))

    success, http_code, message = _send_code_to_email(options)

    if success is False:
        return Response(message, http_code, mimetype='text/html')

    return dict(message=message)


@pgCSRFProtect.exempt
def javascript() -> Response:
    """
    Returns the javascript code for the email authentication method.

    Returns:
        Flask.Response: Response object conataining the javscript code for the
                        email auth method.
    """
    if not current_user.is_authenticated:
        return Response(_("Not accessible"), 401, mimetype="text/plain")

    return Response(render_template(
        "mfa/email.js", _=_, url_for=url_for,
    ), 200, mimetype="text/javascript")


EMAIL_AUTH_METHOD = 'email'


def email_authentication_label():
    return _('Email Authentication')


class EmailAuthentication(BaseMFAuth):

    @property
    def name(self):
        return EMAIL_AUTH_METHOD

    @property
    def label(self):
        return email_authentication_label()

    def validate(self, **kwargs):
        code = kwargs.get('code', None)
        email_otp = session.get("mfa_email_code", None)
        if code is not None and email_otp is not None and code == email_otp:
            session.pop("mfa_email_code")
            return
        raise ValidationException("Invalid code")

    def validation_view(self):
        session.pop("mfa_email_code", None)
        return dict(
            description=_("Verify with Email Authentication"),
            button_label=_("Send Code"),
            button_label_sending=_("Sending Code...")
        )

    def _registration_view(self):
        email = getattr(current_user, 'email', '')
        return dict(
            label=email_authentication_label(),
            auth_method=EMAIL_AUTH_METHOD,
            description=_("Enter the email address to send a code"),
            email_address_placeholder=_("Email address"),
            email_address=email,
            note_label=_("Note"),
            note=_(
                "This email address will only be used for two factor "
                "authentication purposes. The email address for the user "
                "account will not be changed."
            ),
        )

    def _registration_view_after_code_sent(self, _form_data):

        session['mfa_email_id'] = _form_data.get('send_to', None)
        success, http_code, message = _send_code_to_email(
            session['mfa_email_id']
        )

        if success is False:
            flash(message, MessageType.ERROR)
            return None

        return dict(
            label=email_authentication_label(),
            auth_method=EMAIL_AUTH_METHOD,
            message=message,
            otp_placeholder=_("Enter code here")
        )

    def registration_view(self, _form_data):

        if 'validate' in _form_data:
            if _form_data['validate'] == 'send_code':
                return self._registration_view_after_code_sent(_form_data)

            code = _form_data.get('code', 'unknown')

            if code is not None and \
                    code == session.get("mfa_email_code", None) and \
                    session.get("mfa_email_id", None) is not None:
                mfa_add(EMAIL_AUTH_METHOD, session['mfa_email_id'])

                flash(_(
                    "Email Authentication registered successfully."
                ), MessageType.SUCCESS)

                session.pop('mfa_email_code', None)

                return None

            flash(_('Invalid code'), MessageType.ERROR)

        return self._registration_view()

    def register_url_endpoints(self, blueprint):
        blueprint.add_url_rule(
            "/send_email_code", "send_email_code", send_email_code,
            methods=("POST", )
        )
        blueprint.add_url_rule(
            "/email.js", "email_js", javascript, methods=("GET", )
        )

    @property
    def icon(self):
        return url_for("mfa.static", filename="images/email_lock.svg")

    @property
    def validate_script(self):
        return url_for("mfa.email_js")
