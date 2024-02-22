export default function pgadminOverride(theme) {
  return {

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
    }
  };}
