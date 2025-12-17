##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Multi-stage LLM report generation pipeline.

This module provides a staged approach to generating reports that works
within token limits of various LLM models by breaking analysis into
sections that are summarized independently and then synthesized.
"""

from pgadmin.llm.reports.pipeline import ReportPipeline
from pgadmin.llm.reports.models import Section, SectionResult, Severity
from pgadmin.llm.reports.sections import (
    SECURITY_SECTIONS, PERFORMANCE_SECTIONS, DESIGN_SECTIONS,
    get_sections_for_report, get_sections_for_scope
)
from pgadmin.llm.reports.queries import get_query, execute_query

__all__ = [
    'ReportPipeline',
    'Section',
    'SectionResult',
    'Severity',
    'SECURITY_SECTIONS',
    'PERFORMANCE_SECTIONS',
    'DESIGN_SECTIONS',
    'get_sections_for_report',
    'get_sections_for_scope',
    'get_query',
    'execute_query',
]
