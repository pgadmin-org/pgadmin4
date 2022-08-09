{% if data %}
CREATE DATABASE {{ conn|qtIdent(data.name) }}
{% if data.datowner %}
    WITH{% endif %}{% if data.datowner %}

    OWNER = {{ conn|qtIdent(data.datowner) }}{% endif %}{% if data.template %}

    TEMPLATE = {{ conn|qtIdent(data.template) }}{% endif %}{% if data.encoding %}

    ENCODING = {{ data.encoding|qtLiteral }}{% endif %}{% if data.datcollate %}

    LC_COLLATE = {{ data.datcollate|qtLiteral }}{% endif %}{% if data.datctype %}

    LC_CTYPE = {{ data.datctype|qtLiteral }}{% endif %}{% if data.spcname %}

    TABLESPACE = {{ conn|qtIdent(data.spcname) }}{% endif %}{% if data.datconnlimit %}

    CONNECTION LIMIT = {{ data.datconnlimit }}{% endif %}

    IS_TEMPLATE = {{ data.is_template }};
{% endif %}
