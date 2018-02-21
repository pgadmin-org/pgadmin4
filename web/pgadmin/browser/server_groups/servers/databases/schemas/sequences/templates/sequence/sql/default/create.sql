CREATE SEQUENCE {{ conn|qtIdent(data.schema, data.name) }}{% if data.increment is defined and data.cycled %}

    CYCLE{% endif %}{% if data.increment is defined and data.increment is number %}

    INCREMENT {{data.increment}}{% endif %}{% if data.start is defined and data.start is number %}

    START {{data.start}}{% elif data.current_value is defined and data.current_value is number %}

    START {{data.current_value}}{% endif %}{% if data.minimum is defined and data.minimum is number %}

    MINVALUE {{data.minimum}}{% endif %}{% if data.maximum is defined and data.maximum is number %}

    MAXVALUE {{data.maximum}}{% endif %}{% if data.cache is defined and data.cache is number %}

    CACHE {{data.cache}}{% endif %};

