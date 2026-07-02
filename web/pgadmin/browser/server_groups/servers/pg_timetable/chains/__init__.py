
from pgadmin.browser.plugins import BrowserPluginModule
from pgadmin.browser.utils import NodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error
from pgadmin.utils.driver import get_driver
from pgadmin.utils.constants import MANAGED_PROVIDER
from flask import request

# 1. The Browser Module (registers the node infrastructure in pgAdmin)
class PGTimetableChainModule(BrowserPluginModule):
    def __init__(self, *args, **kwargs):
        super(PGTimetableChainModule, self).__init__(*args, **kwargs)
        self.node_type = 'pg_timetable_chain'
        self.parent_type = 'server'

    def get_nodes(self, gid, sid):
        """Generates visual child tree items under the active Server connection."""
        pass


# Initialize the module instance for pgAdmin's plugin loader
blueprint = PGTimetableChainModule('pg_timetable_chain', __name__, static_folder='static')


# 2. The Node View (maps REST API endpoints to this specific node type)
class PGTimetableChainView(NodeView):
    node_type = 'pg_timetable_chain'
    parent_ids = [{'type': 'server', 'id': 'sid'}]
    ids = [{'type': 'pg_timetable_chain', 'id': 'chain_id'}]

    def _get_connection(self, sid):
        """Helper to get a connection pointing to the maintenance DB."""
        driver = get_driver(MANAGED_PROVIDER)
        manager = driver.connection_manager(sid)
        conn = manager.connection(manager.db)
        return driver, conn

    def list(self, gid, sid):
        """Triggered automatically when clicking the pg_timetable folder node."""
        try:
            driver, conn = self._get_connection(sid)

            # Check if pg_timetable schema is present
            sql_path = 'pg_timetable/chains/sql/default/check_extension.sql'
            status, res = conn.execute_scalar(self.render_template_file(sql_path))

            if not res:
                return make_json_response(data=[]) # Hide gracefully if not installed

            # Fetch active cron chains
            sql = "SELECT chain_id as id, name FROM timetable.chain;"
            status, result = conn.execute_dict(sql)

            nodes = []
            for row in result['rows']:
                nodes.append(self.blueprint.generate_browser_node(
                    id=row['id'],
                    label=row['name'],
                    icon='icon-pg_timetable_chain'
                ))
            return make_json_response(data=nodes)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def create(self, gid, sid):
        """Invoked when a POST request hits the node endpoint with form data."""
        try:
            # Read JSON payload sent by the React frontend
            data = request.get_json()
            driver, conn = self._get_connection(sid)

            # Render and execute the template file
            sql = self.render_template_file(
                'pg_timetable/chains/sql/default/create.sql',
                data=data
            )
            status, result = conn.execute_dict(sql)

            # Fetch the ID of the freshly generated object to return to the UI tree
            id_sql = f"SELECT chain_id FROM timetable.chain WHERE name = {driver.qtLiteral(data['name'])} ORDER BY chain_id DESC LIMIT 1;"
            status, id_res = conn.execute_dict(id_sql)
            new_id = id_res['rows'][0]['chain_id']

            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    id=new_id,
                    label=data['name'],
                    icon='icon-pg_timetable_chain'
                )
            )
        except Exception as e:
            # Make sure to rollback if things fail mid-transaction
            return internal_server_error(errormsg=str(e))

    def update(self, gid, sid, chain_id):
        """Invoked automatically when a PUT request hits the matching node instance."""
        try:
            # Parse form edits sent down from the client model layer
            data = request.get_json()
            driver, conn = self._get_connection(sid)

            # Compile and push structural edits through the database driver connection
            sql = self.render_template_file(
                'pg_timetable/chains/sql/default/update.sql',
                data=data,
                chain_id=chain_id
            )
            status, result = conn.execute_dict(sql)

            # Fetch the updated name to verify if the sidebar tree label needs a rename event
            current_name = data.get('name')
            if not current_name:
                name_sql = f"SELECT name FROM timetable.chain WHERE chain_id = {int(chain_id)};"
                status, name_res = conn.execute_dict(name_sql)
                current_name = name_res['rows'][0]['name']

            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    id=chain_id,
                    label=current_name,
                    icon='icon-pg_timetable_chain'
                )
            )
        except Exception as e:
            # Prevent data contamination if validation fails midway through operations
            return internal_server_error(errormsg=str(e))

    def properties(self, gid, sid, chain_id):
        """Invoked when pgAdmin requests data to fill the properties dashboard panel."""
        try:
            driver, conn = self._get_connection(sid)

            # Render script using the specific clicked chain_id parameter
            sql = self.render_template_file(
                'pg_timetable/chains/sql/default/properties.sql',
                chain_id=chain_id
            )
            status, result = conn.execute_dict(sql)

            if not result['rows']:
                return internal_server_error(errormsg="Requested pg_timetable chain not found.")

            # Grab the row dictionary mapping directly to your React schema structure
            data = result['rows'][0]

            return make_json_response(data=data)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def delete(self, gid, sid, chain_id):
        """Invoked automatically when a user hits Delete/Drop on a tree node selection."""
        try:
            driver, conn = self._get_connection(sid)

            # Compile parameters and push structural deletions to the cluster
            sql = self.render_template_file(
                'pg_timetable/chains/sql/default/delete.sql',
                chain_id=chain_id
            )
            status, result = conn.execute_dict(sql)

            # Return a success flag response to notify the frontend to remove the node
            return make_json_response(
                success=True,
                info="pg_timetable Chain successfully dropped."
            )
        except Exception as e:
            # Safe rollback operation triggers implicitly on driver connection breakdown
            return internal_server_error(errormsg=str(e))

# 3. Connect the View routing back to the Module Blueprint
PGTimetableChainView.register_node_view(blueprint)
