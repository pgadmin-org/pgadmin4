##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""SQL query registry for report generation pipeline.

Each query is identified by a unique ID and includes the SQL statement
along with metadata about how to execute it.
"""

from typing import Any, Optional

# =============================================================================
# Query Registry
# =============================================================================

QUERIES = {
    # =========================================================================
    # SECURITY QUERIES
    # =========================================================================

    # Authentication & Connection Settings
    'security_settings': {
        'sql': """
            SELECT name, setting, short_desc, context, source
            FROM pg_settings
            WHERE name IN (
                'listen_addresses', 'port', 'max_connections',
                'superuser_reserved_connections',
                'password_encryption', 'authentication_timeout',
                'ssl', 'ssl_ciphers', 'ssl_prefer_server_ciphers',
                'ssl_min_protocol_version', 'ssl_max_protocol_version',
                'db_user_namespace', 'row_security'
            )
            ORDER BY name
        """,
        'scope': ['server', 'database'],
    },

    'hba_rules': {
        'sql': """
            SELECT line_number, type, database, user_name, address,
                   netmask, auth_method, options, error
            FROM pg_hba_file_rules
            ORDER BY line_number
            LIMIT 50
        """,
        'scope': ['server'],
    },

    # Role & Access Control
    'superusers': {
        'sql': """
            SELECT rolname, rolcreaterole, rolcreatedb, rolbypassrls,
                   rolconnlimit, rolvaliduntil
            FROM pg_roles
            WHERE rolsuper = true
            ORDER BY rolname
        """,
        'scope': ['server', 'database'],
    },

    'privileged_roles': {
        'sql': """
            SELECT rolname, rolsuper, rolcreaterole, rolcreatedb,
                   rolreplication, rolbypassrls, rolcanlogin, rolconnlimit
            FROM pg_roles
            WHERE (rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls)
                  AND NOT rolsuper
            ORDER BY rolname
            LIMIT 30
        """,
        'scope': ['server', 'database'],
    },

    'roles_no_expiry': {
        'sql': """
            SELECT rolname, rolvaliduntil
            FROM pg_roles
            WHERE rolcanlogin = true
              AND (rolvaliduntil IS NULL OR rolvaliduntil = 'infinity')
            ORDER BY rolname
            LIMIT 30
        """,
        'scope': ['server', 'database'],
    },

    'login_roles': {
        'sql': """
            SELECT r.rolname, r.rolsuper, r.rolcreaterole, r.rolcreatedb,
                   r.rolcanlogin, r.rolreplication, r.rolbypassrls,
                   r.rolconnlimit, r.rolvaliduntil,
                   ARRAY(SELECT b.rolname FROM pg_catalog.pg_auth_members m
                         JOIN pg_catalog.pg_roles b ON m.roleid = b.oid
                         WHERE m.member = r.oid) as member_of
            FROM pg_roles r
            WHERE r.rolcanlogin = true
            ORDER BY r.rolname
            LIMIT 30
        """,
        'scope': ['database'],
    },

    # Object Permissions
    'database_settings': {
        'sql': """
            SELECT datname, pg_catalog.pg_get_userbyid(datdba) as owner,
                   datacl, datconnlimit
            FROM pg_database
            WHERE datname = current_database()
        """,
        'scope': ['database'],
    },

    'schema_acls': {
        'sql': """
            SELECT n.nspname as schema_name,
                   pg_catalog.pg_get_userbyid(n.nspowner) as owner,
                   n.nspacl as acl
            FROM pg_namespace n
            WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
              AND n.nspname NOT LIKE 'pg_temp%'
              AND n.nspname NOT LIKE 'pg_toast_temp%'
            ORDER BY n.nspname
            LIMIT 20
        """,
        'scope': ['database'],
    },

    'table_acls': {
        'sql': """
            SELECT n.nspname as schema_name,
                   c.relname as table_name,
                   pg_catalog.pg_get_userbyid(c.relowner) as owner,
                   c.relacl as acl,
                   c.relrowsecurity as row_security,
                   c.relforcerowsecurity as force_row_security
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind IN ('r', 'p')
              AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
              AND n.nspname NOT LIKE 'pg_temp%'
            ORDER BY n.nspname, c.relname
            LIMIT 50
        """,
        'scope': ['database'],
    },

    # RLS Policies
    'rls_policies': {
        'sql': """
            SELECT n.nspname as schema_name,
                   c.relname as table_name,
                   pol.polname as policy_name,
                   pol.polpermissive as permissive,
                   pol.polcmd as command,
                   ARRAY(SELECT pg_catalog.pg_get_userbyid(r)
                         FROM unnest(pol.polroles) r) as roles,
                   pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
                   pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expr
            FROM pg_policy pol
            JOIN pg_class c ON c.oid = pol.polrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
            ORDER BY n.nspname, c.relname, pol.polname
            LIMIT 30
        """,
        'scope': ['database', 'schema'],
    },

    'rls_enabled_tables': {
        'sql': """
            SELECT n.nspname as schema_name,
                   c.relname as table_name,
                   c.relrowsecurity as row_security,
                   c.relforcerowsecurity as force_row_security
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relrowsecurity = true
              AND n.nspname NOT IN ('pg_catalog', 'information_schema')
            ORDER BY n.nspname, c.relname
            LIMIT 30
        """,
        'scope': ['database'],
    },

    # Security Definer Functions
    'security_definer_functions': {
        'sql': """
            SELECT n.nspname as schema_name,
                   p.proname as function_name,
                   pg_catalog.pg_get_userbyid(p.proowner) as owner,
                   p.proacl as acl
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE p.prosecdef = true
              AND n.nspname NOT IN ('pg_catalog', 'information_schema')
            ORDER BY n.nspname, p.proname
            LIMIT 30
        """,
        'scope': ['database', 'schema'],
    },

    # Audit & Logging
    'logging_settings': {
        'sql': """
            SELECT name, setting, short_desc
            FROM pg_settings
            WHERE name IN (
                'log_connections', 'log_disconnections',
                'log_hostname', 'log_statement', 'log_line_prefix',
                'log_duration', 'log_min_duration_statement',
                'log_min_error_statement', 'log_replication_commands'
            )
            ORDER BY name
        """,
        'scope': ['server'],
    },

    # Extensions
    'extensions': {
        'sql': """
            SELECT extname, extversion
            FROM pg_extension
            ORDER BY extname
        """,
        'scope': ['server', 'database'],
    },

    # Default Privileges
    'default_privileges': {
        'sql': """
            SELECT pg_catalog.pg_get_userbyid(d.defaclrole) as role,
                   n.nspname as schema_name,
                   CASE d.defaclobjtype
                       WHEN 'r' THEN 'table'
                       WHEN 'S' THEN 'sequence'
                       WHEN 'f' THEN 'function'
                       WHEN 'T' THEN 'type'
                       WHEN 'n' THEN 'schema'
                   END as object_type,
                   d.defaclacl as default_acl
            FROM pg_default_acl d
            LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
            ORDER BY role, schema_name, object_type
            LIMIT 30
        """,
        'scope': ['database'],
    },

    # =========================================================================
    # PERFORMANCE QUERIES
    # =========================================================================

    # Memory Configuration
    'memory_settings': {
        'sql': """
            SELECT name, setting, unit, short_desc, context, source
            FROM pg_settings
            WHERE name IN (
                'shared_buffers', 'effective_cache_size', 'work_mem',
                'maintenance_work_mem', 'wal_buffers', 'temp_buffers',
                'huge_pages', 'effective_io_concurrency'
            )
            ORDER BY name
        """,
        'scope': ['server'],
    },

    # Checkpoint & WAL
    'checkpoint_settings': {
        'sql': """
            SELECT name, setting, unit, short_desc
            FROM pg_settings
            WHERE name IN (
                'checkpoint_completion_target', 'checkpoint_timeout',
                'max_wal_size', 'min_wal_size'
            )
            ORDER BY name
        """,
        'scope': ['server'],
    },

    'wal_settings': {
        'sql': """
            SELECT name, setting, unit, short_desc
            FROM pg_settings
            WHERE name IN (
                'wal_level', 'synchronous_commit', 'wal_compression',
                'wal_writer_delay', 'max_wal_senders'
            )
            ORDER BY name
        """,
        'scope': ['server'],
    },

    'bgwriter_stats': {
        'sql': """
            SELECT checkpoints_timed, checkpoints_req, checkpoint_write_time,
                   checkpoint_sync_time, buffers_checkpoint, buffers_clean,
                   maxwritten_clean, buffers_backend, buffers_backend_fsync,
                   buffers_alloc, stats_reset
            FROM pg_stat_bgwriter
        """,
        'scope': ['server'],
    },

    # Autovacuum
    'autovacuum_settings': {
        'sql': """
            SELECT name, setting, unit, short_desc
            FROM pg_settings
            WHERE name IN (
                'autovacuum', 'autovacuum_max_workers',
                'autovacuum_naptime', 'autovacuum_vacuum_threshold',
                'autovacuum_vacuum_scale_factor', 'autovacuum_analyze_threshold',
                'autovacuum_analyze_scale_factor', 'autovacuum_vacuum_cost_delay',
                'autovacuum_vacuum_cost_limit'
            )
            ORDER BY name
        """,
        'scope': ['server'],
    },

    'tables_needing_vacuum': {
        'sql': """
            SELECT schemaname || '.' || relname as table_name,
                   n_dead_tup,
                   n_live_tup,
                   last_vacuum,
                   last_autovacuum,
                   last_analyze,
                   last_autoanalyze
            FROM pg_stat_user_tables
            WHERE n_dead_tup > 1000
            ORDER BY n_dead_tup DESC
            LIMIT 15
        """,
        'scope': ['database'],
    },

    # Query Planner
    'planner_settings': {
        'sql': """
            SELECT name, setting, unit, short_desc
            FROM pg_settings
            WHERE name IN (
                'random_page_cost', 'seq_page_cost', 'cpu_tuple_cost',
                'cpu_index_tuple_cost', 'cpu_operator_cost',
                'parallel_tuple_cost', 'parallel_setup_cost',
                'default_statistics_target', 'enable_partitionwise_join',
                'enable_partitionwise_aggregate', 'jit'
            )
            ORDER BY name
        """,
        'scope': ['server'],
    },

    # Parallelism
    'parallel_settings': {
        'sql': """
            SELECT name, setting, unit, short_desc
            FROM pg_settings
            WHERE name IN (
                'max_worker_processes', 'max_parallel_workers_per_gather',
                'max_parallel_workers', 'max_parallel_maintenance_workers'
            )
            ORDER BY name
        """,
        'scope': ['server'],
    },

    # Connections
    'connection_settings': {
        'sql': """
            SELECT name, setting, unit, short_desc
            FROM pg_settings
            WHERE name IN (
                'max_connections', 'superuser_reserved_connections',
                'idle_in_transaction_session_timeout', 'idle_session_timeout',
                'statement_timeout', 'lock_timeout'
            )
            ORDER BY name
        """,
        'scope': ['server'],
    },

    'active_connections': {
        'sql': """
            SELECT
                (SELECT count(*) FROM pg_stat_activity) as total_connections,
                (SELECT count(*) FROM pg_stat_activity
                 WHERE state = 'active') as active_queries,
                (SELECT count(*) FROM pg_stat_activity
                 WHERE state = 'idle in transaction') as idle_in_transaction,
                (SELECT count(*) FROM pg_stat_activity
                 WHERE state = 'idle') as idle
        """,
        'scope': ['server', 'database'],
    },

    # Cache Efficiency
    'database_stats': {
        'sql': """
            SELECT datname, numbackends, xact_commit, xact_rollback,
                   blks_read, blks_hit,
                   CASE WHEN blks_read + blks_hit > 0
                        THEN round(100.0 * blks_hit / (blks_read + blks_hit), 2)
                        ELSE 0 END as cache_hit_ratio,
                   tup_returned, tup_fetched, tup_inserted,
                   tup_updated, tup_deleted,
                   conflicts, temp_files, temp_bytes,
                   deadlocks, stats_reset
            FROM pg_stat_database
            WHERE datname NOT IN ('template0', 'template1')
            ORDER BY datname
        """,
        'scope': ['server'],
    },

    'table_cache_stats': {
        'sql': """
            SELECT schemaname || '.' || relname as table_name,
                   heap_blks_read, heap_blks_hit,
                   CASE WHEN heap_blks_read + heap_blks_hit > 0
                        THEN round(100.0 * heap_blks_hit /
                                   (heap_blks_read + heap_blks_hit), 2)
                        ELSE 0 END as cache_hit_ratio,
                   idx_blks_read, idx_blks_hit
            FROM pg_statio_user_tables
            WHERE heap_blks_read + heap_blks_hit > 1000
            ORDER BY heap_blks_read DESC
            LIMIT 15
        """,
        'scope': ['database'],
    },

    # Index Usage
    'table_stats': {
        'sql': """
            SELECT schemaname || '.' || relname as table_name,
                   seq_scan, seq_tup_read, idx_scan, idx_tup_fetch,
                   n_tup_ins, n_tup_upd, n_tup_del,
                   n_live_tup, n_dead_tup,
                   last_vacuum, last_autovacuum,
                   last_analyze, last_autoanalyze
            FROM pg_stat_user_tables
            ORDER BY n_dead_tup DESC
            LIMIT 20
        """,
        'scope': ['database'],
    },

    'unused_indexes': {
        'sql': """
            SELECT s.schemaname || '.' || s.relname as table_name,
                   s.indexrelname as index_name,
                   pg_size_pretty(pg_relation_size(s.indexrelid)) as size,
                   s.idx_scan
            FROM pg_stat_user_indexes s
            JOIN pg_index i ON s.indexrelid = i.indexrelid
            WHERE s.idx_scan = 0
              AND NOT i.indisunique
              AND NOT i.indisprimary
            ORDER BY pg_relation_size(s.indexrelid) DESC
            LIMIT 15
        """,
        'scope': ['database'],
    },

    'tables_needing_indexes': {
        'sql': """
            SELECT schemaname || '.' || relname as table_name,
                   seq_scan, idx_scan, n_live_tup,
                   CASE WHEN seq_scan > 0
                        THEN round(seq_tup_read::numeric / seq_scan, 0)
                        ELSE 0 END as avg_seq_tup_read
            FROM pg_stat_user_tables
            WHERE seq_scan > idx_scan AND seq_scan > 100 AND n_live_tup > 1000
            ORDER BY seq_scan - idx_scan DESC
            LIMIT 15
        """,
        'scope': ['database'],
    },

    # Slow Queries (pg_stat_statements)
    'stat_statements_check': {
        'sql': """
            SELECT EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
            ) as available
        """,
        'scope': ['server', 'database'],
    },

    'top_queries_by_time': {
        'sql': """
            SELECT left(query, 200) as query_preview,
                   calls, round(total_exec_time::numeric, 2) as total_exec_time_ms,
                   round(mean_exec_time::numeric, 2) as mean_exec_time_ms,
                   rows
            FROM pg_stat_statements
            ORDER BY total_exec_time DESC
            LIMIT 10
        """,
        'scope': ['server', 'database'],
        'requires_extension': 'pg_stat_statements',
    },

    'top_queries_by_calls': {
        'sql': """
            SELECT left(query, 200) as query_preview,
                   calls, round(total_exec_time::numeric, 2) as total_exec_time_ms,
                   round(mean_exec_time::numeric, 2) as mean_exec_time_ms,
                   rows
            FROM pg_stat_statements
            ORDER BY calls DESC
            LIMIT 10
        """,
        'scope': ['server', 'database'],
        'requires_extension': 'pg_stat_statements',
    },

    # Table Sizes
    'table_sizes': {
        'sql': """
            SELECT schemaname || '.' || relname as table_name,
                   pg_size_pretty(pg_total_relation_size(relid)) as total_size,
                   pg_size_pretty(pg_relation_size(relid)) as table_size,
                   pg_size_pretty(pg_indexes_size(relid)) as indexes_size,
                   n_live_tup as row_count
            FROM pg_stat_user_tables
            ORDER BY pg_total_relation_size(relid) DESC
            LIMIT 15
        """,
        'scope': ['database'],
    },

    # Replication
    'replication_status': {
        'sql': """
            SELECT client_addr, state, sync_state,
                   pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) as sent_lag,
                   pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn) as write_lag,
                   pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) as flush_lag,
                   pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as replay_lag
            FROM pg_stat_replication
            LIMIT 10
        """,
        'scope': ['server'],
    },

    # =========================================================================
    # DESIGN QUERIES
    # =========================================================================

    # Table Structure
    'tables_overview': {
        'sql': """
            SELECT n.nspname as schema_name,
                   c.relname as table_name,
                   pg_catalog.pg_get_userbyid(c.relowner) as owner,
                   pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
                   (SELECT count(*) FROM pg_attribute a
                    WHERE a.attrelid = c.oid AND a.attnum > 0
                      AND NOT a.attisdropped) as column_count,
                   obj_description(c.oid) as description
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind IN ('r', 'p')
              AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
              AND n.nspname NOT LIKE 'pg_temp%'
            ORDER BY n.nspname, c.relname
            LIMIT 50
        """,
        'scope': ['database', 'schema'],
    },

    'columns_info': {
        'sql': """
            SELECT n.nspname as schema_name,
                   c.relname as table_name,
                   a.attname as column_name,
                   pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
                   a.attnotnull as not_null,
                   pg_get_expr(d.adbin, d.adrelid) as default_value,
                   col_description(c.oid, a.attnum) as description
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
            WHERE a.attnum > 0
              AND NOT a.attisdropped
              AND c.relkind IN ('r', 'p')
              AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
              AND n.nspname NOT LIKE 'pg_temp%'
            ORDER BY n.nspname, c.relname, a.attnum
            LIMIT 200
        """,
        'scope': ['database', 'schema'],
    },

    # Primary Keys
    'primary_keys': {
        'sql': """
            SELECT n.nspname as schema_name,
                   c.relname as table_name,
                   con.conname as constraint_name,
                   array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum))
                       as columns
            FROM pg_constraint con
            JOIN pg_class c ON c.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
            WHERE con.contype = 'p'
              AND n.nspname NOT IN ('pg_catalog', 'information_schema')
            GROUP BY n.nspname, c.relname, con.conname
            ORDER BY n.nspname, c.relname
            LIMIT 50
        """,
        'scope': ['database', 'schema'],
    },

    'tables_without_pk': {
        'sql': """
            SELECT n.nspname as schema_name,
                   c.relname as table_name,
                   pg_size_pretty(pg_total_relation_size(c.oid)) as size
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'r'
              AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
              AND n.nspname NOT LIKE 'pg_temp%'
              AND NOT EXISTS (
                  SELECT 1 FROM pg_constraint con
                  WHERE con.conrelid = c.oid AND con.contype = 'p'
              )
            ORDER BY pg_total_relation_size(c.oid) DESC
            LIMIT 20
        """,
        'scope': ['database', 'schema'],
    },

    # Foreign Keys
    'foreign_keys': {
        'sql': """
            SELECT n.nspname as schema_name,
                   c.relname as table_name,
                   con.conname as constraint_name,
                   array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum))
                       as columns,
                   fn.nspname as ref_schema,
                   fc.relname as ref_table,
                   array_agg(fa.attname ORDER BY array_position(con.confkey, fa.attnum))
                       as ref_columns
            FROM pg_constraint con
            JOIN pg_class c ON c.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_class fc ON fc.oid = con.confrelid
            JOIN pg_namespace fn ON fn.oid = fc.relnamespace
            JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
            JOIN pg_attribute fa ON fa.attrelid = fc.oid AND fa.attnum = ANY(con.confkey)
            WHERE con.contype = 'f'
              AND n.nspname NOT IN ('pg_catalog', 'information_schema')
            GROUP BY n.nspname, c.relname, con.conname, fn.nspname, fc.relname
            ORDER BY n.nspname, c.relname
            LIMIT 50
        """,
        'scope': ['database', 'schema'],
    },

    # Indexes
    'indexes_info': {
        'sql': """
            SELECT n.nspname as schema_name,
                   c.relname as table_name,
                   i.relname as index_name,
                   am.amname as index_type,
                   idx.indisunique as is_unique,
                   idx.indisprimary as is_primary,
                   pg_get_indexdef(idx.indexrelid) as definition,
                   pg_size_pretty(pg_relation_size(i.oid)) as size
            FROM pg_index idx
            JOIN pg_class c ON c.oid = idx.indrelid
            JOIN pg_class i ON i.oid = idx.indexrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_am am ON am.oid = i.relam
            WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            ORDER BY n.nspname, c.relname, i.relname
            LIMIT 100
        """,
        'scope': ['database', 'schema'],
    },

    'duplicate_indexes': {
        'sql': """
            WITH index_cols AS (
                SELECT n.nspname as schema_name,
                       c.relname as table_name,
                       i.relname as index_name,
                       pg_get_indexdef(idx.indexrelid) as definition,
                       array_agg(a.attname ORDER BY array_position(idx.indkey, a.attnum))
                           as columns,
                       pg_relation_size(i.oid) as size
                FROM pg_index idx
                JOIN pg_class c ON c.oid = idx.indrelid
                JOIN pg_class i ON i.oid = idx.indexrelid
                JOIN pg_namespace n ON n.oid = c.relnamespace
                JOIN pg_attribute a ON a.attrelid = c.oid
                    AND a.attnum = ANY(idx.indkey)
                WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
                GROUP BY n.nspname, c.relname, i.relname, idx.indexrelid, i.oid
            )
            SELECT a.schema_name, a.table_name,
                   a.index_name as index1, b.index_name as index2,
                   a.columns,
                   pg_size_pretty(a.size + b.size) as combined_size
            FROM index_cols a
            JOIN index_cols b ON a.schema_name = b.schema_name
                AND a.table_name = b.table_name
                AND a.columns = b.columns
                AND a.index_name < b.index_name
            ORDER BY a.size + b.size DESC
            LIMIT 10
        """,
        'scope': ['database'],
    },

    # Constraints
    'check_constraints': {
        'sql': """
            SELECT n.nspname as schema_name,
                   c.relname as table_name,
                   con.conname as constraint_name,
                   pg_get_constraintdef(con.oid) as definition
            FROM pg_constraint con
            JOIN pg_class c ON c.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE con.contype = 'c'
              AND n.nspname NOT IN ('pg_catalog', 'information_schema')
            ORDER BY n.nspname, c.relname, con.conname
            LIMIT 50
        """,
        'scope': ['database', 'schema'],
    },

    'unique_constraints': {
        'sql': """
            SELECT n.nspname as schema_name,
                   c.relname as table_name,
                   con.conname as constraint_name,
                   array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum))
                       as columns
            FROM pg_constraint con
            JOIN pg_class c ON c.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
            WHERE con.contype = 'u'
              AND n.nspname NOT IN ('pg_catalog', 'information_schema')
            GROUP BY n.nspname, c.relname, con.conname
            ORDER BY n.nspname, c.relname
            LIMIT 50
        """,
        'scope': ['database', 'schema'],
    },

    # Normalization Issues
    'repeated_column_names': {
        'sql': """
            SELECT a.attname as column_name,
                   count(*) as occurrence_count,
                   array_agg(DISTINCT n.nspname || '.' || c.relname) as tables
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE a.attnum > 0
              AND NOT a.attisdropped
              AND c.relkind = 'r'
              AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            GROUP BY a.attname
            HAVING count(*) > 3
            ORDER BY count(*) DESC
            LIMIT 20
        """,
        'scope': ['database'],
    },

    # Naming Conventions
    'object_names': {
        'sql': """
            SELECT 'table' as object_type, n.nspname as schema_name, c.relname as name
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind IN ('r', 'p')
              AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            UNION ALL
            SELECT 'column', n.nspname, c.relname || '.' || a.attname
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE a.attnum > 0 AND NOT a.attisdropped
              AND c.relkind = 'r'
              AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            LIMIT 200
        """,
        'scope': ['database', 'schema'],
    },

    # Data Types
    'column_types': {
        'sql': """
            SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
                   count(*) as usage_count,
                   CASE
                       WHEN count(*) <= 5 THEN array_agg(DISTINCT n.nspname || '.' || c.relname || '.' || a.attname)
                       ELSE NULL
                   END as example_columns
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE a.attnum > 0
              AND NOT a.attisdropped
              AND c.relkind = 'r'
              AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            GROUP BY pg_catalog.format_type(a.atttypid, a.atttypmod)
            ORDER BY count(*) DESC
            LIMIT 20
        """,
        'scope': ['database'],
    },
}


def get_query(query_id: str) -> Optional[dict]:
    """Get a query definition by ID.

    Args:
        query_id: The query identifier.

    Returns:
        Query definition dict or None if not found.
    """
    return QUERIES.get(query_id)


def execute_query(
    conn,
    query_id: str,
    context: dict,
    params: Optional[list] = None
) -> dict[str, Any]:
    """Execute a registered query and return results.

    Args:
        conn: Database connection.
        query_id: The query identifier.
        context: Execution context (for scope filtering).
        params: Optional query parameters.

    Returns:
        Dictionary with query results or error.

    Raises:
        ValueError: If query not found.
    """
    query_def = QUERIES.get(query_id)
    if not query_def:
        raise ValueError(f"Unknown query: {query_id}")

    sql = query_def['sql']

    # Check if query requires an extension
    required_ext = query_def.get('requires_extension')
    if required_ext:
        # Check if extension is installed
        check_sql = f"""
            SELECT EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = '{required_ext}'
            ) as available
        """
        status, result = conn.execute_dict(check_sql)
        if not (status and result and
                result.get('rows', [{}])[0].get('available', False)):
            return {
                'error': f"Extension '{required_ext}' not installed",
                'rows': []
            }

    # Execute the query
    try:
        if params:
            status, result = conn.execute_dict(sql, params)
        else:
            status, result = conn.execute_dict(sql)

        if status and result:
            return {'rows': result.get('rows', [])}
        else:
            return {'error': 'Query execution failed', 'rows': []}

    except Exception as e:
        return {'error': str(e), 'rows': []}
