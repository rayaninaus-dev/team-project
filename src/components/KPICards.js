import React from 'react';
import { Users, Clock, Activity, Bed, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * KPI Cards Component
 * 
 * Displays key performance indicators for the emergency department.
 * 
 * FHIR Alignment:
 * - Total patients corresponds to FHIR Patient resource count
 * - Waiting patients aligns with FHIR Encounter resources with status 'in-progress'
 * - Wait times derived from FHIR Encounter.period timestamps
 * - Bed occupancy relates to FHIR Location resources with type 'bd' (bed)
 * - Critical alerts map to FHIR Flag resources with priority 'high'
 */

// A small helper for the FHIR tag styling
const MedicalTag = ({ children, className = '' }) => (
    <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${className}`}>
        {children}
    </span>
);


const KPICard = ({ title, value, icon: Icon, trend, color, subtitle, trendDirection, fhirTag }) => {
  const trendColorClass = trendDirection === 'down' ? 'text-medical-danger' : 'text-medical-success';
  const TrendIcon = trendDirection === 'down' ? TrendingDown : TrendingUp;
  
  return (
    // Card container with vertical flex layout and a minimum height for consistency
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between min-h-[150px] hover:shadow-md transition-shadow duration-300">
      
      {/* Top Section: Icon, Title, and FHIR Tag */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Icon with a soft background color */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.replace('text-', 'bg-')}/10`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <span className="font-semibold text-medical-neutral">{title}</span>
        </div>
        {fhirTag && (
          <MedicalTag className="bg-slate-100 text-slate-500">
            {fhirTag}
          </MedicalTag>
        )}
      </div>
      
      {/* Middle Section: Main Value */}
      <div className="my-2">
        <p className="text-4xl font-bold text-medical-dark">{value}</p>
      </div>

      {/* Bottom Section: Subtitle and Trend, with fixed height for alignment */}
      <div className="flex items-end justify-between text-sm h-5">
        {subtitle ? (
          <p className="text-medical-neutral">{subtitle}</p>
        ) : (
          <span /> // Placeholder to maintain alignment
        )}
        
        {trend && (
          <div className={`flex items-center gap-1 font-medium ${trendColorClass}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const KPICards = ({ kpis }) => {
  const kpiItems = [
    {
      title: 'Total Patients',
      value: kpis.totalPatients,
      icon: Users,
      color: 'text-medical-primary',
      trend: '+12%',
      trendDirection: 'up',
      fhirTag: 'Patient'
    },
    {
      title: 'Waiting Patients',
      value: kpis.waitingPatients,
      icon: Clock,
      color: 'text-medical-accent',
      subtitle: 'Active queue',
      fhirTag: 'Encounter'
    },
    {
      title: 'Avg Wait Time',
      value: `${kpis.averageWaitTime}m`,
      icon: Activity,
      color: 'text-medical-secondary',
      trend: '-8%',
      trendDirection: 'down',
      fhirTag: 'Encounter.period'
    },
    {
      title: 'Bed Occupancy',
      value: `${kpis.bedOccupancy}%`,
      icon: Bed,
      color: 'text-medical-success',
      subtitle: 'System-wide',
      fhirTag: 'Location'
    },
    {
      title: 'Critical Alerts',
      value: kpis.criticalAlerts,
      icon: AlertTriangle,
      color: 'text-medical-danger',
      subtitle: 'Requires attention',
      fhirTag: 'Flag'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {kpiItems.map((item, index) => (
        <KPICard key={index} {...item} />
      ))}
    </div>
  );
};

export default KPICards;