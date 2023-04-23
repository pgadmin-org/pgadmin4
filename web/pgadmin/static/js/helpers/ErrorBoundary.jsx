/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* https://reactjs.org/blog/2017/07/26/error-handling-in-react-16.html */
import React from 'react';
import CustomPropTypes from '../custom_prop_types';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error, info) {
    // Display fallback UI
    this.setState({ hasError: true });
    // You can also log the error to an error reporting service
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <h2>Something went wrong.</h2>;
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: CustomPropTypes.children,
};
