##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Handle Macros for SQL Editor."""

import json
from flask_babel import gettext
from flask import current_app, request
from flask_security import login_required, current_user
from pgadmin.utils.ajax import make_response as ajax_response,\
    make_json_response
from pgadmin.model import db, Macros, UserMacros
from sqlalchemy import and_


def get_macros(macro_id, json_resp):
    """
    This method is used to get all the macros/specific macro.
    :param macro_id: Macro ID
    :param json_resp: Set True to return json response
    """
    if macro_id:
        macro = UserMacros.query.filter_by(mid=macro_id,
                                           uid=current_user.id).first()
        if macro is None:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext("Macro not found.")
            )
        else:
            return ajax_response(
                response={'id': macro.mid,
                          'name': macro.name,
                          'sql': macro.sql},
                status=200
            )
    else:
        macros = db.session.query(Macros.id, Macros.alt, Macros.control,
                                  Macros.key, Macros.key_code,
                                  UserMacros.name, UserMacros.sql
                                  ).outerjoin(
            UserMacros, and_(Macros.id == UserMacros.mid,
                             UserMacros.uid == current_user.id)).all()

        data = []

        for m in macros:
            key_label = 'Ctrl + ' + m[3] if m[2] is True else 'Alt + ' + m[3]
            data.append({'id': m[0], 'alt': m[1],
                         'control': m[2], 'key': m[3],
                         'key_code': m[4], 'name': m[5],
                         'sql': m[6],
                         'key_label': key_label})

        if not json_resp:
            return data

        return ajax_response(
            response={'macro': data},
            status=200
        )


def get_user_macros():
    """
    This method is used to get all the user macros.
    """

    macros = db.session.query(UserMacros.name,
                              Macros.id,
                              Macros.alt, Macros.control,
                              Macros.key, Macros.key_code,
                              UserMacros.sql
                              ).outerjoin(
        Macros, UserMacros.mid == Macros.id).filter(
        UserMacros.uid == current_user.id).order_by(UserMacros.name).all()

    data = []

    for m in macros:
        key_label = 'Ctrl + ' + m[4] if m[3] is True else 'Alt + ' + m[4]
        data.append({'name': m[0], 'id': m[1], 'key': m[4],
                     'key_label': key_label, 'alt': 1 if m[2] else 0,
                     'control': 1 if m[3] else 0, 'key_code': m[5],
                     'sql': m[6]})

    return data


def set_macros():
    """
    This method is used to update the user defined macros.
    """

    data = request.form if request.form else json.loads(
        request.data
    )

    if 'changed' not in data:
        return make_json_response(
            success=1,
            info=gettext('Nothing to update.')
        )

    for m in data['changed']:
        if m['id']:
            macro = UserMacros.query.filter_by(
                uid=current_user.id,
                mid=m['id']).first()
            if macro:
                status, msg = update_macro(m, macro)
            else:
                status, msg = create_macro(m)

            if not status:
                return make_json_response(
                    status=410, success=0, errormsg=msg
                )

    return get_macros(None, True)


def create_macro(macro):
    """
    This method is used to create the user defined macros.
    :param macro: macro
    """

    required_args = [
        'name',
        'sql'
    ]
    for arg in required_args:
        if arg not in macro:
            return False, gettext(
                "Could not find the required parameter ({}).").format(arg)

    try:
        new_macro = UserMacros(
            uid=current_user.id,
            mid=macro['id'],
            name=macro['name'],
            sql=macro['sql']
        )
        db.session.add(new_macro)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return False, str(e)

    return True, None


def update_macro(data, macro):
    """
    This method is used to clear/update the user defined macros.
    :param data: updated macro data
    :param macro: macro
    """

    name = data.get('name', None)
    sql = data.get('sql', None)

    if (name or sql) and macro.sql and 'name' in data and name is None:
        return False, gettext(
            "Could not find the required parameter (name).")
    elif (name or sql) and macro.name and 'sql' in data and sql is None:
        return False, gettext(
            "Could not find the required parameter (sql).")

    try:
        if name or sql:
            if name:
                macro.name = name
            if sql:
                macro.sql = sql
        else:
            db.session.delete(macro)

        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return False, str(e)

    return True, None
