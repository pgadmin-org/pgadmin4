{% set enable_map = {'O':'ENABLE', 'D':'DISABLE'} %}
ALTER FOREIGN TABLE {{ conn|qtIdent(data.basensp, data.name) }}
    {{ enable_map[is_enable_trigger] }} TRIGGER ALL;
