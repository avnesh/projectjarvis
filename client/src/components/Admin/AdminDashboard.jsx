import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as authService from '../../services/authService';
import { getAuthToken } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [monitoringData, setMonitoringData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user has admin role
  if (!user || user.role !== 'admin') {
    return <Navigate to="/chat" replace />;
  }

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch('/api/admin/monitor', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }
      
      const data = await response.json();
      setMonitoringData(data.monitoring);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (isHealthy) => {
    return isHealthy ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (isHealthy) => {
    return isHealthy ? '🟢' : '🔴';
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!monitoringData) {
    return (
      <div className="admin-dashboard">
        <div className="error-container">
          <h2>No Data</h2>
          <p>No monitoring data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>🤖 AI Model Monitoring Dashboard</h1>
        <p className="timestamp">Last updated: {new Date(monitoringData.timestamp).toLocaleString()}</p>
      </div>

      <div className="dashboard-grid">
        {/* Current Model Status */}
        <div className="dashboard-card">
          <h3>Current Model</h3>
          <div className="current-model">
            <span className="model-name">{monitoringData.currentModel}</span>
            <span className={`status ${getStatusColor(monitoringData.predictions[monitoringData.currentModel]?.isHealthy)}`}>
              {getStatusIcon(monitoringData.predictions[monitoringData.currentModel]?.isHealthy)} Active
            </span>
          </div>
        </div>

        {/* Model Health Overview */}
        <div className="dashboard-card">
          <h3>Model Health Status</h3>
          <div className="model-status-grid">
            {monitoringData.availableModels.map(model => {
              const prediction = monitoringData.predictions[model];
              const usage = monitoringData.usageStats[model];
              const quota = monitoringData.quotas[model];
              
              return (
                <div key={model} className="model-status-item">
                  <div className="model-header">
                    <span className="model-name">{model}</span>
                    <span className={`status ${getStatusColor(prediction?.isHealthy)}`}>
                      {getStatusIcon(prediction?.isHealthy)}
                    </span>
                  </div>
                  
                  <div className="model-details">
                    <div className="usage-info">
                      <span>Requests: {usage.requestsMade}/{quota.maxRequests || '∞'}</span>
                      {quota.maxTokens && (
                        <span>Tokens: {usage.tokensUsed.toLocaleString()}/{quota.maxTokens.toLocaleString()}</span>
                      )}
                    </div>
                    
                    {prediction?.minutesLeft && prediction.minutesLeft < Infinity && (
                      <div className="prediction-info">
                        <span>Expires in: {Math.round(prediction.minutesLeft)}min</span>
                        {prediction.nextSwitchTo && (
                          <span>Next: {prediction.nextSwitchTo}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quota Status */}
        <div className="dashboard-card">
          <h3>Quota Status</h3>
          <div className="quota-status">
            {Object.entries(monitoringData.quotaStatus).map(([model, exceeded]) => (
              <div key={model} className="quota-item">
                <span className="model-name">{model}</span>
                <span className={`quota-status ${exceeded ? 'exceeded' : 'available'}`}>
                  {exceeded ? '🔴 Exceeded' : '🟢 Available'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Test Results */}
        <div className="dashboard-card">
          <h3>Model Test Results</h3>
          <div className="test-results">
            {Object.entries(monitoringData.modelTestResults).map(([model, result]) => (
              <div key={model} className="test-item">
                <span className="model-name">{model}</span>
                <div className="test-details">
                  <span className={`test-status ${result.working ? 'working' : 'failed'}`}>
                    {result.working ? '✅ Working' : '❌ Failed'}
                  </span>
                  {result.lastTested && (
                    <span className="test-time">
                      {new Date(result.lastTested).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <button onClick={fetchMonitoringData} className="refresh-button">
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
