##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

import config


class SecurityHeaders:

    @staticmethod
    def set_response_headers(response):
        """set response security headers"""

        params_dict = {
            'CONTENT_SECURITY_POLICY': 'Content-Security-Policy',
            'X_CONTENT_TYPE_OPTIONS': 'X-Content-Type-Options',
            'X_XSS_PROTECTION': 'X-XSS-Protection',
            'WEB_SERVER': 'Server',
        }

        # X-Frame-Options for security
        if config.X_FRAME_OPTIONS != "" and \
                config.X_FRAME_OPTIONS.lower() != "deny":
            response.headers["X-Frame-Options"] = config.X_FRAME_OPTIONS

        # Strict-Transport-Security
        if config.STRICT_TRANSPORT_SECURITY_ENABLED and \
                config.STRICT_TRANSPORT_SECURITY != "":
            response.headers["Strict-Transport-Security"] = \
                config.STRICT_TRANSPORT_SECURITY

        # add other security options
        for key in params_dict:
            if key in config.__dict__ and config.__dict__[key] != "" \
                    and config.__dict__[key] is not None:
                response.headers[params_dict[key]] = config.__dict__[key]
