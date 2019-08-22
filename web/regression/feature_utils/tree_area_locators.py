#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
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

    specified_tree_node = \
        "//div[@id='tree']//span[@class='aciTreeItem']/" \
        "span[(@class='aciTreeText') and text()='{}']"
