{% if data %}
CREATE SEQUENCE {{ conn|qtIdent(data.schema) }}.{{ conn|qtIdent(data.name) }}
{% if data.cycled and data.cycled == True %}
    CYCLE
{% endif %}
{% if data.increment is defined %}
    INCREMENT {{data.increment}}
{% endif %}{% if data.start is defined %}
    START {{data.start}}
{% elif data.current_value is defined %}
    START {{data.current_value}}
{% endif %}{% if data.minimum is defined %}
    MINVALUE {{data.minimum}}
{% endif %}{% if data.maximum is defined %}
    MAXVALUE {{data.maximum}}
{% endif %}{% if data.cache is defined %}
    CACHE {{data.cache}}{% endif %};
{% endif %}
