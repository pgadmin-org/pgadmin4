CREATE SEQUENCE {{ conn|qtIdent(data.schema, data.name) }}{% if data.increment is defined and data.cycled %}

    CYCLE{% endif %}{% if data.increment is defined %}

    INCREMENT {{data.increment|int}}{% endif %}{% if data.start is defined %}

    START {{data.start|int}}{% elif data.current_value is defined %}

    START {{data.current_value|int}}{% endif %}{% if data.minimum is defined %}

    MINVALUE {{data.minimum|int}}{% endif %}{% if data.maximum is defined %}

    MAXVALUE {{data.maximum|int}}{% endif %}{% if data.cache is defined and data.cache|int(-1) > -1%}

    CACHE {{data.cache|int}}{% endif %};

