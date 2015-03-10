// Add a server group
function add_server_group() {
    var alert = alertify.prompt(
        '{{ _('Add a server group') }}',
        '{{ _('Enter a name for the new server group') }}', 
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

                        tree.append(null, {
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
        '{{ _('Delete server group?') }}',
        '{{ _('Are you sure you wish to delete the server group "{0}"?') }}'.replace('{0}', tree.getLabel(item)),
        function() {
            var id = tree.getId(item)
            $.post("{{ url_for('NODE-server-group.delete') }}", { id: id })
                .done(function(data) {
                    if (data.success == 0) {
                        report_error(data.errormsg, data.info);
                    } else {
                        var next = tree.next(item);
                        var prev = tree.prev(item);
                        tree.remove(item);
                        if (next.length) {
                            tree.select(next);
                        } else if (prev.length) {
                            tree.select(prev);
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
        '{{ _('Rename server group') }}',
        '{{ _('Enter a new name for the server group') }}', 
        tree.getLabel(item), 
        function(evt, value) {
            var id = tree.getId(item)
            $.post("{{ url_for('NODE-server-group.rename') }}", { id: id, name: value })
                .done(function(data) {
                    if (data.success == 0) {
                        report_error(data.errormsg, data.info);
                    } else {
                        tree.setLabel(item, { label: value });
                    }
                }
            )
        },
        null
    )
}