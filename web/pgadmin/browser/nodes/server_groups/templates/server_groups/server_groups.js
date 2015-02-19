// Add a server group
function add_server_group() {
    var alert = alertify.prompt(
        'Add a server group',
        'Enter a name for the new server group', 
        '', 
        function(evt, value) { 
            $.post("{{ url_for('NODE-server-group.add') }}", { name: value })
                .done(function(data) {
                    if (data.success == 0) {
                        report_error(data.errormsg, data.info);
                    } else {
                        var item = {
                            id: data.data.id,
                            label: data.data.name,
                            inode: true,
                            open: false,
                            icon: 'icon-server-group'
                        }

                        treeApi.append(null, {
                            itemData: item
                        });

                    }
                }
            )
        },
        null
    );
    alert.show();
}

// Delete a server group
function delete_server_group(item) {
    alertify.confirm(
        'Delete server group?',
        'Are you sure you wish to delete the server group "{0}"?'.replace('{0}', treeApi.getLabel(item)),
        function() {
            var id = treeApi.getId(item)
            $.post("{{ url_for('NODE-server-group.delete') }}", { id: id })
                .done(function(data) {
                    if (data.success == 0) {
                        report_error(data.errormsg, data.info);
                    } else {
                        var next = treeApi.next(item);
                        var prev = treeApi.prev(item);
                        treeApi.remove(item);
                        if (next.length) {
                            treeApi.select(next);
                        } else if (prev.length) {
                            treeApi.select(prev);
                        }
                    }
                }
            )
        },
        null
    )
}

// Rename a server group
function rename_server_group(item) {
    alertify.prompt(
        'Rename server group',
        'Enter a new name for the server group', 
        treeApi.getLabel(item), 
        function(evt, value) {
            var id = treeApi.getId(item)
            $.post("{{ url_for('NODE-server-group.rename') }}", { id: id, name: value })
                .done(function(data) {
                    if (data.success == 0) {
                        report_error(data.errormsg, data.info);
                    } else {
                        treeApi.setLabel(item, { label: value });
                    }
                }
            )
        },
        null
    )
}