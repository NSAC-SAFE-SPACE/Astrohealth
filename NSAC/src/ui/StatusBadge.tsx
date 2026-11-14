import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle, AlertCircle, PhoneCall } from 'lucide-react';
import type { Status } from '../types';

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true
}) => {
  const { t } = useTranslation();

  const config = {
    normal: {
      bg: 'bg-[#EBF7F0]',
      border: 'border-[#2E9E6B]',
      text: 'text-[#1F7A50]',
      dot: 'bg-[#2E9E6B]',
      icon: CheckCircle2,
      label: t('status.normal')
    },
    watch: {
      bg: 'bg-[#FEF8E7]',
      border: 'border-[#D9A400]',
      text: 'text-[#8A6500]',
      dot: 'bg-[#D9A400]',
      icon: AlertTriangle,
      label: t('status.watch')
    },
    action: {
      bg: 'bg-[#FDF3E7]',
      border: 'border-[#E07B00]',
      text: 'text-[#B35F00]',
      dot: 'bg-[#E07B00]',
      icon: AlertCircle,
      label: t('status.action')
    },
    contact_flight_surgeon: {
      bg: 'bg-[#FCEBEB]',
      border: 'border-[#C93C3C]',
      text: 'text-[#A82F2F]',
      dot: 'bg-[#C93C3C]',
      icon: PhoneCall,
      label: t('status.contact_flight_surgeon')
    }
  }[status] || {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
    icon: CheckCircle2,
    label: status
  };

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
    lg: 'text-base px-4 py-2 gap-2.5'
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${config.border} ${config.text} ${sizeClasses}`}
      role="status"
    >
      <span className={`w-2 h-2 rounded-full ${config.dot}`} aria-hidden="true" />
      {showIcon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  );
};
