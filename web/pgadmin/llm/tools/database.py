##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Database tools for LLM interactions.

These tools allow the LLM to query PostgreSQL databases in a safe,
read-only manner. All queries are executed within read-only transactions
to prevent any data modification.

Uses pgAdmin's SQL template infrastructure for version-aware queries.
"""

import secrets
from typing import Optional

from flask import render_template

from pgadmin.utils.driver import get_driver
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.llm.models import Tool
import config


# Template paths for SQL queries (used with compile_template_path)
SCHEMAS_TEMPLATE_PATH = 'schemas/pg'
TABLES_TEMPLATE_PATH = 'tables/sql'
COLUMNS_TEMPLATE_PATH = 'columns/sql'
INDEXES_TEMPLATE_PATH = 'indexes/sql'


# Application name prefix for LLM connections
LLM_APP_NAME_PREFIX = 'pgAdmin 4 - LLM'


class DatabaseToolError(Exception):
    """Exception raised when a database tool operation fails."""

    def __init__(self, message: str, code: Optional[str] = None):
        self.message = message
        self.code = code
        super().__init__(message)


def _get_connection(sid: int, did: int, conn_id: str):
    """
    Get a database connection for the specified server and database.

    Args:
        sid: Server ID
        did: Database ID (OID)
        conn_id: Unique connection identifier

    Returns:
        Tuple of (manager, connection) objects

    Raises:
        DatabaseToolError: If connection fails
    """
    try:
        driver = get_driver(config.PG_DEFAULT_DRIVER)
        manager = driver.connection_manager(sid)

        # Get connection - this will create one if it doesn't exist
        conn = manager.connection(
            did=did,
            conn_id=conn_id,
            auto_reconnect=False,  # Don't auto-reconnect for LLM queries
            use_binary_placeholder=True,
            array_to_string=True
        )

        return manager, conn

    except Exception as e:
        raise DatabaseToolError(
            f"Failed to get connection: {str(e)}",
            code="CONNECTION_ERROR"
        )


def _connect_readonly(_manager, conn, conn_id: str) -> tuple[bool, str | None]:
    """
    Establish a read-only connection.

    Sets the application_name to identify this as an LLM connection
    and ensures the connection is in read-only mode.

    Args:
        _manager: The server manager (unused, kept for API consistency)
        conn: The connection object
        conn_id: Connection identifier

    Returns:
        Tuple of (success, error_message)
    """
    try:
        # Connect if not already connected
        if not conn.connected():
            status, msg = conn.connect()
            if not status:
                return False, msg

        # Set application name via SQL - this is thread-safe and doesn't
        # require environment variables. The name will be visible in
        # pg_stat_activity to identify LLM connections.
        app_name = f'{LLM_APP_NAME_PREFIX} - {conn_id}'
        # Escape single quotes in the app name for safety
        app_name_escaped = app_name.replace("'", "''")
        status, _ = conn.execute_void(
            f"SET application_name = '{app_name_escaped}'"
        )
        if not status:
            # Non-fatal - connection still works without custom app name
            pass

        return True, None

    except Exception as e:
        return False, str(e)


def _execute_readonly_query(conn, query: str) -> dict:
    """
    Execute a query in a read-only transaction.

    The query is wrapped in a read-only transaction to ensure
    no data modifications can occur.

    Args:
        conn: Database connection
        query: SQL query to execute

    Returns:
        Dictionary with 'columns' and 'rows' keys

    Raises:
        DatabaseToolError: If query execution fails
    """
    # Set the transaction to read-only, execute, then rollback.
    # This ensures even if the query tries to modify data, it will fail.
    try:
        # First, set the transaction to read-only mode
        status, result = conn.execute_void(
            "BEGIN TRANSACTION READ ONLY"
        )
        if not status:
            raise DatabaseToolError(
                f"Failed to start read-only transaction: {result}",
                code="TRANSACTION_ERROR"
            )

        try:
            # Execute the actual query
            status, result = conn.execute_2darray(query)

            if not status:
                raise DatabaseToolError(
                    f"Query execution failed: {result}",
                    code="QUERY_ERROR"
                )

            # Format the result
            columns = []
            rows = []

            if result and 'columns' in result:
                columns = [col['name'] for col in result['columns']]

            if result and 'rows' in result:
                rows = result['rows']

            return {
                'columns': columns,
                'rows': rows,
                'row_count': len(rows)
            }

        finally:
            # Always rollback - we're read-only anyway
            conn.execute_void("ROLLBACK")

    except DatabaseToolError:
        raise
    except Exception as e:
        # Attempt rollback on any error
        try:
            conn.execute_void("ROLLBACK")
        except Exception:
            pass
        raise DatabaseToolError(
            f"Query execution error: {str(e)}",
            code="EXECUTION_ERROR"
        )


def execute_readonly_query(
    sid: int,
    did: int,
    query: str,
    max_rows: int = 1000
) -> dict:
    """
    Execute a read-only SQL query against a PostgreSQL database.

    This function:
    1. Opens a new connection with LLM-specific application_name
    2. Starts a READ ONLY transaction
    3. Executes the query
    4. Returns results (limited to max_rows)
    5. Rolls back and closes the connection

    Args:
        sid: Server ID from the Object Explorer
        did: Database ID (OID) from the Object Explorer
        query: SQL query to execute (should be SELECT or read-only)
        max_rows: Maximum number of rows to return (default 1000)

    Returns:
        Dictionary containing:
        - columns: List of column names
        - rows: List of row data (as lists)
        - row_count: Number of rows returned
        - truncated: True if results were limited

    Raises:
        DatabaseToolError: If the query fails or connection
            cannot be established
    """
    # Generate unique connection ID for this LLM query
    conn_id = f"llm_{secrets.choice(range(1, 9999999))}"

    manager = None
    conn = None

    try:
        # Get connection manager and connection object
        manager, conn = _get_connection(sid, did, conn_id)

        # Connect with read-only settings
        status, error = _connect_readonly(manager, conn, conn_id)
        if not status:
            raise DatabaseToolError(
                f"Connection failed: {error}",
                code="CONNECTION_ERROR"
            )

        # Add LIMIT if not already present and query looks like SELECT
        query_upper = query.strip().upper()
        if query_upper.startswith('SELECT') and 'LIMIT' not in query_upper:
            query = f"({query}) AS llm_subquery LIMIT {max_rows + 1}"
            query = f"SELECT * FROM {query}"

        # Execute the query
        result = _execute_readonly_query(conn, query)

        # Check if we need to truncate
        if len(result['rows']) > max_rows:
            result['rows'] = result['rows'][:max_rows]
            result['truncated'] = True
            result['row_count'] = max_rows
        else:
            result['truncated'] = False

        return result

    finally:
        # Always release the connection
        if manager and conn_id:
            try:
                manager.release(conn_id=conn_id)
            except Exception:
                pass


def get_database_schema(sid: int, did: int) -> dict:
    """
    Get the schema information for a database.

    Uses pgAdmin's SQL templates for version-aware schema listing.

    Args:
        sid: Server ID
        did: Database ID

    Returns:
        Dictionary containing schema information organized by schema name
    """
    conn_id = f"llm_{secrets.choice(range(1, 9999999))}"
    manager = None

    try:
        manager, conn = _get_connection(sid, did, conn_id)
        status, error = _connect_readonly(manager, conn, conn_id)
        if not status:
            raise DatabaseToolError(f"Connection failed: {error}",
                                    code="CONNECTION_ERROR")

        # Get server version for template selection
        sversion = manager.sversion or 0

        # Build template path with version - the versioned loader will
        # find the appropriate directory (e.g., 15_plus, 14_plus, default)
        schema_template_path = compile_template_path(
            SCHEMAS_TEMPLATE_PATH, sversion
        )

        # Get list of schemas using the template
        schema_sql = render_template(
            "/".join([schema_template_path, 'sql', 'nodes.sql']),
            show_sysobj=False,
            scid=None,
            schema_restrictions=None
        )

        # Execute in read-only mode
        status, _ = conn.execute_void("BEGIN TRANSACTION READ ONLY")
        if not status:
            raise DatabaseToolError("Failed to start transaction",
                                    code="TRANSACTION_ERROR")

        try:
            status, schema_res = conn.execute_dict(schema_sql)
            if not status:
                raise DatabaseToolError(f"Schema query failed: {schema_res}",
                                        code="QUERY_ERROR")

            schemas = {}
            table_template_path = compile_template_path(
                TABLES_TEMPLATE_PATH, sversion
            )

            for schema_row in schema_res.get('rows', []):
                schema_name = schema_row['name']
                schema_oid = schema_row['oid']

                # Get tables for this schema using the template
                tables_sql = render_template(
                    "/".join([table_template_path, 'nodes.sql']),
                    scid=schema_oid,
                    tid=None,
                    schema_diff=False
                )

                status, tables_res = conn.execute_dict(tables_sql)
                tables = []
                if status and tables_res:
                    for row in tables_res.get('rows', []):
                        tables.append({
                            'name': row.get('name'),
                            'oid': row.get('oid'),
                            'description': row.get('description')
                        })

                # Get views (relkind v=view, m=materialized view)
                views_sql = f"""
                    SELECT c.oid,
                           c.relname AS name,
                           pg_catalog.obj_description(
                               c.oid, 'pg_class'
                           ) AS description
                    FROM pg_catalog.pg_class c
                    WHERE c.relkind IN ('v', 'm')
                      AND c.relnamespace = {schema_oid}::oid
                    ORDER BY c.relname
                """
                status, views_res = conn.execute_dict(views_sql)
                views = []
                if status and views_res:
                    for row in views_res.get('rows', []):
                        views.append({
                            'name': row.get('name'),
                            'oid': row.get('oid'),
                            'description': row.get('description')
                        })

                schemas[schema_name] = {
                    'oid': schema_oid,
                    'tables': tables,
                    'views': views,
                    'description': schema_row.get('description')
                }

            return {'schemas': schemas}

        finally:
            conn.execute_void("ROLLBACK")

    finally:
        if manager and conn_id:
            try:
                manager.release(conn_id=conn_id)
            except Exception:
                pass


def get_table_columns(
    sid: int,
    did: int,
    schema_name: str,
    table_name: str
) -> dict:
    """
    Get column information for a specific table.

    Uses pgAdmin's SQL templates for version-aware column listing.

    Args:
        sid: Server ID
        did: Database ID
        schema_name: Schema name
        table_name: Table name

    Returns:
        Dictionary containing column information
    """
    conn_id = f"llm_{secrets.choice(range(1, 9999999))}"
    manager = None

    try:
        manager, conn = _get_connection(sid, did, conn_id)
        status, error = _connect_readonly(manager, conn, conn_id)
        if not status:
            raise DatabaseToolError(f"Connection failed: {error}",
                                    code="CONNECTION_ERROR")

        sversion = manager.sversion or 0
        driver = get_driver(config.PG_DEFAULT_DRIVER)

        # Use qtLiteral for safe SQL escaping
        schema_lit = driver.qtLiteral(schema_name, conn)
        table_lit = driver.qtLiteral(table_name, conn)

        # Get table OID first
        oid_sql = f"""
            SELECT c.oid
            FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = {table_lit}
              AND n.nspname = {schema_lit}
        """

        status, _ = conn.execute_void("BEGIN TRANSACTION READ ONLY")
        if not status:
            raise DatabaseToolError("Failed to start transaction",
                                    code="TRANSACTION_ERROR")

        try:
            status, oid_res = conn.execute_dict(oid_sql)
            if not status or not oid_res.get('rows'):
                raise DatabaseToolError(
                    f"Table {schema_name}.{table_name} not found",
                    code="NOT_FOUND"
                )

            table_oid = oid_res['rows'][0]['oid']

            # Use the columns template
            col_template_path = compile_template_path(
                COLUMNS_TEMPLATE_PATH, sversion
            )
            columns_sql = render_template(
                "/".join([col_template_path, 'nodes.sql']),
                tid=table_oid,
                clid=None,
                show_sys_objects=False,
                has_oids=False,
                conn=conn
            )

            status, cols_res = conn.execute_dict(columns_sql)
            if not status:
                raise DatabaseToolError(f"Column query failed: {cols_res}",
                                        code="QUERY_ERROR")

            columns = []
            for row in cols_res.get('rows', []):
                columns.append({
                    'name': row.get('name'),
                    'data_type': (
                        row.get('displaytypname') or
                        row.get('datatype')
                    ),
                    'not_null': row.get('not_null', False),
                    'has_default': row.get('has_default_val', False),
                    'description': row.get('description')
                })

            return {
                'schema': schema_name,
                'table': table_name,
                'oid': table_oid,
                'columns': columns
            }

        finally:
            conn.execute_void("ROLLBACK")

    finally:
        if manager and conn_id:
            try:
                manager.release(conn_id=conn_id)
            except Exception:
                pass


def get_table_info(
    sid: int,
    did: int,
    schema_name: str,
    table_name: str
) -> dict:
    """
    Get detailed information about a table including columns,
    constraints, and indexes.

    Uses pgAdmin's SQL templates for version-aware queries.

    Args:
        sid: Server ID
        did: Database ID
        schema_name: Schema name
        table_name: Table name

    Returns:
        Dictionary containing comprehensive table information
    """
    conn_id = f"llm_{secrets.choice(range(1, 9999999))}"
    manager = None

    try:
        manager, conn = _get_connection(sid, did, conn_id)
        status, error = _connect_readonly(manager, conn, conn_id)
        if not status:
            raise DatabaseToolError(f"Connection failed: {error}",
                                    code="CONNECTION_ERROR")

        sversion = manager.sversion or 0
        driver = get_driver(config.PG_DEFAULT_DRIVER)

        # Use qtLiteral for safe SQL escaping
        schema_lit = driver.qtLiteral(schema_name, conn)
        table_lit = driver.qtLiteral(table_name, conn)

        # Get table OID first
        oid_sql = f"""
            SELECT c.oid, n.oid as schema_oid
            FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = {table_lit}
              AND n.nspname = {schema_lit}
        """

        status, _ = conn.execute_void("BEGIN TRANSACTION READ ONLY")
        if not status:
            raise DatabaseToolError("Failed to start transaction",
                                    code="TRANSACTION_ERROR")

        try:
            status, oid_res = conn.execute_dict(oid_sql)
            if not status or not oid_res.get('rows'):
                raise DatabaseToolError(
                    f"Table {schema_name}.{table_name} not found",
                    code="NOT_FOUND"
                )

            table_oid = oid_res['rows'][0]['oid']

            # Get columns using template
            col_template_path = compile_template_path(
                COLUMNS_TEMPLATE_PATH, sversion
            )
            columns_sql = render_template(
                "/".join([col_template_path, 'nodes.sql']),
                tid=table_oid,
                clid=None,
                show_sys_objects=False,
                has_oids=False,
                conn=conn
            )

            status, cols_res = conn.execute_dict(columns_sql)
            columns = []
            if status and cols_res:
                for row in cols_res.get('rows', []):
                    columns.append({
                        'name': row.get('name'),
                        'data_type': (
                            row.get('displaytypname') or
                            row.get('datatype')
                        ),
                        'not_null': row.get('not_null', False),
                        'has_default': row.get('has_default_val', False),
                        'description': row.get('description')
                    })

            # Get constraints (using table OID for safety)
            constraints_sql = f"""
                SELECT
                    con.conname AS name,
                    CASE con.contype
                        WHEN 'p' THEN 'PRIMARY KEY'
                        WHEN 'u' THEN 'UNIQUE'
                        WHEN 'f' THEN 'FOREIGN KEY'
                        WHEN 'c' THEN 'CHECK'
                        WHEN 'x' THEN 'EXCLUSION'
                    END AS type,
                    pg_catalog.pg_get_constraintdef(
                        con.oid, true
                    ) AS definition
                FROM pg_catalog.pg_constraint con
                WHERE con.conrelid = {table_oid}::oid
                ORDER BY con.contype, con.conname
            """

            status, cons_res = conn.execute_dict(constraints_sql)
            constraints = []
            if status and cons_res:
                for row in cons_res.get('rows', []):
                    constraints.append({
                        'name': row.get('name'),
                        'type': row.get('type'),
                        'definition': row.get('definition')
                    })

            # Get indexes using template
            idx_template_path = compile_template_path(
                INDEXES_TEMPLATE_PATH, sversion
            )
            indexes_sql = render_template(
                "/".join([idx_template_path, 'nodes.sql']),
                tid=table_oid,
                idx=None
            )

            status, idx_res = conn.execute_dict(indexes_sql)
            indexes = []
            if status and idx_res:
                for row in idx_res.get('rows', []):
                    indexes.append({
                        'name': row.get('name'),
                        'oid': row.get('oid')
                    })

            return {
                'schema': schema_name,
                'table': table_name,
                'oid': table_oid,
                'columns': columns,
                'constraints': constraints,
                'indexes': indexes
            }

        finally:
            conn.execute_void("ROLLBACK")

    finally:
        if manager and conn_id:
            try:
                manager.release(conn_id=conn_id)
            except Exception:
                pass


def execute_tool(
    tool_name: str,
    arguments: dict,
    sid: int,
    did: int
) -> dict:
    """
    Execute a database tool by name.

    This is the dispatcher function that maps tool calls from the LLM
    to the actual function implementations.

    Args:
        tool_name: Name of the tool to execute
        arguments: Tool arguments from the LLM
        sid: Server ID
        did: Database ID

    Returns:
        Dictionary containing the tool result

    Raises:
        DatabaseToolError: If the tool execution fails
        ValueError: If the tool name is not recognized
    """
    if tool_name == "execute_sql_query":
        query = arguments.get("query")
        if not query:
            raise DatabaseToolError(
                "Missing required argument: query",
                code="INVALID_ARGUMENTS"
            )
        return execute_readonly_query(sid, did, query)

    elif tool_name == "get_database_schema":
        return get_database_schema(sid, did)

    elif tool_name == "get_table_columns":
        schema_name = arguments.get("schema_name")
        table_name = arguments.get("table_name")
        if not schema_name or not table_name:
            raise DatabaseToolError(
                "Missing required arguments: schema_name and table_name",
                code="INVALID_ARGUMENTS"
            )
        return get_table_columns(sid, did, schema_name, table_name)

    elif tool_name == "get_table_info":
        schema_name = arguments.get("schema_name")
        table_name = arguments.get("table_name")
        if not schema_name or not table_name:
            raise DatabaseToolError(
                "Missing required arguments: schema_name and table_name",
                code="INVALID_ARGUMENTS"
            )
        return get_table_info(sid, did, schema_name, table_name)

    else:
        raise ValueError(f"Unknown tool: {tool_name}")


# Tool definitions for LLM use
DATABASE_TOOLS = [
    Tool(
        name="execute_sql_query",
        description=(
            "Execute a read-only SQL query against the PostgreSQL database. "
            "The query runs in a READ ONLY transaction so no data can be "
            "modified. Use this to retrieve data, check table contents, "
            "or run analytical queries. Results are limited to 1000 rows."
        ),
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "The SQL query to execute. Should "
                        "be a SELECT query or other "
                        "read-only statement. DML "
                        "statements will fail."
                    )
                }
            },
            "required": ["query"]
        }
    ),
    Tool(
        name="get_database_schema",
        description=(
            "Get a list of all schemas, tables, and views "
            "in the database. Use this to understand the "
            "database structure before writing queries."
        ),
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        }
    ),
    Tool(
        name="get_table_columns",
        description=(
            "Get detailed column information for a specific table, including "
            "data types, nullability, defaults, and primary key status."
        ),
        parameters={
            "type": "object",
            "properties": {
                "schema_name": {
                    "type": "string",
                    "description": "The schema name (e.g., 'public')"
                },
                "table_name": {
                    "type": "string",
                    "description": "The table name"
                }
            },
            "required": ["schema_name", "table_name"]
        }
    ),
    Tool(
        name="get_table_info",
        description=(
            "Get comprehensive information about a table including columns, "
            "constraints (primary keys, foreign keys, check constraints), "
            "and indexes."
        ),
        parameters={
            "type": "object",
            "properties": {
                "schema_name": {
                    "type": "string",
                    "description": "The schema name (e.g., 'public')"
                },
                "table_name": {
                    "type": "string",
                    "description": "The table name"
                }
            },
            "required": ["schema_name", "table_name"]
        }
    )
]
