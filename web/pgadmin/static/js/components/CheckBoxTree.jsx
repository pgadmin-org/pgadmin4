import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import CheckboxTree from 'react-checkbox-tree';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import IndeterminateCheckBoxIcon from '@material-ui/icons/IndeterminateCheckBox';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme) =>
  ({
    treeRoot: {
      '& .rct-collapse, .rct-checkbox': {
        padding: 0
      },
      '& .rct-node-leaf':{
        padding: '0 0 0 10px'
      },
      '& .react-checkbox-tree': {
        height: '97%',
        fontSize: '0.815rem',
        overflow: 'auto',
        ...theme.mixins.panelBorder
      },
      height: '100%'
    },
    unchecked: {
      fill: theme.otherVars.borderColor
    },
    checked: {
      fill: theme.palette.primary.main
    }
  })
);
export default function CheckBoxTree({treeData, ...props}) {
  const [checked, setChecked] = React.useState([]);
  const [expanded, setExpanded] = React.useState([]);

  const classes = useStyles();

  React.useEffect(() => {
    if (props.getSelectedServers) {
      props.getSelectedServers(checked);
    }
  }, [checked]);

  return (
    <div className={classes.treeRoot}>
      <CheckboxTree
        nodes={treeData}
        checked={checked}
        expanded={expanded}
        onCheck={checkedVal => setChecked(checkedVal)}
        onExpand={expandedVal => setExpanded(expandedVal)}
        showNodeIcon={false}
        icons={{
          check: <CheckBoxIcon className={classes.checked}/>,
          uncheck: <CheckBoxOutlineBlankIcon className={classes.unchecked}/>,
          halfCheck: <IndeterminateCheckBoxIcon className={classes.checked}/>,
          expandClose: <ChevronRightIcon />,
          expandOpen: <ExpandMoreIcon />,
          leaf: <ChevronRightIcon />
        }}
      />
    </div>
  );
}

CheckBoxTree.propTypes = {
  treeData: PropTypes.array,
  getSelectedServers: PropTypes.func
};
