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

from sqlalchemy import or_
from flask_security import current_user

from pgadmin.model import db, Server, ServerGroup
import config


def _is_admin():
    """Check if current user has Administrator role."""
    return current_user.has_role('Administrator')


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
    - The server is shared AND only_owned is False, OR
    - The user has the Administrator role.

    Returns None otherwise (caller should return 404).

    Note: In pgAdmin, Server.shared=True means the server is visible
    to all authenticated users. SharedServer records are created
    lazily for per-user customization, not for access control.
    """
    if not config.SERVER_MODE:
        return Server.query.filter_by(id=sid).first()

    if only_owned:
        return Server.query.filter_by(
            id=sid, user_id=current_user.id).first()

    # Single query: owned OR shared
    server = Server.query.filter(
        Server.id == sid,
        or_(
            Server.user_id == current_user.id,
            Server.shared
        )
    ).first()

    if server is not None:
        return server

    # Administrators can access all servers
    if _is_admin():
        return Server.query.filter_by(id=sid).first()

    return None


def get_server_group(gid):
    """Fetch a server group by ID, verifying user access.

    Returns the group if:
    - Desktop mode, OR
    - The user owns it, OR
    - It contains shared servers (Server.shared=True), OR
    - The user has the Administrator role.

    Returns None otherwise.
    """
    if not config.SERVER_MODE:
        return ServerGroup.query.filter_by(id=gid).first()

    sg = ServerGroup.query.filter(
        ServerGroup.id == gid,
        or_(
            ServerGroup.user_id == current_user.id,
            ServerGroup.id.in_(
                db.session.query(Server.servergroup_id).filter(
                    Server.shared
                )
            )
        )
    ).first()

    if sg is not None:
        return sg

    if _is_admin():
        return ServerGroup.query.filter_by(id=gid).first()

    return None


def get_server_groups_for_user():
    """Return server groups visible to the current user.

    Includes groups owned by the user plus groups containing shared
    servers (Server.shared=True, visible to all authenticated users).
    Administrators see all groups.
    """
    if not config.SERVER_MODE:
        return ServerGroup.query.filter_by(
            user_id=current_user.id
        ).all()

    if _is_admin():
        return ServerGroup.query.all()

    return ServerGroup.query.filter(
        or_(
            ServerGroup.user_id == current_user.id,
            ServerGroup.id.in_(
                db.session.query(Server.servergroup_id).filter(
                    Server.shared
                )
            )
        )
    ).all()


def get_user_server_query():
    """Return a base query for servers accessible to the current user.

    Includes owned servers + shared servers (visible to all users).
    Administrators see all servers.
    """
    if not config.SERVER_MODE:
        return Server.query

    if _is_admin():
        return Server.query

    return Server.query.filter(
        or_(
            Server.user_id == current_user.id,
            Server.shared
        )
    )
