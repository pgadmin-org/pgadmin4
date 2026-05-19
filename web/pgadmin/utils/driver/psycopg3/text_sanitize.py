##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Sanitization helpers for text returned by the PostgreSQL driver.

Used as a defense-in-depth scrub when an attacker-controlled PostgreSQL
server (or any untrusted source on the connection) returns text that will
be embedded in a user-facing message. The output is HTML-escaped so it is
safe to render as HTML by any downstream consumer (frontend toast, log
viewer, API client) without further processing.
"""

import html
import re

# C0 control characters except TAB (0x09), LF (0x0A), CR (0x0D), plus DEL
# (0x7F). The retained whitespace characters are needed to keep multi-line
# PostgreSQL error messages readable.
_CONTROL_CHARS_RE = re.compile(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]')


def sanitize_driver_message(text):
    if text is None:
        return None
    return html.escape(_CONTROL_CHARS_RE.sub('', str(text)), quote=True)
