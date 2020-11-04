##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Utility classes to register, getter, setter functions for the preferences of a
module within the system.
"""

import decimal
import simplejson as json

import dateutil.parser as dateutil_parser
from flask import current_app
from flask_babelex import gettext
from flask_security import current_user

from pgadmin.model import db, Preferences as PrefTable, \
    ModulePreference as ModulePrefTable, UserPreference as UserPrefTable, \
    PreferenceCategory as PrefCategoryTbl


class _Preference(object):
    """
    Internal class representing module, and categoy bound preference.
    """

    def __init__(
        self, cid, name, label, _type, default, **kwargs
    ):
        """
        __init__
        Constructor/Initializer for the internal _Preference object.

        It creates a new entry for this preference in configuration table based
        on the name (if not exists), and keep the id of it for on demand value
        fetching from the configuration table in later stage. Also, keeps track
        of type of the preference/option, and other supporting parameters like
        min, max, options, etc.

        :param cid: configuration id
        :param name: Name of the preference (must be unique for each
                     configuration)
        :param label: Display name of the options/preference
        :param _type: Type for proper validation on value
        :param default: Default value
        :param help_str: Help string to be shown in preferences dialog.
        :param min_val: minimum value
        :param max_val: maximum value
        :param options: options (Array of list objects)
        :param select2: select2 options (object)
        :param fields: field schema (if preference has more than one field to
                        take input from user e.g. keyboardshortcut preference)
        :param allow_blanks: Flag specify whether to allow blank value.

        :returns: nothing
        """
        self.cid = cid
        self.name = name
        self.default = default
        self.label = label
        self._type = _type
        self.help_str = kwargs.get('help_str', None)
        self.min_val = kwargs.get('min_val', None)
        self.max_val = kwargs.get('max_val', None)
        self.options = kwargs.get('options', None)
        self.select2 = kwargs.get('select2', None)
        self.fields = kwargs.get('fields', None)
        self.allow_blanks = kwargs.get('allow_blanks', None)

        # Look into the configuration table to find out the id of the specific
        # preference.
        res = PrefTable.query.filter_by(
            name=name, cid=cid
        ).first()

        if res is None:
            # Could not find in the configuration table, we will create new
            # entry for it.
            res = PrefTable(name=self.name, cid=cid)
            db.session.add(res)
            db.session.commit()
            res = PrefTable.query.filter_by(
                name=name
            ).first()

        # Save this id for letter use.
        self.pid = res.id

    def get(self):
        """
        get
        Fetch the value from the server for the current user from the
        configuration table (if available), otherwise returns the default value
        for it.

        :returns: value for this preference.
        """
        res = UserPrefTable.query.filter_by(
            pid=self.pid
        ).filter_by(uid=current_user.id).first()

        # Could not find any preference for this user, return default value.
        if res is None:
            return self.default

        # The data stored in the configuration will be in string format, we
        # need to convert them in proper format.
        if self._type in ('boolean', 'switch', 'node'):
            return res.value == 'True'
        if self._type == 'options':
            for opt in self.options:
                if 'value' in opt and opt['value'] == res.value:
                    return res.value
            if self.select2 and self.select2['tags']:
                return res.value
            return self.default
        if self._type == 'select2':
            if res.value:
                res.value = res.value.replace('[', '')
                res.value = res.value.replace(']', '')
                res.value = res.value.replace('\'', '')
                return [val.strip() for val in res.value.split(',')]
            return None
        if self._type == 'text' and res.value == '' and not self.allow_blanks:
            return self.default

        parser_map = {
            'integer': int,
            'numeric': decimal.Decimal,
            'date': dateutil_parser.parse,
            'datetime': dateutil_parser.parse,
            'keyboardshortcut': json.loads
        }
        try:
            return parser_map.get(self._type, lambda v: v)(res.value)
        except Exception as e:
            current_app.logger.exception(e)
            return self.default
        return res.value

    def set(self, value):
        """
        set
        Set the value into the configuration table for this current user.

        :param value: Value to be set

        :returns: nothing.
        """
        # We can't store the values in the given format, we need to convert
        # them in string first. We also need to validate the value type.

        parser_map = {
            'integer': int,
            'numeric': float,
            'date': dateutil_parser.parse,
            'datetime': dateutil_parser.parse,
            'keyboardshortcut': json.dumps
        }

        error_map = {
            'keyboardshortcut': 'keyboard shortcut'
        }

        try:
            if self._type in ('boolean', 'switch', 'node'):
                assert isinstance(value, bool)
            elif self._type == 'options':
                has_value = next((True for opt in self.options
                                  if 'value' in opt and opt['value'] == value),
                                 False)
                assert (has_value or (self.select2 and self.select2['tags']))
            elif self._type == 'date':
                value = parser_map[self._type](value).date()
            else:
                value = parser_map.get(self._type, lambda v: v)(value)
                if self._type == 'integer':
                    value = self.normalize_range(value)
                    assert isinstance(value, int)
                if self._type == 'numeric':
                    value = self.normalize_range(value)
                    assert (
                        isinstance(value, int) or isinstance(value, float) or
                        isinstance(value, decimal.Decimal))
        except Exception as e:
            current_app.logger.exception(e)
            return False, gettext(
                "Invalid value for {0} option.".format(
                    error_map.get(self._type, self._type)))

        pref = UserPrefTable.query.filter_by(
            pid=self.pid
        ).filter_by(uid=current_user.id).first()

        value = "{}".format(value)
        if pref is None:
            pref = UserPrefTable(
                uid=current_user.id, pid=self.pid, value=value
            )
            db.session.add(pref)
        else:
            pref.value = value
        db.session.commit()

        return True, None

    def normalize_range(self, value):
        ret_val = value
        if self.min_val is not None and value < self.min_val:
            ret_val = self.min_val
        if self.max_val is not None and value > self.max_val:
            ret_val = self.max_val

        return ret_val

    def to_json(self):
        """
        to_json
        Returns the JSON object representing this preferences.

        :returns: the JSON representation for this preferences
        """
        res = {
            'id': self.pid,
            'cid': self.cid,
            'name': self.name,
            'label': self.label or self.name,
            'type': self._type,
            'help_str': self.help_str,
            'min_val': self.min_val,
            'max_val': self.max_val,
            'options': self.options,
            'select2': self.select2,
            'value': self.get(),
            'fields': self.fields,
        }
        return res


class Preferences(object):
    """
    class Preferences

    It helps to manage all the preferences/options related to a specific
    module.

    It keeps track of all the preferences registered with it using this class
    in the group of categories.

    Also, create the required entries for each module, and categories in the
    preferences tables (if required). If it is already present, it will refer
    to the existing data from those tables.

    class variables:
    ---------------
    modules:
    Dictionary of all the modules, can be refered by its name.
    Keeps track of all the modules in it, so that - only one object per module
    gets created. If the same module refered by different object, the
    categories dictionary within it will be shared between them to keep the
    consistent data among all the object.

    Instance Definitions:
    -------- -----------
    """
    modules = dict()

    def __init__(self, name, label=None):
        """
        __init__
        Constructor/Initializer for the Preferences class.

        :param name: Name of the module
        :param label: Display name of the module, it will be displayed in the
                      preferences dialog.

        :returns nothing
        """
        self.name = name
        self.label = label
        self.categories = dict()

        # Find the entry for this module in the configuration database.
        module = ModulePrefTable.query.filter_by(name=name).first()

        # Can't find the reference for it in the configuration database,
        # create on for it.
        if module is None:
            module = ModulePrefTable(name=name)
            db.session.add(module)
            db.session.commit()
            module = ModulePrefTable.query.filter_by(name=name).first()

        self.mid = module.id

        if name in Preferences.modules:
            m = Preferences.modules[name]
            self.categories = m.categories
        else:
            Preferences.modules[name] = self

    def to_json(self):
        """
        to_json
        Converts the preference object to the JSON Format.

        :returns: a JSON object contains information.
        """
        res = {
            'id': self.mid,
            'label': self.label or self.name,
            'name': self.name,
            'categories': []
        }
        for c in self.categories:
            cat = self.categories[c]
            interm = {
                'id': cat['id'],
                'label': cat['label'] or cat['name'],
                'preferences': []
            }

            res['categories'].append(interm)

            for p in cat['preferences']:
                pref = (cat['preferences'][p]).to_json().copy()
                pref.update({'mid': self.mid, 'cid': cat['id']})
                interm['preferences'].append(pref)

        return res

    def __category(self, name, label):
        """
        __category

        A private method to create/refer category for/of this module.

        :param name: Name of the category
        :param label: Display name of the category, it will be send to
                      client/front end to list down in the preferences/options
                      dialog.
        :returns: A dictionary object reprenting this category.
        """
        if name in self.categories:
            res = self.categories[name]
            # Update the category label (if not yet defined)
            res['label'] = res['label'] or label

            return res

        cat = PrefCategoryTbl.query.filter_by(
            mid=self.mid
        ).filter_by(name=name).first()

        if cat is None:
            cat = PrefCategoryTbl(name=name, mid=self.mid)
            db.session.add(cat)
            db.session.commit()
            cat = PrefCategoryTbl.query.filter_by(
                mid=self.mid
            ).filter_by(name=name).first()

        self.categories[name] = res = {
            'id': cat.id,
            'name': name,
            'label': label,
            'preferences': dict()
        }

        return res

    def register(
            self, category, name, label, _type, default, **kwargs
    ):
        """
        register
        Register/Refer the particular preference in this module.

        :param category: name of the category, in which this preference/option
                         will be displayed.
        :param name:     name of the preference/option
        :param label:    Display name of the preference
        :param _type:    [optional] Type of the options.
                         It is an optional argument, only if this
                         option/preference is registered earlier.
        :param default:  [optional] Default value of the options
                         It is an optional argument, only if this
                         option/preference is registered earlier.
        :param min_val:
        :param max_val:
        :param options:
        :param help_str:
        :param category_label:
        :param select2: select2 control extra options
        :param fields: field schema (if preference has more than one field to
                        take input from user e.g. keyboardshortcut preference)
        :param allow_blanks: Flag specify whether to allow blank value.
        """
        min_val = kwargs.get('min_val', None)
        max_val = kwargs.get('max_val', None)
        options = kwargs.get('options', None)
        help_str = kwargs.get('help_str', None)
        category_label = kwargs.get('category_label', None)
        select2 = kwargs.get('select2', None)
        fields = kwargs.get('fields', None)
        allow_blanks = kwargs.get('allow_blanks', None)

        cat = self.__category(category, category_label)
        if name in cat['preferences']:
            return (cat['preferences'])[name]

        assert label is not None, "Label for a preference cannot be none!"
        assert _type is not None, "Type for a preference cannot be none!"
        assert _type in (
            'boolean', 'integer', 'numeric', 'date', 'datetime',
            'options', 'multiline', 'switch', 'node', 'text', 'radioModern',
            'keyboardshortcut', 'select2'
        ), "Type cannot be found in the defined list!"

        (cat['preferences'])[name] = res = _Preference(
            cat['id'], name, label, _type, default, help_str=help_str,
            min_val=min_val, max_val=max_val, options=options,
            select2=select2, fields=fields, allow_blanks=allow_blanks
        )

        return res

    def preference(self, name):
        """
        preference
        Refer the particular preference in this module.

        :param name:     name of the preference/option
        """
        for key in self.categories:
            cat = self.categories[key]
            if name in cat['preferences']:
                return (cat['preferences'])[name]

        return None

    @classmethod
    def preferences(cls):
        """
        preferences
        Convert all the module preferences in the JSON format.

        :returns: a list of the preferences for each of the modules.
        """
        res = []

        for m in Preferences.modules:
            res.append(Preferences.modules[m].to_json())

        return res

    @classmethod
    def register_preference(
            cls, module, category, name, label, _type, default, **kwargs
    ):
        """
        register
        Register/Refer a preference in the system for any module.

        :param module:   Name of the module
        :param category: Name of category
        :param name:     Name of the option
        :param label:    Label of the option, shown in the preferences dialog.
        :param _type:    Type of the option.
                         Allowed type of options are as below:
                         boolean, integer, numeric, date, datetime,
                         options, multiline, switch, node
        :param default:  Default value for the preference/option
        :param min_val:  Minimum value for integer, and numeric type
        :param max_val:  Maximum value for integer, and numeric type
        :param options:  Allowed list of options for 'option' type
        :param help_str: Help string show for that preference/option.
        :param module_label: Label for the module
        :param category_label: Label for the category
        """
        min_val = kwargs.get('min_val', None)
        max_val = kwargs.get('max_val', None)
        options = kwargs.get('options', None)
        help_str = kwargs.get('help_str', None)
        module_label = kwargs.get('module_label', None)
        category_label = kwargs.get('category_label', None)

        m = None
        if module in Preferences.modules:
            m = Preferences.modules[module]
            # Update the label (if not defined yet)
            m.label = m.label or module_label
        else:
            m = Preferences(module, module_label)

        return m.register(
            category, name, label, _type, default, min_val=min_val,
            max_val=max_val, options=options, help_str=help_str,
            category_label=category_label
        )

    @staticmethod
    def raw_value(_module, _preference, _category=None, _user_id=None):
        # Find the entry for this module in the configuration database.
        module = ModulePrefTable.query.filter_by(name=_module).first()

        if module is None:
            return None

        if _category is None:
            _category = _module

        if _user_id is None:
            _user_id = getattr(current_user, 'id', None)
            if _user_id is None:
                return None

        cat = PrefCategoryTbl.query.filter_by(
            mid=module.id).filter_by(name=_category).first()

        if cat is None:
            return None

        pref = PrefTable.query.filter_by(
            name=_preference).filter_by(cid=cat.id).first()

        if pref is None:
            return None

        user_pref = UserPrefTable.query.filter_by(
            pid=pref.id
        ).filter_by(uid=_user_id).first()

        if user_pref is not None:
            return user_pref.value

        return None

    @classmethod
    def module(cls, name, create=True):
        """
        module (classmethod)
        Get the module preferences object

        :param name: Name of the module
        :param create: Flag to create Preferences object
        :returns: a Preferences object representing for the module.
        """
        if name in Preferences.modules:
            m = Preferences.modules[name]
            # Update the label (if not defined yet)
            if m.label is None:
                m.label = name
            return m

        if create:
            return Preferences(name, None)

        return None

    @classmethod
    def save(cls, mid, cid, pid, value):
        """
        save
        Update the value for the preference in the configuration database.

        :param mid: Module ID
        :param cid: Category ID
        :param pid: Preference ID
        :param value: Value for the options
        """
        # Find the entry for this module in the configuration database.
        module = ModulePrefTable.query.filter_by(id=mid).first()

        # Can't find the reference for it in the configuration database,
        # create on for it.
        if module is None:
            return False, gettext("Could not find the specified module.")

        m = cls.modules[module.name]

        if m is None:
            return False, gettext(
                "Module '{0}' is no longer in use."
            ).format(module.name)

        category = None

        for c in m.categories:
            cat = m.categories[c]
            if cid == cat['id']:
                category = cat
                break

        if category is None:
            return False, gettext(
                "Module '{0}' does not have category with id '{1}'"
            ).format(module.name, cid)

        preference = None

        for p in category['preferences']:
            pref = (category['preferences'])[p]

            if pref.pid == pid:
                preference = pref
                break

        if preference is None:
            return False, gettext(
                "Could not find the specified preference."
            )

        try:
            pref.set(value)
        except Exception as e:
            current_app.logger.exception(e)
            return False, str(e)

        return True, None
