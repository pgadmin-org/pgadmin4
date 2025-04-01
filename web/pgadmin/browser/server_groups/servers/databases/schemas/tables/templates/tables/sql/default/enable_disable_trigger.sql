{% set enable_map = {'O':'ENABLE', 'D':'DISABLE'} %}
ALTER TABLE {{ conn|qtIdent(data.schema, data.name) }}
    {{ enable_map[is_enable_trigger] }} TRIGGER ALL;
