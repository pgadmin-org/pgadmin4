##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Core report generation pipeline implementation."""

import json
import time
from typing import Generator, Optional, Callable, Any

from pgadmin.llm.client import LLMClient, LLMClientError
from pgadmin.llm.models import Message
from pgadmin.llm.reports.models import (
    Section, SectionResult, Severity, PipelineProgress
)
from pgadmin.llm.reports.prompts import (
    PLANNING_SYSTEM_PROMPT, get_planning_user_prompt,
    SECTION_ANALYSIS_SYSTEM_PROMPT, get_section_analysis_prompt,
    SYNTHESIS_SYSTEM_PROMPT, get_synthesis_prompt
)


class ReportPipelineError(Exception):
    """Error during report pipeline execution."""
    pass


class ReportPipeline:
    """Multi-stage report generation pipeline.

    This pipeline breaks report generation into 4 stages:
    1. Planning - LLM selects which sections to analyze
    2. Data Gathering - Run SQL queries for each section
    3. Section Analysis - LLM summarizes each section independently
    4. Synthesis - LLM merges section summaries into final report

    This approach keeps each LLM call within token limits while
    producing comprehensive, well-structured reports.
    """

    def __init__(
        self,
        report_type: str,
        sections: list[Section],
        client: LLMClient,
        query_executor: Callable[[str, dict], dict],
        max_retries: int = 3,
        retry_base_delay: float = 5.0
    ):
        """Initialize the pipeline.

        Args:
            report_type: Type of report ('security', 'performance', 'design').
            sections: List of available Section definitions.
            client: LLM client for making API calls.
            query_executor: Function to execute queries given query_id and context.
            max_retries: Maximum retry attempts for rate-limited calls.
            retry_base_delay: Base delay in seconds for exponential backoff.
        """
        self.report_type = report_type
        self.sections = {s.id: s for s in sections}
        self.client = client
        self.query_executor = query_executor
        self.max_retries = max_retries
        self.retry_base_delay = retry_base_delay

    def execute(self, context: dict) -> str:
        """Execute the pipeline and return the final report.

        Args:
            context: Dictionary with database context (server_version,
                    database_name, schema_name, etc.)

        Returns:
            Final report as markdown string.

        Raises:
            ReportPipelineError: If pipeline fails.
        """
        # Consume the generator to get final result
        result = None
        for event in self.execute_with_progress(context):
            if event.get('type') == 'complete':
                result = event.get('report', '')
            elif event.get('type') == 'error':
                raise ReportPipelineError(event.get('message', 'Unknown error'))
        return result or ''

    def execute_with_progress(
        self,
        context: dict
    ) -> Generator[dict, None, None]:
        """Execute the pipeline with progress updates.

        Yields SSE-compatible event dictionaries throughout execution.

        Args:
            context: Dictionary with database context.

        Yields:
            Event dictionaries with type, stage, message, etc.
        """
        try:
            # Stage 1: Planning
            yield {'type': 'stage', 'stage': 'planning',
                   'message': 'Planning analysis sections...'}

            selected_section_ids = self._planning_stage(context)

            if not selected_section_ids:
                # Fallback to all sections if planning returns empty
                selected_section_ids = list(self.sections.keys())

            total_sections = len(selected_section_ids)

            # Stage 2: Data Gathering
            yield {'type': 'stage', 'stage': 'gathering',
                   'message': 'Gathering data...'}

            section_data = {}
            for i, section_id in enumerate(selected_section_ids):
                section = self.sections.get(section_id)
                if not section:
                    continue

                yield {'type': 'progress', 'stage': 'gathering',
                       'section': section.name,
                       'message': f'Gathering {section.name} data...',
                       'completed': i, 'total': total_sections}

                section_data[section_id] = self._gather_section_data(
                    section, context
                )

            # Stage 3: Section Analysis
            yield {'type': 'stage', 'stage': 'analyzing',
                   'message': 'Analyzing sections...'}

            section_results = []
            for i, section_id in enumerate(selected_section_ids):
                section = self.sections.get(section_id)
                if not section or section_id not in section_data:
                    continue

                yield {'type': 'progress', 'stage': 'analyzing',
                       'section': section.name,
                       'message': f'Analyzing {section.name}...',
                       'completed': i, 'total': total_sections}

                # Call LLM with retry for rate limits
                for retry_event in self._analyze_section_with_retry(
                    section, section_data[section_id], context
                ):
                    if retry_event.get('type') == 'retry':
                        yield retry_event
                    elif retry_event.get('type') == 'result':
                        section_results.append(retry_event['result'])

            # Stage 4: Synthesis
            yield {'type': 'stage', 'stage': 'synthesizing',
                   'message': 'Creating final report...'}

            for retry_event in self._synthesize_with_retry(
                section_results, context
            ):
                if retry_event.get('type') == 'retry':
                    yield retry_event
                elif retry_event.get('type') == 'result':
                    final_report = retry_event['result']

            yield {'type': 'complete', 'report': final_report}

        except ReportPipelineError:
            raise
        except Exception as e:
            yield {'type': 'error', 'message': str(e)}

    def _planning_stage(self, context: dict) -> list[str]:
        """Run the planning stage to select relevant sections.

        Args:
            context: Database context.

        Returns:
            List of section IDs to analyze.
        """
        # Filter sections by scope
        scope = 'server'
        if context.get('schema_name'):
            scope = 'schema'
        elif context.get('database_name'):
            scope = 'database'

        available_sections = [
            {'id': s.id, 'name': s.name, 'description': s.description}
            for s in self.sections.values()
            if scope in s.scope
        ]

        if not available_sections:
            return []

        # Ask LLM to select sections
        user_prompt = get_planning_user_prompt(
            self.report_type, available_sections, context
        )

        try:
            response = self._call_llm_with_retry(
                messages=[Message.user(user_prompt)],
                system_prompt=PLANNING_SYSTEM_PROMPT,
                max_tokens=500,
                temperature=0.0
            )

            # Parse JSON response
            content = response.content.strip()
            # Handle markdown code blocks
            if content.startswith('```'):
                content = content.split('\n', 1)[1]
                content = content.rsplit('```', 1)[0]

            selected_ids = json.loads(content)

            # Validate section IDs
            valid_ids = [
                sid for sid in selected_ids
                if sid in self.sections
            ]

            return valid_ids if valid_ids else [s['id'] for s in available_sections]

        except (json.JSONDecodeError, LLMClientError):
            # Fallback to all available sections
            return [s['id'] for s in available_sections]

    def _gather_section_data(
        self,
        section: Section,
        context: dict
    ) -> dict[str, Any]:
        """Gather data for a section by executing its queries.

        Args:
            section: Section definition with query IDs.
            context: Database context.

        Returns:
            Dictionary mapping query_id to query results.
        """
        data = {}
        for query_id in section.queries:
            try:
                result = self.query_executor(query_id, context)
                data[query_id] = result
            except Exception as e:
                data[query_id] = {'error': str(e)}
        return data

    def _analyze_section_with_retry(
        self,
        section: Section,
        data: dict,
        context: dict
    ) -> Generator[dict, None, None]:
        """Analyze a section with retry logic.

        Args:
            section: Section to analyze.
            data: Query results for this section.
            context: Database context.

        Yields:
            Retry events and final result event.
        """
        user_prompt = get_section_analysis_prompt(
            section.name, section.description, data, context
        )

        for attempt in range(self.max_retries):
            try:
                response = self.client.chat(
                    messages=[Message.user(user_prompt)],
                    system_prompt=SECTION_ANALYSIS_SYSTEM_PROMPT,
                    max_tokens=1500,
                    temperature=0.3
                )

                # Determine severity from content
                severity = self._extract_severity(response.content)

                result = SectionResult(
                    section_id=section.id,
                    section_name=section.name,
                    data=data,
                    summary=response.content,
                    severity=severity
                )

                yield {'type': 'result', 'result': result}
                return

            except LLMClientError as e:
                if e.error.retryable and attempt < self.max_retries - 1:
                    wait_time = int(self.retry_base_delay * (2 ** attempt))
                    yield {
                        'type': 'retry',
                        'reason': 'rate_limit',
                        'message': f'Rate limited, retrying in {wait_time}s...',
                        'wait_seconds': wait_time
                    }
                    time.sleep(wait_time)
                else:
                    # Return error result
                    result = SectionResult(
                        section_id=section.id,
                        section_name=section.name,
                        data=data,
                        error=str(e)
                    )
                    yield {'type': 'result', 'result': result}
                    return

    def _synthesize_with_retry(
        self,
        section_results: list[SectionResult],
        context: dict
    ) -> Generator[dict, None, None]:
        """Synthesize final report with retry logic.

        Args:
            section_results: Results from section analysis.
            context: Database context.

        Yields:
            Retry events and final result event.
        """
        # Filter out failed sections
        successful_results = [
            {
                'section_id': r.section_id,
                'section_name': r.section_name,
                'summary': r.summary,
                'severity': r.severity.value
            }
            for r in section_results
            if not r.has_error and r.summary
        ]

        if not successful_results:
            yield {
                'type': 'result',
                'result': '**Error**: No sections were successfully analyzed.'
            }
            return

        user_prompt = get_synthesis_prompt(
            self.report_type, successful_results, context
        )

        for attempt in range(self.max_retries):
            try:
                response = self.client.chat(
                    messages=[Message.user(user_prompt)],
                    system_prompt=SYNTHESIS_SYSTEM_PROMPT,
                    max_tokens=4096,
                    temperature=0.3
                )

                yield {'type': 'result', 'result': response.content}
                return

            except LLMClientError as e:
                if e.error.retryable and attempt < self.max_retries - 1:
                    wait_time = int(self.retry_base_delay * (2 ** attempt))
                    yield {
                        'type': 'retry',
                        'reason': 'rate_limit',
                        'message': f'Rate limited, retrying in {wait_time}s...',
                        'wait_seconds': wait_time
                    }
                    time.sleep(wait_time)
                else:
                    # Return partial report with section summaries
                    partial = "**Note**: Synthesis failed. Section summaries:\n\n"
                    for r in successful_results:
                        partial += f"## {r['section_name']}\n\n{r['summary']}\n\n"
                    yield {'type': 'result', 'result': partial}
                    return

    def _call_llm_with_retry(
        self,
        messages: list[Message],
        system_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.3
    ):
        """Call LLM with exponential backoff retry.

        Args:
            messages: Messages to send.
            system_prompt: System prompt.
            max_tokens: Maximum response tokens.
            temperature: Sampling temperature.

        Returns:
            LLMResponse from the client.

        Raises:
            LLMClientError: If all retries fail.
        """
        for attempt in range(self.max_retries):
            try:
                return self.client.chat(
                    messages=messages,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
            except LLMClientError as e:
                if e.error.retryable and attempt < self.max_retries - 1:
                    wait_time = self.retry_base_delay * (2 ** attempt)
                    time.sleep(wait_time)
                else:
                    raise

    def _extract_severity(self, content: str) -> Severity:
        """Extract overall severity from section analysis content.

        Args:
            content: LLM response content.

        Returns:
            Extracted Severity level.
        """
        content_lower = content.lower()

        # Look for status line
        if '**status**: critical' in content_lower or '🔴' in content:
            return Severity.CRITICAL
        elif '**status**: warning' in content_lower or '🟠' in content:
            return Severity.WARNING
        elif '**status**: advisory' in content_lower or '🟡' in content:
            return Severity.ADVISORY
        elif '**status**: good' in content_lower or '🟢' in content:
            return Severity.GOOD

        return Severity.INFO
