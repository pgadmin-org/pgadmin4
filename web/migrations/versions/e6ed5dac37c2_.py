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
import sqlalchemy as sa
from alembic import op
from sqlalchemy.orm.session import Session
from pgadmin.model import Preferences, ModulePreference, PreferenceCategory


# revision identifiers, used by Alembic.
revision = 'e6ed5dac37c2'
down_revision = 'e24b1c4def17'
branch_labels = None
depends_on = None


def upgrade():

    session = Session(bind=op.get_bind())
    old_pref_categories = ['keyboard_shortcuts', 'editor', 'Editor']
    new_pref_categories = ['keyboard_shortcuts', 'sql_formatting', 'options']
    prefs = ['find', 'replace', 'goto_line_col',
             'comment', 'format_sql', 'plain_editor_mode',
             'code_folding', 'wrap_code', 'insert_pair_brackets',
             'highlight_selection_matches', 'brace_matching', 'sql_font_size',
             'sql_font_ligatures', 'sql_font_family', 'indent_new_line',
             'keyword_case', 'identifier_case', 'function_case',
             'data_type_case', 'spaces_around_operators', 'tab_size',
             'use_spaces', 'expression_width', 'logical_operator_new_line',
             'lines_between_queries', 'new_line_before_semicolon']
    preference_map = {
        'keyboard_shortcuts': [
            'find', 'replace', 'goto_line_col', 'comment', 'format_sql'
        ],
        'options': [
            'plain_editor_mode', 'code_folding', 'cursor_blink_rate',
            'wrap_code', 'insert_pair_brackets', 'highlight_selection_matches',
            'brace_matching', 'sql_font_size', 'sql_font_ligatures',
            'sql_font_family', 'indent_new_line'
        ],
        'sql_formatting': [
            'keyword_case', 'identifier_case', 'function_case',
            'data_type_case', 'spaces_around_operators', 'tab_size',
            'use_spaces', 'expression_width', 'logical_operator_new_line',
            'lines_between_queries', 'new_line_before_semicolon'
        ]
    }
    category_ids = []
    new_ids = []
    pref_map = {}

    # get metadata from current connection
    meta = sa.MetaData()
    # define table representation
    meta.reflect(op.get_bind(), only=('user_preferences', 'module_preference',
                                      'preference_category', 'preferences'))
    module_pref_table = sa.Table('module_preference', meta)

    module_id = session.query(ModulePreference).filter_by(
        name='editor').first()

    # Insert the 'editor' module in module_preference table
    if not module_id:
        op.execute(
            module_pref_table.insert().values(name='editor')
        )

        module_id = session.query(ModulePreference).filter_by(
            name='editor').first().id

        # Insert the new preference categories in preference_category table
        pref_category_table = sa.Table('preference_category', meta)

        op.bulk_insert(pref_category_table, [
            {'mid': module_id, 'name': 'keyboard_shortcuts'},
            {'mid': module_id, 'name': 'sql_formatting'},
            {'mid': module_id, 'name': 'options'},
        ])

        # Insert the new preferences in preferences table
        prefs_table = sa.Table('preferences', meta)

        for category in new_pref_categories:
            category_id = session.query(PreferenceCategory
                                        ).filter_by(name=category,
                                                    mid=module_id).first().id

            op.bulk_insert(
                prefs_table,
                [
                    {'cid':category_id, 'name': pref_name}
                    for pref_name in preference_map[category]
                ]
            )

    # Migrate the preferences from 'sqleditor' module to 'editor'
    category_data = session.query(ModulePreference, PreferenceCategory,).join(
        PreferenceCategory).filter(
            ModulePreference.name == 'sqleditor',
            PreferenceCategory.name.in_(old_pref_categories)).all()

    for module_data, pref_cat in category_data:
        category_ids.append(pref_cat.id)

    new_data = session.query(ModulePreference, PreferenceCategory).join(
        PreferenceCategory).filter(
            ModulePreference.name == 'editor', PreferenceCategory.name.in_(
                new_pref_categories)).all()

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

    user_pref_table = sa.Table('user_preferences', meta)

    # Update the user preferences with new preference ids
    for key, val in pref_map.items():
        op.execute(
            user_pref_table.update().where(
                user_pref_table.c.pid == key).values(pid=val)
        )

    # Delete the old preferences and categories
    session.query(Preferences).filter(Preferences.cid.in_(category_ids)
                                      ).delete(synchronize_session=False)

    session.query(PreferenceCategory).filter(
        PreferenceCategory.name.in_(['editor', 'Editor'])).delete(
        synchronize_session=False)

    session.commit()


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
