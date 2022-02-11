import React from 'react';
import QueryToolSvg from '../../img/fonticon/query_tool.svg?svgr';
import SaveDataSvg from '../../img/fonticon/save_data_changes.svg?svgr';
import PasteSvg from '../../img/content_paste.svg?svgr';
import FilterSvg from '../../img/filter_alt_black.svg?svgr';
import ClearSvg from '../../img/cleaning_services_black.svg?svgr';
import CommitSvg from '../../img/fonticon/commit.svg?svgr';
import RollbackSvg from '../../img/fonticon/rollback.svg?svgr';
import ConnectedSvg from '../../img/fonticon/connected.svg?svgr';
import DisconnectedSvg from '../../img/fonticon/disconnected.svg?svgr';
import RegexSvg from '../../img/fonticon/regex.svg?svgr';
import FormatCaseSvg from '../../img/fonticon/format_case.svg?svgr';
import PropTypes from 'prop-types';

export default function ExternalIcon({Icon, ...props}) {
  return <Icon className='MuiSvgIcon-root' {...props} />;
}

ExternalIcon.propTypes = {
  Icon: PropTypes.elementType.isRequired,
};

export const QueryToolIcon = ()=><ExternalIcon Icon={QueryToolSvg} style={{height: '0.7em'}} />;
export const SaveDataIcon = ()=><ExternalIcon Icon={SaveDataSvg} style={{height: '0.7em'}} />;
export const PasteIcon = ()=><ExternalIcon Icon={PasteSvg} />;
export const FilterIcon = ()=><ExternalIcon Icon={FilterSvg} />;
export const CommitIcon = ()=><ExternalIcon Icon={CommitSvg} />;
export const RollbackIcon = ()=><ExternalIcon Icon={RollbackSvg} />;
export const ClearIcon = ()=><ExternalIcon Icon={ClearSvg} />;
export const ConnectedIcon = ()=><ExternalIcon Icon={ConnectedSvg} style={{height: '0.7em'}} />;
export const DisonnectedIcon = ()=><ExternalIcon Icon={DisconnectedSvg} style={{height: '0.7em'}} />;
export const RegexIcon = ()=><ExternalIcon Icon={RegexSvg} />;
export const FormatCaseIcon = ()=><ExternalIcon Icon={FormatCaseSvg} />;

