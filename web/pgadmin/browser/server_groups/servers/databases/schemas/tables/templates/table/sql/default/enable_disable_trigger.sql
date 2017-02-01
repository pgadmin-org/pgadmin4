ALTER TABLE {{ conn|qtIdent(data.schema, data.name) }}
    {% if is_enable_trigger == True %}ENABLE{% else %}DISABLE{% endif %} TRIGGER ALL;