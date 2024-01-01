#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


class TreeAreaLocators:
    """This will contains element locators for tree area, will also contain
    parametrized xpath where applicable"""

    # Server Group Node
    @staticmethod
    def server_group_node(server_group_name):
        return "//span[starts-with(text(),'%s')]" % server_group_name

    @staticmethod
    def server_group_node_exp_status(server_group_name):
        return "//i[@class='directory-toggle open']/following-sibling::" \
               "span//span[starts-with(text(),'%s')]" % server_group_name

    # Server Node
    @staticmethod
    def server_node(server_name):
        return "//div[@id='id-object-explorer']" \
               "//span[starts-with(text(),'%s')]" \
               % server_name

    @staticmethod
    def server_node_exp_status(server_name):
        return "//i[@class='directory-toggle open']/following-sibling::" \
               "span//span[starts-with(text(),'%s')]" % server_name

    # Server Connection
    @staticmethod
    def server_connection_status_element(server_name):
        return "//div[@id='id-object-explorer']" \
               "//span[starts-with(text(),'%s')]/" \
               "preceding-sibling::i" % server_name

    # Databases Node
    @staticmethod
    def databases_node(server_name):
        return "//div[div[span[span[starts-with(text(),'%s')]]]]/" \
               "following-sibling::div//span[text()='Databases']" % server_name

    @staticmethod
    def databases_node_exp_status(server_name):
        return "//div[div[span[span[starts-with(text(),'%s')]]]]/" \
               "following-sibling::div//span[span[text()='Databases']]/" \
               "preceding-sibling::i[@class='directory-toggle open']" \
               % server_name

    # Database Node
    @staticmethod
    def database_node(database_name):
        return "//div[@data-depth='4']/span/span[text()='%s']" % database_name

    @staticmethod
    def database_node_exp_status(database_name):
        return "//i[@class='directory-toggle open']/following-sibling::" \
               "span//span[text()='%s']" % database_name

    # Schemas Node
    @staticmethod
    def schemas_node(database_name):
        return "//div[div[span[span[starts-with(text(),'%s')]]]]/" \
               "following-sibling::div//span[text()='Schemas']" % database_name

    @staticmethod
    def schemas_node_exp_status(database_name):
        return "//div[div[span[span[starts-with(text(),'%s')]]]]/" \
               "following-sibling::div//span[span[text()='Schemas']]/" \
               "preceding-sibling::i[@class='directory-toggle open']" \
               % database_name

    # Schema Node
    @staticmethod
    def schema_node(schema_name):
        return "//div[@id='id-object-explorer']" \
               "//span[text()='%s']" % schema_name

    @staticmethod
    def schema_node_exp_status(schema_name):
        return "//i[@class='directory-toggle open']/" \
               "following-sibling::span//span[text()='%s']" % schema_name

    # Tables Node
    @staticmethod
    def tables_node(schema_name):
        return "//div[div[span[span[starts-with(text(),'%s')]]]]/" \
               "following-sibling::div//span[text()='Tables']" % schema_name

    @staticmethod
    def tables_node_exp_status(schema_name):
        return "//div[div[span[span[starts-with(text(),'%s')]]]]/" \
               "following-sibling::div//span[span[text()='Tables']]/" \
               "preceding-sibling::i[@class='directory-toggle open']"\
               % schema_name

    # Schema child
    child_node_exp_status = \
        "//div[div[span[span[starts-with(text(),'%s')]]]]/" \
        "following-sibling::div//span[span[text()='%s']]/" \
        "preceding-sibling::i[@class='directory-toggle open']"

    child_node = "//div[div[span[span[starts-with(text(),'%s')]]]]/" \
                 "following-sibling::div//span[text()='%s']"

    @staticmethod
    def schema_child_node_exp_status(schema_name, child_node_name):
        return TreeAreaLocators.child_node_exp_status \
            % (schema_name, child_node_name)

    @staticmethod
    def schema_child_node(schema_name, child_node_name):
        return TreeAreaLocators.child_node % (schema_name, child_node_name)

    @staticmethod
    def schema_child_node_expand_icon_xpath(schema_name, child_node_name):
        return "//div[div[span[span[starts-with(text(),'%s')]]]]/" \
               "following-sibling::div//span[text()='%s']/../" \
               "preceding-sibling::i" % (schema_name, child_node_name)

    # Database child
    @staticmethod
    def database_child_node_exp_status(database_name, child_node_name):
        return TreeAreaLocators.child_node_exp_status \
            % (database_name, child_node_name)

    @staticmethod
    def database_child_node(database_name, child_node_name):
        return TreeAreaLocators.child_node % (database_name, child_node_name)

    # Server child
    @staticmethod
    def server_child_node_exp_status(server_name, child_node_name):
        return TreeAreaLocators.child_node_exp_status \
            % (server_name, child_node_name)

    @staticmethod
    def server_child_node(server_name, child_node_name):
        return TreeAreaLocators.child_node % (server_name, child_node_name)

    # Table Node
    @staticmethod
    def table_node(table_name):
        return "//div[@data-depth='8']/span/span[text()='%s']" % table_name

    # Function Node
    @staticmethod
    def function_node(table_name):
        return "//div[@data-depth='8']/span/span[text()='%s']" % table_name

    # Role Node
    @staticmethod
    def role_node(role_name):
        return "//div[@data-depth='4']/span/span[text()='%s']" % role_name

    # Context element option
    @staticmethod
    def context_menu_element(schema_name):
        return "[role='menuitem'][data-label='%s']" % schema_name

    # Old xpaths
    # server_group_sub_nodes_exp_status = \
    #     "//div[div[span[span[contains(text(),'Servers')]]]]" \
    #     "/following-sibling::ul/li/div"
    #
    # server_group_sub_nodes_connected_status = \
    #     "//div[div[span[span[contains(text(), 'Servers')]]]]/" \
    #     "following-sibling::ul/li/div/div/div/span[2]"
    #
    # specified_tree_node = \
    #     "//div[@id='id-object-explorer']//span[@class='aciTreeItem']/" \
    #     "span[(@class='aciTreeText') and text()='{}']"
    #
    # specified_tree_node_exp_status = \
    #     "//div[@id='id-object-explorer']//span[@class='aciTreeItem']/" \
    #     "span[(@class='aciTreeText') and text()='{}']" \
    #     "//ancestor::*[@class='aciTreeLine']"
    #
    # sub_nodes_of_tables_node = \
    #     "//div[div[div[div[div[div[div[div[span[span[" \
    #     "contains(text(),'Tables')]]]]]]]]]]/" \
    #     "following-sibling::ul/li/div//div/span[2]/span[2]"
    #
    # sub_nodes_of_functions_node = \
    #     "//div[div[div[div[div[div[div[div[span[span[" \
    #     "contains(text(),'Functions')]]]]]]]]]]/" \
    #     "following-sibling::ul/li/div//div/span[2]/span[2]"
    #
    # sub_nodes_of_login_group_node = \
    #     "//div[div[div[span[span[contains(text(),'Login/Group Roles')]]]]]" \
    #     "/following::ul/li/div[@class='aciTreeLine']"
    #
    # @staticmethod
    # def sub_nodes_of_a_server_node(server_name):
    #     xpath = "//div[div[div[span[span[contains(text(),'%s')]]]]]/" \
    #             "following-sibling::ul/li/div[@class='aciTreeLine']" % \
    #             server_name
    #     return xpath
    #
    # @staticmethod
    # def sub_nodes_of_a_server_node_exp_status(server_name):
    #     xpath = "//div[div[div[span[span[contains(text(),'%s')]]]]]/" \
    #             "following-sibling::ul/li/div" % server_name
    #     return xpath
    #
    # @staticmethod
    # def databases_node_of_a_server_node(server_name):
    #     xpath = "//div[div[div[span[span[contains(text(),'%s')]]]]]/" \
    #             "following-sibling::ul/li/div/div/div/div/span[2]/span[2 " \
    #             "and text()='Databases ']" % server_name
    #     return xpath
    #
    # @staticmethod
    # def sub_nodes_of_databases_node(server_name):
    #     xpath = "//div[div[div[span[span[contains(text(),'%s')]]]]]/" \
    #             "following-sibling::ul/li[1]/div/following-sibling::ul/li/" \
    #             "div/div/div/div/div/span[2]/span[@class='aciTreeText']" % \
    #             server_name
    #     return xpath
    #
    # @staticmethod
    # def sub_nodes_of_databases_node_exp_status(server_name):
    #     xpath = "//div[div[div[span[span[contains(text(), '%s')]]]]]/" \
    #             "following-sibling::ul/li[1]/div/following-sibling::ul/li/" \
    #             "div" % server_name
    #     return xpath
    #
    # @staticmethod
    # def sub_nodes_of_database_node(database_name):
    #     xpath = "//div[div[div[div[div[span[span[contains(text()," \
    #             "'%s')]]]]]]]/following-sibling::" \
    #             "ul/li/div/div/div/div/div/div/span[2]/span[2]"\
    #             % database_name
    #     return xpath
    #
    # @staticmethod
    # def sub_nodes_of_database_node_exp_status(database_name):
    #     xpath = "//div[div[div[div[div[span[span[contains(text(), " \
    #             "'%s')]]]]]]]/following-sibling::ul/li/div" % database_name
    #     return xpath
    #
    # @staticmethod
    # def sub_nodes_of_schemas_node(database_name):
    #     xpath = "//div[div[div[div[div[span[span[text()='%s']]]]]]]/" \
    #             "following-sibling::ul/li[" \
    #             "@role='presentation']/ul/li/div//div/span/span[" \
    #             "@class='aciTreeText']" % database_name
    #     return xpath
    #
    # @staticmethod
    # def sub_nodes_of_schemas_node_exp_status(database_name):
    #     xpath = "//div[div[div[div[div[span[span[text()='%s']]]]]]]/" \
    #             "following-sibling::ul/li[@role='presentation']/ul/li/div" \
    #             % database_name
    #     return xpath
    #
    # @staticmethod
    # def sub_nodes_of_schema_node(database_name):
    #     xpath = "//div[div[div[div[div[span[span[text()='%s']]]]]]]/" \
    #             "following-sibling::ul/li[@role='presentation']" \
    #             "/ul/li/ul/li/div//div/span[2]/span[2]" % database_name
    #     return xpath
    #
    # @staticmethod
    # def sub_nodes_of_schema_node_exp_status(database_name):
    #     xpath = "//div[div[div[div[div[span[span[text()='%s']]]]]]]/" \
    #             "following-sibling::ul/li[@role='presentation']" \
    #             "/ul/li/ul/li/div" % database_name
    #     return xpath
