// App.js

import React, { useState, useEffect } from 'react';
import { BarChart, Bell, Users, Filter, Activity, Clipboard, Heart, AlertCircle, Database, CheckCircle, XCircle } from 'lucide-react';
import Overview from './components/Overview';
import FilterPanel from './components/FilterPanel';
import TimelineModal from './components/TimelineModal';
import EnhancedTimelineModal from './components/EnhancedTimelineModal';
import DepartmentStatus from './components/DepartmentStatus';
import AlertPanel from './components/AlertPanel';
import DepartmentAnalytics from './components/DepartmentAnalytics';
import VitalMonitoring from './components/VitalMonitoring';
import ClinicalRecords from './components/ClinicalRecords';
import CriticalAlerts from './components/CriticalAlerts';
import FHIRConnectionStatus from './components/fhir/FHIRConnectionStatus';
import FHIRConnectionManager from './components/fhir/FHIRConnectionManager';
import FHIRSearchPanel from './components/fhir/FHIRSearchPanel';
import FHIRResourceViewer from './components/fhir/FHIRResourceViewer';
import FHIRTestPanel from './components/fhir/FHIRTestPanel';
import restApiService from './services/restApiService';
import dataSyncService from './services/dataSyncService';
import { adaptDashboardData, adaptEncounterData } from './utils/fhirAdapter';
import './App.css';
import './styles/medical-theme.css';

// FHIR Standard Reference: This application follows FHIR (Fast Healthcare Interoperability Resources) standards
// for healthcare data representation and exchange. Key resources used include:
// - Patient: https://www.hl7.org/fhir/patient.html
// - Encounter: https://www.hl7.org/fhir/encounter.html
// - Observation: https://www.hl7.org/fhir/observation.html

function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'vitals', 'records', 'analytics', 'alerts', 'fhir'
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    department: 'all'
  });
  const [fhirConnected, setFhirConnected] = useState(false);
  const [selectedFhirResource, setSelectedFhirResource] = useState(null);
  const [isFhirResourceOpen, setIsFhirResourceOpen] = useState(false);
  const [fhirSearchResults, setFhirSearchResults] = useState([]);
  const [fhirTestResults, setFhirTestResults] = useState([]);
  const [isEnhancedTimelineOpen, setIsEnhancedTimelineOpen] = useState(false);
  const [dataSyncStatus, setDataSyncStatus] = useState('disconnected');

  // Initialize data synchronization service
  useEffect(() => {
    let unsubscribe = null;
    
    try {
      // Subscribe to data updates
      unsubscribe = dataSyncService.subscribe((data) => {
        setDashboardData(data);
        setDataSyncStatus('connected');
      });

      // Initialize with current FHIR connection status
      dataSyncService.initialize(fhirConnected).catch(error => {
        console.error('Failed to initialize data sync service:', error);
        setDataSyncStatus('error');
      });
    } catch (error) {
      console.error('Failed to subscribe to data sync service:', error);
      setDataSyncStatus('error');
    }
    
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fhirConnected]);

  // Legacy data loading fallback
  useEffect(() => {
    const loadData = async () => {
      try {
        // Always load mock data first to ensure UI has data
        const response = await fetch('/mock-data/ed-summary.json');
        const data = await response.json();
        const adaptedData = adaptDashboardData(data, false);
        setDashboardData(adaptedData);
        console.log('Loaded mock data');

        // Try to load FHIR data if connected (without affecting existing data)
        if (fhirConnected && restApiService.isConnected) {
          try {
            const fhirData = await restApiService.getDashboardData();
            // REST service already returns UI-shaped data; do not re-adapt as FHIR bundle
            setDashboardData(fhirData);
            console.log('Updated with FHIR data via REST API');
          } catch (fhirError) {
            console.warn('FHIR data loading failed, keeping mock data:', fhirError);
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Ensure we always have some data
        setDashboardData({
          kpis: { totalPatients: 0, waitingPatients: 0, averageWaitTime: 0, bedOccupancy: 0, criticalAlerts: 0 },
          patients: [],
          departments: [],
          alerts: [],
          turnaround: {},
          losStats: { average: 0, median: 0 },
          admittedPatients: []
        });
      }
      
      // Load analytics data: prefer FHIR-derived when connected, else mock
      try {
        if (fhirConnected && restApiService.isConnected && typeof restApiService.getAnalytics === 'function') {
          const onlineAnalytics = await restApiService.getAnalytics();
          setAnalyticsData(onlineAnalytics);
          console.log('Loaded analytics from FHIR');
        } else {
          const analyticsResponse = await fetch('/mock-data/department-analytics.json');
          const analyticsData = await analyticsResponse.json();
          setAnalyticsData(analyticsData);
        }
      } catch (error) {
        console.error('Failed to load analytics data:', error);
        setAnalyticsData({});
      }
    };
    loadData();
  }, [fhirConnected]);

  const openTimeline = async (patient) => {
    try {
      let encounterData;
      
      if (fhirConnected) {
        // Get encounter data from FHIR server via REST API
        const timeline = await restApiService.getPatientTimeline(patient.id);
        if (timeline.length > 0) {
          const adaptedTimeline = adaptEncounterData(timeline[0], true);
          setSelectedPatient({ ...patient, timeline: adaptedTimeline });
        } else {
          setSelectedPatient({ ...patient, timeline: [] });
        }
      } else {
        // Use mock data
        const response = await fetch(`/mock-data/encounter-${patient.id.slice(-3)}.json`);
        const mockData = await response.json();
        const timeline = adaptEncounterData(mockData, false);
        setSelectedPatient({ ...patient, timeline });
      }
      
      setIsTimelineOpen(true);
    } catch (error) {
      console.error('Failed to load patient timeline:', error);
    }
  };

  const openEnhancedTimeline = (patient) => {
    setSelectedPatient(patient);
    setIsEnhancedTimelineOpen(true);
  };

  const closeTimeline = () => {
    setIsTimelineOpen(false);
    setSelectedPatient(null);
  };

  const handleFhirConnectionChange = (connected) => {
    setFhirConnected(connected);
  };

  const handleFhirResourceSelect = (resource) => {
    setSelectedFhirResource(resource);
    setIsFhirResourceOpen(true);
  };

  const handleFhirSearchResults = (results) => {
    setFhirSearchResults(results);
  };

  const handleFhirTestResults = (results) => {
    setFhirTestResults(results);
  };

  const closeFhirResource = () => {
    setIsFhirResourceOpen(false);
    setSelectedFhirResource(null);
  };

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-medical-light flex">
      {/* Sidebar */}
      <aside className="w-64 bg-medical-dark text-white p-6 flex flex-col">
        <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
          <Heart className="w-6 h-6 text-medical-danger" />
          <span>EMERGENCY DEPT</span>
        </h1>
        <nav className="space-y-2 mb-8">
          <button 
            onClick={() => setActiveView('overview')}
            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${activeView === 'overview' ? 'bg-medical-primary font-semibold' : 'hover:bg-medical-primary/80'}`}
          >
            <Users className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-left">Patient Overview</span>
          </button>
          <button 
            onClick={() => setActiveView('vitals')}
            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${activeView === 'vitals' ? 'bg-medical-primary font-semibold' : 'hover:bg-medical-primary/80'}`}
          >
            <Activity className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-left">Vital Monitoring</span>
          </button>
          <button 
            onClick={() => setActiveView('records')}
            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${activeView === 'records' ? 'bg-medical-primary font-semibold' : 'hover:bg-medical-primary/80'}`}
          >
            <Clipboard className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-left">Clinical Records</span>
          </button>
          <button 
            onClick={() => setActiveView('analytics')}
            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${activeView === 'analytics' ? 'bg-medical-primary font-semibold' : 'hover:bg-medical-primary/80'}`}
          >
            <BarChart className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-left">Department Analytics</span>
          </button>
          <button 
            onClick={() => setActiveView('alerts')}
            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${activeView === 'alerts' ? 'bg-medical-primary font-semibold' : 'hover:bg-medical-primary/80'}`}
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-left">Critical Alerts</span>
          </button>
          <button 
            onClick={() => setActiveView('fhir')}
            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${activeView === 'fhir' ? 'bg-medical-primary font-semibold' : 'hover:bg-medical-primary/80'}`}
          >
            <Database className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-left">FHIR Data</span>
          </button>
        </nav>
        <div className="mt-auto">
          <div className="p-3 bg-medical-primary/20 rounded-lg">
            <p className="text-xs font-medium mb-1">SYSTEM STATUS: OPERATIONAL</p>
            <p className="text-xs text-medical-light/80">
              Last updated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-medical-dark mb-2">
            {activeView === 'overview' && 'Emergency Department Dashboard'}
            {activeView === 'vitals' && 'Vital Signs Monitoring'}
            {activeView === 'records' && 'Clinical Records'}
            {activeView === 'analytics' && 'Department Analytics Dashboard'}
            {activeView === 'alerts' && 'Critical Alerts Center'}
            {activeView === 'fhir' && 'FHIR Data Explorer'}
          </h1>
          <p className="text-medical-neutral">
            {activeView === 'overview' && 'Real-time monitoring and patient management system'}
            {activeView === 'vitals' && 'Real-time vital signs monitoring for all patients'}
            {activeView === 'records' && 'Access and manage patient clinical records'}
            {activeView === 'analytics' && 'Track patient journeys and identify delays in the workflow'}
            {activeView === 'alerts' && 'Monitor and respond to critical system alerts'}
            {activeView === 'fhir' && 'Search and explore FHIR healthcare resources'}
          </p>
        </header>
        <main>
          {/* Patient Overview View */}
          {activeView === 'overview' && (
            <div className="grid grid-cols-12 gap-8">
              {/* Left Column: Main Content */}
              <div className="col-span-12 xl:col-span-9">
                            <Overview 
              data={dashboardData} 
              filters={filters}
              onPatientClick={openTimeline}
              onTimelineClick={openTimeline}
              onEnhancedTimelineClick={openEnhancedTimeline}
            />
              </div>

              {/* Right Column: Filters and Department Status */}
              <div className="col-span-12 xl:col-span-3">
                <div className="space-y-8">
                  <FilterPanel filters={filters} onFiltersChange={setFilters} />
                  <div className="clinical-card rounded-xl shadow-clinical p-6">
                    <h2 className="text-lg font-bold text-medical-dark mb-4 flex items-center gap-2">
                      <BarChart className="w-5 h-5 text-medical-primary" />
                      Department Status
                    </h2>
                    <div className="space-y-4">
                      {dashboardData.departments?.map(department => (
                        <DepartmentStatus key={department.name} department={department} />
                      ))}
                    </div>
                  </div>
                  <AlertPanel alerts={dashboardData.alerts} onDismiss={() => {}} />
                </div>
              </div>
            </div>
          )}

          {/* Department Analytics View */}
          {activeView === 'analytics' && (
            <div className="grid grid-cols-12 gap-8">
              {/* Left Column: Analytics Dashboard */}
              <div className="col-span-12 xl:col-span-9">
                <DepartmentAnalytics data={dashboardData} analyticsData={analyticsData} />
              </div>

              {/* Right Column: Department Status */}
              <div className="col-span-12 xl:col-span-3">
                <div className="space-y-8">
                  <div className="clinical-card rounded-xl shadow-clinical p-6">
                    <h2 className="text-lg font-bold text-medical-dark mb-4 flex items-center gap-2">
                      <BarChart className="w-5 h-5 text-medical-primary" />
                      Department Status
                    </h2>
                    <div className="space-y-4">
                      {dashboardData.departments?.map(department => (
                        <DepartmentStatus key={department.name} department={department} />
                      ))}
                    </div>
                  </div>
                  <AlertPanel alerts={dashboardData.alerts} onDismiss={() => {}} />
                </div>
              </div>
            </div>
          )}

          {/* Vital Monitoring View */}
          {activeView === 'vitals' && (
            <div className="grid grid-cols-12 gap-8">
              {/* Left Column: Vital Monitoring Dashboard */}
              <div className="col-span-12 xl:col-span-9">
                <VitalMonitoring data={dashboardData} fhirConnected={fhirConnected} />
              </div>

              {/* Right Column: Department Status */}
              <div className="col-span-12 xl:col-span-3">
                <div className="space-y-8">
                  <div className="clinical-card rounded-xl shadow-clinical p-6">
                    <h2 className="text-lg font-bold text-medical-dark mb-4 flex items-center gap-2">
                      <BarChart className="w-5 h-5 text-medical-primary" />
                      Department Status
                    </h2>
                    <div className="space-y-4">
                      {dashboardData.departments?.map(department => (
                        <DepartmentStatus key={department.name} department={department} />
                      ))}
                    </div>
                  </div>
                  <AlertPanel alerts={dashboardData.alerts} onDismiss={() => {}} />
                </div>
              </div>
            </div>
          )}

          {/* Clinical Records View */}
          {activeView === 'records' && (
            <div className="grid grid-cols-12 gap-8">
              {/* Left Column: Clinical Records Dashboard */}
              <div className="col-span-12 xl:col-span-9">
                <ClinicalRecords data={dashboardData} fhirConnected={fhirConnected} />
              </div>

              {/* Right Column: Department Status */}
              <div className="col-span-12 xl:col-span-3">
                <div className="space-y-8">
                  <div className="clinical-card rounded-xl shadow-clinical p-6">
                    <h2 className="text-lg font-bold text-medical-dark mb-4 flex items-center gap-2">
                      <BarChart className="w-5 h-5 text-medical-primary" />
                      Department Status
                    </h2>
                    <div className="space-y-4">
                      {dashboardData.departments?.map(department => (
                        <DepartmentStatus key={department.name} department={department} />
                      ))}
                    </div>
                  </div>
                  <AlertPanel alerts={dashboardData.alerts} onDismiss={() => {}} />
                </div>
              </div>
            </div>
          )}

          {/* Critical Alerts View */}
          {activeView === 'alerts' && (
            <div className="grid grid-cols-12 gap-8">
              {/* Left Column: Critical Alerts Dashboard */}
              <div className="col-span-12 xl:col-span-9">
                <CriticalAlerts data={dashboardData} fhirConnected={fhirConnected} />
              </div>

              {/* Right Column: Department Status */}
              <div className="col-span-12 xl:col-span-3">
                <div className="space-y-8">
                  <div className="clinical-card rounded-xl shadow-clinical p-6">
                    <h2 className="text-lg font-bold text-medical-dark mb-4 flex items-center gap-2">
                      <BarChart className="w-5 h-5 text-medical-primary" />
                      Department Status
                    </h2>
                    <div className="space-y-4">
                      {dashboardData.departments?.map(department => (
                        <DepartmentStatus key={department.name} department={department} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FHIR Data Explorer View */}
          {activeView === 'fhir' && (
            <div className="space-y-8">
              {/* FHIR Search and Test Panels */}
              <div className="grid grid-cols-12 gap-8">
                {/* Left Column: FHIR Search Panel */}
                <div className="col-span-12 xl:col-span-8">
                  <FHIRSearchPanel 
                    onSearchResults={handleFhirSearchResults}
                    onResourceSelect={handleFhirResourceSelect}
                  />
                </div>

                {/* Right Column: FHIR Connection Manager */}
                <div className="col-span-12 xl:col-span-4">
                  <div className="space-y-6">
                    <FHIRConnectionManager onConnectionChange={handleFhirConnectionChange} />
                    
                    <div className="clinical-card rounded-xl shadow-clinical p-6">
                      <h2 className="text-lg font-bold text-medical-dark mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5 text-medical-primary" />
                        FHIR Information
                      </h2>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Connection Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            fhirConnected 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {fhirConnected ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Data Source:</span>
                          <span className="ml-2 text-gray-800">
                            {fhirConnected ? 'FHIR Server' : 'Mock Data'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Search Results:</span>
                          <span className="ml-2 text-gray-800">
                            {fhirSearchResults.length} resources
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="clinical-card rounded-xl shadow-clinical p-6">
                      <h2 className="text-lg font-bold text-medical-dark mb-4 flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-medical-primary" />
                        Department Status
                      </h2>
                      <div className="space-y-4">
                        {dashboardData.departments?.map(department => (
                          <DepartmentStatus key={department.name} department={department} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

                             {/* FHIR Test Panel */}
               <div>
                 <FHIRTestPanel onTestResults={handleFhirTestResults} />
               </div>

               {/* FHIR Test Results Display */}
               {fhirTestResults.length > 0 && (
                 <div className="clinical-card rounded-xl shadow-clinical p-6">
                   <h2 className="text-lg font-bold text-medical-dark mb-4 flex items-center gap-2">
                     <Database className="w-5 h-5 text-medical-primary" />
                     Last Test Results
                   </h2>
                   <div className="space-y-3">
                     {fhirTestResults.map((result, index) => (
                       <div
                         key={index}
                         className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                       >
                         <div className="flex items-center gap-3">
                           {result.success ? (
                             <CheckCircle className="w-4 h-4 text-green-500" />
                           ) : (
                             <XCircle className="w-4 h-4 text-red-500" />
                           )}
                           <span className="font-medium text-gray-900">{result.name}</span>
                         </div>
                         <div className="text-sm text-gray-600">
                           {result.timestamp.toLocaleTimeString()}
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
            </div>
          )}
        </main>
      </div>

      {isTimelineOpen && selectedPatient && (
        <TimelineModal
          patient={selectedPatient}
          onClose={closeTimeline}
        />
      )}

      {/* Enhanced Timeline Modal */}
      {isEnhancedTimelineOpen && selectedPatient && (
        <EnhancedTimelineModal
          patient={selectedPatient}
          isOpen={isEnhancedTimelineOpen}
          onClose={() => setIsEnhancedTimelineOpen(false)}
        />
      )}

      {isFhirResourceOpen && selectedFhirResource && (
        <FHIRResourceViewer
          resource={selectedFhirResource}
          onClose={closeFhirResource}
        />
      )}
    </div>
  );
}

export default App;
