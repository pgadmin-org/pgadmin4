##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Sanitization helper for text reaching pgAdmin from any external/untrusted
source — the PostgreSQL driver, a cloud-provider SDK, an OS process, etc.

The output is HTML-escaped so it is safe to embed in API responses that
downstream consumers (frontend toast, log viewer, API client) render as
HTML, without further processing. C0 control bytes are stripped so the
text stays renderable; TAB / LF / CR are preserved to keep multi-line
messages readable.
"""

import html
import re

# C0 control characters except TAB (0x09), LF (0x0A), CR (0x0D), plus DEL
# (0x7F). The retained whitespace characters are needed to keep multi-line
# error messages readable.
_CONTROL_CHARS_RE = re.compile(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]')


def sanitize_external_text(text):
    if text is None:
        return None
    return html.escape(_CONTROL_CHARS_RE.sub('', str(text)), quote=True)
