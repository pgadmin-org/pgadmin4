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
import clsx from 'clsx';
import FastForwardIcon from '@material-ui/icons/FastForward';
import FastRewindIcon from '@material-ui/icons/FastRewind';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import HelpIcon from '@material-ui/icons/HelpRounded';
import CheckIcon from '@material-ui/icons/Check';
import { DefaultButton, PrimaryButton, PgIconButton } from '../../../../static/js/components/Buttons';
import PropTypes from 'prop-types';
import { Box } from '@material-ui/core';
import gettext from 'sources/gettext';


const useStyles = makeStyles((theme) =>
  ({
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    },
    rightPanel: {
      position: 'relative',
      minHeight: 100,
      display: 'flex',
      paddingLeft: '1.5em',
      paddingTop: '0em',
      flex: 5,
      overflow: 'auto',
      height: '100%',
    },
    leftPanel: {
      display: 'flex',
      // padding: '2em',
      flexDirection: 'column',
      alignItems: 'flex-start',
      borderRight: '1px solid',
      ...theme.mixins.panelBorder.right,
      flex: 1.6
    },
    label: {
      display: 'inline-block',
      position: 'relative',
      paddingLeft: '0.5em',
      flex: 6
    },
    labelArrow: {
      display: 'inline-block',
      position: 'relative',
      flex: 1
    },
    stepLabel: {
      padding: '1em',
    },
    active: {
      fontWeight: 600
    },
    activeIndex: {
      backgroundColor: theme.otherVars.activeStepBg + ' !important',
      color: theme.otherVars.activeStepFg + ' !important'
    },
    stepIndex: {
      padding: '0.5em 1em ',
      height: '2.5em',
      borderRadius: '2em',
      backgroundColor: theme.otherVars.stepBg,
      color: theme.otherVars.stepFg,
      display: 'inline-block',
      flex: 0.5,

    },
    wizard: {
      width: '100%',
      height: '100%',
      minHeight: 100,
      display: 'flex',
      flexWrap: 'wrap',
    },
    wizardFooter: {
      borderTop: '1px solid #dde0e6 !important',
      padding: '0.5rem',
      display: 'flex',
      flexDirection: 'row',
      flex: 1
    },
    backButton: {

      marginRight: theme.spacing(1),
    },
    instructions: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
    actionBtn: {
      alignItems: 'flex-start',
    },
    buttonMargin: {
      marginLeft: '0.5em'
    },
    stepDefaultStyle: {
      width: '100%',
      height: '100%'
    }

  }),
);

function Wizard({ stepList, onStepChange, onSave, className, ...props }) {
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  const steps = stepList && stepList.length > 0 ? stepList : [];
  const [disableNext, setdisableNext] = React.useState(false);


  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1 < 0 ? prevActiveStep : prevActiveStep - 1);
  };

  React.useEffect(() => {
    if (onStepChange) {
      onStepChange({ currentStep: activeStep });
    }
  }, [activeStep]);

  React.useEffect(() => {
    if (props.disableNextStep) {
      setdisableNext(props.disableNextStep());
    }
  });


  return (
    <div className={clsx(classes.root, props?.rootClass)}>
      <div className={clsx(classes.wizard, className)}>
        <Box className={classes.leftPanel}>
          {steps.map((label, index) => (
            <Box key={label} className={clsx(classes.stepLabel, index === activeStep ? classes.active : '')}>
              <Box className={clsx(classes.stepIndex, index === activeStep ? classes.activeIndex : '')}>{index + 1}</Box>
              <Box className={classes.label}>{label} </Box>
              <Box className={classes.labelArrow}>{index === activeStep ? <ChevronRightIcon /> : null}</Box>
            </Box>
          ))}
        </Box>

        <div className={clsx(classes.rightPanel, props.stepPanelCss)}>
          {
            React.Children.map(props.children, (child) => {
              return (
                <div hidden={child.props.stepId !== activeStep} className={clsx(child.props.className, classes.stepDefaultStyle)}>
                  {child}
                </div>
              );
            })
          }

        </div>
      </div>
      <div className={classes.wizardFooter}>
        <Box >
          <PgIconButton data-test="dialog-help" onClick={() => props.onHelp()} icon={<HelpIcon />} title="Help for this dialog."
            disabled={props.disableDialogHelp} />
        </Box>
        <Box className={classes.actionBtn} marginLeft="auto">
          <DefaultButton onClick={handleBack} disabled={activeStep === 0} className={classes.buttonMargin} startIcon={<FastRewindIcon />}>
            {gettext('Back')}
          </DefaultButton>
          <DefaultButton onClick={() => handleNext()} className={classes.buttonMargin} startIcon={<FastForwardIcon />} disabled={activeStep == steps.length - 1 || disableNext}>
            {gettext('Next')}
          </DefaultButton>
          <PrimaryButton className={classes.buttonMargin} startIcon={<CheckIcon />} disabled={activeStep == steps.length - 1 ? false : true} onClick={onSave}>
            {gettext('Finish')}
          </PrimaryButton>
        </Box>
      </div>
    </div>
  );
}

export default Wizard;

Wizard.propTypes = {
  props: PropTypes.object,
  stepList: PropTypes.array,
  onSave: PropTypes.func,
  onHelp: PropTypes.func,
  onStepChange: PropTypes.func,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  disableNextStep: PropTypes.func,
  stepPanelCss: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  rootClass: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
  disableDialogHelp: PropTypes.bool
};
