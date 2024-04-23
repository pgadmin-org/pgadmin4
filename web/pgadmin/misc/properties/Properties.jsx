/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { styled } from '@mui/material/styles';
import CollectionNodeProperties from './CollectionNodeProperties';
import ErrorBoundary from '../../static/js/helpers/ErrorBoundary';
import withStandardTabInfo from '../../static/js/helpers/withStandardTabInfo';
import { BROWSER_PANELS } from '../../browser/static/js/constants';
import ObjectNodeProperties from './ObjectNodeProperties';
import EmptyPanelMessage from '../../static/js/components/EmptyPanelMessage';
import gettext from 'sources/gettext';
import { Box } from '@mui/material';
import { usePgAdmin } from '../../static/js/BrowserComponent';
import PropTypes from 'prop-types';
import _ from 'lodash';

const StyledBox = styled(Box)(({theme}) => ({
  height: '100%',
  background: theme.otherVars.emptySpaceBg,
  display: 'flex',
  flexDirection: 'column'
}));

function Properties(props) {
  const isCollection = props.nodeData?._type?.startsWith('coll-') || props.nodeData?._type == 'dbms_job_scheduler';
  const pgAdmin = usePgAdmin();
  let noPropertyMsg = '';

  if (!props.node) {
    noPropertyMsg = gettext('Please select an object in the tree view.');
  } else if (!_.isUndefined(props.node.hasProperties) && !props.node.hasProperties) {
    noPropertyMsg = gettext('No information is available for the selected object.');
  }

  if(noPropertyMsg) {
    return (
      <StyledBox>
        <Box margin={'4px auto'}>
          <EmptyPanelMessage text={noPropertyMsg} />
        </Box>
      </StyledBox>
    );
  }

  if(isCollection) {
    return (
      <StyledBox>
        <ErrorBoundary>
          <CollectionNodeProperties
            {...props}
          />
        </ErrorBoundary>
      </StyledBox>
    );
  } else {
    return (
      <StyledBox>
        <ErrorBoundary>
          <ObjectNodeProperties
            {...props}
            actionType='properties'
            formType="tab"
            onEdit={()=>{
              pgAdmin.Browser.Node.callbacks.show_obj_properties.call(
                props.node, {action: 'edit'}
              );
            }}
          />
        </ErrorBoundary>
      </StyledBox>
    );
  }
}

Properties.propTypes = {
  node: PropTypes.func,
  treeNodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  nodeItem: PropTypes.object,
};

export default withStandardTabInfo(Properties, BROWSER_PANELS.PROPERTIES);
