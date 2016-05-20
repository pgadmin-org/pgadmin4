SELECT conname as name,
    NOT convalidated as convalidated
FROM pg_constraint ct
WHERE contype = 'c'
AND  ct.oid = {{cid}}::oid