##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser helper utilities"""

import flask
from flask.views import View, MethodViewType, with_metaclass
from pgadmin.utils.ajax import make_json_response
import gettext


def generate_browser_node(node_id, parent_id, label, icon, inode, node_type):
    obj = {
        "id": "%s/%s" % (node_type, node_id),
        "label": label,
        "icon": icon,
        "inode": inode,
        "_type": node_type,
        "_id": node_id,
        "refid": parent_id,
        "module": 'pgadmin.node.%s' % node_type
    }
    return obj


class NodeView(with_metaclass(MethodViewType, View)):
    """
    A PostgreSQL Object has so many operaions/functions apart from CRUD
    (Create, Read, Update, Delete):
    i.e.
    - Reversed Engineered SQL
    - Modified Query for parameter while editing object attributes
      i.e. ALTER TABLE ...
    - Statistics of the objects
    - List of dependents
    - List of dependencies
    - Listing of the children object types for the certain node
      It will used by the browser tree to get the children nodes

    This class can be inherited to achieve the diffrent routes for each of the
    object types/collections.

    OPERATION      |              URL       | Method
    ---------------+------------------------+--------
    List           | /obj/[Parent URL]/     | GET
    Properties     | /obj/[Parent URL]/id   | GET
    Create         | /obj/[Parent URL]/     | POST
    Delete         | /obj/[Parent URL]/id   | DELETE
    Update         | /obj/[Parent URL]/id   | PUT

    SQL (Reversed  | /sql/[Parent URL]/id   | GET
    Engineering)   |
    SQL (Modified  | /sql/[Parent URL]/id   | POST
    Properties)    |

    Statistics     | /stats/[Parent URL]/id | GET
    Dependencies   | /deps/[Parent URL]/id  | GET
    Dependents     | /deps/[Parent URL]/id  | POST

    Children Nodes | /nodes/[Parent URL]/id | GET

    NOTE:
    Parent URL can be seen as the path to identify the particular node.

    i.e.
    In order to identify the TABLE object, we need server -> database -> schema
    information.
    """
    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'nodes': [{'get': 'nodes'}],
        'sql': [{'get': 'sql', 'post': 'modified_sql'}],
        'stats': [{'get': 'statistics'}],
        'deps': [{'get': 'dependencies', 'post': 'dependents'}]
    })

    @classmethod
    def generate_ops(cls):
        cmds = []
        for op in cls.operations:
            idx = 0
            for ops in cls.operations[op]:
                meths = []
                for meth in ops:
                    meths.append(meth.upper())
                if len(meths) > 0:
                    cmds.append({'cmd': op, 'req': idx == 0, 'methods': meths})
                idx += 1

        return cmds

    # Inherited class needs to modify these parameters
    node_type = None
    # This must be an array object with attributes (type and id)
    parent_ids = []
    # This must be an array object with attributes (type and id)
    ids = []

    @classmethod
    def get_node_urls(cls):
        assert cls.node_type is not None, \
            "Please set the node_type for this class ({0})".format(
                str(cls.__class__.__name__))
        common_url = '/'
        for p in cls.parent_ids:
            common_url += '<{0}:{1}>/'.format(str(p['type']), str(p['id']))

        id_url = None
        for p in cls.ids:
            id_url = '{0}<{1}:{2}>'.format(common_url if not id_url else id_url,
                                           p['type'], p['id'])

        return id_url, common_url

    def __init__(self, **kwargs):
        self.cmd = kwargs['cmd']

    # Check the existance of all the required arguments from parent_ids
    # and return combination of has parent arguments, and has id arguments
    def check_args(self, **kwargs):
        has_id = has_args = True
        for p in self.parent_ids:
            if p['id'] not in kwargs:
                has_args = False
                break

        for p in self.ids:
            if p['id'] not in kwargs:
                has_id = False
                break

        return has_args, has_id and has_args

    def dispatch_request(self, *args, **kwargs):
        meth = flask.request.method.lower()
        if meth == 'head':
            meth = 'get'

        assert self.cmd in self.operations, \
            "Unimplemented Command ({0}) for {1}".format(
                self.cmd,
                str(self.__class__.__name__))
        has_args, has_id = self.check_args(**kwargs)

        assert ((has_id and len(self.operations[self.cmd]) >= 0 and meth in
                 self.operations[self.cmd][0]) or (
            not has_id and len(
                self.operations[self.cmd]) > 0 and meth in
            self.operations[self.cmd][1])), \
            "Unimplemented method ({0}) for command ({1}), which {2} an id".format(
                meth, self.cmd,
                'requires' if has_id else 'does not require')

        meth = self.operations[self.cmd][0][meth] if has_id else \
            self.operations[self.cmd][1][meth]

        method = getattr(self, meth, None)

        if method is None:
            return make_json_response(
                status=406,
                success=0,
                errormsg=gettext.gettext(
                    "Unimplemented method ({0}) for this url ({1})".format(
                        meth, flask.request.path)
                )
            )

        return method(*args, **kwargs)

    @classmethod
    def register_node_view(cls, blueprint):
        id_url, url = cls.get_node_urls()

        commands = cls.generate_ops()

        for c in commands:
            blueprint.add_url_rule(
                '/{0}{1}'.format(c['cmd'], id_url if c['req'] else url),
                view_func=cls.as_view(
                    '%s%s' % (c['cmd'], '_id' if c['req'] else ''),
                    cmd=c['cmd']),
                methods=c['methods'])
