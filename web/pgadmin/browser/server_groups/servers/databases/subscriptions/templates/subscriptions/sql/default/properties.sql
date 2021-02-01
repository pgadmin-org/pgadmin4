SELECT  sub.oid AS oid,
        subname AS name,
        subpublications AS pub,
        sub.subsynccommit AS sync,
        subpublications AS cur_pub,
        pga.rolname AS subowner,
        subslotname AS slot_name,
        subenabled AS enabled,
		SPLIT_PART(SPLIT_PART(subconninfo,' port',1), '=',2) AS host,
		SPLIT_PART(SPLIT_PART(subconninfo,'port=',2), ' ',1) AS port,
		SPLIT_PART(SPLIT_PART(subconninfo,'user=',2), ' ',1) AS username,
		SPLIT_PART(SPLIT_PART(subconninfo,'dbname=',2), ' ',1) AS db,
		SPLIT_PART(SPLIT_PART(subconninfo,'connect_timeout=',2), ' ',1) AS connect_timeout,
		SPLIT_PART(SPLIT_PART(subconninfo,'passfile=',2), ' ',1) AS passfile
FROM pg_subscription sub JOIN pg_authid pga ON sub.subowner= pga.oid
WHERE
{% if subid %}
    sub.oid = {{ subid }};
{% else %}
    sub.subdbid = {{ did }};
{% endif %}
