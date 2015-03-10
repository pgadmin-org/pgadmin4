// Add a server
function add_server() {
    var alert = alertify.prompt(
        '{{ _('Add a server') }}',
        '{{ _('Enter a name for the new server') }}', 
        '', 
        function(evt, value) { 
            $.post("{{ url_for('NODE-server.add') }}", { name: value })
                .done(function(data) {
                    if (data.success == 0) {
                        report_error(data.errormsg, data.info);
                    } else {
                        var item = {
                            id: data.data.id,
                            label: data.data.name,
                            inode: true,
                            open: false,
                            icon: 'icon-server'
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

// Delete a server
function delete_server(item) {
    alertify.confirm(
        '{{ _('Delete server?') }}',
        '{{ _('Are you sure you wish to delete the server "{0}"?') }}'.replace('{0}', tree.getLabel(item)),
        function() {
            var id = tree.getId(item)
            $.post("{{ url_for('NODE-server.delete') }}", { id: id })
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

// Rename a server
function rename_server(item) {
    alertify.prompt(
        '{{ _('Rename server') }}',
        '{{ _('Enter a new name for the server') }}', 
        tree.getLabel(item), 
        function(evt, value) {
            var id = tree.getId(item)
            $.post("{{ url_for('NODE-server.rename') }}", { id: id, name: value })
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