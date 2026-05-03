const GOVERNANCE_ACTIVITY_PATTERN = /workspace|member|role|invite|invited|joined|removed|delete|deleted|archive|permission|settings|logged in|login|password|profile|account|security/i;

const isGovernanceActivity = (activity = {}) => {
  const message = activity.action || activity.message || '';
  return GOVERNANCE_ACTIVITY_PATTERN.test(message);
};

const canViewGovernanceActivity = (role = '') => ['owner', 'admin'].includes(String(role).toLowerCase());

const filterActivitiesForRole = (activities = [], role = '', userId = '') => {
  if (canViewGovernanceActivity(role)) return activities;

  return activities.filter((activity) => {
    if (!isGovernanceActivity(activity)) return true;

    const actorId = String(activity.userId || activity.user?._id || activity.user || '');
    return actorId && actorId === String(userId);
  });
};

module.exports = {
  canViewGovernanceActivity,
  filterActivitiesForRole,
  isGovernanceActivity,
};
