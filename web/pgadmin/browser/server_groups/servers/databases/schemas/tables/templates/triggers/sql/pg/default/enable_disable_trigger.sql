{% set enable_map = {'R':'ENABLE REPLICA', 'A':'ENABLE ALWAYS', 'O':'ENABLE', 'D':'DISABLE'} %}
ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }}
    {{ enable_map[data.is_enable_trigger] }} TRIGGER {{ conn|qtIdent(data.name) }};
