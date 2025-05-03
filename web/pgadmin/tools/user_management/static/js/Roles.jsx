/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useMemo } from 'react';
import gettext from 'sources/gettext';
import PgTable from '../../../../static/js/components/PgTable';
import { getDeleteCell, getEditCell } from '../../../../static/js/components/PgReactTableStyled';
import RoleDialog from './RoleDialog';
import Loader from 'sources/components/Loader';

import getApiInstance, { parseApiError } from '../../../../static/js/api_instance';
import url_for from 'sources/url_for';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import ErrorBoundary from '../../../../static/js/helpers/ErrorBoundary';
import { Box } from '@mui/material';
import {Add as AddIcon, SyncRounded, Help as HelpIcon} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { PgButtonGroup, PgIconButton } from '../../../../static/js/components/Buttons';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';

function CustomHeader({updateRoles, pgAdmin}) {
  return (
    <Box>
      <PgButtonGroup>
        <PgIconButton
          icon={<AddIcon style={{ height: '1.4rem' }} />}
          aria-label="Create Role"
          title={gettext('Create Role...')}
          onClick={() => {
            const panelTitle = gettext('Create Role');
            const panelId = BROWSER_PANELS.USER_MANAGEMENT + '-new-role';
            pgAdmin.Browser.docker.default_workspace.openDialog({
              id: panelId,
              title: panelTitle,
              content: (
                <ErrorBoundary>
                  <RoleDialog
                    role={{}}
                    onClose={(_e, reload) => {
                      pgAdmin.Browser.docker.default_workspace.close(panelId, true);
                      reload && updateRoles();
                    }}
                  />
                </ErrorBoundary>
              )
            }, pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.md);
          }}
        ></PgIconButton>
        <PgIconButton
          icon={<SyncRounded style={{ height: '1.4rem' }} />}
          aria-label="Refresh"
          title={gettext('Refresh')}
          onClick={updateRoles}
        ></PgIconButton>
        <PgIconButton
          icon={<HelpIcon style={{ height: '1.4rem' }} />}
          aria-label="Help"
          title={gettext('Help')}
          onClick={() => {
            window.open(url_for('help.static', { 'filename': 'user_management.html' }));
          }}
        ></PgIconButton>
      </PgButtonGroup>
    </Box>
  );
}
CustomHeader.propTypes = {
  updateRoles: PropTypes.func,
  pgAdmin: PropTypes.object,
};

export default function Roles({roles, updateRoles}) {
  const [loading, setLoading] = React.useState('');
  const api = getApiInstance();
  const pgAdmin = usePgAdmin();

  const onDeleteClick = (row) => {
    pgAdmin.Browser.notifier.confirm(gettext('Delete Role'), gettext('Are you sure you want to delete the role %s?', row.original.name),
      async () => {
        setLoading(gettext('Deleting role...'));
        try {
          await api.delete(url_for('user_management.role_delete', { id: row.original.id }));
          pgAdmin.Browser.notifier.success(gettext('Role deleted successfully.'));
          updateRoles();
        } catch (error) {
          pgAdmin.Browser.notifier.error(parseApiError(error));
        }
        setLoading('');
      });
  };

  const onEditClick = (row) => {
    const role = row.original;
    const panelTitle = gettext('Edit Role - %s', role.name);
    const panelId = BROWSER_PANELS.USER_MANAGEMENT + '-edit-role' + role.id;
    pgAdmin.Browser.docker.default_workspace.openDialog({
      id: panelId,
      title: panelTitle,
      content: (
        <ErrorBoundary>
          <RoleDialog
            role={role}
            onClose={(_e, reload) => {
              pgAdmin.Browser.docker.default_workspace.close(panelId, true);
              reload && updateRoles();
            }}
          />
        </ErrorBoundary>
      )
    }, pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.md);
  };

  const columns = useMemo(() => [{
    header: () => null,
    enableSorting: false,
    enableResizing: false,
    enableFilters: false,
    size: 35,
    maxSize: 35,
    minSize: 35,
    id: 'btn-delete',
    cell: getDeleteCell({ title: gettext('Delete Role'), onClick: onDeleteClick, isDisabled: (row) => row.original.is_admin }),
  },{
    header: () => null,
    enableSorting: false,
    enableResizing: false,
    enableFilters: false,
    size: 35,
    maxSize: 35,
    minSize: 35,
    id: 'btn-edit',
    cell: getEditCell({ title: gettext('Edit Role'), onClick: onEditClick, isDisabled: (row) => row.original.is_admin }),
  },
  {
    header: gettext('Name'),
    accessorKey: 'name',
    size: 50,
    minSize: 50,
  },
  {
    header: gettext('Decscription'),
    accessorKey: 'description',
    size: 100,
    minSize: 100,
  }], []);

  return (
    <Box sx={{position: 'relative', height: '100%'}}>
      <Loader message={loading} />
      <PgTable
        data-test="roles"
        columns={columns}
        data={roles}
        sortOptions={[{ id: 'name', desc: false }]}
        caveTable={false}
        tableNoBorder={false}
        tableProps={{
          getRowId: (row) => {
            return row.id;
          }
        }}
        customHeader={<CustomHeader updateRoles={updateRoles} pgAdmin={pgAdmin} />}
      ></PgTable>
    </Box>
  );
}

Roles.propTypes = {
  roles: PropTypes.array,
  updateRoles: PropTypes.func,
};
