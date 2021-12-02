/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Box } from '@material-ui/core';
import clsx from 'clsx';
import PropTypes from 'prop-types';
const useStyles = makeStyles(() =>
  ({
    stepPanel: {
      height: '100%',
      width: '100%',
      // paddingLeft: '2em',
      minHeight: '100px',
      // paddingTop: '1em',
      paddingBottom: '1em',
      paddingRight: '1em',
      overflow: 'auto',
    }
  }));

export default function WizardStep({stepId, className, ...props }) {
  const classes = useStyles();

  return (

    <Box id={stepId} className={clsx(classes.stepPanel, className)} style={props?.height ? {height: props.height} : null}>
      {
        React.Children.map(props.children, (child) => {
          return (
            <>
              {child}
            </>
          );
        })
      }
    </Box>
  );
}

WizardStep.propTypes = {
  stepId: PropTypes.number,
  height: PropTypes.number,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
};
