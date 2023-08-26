{% if data.sync is defined %}
{% set add_comma_after_slot_name = 'slot_name' %}
{% endif %}
{% if data.binary is defined or data.streaming is defined or data.disable_on_error is defined or data.run_as_owner is defined or data.password_required is defined or data.origin is defined %}
{% set add_comma_after_sync = 'sync' %}
{% endif %}
{% if data.streaming is defined or data.disable_on_error is defined or data.run_as_owner is defined or data.password_required is defined or data.origin is defined %}
{% set add_comma_after_binary = 'binary' %}
{% endif %}
{% if data.disable_on_error is defined or data.run_as_owner is defined or data.password_required is defined or data.origin is defined %}
{% set add_comma_after_streaming = 'streaming' %}
{% endif %}
{% if data.run_as_owner is defined or data.password_required is defined or data.origin is defined %}
{% set add_comma_after_disable_on_error = 'disable_on_error' %}
{% endif %}
{% if data.password_required is defined or data.origin is defined %}
{% set add_comma_after_run_as_owner = 'run_as_owner' %}
{% endif %}
{% if data.origin is defined %}
{% set add_comma_after_password_required = 'password_required' %}
{% endif %}
{#####################################################}
{## Change owner of subscription ##}
{#####################################################}
{% if data.subowner and data.subowner != o_data.subowner %}
ALTER SUBSCRIPTION {{ conn|qtIdent(o_data.name) }}
    OWNER TO {{ data.subowner }};

{% endif %}
{###  Disable subscription ###}
{% if data.enabled is defined and data.enabled != o_data.enabled %}
{% if not data.enabled %}
ALTER SUBSCRIPTION {{ conn|qtIdent(o_data.name) }} DISABLE;
{% endif %}

{% endif %}
{###  Alter parameters of subscription ###}
{% if (data.slot_name is defined and data.slot_name != o_data.slot_name) or (data.sync is defined and data.sync != o_data.sync) or (data.binary is defined and data.binary!=o_data.binary) or (data.streaming is defined and data.streaming!=o_data.streaming) or (data.disable_on_error is defined and data.disable_on_error!=o_data.disable_on_error) or (data.run_as_owner is defined and data.run_as_owner!=o_data.run_as_owner) or (data.password_required is defined and data.password_required!=o_data.password_required) or (data.origin is defined and data.origin!=o_data.origin)  %}
ALTER SUBSCRIPTION {{ conn|qtIdent(o_data.name) }}
    SET ({% if data.slot_name is defined and data.slot_name != o_data.slot_name %}slot_name = {{ data.slot_name }}{% if add_comma_after_slot_name == 'slot_name' %}, {% endif %}{% endif %}{% if data.sync is defined and data.sync != o_data.sync %}synchronous_commit = '{{ data.sync }}'{% if add_comma_after_sync == 'sync' %}, {% endif %}{% endif %}{% if data.binary is defined and data.binary!=o_data.binary %}binary = {{ data.binary|lower}}{% if add_comma_after_binary == 'binary' %}, {% endif %}{% endif %}{% if data.streaming is defined and data.streaming!=o_data.streaming %}streaming = '{{ data.streaming }}'{% if add_comma_after_streaming == 'streaming' %}, {% endif %}{% endif %}{% if data.disable_on_error is defined and data.disable_on_error!=o_data.disable_on_error %}disable_on_error = {{ data.disable_on_error|lower}}{% if add_comma_after_disable_on_error == 'disable_on_error' %}, {% endif %}{% endif %}{% if data.run_as_owner is defined and data.run_as_owner!=o_data.run_as_owner %}run_as_owner = {{ data.run_as_owner|lower}}{% if add_comma_after_run_as_owner == 'run_as_owner' %}, {% endif %}{% endif %}{% if data.password_required is defined and data.password_required!=o_data.password_required %}password_required = {{ data.password_required|lower}}{% if add_comma_after_password_required == 'password_required' %}, {% endif %}{% endif %}{% if data.origin is defined and data.origin!=o_data.origin %}origin = '{{ data.origin }}'{% endif %});

{% endif %}
{###  Enable subscription ###}
{% if data.enabled is defined and data.enabled != o_data.enabled %}
{% if data.enabled %}
ALTER SUBSCRIPTION {{ conn|qtIdent(o_data.name) }} ENABLE;
{% endif %}

{% endif %}
{###  Refresh publication ###}
{% if data.refresh_pub %}
ALTER SUBSCRIPTION {{ conn|qtIdent(o_data.name) }}
    REFRESH PUBLICATION{% if not data.copy_data_after_refresh %} WITH (copy_data = false){% else %} WITH (copy_data = true){% endif %};

{% endif %}
{###  Alter publication of subscription ###}
{% if data.pub%}
{% if data.pub and not data.refresh_pub and not data.enabled %}
ALTER SUBSCRIPTION {{ conn|qtIdent(o_data.name) }}
    SET PUBLICATION {% for pub in data.pub %}{% if loop.index != 1 %},{% endif %}{{ conn|qtIdent(pub) }}{% endfor %} WITH (refresh = false);
{% else %}
ALTER SUBSCRIPTION {{ conn|qtIdent(o_data.name) }}
    SET PUBLICATION {% for pub in data.pub %}{% if loop.index != 1 %},{% endif %}{{ conn|qtIdent(pub) }}{% endfor %};
{% endif %}

{% endif %}
{###  Alter subscription connection info ###}
{% if data.host or data.port or data.username or data.db or data.connect_timeout or data.passfile or data.sslmode or data.sslcompression or data.sslcert or data.sslkey or data.sslrootcert or data.sslcrl %}
ALTER SUBSCRIPTION {{ conn|qtIdent(o_data.name) }}
    CONNECTION 'host={{ o_data.host}} port={{ o_data.port }} user={{ o_data.username }} dbname={{ o_data.db }} connect_timeout={{ o_data.connect_timeout }} {% if data.passfile %} passfile={{ o_data.passfile }}{% endif %} sslmode={{ o_data.sslmode }}{% if data.sslcompression %} sslcompression={{ data.sslcompression }}{% endif %}{% if data.sslcert %} sslcert={{ data.sslcert }}{% endif %}{% if data.sslkey %} sslkey={{ data.sslkey }}{% endif %}{% if data.sslrootcert %} sslrootcert={{ data.sslrootcert }}{% endif %}{% if data.sslcrl %} sslcrl={{ data.sslcrl }}{% endif %}';
{% endif %}
{###  Alter subscription name ###}
{% if data.name and data.name != o_data.name %}
ALTER SUBSCRIPTION {{ conn|qtIdent(o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
