{# Change database server password #}
ALTER USER {{conn|qtIdent(user)}} WITH ENCRYPTED PASSWORD {{encrypted_password|qtLiteral(conn)}};
