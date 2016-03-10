{% if data %}
CREATE SEQUENCE {{ conn|qtIdent(data.schema) }}.{{ conn|qtIdent(data.name) }}
{% if data.cycled and data.cycled == True %}
    CYCLE
{% endif %}
{% if data.increment %}
    INCREMENT {{data.increment}}
{% endif %}{% if data.start %}
    START {{data.start}}
{% endif %}{% if data.minimum %}
    MINVALUE {{data.minimum}}
{% endif %}{% if data.maximum %}
    MAXVALUE {{data.maximum}}
{% endif %}{% if data.cache %}
    CACHE {{data.cache}}{% endif %};
{% endif %}