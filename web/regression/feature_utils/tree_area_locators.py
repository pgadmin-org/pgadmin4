#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


class TreeAreaLocators():
    """This will contains element locators for tree area, will also contain
    parametrized xpath where applicable"""

    server_group_node = \
        "//div[@id='tree']//span[@class='aciTreeItem']" \
        "/span[(@class='aciTreeText') and starts-with(text(),'Servers ') or " \
        "starts-with(text(), 'Servers')]"

    server_group_node_exp_status = "//div[div[span[span[" \
                                   "(@class='aciTreeText') and " \
                                   "(text()='Servers ' or " \
                                   "text()='Servers')]]]]"

    server_group_sub_nodes = \
        "//div[div[span[span[contains(text(),'Servers')]]]]/" \
        "following-sibling::ul/li/div/div/div/span[2]/" \
        "span[@class='aciTreeText']"

    server_group_sub_nodes_exp_status = \
        "//div[div[span[span[contains(text(),'Servers')]]]]" \
        "/following-sibling::ul/li/div"

    server_group_sub_nodes_connected_status = \
        "//div[div[span[span[contains(text(), 'Servers')]]]]/" \
        "following-sibling::ul/li/div/div/div/span[2]"

    specified_tree_node = \
        "//div[@id='tree']//span[@class='aciTreeItem']/" \
        "span[(@class='aciTreeText') and text()='{}']"

    specified_tree_node_exp_status = \
        "//div[@id='tree']//span[@class='aciTreeItem']/" \
        "span[(@class='aciTreeText') and text()='{}']" \
        "//ancestor::*[@class='aciTreeLine']"

    sub_nodes_of_tables_node = \
        "//div[div[div[div[div[div[div[div[span[span[" \
        "contains(text(),'Tables')]]]]]]]]]]/" \
        "following-sibling::ul/li/div//div/span[2]/span[2]"

    sub_nodes_of_functions_node = \
        "//div[div[div[div[div[div[div[div[span[span[" \
        "contains(text(),'Functions')]]]]]]]]]]/" \
        "following-sibling::ul/li/div//div/span[2]/span[2]"

    sub_nodes_of_login_group_node = \
        "//div[div[div[span[span[contains(text(),'Login/Group Roles')]]]]]" \
        "/following::ul/li/div[@class='aciTreeLine']"

    @staticmethod
    def sub_nodes_of_a_server_node(server_name):
        xpath = "//div[div[div[span[span[contains(text(),'%s')]]]]]/" \
                "following-sibling::ul/li/div[@class='aciTreeLine']" % \
                server_name
        return xpath

    @staticmethod
    def sub_nodes_of_a_server_node_exp_status(server_name):
        xpath = "//div[div[div[span[span[contains(text(),'%s')]]]]]/" \
                "following-sibling::ul/li/div" % server_name
        return xpath

    @staticmethod
    def databases_node_of_a_server_node(server_name):
        xpath = "//div[div[div[span[span[contains(text(),'%s')]]]]]/" \
                "following-sibling::ul/li/div/div/div/div/span[2]/span[2 " \
                "and text()='Databases ']" % server_name
        return xpath

    @staticmethod
    def sub_nodes_of_databases_node(server_name):
        xpath = "//div[div[div[span[span[contains(text(),'%s')]]]]]/" \
                "following-sibling::ul/li[1]/div/following-sibling::ul/li/" \
                "div/div/div/div/div/span[2]/span[@class='aciTreeText']" % \
                server_name
        return xpath

    @staticmethod
    def sub_nodes_of_databases_node_exp_status(server_name):
        xpath = "//div[div[div[span[span[contains(text(), '%s')]]]]]/" \
                "following-sibling::ul/li[1]/div/following-sibling::ul/li/" \
                "div" % server_name
        return xpath

    @staticmethod
    def sub_nodes_of_database_node(database_name):
        xpath = "//div[div[div[div[div[span[span[contains(text()," \
                "'%s')]]]]]]]/following-sibling::ul/li/div/div/div/div/div/" \
                "div/span[2]/span[2]" % database_name
        return xpath

    @staticmethod
    def sub_nodes_of_database_node_exp_status(database_name):
        xpath = "//div[div[div[div[div[span[span[contains(text(), " \
                "'%s')]]]]]]]/following-sibling::ul/li/div" % database_name
        return xpath

    @staticmethod
    def sub_nodes_of_schemas_node(database_name):
        xpath = "//div[div[div[div[div[span[span[text()='%s']]]]]]]/" \
                "following-sibling::ul/li[" \
                "@role='presentation']/ul/li/div//div/span/span[" \
                "@class='aciTreeText']" % database_name
        return xpath

    @staticmethod
    def sub_nodes_of_schemas_node_exp_status(database_name):
        xpath = "//div[div[div[div[div[span[span[text()='%s']]]]]]]/" \
                "following-sibling::ul/li[@role='presentation']/ul/li/div" \
                % database_name
        return xpath

    @staticmethod
    def sub_nodes_of_schema_node(database_name):
        xpath = "//div[div[div[div[div[span[span[text()='%s']]]]]]]/" \
                "following-sibling::ul/li[" \
                "@role='presentation']/ul/li/ul/li/div//div/span[2]/span[2]" \
                % database_name
        return xpath

    @staticmethod
    def sub_nodes_of_schema_node_exp_status(database_name):
        xpath = "//div[div[div[div[div[span[span[text()='%s']]]]]]]/" \
                "following-sibling::ul/li[@role='presentation']" \
                "/ul/li/ul/li/div" % database_name
        return xpath
