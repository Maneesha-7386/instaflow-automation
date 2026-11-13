import React from 'react';

const CHIP_STYLES = {
  scheduled: { class: 'c-br', label: 'Scheduled' },
  publishing: { class: 'c-wn animate-pulse', label: 'Publishing…' },
  draft: { class: 'c-mu', label: 'Draft' },
  published: { class: 'c-ok', label: 'Published' },
  failed: { class: 'c-er', label: 'Failed' },
  success: { class: 'c-ok', label: 'Success' },
  running: { class: 'c-wn', label: 'Running' },
  connected: { class: 'c-ok', label: 'Connected' },
  reconnect_needed: { class: 'c-er', label: 'Reconnect needed' },
  active: { class: 'c-ok', label: 'On' },
  paused: { class: 'c-mu', label: 'Paused' },
};

export default function StatusChip({ status, customLabel }) {
  const normStatus = (status || '').toLowerCase().replace(/\s+/g, '_');
  const config = CHIP_STYLES[normStatus] || { class: 'c-mu', label: status };

  return (
    <span className={`chip ${config.class}`}>
      {customLabel || config.label}
    </span>
  );
}

