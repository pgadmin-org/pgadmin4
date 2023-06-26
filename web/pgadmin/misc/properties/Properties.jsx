import React from 'react';
import CollectionNodeProperties from './CollectionNodeProperties';
import ErrorBoundary from '../../static/js/helpers/ErrorBoundary';
import withStandardTabInfo from '../../static/js/helpers/withStandardTabInfo';
import { BROWSER_PANELS } from '../../browser/static/js/constants';
import ObjectNodeProperties from './ObjectNodeProperties';
import EmptyPanelMessage from '../../static/js/components/EmptyPanelMessage';
import gettext from 'sources/gettext';
import { Box, makeStyles } from '@material-ui/core';
import { usePgAdmin } from '../../static/js/BrowserComponent';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    background: theme.otherVars.emptySpaceBg,
    display: 'flex',
    flexDirection: 'column'
  },
}));

function Properties(props) {
  const isCollection = props.nodeData?._type?.startsWith('coll-');
  const classes = useStyles();
  const pgAdmin = usePgAdmin();

  if(!props.node) {
    return (
      <Box className={classes.root}>
        <Box margin={'4px auto'}>
          <EmptyPanelMessage text={gettext('Please select an object in the tree view.')} />
        </Box>
      </Box>
    );
  }

  if(isCollection) {
    return (
      <Box className={classes.root}>
        <ErrorBoundary>
          <CollectionNodeProperties
            {...props}
          />
        </ErrorBoundary>
      </Box>
    );
  } else {
    return (
      <Box className={classes.root}>
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
      </Box>
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
