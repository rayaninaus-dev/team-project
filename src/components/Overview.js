// Overview.js

import React from 'react';
import KPICards from './KPICards';
import PatientList from './PatientList';

const Overview = ({ data, filters, onPatientClick, onTimelineClick, onEnhancedTimelineClick }) => {
  const filteredPatients = data.patients.filter(patient => {
    if (filters.status !== 'all' && patient.status !== filters.status) return false;
    if (filters.priority !== 'all' && patient.priority !== filters.priority) return false;
    if (filters.department !== 'all' && patient.department !== filters.department) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <KPICards kpis={data.kpis} />
      <PatientList 
        patients={filteredPatients} 
        onPatientClick={onPatientClick}
        onTimelineClick={onTimelineClick}
        onEnhancedTimelineClick={onEnhancedTimelineClick}
      />
    </div>
  );
};

export default Overview;