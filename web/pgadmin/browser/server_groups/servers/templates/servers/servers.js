// Add a server
function create_server(item) {
    var alert = alertify.prompt(
        '{{ _('Create a server') }}',
        '{{ _('Enter a name for the new server') }}', 
        '', 
        function(evt, value) { 
            var d = tree.itemData(item);
            if (d._type != 'server-group') {
                d = tree.itemData(tree.parent(item));
            }
            $.post(
                "{{ url_for('browser.index') }}server/obj/" + d.refid + '/',
                { name: value }
                )
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
function drop_server(item) {
    alertify.confirm(
        '{{ _('Drop server?') }}',
        '{{ _('Are you sure you wish to drop the server "{0}"?') }}'.replace('{0}', tree.getLabel(item)),
        function() {
            var id = tree.getId(item).split('/').pop()
            $.ajax({
                url:"{{ url_for('browser.index') }}" + d._type + "/obj/" + d.refid,
                type:'DELETE',
                success: function(data) {
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
            })
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
            var d = tree.itemData(item);
            $.ajax({
                url:"{{ url_for('browser.index') }}" + d._type + "/obj/" + d.refid,
                type:'PUT',
                params: {name: value},
                success: function(data) {
                    if (data.success == 0) {
                        report_error(data.errormsg, data.info);
                    } else {
                        tree.setLabel(item, { label: value });
                    }
                }
            })
        },
        null
    )
}
