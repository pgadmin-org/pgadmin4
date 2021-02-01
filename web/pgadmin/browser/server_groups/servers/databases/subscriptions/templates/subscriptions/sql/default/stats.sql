SELECT
    subname AS {{ conn|qtIdent(_('Subscription name')) }},
    latest_end_time AS {{ conn|qtIdent(_('Latest end time')) }},
    latest_end_lsn AS {{ conn|qtIdent(_('Latest end lsn')) }},
    last_msg_receipt_time AS {{ conn|qtIdent(_('Last message receipt')) }},
    last_msg_send_time AS {{ conn|qtIdent(_('Last message send time'))}}
FROM pg_stat_subscription WHERE subid = {{ subid }};

