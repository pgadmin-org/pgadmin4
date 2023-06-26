/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import gettext from 'sources/gettext';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import pgAdmin from 'sources/pgadmin';
import PgAdminLogo from './PgAdminLogo';
import { Link } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  emptyPanel: {
    background: theme.palette.grey[400],
    overflow: 'hidden',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    height: '100%'

  },
  dashboardContainer: {
    paddingBottom: '8px',
    minHeight: '100%'
  },
  card: {
    position: 'relative',
    minWidth: 0,
    wordWrap: 'break-word',
    backgroundColor: theme.otherVars.tableBg,
    backgroundClip: 'border-box',
    border: '1px solid' + theme.otherVars.borderColor,
    borderRadius: theme.shape.borderRadius,
    marginTop: 8
  },
  row: {
    marginRight: '-8px',
    marginLeft: '-8px'
  },
  rowContent: {
    display: 'flex',
    flexWrap: 'wrap',
    marginRight: '-7.5px',
    marginLeft: '-7.5px'
  },
  cardHeader: {
    padding: '0.25rem 0.5rem',
    fontWeight: 'bold',
    backgroundColor: theme.otherVars.tableBg,
    borderBottom: '1px solid',
    borderBottomColor: theme.otherVars.borderColor,
  },
  dashboardLink: {
    color: theme.otherVars.colorFg + '!important',
    flex: '0 0 50%',
    maxWidth: '50%',
    textAlign: 'center',
    cursor: 'pointer'
  },
  gettingStartedLink: {
    flex: '0 0 25%',
    maxWidth: '50%',
    textAlign: 'center',
    cursor: 'pointer'
  },
  link: {
    color: theme.palette.text.primary + '!important',
  },
  cardColumn: {
    flex: '0 0 100%',
    maxWidth: '100%',
    margin: '8px'
  },
  cardBody: {
    flex: '1 1 auto',
    minHeight: '1px',
    padding: '0.5rem !important',
  }
}));


function AddNewServer(pgBrowser) {
  if (pgBrowser && pgBrowser.tree) {
    let i = _.isUndefined(pgBrowser.tree.selected()) ?
        pgBrowser.tree.first(null, false) :
        pgBrowser.tree.selected(),
      serverModule = pgAdmin.Browser.Nodes.server,
      itemData = pgBrowser.tree.itemData(i);

    while (itemData && itemData._type != 'server_group') {
      i = pgBrowser.tree.next(i);
      itemData = pgBrowser.tree.itemData(i);
    }

    if (!itemData) {
      return;
    }

    if (serverModule) {
      serverModule.callbacks.show_obj_properties.apply(
        serverModule, [{
          action: 'create',
        }, i]
      );
    }
  }
}

export default function WelcomeDashboard({ pgBrowser }) {

  const classes = useStyles();

  return (
    <div className={classes.emptyPanel}>
      <div className={classes.dashboardContainer}>
        <div className={classes.row}>
          <div className={classes.cardColumn}>
            <div className={classes.card}>
              <div className={classes.cardHeader}>{gettext('Welcome')}</div>
              <div className={classes.cardBody}>
                <PgAdminLogo />
                <h4>
                  {gettext('Feature rich')} | {gettext('Maximises PostgreSQL')}{' '}
                  | {gettext('Open Source')}{' '}
                </h4>
                <p>
                  {gettext(
                    'pgAdmin is an Open Source administration and management tool for the PostgreSQL database. It includes a graphical administration interface, an SQL query tool, a procedural code debugger and much more. The tool is designed to answer the needs of developers, DBAs and system administrators alike.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className={classes.row}>
          <div className={classes.cardColumn}>
            <div className={classes.card}>
              <div className={classes.cardHeader}>{gettext('Quick Links')}</div>
              <div className={classes.cardBody}>
                <div className={classes.rowContent}>
                  <div className={classes.dashboardLink}>
                    <Link onClick={() => { AddNewServer(pgBrowser); }} className={classes.link}>
                      <span
                        className="fa fa-4x dashboard-icon fa-server"
                        aria-hidden="true"
                      ></span>
                      <br />
                      {gettext('Add New Server')}
                    </Link>
                  </div>
                  <div className={classes.dashboardLink}>
                    <Link onClick={() => pgAdmin.Preferences.show()} className={classes.link}>
                      <span
                        id="mnu_preferences"
                        className="fa fa-4x dashboard-icon fa-cogs"
                        aria-hidden="true"
                      ></span>
                      <br />
                      {gettext('Configure pgAdmin')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={classes.row}>
          <div className={classes.cardColumn}>
            <div className={classes.card}>
              <div className={classes.cardHeader}>{gettext('Getting Started')}</div>
              <div className={classes.cardBody}>
                <div className={classes.rowContent}>
                  <div className={classes.gettingStartedLink}>
                    <a
                      href="https://www.postgresql.org/docs"
                      target="postgres_help"
                      className={classes.link}
                    >
                      <span
                        className="fa fa-4x dashboard-icon dashboard-pg-doc"
                        aria-hidden="true"
                      ></span>
                      <br />
                      {gettext('PostgreSQL Documentation')}
                    </a>
                  </div>
                  <div className={classes.gettingStartedLink}>
                    <a href="https://www.pgadmin.org" target="pgadmin_website" className={classes.link}>
                      <span
                        className="fa fa-4x dashboard-icon fa-globe"
                        aria-hidden="true"
                      ></span>
                      <br />
                      {gettext('pgAdmin Website')}
                    </a>
                  </div>
                  <div className={classes.gettingStartedLink}>
                    <a
                      href="https://planet.postgresql.org"
                      target="planet_website"
                      className={classes.link}
                    >
                      <span
                        className="fa fa-4x dashboard-icon fa-book"
                        aria-hidden="true"
                      ></span>
                      <br />
                      {gettext('Planet PostgreSQL')}
                    </a>
                  </div>
                  <div className={classes.gettingStartedLink}>
                    <a
                      href="https://www.postgresql.org/community"
                      target="postgres_website"
                      className={classes.link}
                    >
                      <span
                        className="fa fa-4x dashboard-icon fa-users"
                        aria-hidden="true"
                      ></span>
                      <br />
                      {gettext('Community Support')}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


WelcomeDashboard.propTypes = {
  pgBrowser: PropTypes.object.isRequired
};

