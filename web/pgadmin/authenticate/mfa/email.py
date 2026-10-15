##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
"""Multi-factor Authentication implementation by sending OTP through email"""

import hmac
import threading
import time

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
        _remember_email_code(session.sid, session["mfa_email_code"])
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

    return True, 200, _code_sent_message(_email)


def _code_sent_message(_email: str) -> str:
    """
    Message telling the user where the verification code was sent.

    Args:
        _email (str): Email address the code was sent to

    Returns:
        str: Message for the user, with the email address masked
    """
    return _(
        "A verification code was sent to {}. Check your email and enter "
        "the code."
    ).format(_mask_email(_email))


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

# Session key used to let the user retry an emailed code after a typo.
_EMAIL_CODE_RETRY = 'mfa_email_code_retry'
_DEFAULT_EMAIL_CODE_MAX_ATTEMPTS = 5

# The code that is currently valid for each session, with the number of
# failed attempts against it, keyed by session id. This is kept here rather
# than in the session because the session is only saved at the end of a
# request, so concurrent requests with the same session cookie would each
# see the same attempt count. The lock makes the check and update atomic
# within the process, which is sufficient as pgAdmin runs as one process.
# Entries are removed on success, on too many failures, when a new code is
# sent, and once older than _EMAIL_CODE_LIFETIME seconds.
_email_codes = {}
_email_codes_lock = threading.Lock()
_EMAIL_CODE_LIFETIME = 60 * 60


def _remember_email_code(sid: str, code: str) -> None:
    """
    Record the code sent to the user as the only valid code for the
    session, with no failed attempts, and discard any expired entries.

    Args:
        sid (str): Session id
        code (str): The code sent to the user
    """
    now = time.time()
    with _email_codes_lock:
        for key in [k for k, v in _email_codes.items()
                    if now - v['sent'] > _EMAIL_CODE_LIFETIME]:
            del _email_codes[key]
        _email_codes[sid] = dict(code=code, attempts=0, sent=now)


def _forget_email_code(sid: str) -> None:
    """
    Discard the valid code for the session, if any.

    Args:
        sid (str): Session id
    """
    with _email_codes_lock:
        _email_codes.pop(sid, None)


def _has_email_code(sid: str) -> bool:
    """
    Check whether the session has a code that can still be entered.

    Args:
        sid (str): Session id

    Returns:
        bool: True if a valid code exists for the session
    """
    with _email_codes_lock:
        entry = _email_codes.get(sid, None)
        return entry is not None and \
            time.time() - entry['sent'] <= _EMAIL_CODE_LIFETIME


def _email_code_max_attempts() -> int:
    """
    Number of wrong entries allowed for one emailed code, as set by
    MFA_EMAIL_CODE_MAX_ATTEMPTS. Values below 1 are treated as 1, so that
    the number of attempts can never be unlimited.

    Returns:
        int: Maximum number of wrong entries for one emailed code
    """
    try:
        max_attempts = int(getattr(
            config, 'MFA_EMAIL_CODE_MAX_ATTEMPTS',
            _DEFAULT_EMAIL_CODE_MAX_ATTEMPTS
        ))
    except (TypeError, ValueError):
        max_attempts = _DEFAULT_EMAIL_CODE_MAX_ATTEMPTS
    return max(1, max_attempts)


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
        sid = session.sid

        with _email_codes_lock:
            entry = _email_codes.get(sid, None)
            if entry is not None and \
                    time.time() - entry['sent'] > _EMAIL_CODE_LIFETIME:
                del _email_codes[sid]
                entry = None

            if entry is None:
                session.pop("mfa_email_code", None)
                raise ValidationException(_("Invalid code"))

            # Compare in constant time; compare_digest() rejects non-ASCII
            # str, so compare the UTF-8 encoded bytes instead.
            if isinstance(code, str) and \
                    hmac.compare_digest(code.encode('utf-8'),
                                        entry['code'].encode('utf-8')):
                del _email_codes[sid]
                session.pop("mfa_email_code", None)
                session.pop(_EMAIL_CODE_RETRY, None)
                return

            # Keep the code that was sent, so that the user can correct a
            # mistyped code, but discard it once too many attempts have
            # failed.
            entry['attempts'] += 1
            if entry['attempts'] >= _email_code_max_attempts():
                del _email_codes[sid]
                session.pop("mfa_email_code", None)
                raise ValidationException(_(
                    "Invalid code. Too many failed attempts; please request "
                    "a new code."
                ))

        session[_EMAIL_CODE_RETRY] = True
        raise ValidationException(_("Invalid code"))

    def validation_view(self):
        view = dict(
            description=_("Verify with Email Authentication"),
            button_label=_("Send Code"),
            button_label_sending=_("Sending Code..."),
            otp_placeholder=_("Enter code here"),
        )

        # After a failed attempt, the code already sent remains valid, so
        # let the user enter it again rather than forcing a new one.
        if session.pop(_EMAIL_CODE_RETRY, False) is True and \
                session.get("mfa_email_code", None) is not None and \
                _has_email_code(session.sid):
            options, found = fetch_auth_option(EMAIL_AUTH_METHOD)
            if found is True and options:
                view['sent_message'] = _code_sent_message(options)
                return view

        session.pop("mfa_email_code", None)
        _forget_email_code(session.sid)
        return view

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
            otp_placeholder=_("Enter code here"),
            http_code=http_code,
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
