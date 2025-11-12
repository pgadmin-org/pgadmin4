{% if data.copy_data is defined or data.create_slot is defined or data.slot_name is defined or data.sync is defined %}
{% set add_semicolon_after_enabled = 'enabled' %}
{% endif %}
{% if data.create_slot is defined or data.slot_name is defined %}
{% set add_semicolon_after_copy_data = 'copy_data' %}
{% endif %}
{% if data.slot_name is defined or data.sync is defined %}
{% set add_semicolon_after_create_slot = 'create_slot' %}
{% endif %}
{% if data.sync is defined %}
{% set add_semicolon_after_slot_name = 'slot_name' %}
{% endif %}

CREATE SUBSCRIPTION {{ conn|qtIdent(data.name) }}
{% if data.host or data.port or data.username or data.password  or data.db or data.connect_timeout or data.passfile or data.sslmode or data.sslcompression or data.sslcert or data.sslkey or data.sslrootcert or data.sslcrl%}
    CONNECTION '{% if data.host %}host={{data.host}}{% endif %}{% if data.port %} port={{ data.port }}{% endif %}{% if data.username %} user={{ data.username }}{% endif %}{% if data.db %} dbname={{ data.db }}{% endif %}{% if data.connect_timeout %} connect_timeout={{ data.connect_timeout }}{% endif %}{% if data.passfile %} passfile={{ data.passfile }}{% endif %}{% if data.password %} {% if dummy %}password=xxxxxx{% else %}password={{ data.password}}{% endif %}{% endif %}{% if data.sslmode %} sslmode={{ data.sslmode }}{% endif %}{% if data.sslcompression %} sslcompression={{ data.sslcompression }}{% endif %}{% if data.sslcert %} sslcert={{ data.sslcert }}{% endif %}{% if data.sslkey %} sslkey={{ data.sslkey }}{% endif %}{% if data.sslrootcert %} sslrootcert={{ data.sslrootcert }}{% endif %}{% if data.sslcrl %} sslcrl={{ data.sslcrl }}{% endif %}'
{% endif %}
{% if data.pub %}
    PUBLICATION {% for pub in data.pub %}{% if loop.index != 1 %},{% endif %}{{ conn|qtIdent(pub) }}{% endfor %}
{% endif %}

    WITH ({% if data.connect is defined %}connect = {{ data.connect|lower}}, {% endif %}enabled = {{ data.enabled|lower}}, {% if data.copy_data is defined %}copy_data = {{ data.copy_data|lower}}{% if add_semicolon_after_copy_data == 'copy_data' %}, {% endif %}{% endif %}
{% if data.create_slot is defined %}create_slot = {{ data.create_slot|lower }}{% if add_semicolon_after_create_slot == 'create_slot' %}, {% endif %}{% endif %}
{% if data.slot_name is defined  and data.slot_name != ''%}slot_name = {{ data.slot_name }}{% if add_semicolon_after_slot_name == 'slot_name' %}, {% endif %}{% endif %}{% if data.sync %}synchronous_commit = '{{ data.sync }}', {% endif %}binary = {{ data.binary|lower}}, streaming = '{{ data.streaming}}');
