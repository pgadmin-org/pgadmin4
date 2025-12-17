##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Section definitions for report generation pipeline.

Each report type has a set of sections that can be analyzed independently.
Sections are mapped to SQL queries and have descriptions for LLM guidance.
"""

from pgadmin.llm.reports.models import Section

# =============================================================================
# SECURITY REPORT SECTIONS
# =============================================================================

SECURITY_SECTIONS = [
    Section(
        id='authentication',
        name='Authentication Configuration',
        description=(
            'Password policies, SSL/TLS settings, authentication methods, '
            'and connection security settings.'
        ),
        queries=['security_settings', 'hba_rules'],
        scope=['server']
    ),
    Section(
        id='access_control',
        name='Access Control & Roles',
        description=(
            'Superuser accounts, privileged roles, login roles, '
            'and role privilege assignments.'
        ),
        queries=['superusers', 'privileged_roles', 'roles_no_expiry'],
        scope=['server', 'database']
    ),
    Section(
        id='network_security',
        name='Network Security',
        description=(
            'Network exposure settings, listen addresses, connection limits, '
            'and pg_hba.conf rules.'
        ),
        queries=['security_settings', 'hba_rules'],
        scope=['server']
    ),
    Section(
        id='encryption',
        name='Encryption & SSL',
        description=(
            'SSL/TLS configuration, password encryption method, '
            'and data-at-rest encryption settings.'
        ),
        queries=['security_settings'],
        scope=['server']
    ),
    Section(
        id='object_permissions',
        name='Object Permissions',
        description=(
            'Schema, table, and function access control lists (ACLs), '
            'default privileges, and ownership.'
        ),
        queries=['database_settings', 'schema_acls', 'table_acls',
                 'default_privileges'],
        scope=['database']
    ),
    Section(
        id='rls_policies',
        name='Row-Level Security',
        description=(
            'Row-level security policies, RLS-enabled tables, '
            'and policy coverage analysis.'
        ),
        queries=['rls_enabled_tables', 'rls_policies'],
        scope=['database', 'schema']
    ),
    Section(
        id='security_definer',
        name='Security Definer Functions',
        description=(
            'Functions running with elevated privileges (SECURITY DEFINER), '
            'their ownership, and permissions.'
        ),
        queries=['security_definer_functions'],
        scope=['database', 'schema']
    ),
    Section(
        id='audit_logging',
        name='Audit & Logging',
        description=(
            'Connection logging, statement logging, error logging, '
            'and audit trail configuration.'
        ),
        queries=['logging_settings'],
        scope=['server']
    ),
    Section(
        id='extensions',
        name='Extensions',
        description=(
            'Installed extensions and their security implications.'
        ),
        queries=['extensions'],
        scope=['server', 'database']
    ),
]

# =============================================================================
# PERFORMANCE REPORT SECTIONS
# =============================================================================

PERFORMANCE_SECTIONS = [
    Section(
        id='memory_config',
        name='Memory Configuration',
        description=(
            'shared_buffers, work_mem, effective_cache_size, '
            'maintenance_work_mem, and other memory settings.'
        ),
        queries=['memory_settings'],
        scope=['server']
    ),
    Section(
        id='checkpoint_wal',
        name='Checkpoint & WAL',
        description=(
            'Checkpoint settings, WAL configuration, background writer stats, '
            'and write-ahead log tuning.'
        ),
        queries=['checkpoint_settings', 'wal_settings', 'bgwriter_stats'],
        scope=['server']
    ),
    Section(
        id='autovacuum',
        name='Autovacuum Configuration',
        description=(
            'Autovacuum settings, tables needing vacuum, '
            'dead tuple accumulation, and maintenance status.'
        ),
        queries=['autovacuum_settings', 'tables_needing_vacuum'],
        scope=['server', 'database']
    ),
    Section(
        id='query_planner',
        name='Query Planner Settings',
        description=(
            'Cost parameters, statistics targets, JIT compilation, '
            'and planner optimization settings.'
        ),
        queries=['planner_settings'],
        scope=['server']
    ),
    Section(
        id='parallelism',
        name='Parallelism & Workers',
        description=(
            'Parallel query configuration, worker processes, '
            'and parallel maintenance settings.'
        ),
        queries=['parallel_settings'],
        scope=['server']
    ),
    Section(
        id='connection_pooling',
        name='Connection Management',
        description=(
            'Max connections, reserved connections, timeouts, '
            'and current connection status.'
        ),
        queries=['connection_settings', 'active_connections'],
        scope=['server']
    ),
    Section(
        id='cache_efficiency',
        name='Cache Efficiency',
        description=(
            'Buffer cache hit ratios, database-level cache stats, '
            'and table-level I/O patterns.'
        ),
        queries=['database_stats', 'table_cache_stats'],
        scope=['server', 'database']
    ),
    Section(
        id='index_usage',
        name='Index Analysis',
        description=(
            'Index utilization, unused indexes, tables needing indexes, '
            'and index size analysis.'
        ),
        queries=['table_stats', 'unused_indexes', 'tables_needing_indexes',
                 'table_sizes'],
        scope=['database']
    ),
    Section(
        id='slow_queries',
        name='Query Performance',
        description=(
            'Slowest queries, most frequent queries, '
            'and query execution statistics (requires pg_stat_statements).'
        ),
        queries=['stat_statements_check', 'top_queries_by_time',
                 'top_queries_by_calls'],
        scope=['server', 'database']
    ),
    Section(
        id='replication',
        name='Replication Status',
        description=(
            'Replication lag, standby status, and WAL sender statistics.'
        ),
        queries=['replication_status'],
        scope=['server']
    ),
]

# =============================================================================
# DESIGN REPORT SECTIONS
# =============================================================================

DESIGN_SECTIONS = [
    Section(
        id='table_structure',
        name='Table Structure',
        description=(
            'Table definitions, column counts, sizes, ownership, '
            'and documentation coverage.'
        ),
        queries=['tables_overview', 'columns_info'],
        scope=['database', 'schema']
    ),
    Section(
        id='primary_keys',
        name='Primary Key Analysis',
        description=(
            'Primary key design, tables without primary keys, '
            'and key column choices.'
        ),
        queries=['primary_keys', 'tables_without_pk'],
        scope=['database', 'schema']
    ),
    Section(
        id='foreign_keys',
        name='Referential Integrity',
        description=(
            'Foreign key relationships, orphan references, '
            'and relationship coverage.'
        ),
        queries=['foreign_keys'],
        scope=['database', 'schema']
    ),
    Section(
        id='indexes',
        name='Index Strategy',
        description=(
            'Index definitions, duplicate indexes, index types, '
            'and coverage analysis.'
        ),
        queries=['indexes_info', 'duplicate_indexes'],
        scope=['database', 'schema']
    ),
    Section(
        id='constraints',
        name='Constraints',
        description=(
            'Check constraints, unique constraints, '
            'and data validation coverage.'
        ),
        queries=['check_constraints', 'unique_constraints'],
        scope=['database', 'schema']
    ),
    Section(
        id='normalization',
        name='Normalization Analysis',
        description=(
            'Repeated column patterns, potential denormalization issues, '
            'and data redundancy.'
        ),
        queries=['repeated_column_names'],
        scope=['database']
    ),
    Section(
        id='naming_conventions',
        name='Naming Conventions',
        description=(
            'Table and column naming patterns, consistency analysis, '
            'and naming standard compliance.'
        ),
        queries=['object_names'],
        scope=['database', 'schema']
    ),
    Section(
        id='data_types',
        name='Data Type Review',
        description=(
            'Data type usage patterns, type consistency, '
            'and type appropriateness.'
        ),
        queries=['column_types'],
        scope=['database']
    ),
]

# =============================================================================
# SECTION LOOKUPS
# =============================================================================

# Convert lists to dictionaries for quick lookup
SECURITY_SECTIONS_DICT = {s.id: s for s in SECURITY_SECTIONS}
PERFORMANCE_SECTIONS_DICT = {s.id: s for s in PERFORMANCE_SECTIONS}
DESIGN_SECTIONS_DICT = {s.id: s for s in DESIGN_SECTIONS}

# Combined lookup by report type
SECTIONS_BY_TYPE = {
    'security': SECURITY_SECTIONS,
    'performance': PERFORMANCE_SECTIONS,
    'design': DESIGN_SECTIONS,
}

SECTIONS_DICT_BY_TYPE = {
    'security': SECURITY_SECTIONS_DICT,
    'performance': PERFORMANCE_SECTIONS_DICT,
    'design': DESIGN_SECTIONS_DICT,
}


def get_sections_for_report(report_type: str) -> list[Section]:
    """Get all sections for a report type.

    Args:
        report_type: One of 'security', 'performance', 'design'.

    Returns:
        List of Section objects.

    Raises:
        ValueError: If report_type is invalid.
    """
    sections = SECTIONS_BY_TYPE.get(report_type)
    if sections is None:
        raise ValueError(f"Invalid report type: {report_type}")
    return sections


def get_sections_for_scope(
    report_type: str,
    scope: str
) -> list[Section]:
    """Get sections applicable to a specific scope.

    Args:
        report_type: One of 'security', 'performance', 'design'.
        scope: One of 'server', 'database', 'schema'.

    Returns:
        List of Section objects applicable to the scope.
    """
    all_sections = get_sections_for_report(report_type)
    return [s for s in all_sections if scope in s.scope]


def get_section(report_type: str, section_id: str) -> Section:
    """Get a specific section by ID.

    Args:
        report_type: One of 'security', 'performance', 'design'.
        section_id: The section identifier.

    Returns:
        Section object.

    Raises:
        ValueError: If section not found.
    """
    sections_dict = SECTIONS_DICT_BY_TYPE.get(report_type, {})
    section = sections_dict.get(section_id)
    if section is None:
        raise ValueError(
            f"Section '{section_id}' not found in {report_type} report"
        )
    return section
