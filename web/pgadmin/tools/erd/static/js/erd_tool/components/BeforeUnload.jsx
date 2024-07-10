import React from 'react';
import PropTypes from 'prop-types';
import { useBeforeUnload } from '../../../../../../static/js/custom_hooks';

export default function BeforeUnload({enabled, isNewTab, beforeClose, closePanel}) {
  useBeforeUnload(
    {enabled, isNewTab, beforeClose, closePanel}
  );

  return <></>;
}

BeforeUnload.propTypes = {
  enabled: PropTypes.bool,
  isNewTab: PropTypes.bool,
  beforeClose: PropTypes.func,
  closePanel: PropTypes.func,
  getForceClose: PropTypes.func,
};
