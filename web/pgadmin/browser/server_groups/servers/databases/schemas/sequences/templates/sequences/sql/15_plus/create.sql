CREATE {% if data.relpersistence %}UNLOGGED {% endif %}SEQUENCE{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.schema, data.name) }}{% if data.cycled %}

    CYCLE{% endif %}{% if data.increment is defined %}

    INCREMENT {{data.increment|int}}{% endif %}{% if data.start is defined %}

    START {{data.start|int}}{% elif data.current_value is defined %}

    START {{data.current_value|int}}{% endif %}{% if data.minimum is defined %}

    MINVALUE {{data.minimum|int}}{% endif %}{% if data.maximum is defined %}

    MAXVALUE {{data.maximum|int}}{% endif %}{% if data.cache is defined and data.cache|int(-1) > -1%}

    CACHE {{data.cache|int}}{% endif %}{% if data.owned_table is defined and data.owned_table != None and data.owned_column is defined and data.owned_column != None %}

    OWNED BY {{ conn|qtIdent(data.owned_table) }}.{{ conn|qtIdent(data.owned_column) }}{% endif %};

