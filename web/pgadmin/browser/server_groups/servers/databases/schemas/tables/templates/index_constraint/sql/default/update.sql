{### SQL to update constraint object ###}
{% if data %}
{# ==== To update constraint name ==== #}
{% if data.name and data.name != o_data.name %}
ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }}
    RENAME CONSTRAINT {{ conn|qtIdent(o_data.name) }} TO {{ conn|qtIdent(data.name) }};
{% endif %}
{# ==== To update constraint tablespace ==== #}
{% if data.spcname and data.spcname != o_data.spcname %}
ALTER INDEX {{ conn|qtIdent(data.schema, data.name) }}
    SET TABLESPACE {{ conn|qtIdent(data.spcname) }};
{% endif %}
{% if data.fillfactor and data.fillfactor != o_data.fillfactor %}
ALTER INDEX {{ conn|qtIdent(data.schema, data.name) }}
    SET (FILLFACTOR={{ data.fillfactor }});
{% elif data.fillfactor is defined and data.fillfactor == '' %}
ALTER INDEX {{ conn|qtIdent(data.schema, data.name) }}
    RESET (FILLFACTOR);
{% endif %}
{# ==== To update constraint comments ==== #}
{% if data.comment is defined and data.comment != o_data.comment %}
COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{ data.comment|qtLiteral(conn) }};
{% endif %}
{% endif %}
