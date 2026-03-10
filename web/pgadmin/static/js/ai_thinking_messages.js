/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';

// Fun elephant-themed processing messages (avoid anything that sounds
// like a real database operation, as that can be misleading).
const THINKING_MESSAGES = [
  gettext('Consulting the elephant...'),
  gettext('Joining the herds...'),
  gettext('Querying the watering hole...'),
  gettext('Rolling back the peanuts...'),
  gettext('Trumpeting for answers...'),
  gettext('Herding the elephants...'),
  gettext('Foraging for ideas...'),
  gettext('Pondering pachyderm thoughts...'),
  gettext('Charging through the tall grass...'),
  gettext('Flapping those big ears...'),
  gettext('Stomping through the jungle...'),
  gettext('Swishing the trunk...'),
  gettext('Calling the herd...'),
  gettext('Splashing in the watering hole...'),
  gettext('Following the elephant trail...'),
  gettext('Munching on some peanuts...'),
  gettext('Doing a trunk stand...'),
  gettext('Remembering everything...'),
  gettext('Migrating across the plains...'),
  gettext('Shaking off the dust...'),
  gettext('Tiptoeing through the tulips...'),
  gettext('Taking a mud bath...'),
  gettext('Polishing the tusks...'),
  gettext('Stretching the trunk...'),
  gettext('Packing the trunk...'),
  gettext('Wading through the river...'),
  gettext('Gathering the herd...'),
  gettext('Tromping through the underbrush...'),
  gettext('Listening with big ears...'),
  gettext('Raising the trunk in triumph...'),
  gettext('Thundering across the savanna...'),
  gettext('Napping under the baobab tree...'),
];

export function getRandomThinkingMessage() {
  return THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];
}
