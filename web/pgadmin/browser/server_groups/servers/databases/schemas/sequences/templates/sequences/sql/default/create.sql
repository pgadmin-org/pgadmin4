CREATE SEQUENCE {{ conn|qtIdent(data.schema, data.name) }}{% if data.increment is defined and data.cycled %}

    CYCLE{% endif %}{% if data.increment is defined and data.increment|int(-1) > -1 %}

    INCREMENT {{data.increment|int}}{% endif %}{% if data.start is defined and data.start|int(-1) > -1%}

    START {{data.start|int}}{% elif data.current_value is defined and data.current_value|int(-1) > -1%}

    START {{data.current_value|int}}{% endif %}{% if data.minimum is defined and data.minimum|int(-1) > -1%}

    MINVALUE {{data.minimum|int}}{% endif %}{% if data.maximum is defined and data.maximum|int(-1) > -1%}

    MAXVALUE {{data.maximum|int}}{% endif %}{% if data.cache is defined and data.cache|int(-1) > -1%}

    CACHE {{data.cache|int}}{% endif %};

