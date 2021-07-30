DROP POLICY IF EXISTS {{ conn|qtIdent(policy_name) }} ON {{conn|qtIdent(result.schema, result.table)}};
