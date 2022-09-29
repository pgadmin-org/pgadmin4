{% import 'sql/macros/utils.macros' as UTILS %}
EXPLAIN ({% if format -%}
  FORMAT {{ format.upper() }}
{%- endif %}{% if analyze is defined -%}
  , ANALYZE {{ UTILS.BOOL_TEXT(analyze) }}
{%- endif %}{% if verbose is defined -%}
  , VERBOSE {{ UTILS.BOOL_TEXT(verbose) }}
{%- endif %}{% if costs is defined -%}
  , COSTS {{ UTILS.BOOL_TEXT(costs) }}
{%- endif %}{% if timing is defined -%}
  , TIMING {{ UTILS.BOOL_TEXT(timing) }}
{%- endif %}{% if buffers is defined -%}
  , BUFFERS {{ UTILS.BOOL_TEXT(buffers) }}
{%- endif %}{% if summary is defined -%}
  , SUMMARY {{ UTILS.BOOL_TEXT(summary) }}
{%- endif %}) {{ sql }}
