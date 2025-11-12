{% if data %}
CREATE AGGREGATE {{conn|qtIdent(data.schema, data.name)}}({% if data.input_types %}{{data.input_types}}{% endif %}) (
    SFUNC = {{data.state_func}},
    STYPE = {{data.state_type}} {% if data.state_data_size %},
    SSPACE =  {{data.state_data_size}}{% endif %}{% if data.final_func %},
    FINALFUNC = {{data.final_func}}{% endif %}{% if data.final_extra_param %},
    FINALFUNC_EXTRA{% endif %}{% if data.final_func_modify %},
    FINALFUNC_MODIFY = {{data.final_func_modify}}{% endif %}{% if data.combine_func %},
    COMBINEFUNC = {{data.combine_func}}{% endif %}{% if data.serialization_func %},
    SERIALFUNC = {{data.serialization_func}}{% endif %}{% if data.deserialization_func %},
    DESERIALFUNC = {{data.deserialization_func}}{% endif %}{% if data.initial_val %},
    INITCOND = '{{data.initial_val}}'{% endif %}{% if data.moving_state_func %},
    MSFUNC = {{data.moving_state_func}}{% endif %}{% if data.moving_inverse_func %},
    MINVFUNC = {{data.moving_inverse_func}}{% endif %}{% if data.moving_state_type %},
    MSTYPE = {{data.moving_state_type}}{% endif %}{% if data.moving_state_data_size %},
    MSSPACE = {{data.moving_state_data_size}}{% endif %}{% if data.moving_final_func %},
    MFINALFUNC = {{data.moving_final_func}}{% endif %}{% if data.moving_final_extra_param %},
    MFINALFUNC_EXTRA{% endif %}{% if data.moving_final_func_modify %},
    MFINALFUNC_MODIFY = {{data.moving_final_func_modify}}{% endif %}{% if data.moving_initial_val %},
    MINITCOND = '{{data.moving_initial_val}}'{% endif %}{% if data.sort_oper %},
    SORTOP = {{data.sort_oper}}{% endif %}

);
{% endif %}
