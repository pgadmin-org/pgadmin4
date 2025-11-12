#!/usr/bin/env python3
# -*- coding: utf-8 -*-

##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""
Parses a pgAdmin release note file in ReStructuredText (RST) format
and converts it into Email (HTML), Markdown, and HTML (web) formats.
Issue links are always omitted from lists in all outputs.
Allows skipping specific issue numbers via command line.
The Email HTML output can optionally be saved to a file.

Usage:
  python release_converter.py <input_rst_file_path> \\
                              [--output-email-html <output_path.html>] \\
                              [--skip-issues ISSUE_NUM [ISSUE_NUM ...]]

Examples:
  # Default: No issue links, don't skip issues, print all to console
  python release_converter.py path/to/notes.rst

  # Skip issues 8602 and 8603
  python release_converter.py path/to/notes.rst --skip-issues 8602 8603

  # Save email output, default skip behavior
  python release_converter.py path/to/notes.rst --output-email-html email.html
"""

import argparse
import html
import re
import sys


# --- PARSING FUNCTION (parse_rst_release_note) ---


def parse_rst_release_note(rst_text):
    """Parses the RST release note text to extract key information."""
    data = {
        'version': None,
        'release_date': None,
        'features': [],
        'bug_fixes': [],
        'housekeeping': []
    }

    version_match = re.search(r'Version\s+([^\n\*]+)', rst_text)
    if version_match:
        data['version'] = version_match.group(1).strip()
    else:
        print("Warning: Could not parse version.", file=sys.stderr)

    date_match = re.search(r'Release date:\s*(\d{4}-\d{2}-\d{2})', rst_text)
    if date_match:
        data['release_date'] = date_match.group(1).strip()
    else:
        print("Warning: Could not parse release date.", file=sys.stderr)

    current_section_list = None
    lines = rst_text.splitlines()

    for i, line_raw in enumerate(lines):
        line_stripped = line_raw.strip()
        if i > 0:
            prev_line_stripped = lines[i - 1].strip()
            # Check if the previous line looks like an RST section underline
            if len(prev_line_stripped) > 3 and \
               all(c == '*' for c in prev_line_stripped):
                if i > 1:
                    # Header text is two lines above the current line
                    header_text_line = lines[i - 2].strip().lower()
                    if "new features" in header_text_line:
                        current_section_list = data['features']
                    elif "bug fixes" in header_text_line:
                        current_section_list = data['bug_fixes']
                    elif "housekeeping" in header_text_line:
                        current_section_list = data['housekeeping']
                    else:
                        # Not a section we track, keep previous section active
                        pass
                # Skip the (usually blank) line after the underline
                continue

        # Parse items only if we are within a known section
        if current_section_list is not None and line_stripped.startswith('|'):
            line_to_parse = line_stripped
            # Try matching the standard 'Issue #' format
            item_match = re.match(
                r'\|\s*`Issue\s+#(\d+)\s+<([^>]+)>`_\s*-\s*(.*)',
                line_to_parse
            )
            if item_match:
                issue_num, url, description = item_match.groups()
                item_data = {
                    'issue': issue_num.strip(),
                    'url': url.strip(),
                    'description': description.strip().rstrip('.')
                }
                current_section_list.append(item_data)
            else:
                # Fallback for items starting with '|' but without Issue link
                simple_match = re.match(r'\|\s*(.*)', line_to_parse)
                simple_text = (simple_match.group(1).strip().rstrip('.')
                               if simple_match else None)
                if simple_text:
                    item_data = {
                        'issue': None,
                        'url': None,
                        'description': simple_text
                    }
                    current_section_list.append(item_data)

    # Combine bug fixes and housekeeping for unified output sections
    data['bugs_housekeeping'] = data['bug_fixes'] + data['housekeeping']

    # Add warnings if sections seem empty after parsing
    if not data['features']:
        print("Warning: No 'New features' items parsed.", file=sys.stderr)
    if not data['bugs_housekeeping']:
        print("Warning: No 'Bug fixes' or 'Housekeeping' items parsed.",
              file=sys.stderr)

    return data


# --- Helper for Plurals ---


def pluralize(count, singular, plural=None):
    """Adds 's' for pluralization if count is not 1."""
    if count == 1:
        return f"{count} {singular}"
    else:
        plural_form = plural if plural else singular + 's'
        return f"{count} {plural_form}"


# --- Formatting Functions ---


def format_email_html(data, skip_issues_set=None):
    """Formats the extracted data into HTML suitable for email."""
    if skip_issues_set is None:
        skip_issues_set = set()
    if not data.get('version'):
        return "<p>Error: Version not found in parsed data.</p>"

    version = data['version']
    release_url = (
        f"https://www.pgadmin.org/docs/pgadmin4/{version}/"
        f"release_notes_{version.replace('.', '_')}.html"
    )
    download_url = "https://www.pgadmin.org/download/"
    website_url = "https://www.pgadmin.org/"

    # Filter lists first based on skip_issues_set
    filtered_features = [
        item for item in data.get('features', [])
        if item.get('issue') not in skip_issues_set
    ]
    filtered_bugs = [
        item for item in data.get('bugs_housekeeping', [])
        if item.get('issue') not in skip_issues_set
    ]
    num_features = len(filtered_features)
    num_bugs_housekeeping = len(filtered_bugs)

    # Build HTML output
    output = """<style>
    * {
        font-size: 14px;
        font-family: sans-serif;
    }
    li {
        margin-bottom: 4px;
    }
    </style>"""
    output += (
        f"<p>The pgAdmin Development Team is pleased to announce "
        f"pgAdmin 4 version {version}.</p>\n"
    )
    output += (
        f"<p>This release of pgAdmin 4 includes "
        f"{pluralize(num_features, 'new feature')} and "
        f"{pluralize(num_bugs_housekeeping, 'bug fix', 'bug fixes')}/"
        f"housekeeping change"
        f"{'s' if num_bugs_housekeeping != 1 else ''}. "
    )
    output += (
        f'For more details please see the release notes at:'
        f'<p>&nbsp;&nbsp;&nbsp;&nbsp;'
        f'<a href="{release_url}">{release_url}</a></p>\n'
    )
    output += (
        '<p>pgAdmin is the leading Open Source graphical management '
        'tool for PostgreSQL. For more information, please see</p>\n'
    )
    # Note: Removed '&#9;' (HTML tab) as it's non-standard; use CSS if needed
    output += f'<p><a href="{website_url}">{website_url}</a></p>\n'
    output += "<p>Notable changes in this release include:</p>\n"

    # Add features section only if items remain after filtering
    if filtered_features:
        output += "<p><strong>Features:</strong></p>\n<ul>\n"
        for item in filtered_features:
            desc = html.escape(item.get('description', 'N/A').strip())
            output += f"    <li>{desc}.</li>\n"
        output += "</ul>\n"

    # Add bugs section only if items remain after filtering
    if filtered_bugs:
        # Note: Heading was "Bugs/Housekeeping" in pasted code,
        # changed to "Bug fixes" to match GDoc style mentioned earlier
        output += "<p><strong>Bug fixes:</strong></p>\n<ul>\n"
        for item in filtered_bugs:
            desc = html.escape(item.get('description', 'N/A').strip())
            output += f"    <li>{desc}.</li>\n"
        output += "</ul>\n"

    output += (
        "<p>Builds for Windows and macOS are available now, along with "
        "a Python Wheel,<br>"
    )
    output += (
        "Docker Container, RPM, DEB Package, and source code tarball from:<br>"
    )
    output += (f'&nbsp;&nbsp;&nbsp;&nbsp;'
               f'<a href="{download_url}">{download_url}</a></p>\n')

    return output


def format_markdown(data, skip_issues_set=None):
    """Formats the extracted data into Markdown (no issue links in lists)."""
    if skip_issues_set is None:
        skip_issues_set = set()
    if not data.get('version'):
        return "Error: Version not found in parsed data."

    version = data['version']
    release_url = (
        f"https://www.pgadmin.org/docs/pgadmin4/{version}/"
        f"release_notes_{version.replace('.', '_')}.html"
    )
    download_url = "https://www.pgadmin.org/download/"
    website_url = "https://www.pgadmin.org/"

    filtered_features = [
        item for item in data.get('features', [])
        if item.get('issue') not in skip_issues_set
    ]
    filtered_bugs = [
        item for item in data.get('bugs_housekeeping', [])
        if item.get('issue') not in skip_issues_set
    ]
    num_features = len(filtered_features)
    num_bugs_housekeeping = len(filtered_bugs)

    output = (
        f"The pgAdmin Development Team is pleased to announce "
        f"pgAdmin 4 version {version}. "
    )
    output += (
        f"This release of pgAdmin 4 includes "
        f"{pluralize(num_features, 'new feature')} and "
        f"{pluralize(num_bugs_housekeeping, 'bug fix', 'bug fixes')}/"
        f"housekeeping change"
        f"{'s' if num_bugs_housekeeping != 1 else ''}. "
    )
    output += (f"For more details, "
               f"please see the [release notes]({release_url}).")
    # Ensure markdown paragraph break
    output += "\n \n"
    output += (
        f"pgAdmin is the leading Open Source graphical management "
        f"tool for PostgreSQL. For more information, please see "
        f"[the website]({website_url})."
    )
    output += "\n\n"
    output += "Notable changes in this release include:\n \n"

    if filtered_features:
        output += "### Features:\n"
        for item in filtered_features:
            desc = item.get('description', 'N/A').strip()
            output += f"* {desc}.\n"  # Link logic removed
        output += "\n"

    if filtered_bugs:
        output += "### Bugs/Housekeeping:\n"
        for item in filtered_bugs:
            desc = item.get('description', 'N/A').strip()
            output += f"* {desc}.\n"  # Link logic removed
        output += "\n"

    output += (
        f"Builds for Windows and macOS are available now, along with "
        f"a Python Wheel, Docker Container, RPM, DEB Package, and "
        f"source code tarball from the [download area]({download_url})."
    )

    return output


def format_html(data, skip_issues_set=None):
    """Formats extracted data into HTML for web news articles."""
    if skip_issues_set is None:
        skip_issues_set = set()
    # Removed local import html, using global one

    if not data.get('version'):
        return "<p>Error: Version not found in parsed data.</p>"

    version = data['version']
    # Use relative paths for web article links
    release_url = (
        f"/docs/pgadmin4/{version}/"
        f"release_notes_{version.replace('.', '_')}.html"
    )
    download_url = "/download"

    filtered_features = [
        item for item in data.get('features', [])
        if item.get('issue') not in skip_issues_set
    ]
    filtered_bugs = [
        item for item in data.get('bugs_housekeeping', [])
        if item.get('issue') not in skip_issues_set
    ]
    num_features = len(filtered_features)
    num_bugs_housekeeping = len(filtered_bugs)

    output = (
        f"<p>The pgAdmin Development Team is pleased to announce "
        f"pgAdmin 4 version {version}. "
    )
    output += (
        f"This release of pgAdmin 4 includes "
        f"{pluralize(num_features, 'new feature')} and "
        f"{pluralize(num_bugs_housekeeping, 'bug fix', 'bug fixes')}/"
        f"housekeeping change"
        f"{'s' if num_bugs_housekeeping != 1 else ''}. "
    )
    output += (
        f'For more details, please see the '
        f'<a href="{release_url}">release notes</a>.</p>\n'
    )
    output += "<p>Notable changes in this release include:</p>\n"

    if filtered_features:
        output += "<p><strong>Features:</strong></p>\n<ul>\n"
        for item in filtered_features:
            desc = html.escape(item.get('description', 'N/A').strip())
            # Link logic removed, keep bolding for features in news format
            output += f"    <li><strong>{desc}.</strong></li>\n"
        output += "</ul>\n"

    if filtered_bugs:
        output += "<p><strong>Bugs/Housekeeping:</strong></p>\n<ul>\n"
        for item in filtered_bugs:
            desc = html.escape(item.get('description', 'N/A').strip())
            # Link logic removed, no bolding for bugs in news format
            output += f"    <li>{desc}.</li>\n"
        output += "</ul>\n"

    output += f'<p><a href="{download_url}">Download</a> your copy now!</p>'

    return output


# --- Main Execution ---
if __name__ == "__main__":
    # --- Setup Argument Parser ---
    parser = argparse.ArgumentParser(
        description=(
            "Converts pgAdmin RST release notes to Email (HTML), Markdown, "
            "and HTML (web) formats.\nIssue links are omitted from lists. "
            "Allows skipping specific issues."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  # Default: Don't skip issues\n"
            "  python release_converter.py path/to/notes.rst\n\n"
            "  # Skip issues 8602 and 8603\n"
            "  python release_converter.py path/to/notes.rst "
            "--skip-issues 8602 8603\n\n"
            "  # Save email output, default skip behavior\n"
            "  python release_converter.py path/to/notes.rst "
            "--output-email-html email.html"
        )
    )
    parser.add_argument(
        "input_file",
        metavar="<input_rst_file_path>",
        type=str,
        help="Path to the input ReStructuredText (.rst) release note file."
    )
    parser.add_argument(
        "--output-email-html",
        metavar="<email_output_path.html>",
        type=str,
        default=None,  # Use None as default for optional args
        help="Optional path to save the Email HTML output to a file."
    )
    parser.add_argument(
        "--skip-issues",
        metavar="ISSUE_NUM",
        type=str,
        nargs='+',  # Expect 1 or more arguments
        default=None,  # Default to None if not provided
        help="List of issue numbers (e.g., 8602 8603) to skip from lists."
    )
    args = parser.parse_args()

    # --- Read Input File ---
    input_rst_content = ""
    try:
        with open(args.input_file, "r", encoding="utf-8") as f:
            input_rst_content = f.read()
        print(f"Successfully read file: {args.input_file}", file=sys.stderr)
    except FileNotFoundError:
        print(f"Error: Input file not found at '{args.input_file}'",
              file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file '{args.input_file}': {e}", file=sys.stderr)
        sys.exit(1)

    # --- Parse the input data ---
    print("Parsing release notes...", file=sys.stderr)
    parsed_data = parse_rst_release_note(input_rst_content)

    if not parsed_data.get('version'):
        print("\nError: Parsing failed to find version. Cannot proceed.",
              file=sys.stderr)
        sys.exit(1)

    # --- Create skip set ---
    # Handle default=None for skip_issues
    skip_issues_set = set(args.skip_issues) if args.skip_issues else set()
    if skip_issues_set:
        print(f"Attempting to skip issues: "
              f"{', '.join(sorted(list(skip_issues_set)))}", file=sys.stderr)

    # --- Generate the different formats ---
    print("Generating output formats...", file=sys.stderr)
    email_html_output = format_email_html(
        parsed_data, skip_issues_set=skip_issues_set
    )
    markdown_output = format_markdown(
        parsed_data, skip_issues_set=skip_issues_set
    )
    news_html_output = format_html(
        parsed_data, skip_issues_set=skip_issues_set
    )
    print("Format generation complete.", file=sys.stderr)

    # --- Handle Outputs ---
    if args.output_email_html:
        try:
            output_filename = args.output_email_html
            # Recommend .html extension, but allow user override
            if not output_filename.lower().endswith(('.html', '.htm')):
                print(f"Warning: Output file '{output_filename}' does not end "
                      f"with .html or .htm. The content is HTML.",
                      file=sys.stderr)

            with open(output_filename, "w", encoding="utf-8") as f:
                f.write(email_html_output)
            print(f"Email HTML output successfully "
                  f"saved to: {output_filename}",
                  file=sys.stderr)
        except Exception as e:
            print(f"Error writing Email HTML output to file "
                  f"'{args.output_email_html}': {e}", file=sys.stderr)
            # Print to console as fallback if write fails
            print("\n--- Email HTML Output ---")
            print(email_html_output)
            print("\n---------------------------------\n")
    else:
        # Default: Print email HTML to console
        print("\n--- Email HTML Output ---")
        print(email_html_output)
        print("\n---------------------------------\n")

    # --- Output Other Formats (always to console) ---
    print("--- Markdown Output ---")
    print(markdown_output)
    print("\n---------------------------------\n")

    print("--- News Article HTML Output ---")
    print(news_html_output)
    print("\n---------------------------------\n")

    print("Script finished.", file=sys.stderr)
