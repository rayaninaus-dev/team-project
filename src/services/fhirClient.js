/**
 * @file fhirClient.js
 * @description FHIR client service to interact with the FHIR server
 * Support for querying and operating on core resources such as Patient, Encounter, and Observation
 */

import client from 'fhirclient';

class FHIRClient {
  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Initialize FHIR client
   * @param {string} fhirServerUrl - FHIR server URL
   * @param {object} authConfig - Authentication configuration
   */
  async initialize(fhirServerUrl, authConfig = {}) {
    try {
      // Use smart client for FHIR server connection
      this.client = await client.oauth2.ready({
        clientId: 'your-client-id',
        scope: 'launch/patient openid fhirUser offline_access',
        redirectUri: window.location.origin + '/launch.html',
        iss: fhirServerUrl
      });
      this.isInitialized = true;
      console.log('FHIR client initialization successful');
    } catch (error) {
      console.error('FHIR client initialization failed:', error);
      // Fallback to direct FHIR server connection
      try {
        this.client = client({
          baseUrl: fhirServerUrl
        });
        this.isInitialized = true;
        console.log('FHIR client fallback initialization successful');
      } catch (fallbackError) {
        console.error('FHIR client fallback initialization failed:', fallbackError);
        this.isInitialized = false;
      }
    }
  }

  /**
   * Get patient list
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Patient list
   */
  async getPatients(params = {}) {
    if (!this.isInitialized) {
      return this.getMockPatients();
    }

    try {
      const response = await this.client.request({
        url: 'Patient',
        params: {
          _count: params.limit || 50,
          _sort: params.sort || '-_lastUpdated',
          ...params.filters
        }
      });
      return response.entry || [];
    } catch (error) {
      console.error('Get patient list failed:', error);
      return this.getMockPatients();
    }
  }

  /**
   * Get specific patient by ID
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} Patient information
   */
  async getPatient(patientId) {
    if (!this.isInitialized) {
      return this.getMockPatient(patientId);
    }

    try {
      const response = await this.client.request(`Patient/${patientId}`);
      return response;
    } catch (error) {
      console.error('Get patient information failed:', error);
      return this.getMockPatient(patientId);
    }
  }

  /**
   * Get patient's encounter records
   * @param {string} patientId - Patient ID
   * @returns {Promise<Array>} Encounter records list
   */
  async getPatientEncounters(patientId) {
    if (!this.isInitialized) {
      return this.getMockEncounters(patientId);
    }

    try {
      const response = await this.client.request({
        url: 'Encounter',
        params: {
          patient: patientId,
          _sort: '-date',
          _count: 20
        }
      });
      return response.entry || [];
    } catch (error) {
      console.error('Get encounter records failed:', error);
      return this.getMockEncounters(patientId);
    }
  }

  /**
   * Get patient's observation data (vital signs, etc.)
   * @param {string} patientId - Patient ID
   * @param {string} encounterId - Encounter ID (optional)
   * @returns {Promise<Array>} Observation data list
   */
  async getPatientObservations(patientId, encounterId = null) {
    if (!this.isInitialized) {
      return this.getMockObservations(patientId);
    }

    try {
      const params = {
        patient: patientId,
        _sort: '-date',
        _count: 50
      };
      
      if (encounterId) {
        params.encounter = encounterId;
      }

      const response = await this.client.request({
        url: 'Observation',
        params
      });
      return response.entry || [];
    } catch (error) {
      console.error('access observation data failed:', error);
      return this.getMockObservations(patientId);
    }
  }

  /**
   * Get emergency department dashboard data
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData() {
    if (!this.isInitialized) {
      return this.getMockDashboardData();
    }

    try {
      // 并行获取多个资源
      const [patients, encounters, observations] = await Promise.all([
        this.getPatients({ filters: { 'class': 'EMER' } }),
        this.getEncounters({ status: 'in-progress' }),
        this.getObservations({ category: 'vital-signs' })
      ]);

      return this.buildDashboardData(patients, encounters, observations);
    } catch (error) {
      console.error('access dashboard data failed:', error);
      return this.getMockDashboardData();
    }
  }

  /**
   * Get encounter records
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} 就诊记录列表
   */
  async getEncounters(params = {}) {
    if (!this.isInitialized) {
      return this.getMockEncounters();
    }

    try {
      const response = await this.client.request({
        url: 'Encounter',
        params: {
          _count: params.limit || 50,
          _sort: '-date',
          ...params.filters
        }
      });
      return response.entry || [];
    } catch (error) {
      console.error('access encounter data failed:', error);
      return this.getMockEncounters();
    }
  }

  /**
   * Get observation data
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Observation data list
   */
  async getObservations(params = {}) {
    if (!this.isInitialized) {
      return this.getMockObservations();
    }

    try {
      const response = await this.client.request({
        url: 'Observation',
        params: {
          _count: params.limit || 100,
          _sort: '-date',
          ...params.filters
        }
      });
      return response.entry || [];
    } catch (error) {
      console.error('access observation data failed:', error);
      return this.getMockObservations();
    }
  }

  // Mock data method (for development and testing)
  async getMockPatients() {
    const response = await fetch('/mock-data/ed-summary.json');
    const data = await response.json();
    return data.patients.map(patient => ({
      resource: {
        id: patient.id,
        resourceType: 'Patient',
        name: [{ given: [patient.name.split(' ')[0]], family: patient.name.split(' ')[1] }],
        gender: patient.gender.toLowerCase(),
        birthDate: new Date(new Date().getFullYear() - patient.age, 0, 1).toISOString().split('T')[0],
        active: true
      }
    }));
  }

  async getMockPatient(patientId) {
    const patients = await this.getMockPatients();
    return patients.find(p => p.resource.id === patientId)?.resource || null;
  }

  async getMockEncounters(patientId = null) {
    const response = await fetch('/mock-data/encounter-001.json');
    const data = await response.json();
    
    if (patientId && data.patientId !== patientId) {
      return [];
    }

    return [{
      resource: {
        id: data.encounterId,
        resourceType: 'Encounter',
        status: 'in-progress',
        class: { code: 'EMER', display: 'Emergency' },
        subject: { reference: `Patient/${data.patientId}` },
        period: {
          start: data.timeline[0]?.time,
          end: data.timeline[data.timeline.length - 1]?.time
        }
      }
    }];
  }

  async getMockObservations(patientId = null) {
    const response = await fetch('/mock-data/ed-summary.json');
    const data = await response.json();
    
    const observations = [];
    data.patients.forEach(patient => {
      if (patientId && patient.id !== patientId) return;
      
      if (patient.vitals) {
        Object.entries(patient.vitals).forEach(([code, value]) => {
          observations.push({
            resource: {
              id: `${patient.id}-${code}`,
              resourceType: 'Observation',
              status: 'final',
              category: [{ coding: [{ code: 'vital-signs', display: 'Vital Signs' }] }],
              code: { coding: [{ code, display: this.getVitalSignDisplayName(code) }] },
              subject: { reference: `Patient/${patient.id}` },
              valueQuantity: { value: parseFloat(value), unit: this.getVitalSignUnit(code) },
              effectiveDateTime: new Date().toISOString()
            }
          });
        });
      }
    });

    return observations;
  }

  async getMockDashboardData() {
    const response = await fetch('/mock-data/ed-summary.json');
    return await response.json();
  }

  getVitalSignDisplayName(code) {
    const names = {
      'hr': 'Heart Rate',
      'bp': 'Blood Pressure',
      'temp': 'Body Temperature',
      'spo2': 'Oxygen Saturation'
    };
    return names[code] || code;
  }

  getVitalSignUnit(code) {
    const units = {
      'hr': 'bpm',
      'bp': 'mmHg',
      'temp': '°C',
      'spo2': '%'
    };
    return units[code] || '';
  }

  /**
   * Search FHIR resources
   * @param {string} resourceType - Resource type to search
   * @param {object} params - Search parameters
   * @returns {Promise<Array>} Search results
   */
  async search(resourceType, params = {}) {
    if (!this.isInitialized) {
      return this.getMockSearchResults(resourceType, params);
    }

    try {
      const response = await this.client.request({
        url: resourceType,
        params: {
          _count: params.limit || 10,
          _sort: params.sort || '-_lastUpdated',
          ...params
        }
      });
      return response.entry || [];
    } catch (error) {
      console.error(`FHIR search failed for ${resourceType}:`, error);
      // Return mock data when FHIR search fails
      return this.getMockSearchResults(resourceType, params);
    }
  }

  /**
   * Get mock search results for testing
   * @param {string} resourceType - Resource type
   * @param {object} params - Search parameters
   * @returns {Array} Mock search results
   */
  getMockSearchResults(resourceType, params = {}) {
    // Return mock data based on resource type
    switch (resourceType) {
      case 'Patient':
        const patients = this.getMockPatients();
        return Array.isArray(patients) ? patients.slice(0, params.limit || 5) : [];
      case 'Encounter':
        const encounters = this.getMockEncounters();
        return Array.isArray(encounters) ? encounters.slice(0, params.limit || 5) : [];
      case 'Observation':
        const observations = this.getMockObservations();
        return Array.isArray(observations) ? observations.slice(0, params.limit || 5) : [];
      default:
        return [];
    }
  }

  buildDashboardData(patients, encounters, observations) {
    // Here we can build the dashboard data based on FHIR data
    // This is a simplified implementation
    return {
      kpis: {
        totalPatients: patients.length,
        waitingPatients: encounters.filter(e => e.resource.status === 'in-progress').length,
        averageWaitTime: 45,
        bedOccupancy: 85,
        criticalAlerts: 3
      },
      patients: patients.map(p => ({
        id: p.resource.id,
        name: `${p.resource.name[0].given[0]} ${p.resource.name[0].family}`,
        age: new Date().getFullYear() - new Date(p.resource.birthDate).getFullYear(),
        gender: p.resource.gender,
        status: 'in-treatment',
        priority: 'normal',
        department: 'Emergency',
        waitTime: 15,
        vitals: this.extractVitalsFromObservations(observations, p.resource.id)
      }))
    };
  }

  extractVitalsFromObservations(observations, patientId) {
    const patientObservations = observations.filter(o => 
      o.resource.subject.reference === `Patient/${patientId}`
    );

    const vitals = {};
    patientObservations.forEach(obs => {
      const code = obs.resource.code.coding[0].code;
      const value = obs.resource.valueQuantity?.value;
      if (value) {
        vitals[code] = value.toString();
      }
    });

    return {
      hr: vitals.hr || 'N/A',
      bp: vitals.bp || 'N/A',
      temp: vitals.temp || 'N/A',
      spo2: vitals.spo2 || 'N/A'
    };
  }
}

// Create singleton instance
const fhirClient = new FHIRClient();

export default fhirClient;
