// src/components/LoadingIndicator.tsx
import React from 'react';

interface LoadingIndicatorProps {
    message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = 'Loading...' }) => {
    return (
        <div className="spinner-container" data-testid="loading-indicator">
            <div className="spinner"></div>
            <p className="loading-text">{message}</p>
        </div>
    );
};

export default LoadingIndicator;
