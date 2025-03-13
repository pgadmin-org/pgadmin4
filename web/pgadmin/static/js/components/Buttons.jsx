/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Button, ButtonGroup, Tooltip } from '@mui/material';
import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import ShortcutTitle from './ShortcutTitle';
import { styled } from '@mui/material/styles';


const StyledButton = styled(Button)(({theme, color}) => ({
  '&.Buttons-primaryButton': {
    border: '1px solid '+theme.palette.primary.main,
    '&.Mui-disabled': {
      color: [theme.palette.primary.contrastText,'!important'],
      backgroundColor: theme.palette.primary.disabledMain,
    },
    '&:hover': {
      backgroundColor: theme.palette.primary.hoverMain,
      borderColor: theme.palette.primary.hoverBorderColor,
    },
    '&.Buttons-noBorderPrimary': {
      color: theme.palette.primary.contrastText,
      backgroundColor: theme.palette.primary.main,
      '&:hover': {
        color: theme.palette.primary.contrastText,
        backgroundColor: theme.palette.primary.hoverMain,
        borderColor: theme.palette.primary.hoverBorderColor,
      },
    }
  },
  '&.Buttons-defaultButton': {
    // Use the color prop to determine the background color and text color.
    backgroundColor: theme.palette[color]?.main ?? theme.palette.default.main,
    border: '1px solid '+ theme.palette.default.borderColor,
    color: theme.palette[color]?.contrastText ?? theme.palette.default.contrastText,
    whiteSpace: 'nowrap',
    '&.Mui-disabled': {
      color: [theme.palette.default.disabledContrastText, '!important'],
      borderColor: theme.palette.default.disabledBorderColor
    },
    '&:hover': {
      backgroundColor: theme.palette[color]?.hoverMain ?? theme.palette.default.hoverMain,
      color: theme.palette[color]?.contrastText ?? theme.palette.default.hoverContrastText,
      borderColor: theme.palette[color]?.hoverBorderColor ?? theme.palette.default.hoverBorderColor,
    },
    '&.Buttons-noBorder': {
      border: 0,
      backgroundColor: 'transparent',
      color: theme.custom.icon.contrastText,
      '&:hover': {
        border: 0,
        color: theme.custom.icon.contrastText,
        backgroundColor: 'inherit',
        filter: 'brightness(85%)',
      },
      '&.Mui-disabled': {
        border: 0,
      },
    },
  },
  '&.Buttons-iconButtonDefault': {
    borderColor: theme.custom.icon.borderColor,
    color: theme.custom.icon.contrastText,
    backgroundColor: theme.custom.icon.main,
    height: '28px',
    padding: '1px 4px',
    '.MuiButtonGroup-root &': {
      minWidth: '34px',

      '&.MuiButtonGroup-firstButton:hover, &.MuiButtonGroup-middleButton:hover': {
        borderRightColor: theme.custom.icon.borderColor,
      },
    },
    '&.Mui-disabled': {
      borderColor: theme.custom.icon.disabledBorderColor,
      backgroundColor: theme.custom.icon.disabledMain,
      color: theme.custom.icon.disabledContrastText,
    },
    '&:hover': {
      backgroundColor: theme.custom.icon.hoverMain,
      color: theme.custom.icon.hoverContrastText,
      borderColor: theme.custom.icon.borderColor,
    }
  },
  '&.Buttons-iconButton': {
    minWidth: 0,
    padding: '2px 4px',
    '&.MuiButton-sizeSmall, &.MuiButton-outlined.MuiButton-sizeSmall, &.MuiButton-contained.MuiButton-sizeSmall': {
    },
  },
  '&.Buttons-splitButton': {
    '&.MuiButton-sizeSmall, &.MuiButton-outlined.MuiButton-sizeSmall, &.MuiButton-contained.MuiButton-sizeSmall': {
      width: '20px',
      minWidth: 0,
      '& svg': {
        height: '0.8em',
      }
    }
  },
  '&.Buttons-xsButton': {
    padding: '2px 1px',
    height: '24px !important',
    minWidth: '24px',
    '& .MuiSvgIcon-root': {
      height: '0.8em',
    },
    '.MuiButtonGroup-root &': {
      minWidth: '30px',
    }
  },
  '&.Buttons-dashBoardStopRound':{
    paddingLeft : '0px',
    paddingBottom : '5px'
  }

}));


/* pgAdmin primary button */
export const PrimaryButton = forwardRef((props, ref)=>{
  let {children, className, size, noBorder, ...otherProps} = props;
  let allClassName = ['Buttons-primaryButton', className];
  if(size == 'xs') {
    size = undefined;
    allClassName.push('Buttons-xsButton');
  }
  noBorder && allClassName.push(...['Buttons-noBorder', 'Buttons-noBorderPrimary']);
  const dataLabel = typeof(children) == 'string' ? children : undefined;
  return (
    <StyledButton ref={ref} size={size} className={allClassName.join(' ')} data-label={dataLabel} {...otherProps} color="primary" variant="contained">{children}</StyledButton>
  );
});
PrimaryButton.displayName = 'PrimaryButton';
PrimaryButton.propTypes = {
  size: PropTypes.string,
  noBorder: PropTypes.bool,
  children: CustomPropTypes.children,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

/* pgAdmin default button */
export const DefaultButton = forwardRef((props, ref)=>{
  let {children, className, size, noBorder, color, ...otherProps} = props;
  let variant = 'outlined';
  let allClassName = ['Buttons-defaultButton', className];
  if(size == 'xs') {
    size = undefined;
    allClassName.push('Buttons-xsButton');
  } else if(color !== 'default'){
    variant='contained';
  }
  noBorder && allClassName.push('Buttons-noBorder');
  const dataLabel = typeof(children) == 'string' ? children : undefined;
  return (
    <StyledButton variant={variant} ref={ref} size={size} className={allClassName.join(' ')} data-label={dataLabel} {...otherProps} color={color ?? 'default'} >{children}</StyledButton>
  );
});
DefaultButton.displayName = 'DefaultButton';
DefaultButton.propTypes = {
  size: PropTypes.string,
  noBorder: PropTypes.bool,
  children: CustomPropTypes.children,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  color: PropTypes.string,
};


/* pgAdmin Icon button, takes Icon component as input */
export const PgIconButton = forwardRef(({icon, title, shortcut, className, splitButton, style, color, accesskey, isDropdown, tooltipPlacement, ...props}, ref)=>{
  let shortcutTitle = null;
  if(accesskey || shortcut) {
    shortcutTitle = <ShortcutTitle title={title} accesskey={accesskey} shortcut={shortcut}/>;
  }

  if(props.disabled) {
    if(color == 'primary') {
      return (
        <Tooltip title={shortcutTitle || title || ''} aria-label={title || ''} enterDelay={isDropdown ? 1500 : undefined} placement={tooltipPlacement}>
          <span>
            <PrimaryButton ref={ref} style={style}
              className={['Buttons-iconButton', (splitButton ? 'Buttons-splitButton' : ''), className].join(' ')}
              accessKey={accesskey} data-label={title || ''} {...props}>
              {icon}
            </PrimaryButton>
          </span>
        </Tooltip>
      );
    } else {
      return (
        <Tooltip title={shortcutTitle || title || ''} aria-label={title || ''} enterDelay={isDropdown ? 1500 : undefined} placement={tooltipPlacement}>
          <span>
            <DefaultButton ref={ref} style={style}
              className={['Buttons-iconButton', 'Buttons-iconButtonDefault',(splitButton ? 'Buttons-splitButton' : ''), className].join(' ')}
              accessKey={accesskey} data-label={title || ''} {...props}>
              {icon}
            </DefaultButton>
          </span>
        </Tooltip>
      );
    }
  } else if(color == 'primary') {
    return (
      <Tooltip title={shortcutTitle || title || ''} aria-label={title || ''} enterDelay={isDropdown ? 1500 : undefined} placement={tooltipPlacement}>
        <PrimaryButton ref={ref} style={style}
          className={['Buttons-iconButton', (splitButton ? 'Buttons-splitButton' : ''), className].join(' ')}
          accessKey={accesskey} data-label={title || ''} {...props}>
          {icon}
        </PrimaryButton>
      </Tooltip>

    );
  } else {
    return (
      <Tooltip title={shortcutTitle || title || ''} aria-label={title || ''} enterDelay={isDropdown ? 1500 : undefined} placement={tooltipPlacement}>
        <DefaultButton ref={ref} style={style}
          className={['Buttons-iconButton', 'Buttons-iconButtonDefault',(splitButton ? 'Buttons-splitButton' : ''), className].join(' ')}
          accessKey={accesskey} data-label={title || ''} {...props}>
          {icon}
        </DefaultButton>
      </Tooltip>
    );
  }
});
PgIconButton.displayName = 'PgIconButton';
PgIconButton.propTypes = {
  icon: CustomPropTypes.children,
  title: PropTypes.string.isRequired,
  shortcut: CustomPropTypes.shortcut,
  accesskey: PropTypes.string,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  style: PropTypes.object,
  color: PropTypes.oneOf(['primary', 'default', undefined]),
  disabled: PropTypes.bool,
  splitButton: PropTypes.bool,
  isDropdown: PropTypes.bool,
  tooltipPlacement: PropTypes.string,
};

export const PgButtonGroup = forwardRef(({children, ...props}, ref)=>{
  /* Tooltip does not work for disabled items */
  return (
    <ButtonGroup ref={ref} {...props}>
      {children}
    </ButtonGroup>
  );
});
PgButtonGroup.displayName = 'PgButtonGroup';
PgButtonGroup.propTypes = {
  children: CustomPropTypes.children,
};
