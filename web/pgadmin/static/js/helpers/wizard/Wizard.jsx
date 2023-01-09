/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import FastForwardIcon from '@material-ui/icons/FastForward';
import FastRewindIcon from '@material-ui/icons/FastRewind';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import DoneIcon from '@material-ui/icons/Done';
import HelpIcon from '@material-ui/icons/HelpRounded';
import CheckIcon from '@material-ui/icons/Check';
import { DefaultButton, PrimaryButton, PgIconButton } from '../../../../static/js/components/Buttons';
import PropTypes from 'prop-types';
import { Box } from '@material-ui/core';
import gettext from 'sources/gettext';
import Loader from 'sources/components/Loader';


const useStyles = makeStyles((theme) =>
  ({
    wizardBase: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.palette.background.default
    },
    root: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      minHeight: 0
    },
    rightPanel: {
      position: 'relative',
      display: 'flex',
      flexBasis: '75%',
      overflow: 'auto',
      height: '100%',
      minHeight: '100px'
    },
    leftPanel: {
      display: 'flex',
      flexBasis: '25%',
      flexDirection: 'column',
      alignItems: 'flex-start',
      borderRight: '1px solid',
      ...theme.mixins.panelBorder.right,
    },
    label: {
      display: 'inline-block',
      position: 'relative',
      paddingLeft: '0.5rem',
      flexBasis: '70%'
    },
    labelArrow: {
      display: 'inline-block',
      position: 'relative',
      flexBasis: '30%'
    },
    labelDone: {
      display: 'inline-block',
      position: 'relative',
      flexBasis: '30%',
      color: theme.otherVars.activeStepBg + ' !important',
      padding: '4px'
    },
    stepLabel: {
      padding: '1em',
      paddingRight: 0
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
      borderTop: `1px solid ${theme.otherVars.inputBorderColor} !important`,
      padding: '0.5rem',
      display: 'flex',
      width: '100%',
      background: theme.otherVars.headerBg,
      zIndex: 999,
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
      height: '100%',
      padding: '8px',
      display: 'flex',
      flexDirection: 'column',
    }
  }),
);

function Wizard({ stepList, onStepChange, onSave, className, ...props }) {
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  const steps = stepList && stepList.length > 0 ? stepList : [];
  const [disableNext, setdisableNext] = React.useState(false);


  const handleNext = () => {
    // beforeNext should always return a promise
    if(props.beforeNext) {
      props.beforeNext(activeStep).then((skipCurrentStep=false)=>{
        if (skipCurrentStep) {
          setActiveStep((prevActiveStep) => prevActiveStep + 2);
        } else {
          setActiveStep((prevActiveStep) => prevActiveStep + 1);
        }
      }).catch(()=>{/*This is intentional (SonarQube)*/});
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    // beforeBack should always return a promise
    if(props.beforeBack) {
      props.beforeBack(activeStep).then((skipCurrentStep=false)=>{
        if (skipCurrentStep) {
          setActiveStep((prevActiveStep) => prevActiveStep - 1 < 0 ? prevActiveStep : prevActiveStep - 2);
        } else {
          setActiveStep((prevActiveStep) => prevActiveStep - 1 < 0 ? prevActiveStep : prevActiveStep - 1);
        }
      }).catch(()=>{/*This is intentional (SonarQube)*/});
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep - 1 < 0 ? prevActiveStep : prevActiveStep - 1);
    }
  };

  React.useEffect(() => {
    if (onStepChange) {
      onStepChange({ currentStep: activeStep });
    }
  }, [activeStep]);

  React.useEffect(() => {
    if (props.disableNextStep) {
      setdisableNext(props.disableNextStep(activeStep));
    }
  });


  return (
    <Box className={classes.wizardBase}>
      <div className={clsx(classes.root, props?.rootClass)}>
        <div className={clsx(classes.wizard, className)}>
          <Box className={classes.leftPanel}>
            {steps.map((label, index) => (
              <Box key={label} className={clsx(classes.stepLabel, index === activeStep ? classes.active : '')}>
                <Box className={clsx(classes.stepIndex, index === activeStep ? classes.activeIndex : '')}>{index + 1}</Box>
                <Box className={classes.label}>{label} </Box>
                <Box className={classes.labelArrow}>{index === activeStep ? <ChevronRightIcon /> : null}</Box>
                <Box className={classes.labelDone}>{index < activeStep ? <DoneIcon />: null}</Box>
              </Box>
            ))}
          </Box>
          <div className={clsx(classes.rightPanel, props.stepPanelCss)}>
            <Loader message={props?.loaderText} />
            {
              React.Children.map(props.children, (child) => {
                return (
                  <div hidden={child.props.stepId !== activeStep} className={clsx(classes.stepDefaultStyle, child.props.className)}>
                    {child}
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
      <div className={classes.wizardFooter}>
        <Box>
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
    </Box>
  );
}

export default Wizard;

Wizard.propTypes = {
  props: PropTypes.object,
  title: PropTypes.string,
  stepList: PropTypes.array,
  onSave: PropTypes.func,
  onHelp: PropTypes.func,
  onStepChange: PropTypes.func,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  disableNextStep: PropTypes.func,
  stepPanelCss: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  rootClass: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
  disableDialogHelp: PropTypes.bool,
  beforeNext: PropTypes.func,
  beforeBack: PropTypes.func,
  loaderText: PropTypes.string
};
