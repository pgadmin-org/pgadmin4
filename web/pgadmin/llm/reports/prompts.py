##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Prompt templates for report generation pipeline stages."""


# =============================================================================
# Planning Stage Prompts
# =============================================================================

PLANNING_SYSTEM_PROMPT = """You are a PostgreSQL expert helping to plan a database analysis report.

Your task is to select which analysis sections are most relevant for the given report type and database context.

Return ONLY a JSON array of section IDs to analyze, ordered by priority.
Only include sections that are relevant given the database characteristics.
Do not include any explanation, just the JSON array."""


def get_planning_user_prompt(
    report_type: str,
    sections: list[dict],
    context: dict
) -> str:
    """Build the planning stage user prompt.

    Args:
        report_type: Type of report ('security', 'performance', 'design').
        sections: List of available sections with id, name, description.
        context: Database context (version, size, table count, etc.).

    Returns:
        Formatted user prompt for planning.
    """
    sections_list = '\n'.join([
        f"- {s['id']}: {s['name']} - {s['description']}"
        for s in sections
    ])

    return f"""Select the most relevant sections for a {report_type} report.

Available sections:
{sections_list}

Database context:
- Server version: {context.get('server_version', 'Unknown')}
- Database name: {context.get('database_name', 'N/A')}
- Schema name: {context.get('schema_name', 'N/A')}
- Table count: {context.get('table_count', 'Unknown')}
- Has pg_stat_statements: {context.get('has_stat_statements', False)}

Return a JSON array of section IDs to analyze, e.g.: ["section1", "section2", "section3"]"""


# =============================================================================
# Section Analysis Prompts
# =============================================================================

SECTION_ANALYSIS_SYSTEM_PROMPT = """You are a PostgreSQL expert analyzing database configuration.

Analyze the provided data and generate a concise summary (max 300 words).

Your response MUST follow this exact format:
### [Section Name]

**Status**: [One of: Good, Advisory, Warning, Critical]

**Findings**:
- [Finding 1]
- [Finding 2]
- [etc.]

**Recommendations**:
- [Recommendation 1 with specific action]
- [Recommendation 2 with specific action]
- [etc.]

Use these severity indicators in findings:
- 🔴 for Critical issues
- 🟠 for Warning issues
- 🟡 for Advisory items
- 🟢 for Good/positive findings

Be specific and actionable. Include SQL commands where relevant."""


def get_section_analysis_prompt(
    section_name: str,
    section_description: str,
    data: dict,
    context: dict
) -> str:
    """Build the section analysis user prompt.

    Args:
        section_name: Name of the section being analyzed.
        section_description: Description of what this section covers.
        data: Query results for this section.
        context: Database context.

    Returns:
        Formatted user prompt for section analysis.
    """
    import json

    data_json = json.dumps(data, indent=2, default=str)

    return f"""Analyze the following {section_name} data for a PostgreSQL {context.get('server_version', '')} server.

Section focus: {section_description}

Database: {context.get('database_name', 'N/A')}
Schema: {context.get('schema_name', 'all schemas')}

Data:
```json
{data_json}
```

Provide your analysis following the required format."""


# =============================================================================
# Synthesis Prompts
# =============================================================================

SYNTHESIS_SYSTEM_PROMPT = """You are a PostgreSQL expert creating a comprehensive report.

Combine the section summaries into a cohesive, well-organized report.

Your report MUST:
1. Start with an **Executive Summary** (3-5 sentences overview)
2. Include a **Critical Issues** section (aggregate all critical/warning findings)
3. Include each section's detailed analysis (use the section content as-is, don't add duplicate headers)
4. End with **Prioritized Recommendations** (numbered list, most important first)

IMPORTANT:
- Do NOT include a report title at the very beginning - start directly with Executive Summary
- Each section already has its own ### header - do NOT add extra headers around them
- Simply organize and flow the sections together naturally

Use severity indicators consistently:
- 🔴 Critical - Immediate action required
- 🟠 Warning - Should be addressed soon
- 🟡 Advisory - Consider improving
- 🟢 Good - No issues found

Be professional and actionable. Include SQL commands for recommendations where helpful."""


def get_synthesis_prompt(
    report_type: str,
    section_summaries: list[dict],
    context: dict
) -> str:
    """Build the synthesis stage user prompt.

    Args:
        report_type: Type of report being generated.
        section_summaries: List of section results with summaries.
        context: Database context.

    Returns:
        Formatted user prompt for synthesis.
    """
    # Don't add extra headers - the section summaries already include them
    summaries_text = '\n\n---\n\n'.join([
        s['summary']
        for s in section_summaries
        if s.get('summary') and not s.get('error')
    ])

    report_type_display = {
        'security': 'Security',
        'performance': 'Performance',
        'design': 'Design Review'
    }.get(report_type, report_type.title())

    scope_info = context.get('database_name', 'server')
    if context.get('schema_name'):
        scope_info = f"{context['schema_name']} schema in {scope_info}"

    return f"""Create a comprehensive {report_type_display} Report for {scope_info}.

Server: PostgreSQL {context.get('server_version', 'Unknown')}

Section Summaries:

{summaries_text}

---

Combine these into a final report following the required format.
Start with Executive Summary (do not add a title before it)."""


# =============================================================================
# Report Type Specific Guidance
# =============================================================================

SECURITY_GUIDANCE = """
Focus areas for security analysis:
- Authentication configuration and password policies
- Role privileges and permission escalation risks
- Network exposure and connection security
- Encryption settings (SSL/TLS, password hashing)
- Row-level security and object permissions
- Security definer functions
- Audit logging configuration
"""

PERFORMANCE_GUIDANCE = """
Focus areas for performance analysis:
- Memory configuration (shared_buffers, work_mem, effective_cache_size)
- Checkpoint and WAL settings
- Autovacuum effectiveness
- Query planner configuration
- Index utilization and missing indexes
- Cache hit ratios
- Connection management
"""

DESIGN_GUIDANCE = """
Focus areas for design analysis:
- Table structure and normalization
- Primary key and foreign key design
- Index strategy and coverage
- Constraint completeness
- Data type appropriateness
- Naming conventions
"""
