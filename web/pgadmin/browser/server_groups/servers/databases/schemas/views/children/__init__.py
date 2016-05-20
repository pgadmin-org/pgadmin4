"""
We will use the exisiting modules for creating children module under
materialize views.
"""
from pgadmin.browser.server_groups.servers.databases.schemas.tables.column \
  import blueprint as columns_module
from pgadmin.browser.server_groups.servers.databases.schemas.tables.indexes \
  import blueprint as indexes_modules
from pgadmin.browser.server_groups.servers.databases.schemas.tables.triggers \
  import blueprint as triggers_modules
from pgadmin.browser.server_groups.servers.databases.schemas.tables.rules \
  import blueprint as rules_modules
