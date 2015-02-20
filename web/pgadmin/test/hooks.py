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
    """Return a (set) of dicts of file menu items, with name, label, priority and URL."""
    return [
            {'name': 'mnu_generate_test_html', 'label': 'Generated Test HTML', 'priority': 100, 'url': url_for('test.generated')},
            {'name': 'mnu_test_alert', 'label': 'Test Alert', 'priority': 200, 'url': '#', 'onclick': 'test_alert()'},
            {'name': 'mnu_test_confirm', 'label': 'Test Confirm', 'priority': 300, 'url': '#', 'onclick': 'test_confirm()'},
            {'name': 'mnu_test_dialog', 'label': 'Test Dialog', 'priority': 400, 'url': '#', 'onclick': 'test_dialog()'},
            {'name': 'mnu_test_prompt', 'label': 'Test Prompt', 'priority': 500, 'url': '#', 'onclick': 'test_prompt()'},
            {'name': 'mnu_test_notifier', 'label': 'Test Notifier', 'priority': 600, 'url': '#', 'onclick': 'test_notifier()'},
           ]
    
def get_scripts():
    """Return a list of script URLs to include in the rendered page header"""
    return [ url_for('test.static', filename='js/test.js') ]