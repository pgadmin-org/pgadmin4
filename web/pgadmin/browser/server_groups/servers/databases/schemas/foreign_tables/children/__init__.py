"""
We will use the existing modules for creating children module under
foreign tables.

Do not remove these imports as they will be automatically imported by the view
module as its children
"""
from pgadmin.browser.server_groups.servers.databases.schemas.tables.triggers \
    import blueprint as triggers_modules
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints import blueprint as constraints_modules
from pgadmin.browser.server_groups.servers.databases.schemas.\
    foreign_tables.foreign_table_columns import foreign_table_column_blueprint\
    as foreign_tables_columns_modules
