{### SQL to update exclusion constraint object ###}
{% if data %}
{# ==== To update exclusion constraint name ==== #}
{% if data.name != o_data.name %}
ALTER TABLE IF EXISTS {{ conn|qtIdent(data.schema, data.table) }}
    RENAME CONSTRAINT {{ conn|qtIdent(o_data.name) }} TO {{ conn|qtIdent(data.name) }};
{% endif %}
{# ==== To update exclusion constraint tablespace ==== #}
{% if data.spcname and data.spcname != o_data.spcname %}
ALTER INDEX IF EXISTS {{ conn|qtIdent(data.schema, data.name) }}
    SET TABLESPACE {{ conn|qtIdent(data.spcname) }};
{% endif %}
{% if data.fillfactor and data.fillfactor != o_data.fillfactor %}
ALTER INDEX IF EXISTS {{ conn|qtIdent(data.schema, data.name) }}
    SET (FILLFACTOR={{ data.fillfactor }});
{% endif %}
{% if data.fillfactor == "" and data.fillfactor != o_data.fillfactor %}
ALTER INDEX IF EXISTS {{ conn|qtIdent(data.schema, data.name) }}
    RESET (FILLFACTOR);
{% endif %}
{# ==== To update exclusion constraint comments ==== #}
{% if data.comment is defined and data.comment != o_data.comment %}
COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{ data.comment|qtLiteral(conn) }};
{% endif %}
{% endif %}
