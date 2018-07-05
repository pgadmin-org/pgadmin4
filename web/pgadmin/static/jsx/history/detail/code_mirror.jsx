//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';
import $ from 'jquery';
import code_mirror from 'sources/../bundle/codemirror';

export default class CodeMirror extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      shouldHydrate: true,
    };
  }

  componentDidMount() {
    this.editor = code_mirror(this.container);
    this.hydrateInterval = setInterval(this.hydrateWhenBecomesVisible.bind(this), 100);
    this.hydrate(this.props);
  }

  componentWillUnmount() {
    clearInterval(this.hydrateInterval);
  }

  componentWillReceiveProps(nextProps) {
    this.hydrate(nextProps);
  }

  hydrateWhenBecomesVisible() {
    const isVisible = $(this.container).is(':visible');

    if (isVisible && this.state.shouldHydrate) {
      this.hydrate(this.props);
      this.setState({shouldHydrate: false});
    } else if (!isVisible) {
      this.setState({shouldHydrate: true});
    }
  }

  hydrate(props) {
    Object.keys(props.options || {}).forEach(key => this.editor.setOption(key, props.options[key]));

    this.editor.setValue(props.value || '');

    if(props.sqlFontSize) {
      $(this.editor.getWrapperElement()).css('font-size', props.sqlFontSize);
    }

    this.editor.refresh();
  }

  render() {
    return (
      <div ref={(self) => this.container = self}/>
    );
  }
}
