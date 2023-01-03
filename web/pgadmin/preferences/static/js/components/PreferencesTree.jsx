// /////////////////////////////////////////////////////////////
// //
// // pgAdmin 4 - PostgreSQL Tools
// //
// // Copyright (C) 2013 - 2023, The pgAdmin Development Team
// // This software is released under the PostgreSQL Licence
// //
// //////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import * as React from 'react';
import PropTypes from 'prop-types';
import { Directory} from 'react-aspen';
import { Tree } from '../../../../static/js/tree/tree';
import { ManagePreferenceTreeNodes } from '../../../../static/js/tree/preference_nodes';
import pgAdmin from 'sources/pgadmin';
import { FileTreeX, TreeModelX } from '../../../../static/js/components/PgTree';


export default function PreferencesTree({ pgBrowser, data }) {
  const pTreeModelX = React.useRef();
  const onReadyRef = React.useRef();
  const [loaded, setLoaded] = React.useState(false);

  const MOUNT_POINT = '/preferences';

  React.useEffect(() => {
    setLoaded(false);

    // Setup host
    let ptree = new ManagePreferenceTreeNodes(data);
    // Init Tree with the Tree Parent node '/browser'
    ptree.init(MOUNT_POINT);

    const host = {
      pathStyle: 'unix',
      getItems: (path) => {
        return ptree.readNode(path);

      },
      sortComparator: (a, b) => {
        // No nee to sort Query tool options.
        if (a._parent && a._parent._fileName == gettext('Query Tool')) return 0;
        // Sort alphabetically
        if (a.constructor === b.constructor) {
          return pgAdmin.natural_sort(a.fileName, b.fileName);
        }
        let retval = 0;
        if (a.constructor === Directory) {
          retval = -1;
        } else if (b.constructor === Directory) {
          retval = 1;
        }
        return retval;
      },
    };

    pTreeModelX.current = new TreeModelX(host, MOUNT_POINT);
    onReadyRef.current = function onReady(handler) {
      // Initialize preferences Tree
      pgBrowser.ptree = new Tree(handler, ptree, pgBrowser, 'preferences');
      // Expand directoy on loading.
      pTreeModelX.current.root._children.forEach((_d)=> {
        _d.root.expandDirectory(_d);
      });

      return true;
    };

    pTreeModelX.current.root.ensureLoaded().then(() => {
      setLoaded(true);
    });
  }, [data]);

  if (!loaded || _.isUndefined(pTreeModelX.current) || _.isUndefined(onReadyRef.current)) {
    return (gettext('Loading...'));
  }
  return (<FileTreeX model={pTreeModelX.current} height={'100%'} onReady={onReadyRef.current} />);
}

PreferencesTree.propTypes = {
  pgBrowser: PropTypes.any,
  data: PropTypes.array,
  ptree: PropTypes.any,
};
