/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { app } from 'electron';

export function setBadge(count) {
  const badgeCount = parseInt(count, 10);
  if (!isNaN(badgeCount)) {
    app.setBadgeCount(badgeCount);
  }
}

// Function to clear badge
export function clearBadge() {
  app.setBadgeCount(0);
}

// Function to set progress bar
export function setProgress(progress) {
  const progressValue = parseFloat(progress);
  if (this && !isNaN(progressValue) && progressValue >= 0 && progressValue <= 1) {
    this.setProgressBar(progressValue);
  } else if (this && progress === -1) {
    this.setProgressBar(-1);
  }
}

// Function to clear progress
export function clearProgress() {
  if (this) {
    this.setProgressBar(-1);
  }
}