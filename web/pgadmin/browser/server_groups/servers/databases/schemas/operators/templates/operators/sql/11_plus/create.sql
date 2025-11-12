{% if data %}
CREATE OPERATOR {{data.schema}}.{{data.name}} (
    FUNCTION = {{data.operproc}}{% if data.lefttype %},
    LEFTARG = {{data.lefttype}}{% endif %}{% if data.righttype %},
    RIGHTARG = {{data.righttype}}{% endif %}{% if data.commutator %},
    COMMUTATOR = {{data.commutator}}{% endif %}{% if data.negator %},
    NEGATOR = {{data.negator}}{% endif %}{% if data.restrproc %},
    RESTRICT = {{data.restrproc}}{% endif %}{% if data.joinproc %},
    JOIN = {{data.joinproc}}{% endif %}{% if data.support_hash %},
    HASHES{% endif %}{% if data.support_merge %}, MERGES{% endif %}

);
{% endif %}
