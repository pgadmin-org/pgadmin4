##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for server group permissions after the server_access refactor."""

import json
import config
from pgadmin.utils.route import BaseTestGenerator
from regression.test_setup import config_data
from regression.python_test_utils.test_utils import \
    create_user_wise_test_client
from pgadmin.model import db, ServerGroup, Server

test_user_details = None
if config.SERVER_MODE:
    test_user_details = \
        config_data['pgAdmin4_test_non_admin_credentials']

SG_OBJ_URL = '/browser/server_group/obj/'
SG_NODES_URL = '/browser/server_group/nodes/'


def _create_server_group(tester, name):
    """Create a server group and return (status_code, response_data)."""
    response = tester.post(
        SG_OBJ_URL,
        data=json.dumps({'name': name}),
        content_type='html/json'
    )
    response_data = json.loads(response.data.decode('utf-8'))
    if response.status_code == 200 and 'node' in response_data:
        node = _find_node_by_label(
            _get_nodes(tester)[1], name
        )
        if node is not None:
            response_data['node'] = node
    return response.status_code, response_data


def _get_nodes(tester, sg_id=None):
    """Fetch server group node(s) from the nodes endpoint."""
    url = SG_NODES_URL if sg_id is None else SG_NODES_URL + str(sg_id)
    response = tester.get(url, content_type='html/json')
    response_data = json.loads(response.data.decode('utf-8'))
    return response.status_code, response_data.get('data')


def _find_node(nodes, sg_id):
    """Find a node by _id in a list or return the dict if it matches."""
    sg_id = str(sg_id)
    if isinstance(nodes, dict):
        return nodes if str(nodes.get('_id')) == sg_id else None
    for node in nodes or []:
        if str(node.get('_id')) == sg_id:
            return node
    return None


def _find_node_by_label(nodes, label):
    """Find a node by label in a list."""
    if isinstance(nodes, dict):
        return nodes if nodes.get('label') == label else None
    for node in nodes or []:
        if node.get('label') == label:
            return node
    return None


def _get_first_group_id(app):
    """Return the lowest-id server group owned by the current user."""
    with app.app_context():
        sg = ServerGroup.query.order_by(ServerGroup.id).first()
        return sg.id if sg else None


def _cleanup_server_group(app, sg_id):
    """Delete a server group directly from the database."""
    if sg_id is None:
        return
    with app.app_context():
        sg = ServerGroup.query.filter_by(id=sg_id).first()
        if sg:
            db.session.delete(sg)
            db.session.commit()


def _cleanup_shared_servers_in_group(tester, app, group_id):
    """Remove shared servers left in a group by earlier tests in the suite."""
    with app.app_context():
        server_ids = [
            s.id for s in Server.query.filter_by(
                servergroup_id=group_id, shared=True
            ).all()
        ]
    for server_id in server_ids:
        tester.delete(
            '/browser/server/obj/{0}/{1}'.format(group_id, server_id)
        )


def _assert_owned_group_node(self, node):
    """Assert metadata for a non-shared owned server group node."""
    self.assertTrue(node.get('can_edit'))
    self.assertFalse(node.get('is_shared'))
    self.assertEqual(node.get('icon'), 'icon-server_group')


def _assert_desktop_nodes_metadata(self, nodes):
    """Assert desktop-mode metadata on all listed server group nodes."""
    self.assertIsInstance(nodes, list)
    for node in nodes:
        self.assertFalse(node.get('is_shared'))
        self.assertTrue(node.get('can_edit'))


class OwnedGroupCrudTestCase(BaseTestGenerator):
    """An owned group is visible, editable, and deletable."""

    scenarios = [
        ('Owned group is visible, editable, and deletable',
         dict(is_positive_test=True)),
    ]

    def setUp(self):
        super().setUp()
        self.sg_id = None
        status_code, response_data = _create_server_group(
            self.tester, 'owned_test_group'
        )
        self.assertEqual(status_code, 200)
        self.assertIn('node', response_data)
        self.sg_id = response_data['node']['_id']
        self.assertTrue(
            response_data['node'].get('can_delete'),
            'Owned CRUD tests require a non-first server group.'
        )

    def runTest(self):
        if not self.sg_id:
            raise Exception("Server group not created")

        url = SG_OBJ_URL + str(self.sg_id)
        response = self.tester.get(url, content_type='html/json')
        self.assertEqual(response.status_code, 200)

        status_code, node = _get_nodes(self.tester, self.sg_id)
        self.assertEqual(status_code, 200)
        _assert_owned_group_node(self, node)
        self.assertTrue(node.get('can_delete'))

        if not config.SERVER_MODE:
            status_code, nodes = _get_nodes(self.tester)
            self.assertEqual(status_code, 200)
            _assert_desktop_nodes_metadata(self, nodes)

        response = self.tester.put(
            url,
            data=json.dumps({'name': 'renamed_group'}),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertIn('node', response_data)
        self.assertEqual(response_data['node']['label'], 'renamed_group')
        self.assertTrue(response_data['node'].get('can_edit'))

        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 200)
        self.sg_id = None

    def tearDown(self):
        _cleanup_server_group(self.app, self.sg_id)


class FirstGroupNotDeletableTestCase(BaseTestGenerator):
    """The user's first server group cannot be deleted."""

    scenarios = [
        ('First owned server group is not deletable',
         dict(is_positive_test=False)),
    ]

    def setUp(self):
        super().setUp()
        if config.SERVER_MODE:
            # Other tests may leave shared servers in the default group;
            # delete() checks that before the first-group guard.
            _cleanup_shared_servers_in_group(
                self.tester, self.app, config_data['server_group']
            )

    def runTest(self):
        first_group_id = _get_first_group_id(self.app)
        self.assertIsNotNone(first_group_id)

        status_code, node = _get_nodes(self.tester, first_group_id)
        self.assertEqual(status_code, 200)
        self.assertFalse(node.get('can_delete'))
        self.assertTrue(node.get('can_edit'))
        self.assertFalse(node.get('is_shared'))

        if not config.SERVER_MODE:
            status_code, nodes = _get_nodes(self.tester)
            self.assertEqual(status_code, 200)
            _assert_desktop_nodes_metadata(self, nodes)

        url = SG_OBJ_URL + str(first_group_id)
        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 417)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertIn(
            'The first server group is not deletable.',
            response_data.get('errormsg', '')
        )

        status_code, response_data = _create_server_group(
            self.tester, 'second_test_group'
        )
        self.assertEqual(status_code, 200)
        self.assertIn('node', response_data)
        self.assertTrue(response_data['node'].get('can_delete'))
        if not config.SERVER_MODE:
            self.assertFalse(response_data['node'].get('is_shared'))

        second_group_id = response_data['node']['_id']
        _cleanup_server_group(self.app, second_group_id)


class SharedGroupPermissionsTestCase(BaseTestGenerator):
    """A group with another user's shared server is visible but not
    editable or deletable (server mode only)."""

    scenarios = [
        ('Shared server group is visible with shared flags only',
         dict(is_positive_test=True)),
    ]

    def setUp(self):
        super().setUp()
        self.sg_id = None
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Shared group permission tests only apply to server mode.'
            )

        status_code, response_data = _create_server_group(
            self.tester, 'shared_host_group'
        )
        self.assertEqual(status_code, 200)
        self.assertIn('node', response_data)
        self.sg_id = response_data['node']['_id']

        self.server['shared'] = True
        url = '/browser/server/obj/{0}/'.format(self.sg_id)
        response = self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertIn('node', response_data)
        self.server_id = response_data['node']['_id']

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        if not self.sg_id:
            raise Exception("Server group not created")

        status_code, nodes = _get_nodes(self.tester)
        self.assertEqual(status_code, 200)
        node = _find_node(nodes, self.sg_id)
        self.assertIsNotNone(
            node,
            'Shared server group should be visible to non-owner'
        )
        self.assertTrue(node.get('is_shared'))
        self.assertEqual(node.get('icon'), 'icon-server_group_shared')
        self.assertFalse(node.get('can_edit'))
        self.assertFalse(node.get('can_delete'))

        url = SG_OBJ_URL + str(self.sg_id)
        response = self.tester.get(url, content_type='html/json')
        self.assertEqual(response.status_code, 200)

        response = self.tester.put(
            url,
            data=json.dumps({'name': 'should_not_rename'}),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 417)

        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 417)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertIn(
            'Shared servers are present',
            response_data.get('errormsg', '')
        )

    def tearDown(self):
        if self.server_id is not None:
            url = '/browser/server/obj/{0}/{1}'.format(
                self.sg_id, self.server_id)
            self.__class__.tester.delete(url)
        _cleanup_server_group(self.app, self.sg_id)


class DesktopGroupsMetadataTestCase(BaseTestGenerator):
    """Desktop mode returns owned groups with is_shared=False."""

    scenarios = [
        ('Desktop groups report is_shared=False',
         dict(is_positive_test=True)),
    ]

    def setUp(self):
        super().setUp()
        self.sg_id = None
        if config.SERVER_MODE:
            self.skipTest(
                'Desktop metadata tests only apply to desktop mode.'
            )

    def runTest(self):
        status_code, nodes = _get_nodes(self.tester)
        self.assertEqual(status_code, 200)
        _assert_desktop_nodes_metadata(self, nodes)

        first_group_id = _get_first_group_id(self.app)
        self.assertIsNotNone(first_group_id)
        first_node = _find_node(nodes, first_group_id)
        self.assertIsNotNone(first_node)
        self.assertFalse(first_node.get('can_delete'))

        status_code, response_data = _create_server_group(
            self.tester, 'desktop_second_group'
        )
        self.assertEqual(status_code, 200)
        self.assertIn('node', response_data)
        self.assertFalse(response_data['node'].get('is_shared'))
        self.assertTrue(response_data['node'].get('can_delete'))
        self.sg_id = response_data['node']['_id']

    def tearDown(self):
        _cleanup_server_group(self.app, self.sg_id)
