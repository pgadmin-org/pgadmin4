##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import copy
import re
from flask import render_template
from pgadmin.utils.ajax import internal_server_error


def get_argument_values(data):
    """
    This function is used to get the argument values for
    function/procedure.
    :param data:
    :return:
    """
    proargtypes = []
    if ('proargtypenames' in data and data['proargtypenames'] and
            isinstance(data['proargtypenames'], str)):
        proargtypes = [ptype for ptype in data['proargtypenames'].split(",")]
    elif 'proargtypenames' in data and data['proargtypenames']:
        proargtypes = data['proargtypenames']

    proargmodes = (
        data)['proargmodes'] if 'proargmodes' in data and data['proargmodes'] \
        else ['i'] * len(proargtypes)
    proargnames = (
        data)['proargnames'] if 'proargnames' in data and data['proargnames'] \
        else []

    proargdefaultvals = []
    if ('proargdefaultvals' in data and data['proargdefaultvals'] and
            isinstance(data['proargdefaultvals'], str)):
        proargdefaultvals = re.split(
            r',(?=(?:[^\"\']*[\"\'][^\"\']*[\"\'])*[^\"\']*$)',
            data['proargdefaultvals'])
    elif 'proargdefaultvals' in data and data['proargdefaultvals']:
        proargdefaultvals = data['proargdefaultvals']

    proallargtypes = data['proallargtypes'] \
        if 'proallargtypes' in data and data['proallargtypes'] else []

    return {'proargtypes': proargtypes, 'proargmodes': proargmodes,
            'proargnames': proargnames,
            'proargdefaultvals': proargdefaultvals,
            'proallargtypes': proallargtypes}


def params_list_for_display(proargmodes_fltrd, proargtypes,
                            proargnames, proargdefaultvals):
    """
    This function is used to prepare dictionary of arguments to
    display on UI.
    :param proargmodes_fltrd:
    :param proargtypes:
    :param proargnames:
    :param proargdefaultvals:
    :return:
    """
    # Insert null value against the parameters which do not have
    # default values.
    if len(proargmodes_fltrd) > len(proargdefaultvals):
        dif = len(proargmodes_fltrd) - len(proargdefaultvals)
        while dif > 0:
            proargdefaultvals.insert(0, '')
            dif -= 1

    param = {"arguments": [
        map_arguments_dict(
            i, proargmodes_fltrd[i] if len(proargmodes_fltrd) > i else '',
            proargtypes[i] if len(proargtypes) > i else '',
            proargnames[i] if len(proargnames) > i else '',
            proargdefaultvals[i] if len(proargdefaultvals) > i else ''
        )
        for i in range(len(proargtypes))]}
    return param


def display_properties_argument_list(proargmodes_fltrd, proargtypes,
                                     proargnames, proargdefaultvals):
    """
    This function is used to prepare list of arguments to display on UI.
    :param proargmodes_fltrd:
    :param proargtypes:
    :param proargnames:
    :param proargdefaultvals:
    :return:
    """
    proargs = [map_arguments_list(
        proargmodes_fltrd[i] if len(proargmodes_fltrd) > i else '',
        proargtypes[i] if len(proargtypes) > i else '',
        proargnames[i] if len(proargnames) > i else '',
        proargdefaultvals[i] if len(proargdefaultvals) > i else ''
    )
        for i in range(len(proargtypes))]

    return proargs


def map_arguments_dict(argid, argmode, argtype, argname, argdefval):
    """
    Returns Dict of formatted Arguments.
    Args:
        argid: Argument Sequence Number
        argmode: Argument Mode
        argname: Argument Name
        argtype: Argument Type
        argdefval: Argument Default Value
    """
    # The pg_get_expr(proargdefaults, 'pg_catalog.pg_class'::regclass) SQL
    # statement gives us '-' as a default value for INOUT mode.
    # so, replacing it with empty string.
    if argmode == 'INOUT' and argdefval.strip() == '-':
        argdefval = ''

    return {"argid": argid,
            "argtype": argtype.strip() if argtype is not None else '',
            "argmode": argmode,
            "argname": argname,
            "argdefval": argdefval}


def map_arguments_list(argmode, argtype, argname, argdef):
    """
    Returns List of formatted Arguments.
    Args:
        argmode: Argument Mode
        argname: Argument Name
        argtype: Argument Type
        argdef: Argument Default Value
    """
    # The pg_get_expr(proargdefaults, 'pg_catalog.pg_class'::regclass) SQL
    # statement gives us '-' as a default value for INOUT mode.
    # so, replacing it with empty string.
    if argmode == 'INOUT' and argdef.strip() == '-':
        argdef = ''

    arg = ''

    if argmode:
        arg += argmode + " "
    if argname:
        arg += argname + " "
    if argtype:
        arg += argtype + " "
    if argdef:
        arg += " DEFAULT " + argdef

    return arg.strip(" ")


def format_arguments_from_db(sql_template_path, conn, data):
    """
    Create Argument list of the Function.

    Args:
        sql_template_path:
        conn:
        data: Function Data

    Returns:
        Function Arguments in the following format.
            [
            {'proargtypes': 'integer', 'proargmodes: 'IN',
            'proargnames': 'column1', 'proargdefaultvals': 1}, {...}
            ]
        Where
            Arguments:
                # proargtypes: Argument Types (Data Type)
                # proargmodes: Argument Modes [IN, OUT, INOUT, VARIADIC]
                # proargnames: Argument Name
                # proargdefaultvals: Default Value of the Argument
    """
    arguments = get_argument_values(data)
    proargtypes = arguments['proargtypes']
    proargmodes = arguments['proargmodes']
    proargnames = arguments['proargnames']
    proargdefaultvals = arguments['proargdefaultvals']
    proallargtypes = arguments['proallargtypes']

    proargmodenames = {
        'i': 'IN', 'o': 'OUT', 'b': 'INOUT', 'v': 'VARIADIC', 't': 'TABLE'
    }

    # We need to put default parameter at proper location in list
    # Total number of default parameters
    total_default_parameters = len(proargdefaultvals)

    # Total number of parameters
    total_parameters = len(proargtypes)

    # Parameters which do not have default parameters
    non_default_parameters = total_parameters - total_default_parameters

    # only if we have at least one parameter with default value
    if total_default_parameters > 0 and non_default_parameters > 0:
        for idx in range(non_default_parameters):
            # Set null value for parameter non-default parameter
            proargdefaultvals.insert(idx, '')

    # The proargtypes doesn't give OUT params, so we need to fetch
    # those from database explicitly, below code is written for this
    # purpose.
    #
    # proallargtypes gives all the Function's argument including OUT,
    # but we have not used that column; as the data type of this
    # column (i.e. oid[]) is not supported by oidvectortypes(oidvector)
    # function which we have used to fetch the datatypes
    # of the other parameters.

    proargmodes_fltrd = copy.deepcopy(proargmodes)
    proargnames_fltrd = []
    cnt = 0
    for m in proargmodes:
        if m == 'o':  # Out Mode
            sql = render_template("/".join([sql_template_path,
                                            'get_out_types.sql']),
                                  out_arg_oid=proallargtypes[cnt])
            status, out_arg_type = conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=out_arg_type)

            # Insert out parameter datatype
            proargtypes.insert(cnt, out_arg_type)
            proargdefaultvals.insert(cnt, '')
        elif m == 'v':  # Variadic Mode
            proargdefaultvals.insert(cnt, '')
        elif m == 't':  # Table Mode
            proargmodes_fltrd.remove(m)
            proargnames_fltrd.append(proargnames[cnt])

        cnt += 1

    cnt = 0
    # Map param's short form to its actual name. (ex: 'i' to 'IN')
    for m in proargmodes_fltrd:
        proargmodes_fltrd[cnt] = proargmodenames[m]
        cnt += 1

    # Removes Argument Names from the list if that argument is removed
    # from the list
    for i in proargnames_fltrd:
        proargnames.remove(i)

    # Prepare list of Argument list dict to be displayed in the Data Grid.
    params = params_list_for_display(proargmodes_fltrd, proargtypes,
                                     proargnames, proargdefaultvals)

    # Prepare string formatted Argument to be displayed in the Properties
    # panel.
    proargs = display_properties_argument_list(proargmodes_fltrd, proargtypes,
                                               proargnames, proargdefaultvals)

    proargs = {"proargs": ", ".join(proargs)}

    return params, proargs
