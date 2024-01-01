/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
export const BgProcessManagerEvents = {
  LIST_UPDATED: 'LIST_UPDATED',
};

export const BgProcessManagerProcessState = {
  PROCESS_NOT_STARTED: 0,
  PROCESS_STARTED: 1,
  PROCESS_FINISHED: 2,
  PROCESS_TERMINATED: 3,
  /* Supported by front end only */
  PROCESS_TERMINATING: 10,
  PROCESS_FAILED: 11,
};
