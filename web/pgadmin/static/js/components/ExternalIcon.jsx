import React from 'react';
import QueryToolSvg from '../../img/fonticon/query_tool.svg?svgr';
import ViewDataSvg from '../../img/fonticon/view_data.svg?svgr';
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
import Expand from '../../img/fonticon/open_in_full.svg?svgr';
import Collapse from '../../img/fonticon/close_fullscreen.svg?svgr';
import AWS from '../../img/aws.svg?svgr';

export default function ExternalIcon({Icon, ...props}) {
  return <Icon className={'MuiSvgIcon-root'} {...props} />;
}

ExternalIcon.propTypes = {
  Icon: PropTypes.elementType.isRequired,
};

export const QueryToolIcon = ({style})=><ExternalIcon Icon={QueryToolSvg} style={{height: '1rem', ...style}} />;
QueryToolIcon.propTypes = {style: PropTypes.object};

export const ViewDataIcon = ({style})=><ExternalIcon Icon={ViewDataSvg} style={{height: '0.8rem', ...style}} />;
ViewDataIcon.propTypes = {style: PropTypes.object};

export const SaveDataIcon = ({style})=><ExternalIcon Icon={SaveDataSvg} style={{height: '1rem', ...style}} />;
SaveDataIcon.propTypes = {style: PropTypes.object};

export const PasteIcon = ({style})=><ExternalIcon Icon={PasteSvg} style={style} />;
PasteIcon.propTypes = {style: PropTypes.object};

export const FilterIcon = ({style})=><ExternalIcon Icon={FilterSvg} style={style} />;
FilterIcon.propTypes = {style: PropTypes.object};

export const CommitIcon = ({style})=><ExternalIcon Icon={CommitSvg} style={style} />;
CommitIcon.propTypes = {style: PropTypes.object};

export const RollbackIcon = ({style})=><ExternalIcon Icon={RollbackSvg} style={style} />;
RollbackIcon.propTypes = {style: PropTypes.object};

export const ClearIcon = ({style})=><ExternalIcon Icon={ClearSvg} style={style} />;
ClearIcon.propTypes = {style: PropTypes.object};

export const ConnectedIcon = ({style})=><ExternalIcon Icon={ConnectedSvg} style={{height: '1rem', ...style}} />;
ConnectedIcon.propTypes = {style: PropTypes.object};

export const DisonnectedIcon = ({style})=><ExternalIcon Icon={DisconnectedSvg} style={{height: '1rem', ...style}} />;
DisonnectedIcon.propTypes = {style: PropTypes.object};

export const RegexIcon = ({style})=><ExternalIcon Icon={RegexSvg} style={style} />;
RegexIcon.propTypes = {style: PropTypes.object};

export const FormatCaseIcon = ({style})=><ExternalIcon Icon={FormatCaseSvg} style={style} />;
FormatCaseIcon.propTypes = {style: PropTypes.object};

export const ExpandDialogIcon = ({style})=><ExternalIcon Icon={Expand} style={{height: '1.2rem', ...style}}  />;QueryToolIcon.propTypes = {style: PropTypes.object};
ExpandDialogIcon.propTypes = {style: PropTypes.object};

export const MinimizeDialogIcon = ({style})=><ExternalIcon Icon={Collapse} style={{height: '1.4rem', ...style}} />;
MinimizeDialogIcon.propTypes = {style: PropTypes.object};

export const AWSIcon = ({style})=><ExternalIcon Icon={AWS} style={{height: '1.4rem', ...style}} />;
AWSIcon.propTypes = {style: PropTypes.object};
