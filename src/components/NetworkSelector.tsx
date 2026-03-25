// src/components/NetworkSelector.tsx
import React from 'react';
import { NETWORKS, type NetworkKey } from '../integration/contractIntegration';

interface NetworkSelectorProps {
  value: NetworkKey;
  onChange: (network: NetworkKey) => void;
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="network-selector">
      <span className="network-label">Network:</span>
      <select
        className="network-select"
        value={value}
        onChange={(e) => onChange(e.target.value as NetworkKey)}
        aria-label="Select network"
      >
        {(Object.keys(NETWORKS) as NetworkKey[]).map((key) => (
          <option key={key} value={key}>
            {NETWORKS[key].label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default NetworkSelector;
