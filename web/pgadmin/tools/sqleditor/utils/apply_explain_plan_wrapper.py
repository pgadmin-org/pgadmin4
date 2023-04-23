##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Apply Explain plan wrapper to sql object."""
from flask import render_template

from pgadmin.utils.compile_template_name import compile_template_name


def apply_explain_plan_wrapper_if_needed(manager, sql):
    if 'explain_plan' in sql and sql['explain_plan']:
        explain_plan = sql['explain_plan']
        ver = manager.version if manager.version is not None else 0
        server_type = \
            manager.server_type if manager.server_type is not None else 'pg'
        template_path = compile_template_name(
            'sqleditor/sql',
            'explain_plan.sql',
            ver
        )
        return render_template(template_path, sql=sql['sql'], **explain_plan)
    else:
        return sql['sql']
