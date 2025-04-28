/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useMemo, useRef } from 'react';
import { getDeleteCell, getEditCell, getSwitchCell } from '../../../../static/js/components/PgReactTableStyled';
import gettext from 'sources/gettext';
import getApiInstance, { parseApiError } from '../../../../static/js/api_instance';
import PgTable from 'sources/components/PgTable';
import url_for from 'sources/url_for';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import ErrorBoundary from '../../../../static/js/helpers/ErrorBoundary';
import UserDialog from './UserDialog';
import { Box } from '@mui/material';
import Loader from 'sources/components/Loader';
import {Add as AddIcon, SyncRounded, Help as HelpIcon} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { PgButtonGroup, PgIconButton } from '../../../../static/js/components/Buttons';
import { showChangeOwnership } from '../../../../static/js/Dialogs';
import { isEmptyString } from '../../../../static/js/validators';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';

function CustomHeader({updateUsers, options, pgAdmin}) {
  return (
    <Box>
      <PgButtonGroup>
        <PgIconButton
          icon={<AddIcon style={{ height: '1.4rem' }} />}
          aria-label="Create User"
          title={gettext('Create User...')}
          onClick={() => {
            const panelTitle = gettext('Create User');
            const panelId = BROWSER_PANELS.USER_MANAGEMENT + '-new';
            pgAdmin.Browser.docker.default_workspace.openDialog({
              id: panelId,
              title: panelTitle,
              content: (
                <ErrorBoundary>
                  <UserDialog
                    options={options}
                    user={{}}
                    onClose={(_e, reload) => {
                      pgAdmin.Browser.docker.default_workspace.close(panelId, true);
                      reload && updateUsers();
                    }}
                  />
                </ErrorBoundary>
              )
            }, pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.lg);
          }}
        ></PgIconButton>
        <PgIconButton
          icon={<SyncRounded style={{ height: '1.4rem' }} />}
          aria-label="Refresh"
          title={gettext('Refresh')}
          onClick={() => {
            updateUsers();
          }}
        ></PgIconButton>
        <PgIconButton
          icon={<HelpIcon style={{height: '1.4rem'}}/>}
          aria-label="Help"
          title={gettext('Help')}
          onClick={() => {
            window.open(url_for('help.static', {'filename': 'user_management.html'}));
          }}
        ></PgIconButton>
      </PgButtonGroup>
    </Box>
  );
}
CustomHeader.propTypes = {
  updateUsers: PropTypes.func,
  options: PropTypes.object,
  pgAdmin: PropTypes.object,
};

export default function Users({roles}) {
  const authSources = useRef([]);
  const [loading, setLoading] = React.useState('');
  const [tableData, setTableData] = React.useState([]);
  const api = getApiInstance();
  const pgAdmin = usePgAdmin();

  const onDeleteClick = (row) => {
    const deleteRow = async () => {
      setLoading(gettext('Deleting user...'));
      try {
        await api.delete(url_for('user_management.save_id', { id: row.original.id }));
        pgAdmin.Browser.notifier.success(gettext('User deleted successfully.'));
        updateList();
      } catch (error) {
        pgAdmin.Browser.notifier.error(parseApiError(error));
      }
      setLoading('');
    };

    pgAdmin.Browser.notifier.confirmDelete(gettext('Delete User?'), gettext('Are you sure you want to delete the user %s?', `<strong>${row.original.username}</strong>`),
      async () => {
        setLoading(gettext('Deleting user...'));
        try {
          const resp = await api.get(url_for('user_management.shared_servers', {'uid': row['id']}));
          const noOfSharedServers = resp.data?.data?.shared_servers ?? 0;
          if (noOfSharedServers > 0) {
            const resp = await api.get(url_for('user_management.admin_users', {'uid': row['id']}));
            showChangeOwnership(
              gettext('Change ownership'),
              resp.data?.data?.result?.data,
              noOfSharedServers,
              {'id': row.original['id'], 'name': !isEmptyString(row.original['email']) ? row.original['email'] : row.original['username']},
              ()=> {
                pgAdmin.Browser.notifier.confirm(
                  gettext('Object explorer tree refresh required'),
                  gettext('The ownership of the shared server was changed or the shared server was deleted, so the object explorer tree refresh is required. Do you wish to refresh the tree?'),
                  function () {
                    pgAdmin.Browser.tree.destroy();
                  },
                  function () {
                    return true;
                  },
                  gettext('Refresh'),
                  gettext('Later')
                );
                deleteRow();
              }
            );
          } else {
            deleteRow();
          }
        }
        catch (error) {
          pgAdmin.Browser.notifier.error(parseApiError(error));
        }
        setLoading('');
      });
  };

  const onEditClick = (row) => {
    const user = row.original;
    const panelTitle = gettext('Edit User - %s', user.username);
    const panelId = BROWSER_PANELS.USER_MANAGEMENT + '-edit-' + user.id;

    pgAdmin.Browser.docker.default_workspace.openDialog({
      id: panelId,
      title: panelTitle,
      content: (
        <ErrorBoundary>
          <UserDialog
            options={{
              authSources: authSources.current.map((s) => ({ label: s.label, value: s.value })),
              roles: roles.map((r) => ({ label: r.name, value: r.id })),
            }}
            user={user}
            onClose={(_e, reload) => {
              pgAdmin.Browser.docker.default_workspace.close(panelId, true);
              reload && updateList();
            }}
          />
        </ErrorBoundary>
      )
    }, pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.lg);
  };

  const columns = useMemo(() => {
    return [{
      header: () => null,
      enableSorting: false,
      enableResizing: false,
      enableFilters: false,
      size: 35,
      maxSize: 35,
      minSize: 35,
      id: 'btn-delete',
      cell: getDeleteCell({ title: gettext('Delete User'), onClick: onDeleteClick, isDisabled: (row) => !row.original.canDrop }),
    },{
      header: () => null,
      enableSorting: false,
      enableResizing: false,
      enableFilters: false,
      size: 35,
      maxSize: 35,
      minSize: 35,
      id: 'btn-edit',
      cell: getEditCell({ title: gettext('Edit User'), onClick: onEditClick }),
    },
    {
      header: gettext('Auth Source'),
      accessorFn: (row) => authSources.current.find((s)=>s.value == row.auth_source).label,
      enableSorting: true,
      enableResizing: true,
      size: 120,
      minSize: 100,
      enableFilters: true,
    },
    {
      header: gettext('Username'),
      accessorKey: 'username',
      enableSorting: true,
      enableResizing: true,
      size: 200,
      minSize: 150,
      enableFilters: true,
    },
    {
      header: gettext('Email'),
      accessorKey: 'email',
      enableSorting: true,
      enableResizing: true,
      size: 200,
      minSize: 150,
      enableFilters: true,
    },
    {
      header: gettext('Role'),
      accessorFn: (row) => roles.find((r)=>r.id == row.role)?.name,
      enableSorting: true,
      enableResizing: true,
      size: 100,
      minSize: 80,
      enableFilters: true,
    },
    {
      header: gettext('Active'),
      accessorKey: 'active',
      enableSorting: true,
      enableResizing: true,
      size: 50,
      minSize: 50,
      enableFilters: true,
      cell: getSwitchCell(),
    },
    {
      header: gettext('Locked'),
      accessorKey: 'locked',
      enableSorting: true,
      enableResizing: true,
      size: 50,
      minSize: 50,
      enableFilters: true,
      cell: getSwitchCell(),
    }];
  }, [roles]);

  const updateList = async () => {
    setLoading(gettext('Fetching users...'));
    try {
      const res = await api.get(url_for('user_management.users'));
      setTableData(res.data);
    } catch (error) {
      pgAdmin.Browser.notifier.error(parseApiError(error));
    }
    setLoading('');
  };

  const initialize = async () => {
    setLoading(gettext('Loading...'));
    try {
      const res = await api.get(url_for('user_management.auth_sources'));
      authSources.current = res.data;
      updateList();
    } catch (error) {
      setLoading('');
      pgAdmin.Browser.notifier.error(parseApiError(error));
    }
  };

  useEffect(() => {
    initialize();
  }, []);

  return (
    <Box sx={{position: 'relative', height: '100%'}}>
      <Loader message={loading} />
      <PgTable
        data-test="users"
        columns={columns}
        data={tableData}
        sortOptions={[{ id: 'username', desc: true }]}
        caveTable={false}
        tableNoBorder={false}
        tableProps={{
          getRowId: (row) => {
            return row.id;
          }
        }}
        customHeader={<CustomHeader updateUsers={updateList} options={{
          authSources: authSources.current.map((s) => ({ label: s.label, value: s.value })),
          roles: roles.map((r) => ({ label: r.name, value: r.id })),
        }} pgAdmin={pgAdmin} />}
      ></PgTable>
    </Box>
  );
}

Users.propTypes = {
  roles: PropTypes.array,
};
