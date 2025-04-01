/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import { styled } from '@mui/material/styles';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DoneIcon from '@mui/icons-material/Done';
import HelpIcon from '@mui/icons-material/HelpRounded';
import CheckIcon from '@mui/icons-material/Check';
import { DefaultButton, PrimaryButton, PgIconButton } from '../../../../static/js/components/Buttons';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import gettext from 'sources/gettext';
import Loader from 'sources/components/Loader';

const StyledBox = styled(Box)(({theme}) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default + ' !important',
  '& .Wizard-root': {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,

    '& .Wizard-body': {
      width: '100%',
      height: '100%',
      minHeight: 100,
      display: 'flex',
      flexWrap: 'wrap',
      '& .Wizard-rightPanel': {
        position: 'relative',
        display: 'flex',
        flexBasis: '75%',
        overflow: 'auto',
        height: '100%',
        minHeight: '100px',
        '& .Wizard-stepDefaultStyle': {
          width: '100%',
          height: '100%',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
        },
        '& .Wizard-hidden': {
          display: 'none',
        }
      },
      '& .Wizard-active': {
        fontWeight: 600
      },
      '& .Wizard-leftPanel': {
        display: 'flex',
        flexBasis: '25%',
        flexDirection: 'column',
        alignItems: 'flex-start',
        borderRight: '1px solid',
        ...theme.mixins.panelBorder.right,
        '& .Wizard-active': {
          fontWeight: 600
        },
        '& .Wizard-stepLabel': {
          padding: '1em',
          paddingRight: 0,
          '& .Wizard-stepIndex': {
            padding: '0.5em 1em ',
            height: '2.5em',
            borderRadius: '2em',
            backgroundColor: theme.otherVars.stepBg,
            color: theme.otherVars.stepFg,
            display: 'inline-block',
            flex: 0.5,
            '& .Wizard-activeIndex': {
              backgroundColor: theme.otherVars.activeStepBg + ' !important',
              color: theme.otherVars.activeStepFg + ' !important'
            },
          },
          '& .Wizard-label': {
            display: 'inline-block',
            position: 'relative',
            paddingLeft: '0.5rem',
            flexBasis: '70%'
          },      
          '& .Wizard-labelArrow': {
            display: 'inline-block',
            position: 'relative',
            flexBasis: '30%'
          },
          '& .Wizard-labelDone': {
            display: 'inline-block',
            position: 'relative',
            flexBasis: '30%',
            color: theme.otherVars.activeStepBg + ' !important',
            padding: '4px'
          },
        },
      },
    },
  },
  '& .Wizard-footer': {
    borderTop: `1px solid ${theme.otherVars.inputBorderColor} !important`,
    padding: '0.5rem',
    display: 'flex',
    width: '100%',
    background: theme.otherVars.headerBg,
    zIndex: 999,
    '& .Wizard-actionBtn': {
      alignItems: 'flex-start',
      '& .Wizard-buttonMargin': {
        marginLeft: '0.5em'
      },
    },
  },
}));

function Wizard({ stepList, onStepChange, onSave, className, ...props }) {

  const [activeStep, setActiveStep] = React.useState(0);
  const steps = stepList && stepList.length > 0 ? stepList : [];
  const [disableNext, setDisableNext] = React.useState(false);


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
      setDisableNext(props.disableNextStep(activeStep));
    }
  });


  return (
    <StyledBox>
      <div className={['Wizard-root', (props?.rootClass ? props.rootClass : '')].join(' ') }>
        <div className={['Wizard-body', className].join(' ') }>
          <Box className='Wizard-leftPanel'>
            {steps.map((label, index) => (
              <Box key={label} className={['Wizard-stepLabel', (index === activeStep ? 'Wizard-active' : '')].join(' ') }>
                <Box className={['Wizard-stepIndex', (index === activeStep ? 'Wizard-activeIndex' : '')].join(' ') }>{index + 1}</Box>
                <Box className='Wizard-label'>{label} </Box>
                <Box className='Wizard-labelArrow'>{index === activeStep ? <ChevronRightIcon /> : null}</Box>
                <Box className='Wizard-labelDone'>{index < activeStep ? <DoneIcon />: null}</Box>
              </Box>
            ))}
          </Box>
          <div className={['Wizard-rightPanel', props.stepPanelCss].join(' ') }>
            <Loader message={props?.loaderText} />
            {
              React.Children.map(props.children, (child) => {
                return (
                  <div className={['Wizard-stepDefaultStyle', child.props.className, (child.props.stepId !== activeStep ? 'Wizard-hidden' : '')].join(' ') }>
                    {child}
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
      <div className='Wizard-footer'>
        <Box>
          <PgIconButton data-test="dialog-help" onClick={() => props.onHelp()} icon={<HelpIcon />} title="Help for this dialog."
            disabled={props.disableDialogHelp} />
        </Box>
        <Box className='Wizard-actionBtn' marginLeft="auto">
          <DefaultButton onClick={handleBack} disabled={activeStep === 0} className='Wizard-buttonMargin' startIcon={<FastRewindIcon />}>
            {gettext('Back')}
          </DefaultButton>
          <DefaultButton onClick={() => handleNext()} className='Wizard-buttonMargin' startIcon={<FastForwardIcon />} disabled={activeStep == steps.length - 1 || disableNext}>
            {gettext('Next')}
          </DefaultButton>
          <PrimaryButton className='Wizard-buttonMargin' startIcon={<CheckIcon />} disabled={activeStep !== (steps.length - 1) } onClick={onSave}>
            {gettext('Finish')}
          </PrimaryButton>
        </Box>
      </div>
    </StyledBox>
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
