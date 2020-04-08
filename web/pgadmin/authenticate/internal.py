##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Internal Authentication"""

import six
from flask import current_app
from flask_security import login_user
from abc import abstractmethod, abstractproperty
from flask_babelex import gettext

from .registry import AuthSourceRegistry
from pgadmin.model import User


@six.add_metaclass(AuthSourceRegistry)
class BaseAuthentication(object):

    DEFAULT_MSG = {
        'USER_DOES_NOT_EXIST': 'Specified user does not exist',
        'LOGIN_FAILED': 'Login failed',
        'EMAIL_NOT_PROVIDED': 'Email/Username not provided',
        'PASSWORD_NOT_PROVIDED': 'Password not provided'
    }

    @abstractproperty
    def get_friendly_name(self):
        pass

    @abstractmethod
    def authenticate(self):
        pass

    def validate(self, form):
        username = form.data['email']
        password = form.data['password']

        if username is None or username == '':
            form.email.errors = list(form.email.errors)
            form.email.errors.append(gettext(
                self.messages('EMAIL_NOT_PROVIDED')))
            return False
        if password is None or password == '':
            form.password.errors = list(form.password.errors)
            form.password.errors.append(
                self.messages('PASSWORD_NOT_PROVIDED'))
            return False

        return True

    def login(self, form):
        username = form.data['email']
        user = getattr(form, 'user', None)

        if user is None:
            user = User.query.filter_by(username=username).first()

        if user is None:
            current_app.logger.exception(
                self.messages('USER_DOES_NOT_EXIST'))
            return False, self.messages('USER_DOES_NOT_EXIST')

        # Login user through flask_security
        status = login_user(user)
        if not status:
            current_app.logger.exception(self.messages('LOGIN_FAILED'))
            return False, self.messages('LOGIN_FAILED')
        return True, None

    def messages(self, msg_key):
        return self.DEFAULT_MSG[msg_key] if msg_key in self.DEFAULT_MSG\
            else None


class InternalAuthentication(BaseAuthentication):

    def get_friendly_name(self):
        return gettext("internal")

    def validate(self, form):
        """User validation"""

        # Flask security validation
        return form.validate_on_submit()

    def authenticate(self, form):
        username = form.data['email']
        user = getattr(form, 'user',
                       User.query.filter_by(username=username).first())
        if user and user.is_authenticated and form.validate_on_submit():
            return True, None
        return False, self.messages('USER_DOES_NOT_EXIST')
