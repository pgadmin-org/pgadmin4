##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

import secrets

from flask import g

import config

# Token that may be placed in the CONTENT_SECURITY_POLICY config value. It is
# substituted at runtime with a freshly generated, per-request nonce so that
# admins can opt-in to a nonce based policy, e.g.:
#   CONTENT_SECURITY_POLICY = "script-src 'self' 'nonce-{nonce}';"
CSP_NONCE_PLACEHOLDER = '{nonce}'


class SecurityHeaders:

    @staticmethod
    def get_nonce():
        """
        Return the Content-Security-Policy nonce for the current request.

        The value is generated once and cached on flask.g so that the exact
        same nonce is emitted both in the rendered template (on inline
        <script>/<style> tags) and in the Content-Security-Policy response
        header.
        """
        if not hasattr(g, 'csp_nonce'):
            g.csp_nonce = secrets.token_urlsafe(16)
        return g.csp_nonce

    @staticmethod
    def get_content_security_policy():
        """
        Return the configured Content-Security-Policy, replacing the
        ``{nonce}`` placeholder (if present) with the per-request nonce.

        In debug mode a nonce based policy additionally gets 'unsafe-eval'
        appended to its script-src directive: development bundles are built
        with webpack's 'eval' devtool and would otherwise be blocked by the
        strict policy. Production bundles do not need it, so it is never
        added when DEBUG is False. Custom (non-nonce) policies are passed
        through untouched in both cases.
        """
        csp = getattr(config, 'CONTENT_SECURITY_POLICY', None)
        if csp and CSP_NONCE_PLACEHOLDER in csp:
            csp = csp.replace(
                CSP_NONCE_PLACEHOLDER, SecurityHeaders.get_nonce())
            if config.DEBUG:
                csp = SecurityHeaders._add_unsafe_eval_to_script_src(csp)
        return csp

    @staticmethod
    def _add_unsafe_eval_to_script_src(csp):
        """
        Append 'unsafe-eval' to the policy's script-src directive, without
        duplicating it if already present. Used only in debug mode so that
        development bundles (built with webpack's 'eval' devtool) are not
        blocked by a nonce based policy.
        """
        directives = [d.strip() for d in csp.split(';') if d.strip()]
        for i, directive in enumerate(directives):
            name = directive.split(None, 1)[0]
            if name == 'script-src' and "'unsafe-eval'" not in directive:
                directives[i] = directive + " 'unsafe-eval'"
        return '; '.join(directives) + ';'

    @staticmethod
    def set_response_headers(response):
        """set response security headers"""

        params_dict = {
            'X_CONTENT_TYPE_OPTIONS': 'X-Content-Type-Options',
            'X_XSS_PROTECTION': 'X-XSS-Protection',
            'WEB_SERVER': 'Server',
            'CROSS_ORIGIN_OPENER_POLICY': 'Cross-Origin-Opener-Policy'
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

        # Content-Security-Policy (with optional per-request nonce support)
        csp = SecurityHeaders.get_content_security_policy()
        if csp:
            response.headers['Content-Security-Policy'] = csp

        # add other security options
        for key in params_dict:
            if key in config.__dict__ and config.__dict__[key] != "" \
                    and config.__dict__[key] is not None:
                response.headers[params_dict[key]] = config.__dict__[key]
