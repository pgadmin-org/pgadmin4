EXPLAIN ({% if format -%}
  FORMAT {{ format.upper() }},
{%- endif %}{% if analyze is defined -%}
  ANALYZE {{ analyze }},
{%- endif %}{% if verbose is defined -%}
  VERBOSE {{ verbose }},
{%- endif %}{% if costs is defined -%}
  COSTS {{ costs }},
{%- endif %}{% if timing is defined -%}
  TIMING {{ timing }},
{%- endif %}{% if buffers is defined -%}
  BUFFERS {{ buffers }}
{%- endif %}) {{ sql }}
