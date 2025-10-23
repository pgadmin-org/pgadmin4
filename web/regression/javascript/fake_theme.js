import Theme from 'sources/Theme';

export function withTheme(WrappedComp) {
  /* eslint-disable react/display-name */
  return (props)=>{
    return <Theme><WrappedComp {...props}/></Theme>;
  };
}
