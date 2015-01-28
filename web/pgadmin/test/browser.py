##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser integration functions for the Test module."""

from flask import render_template, url_for

def get_file_menu_items():
    """Return a (set) of dicts of file menu items, with name, priority and URL."""
    return [
            {'name': 'Generated Test HTML', 'priority': 100, 'url': url_for('test.generated')},
            {'name': 'Test Alert', 'priority': 200, 'url': '#', 'onclick': 'test_alert()'},
            {'name': 'Test Confirm', 'priority': 300, 'url': '#', 'onclick': 'test_confirm()'},
            {'name': 'Test Dialog', 'priority': 400, 'url': '#', 'onclick': 'test_dialog()'},
            {'name': 'Test Prompt', 'priority': 500, 'url': '#', 'onclick': 'test_prompt()'},
            {'name': 'Test Notifier', 'priority': 600, 'url': '#', 'onclick': 'test_notifier()'},
           ]
    
def get_javascript_code():
    """Render from the template and return any Javascript code snippets required
    in the browser"""
    return render_template("test/browser.js")