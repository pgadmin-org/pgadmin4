/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useState, useEffect } from 'react';
import _ from 'lodash';
import gettext  from 'sources/gettext';
import url_for from 'sources/url_for';
import getApiInstance from '../../../../static/js/api_instance';
import PropTypes from 'prop-types';
import EmptyPanelMessage from '../../../../static/js/components/EmptyPanelMessage';
import Loader from '../../../../static/js/components/Loader';

const StyledBox = styled(Box)(({theme}) => ({
  '& .Explain-tabPanel': {
    padding: '0 !important',
    backgroundColor: theme.palette.background.default + ' !important',
  }
}));

export default function ExplainTensor({
  plans=[],
  emptyMessage=gettext('Use the Explain/Explain Analyze button to generate the plan for a query. Alternatively, you can also execute "EXPLAIN (FORMAT JSON) [QUERY]".'),
  sql='',
}) {

  const [data, setData] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (_.isEmpty(plans)) return;
    setIsLoading(true);
    const api = getApiInstance();
    const postData = {
      plan: JSON.stringify(plans),
      query: sql,
    };
    api.post(
      url_for('expl_tensor.explain'),
      postData,
    )
      .then((res) => {
        if (res.data?.success) {
          setData(res.data?.data);
          setIsLoading(false);
        } else if (res.data?.data?.code == 401) {
          fetch(res.data?.data?.url, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(postData),
          })
            .then((res) => {
              if (res.ok) {
                setData(res.url);
              } else {
                setError(`HTTP error ${res.status}`);
              }
            })
            .catch((err) => {
              setError(err?.message);
            })
            .finally(() => {
              setIsLoading(false);
            });
        } else {
          setError(`${res.data?.info} : ${res.data?.errormsg}`);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        setError(err?.message);
        setIsLoading(false);
      });
  }, [plans]);

  if(_.isEmpty(plans)) {
    return (
      <StyledBox height="100%" display="flex" flexDirection="column">
        {emptyMessage && <EmptyPanelMessage text={emptyMessage} />}
      </StyledBox>
    );
  }
  if (isLoading) return <Loader message={gettext('Loading...')} autoEllipsis />;
  if (error) return (
    <StyledBox height="100%" display="flex" flexDirection="column">
      {<EmptyPanelMessage text={error} />}
    </StyledBox>
  );
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <iframe
        src={ data }
        title="Explain Tensor"
        width="100%"
        height="100%"
        sandbox="allow-scripts"
        allowFullScreen
      />
    </div>
  );
}

ExplainTensor.propTypes = {
  plans: PropTypes.array,
  emptyMessage: PropTypes.string,
  sql: PropTypes.string,
};
