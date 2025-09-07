// dataSyncService.js
// Unified data synchronization service for FHIR and dashboard integration
// Handles real-time data updates and AI-generated timestamp integration

import restApiService from './restApiService';
import aiDataService from './aiDataService';
import { adaptDashboardData, adaptEncounterData } from '../utils/fhirAdapter';

class DataSyncService {
  constructor() {
    this.isConnected = false;
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.subscribers = new Set();
    this.cachedData = {
      patients: [],
      encounters: [],
      observations: [],
      alerts: [],
      analytics: {}
    };
    this.aiTimestampData = new Map(); // Store AI-generated timestamp data
  }

  /**
   * Subscribe to data updates
   * @param {Function} callback - Callback function for data updates
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      console.error('DataSyncService.subscribe: callback must be a function');
      return () => {}; // Return empty function if callback is invalid
    }
    
    this.subscribers.add(callback);
    return () => {
      try {
        this.subscribers.delete(callback);
      } catch (error) {
        console.error('Error unsubscribing from data sync service:', error);
      }
    };
  }

  /**
   * Notify all subscribers of data changes
   * @param {Object} data - Updated data
   */
  notifySubscribers(data) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in data subscriber callback:', error);
      }
    });
  }

  /**
   * Initialize data synchronization
   * @param {boolean} useFHIR - Whether to use FHIR data
   */
  async initialize(useFHIR = false) {
    try {
      this.isConnected = useFHIR && restApiService.isConnected;
      
      // Load initial data
      await this.loadDashboardData();
      await this.loadAnalyticsData();
      
      // Start periodic sync if using FHIR
      if (this.isConnected) {
        this.startPeriodicSync();
      }
      
      console.log('DataSyncService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DataSyncService:', error);
      throw error;
    }
  }

  /**
   * Load dashboard data from FHIR or mock sources
   */
  async loadDashboardData() {
    try {
      let rawData;
      
      if (this.isConnected) {
        // Fetch from FHIR server
        rawData = await restApiService.getDashboardData();
        console.log('Loaded FHIR dashboard data');
      } else {
        // Load mock data
        const response = await fetch('/mock-data/ed-summary.json');
        rawData = await response.json();
        console.log('Loaded mock dashboard data');
      }
      
      // Adapt only when using mock; REST path already returns UI-shaped data
      const adaptedData = this.isConnected
        ? rawData
        : adaptDashboardData(rawData, false);
      
      // Enhance with AI timestamp data
      const enhancedData = await this.enhanceWithAITimestamps(adaptedData);
      
      // Update cache
      this.cachedData = {
        ...this.cachedData,
        ...enhancedData
      };
      
      // Notify subscribers
      this.notifySubscribers(this.cachedData);
      
      this.lastSyncTime = new Date();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      throw error;
    }
  }

  /**
   * Load analytics data
   */
  async loadAnalyticsData() {
    try {
      const response = await fetch('/mock-data/department-analytics.json');
      const analyticsData = await response.json();
      
      this.cachedData.analytics = analyticsData;
      this.notifySubscribers(this.cachedData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  }

  /**
   * Enhance data with AI-generated timestamps
   * @param {Object} data - Original data
   * @returns {Object} Enhanced data with AI timestamps
   */
  async enhanceWithAITimestamps(data) {
    try {
      // Simulate AI-generated timestamp data
      // In production, this would call an AI service
      const aiTimestamps = await this.generateAITimestamps(data);
      
      // Enhance patient data with AI timestamps
      if (data.patients) {
        data.patients = data.patients.map(patient => ({
          ...patient,
          aiTimestamps: aiTimestamps[patient.id] || [],
          lastAITimestamp: this.getLatestAITimestamp(aiTimestamps[patient.id])
        }));
      }
      
      // Enhance encounters with AI timeline data
      if (data.encounters) {
        data.encounters = data.encounters.map(encounter => ({
          ...encounter,
          aiTimeline: aiTimestamps[encounter.patientId] || [],
          timelineEvents: this.generateTimelineEvents(encounter, aiTimestamps[encounter.patientId])
        }));
      }
      
      return data;
    } catch (error) {
      console.error('Failed to enhance data with AI timestamps:', error);
      return data;
    }
  }

  /**
   * Generate AI timestamps for patients using AI Data Service
   * @param {Object} data - Patient data
   * @returns {Object} AI timestamp data
   */
  async generateAITimestamps(data) {
    const aiTimestamps = {};
    
    if (data.patients) {
      for (const patient of data.patients) {
        try {
          // Use AI service to generate enhanced timeline data
          const aiTimelineData = await aiDataService.generatePatientTimeline(patient);
          aiTimestamps[patient.id] = aiTimelineData.timelineEvents || [];
          
          // Store additional AI insights
          this.cachedData.aiInsights = this.cachedData.aiInsights || {};
          this.cachedData.aiInsights[patient.id] = {
            insights: aiTimelineData.insights,
            recommendations: aiTimelineData.recommendations,
            confidence: aiTimelineData.confidence,
            generatedAt: aiTimelineData.generatedAt
          };
        } catch (error) {
          console.error(`Failed to generate AI data for patient ${patient.id}:`, error);
          // Fallback to simple timestamp generation
          aiTimestamps[patient.id] = this.generatePatientAITimestamps(patient);
        }
      }
    }
    
    return aiTimestamps;
  }

  /**
   * Generate AI timestamps for a specific patient
   * @param {Object} patient - Patient data
   * @returns {Array} AI timestamp events
   */
  generatePatientAITimestamps(patient) {
    const now = new Date();
    const timestamps = [];
    
    // Generate realistic medical timeline events
    const events = [
      { type: 'admission', description: 'Patient admitted to emergency department', priority: 'high' },
      { type: 'vital_check', description: 'Vital signs checked', priority: 'medium' },
      { type: 'lab_order', description: 'Laboratory tests ordered', priority: 'medium' },
      { type: 'imaging', description: 'Diagnostic imaging scheduled', priority: 'high' },
      { type: 'consultation', description: 'Specialist consultation requested', priority: 'high' },
      { type: 'medication', description: 'Medication administered', priority: 'medium' },
      { type: 'discharge_plan', description: 'Discharge planning initiated', priority: 'low' }
    ];
    
    // Generate 3-7 random events for the patient
    const numEvents = Math.floor(Math.random() * 5) + 3;
    const selectedEvents = events.sort(() => 0.5 - Math.random()).slice(0, numEvents);
    
    selectedEvents.forEach((event, index) => {
      const eventTime = new Date(now.getTime() - (index * 15 + Math.random() * 30) * 60000);
      timestamps.push({
        id: `ai_${patient.id}_${index}`,
        timestamp: eventTime,
        type: event.type,
        description: event.description,
        priority: event.priority,
        source: 'ai_generated',
        confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
        patientId: patient.id,
        status: Math.random() > 0.2 ? 'completed' : 'pending'
      });
    });
    
    return timestamps.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get the latest AI timestamp for a patient
   * @param {Array} timestamps - AI timestamps array
   * @returns {Object|null} Latest timestamp
   */
  getLatestAITimestamp(timestamps) {
    if (!timestamps || timestamps.length === 0) return null;
    return timestamps[0]; // Already sorted by timestamp desc
  }

  /**
   * Generate timeline events from encounter and AI data
   * @param {Object} encounter - Encounter data
   * @param {Array} aiTimestamps - AI timestamp data
   * @returns {Array} Timeline events
   */
  generateTimelineEvents(encounter, aiTimestamps = []) {
    const events = [];
    
    // Add encounter events
    if (encounter.startTime) {
      events.push({
        id: `encounter_${encounter.id}_start`,
        timestamp: new Date(encounter.startTime),
        type: 'encounter_start',
        description: 'Encounter started',
        priority: 'high',
        source: 'fhir',
        patientId: encounter.patientId
      });
    }
    
    // Add AI-generated events
    events.push(...aiTimestamps);
    
    // Add encounter end event
    if (encounter.endTime) {
      events.push({
        id: `encounter_${encounter.id}_end`,
        timestamp: new Date(encounter.endTime),
        type: 'encounter_end',
        description: 'Encounter completed',
        priority: 'high',
        source: 'fhir',
        patientId: encounter.patientId
      });
    }
    
    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Start periodic data synchronization
   */
  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Sync every 30 seconds
    this.syncInterval = setInterval(async () => {
      try {
        await this.loadDashboardData();
        console.log('Periodic sync completed');
      } catch (error) {
        console.error('Periodic sync failed:', error);
      }
    }, 30000);
  }

  /**
   * Stop periodic synchronization
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get patient timeline with AI enhancement
   * @param {string} patientId - Patient ID
   * @returns {Array} Enhanced timeline
   */
  async getPatientTimeline(patientId) {
    try {
      let timelineData;
      
      if (this.isConnected) {
        // Get FHIR encounter data
        timelineData = await restApiService.getPatientTimeline(patientId);
      } else {
        // Load mock encounter data
        const response = await fetch(`/mock-data/encounter-${patientId.padStart(3, '0')}.json`);
        timelineData = await response.json();
      }
      
      // Adapt encounter data
      const adaptedTimeline = timelineData.map(enc => adaptEncounterData(enc, this.isConnected));
      
      // Enhance with AI timestamps
      const aiTimestamps = this.aiTimestampData.get(patientId) || [];
      const enhancedTimeline = adaptedTimeline.map(encounter => ({
        ...encounter,
        aiTimeline: aiTimestamps,
        timelineEvents: this.generateTimelineEvents(encounter, aiTimestamps)
      }));
      
      return enhancedTimeline;
    } catch (error) {
      console.error('Failed to get patient timeline:', error);
      return [];
    }
  }

  /**
   * Update AI timestamp data for a patient
   * @param {string} patientId - Patient ID
   * @param {Array} timestamps - New timestamp data
   */
  updateAITimestamps(patientId, timestamps) {
    this.aiTimestampData.set(patientId, timestamps);
    
    // Update cached data
    if (this.cachedData.patients) {
      const patientIndex = this.cachedData.patients.findIndex(p => p.id === patientId);
      if (patientIndex !== -1) {
        this.cachedData.patients[patientIndex].aiTimestamps = timestamps;
        this.cachedData.patients[patientIndex].lastAITimestamp = this.getLatestAITimestamp(timestamps);
      }
    }
    
    // Notify subscribers
    this.notifySubscribers(this.cachedData);
  }

  /**
   * Get current cached data
   * @returns {Object} Cached data
   */
  getCachedData() {
    return this.cachedData;
  }

  /**
   * Force refresh all data
   */
  async refresh() {
    await this.loadDashboardData();
    await this.loadAnalyticsData();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopPeriodicSync();
    this.subscribers.clear();
    this.aiTimestampData.clear();
  }
}

// Create singleton instance
const dataSyncService = new DataSyncService();
export default dataSyncService;
