ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }}
    {% if data.is_enable_trigger == True %}ENABLE{% else %}DISABLE{% endif %} TRIGGER {{ conn|qtIdent(data.name) }};