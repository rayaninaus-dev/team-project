// restApiService.js
import { FHIR_RESOURCE_TYPES } from '../models/fhirTypes';

class RestApiService {
  constructor() {
    this.baseUrl = 'https://hapi.fhir.org/baseR4';
    this.isConnected = false;
  }

  /**
   * Test connection to FHIR server
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/metadata`, {
        method: 'GET',
        headers: {
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json'
        }
      });
      
      if (response.ok) {
        this.isConnected = true;
        return true;
      } else {
        this.isConnected = false;
        return false;
      }
    } catch (error) {
      console.error('REST API connection test failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Search FHIR resources using REST API
   * @param {string} resourceType - FHIR resource type
   * @param {object} params - Search parameters
   * @returns {Promise<Array>} Search results
   */
  async searchResources(resourceType, params = {}) {
    const buildUrl = (omitSort = false) => {
      const qp = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) qp.append(key, value);
      });
      if (!params._count) qp.append('_count', '10');
      if (!omitSort && !params._sort) qp.append('_sort', '-_lastUpdated');
      return `${this.baseUrl}/${resourceType}?${qp.toString()}`;
    };

    try {
      // Try with default sort
      let response = await fetch(buildUrl(false), {
        method: 'GET',
        headers: {
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json'
        }
      });

      // If server rejects parameters (e.g., _sort), retry without it
      if (!response.ok && (response.status === 400 || response.status === 422)) {
        response = await fetch(buildUrl(true), {
          method: 'GET',
          headers: {
            'Accept': 'application/fhir+json',
            'Content-Type': 'application/fhir+json'
          }
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.entry || [];
    } catch (error) {
      console.error(`REST API search failed for ${resourceType}:`, error);
      return this.getMockResources(resourceType, params);
    }
  }

  /**
   * Get specific FHIR resource by ID
   * @param {string} resourceType - FHIR resource type
   * @param {string} id - Resource ID
   * @returns {Promise<object>} Resource data
   */
  async getResource(resourceType, id) {
    try {
      const url = `${this.baseUrl}/${resourceType}/${id}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`REST API get resource failed for ${resourceType}/${id}:`, error);
      return null;
    }
  }

  /**
   * Get dashboard data from FHIR server
   * @returns {Promise<object>} Dashboard data
   */
  async getDashboardData() {
    try {
      // Get patients
      const patients = await this.searchResources(FHIR_RESOURCE_TYPES.PATIENT, { _count: 20 });
      
      // Get encounters
      const encounters = await this.searchResources(FHIR_RESOURCE_TYPES.ENCOUNTER, { _count: 20 });
      
      // Get observations
      const observations = await this.searchResources(FHIR_RESOURCE_TYPES.OBSERVATION, { _count: 50 });

      return this.buildDashboardData(patients, encounters, observations);
    } catch (error) {
      console.error('REST API get dashboard data failed:', error);
      return this.getMockDashboardData();
    }
  }

  /**
   * Get department analytics. Uses FHIR data when connected; falls back to mock file.
   * @returns {Promise<object>} Analytics data with turnaround, losStats, admittedPatients
   */
  async getAnalytics() {
    // Fallback to mock if not connected
    if (!this.isConnected) {
      try {
        const res = await fetch('/mock-data/department-analytics.json');
        return await res.json();
      } catch (e) {
        console.warn('Analytics mock load failed, returning empty analytics:', e);
        return { turnaround: {}, losStats: {}, admittedPatients: [] };
      }
    }

    try {
      // Fetch recent resources
      const [encounters, diagReports] = await Promise.all([
        this.searchResources(FHIR_RESOURCE_TYPES.ENCOUNTER, { _count: 50 }),
        this.searchResources(FHIR_RESOURCE_TYPES.DIAGNOSTIC_REPORT || 'DiagnosticReport', { _count: 100 })
      ]);

      // Compute LOS stats from Encounter.period
      const losMinutes = encounters
        .map(e => e.resource?.period)
        .filter(p => p?.start)
        .map(p => {
          const start = new Date(p.start).getTime();
          const end = p.end ? new Date(p.end).getTime() : Date.now();
          return Math.max(0, Math.round((end - start) / 60000));
        });
      const avgLosHours = losMinutes.length ? +(losMinutes.reduce((a,b)=>a+b,0)/losMinutes.length/60).toFixed(1) : 4.5;
      const medianLosHours = losMinutes.length ? +(losMinutes.sort((a,b)=>a-b)[Math.floor(losMinutes.length/2)]/60).toFixed(1) : 3.2;

      // Compute lab vs imaging turnaround from DiagnosticReports
      const deriveMinutes = (r) => {
        const eff = r.resource?.effectiveDateTime || r.resource?.effectivePeriod?.start;
        const issued = r.resource?.issued;
        if (!eff || !issued) return null;
        const start = new Date(eff).getTime();
        const end = new Date(issued).getTime();
        if (isNaN(start) || isNaN(end) || end < start) return null;
        return Math.round((end - start)/60000);
      };

      const classify = (r) => {
        const cats = r.resource?.category?.flatMap(c=>c.coding||[]) || [];
        const codes = cats.map(c=>c.code);
        const texts = (r.resource?.category||[]).map(c=>c.text?.toLowerCase()).filter(Boolean);
        if (codes.includes('RAD') || texts.some(t=>t.includes('imaging'))) return 'imaging';
        if (codes.includes('LAB') || texts.some(t=>t.includes('lab'))) return 'lab';
        return 'other';
      };

      const labDurations = [];
      const imgDurations = [];
      diagReports.forEach(r => {
        const m = deriveMinutes(r);
        if (m == null) return;
        const kind = classify(r);
        if (kind === 'imaging') imgDurations.push(m);
        else if (kind === 'lab') labDurations.push(m);
      });

      const avg = arr => arr.length ? Math.max(1, Math.round(arr.reduce((a,b)=>a+b,0)/arr.length)) : undefined;
      const labAvg = avg(labDurations);
      const imgAvg = avg(imgDurations);

      // Start from defaults but override when we have computed values
      const turnaround = this.buildTurnaroundData(encounters);
      if (labAvg !== undefined) turnaround['Pathology Request to Result'] = labAvg;
      if (imgAvg !== undefined) turnaround['Imaging Request to Reported'] = imgAvg;

      // Admitted patients sample (reuse existing helper)
      const admittedPatients = this.buildAdmittedPatients(encounters);

      return {
        turnaround,
        losStats: { average: avgLosHours, median: medianLosHours },
        admittedPatients
      };
    } catch (error) {
      console.error('REST API get analytics failed, falling back to mock:', error);
      try {
        const res = await fetch('/mock-data/department-analytics.json');
        return await res.json();
      } catch (e) {
        return { turnaround: {}, losStats: {}, admittedPatients: [] };
      }
    }
  }

  /**
   * Get patient timeline data
   * @param {string} patientId - Patient ID
   * @returns {Promise<Array>} Timeline data
   */
  async getPatientTimeline(patientId) {
    try {
      const encounters = await this.searchResources(FHIR_RESOURCE_TYPES.ENCOUNTER, {
        patient: patientId,
        _count: 10
      });

      return encounters.map(encounter => encounter.resource);
    } catch (error) {
      console.error('REST API get patient timeline failed:', error);
      return [];
    }
  }

  /**
   * Build dashboard data from FHIR resources
   * @param {Array} patients - Patient resources
   * @param {Array} encounters - Encounter resources
   * @param {Array} observations - Observation resources
   * @returns {object} Dashboard data
   */
  buildDashboardData(patients, encounters, observations) {
    const adaptedPatients = patients.map(patient => ({
      id: patient.resource.id,
      name: this.getPatientName(patient.resource),
      age: this.calculateAge(patient.resource.birthDate),
      gender: patient.resource.gender,
      status: this.getPatientStatus(patient.resource),
      priority: this.getPatientPriority(patient.resource),
      department: 'Emergency',
      waitTime: this.calculateWaitTime(patient.resource),
      vitals: this.extractVitals(observations, patient.resource.id)
    }));

    return {
      kpis: {
        totalPatients: adaptedPatients.length,
        waitingPatients: adaptedPatients.filter(p => p.status === 'waiting').length,
        averageWaitTime: this.calculateAverageWaitTime(adaptedPatients),
        bedOccupancy: this.calculateBedOccupancy(encounters),
        criticalAlerts: this.countCriticalAlerts(adaptedPatients)
      },
      patients: adaptedPatients,
      departments: this.buildDepartmentData(encounters),
      alerts: this.buildAlertsData(adaptedPatients),
      turnaround: this.buildTurnaroundData(encounters),
      losStats: this.buildLOSStats(encounters),
      admittedPatients: this.buildAdmittedPatients(encounters)
    };
  }

  /**
   * Get patient name from FHIR Patient resource
   * @param {object} patient - FHIR Patient resource
   * @returns {string} Patient name
   */
  getPatientName(patient) {
    if (patient.name && patient.name.length > 0) {
      const name = patient.name[0];
      const given = name.given ? name.given.join(' ') : '';
      const family = name.family || '';
      return `${given} ${family}`.trim();
    }
    return 'Unknown Patient';
  }

  /**
   * Calculate age from birth date
   * @param {string} birthDate - Birth date in YYYY-MM-DD format
   * @returns {number} Age in years
   */
  calculateAge(birthDate) {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Get patient status
   * @param {object} patient - FHIR Patient resource
   * @returns {string} Patient status
   */
  getPatientStatus(patient) {
    // This would be determined by active encounters
    return 'in-treatment';
  }

  /**
   * Get patient priority
   * @param {object} patient - FHIR Patient resource
   * @returns {string} Patient priority
   */
  getPatientPriority(patient) {
    // This would be determined by clinical data
    return 'normal';
  }

  /**
   * Calculate wait time
   * @param {object} patient - FHIR Patient resource
   * @returns {number} Wait time in minutes
   */
  calculateWaitTime(patient) {
    // This would be calculated from encounter data
    return Math.floor(Math.random() * 60) + 10;
  }

  /**
   * Extract vital signs from observations
   * @param {Array} observations - Observation resources
   * @param {string} patientId - Patient ID
   * @returns {object} Vital signs
   */
  extractVitals(observations, patientId) {
    const patientObservations = observations.filter(obs => 
      obs.resource.subject && 
      obs.resource.subject.reference === `Patient/${patientId}`
    );

    const vitals = {};
    patientObservations.forEach(obs => {
      const code = obs.resource.code?.coding?.[0]?.code;
      const value = obs.resource.valueQuantity?.value;
      
      if (code && value) {
        switch (code) {
          case '8867-4': // Heart rate
            vitals.hr = Math.round(value);
            break;
          case '8480-6': // Systolic BP
            vitals.bp = vitals.bp ? `${Math.round(value)}/${vitals.bp.split('/')[1]}` : `${Math.round(value)}/--`;
            break;
          case '8462-4': // Diastolic BP
            vitals.bp = vitals.bp ? `${vitals.bp.split('/')[0]}/${Math.round(value)}` : `--/${Math.round(value)}`;
            break;
          case '8310-5': // Body temperature
            vitals.temp = value.toFixed(1);
            break;
          case '2708-6': // Oxygen saturation
            vitals.spo2 = Math.round(value);
            break;
        }
      }
    });

    return {
      hr: vitals.hr || 'N/A',
      bp: vitals.bp || 'N/A',
      temp: vitals.temp || 'N/A',
      rr: 'N/A', // Respiratory rate not commonly in observations
      spo2: vitals.spo2 || 'N/A'
    };
  }

  /**
   * Calculate average wait time
   * @param {Array} patients - Patient data
   * @returns {number} Average wait time
   */
  calculateAverageWaitTime(patients) {
    if (patients.length === 0) return 0;
    const totalWaitTime = patients.reduce((sum, patient) => sum + patient.waitTime, 0);
    return Math.round(totalWaitTime / patients.length);
  }

  /**
   * Calculate bed occupancy
   * @param {Array} encounters - Encounter data
   * @returns {number} Bed occupancy percentage
   */
  calculateBedOccupancy(encounters) {
    const activeEncounters = encounters.filter(enc => 
      enc.resource.status === 'in-progress'
    ).length;
    return Math.round((activeEncounters / 20) * 100); // Assuming 20 total beds
  }

  /**
   * Count critical alerts
   * @param {Array} patients - Patient data
   * @returns {number} Number of critical alerts
   */
  countCriticalAlerts(patients) {
    return patients.filter(patient => patient.priority === 'critical').length;
  }

  /**
   * Build department data
   * @param {Array} encounters - Encounter data
   * @returns {Array} Department data
   */
  buildDepartmentData(encounters) {
    return [
      {
        name: 'Emergency Department',
        status: 'operational',
        occupancy: this.calculateBedOccupancy(encounters),
        waitTime: 25
      }
    ];
  }

  /**
   * Build alerts data
   * @param {Array} patients - Patient data
   * @returns {Array} Alerts data
   */
  buildAlertsData(patients) {
    return patients
      .filter(patient => patient.priority === 'critical')
      .map(patient => ({
        id: `alert-${patient.id}`,
        title: `Critical Patient Alert`,
        description: `Patient ${patient.name} requires immediate attention`,
        severity: 'critical',
        patient: patient.name,
        patientId: patient.id,
        timestamp: 'Just now'
      }));
  }

  /**
   * Build turnaround data
   * @param {Array} encounters - Encounter data
   * @returns {object} Turnaround data
   */
  buildTurnaroundData(encounters) {
    return {
      'Triage to Nurse': 8,
      'Triage to Doctor': 25,
      'Pathology Request to Result': 45,
      'Imaging Request to Reported': 75,
      'Admission Request to Bed': 90,
      'Bed Allocation to Departure': 20
    };
  }

  /**
   * Build length of stay statistics
   * @param {Array} encounters - Encounter data
   * @returns {object} LOS statistics
   */
  buildLOSStats(encounters) {
    return {
      average: 4.5,
      median: 3.2
    };
  }

  /**
   * Build admitted patients data
   * @param {Array} encounters - Encounter data
   * @returns {Array} Admitted patients data
   */
  buildAdmittedPatients(encounters) {
    return encounters
      .filter(enc => enc.resource.status === 'finished')
      .map(enc => ({
        id: enc.resource.id,
        name: `Patient ${enc.resource.id}`,
        department: 'Emergency',
        bedWaitTime: Math.floor(Math.random() * 120) + 60
      }));
  }

  /**
   * Get mock resources for fallback
   * @param {string} resourceType - Resource type
   * @param {object} params - Search parameters
   * @returns {Array} Mock resources
   */
  getMockResources(resourceType, params = {}) {
    // Return empty array for now - mock data will be handled by components
    return [];
  }

  /**
   * Get mock dashboard data
   * @returns {object} Mock dashboard data
   */
  async getMockDashboardData() {
    try {
      const response = await fetch('/mock-data/ed-summary.json');
      return await response.json();
    } catch (error) {
      console.error('Failed to load mock dashboard data:', error);
      return {
        kpis: { totalPatients: 0, waitingPatients: 0, averageWaitTime: 0, bedOccupancy: 0, criticalAlerts: 0 },
        patients: [],
        departments: [],
        alerts: [],
        turnaround: {},
        losStats: { average: 0, median: 0 },
        admittedPatients: []
      };
    }
  }
}

// Create singleton instance
const restApiService = new RestApiService();
export default restApiService;
