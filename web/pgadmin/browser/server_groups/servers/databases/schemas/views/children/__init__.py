"""
We will use the exisiting modules for creating children module under
materialize views.

Do not remove these imports as they will be automatically imported by the view
module as its children
"""
from pgadmin.browser.server_groups.servers.databases.schemas.tables.column \
  import blueprint as columns_module
from pgadmin.browser.server_groups.servers.databases.schemas.tables.indexes \
  import blueprint as indexes_modules
from pgadmin.browser.server_groups.servers.databases.schemas.tables.triggers \
  import blueprint as triggers_modules
from pgadmin.browser.server_groups.servers.databases.schemas.tables.rules \
  import blueprint as rules_modules
