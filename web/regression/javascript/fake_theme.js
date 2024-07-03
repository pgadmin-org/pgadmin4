import React from 'react';
import Theme from 'sources/Theme';

export function withTheme(WrappedComp) {
  return (props)=>{
    return <Theme><WrappedComp {...props}/></Theme>;
  };
}
