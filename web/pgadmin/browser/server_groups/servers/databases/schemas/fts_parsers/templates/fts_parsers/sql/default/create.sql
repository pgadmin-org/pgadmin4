{# CREATE FTS PARSER Statement #}
{% if data and data.schema and data.name and data.prsstart and data.prstoken and data.prsend and data.prslextype %}
CREATE TEXT SEARCH PARSER {{ conn|qtIdent(data.schema, data.name) }} (
    START = {{data.prsstart}},
    GETTOKEN = {{data.prstoken}},
    END = {{data.prsend}},
    LEXTYPES = {{data.prslextype}}{% if data.prsheadline and data.prsheadline != '-'%},
    HEADLINE = {{data.prsheadline}}{% endif %}
);

{# Description for FTS_PARSER #}
{% if data.description %}
COMMENT ON TEXT SEARCH PARSER {{ conn|qtIdent(data.schema, data.name) }}
      IS {{ data.description|qtLiteral(conn) }};
{% endif %}{% endif %}
