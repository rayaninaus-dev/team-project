// ClinicalRecords.js
import React, { useState } from 'react';
import { FileText, Calendar, User, Search, Filter, Download, X } from 'lucide-react';

const ClinicalRecords = ({ data, fhirConnected = false }) => {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Use FHIR data if available, otherwise fall back to mock data
  const recordsData = fhirConnected && data?.patients ? 
    data.patients.map(patient => ({
      id: patient.id,
      patientName: patient.name,
      patientId: patient.id,
      recordType: 'Patient Record',
      doctor: 'Dr. System',
      date: new Date().toISOString().split('T')[0],
      status: 'Completed',
      department: 'Emergency',
      priority: patient.priority === 'critical' ? 'High' : 'Medium',
      content: `Patient ${patient.name} (${patient.id}) - ${patient.age} years old, ${patient.gender}. Current status: ${patient.status || 'Under treatment'}.`,
      diagnosis: patient.diagnosis || 'Under evaluation',
      treatment: patient.treatment || 'Ongoing treatment',
      notes: patient.notes || 'No additional notes available.'
    })) : [
    {
      id: '1',
      patientName: 'John Doe',
      patientId: 'P001',
      recordType: 'Admission Note',
      doctor: 'Dr. Smith',
      date: '2024-01-15',
      status: 'Completed',
      department: 'Emergency',
      priority: 'High',
      content: 'Patient John Doe (P001) - 45 years old, Male. Presenting with chest pain and shortness of breath. Vital signs stable.',
      diagnosis: 'Acute myocardial infarction',
      treatment: 'Cardiac monitoring, oxygen therapy, pain management',
      notes: 'Patient responded well to initial treatment. Family notified.'
    },
    {
      id: '2',
      patientName: 'Jane Smith',
      patientId: 'P002',
      recordType: 'Discharge Summary',
      doctor: 'Dr. Johnson',
      date: '2024-01-15',
      status: 'Pending Review',
      department: 'Emergency',
      priority: 'Medium',
      content: 'Patient Jane Smith (P002) - 32 years old, Female. Treated for minor injuries from accident.',
      diagnosis: 'Minor contusions and abrasions',
      treatment: 'Wound cleaning, bandaging, pain relief',
      notes: 'Patient stable, ready for discharge pending final review.'
    },
    {
      id: '3',
      patientName: 'Bob Johnson',
      patientId: 'P003',
      recordType: 'Progress Note',
      doctor: 'Dr. Brown',
      date: '2024-01-14',
      status: 'Draft',
      department: 'Emergency',
      priority: 'Low',
      content: 'Patient Bob Johnson (P003) - 67 years old, Male. Under observation for fever and respiratory symptoms.',
      diagnosis: 'Respiratory infection (under evaluation)',
      treatment: 'Antibiotics, fever management, monitoring',
      notes: 'Patient condition improving. Continue current treatment plan.'
    },
    {
      id: '4',
      patientName: 'Alice Wilson',
      patientId: 'P004',
      recordType: 'Lab Results',
      doctor: 'Dr. Davis',
      date: '2024-01-14',
      status: 'Completed',
      department: 'Emergency',
      priority: 'High',
      content: 'Patient Alice Wilson (P004) - 28 years old, Female. Lab results show elevated markers.',
      diagnosis: 'Elevated inflammatory markers',
      treatment: 'Further testing, monitoring',
      notes: 'Results require immediate attention. Specialist consultation needed.'
    }
  ];

  const displayData = recordsData;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-100';
      case 'Pending Review': return 'text-yellow-600 bg-yellow-100';
      case 'Draft': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredRecords = displayData.filter(record => {
    const matchesSearch = record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.recordType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.doctor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    const matchesType = filterType === 'all' || record.recordType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const handleEditRecord = (record) => {
    setEditingRecord({ ...record });
    setIsEditModalOpen(true);
  };

  const handleSaveRecord = () => {
    // In a real app, this would save to the backend
    console.log('Saving record:', editingRecord);
    alert('Record saved successfully');
    setIsEditModalOpen(false);
    setEditingRecord(null);
  };

  const handleDeleteRecord = (recordId) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      console.log('Deleting record:', recordId);
      alert('Record deleted successfully');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-medical-dark">Clinical Records</h2>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="clinical-card rounded-xl shadow-clinical p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
          >
            <option value="all">All Status</option>
            <option value="Completed">Completed</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Draft">Draft</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
          >
            <option value="all">All Types</option>
            <option value="Admission Note">Admission Note</option>
            <option value="Discharge Summary">Discharge Summary</option>
            <option value="Progress Note">Progress Note</option>
            <option value="Lab Results">Lab Results</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="clinical-card rounded-xl shadow-clinical overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Record Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{record.patientName}</div>
                        <div className="text-sm text-gray-500">ID: {record.patientId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{record.recordType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.doctor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{record.date}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(record.priority)}`}>
                      {record.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleViewRecord(record)}
                      className="text-medical-primary hover:text-medical-primary/80 mr-3"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => handleEditRecord(record)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteRecord(record.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredRecords.length === 0 && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No records found matching your criteria.</p>
        </div>
      )}

      {/* View Record Modal */}
      {isViewModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-medical-dark">View Record</h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Patient Name</label>
                    <p className="text-gray-900">{selectedRecord.patientName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Patient ID</label>
                    <p className="text-gray-900">{selectedRecord.patientId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Record Type</label>
                    <p className="text-gray-900">{selectedRecord.recordType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Doctor</label>
                    <p className="text-gray-900">{selectedRecord.doctor}</p>
                </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date</label>
                    <p className="text-gray-900">{selectedRecord.date}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedRecord.status)}`}>
                      {selectedRecord.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Content</label>
                  <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">{selectedRecord.content}</p>
              </div>
                    <div>
                  <label className="text-sm font-medium text-gray-600">Diagnosis</label>
                  <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">{selectedRecord.diagnosis}</p>
                    </div>
                    <div>
                  <label className="text-sm font-medium text-gray-600">Treatment</label>
                  <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">{selectedRecord.treatment}</p>
                    </div>
                    <div>
                  <label className="text-sm font-medium text-gray-600">Notes</label>
                  <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">{selectedRecord.notes}</p>
                </div>
              </div>
            </div>
                    </div>
                  </div>
      )}

      {/* Edit Record Modal */}
      {isEditModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-medical-dark">Edit Record</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
                    </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Patient Name</label>
                    <input
                      type="text"
                      value={editingRecord.patientName}
                      onChange={(e) => setEditingRecord({...editingRecord, patientName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Record Type</label>
                    <select
                      value={editingRecord.recordType}
                      onChange={(e) => setEditingRecord({...editingRecord, recordType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    >
                      <option value="Admission Note">Admission Note</option>
                      <option value="Discharge Summary">Discharge Summary</option>
                      <option value="Progress Note">Progress Note</option>
                      <option value="Lab Results">Lab Results</option>
                    </select>
                    </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Doctor</label>
                    <input
                      type="text"
                      value={editingRecord.doctor}
                      onChange={(e) => setEditingRecord({...editingRecord, doctor: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={editingRecord.status}
                      onChange={(e) => setEditingRecord({...editingRecord, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    >
                      <option value="Completed">Completed</option>
                      <option value="Pending Review">Pending Review</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Content</label>
                  <textarea
                    value={editingRecord.content}
                    onChange={(e) => setEditingRecord({...editingRecord, content: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Diagnosis</label>
                  <input
                    type="text"
                    value={editingRecord.diagnosis}
                    onChange={(e) => setEditingRecord({...editingRecord, diagnosis: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Treatment</label>
                  <textarea
                    value={editingRecord.treatment}
                    onChange={(e) => setEditingRecord({...editingRecord, treatment: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
                  <textarea
                    value={editingRecord.notes}
                    onChange={(e) => setEditingRecord({...editingRecord, notes: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecord}
                className="px-4 py-2 bg-medical-primary text-white rounded-md hover:bg-medical-primary/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalRecords;
