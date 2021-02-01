SELECT oid, subname AS name FROM pg_subscription WHERE subname = '{{ subname }}';
