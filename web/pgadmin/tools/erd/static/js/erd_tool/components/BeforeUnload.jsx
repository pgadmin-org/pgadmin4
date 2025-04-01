import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useBeforeUnload } from '../../../../../../static/js/custom_hooks';

export default function BeforeUnload({onInit, enabled, isNewTab, beforeClose, closePanel}) {
  const init = useBeforeUnload(
    {enabled, isNewTab, beforeClose, closePanel}
  );

  useEffect(()=>{
    onInit?.(init);
  }, [init]);

  return <></>;
}

BeforeUnload.propTypes = {
  onInit: PropTypes.func,
  enabled: PropTypes.bool,
  isNewTab: PropTypes.bool,
  beforeClose: PropTypes.func,
  closePanel: PropTypes.func
};
