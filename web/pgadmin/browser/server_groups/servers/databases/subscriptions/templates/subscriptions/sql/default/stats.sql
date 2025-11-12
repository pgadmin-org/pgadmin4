SELECT
    stat.subname AS {{ conn|qtIdent(_('Subscription name')) }},
    stat.latest_end_time AS {{ conn|qtIdent(_('Latest end time')) }},
    stat.latest_end_lsn AS {{ conn|qtIdent(_('Latest end lsn')) }},
    stat.last_msg_receipt_time AS {{ conn|qtIdent(_('Last message receipt')) }},
    stat.last_msg_send_time AS {{ conn|qtIdent(_('Last message send time'))}}
FROM pg_catalog.pg_stat_subscription stat
LEFT JOIN pg_subscription sub ON sub.subname = stat.subname
{% if subid %}
    WHERE stat.subid = {{ subid }};
{% else %}
    WHERE sub.subdbid = {{ did }}
{% endif %}

