/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';
import url_for from 'sources/url_for';
import { isEmptyString } from 'sources/validators';
import { getNodeAjaxOptions, getNodeListById } from 'pgbrowser/node_ajax';
import SchemaView from '../../../../static/js/SchemaView';
import getApiInstance from '../../../../static/js/api_instance';
import {
  StarfleetCredSchema, StarfleetInstanceSchema, StarfleetDatabaseSchema,
  isValidStarfleetName, parseAllowlist,
} from './starfleet_schema.ui';

function loadOptions(props, name, endpoint) {
  return getNodeAjaxOptions(name, pgAdmin.Browser.Nodes['server'], props.nodeInfo, props.nodeData, {
    useCache: false,
    cacheNode: 'server',
    customGenerateUrl: ()=>url_for(endpoint),
  });
}

export function StarfleetCredentials(props) {
  const [credSchema, setCredSchema] = React.useState();

  React.useMemo(() => {
    setCredSchema(new StarfleetCredSchema());
  }, [props.cloudProvider]);

  return <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={credSchema}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setStarfleetCredData(changedData);
    }}
  />;
}
StarfleetCredentials.propTypes = {
  cloudProvider: PropTypes.string,
  setStarfleetCredData: PropTypes.func,
};

export function StarfleetInstanceDetails(props) {
  const [instanceSchema, setInstanceSchema] = React.useState();
  const sizeLabels = React.useRef({});

  React.useEffect(() => {
    let cancelled = false;
    const existing = props.starfleetInstanceData || {};
    const hostIP = (props.hostIP || '').replace(/\/32$/, '');

    const build = (ip) => {
      if (cancelled) return;
      setInstanceSchema(new StarfleetInstanceSchema({
        regions: ()=>loadOptions(props, 'get_regions', 'starfleet.regions'),
        sizes: ()=>loadOptions(props, 'get_sizes', 'starfleet.sizes')
          .then((sizes)=>{
            (sizes || []).forEach((s)=>{ sizeLabels.current[s.value] = s.label; });
            return sizes;
          }),
        pgVersions: ()=>loadOptions(props, 'get_pg_versions', 'starfleet.pg_versions'),
      }, {
        ...existing,
        ip_allowlist: isEmptyString(existing.ip_allowlist) ? ip : existing.ip_allowlist,
      }));
    };

    if (!isEmptyString(existing.ip_allowlist)) {
      build(existing.ip_allowlist);
    } else {
      getApiInstance().get(url_for('starfleet.client_ip'))
        .then((res)=>build(res.data?.data || hostIP))
        .catch(()=>build(hostIP));
    }
    return ()=>{ cancelled = true; };
  }, [props.cloudProvider]);

  // SchemaView takes its initial data from the first schema it is given, so
  // wait for the client IP lookup rather than mounting it without one.
  if (!instanceSchema) return null;

  return <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={instanceSchema}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setStarfleetInstanceData({
        ...changedData,
        size_label: sizeLabels.current[changedData.size],
      });
    }}
  />;
}
StarfleetInstanceDetails.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setStarfleetInstanceData: PropTypes.func,
  starfleetInstanceData: PropTypes.object,
  hostIP: PropTypes.string,
};

export function StarfleetDatabaseDetails(props) {
  const [dbSchema, setDbSchema] = React.useState();

  React.useMemo(() => {
    setDbSchema(new StarfleetDatabaseSchema({
      server_groups: ()=>getNodeListById(pgAdmin.Browser.Nodes['server_group'], props.nodeInfo, props.nodeData),
    }, {
      gid: props.nodeInfo['server_group']._id,
    }));
  }, [props.cloudProvider]);

  return <SchemaView
    formType={'dialog'}
    getInitData={() => { /*This is intentional (SonarQube)*/ }}
    viewHelperProps={{ mode: 'create' }}
    schema={dbSchema}
    showFooter={false}
    isTabView={false}
    onDataChange={(isChanged, changedData) => {
      props.setStarfleetDatabaseData(changedData);
    }}
  />;
}
StarfleetDatabaseDetails.propTypes = {
  nodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  cloudProvider: PropTypes.string,
  setStarfleetDatabaseData: PropTypes.func,
};

// Validation functions
export function validateStarfleetStep1(cred) {
  return isEmptyString(cred.client_id) || isEmptyString(cred.client_secret);
}

export function validateStarfleetStep2(inst) {
  if (!isValidStarfleetName(inst.name) || (inst.display_name || '').length > 25
      || isEmptyString(inst.pg_version)) return true;
  return isEmptyString(inst.region) || isEmptyString(inst.size)
    || isEmptyString(inst.role) || parseAllowlist(inst.ip_allowlist).error != null;
}

export function validateStarfleetStep3(db, nodeInfo) {
  if (isEmptyString(db.gid)) db.gid = nodeInfo['server_group']._id;
  return false;
}

// Summary section
export function getStarfleetSummary(cloud, inst) {
  const row = (name, value)=>({name, value});
  return [
    [
      row(gettext('Cloud'), gettext('pgEdge Starfleet')),
      row(gettext('Database name'), inst.name),
      row(gettext('Display name'), inst.display_name || ''),
      row(gettext('PostgreSQL version'), inst.pg_version),
      row(gettext('Region'), inst.region),
      row(gettext('Size'), inst.size_label || inst.size),
    ],
    [row(gettext('Allowed IP addresses'), parseAllowlist(inst.ip_allowlist).cidrs.join(', ')),
      row(gettext('Connect as'), inst.role)],
  ];
}
