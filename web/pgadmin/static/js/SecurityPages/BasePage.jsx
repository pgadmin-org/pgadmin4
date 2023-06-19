import { Box, Button, darken, makeStyles } from '@material-ui/core';
import { useSnackbar } from 'notistack';
import React, { useEffect } from 'react';
import { MESSAGE_TYPE, NotifierMessage } from '../components/FormComponents';
import { FinalNotifyContent } from '../helpers/Notifier';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';

const contentBg = '#2b709b';
const loginBtnBg = '#038bba';

const useStyles = makeStyles((theme)=>({
  root: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    display: 'flex',
    justifyContent: 'center',
    height: '100%',
  },
  pageContent: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    backgroundColor: contentBg,
    borderRadius: theme.shape.borderRadius,
    maxHeight: '100%',
    minWidth: '450px',
    maxWidth: '450px'
  },
  logo: {
    width: '96px',
    height: '40px',
    background: 'url(data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDUgNTAiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDojZmZmO30uY2xzLTJ7ZmlsbDojMzI2ODkzO308L3N0eWxlPjwvZGVmcz48dGl0bGU+cGdBZG1pbjwvdGl0bGU+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNTguOTQsNDEuNGEyLjQ4LDIuNDgsMCwwLDEtMi4yNy0zLjQ5TDY0LDIxLjI5VjZhNiw2LDAsMCwwLTYtNkg2QTYsNiwwLDAsMCwwLDZWNDRhNiw2LDAsMCwwLDYsNkg1OGE2LDYsMCwwLDAsNi02VjQxLjRaIi8+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJNMjkuMjUsMzAuMTdhMTMuMTMsMTMuMTMsMCwwLDEtMS44Mi02LjkzLDEzLDEzLDAsMCwxLDEuODItNi44OCwxMi41LDEyLjUsMCwwLDEsMS40OC0xLjk1LDEwLjQ0LDEwLjQ0LDAsMCwwLTMuMjUtMi44OSwxMS4xNiwxMS4xNiwwLDAsMC01LjY1LTEuNDVxLTQuNDgsMC02LjcyLDIuNjRWMTAuNDRINy41MVY0MC4zNmExLDEsMCwwLDAsMSwxaDZhMSwxLDAsMCwwLDEtMVYzMS4xOWE4LjQ3LDguNDcsMCwwLDAsNi4zNCwyLjQsMTEuMjYsMTEuMjYsMCwwLDAsNS42NS0xLjQ1LDEwLjUzLDEwLjUzLDAsMCwwLDIuMDYtMS41NkMyOS40NCwzMC40NCwyOS4zNCwzMC4zMSwyOS4yNSwzMC4xN1pNMjMuNiwyNS44YTQuNTIsNC41MiwwLDAsMS0zLjQ1LDEuNDQsNC40OCw0LjQ4LDAsMCwxLTMuNDQtMS40NCw1LjYsNS42LDAsMCwxLTEuMzUtNCw1LjU5LDUuNTksMCwwLDEsMS4zNS00LDQuNDYsNC40NiwwLDAsMSwzLjQ0LTEuNDUsNC40OSw0LjQ5LDAsMCwxLDMuNDUsMS40NSw1LjYzLDUuNjMsMCwwLDEsMS4zNCw0QTUuNjQsNS42NCwwLDAsMSwyMy42LDI1LjhaIi8+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJNNTYuNDksMTIuNjNWMzEuMjRxMCw2LjM1LTMuNDQsOS41MXQtOS45MiwzLjE3YTI1LjQyLDI1LjQyLDAsMCwxLTYuMy0uNzUsMTUsMTUsMCwwLDEtNS0yLjIzbDIuODktNS41OWExMC4xNywxMC4xNywwLDAsMCwzLjUxLDEuNzksMTQuMzcsMTQuMzcsMCwwLDAsNC4xOC42NUE2LjUzLDYuNTMsMCwwLDAsNDcsMzYuNGE1LjM3LDUuMzcsMCwwLDAsMS40Ny00LjExdi0uNzZjLTEuNTQsMS44LTMuNzksMi42OS02Ljc2LDIuNjlhMTEuNywxMS43LDAsMCwxLTUuNTktMS4zNkExMC4zNywxMC4zNywwLDAsMSwzMi4wOSwyOWExMC44OSwxMC44OSwwLDAsMS0xLjUxLTUuNzcsMTAuODYsMTAuODYsMCwwLDEsMS41MS01Ljc0LDEwLjQyLDEwLjQyLDAsMCwxLDQuMDctMy44NiwxMS43MSwxMS43MSwwLDAsMSw1LjU5LTEuMzdjMy4yNSwwLDUuNjMsMS4wNiw3LjE0LDMuMTVWMTIuNjNabS05LjMsMTMuOTVhNC40LDQuNCwwLDAsMCwxLjQtMy4zNiw0LjM0LDQuMzQsMCwwLDAtMS4zOC0zLjM0LDUuNjUsNS42NSwwLDAsMC03LjE2LDAsNC4zLDQuMywwLDAsMC0xLjQxLDMuMzQsNC4zNSw0LjM1LDAsMCwwLDEuNDMsMy4zNiw1LjA4LDUuMDgsMCwwLDAsMy41NywxLjNBNSw1LDAsMCwwLDQ3LjE5LDI2LjU4WiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTgzLjQzLDMyLjg5SDcxbC0yLDUuMDlhMSwxLDAsMCwxLS45My42Mkg2MS43M2ExLDEsMCwwLDEtLjkxLTEuNEw3Mi45MSw5LjhhMSwxLDAsMCwxLC45Mi0uNmg2Ljg5YTEsMSwwLDAsMSwuOTEuNkw5My43NywzNy4yYTEsMSwwLDAsMS0uOTIsMS40SDg2LjQxYTEsMSwwLDAsMS0uOTMtLjYyWk04MSwyNi43NmwtMy43OC05LjQxLTMuNzgsOS40MVoiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xMjAuNDQsOC40NFYzNy42YTEsMSwwLDAsMS0xLDFoLTUuNmExLDEsMCwwLDEtMS0xVjM2LjMzUTExMC42MiwzOSwxMDYuMTYsMzlhMTEuMjksMTEuMjksMCwwLDEtNS42Ny0xLjQ1LDEwLjU0LDEwLjU0LDAsMCwxLTQtNC4xNEExMi42MiwxMi42MiwwLDAsMSw5NSwyNy4xOCwxMi41MywxMi41MywwLDAsMSw5Ni40NCwyMWExMC4zNSwxMC4zNSwwLDAsMSw0LTQuMDksMTEuNDgsMTEuNDgsMCwwLDEsNS42Ny0xLjQzLDguMjQsOC4yNCwwLDAsMSw2LjMsMi4zNVY4LjQ0YTEsMSwwLDAsMSwxLTFoNkExLDEsMCwwLDEsMTIwLjQ0LDguNDRabS05LjE5LDIyLjc1YTUuNzEsNS43MSwwLDAsMCwxLjM0LTQsNS42LDUuNiwwLDAsMC0xLjMyLTMuOTUsNC40Nyw0LjQ3LDAsMCwwLTMuNDMtMS40Myw0LjUzLDQuNTMsMCwwLDAtMy40NCwxLjQzLDUuNTEsNS41MSwwLDAsMC0xLjM0LDMuOTUsNS42Nyw1LjY3LDAsMCwwLDEuMzQsNCw0Ljc3LDQuNzcsMCwwLDAsNi44NSwwWiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE2MSwxOGMxLjY2LDEuNjgsMi41LDQuMjEsMi41LDcuNnYxMmExLDEsMCwwLDEtMSwxaC02YTEsMSwwLDAsMS0xLTFWMjYuODhhNS42Nyw1LjY3LDAsMCwwLS45LTMuNTMsMy4wOSwzLjA5LDAsMCwwLTIuNTUtMS4xMywzLjYyLDMuNjIsMCwwLDAtMi44OSwxLjI2LDUuNzEsNS43MSwwLDAsMC0xLjEsMy44MlYzNy42YTEsMSwwLDAsMS0xLDFoLTZhMSwxLDAsMCwxLTEtMVYyNi44OGMwLTMuMTEtMS4xNC00LjY2LTMuNDQtNC42NmEzLjcsMy43LDAsMCwwLTIuOTQsMS4yNiw1LjcxLDUuNzEsMCwwLDAtMS4wOSwzLjgyVjM3LjZhMSwxLDAsMCwxLTEsMWgtNmExLDEsMCwwLDEtMS0xVjE2Ljg0YTEsMSwwLDAsMSwxLTFoNS42YTEsMSwwLDAsMSwxLDF2MS4zOWE4LDgsMCwwLDEsMy0yLjA4LDEwLjIzLDEwLjIzLDAsMCwxLDMuOC0uNjksMTAsMTAsMCwwLDEsNC4yOS44OEE3LjI4LDcuMjgsMCwwLDEsMTQ2LjQyLDE5YTguODUsOC44NSwwLDAsMSwzLjQxLTIuNjUsMTAuOTMsMTAuOTMsMCwwLDEsNC40OS0uOTJBOSw5LDAsMCwxLDE2MSwxOFoiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNjguMTIsMTIuMWEzLjkxLDMuOTEsMCwwLDEtMS4zNC0yLjc5QTQuMTYsNC4xNiwwLDAsMSwxNjgsNi4xOWE1LDUsMCwwLDEsMy42Ny0xLjM2QTUuMjUsNS4yNSwwLDAsMSwxNzUuMTgsNmEzLjc1LDMuNzUsMCwwLDEsMS4zNCwzLDQuMSw0LjEsMCwwLDEtMS4zNCwzLjEzLDUuNjgsNS42OCwwLDAsMS03LjA2LDBabS41NCwzLjc0aDZhMSwxLDAsMCwxLDEsMVYzNy42YTEsMSwwLDAsMS0xLDFoLTZhMSwxLDAsMCwxLTEtMVYxNi44NEExLDEsMCwwLDEsMTY4LjY2LDE1Ljg0WiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTIwMS41NSwxOHEyLjU5LDIuNTIsMi41OSw3LjZ2MTJhMSwxLDAsMCwxLTEsMWgtNmExLDEsMCwwLDEtMS0xVjI2Ljg4cTAtNC42Ni0zLjc0LTQuNjZhNC4zLDQuMywwLDAsMC0zLjMsMS4zNCw1LjgzLDUuODMsMCwwLDAtMS4yNCw0djEwYTEsMSwwLDAsMS0xLDFoLTZhMSwxLDAsMCwxLTEtMVYxNi44NGExLDEsMCwwLDEsMS0xaDUuNjFhMSwxLDAsMCwxLDEsMXYxLjQ3YTkuMDUsOS4wNSwwLDAsMSwzLjE5LTIuMTIsMTAuNzgsMTAuNzgsMCwwLDEsNC0uNzNBOS4zNCw5LjM0LDAsMCwxLDIwMS41NSwxOFoiLz48L3N2Zz4=)  0 0 no-repeat',
    backgroundPositionY: 'center',
  },
  item: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '15px',
    fontSize: '1.2rem'
  },
  button: {
    backgroundColor: loginBtnBg,
    color: '#fff',
    padding: '4px 8px',
    width: '100%',
    '&:hover': {
      backgroundColor: darken(loginBtnBg, 0.1),
    },
    '&.Mui-disabled': {
      opacity: 0.60,
      color: '#fff'
    },
  }
}));

export function SecurityButton({...props}) {
  const classes = useStyles();
  return <Button type="submit" className={classes.button} {...props} />;
}

export default function BasePage({pageImage, title,  children, messages}) {
  const classes = useStyles();
  const snackbar = useSnackbar();

  useEffect(()=>{
    messages?.forEach((m)=>{
      snackbar.enqueueSnackbar(null, {
        autoHideDuration: null,
        content: (key)=>{
          if(Array.isArray(m[0])) m[0] = m[0][0];
          const type = Object.values(MESSAGE_TYPE).includes(m[0]) ? m[0] : MESSAGE_TYPE.INFO;
          return <FinalNotifyContent>
            <NotifierMessage type={type} message={m[1]} closable={true} onClose={()=>{snackbar.closeSnackbar(key);}} style={{maxWidth: '400px'}} />
          </FinalNotifyContent>;
        }
      });
    });
  }, [messages]);
  return (
    <Box className={classes.root}>
      <Box display="flex" minWidth="80%" gridGap='40px' alignItems="center" padding="20px 80px">
        <Box flexGrow={1} height="80%" textAlign="center">
          {pageImage}
        </Box>
        <Box className={classes.pageContent}>
          <Box className={classes.item}><div className={classes.logo} /></Box>
          <Box className={classes.item}>{title}</Box>
          <Box display="flex" flexDirection="column" minHeight={0}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}

BasePage.propTypes = {
  pageImage: CustomPropTypes.children,
  title: PropTypes.string,
  children: CustomPropTypes.children,
  messages: PropTypes.arrayOf(PropTypes.array)
};
