##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Migrate the user saved preferences from the 'sqleditor' module to
the 'editor' module.

Revision ID: e6ed5dac37c2
Revises: e24b1c4def17
Create Date: 2025-07-15 12:27:48.780562

"""
from alembic import op
from sqlalchemy.orm.session import Session
from pgadmin.model import Preferences, ModulePreference, PreferenceCategory,\
    UserPreference
from pgadmin.browser import register_editor_preferences


# revision identifiers, used by Alembic.
revision = 'e6ed5dac37c2'
down_revision = 'e24b1c4def17'
branch_labels = None
depends_on = None


class Migration:
    """
    This is a placeholder class for registering editor preferences
    """
    def __init__(self, value=None):
        self.editor_preference = value


def upgrade():
    migration_obj = Migration()
    register_editor_preferences(migration_obj, migration_gettext=lambda x: x)

    session = Session(bind=op.get_bind())
    pref_categories = ['keyboard_shortcuts', 'editor', 'Editor']
    new_categories = ['keyboard_shortcuts', 'sql_formatting', 'options']
    prefs = ['find', 'replace', 'goto_line_col',
             'comment', 'format_sql', 'plain_editor_mode',
             'code_folding', 'wrap_code', 'insert_pair_brackets',
             'highlight_selection_matches', 'brace_matching', 'sql_font_size',
             'sql_font_ligatures', 'sql_font_family', 'indent_new_line',
             'keyword_case', 'identifier_case', 'function_case',
             'data_type_case', 'spaces_around_operators', 'tab_size',
             'use_spaces', 'expression_width', 'logical_operator_new_line',
             'lines_between_queries', 'new_line_before_semicolon']
    category_ids = []
    new_ids = []
    pref_map = {}

    category_data = session.query(ModulePreference, PreferenceCategory,).join(
        PreferenceCategory).filter(
            ModulePreference.name == 'sqleditor',
            PreferenceCategory.name.in_(pref_categories)).all()

    for module_data, pref_cat in category_data:
        category_ids.append(pref_cat.id)

    new_data = session.query(ModulePreference, PreferenceCategory).join(
        PreferenceCategory).filter(
            ModulePreference.name == 'editor', PreferenceCategory.name.in_(
                new_categories)).all()

    for module_data, pref_cat in new_data:
        new_ids.append(pref_cat.id)

    prefs_data = session.query(Preferences).filter(Preferences.cid.in_(
        category_ids), Preferences.name.in_(prefs)).all()

    new_prefs_data = session.query(Preferences).filter(Preferences.cid.in_(
        new_ids), Preferences.name.in_(prefs)).all()

    for pref in prefs_data:
        for new_pref in new_prefs_data:
            if pref.name == new_pref.name:
                pref_map[pref.id] = new_pref.id

    for key, val in pref_map.items():
        record_to_update = session.query(UserPreference).filter_by(
            pid=key).first()
        if record_to_update:
            record_to_update.pid = val

    # Delete the old preferences and categories
    session.query(Preferences).filter(Preferences.name.in_(prefs),
                                      Preferences.cid.in_(category_ids)
                                      ).delete(synchronize_session=False)

    session.query(PreferenceCategory).filter(
        PreferenceCategory.name.in_(['editor', 'Editor'])).delete(
        synchronize_session=False)

    session.commit()


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
