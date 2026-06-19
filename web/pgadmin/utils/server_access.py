##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Centralized server access-checking utilities for data isolation.

In server mode, multiple users share the same pgAdmin instance. These
helpers enforce that users can only access servers they own or that
have been explicitly shared with them via SharedServer entries.
"""

from sqlalchemy import or_, case, exists, func, literal
from flask_security import current_user

from pgadmin.model import db, Server, ServerGroup
import config


def get_server(sid, only_owned=False):
    """Fetch a server by ID, verifying the current user has access.

    Args:
        sid: Server ID.
        only_owned: If True, only return servers owned by the current
            user. Use this for write operations (change_password,
            clear_saved_password, etc.) that must not mutate another
            user's server record via shared access.

    Returns the server if:
    - Desktop mode (single user, no isolation needed), OR
    - The user owns it, OR
    - The server is shared AND only_owned is False.

    Returns None otherwise (caller should return HTTP 410 Gone, in
    line with the rest of the server views — see e.g.
    web/pgadmin/browser/server_groups/servers/__init__.py).

    The Administrator role does not grant access to other users'
    private servers — admins are subject to the same data isolation
    as regular users. To make a server admin-visible, share it
    (Server.shared=True).

    Note: In pgAdmin, Server.shared=True means the server is visible
    to all authenticated users. SharedServer records are created
    lazily for per-user customization, not for access control.
    """
    if not config.SERVER_MODE:
        return Server.query.filter_by(id=sid).first()

    if only_owned:
        return Server.query.filter_by(
            id=sid, user_id=current_user.id).first()

    return Server.query.filter(
        Server.id == sid,
        or_(
            Server.user_id == current_user.id,
            Server.shared
        )
    ).first()


def get_server_group(gid,hide_shared=False):
    """Fetch a server group by ID, verifying user access.

    See get_server_groups_for_user() docstring for the underlying access logic.
    Returns the group if the user owns it, or if it contains shared servers.
    Returns None otherwise.
    """
    sg = get_server_groups_for_user(servergroup_id=gid,
                                    hide_shared=hide_shared)

    if sg:
        return sg[0]

    return None


def get_server_groups_for_user(hide_shared=False, servergroup_id=None):
    """Return a list for server groups visible to the current user.

    Args:
        hide_shared: If True, only return groups owned by the current user.
        servergroup_id: If provided, filter to a specific server group ID.

    See get_server_groups_for_user_query() docstring for the underlying query
    logic.
    """

    sg = get_server_groups_for_user_query(hide_shared=hide_shared,
                                          servergroup_id=servergroup_id)

    result_list = []

    for row in sg.all():
        group = row.ServerGroup
        group.is_shared_group = row.is_shared_group
        group.is_first_user_group = row.is_first_user_group
        result_list.append(group)

    return result_list


def get_server_groups_for_user_query(hide_shared=False, servergroup_id=None):
    """Return a query for server groups visible to the current user.

    Includes groups owned by the user plus groups containing shared
    servers (Server.shared=True, visible to all authenticated users).

    is_shared_group is an additional column indicating if the group is a group
    not owned by the user and contains shared servers.

    The Administrator role does not grant visibility into other
    users' private groups — admins see the same set as a regular
    user with the same ownership and sharing configuration.
    """

    ServerGroupAlias = db.aliased(ServerGroup)

    min_id_subquery = (
        db.session.query(func.min(ServerGroupAlias.id))
        .filter(
            ServerGroupAlias.user_id == current_user.id
        )
        .correlate(ServerGroup)
        .scalar_subquery()
    )

    is_first_user_group = (
        (ServerGroup.id == min_id_subquery)
        .label('is_first_user_group')
    )

    if not config.SERVER_MODE:
        query = ServerGroup.query.add_columns(
            literal(0).label('is_shared_group'),
            is_first_user_group
        ).filter(ServerGroup.user_id == current_user.id)

        if servergroup_id is not None:
            query = query.filter(ServerGroup.id == servergroup_id)

        return query.order_by(ServerGroup.id)

    query = ServerGroup.query.add_columns(
        (ServerGroup.user_id != current_user.id)
        .label('is_shared_group'),
        is_first_user_group
    )

    if hide_shared:
        query = query.filter(ServerGroup.user_id == current_user.id)
    else:
        has_shared_servers = (
            db.session.query(Server.id)
            .filter(
                Server.servergroup_id == ServerGroup.id,
                Server.shared
            )
            .exists()
        )

        query = query.filter(
            or_(
                ServerGroup.user_id == current_user.id,
                has_shared_servers
            )
        )

    if servergroup_id is not None:
        query = query.filter(ServerGroup.id == servergroup_id)

    query = query.order_by(
        case((ServerGroup.user_id == current_user.id, 0),else_=1),
        ServerGroup.id
    )

    return query


def get_user_server_query():
    """Return a base query for servers accessible to the current user.

    Includes owned servers + shared servers (visible to all users).

    The Administrator role does not grant visibility into other
    users' private servers.
    """
    if not config.SERVER_MODE:
        return Server.query

    return Server.query.filter(
        or_(
            Server.user_id == current_user.id,
            Server.shared
        )
    )
