import React from 'react';
import {
  Clock,
  CheckCircle2,
  CheckCheck,
  XCircle,
  AlertTriangle,
  Truck,
  UserCheck,
  ShieldCheck,
  Activity,
  RotateCcw
} from 'lucide-react';

export const StatusBadge = ({ status, tripStatus, showIcon = true, size = 12 }) => {
  const normalized = (status || '').toUpperCase().replace(/ /g, '_');
  let statusClass = 'status-pending';
  let IconComponent = Clock;

  switch (normalized) {
    case 'ASSIGNED':
      statusClass = 'status-assigned';
      IconComponent = UserCheck;
      break;
    case 'ACCEPTED':
    case 'CONFIRMED':
      statusClass = 'status-accepted';
      IconComponent = CheckCircle2;
      break;
    case 'COMPLETED':
      statusClass = 'status-completed';
      IconComponent = CheckCheck;
      break;
    case 'RESOLVED':
      statusClass = 'status-resolved';
      IconComponent = CheckCheck;
      break;
    case 'REJECTED':
      statusClass = 'status-rejected';
      IconComponent = XCircle;
      break;
    case 'CANCELLED':
      statusClass = 'status-rejected';
      IconComponent = AlertTriangle;
      break;
    case 'NO_SHOW':
      statusClass = 'status-rejected';
      IconComponent = AlertTriangle;
      break;
    case 'FOLLOW_UP':
      statusClass = 'status-pending';
      IconComponent = RotateCcw;
      break;
    case 'AVAILABLE':
      statusClass = 'status-accepted';
      IconComponent = ShieldCheck;
      break;
    case 'ON_DUTY':
      statusClass = 'status-assigned';
      IconComponent = Truck;
      break;
    case 'OFFLINE':
      statusClass = 'status-rejected';
      IconComponent = XCircle;
      break;
    case 'SCHEDULED':
    case 'PENDING':
    default:
      statusClass = 'status-pending';
      IconComponent = Clock;
      break;
  }

  const displayText = tripStatus
    ? `${normalized.replace(/_/g, ' ')} • ${tripStatus.replace(/_/g, ' ')}`
    : normalized.replace(/_/g, ' ');

  return (
    <span
      className={`status-badge ${statusClass}`}
      role="status"
      aria-label={`Status: ${displayText}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontWeight: 600,
        letterSpacing: '0.02em'
      }}
    >
      {showIcon && <IconComponent size={size} aria-hidden="true" style={{ flexShrink: 0 }} />}
      <span>{displayText}</span>
    </span>
  );
};
