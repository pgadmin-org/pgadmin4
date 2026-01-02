##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Data models for the report generation pipeline."""

from dataclasses import dataclass, field
from typing import Any, Optional
from enum import Enum


class Severity(str, Enum):
    """Severity levels for report findings."""
    CRITICAL = 'critical'
    WARNING = 'warning'
    ADVISORY = 'advisory'
    GOOD = 'good'
    INFO = 'info'


@dataclass
class Section:
    """Definition of a report section.

    Attributes:
        id: Unique identifier for the section.
        name: Human-readable name for display.
        description: What this section analyzes.
        queries: List of query identifiers to run for this section.
        scope: What scope this section applies to ('server', 'database', 'schema').
    """
    id: str
    name: str
    description: str
    queries: list[str]
    scope: list[str] = field(default_factory=lambda: ['server', 'database', 'schema'])


@dataclass
class SectionResult:
    """Result from analyzing a report section.

    Attributes:
        section_id: The section that was analyzed.
        section_name: Human-readable section name.
        data: Raw data gathered from SQL queries.
        summary: LLM-generated summary of the section.
        severity: Overall severity of findings in this section.
        error: Error message if analysis failed.
    """
    section_id: str
    section_name: str
    data: dict[str, Any] = field(default_factory=dict)
    summary: str = ''
    severity: Severity = Severity.INFO
    error: Optional[str] = None

    @property
    def has_error(self) -> bool:
        """Check if this section had an error."""
        return self.error is not None

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            'section_id': self.section_id,
            'section_name': self.section_name,
            'summary': self.summary,
            'severity': self.severity.value,
            'error': self.error
        }


@dataclass
class PipelineProgress:
    """Progress update from the pipeline.

    Attributes:
        stage: Current stage ('planning', 'gathering', 'analyzing', 'synthesizing').
        section: Current section being processed (if applicable).
        message: Human-readable progress message.
        completed: Number of sections completed.
        total: Total number of sections.
        retry_wait: Seconds waiting before retry (if rate limited).
    """
    stage: str
    message: str
    section: Optional[str] = None
    completed: int = 0
    total: int = 0
    retry_wait: Optional[int] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for SSE event."""
        result = {
            'type': 'progress' if self.retry_wait is None else 'retry',
            'stage': self.stage,
            'message': self.message
        }
        if self.section:
            result['section'] = self.section
        if self.completed or self.total:
            result['completed'] = self.completed
            result['total'] = self.total
        if self.retry_wait is not None:
            result['wait_seconds'] = self.retry_wait
        return result
