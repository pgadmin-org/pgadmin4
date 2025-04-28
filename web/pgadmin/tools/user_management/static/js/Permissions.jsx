/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useMemo, useEffect } from 'react';
import url_for from 'sources/url_for';
import gettext from 'sources/gettext';
import getApiInstance, { parseApiError } from '../../../../static/js/api_instance';
import { Box, FormLabel } from '@mui/material';
import SectionContainer from '../../../../dashboard/static/js/components/SectionContainer';
import { InputCheckbox, InputSelect, InputText } from '../../../../static/js/components/FormComponents';
import { SearchRounded } from '@mui/icons-material';
import { PgButtonGroup, PgIconButton, PrimaryButton } from '../../../../static/js/components/Buttons';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';
import Loader from 'sources/components/Loader';
import SelectAllRoundedIcon from '@mui/icons-material/SelectAllRounded';
import DeselectRoundedIcon from '@mui/icons-material/DeselectRounded';
import PropTypes from 'prop-types';

function PermissionsForRole({sections, selectedPerms, setSelectedPerms}) {
  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
      {Object.keys(sections).map(section => {
        const items = sections[section];

        return <SectionContainer key={section} title={
          <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <Box>{section}</Box>
            <Box>
              <PgButtonGroup>
                <PgIconButton
                  size="xs"
                  icon={<SelectAllRoundedIcon />}
                  aria-label="Select All"
                  title={gettext('Select All')}
                  onClick={() => {
                    setSelectedPerms((prev) => {
                      return Array.from(new Set([...prev, ...items.map(i => i.name)]));
                    });
                  }}
                ></PgIconButton>
                <PgIconButton
                  size="xs"
                  icon={<DeselectRoundedIcon />}
                  aria-label="Deselect All"
                  title={gettext('Deselect All')}
                  onClick={() => {
                    setSelectedPerms((prev) => {
                      return prev.filter((p) => !items.map(i => i.name).includes(p));
                    });
                  }}
                ></PgIconButton>
              </PgButtonGroup>
            </Box>
          </Box>
        } style={{minHeight: 0, height: 'auto'}}>
          <Box sx={{p: '8px', display: 'grid', gridAutoFlow: 'column', gridTemplateRows: '1fr '.repeat(Math.ceil(items.length/2)), gap: '4px'}}>
            {items.map(item => (
              <InputCheckbox
                key={item.name}
                controlProps={{
                  label: item.label,
                  'data-name': item.name,
                }}
                value={selectedPerms.includes(item.name)}
                onChange={(e) => {
                  let val = e.target.checked;
                  setSelectedPerms((prev) => {
                    if (val) {
                      return [...prev, item.name];
                    } else {
                      return prev.filter((p) => p !== item.name);
                    }
                  });
                }}
                sx={{widht: 'fit-content'}}
              />
            ))}
          </Box>
        </SectionContainer>;
      })}
    </Box>
  );
}
PermissionsForRole.propTypes = {
  sections: PropTypes.object,
  selectedPerms: PropTypes.array,
  setSelectedPerms: PropTypes.func,
};

export default function Permissions({roles, updateRolePermissions}) {
  const api = getApiInstance();
  const [allPermissions, setAllPermissions] = React.useState([]);
  const [searchVal, setSearchVal] = React.useState('');
  const [selectedPerms, setSelectedPerms] = React.useState([]);
  const [selectedRole, setSelectedRole] = React.useState();
  const [loading, setLoading] = React.useState('');
  const pgAdmin = usePgAdmin();

  const isDirty = useMemo(() => {
    return JSON.stringify(roles.find((r)=>r.id === selectedRole)?.permissions.sort() || []) !== JSON.stringify(selectedPerms.sort());
  }, [selectedRole, selectedPerms, roles]);

  const savePermissions = async () => {
    const url = url_for('user_management.save_permissions', {id: selectedRole});
    try {
      setLoading(gettext('Saving...'));
      const resp = await api.put(url, {permissions: selectedPerms});
      updateRolePermissions(selectedRole, resp.data.permissions);
      pgAdmin.Browser.notifier.success(gettext('Permissions saved successfully'));
    } catch (error) {
      pgAdmin.Browser.notifier.error(parseApiError(error));
      console.error(error);
    }
    setLoading('');
  };

  useEffect(() => {
    const url = url_for('user_management.all_permissions');
    api.get(url)
      .then(response => {
        setAllPermissions(response.data);
      })
      .catch(error => {
        pgAdmin.Browser.notifier.error(parseApiError(error));
        console.error(error);
      });
  }, []);

  useEffect(() => {
    setSelectedPerms(roles.find((r)=>r.id === selectedRole)?.permissions || []);
  }, [selectedRole]);

  useEffect(() => {
    if (selectedRole) {
      const role = roles.find((r)=>r.id === selectedRole);
      if (!role) {
        setSelectedRole(undefined);
      }
    }
  }, [roles]);

  const filteredAllPermissions = useMemo(() => {
    return allPermissions.filter(perm => perm.label.toLowerCase().includes(searchVal.toLowerCase()));
  }, [allPermissions, searchVal]);

  // Convert the permissions array to section based dict
  const sections = useMemo(()=>{
    return filteredAllPermissions.reduce((acc, perm) => {
      let section = perm.category;
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(perm);
      return acc;
    }, {});
  }, [filteredAllPermissions]);

  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', height: '100%'}}>
      <Loader message={loading} />
      <Box sx={{display: 'flex', gap: '4px', alignItems: 'center'}}>
        <FormLabel>{gettext('Role')}</FormLabel>
        <Box sx={{minWidth: '300px'}}>
          <InputSelect
            options={roles.filter((r)=>r.name != 'Administrator').map((r) => ({ label: r.name, value: r.id }))}
            optionsReloadBasis={roles.map((r)=>r.name).join('')}
            onChange={(val) => {setSelectedRole(val);}}
            value={selectedRole}
            placeholder={gettext('Select Role')}
          />
        </Box>
        <PrimaryButton disabled={!isDirty||Boolean(loading)} onClick={savePermissions}>{gettext('Save')}</PrimaryButton>
        <Box sx={{marginLeft: 'auto', minWidth: '300px'}}>
          <InputText
            placeholder={gettext('Search')}
            controlProps={{ title: gettext('Search') }}
            value={searchVal}
            onChange={(val) => {
              setSearchVal(val);
            }}
            startAdornment={<SearchRounded />}
          />
        </Box>
      </Box>
      {selectedRole &&
            <Box sx={{overflowY: 'auto', flexGrow: 1}}>
              <PermissionsForRole sections={sections} selectedPerms={selectedPerms} setSelectedPerms={setSelectedPerms}/>
            </Box>}
    </Box>
  );
}

Permissions.propTypes = {
  roles: PropTypes.array.isRequired,
  updateRolePermissions: PropTypes.func.isRequired,
};
