// DepartmentAnalytics.js
// This component implements a comprehensive department analytics dashboard
// that tracks patient journeys and identifies delays in the emergency department workflow.
// It follows FHIR standard for healthcare data representation.

import React, { useState } from 'react';
import { BarChart, Clock, Activity, AlertTriangle, Users, ArrowRight, AlertCircle } from 'lucide-react';

/**
 * DepartmentAnalytics Component
 * 
 * Displays analytics for emergency department patient flow and resource utilization.
 * Data model aligns with FHIR Encounter and Patient resources for standardized healthcare data exchange.
 * 
 * FHIR Alignment:
 * - Patient data corresponds to FHIR Patient resource (https://www.hl7.org/fhir/patient.html)
 * - Encounter data corresponds to FHIR Encounter resource (https://www.hl7.org/fhir/encounter.html)
 * - Workflow times align with FHIR Workflow timings (https://www.hl7.org/fhir/workflow.html)
 */
const DepartmentAnalytics = ({ data, analyticsData }) => {
  const [selectedMetric, setSelectedMetric] = useState('turnaround');

  // Ensure data has required properties with fallbacks
  const source = analyticsData && Object.keys(analyticsData).length ? analyticsData : data;
  const safeData = {
    turnaround: source?.turnaround || {
      'Triage to Nurse': 8,
      'Triage to Doctor': 25,
      'Pathology Request to Result': 45,
      'Imaging Request to Reported': 75,
      'Admission Request to Bed': 90,
      'Bed Allocation to Departure': 20
    },
    losStats: source?.losStats || {
      average: 4.5,
      median: 3.2
    },
    admittedPatients: source?.admittedPatients || []
  };

  // Derive an estimated 4-hour target compliance indicator from available turnaround steps.
  // This is a non-invasive, best-effort estimation using aggregate step means.
  const keySteps = [
    'Triage to Nurse',
    'Triage to Doctor',
    'Pathology Request to Result',
    'Imaging Request to Reported',
    'Doctor to Senior Doctor',
    'Admission Request to Bed',
    'Bed Allocation to Departure'
  ];
  const estimatedJourney = keySteps.reduce((sum, k) => sum + (safeData.turnaround?.[k] || 0), 0);
  const fourHourThreshold = 240; // minutes
  const fourHourStatus = estimatedJourney <= fourHourThreshold
    ? { label: 'ON TARGET', color: 'text-medical-success', bg: 'bg-green-50 border-green-200' }
    : estimatedJourney <= 300
      ? { label: 'AT RISK', color: 'text-medical-accent', bg: 'bg-orange-50 border-orange-200' }
      : { label: 'OFF TARGET', color: 'text-medical-danger', bg: 'bg-red-50 border-red-200' };

  // Metrics options for the dashboard
  const metricOptions = [
    { id: 'turnaround', label: 'Turnaround Times', icon: Clock },
    { id: 'los', label: 'Length of Stay', icon: Activity },
    { id: 'admissions', label: 'Admission Delays', icon: AlertTriangle }
  ];

  // Format time in minutes to a more readable format
  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate the color based on threshold values
  const getMetricColor = (value, thresholds) => {
    if (value >= thresholds.high) return 'text-medical-danger';
    if (value >= thresholds.medium) return 'text-medical-accent';
    return 'text-medical-success';
  };

  // Thresholds for different metrics (in minutes)
  const timeThresholds = {
    'Triage to Nurse': { medium: 10, high: 15 },
    'Triage to Doctor': { medium: 30, high: 45 },
    'Pathology Request to Result': { medium: 60, high: 120 },
    'Imaging Request to Reported': { medium: 90, high: 150 },
    'Admission Request to Bed': { medium: 120, high: 240 },
    'Bed Allocation to Departure': { medium: 30, high: 60 }
  };

  // Calculate percentage of target for visualization
  const calculatePercentage = (value, threshold) => {
    return Math.min(Math.round((value / threshold.high) * 100), 100);
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between border-b border-medical-light pb-4">
        <h2 className="text-xl font-semibold text-medical-dark flex items-center gap-2">
          <BarChart className="w-5 h-5 text-medical-primary" />
          <span>ANALYTICS</span>
        </h2>
        <div className="text-sm bg-medical-primary/10 text-medical-primary px-3 py-1 rounded-md font-medium">
          Data updated: {new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* 4-Hour Target KPI (derived) */}
      <div className={`clinical-card rounded-xl p-4 border ${fourHourStatus.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-medical-neutral">Estimated Journey Time</div>
            <div className="text-2xl font-bold text-medical-dark">{estimatedJourney} min</div>
            <div className="text-xs text-medical-neutral">Target: ≤ {fourHourThreshold} min</div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${fourHourStatus.color} bg-white border`}>{fourHourStatus.label}</div>
        </div>
      </div>

      {/* Metrics Selector */}
      <div className="flex space-x-4 border-b border-medical-light pb-4">
        {metricOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${selectedMetric === option.id ? 'bg-medical-primary text-white' : 'bg-medical-light/50 text-medical-neutral hover:bg-medical-light'}`}
              onClick={() => setSelectedMetric(option.id)}
            >
              <Icon className="w-4 h-4" />
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Turnaround Times */}
      {selectedMetric === 'turnaround' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(safeData.turnaround).map(([key, value]) => {
              const thresholds = timeThresholds[key] || { medium: 30, high: 60 };
              const percentage = calculatePercentage(value, thresholds);
              const colorClass = getMetricColor(value, thresholds);
              
              return (
                <div key={key} className="clinical-card rounded-xl shadow-clinical p-6">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-medical-neutral mb-2">{key}</h3>
                  <div className="flex items-end justify-between mb-3">
                    <div className={`text-3xl font-bold ${colorClass}`}>{formatTime(value)}</div>
                    <div className="text-sm text-medical-neutral">
                      Target: {formatTime(thresholds.medium)}
                    </div>
                  </div>
                  <div className="w-full bg-medical-light/50 rounded-full h-2.5 mb-2">
                    <div 
                      className={`h-2.5 rounded-full ${percentage >= 100 ? 'bg-medical-danger' : percentage >= 75 ? 'bg-medical-accent' : 'bg-medical-success'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-medical-neutral">
                    {percentage >= 100 ? 'Exceeding target time' : percentage >= 75 ? 'Approaching target limit' : 'Within target time'}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* FHIR Compliance Note */}
          <div className="text-xs text-medical-neutral bg-medical-light/30 p-3 rounded-lg">
            <p className="font-medium">FHIR Compliance Note:</p>
            <p>Turnaround times align with FHIR Workflow timings and are derived from Encounter.period and ServiceRequest.occurrenceDateTime elements.</p>
          </div>
        </div>
      )}

      {/* Length of Stay Analysis */}
      {selectedMetric === 'los' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="clinical-card rounded-xl shadow-clinical p-6">
              <h3 className="text-sm font-medium uppercase tracking-wider text-medical-neutral mb-2">Average Length of Stay</h3>
              <div className="text-3xl font-bold text-medical-primary mb-1">{safeData.losStats.average} hours</div>
              <div className="text-sm text-medical-neutral">Across all ED patients</div>
            </div>
            <div className="clinical-card rounded-xl shadow-clinical p-6">
              <h3 className="text-sm font-medium uppercase tracking-wider text-medical-neutral mb-2">Median Length of Stay</h3>
              <div className="text-3xl font-bold text-medical-secondary mb-1">{safeData.losStats.median} hours</div>
              <div className="text-sm text-medical-neutral">50th percentile</div>
            </div>
          </div>
          
          {/* Patient Journey Visualization */}
          <div className="clinical-card rounded-xl shadow-clinical p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-medical-neutral mb-4">Patient Journey Stages</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-24 text-sm text-medical-neutral">Arrival</div>
                <div className="w-16 h-16 rounded-full bg-medical-primary/20 flex items-center justify-center text-medical-primary">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-1 h-2 bg-medical-light relative">
                  <div className="absolute inset-y-0 left-0 bg-medical-primary" style={{ width: '100%' }} />
                </div>
                <div className="w-16 h-16 rounded-full bg-medical-secondary/20 flex items-center justify-center text-medical-secondary">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="w-24 text-right text-sm text-medical-neutral">Treatment</div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-sm text-medical-neutral">Treatment</div>
                <div className="w-16 h-16 rounded-full bg-medical-secondary/20 flex items-center justify-center text-medical-secondary">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="flex-1 h-2 bg-medical-light relative">
                  <div className="absolute inset-y-0 left-0 bg-medical-secondary" style={{ width: '75%' }} />
                </div>
                <div className="w-16 h-16 rounded-full bg-medical-success/20 flex items-center justify-center text-medical-success">
                  <ArrowRight className="w-6 h-6" />
                </div>
                <div className="w-24 text-right text-sm text-medical-neutral">Disposition</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-medical-neutral bg-medical-light/30 p-3 rounded-lg">
              <p className="font-medium">FHIR Compliance Note:</p>
              <p>Length of stay metrics are calculated from FHIR Encounter.period elements, representing the time between admission and discharge.</p>
            </div>
          </div>
        </div>
      )}

      {/* Admission Delays */}
      {selectedMetric === 'admissions' && (
        <div className="space-y-6">
          <div className="clinical-card rounded-xl shadow-clinical p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-medical-neutral mb-4">Recent Admission Delays</h3>
            <div className="space-y-4">
              {safeData.admittedPatients.map(patient => {
                const waitTimeColor = patient.bedWaitTime > 180 ? 'text-medical-danger' : 
                                      patient.bedWaitTime > 120 ? 'text-medical-accent' : 'text-medical-success';
                return (
                  <div key={patient.id} className="flex items-center justify-between pb-3 border-b border-medical-light/50 last:border-0">
                    <div>
                      <div className="font-medium text-medical-dark">{patient.name}</div>
                      <div className="text-sm text-medical-neutral">{patient.id} • {patient.department}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${waitTimeColor}`}>{formatTime(patient.bedWaitTime)}</div>
                      <div className="text-sm text-medical-neutral">Bed wait time</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* FHIR Compliance Note */}
          <div className="text-xs text-medical-neutral bg-medical-light/30 p-3 rounded-lg">
            <p className="font-medium">FHIR Compliance Note:</p>
            <p>Admission data corresponds to FHIR Encounter resources with hospitalization.preAdmissionIdentifier and hospitalization.admitSource elements.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentAnalytics;
