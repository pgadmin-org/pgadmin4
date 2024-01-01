##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Internal Authentication"""

from flask import current_app, flash
from flask_security import login_user
from abc import abstractmethod, abstractproperty
from flask_babel import gettext

from .registry import AuthSourceRegistry
from pgadmin.model import User
from pgadmin.utils.validation_utils import validate_email
from pgadmin.utils.constants import INTERNAL


class BaseAuthentication(metaclass=AuthSourceRegistry):

    DEFAULT_MSG = {
        'USER_DOES_NOT_EXIST': gettext('Incorrect username or password.'),
        'LOGIN_FAILED': gettext('Login failed'),
        'EMAIL_NOT_PROVIDED': gettext('Email/Username not provided'),
        'PASSWORD_NOT_PROVIDED': gettext('Password not provided'),
        'INVALID_EMAIL': gettext('Email/Username is not valid')
    }
    LOGIN_VIEW = 'security.login'
    LOGOUT_VIEW = 'security.logout'

    @abstractmethod
    def get_source_name(self):
        pass

    @abstractmethod
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
            return False, None
        if password is None or password == '':
            form.password.errors = list(form.password.errors)
            form.password.errors.append(
                self.messages('PASSWORD_NOT_PROVIDED'))
            return False, None

        return True, None

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
        current_app.logger.info(
            "Internal user {0} logged in.".format(username))
        return True, None

    def messages(self, msg_key):
        return self.DEFAULT_MSG[msg_key] if msg_key in self.DEFAULT_MSG\
            else None


class InternalAuthentication(BaseAuthentication):

    def get_source_name(self):
        return INTERNAL

    def get_friendly_name(self):
        return gettext("internal")

    def validate(self, form):
        """User validation"""
        # validate the email id first
        if not validate_email(form.data['email']):
            return False, self.messages('INVALID_EMAIL')
        # Flask security validation
        submit = form.validate_on_submit()
        return submit, None

    def authenticate(self, form):
        username = form.data['email']
        if form.validate_on_submit():
            user = getattr(form, 'user',
                           User.query.filter_by(username=username).first())
            if user and user.is_authenticated:
                return True, None
        return False, self.messages('USER_DOES_NOT_EXIST')
