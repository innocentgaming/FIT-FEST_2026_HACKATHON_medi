import React from 'react';

export const StatusBadge = ({ status, tripStatus }) => {
  const normalized = (status || '').toUpperCase();
  let statusClass = 'status-pending';

  switch (normalized) {
    case 'ASSIGNED':
      statusClass = 'status-assigned';
      break;
    case 'ACCEPTED':
    case 'CONFIRMED':
      statusClass = 'status-accepted';
      break;
    case 'COMPLETED':
      statusClass = 'status-completed';
      break;
    case 'REJECTED':
    case 'CANCELLED':
    case 'NO_SHOW':
      statusClass = 'status-rejected';
      break;
    case 'RESOLVED':
      statusClass = 'status-resolved';
      break;
    case 'SCHEDULED':
      statusClass = 'status-pending';
      break;
    default:
      statusClass = 'status-pending';
  }

  return (
    <span className={`status-badge ${statusClass}`}>
      <span className="status-dot" aria-hidden="true"></span>
      {tripStatus ? `${normalized} (${tripStatus.replace(/_/g, ' ')})` : normalized.replace(/_/g, ' ')}
    </span>
  );
};
