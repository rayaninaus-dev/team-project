// VitalMonitoring.js
import React from 'react';
import { Heart, Activity, Thermometer, Droplets, Gauge } from 'lucide-react';

const VitalMonitoring = ({ data, fhirConnected = false }) => {
  // Use FHIR data if available, otherwise fall back to mock data
  const vitalsData = fhirConnected && data?.patients ? 
    data.patients.map(patient => ({
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      status: patient.priority === 'critical' ? 'Critical' : 
              patient.priority === 'high' ? 'Warning' : 'Stable',
      vitals: patient.vitals || {
        hr: 'N/A',
        bp: 'N/A',
        temp: 'N/A',
        rr: 'N/A',
        spo2: 'N/A'
      },
      lastUpdate: 'Just now'
    })) : [
    {
      id: '1',
      name: 'John Doe',
      age: 45,
      gender: 'Male',
      status: 'Critical',
      vitals: {
        hr: 120,
        bp: '150/95',
        temp: 38.5,
        rr: 22,
        spo2: 92
      },
      lastUpdate: '2 min ago'
    },
    {
      id: '2',
      name: 'Jane Smith',
      age: 32,
      gender: 'Female',
      status: 'Stable',
      vitals: {
        hr: 85,
        bp: '120/80',
        temp: 36.8,
        rr: 16,
        spo2: 98
      },
      lastUpdate: '5 min ago'
    },
    {
      id: '3',
      name: 'Bob Johnson',
      age: 67,
      gender: 'Male',
      status: 'Warning',
      vitals: {
        hr: 95,
        bp: '140/90',
        temp: 37.2,
        rr: 18,
        spo2: 94
      },
      lastUpdate: '1 min ago'
    }
  ];

  const displayData = vitalsData;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Critical': return 'text-red-600 bg-red-100';
      case 'Warning': return 'text-yellow-600 bg-yellow-100';
      case 'Stable': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getVitalColor = (type, value) => {
    // Simple vital sign color coding
    if (type === 'hr') {
      if (value > 100 || value < 60) return 'text-red-600';
      if (value > 90 || value < 70) return 'text-yellow-600';
      return 'text-green-600';
    }
    if (type === 'spo2') {
      if (value < 95) return 'text-red-600';
      if (value < 98) return 'text-yellow-600';
      return 'text-green-600';
    }
    if (type === 'temp') {
      if (value > 38 || value < 36) return 'text-red-600';
      if (value > 37.5 || value < 36.5) return 'text-yellow-600';
      return 'text-green-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-medical-dark">Vital Signs Monitoring</h2>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayData.map((patient) => (
          <div key={patient.id} className="clinical-card rounded-xl shadow-clinical p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-medical-dark">{patient.name}</h3>
                <p className="text-sm text-gray-600">{patient.age} years, {patient.gender}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                {patient.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <div>
                  <div className="text-xs text-gray-500">Heart Rate</div>
                  <div className={`font-semibold ${getVitalColor('hr', patient.vitals.hr)}`}>
                    {patient.vitals.hr} bpm
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-xs text-gray-500">Blood Pressure</div>
                  <div className={`font-semibold ${getVitalColor('bp', patient.vitals.bp)}`}>
                    {patient.vitals.bp} mmHg
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-xs text-gray-500">Temperature</div>
                  <div className={`font-semibold ${getVitalColor('temp', patient.vitals.temp)}`}>
                    {patient.vitals.temp}°C
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-xs text-gray-500">Respiratory Rate</div>
                  <div className="font-semibold text-gray-700">
                    {patient.vitals.rr} /min
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 col-span-2">
                <Droplets className="w-4 h-4 text-cyan-500" />
                <div>
                  <div className="text-xs text-gray-500">SpO2</div>
                  <div className={`font-semibold ${getVitalColor('spo2', patient.vitals.spo2)}`}>
                    {patient.vitals.spo2}%
                  </div>
                </div>
              </div>
                  </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Last update: {patient.lastUpdate}
                      </div>
                      </div>
                    </div>
        ))}
        </div>
    </div>
  );
};

export default VitalMonitoring;
