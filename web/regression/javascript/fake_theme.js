import React from 'react';
import Theme from 'sources/Theme';

export function withTheme(WrappedComp) {
  let NewComp = (props)=>{
    return <Theme><WrappedComp {...props}/></Theme>;
  };
  return NewComp;
}
