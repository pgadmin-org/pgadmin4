export default function pgadminOverride(theme) {
  return {
    '.dialog-node-icon': {
      marginRight: '2px !important',
      padding: '0px 10px',
      backgroundPosition: '50%'
    },
    '.icon-server-connecting': {
      backgroundImage: theme.otherVars.iconLoaderUrl,
      backgroundRepeat: 'no-repeat',
      backgroundAize: '18px !important',
      alignContent: 'center',
      verticalAlign: 'middle',
      height: '1.3em',
    },
    '.dashboard-pg-doc': {
      backgroundImage: theme.otherVars.dashboardPgDoc,
      display: 'inline-block',
      width: '50px',
      height: '50px',
      backgroundAize: '50px 50px'
    },
    '.pg-font-icon': {
      '&.icon-terminal': {
        fontSize: '1.3rem !important',
      }
    }
  };}
