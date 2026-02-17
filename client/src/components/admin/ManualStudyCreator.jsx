// ========================================
// FILE: client/src/components/admin/ManualStudyCreator.jsx
// ========================================

import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, AlertCircle, CheckCircle, Loader, Package, Info, FileImage, FolderArchive } from 'lucide-react';
import api from '../../services/api';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth'; // ✅ IMPORT useAuth

const ManualStudyCreator = ({ isOpen, onClose, onSuccess }) => {
    const { currentUser } = useAuth(); // ✅ GET CURRENT USER
    const isLabStaff = currentUser?.role === 'lab_staff'; // ✅ CHECK IF LAB STAFF
    
    const [step, setStep] = useState(1); // 1: Mode Selection, 2: Form/Upload, 3: Progress
    const [uploadMode, setUploadMode] = useState(null); // 'images' or 'zip'
    
    const [formData, setFormData] = useState({
        // Patient Information (only for images mode)
        patientName: '',
        patientId: '',
        patientBirthDate: '',
        patientSex: 'M',
        patientAge: '',
        
        // Study Information (only for images mode)
        studyDescription: '',
        seriesDescription: '',
        modality: 'CT',
        bodyPartExamined: '',
        accessionNumber: '',
        
        // Lab & Organization (both modes)
        labId: '',
        organizationId: '',
        
        // Clinical Information (only for images mode)
        clinicalHistory: '',
        referringPhysician: '',
        
        // Metadata (only for images mode)
        institutionName: 'XCENTIC Medical Center',
        urgency: 'routine'
    });
    
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [selectedZip, setSelectedZip] = useState(null);
    const [availableLabs, setAvailableLabs] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResult, setUploadResult] = useState(null);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            // ✅ NEW: Auto-set lab for lab_staff users
            if (isLabStaff && currentUser.lab) {
                console.log('🔐 Lab Staff detected - auto-setting lab:', currentUser.lab);
                setFormData(prev => ({
                    ...prev,
                    labId: currentUser.lab._id,
                    organizationId: currentUser.organization?._id || currentUser.organizationId,
                    institutionName: currentUser.lab.name || 'XCENTIC Medical Center'
                }));
                // Don't fetch labs for lab_staff - they can't change it
            } else {
                // For admin/super_admin, fetch available labs
                fetchLabs();
            }
            resetForm();
        }
    }, [isOpen, isLabStaff, currentUser]);

    const fetchLabs = async () => {
        try {
            const response = await api.get('/admin/labs');
            if (response.data.success) {
                setAvailableLabs(response.data.data);
                
                // Auto-select first lab if available (for non-lab_staff users)
                if (response.data.data.length > 0 && !isLabStaff) {
                    setFormData(prev => ({
                        ...prev,
                        labId: response.data.data[0]._id,
                        organizationId: response.data.data[0].organization,
                        institutionName: response.data.data[0].name || 'XCENTIC Medical Center'
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching labs:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleLabChange = (e) => {
        const labId = e.target.value;
        const selectedLab = availableLabs.find(lab => lab._id === labId);
        
        if (selectedLab) {
            setFormData(prev => ({
                ...prev,
                labId: labId,
                organizationId: selectedLab.organization,
                institutionName: selectedLab.name || 'XCENTIC Medical Center'
            }));
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
        setErrors(prev => ({ ...prev, files: null }));
    };

    const handleZipFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedZip(file);
            setErrors(prev => ({ ...prev, zip: null }));
        }
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (uploadMode === 'images') {
            // Validate required fields for images mode
            if (!formData.patientName.trim()) {
                newErrors.patientName = 'Patient name is required';
            }
            if (!formData.patientId.trim()) {
                newErrors.patientId = 'Patient ID is required';
            }
            if (!formData.labId) {
                newErrors.labId = 'Lab selection is required';
            }
            if (!formData.modality) {
                newErrors.modality = 'Modality is required';
            }
            if (selectedFiles.length === 0) {
                newErrors.files = 'At least one image file is required';
            }
        } else if (uploadMode === 'zip') {
            // Validate required fields for ZIP mode
            if (!formData.labId) {
                newErrors.labId = 'Lab selection is required';
            }
            if (!selectedZip) {
                newErrors.zip = 'ZIP file is required';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setStep(3);
        setUploading(true);
        setUploadProgress(0);

        try {
            const formDataToSend = new FormData();
            
            // Add upload mode
            formDataToSend.append('uploadMode', uploadMode);
            
            // Add lab and organization info (both modes)
            formDataToSend.append('labId', formData.labId);
            formDataToSend.append('organizationId', formData.organizationId);

            if (uploadMode === 'images') {
                // Add all form data for images mode
                Object.keys(formData).forEach(key => {
                    if (formData[key] && key !== 'labId' && key !== 'organizationId') {
                        formDataToSend.append(key, formData[key]);
                    }
                });

                // Add image files
                selectedFiles.forEach(file => {
                    formDataToSend.append('images', file);
                });
            } else if (uploadMode === 'zip') {
                // Only add ZIP file for zip mode
                formDataToSend.append('zipFile', selectedZip);
            }

            const response = await api.post('/admin/create-manual-study', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                }
            });

            setUploading(false);
            setUploadResult({
                success: true,
                message: response.data.message,
                data: response.data.data
            });

            // Call success callback if provided
            if (onSuccess) {
                onSuccess(response.data.data);
            }

        } catch (error) {
            console.error('Error creating study:', error);
            setUploading(false);
            setUploadResult({
                success: false,
                message: error.response?.data?.message || 'Failed to create study. Please try again.',
                error: error.response?.data?.error
            });
        }
    };

    const resetForm = () => {
        setStep(1);
        setUploadMode(null);
        
        // ✅ UPDATED: Preserve lab info for lab_staff users
        const baseFormData = {
            patientName: '',
            patientId: '',
            patientBirthDate: '',
            patientSex: 'M',
            patientAge: '',
            studyDescription: '',
            seriesDescription: '',
            modality: 'CT',
            bodyPartExamined: '',
            accessionNumber: '',
            clinicalHistory: '',
            referringPhysician: '',
            institutionName: 'XCENTIC Medical Center',
            urgency: 'routine'
        };
        
        if (isLabStaff && currentUser?.lab) {
            // Keep lab info for lab_staff
            setFormData({
                ...baseFormData,
                labId: currentUser.lab._id,
                organizationId: currentUser.organization?._id || currentUser.organizationId,
                institutionName: currentUser.lab.name || 'XCENTIC Medical Center'
            });
        } else {
            // Reset everything for admin
            setFormData({
                ...baseFormData,
                labId: availableLabs.length > 0 ? availableLabs[0]._id : '',
                organizationId: availableLabs.length > 0 ? availableLabs[0].organization : ''
            });
        }
        
        setSelectedFiles([]);
        setSelectedZip(null);
        setUploading(false);
        setUploadProgress(0);
        setUploadResult(null);
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Background overlay */}
            <div 
                className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" 
                onClick={handleClose}
            ></div>

            {/* Center wrapper */}
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                {/* Modal panel - needs relative and higher z-index */}
                <div className="relative z-10 w-full max-w-4xl bg-white rounded-lg shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-600 to-green-600">
                        <div>
                            <h2 className="text-xl font-bold text-white">Create Manual Study</h2>
                            {/* ✅ NEW: Show lab name for lab_staff */}
                            {isLabStaff && currentUser?.lab && (
                                <p className="text-sm text-teal-100 mt-1">
                                    📍 Lab: {currentUser.lab.name}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Progress Indicator */}
                    <div className="px-6 py-4 bg-gray-50 border-b">
                        <div className="flex items-center justify-between">
                            <div className={`flex items-center ${step >= 1 ? 'text-teal-600' : 'text-gray-400'}`}>
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                                    1
                                </div>
                                <span className="ml-2 text-sm font-medium">Choose Mode</span>
                            </div>
                            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-teal-600' : 'bg-gray-200'}`}></div>
                            <div className={`flex items-center ${step >= 2 ? 'text-teal-600' : 'text-gray-400'}`}>
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                                    2
                                </div>
                                <span className="ml-2 text-sm font-medium">Upload</span>
                            </div>
                            <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-teal-600' : 'bg-gray-200'}`}></div>
                            <div className={`flex items-center ${step >= 3 ? 'text-teal-600' : 'text-gray-400'}`}>
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                                    3
                                </div>
                                <span className="ml-2 text-sm font-medium">Complete</span>
                            </div>
                        </div>
                    </div>

                    {/* Content - with proper scrolling */}
                    <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                        {/* Step 1: Mode Selection */}
                        {step === 1 && (
                            <div className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Upload Mode</h3>
                                    <p className="text-sm text-gray-600">Choose how you want to upload your study</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* ZIP Mode */}
                                    <button
                                        onClick={() => {
                                            setUploadMode('zip');
                                            setStep(2);
                                        }}
                                        className="group relative p-8 border-2 border-gray-300 rounded-xl hover:border-teal-500 hover:shadow-lg transition-all duration-200 text-left"
                                    >
                                        <div className="flex flex-col items-center text-center space-y-4">
                                            <div className="p-4 bg-teal-50 rounded-full group-hover:bg-teal-100 transition-colors">
                                                <FolderArchive className="h-12 w-12 text-teal-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-gray-900 mb-2">ZIP File Upload</h4>
                                                <p className="text-sm text-gray-600">
                                                    Upload DICOM files in ZIP format
                                                </p>
                                            </div>
                                            <div className="w-full pt-4 border-t border-gray-200">
                                                <ul className="text-xs text-gray-600 space-y-2">
                                                    <li className="flex items-center">
                                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                                        <span>Automatic metadata extraction</span>
                                                    </li>
                                                    <li className="flex items-center">
                                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                                        <span>No manual data entry required</span>
                                                    </li>
                                                    <li className="flex items-center">
                                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                                        <span>Upload entire study at once</span>
                                                    </li>
                                                    <li className="flex items-center">
                                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                                        <span>{isLabStaff ? 'Auto-assigned to your lab' : 'Only lab selection needed'}</span>
                                                    </li>
                                                </ul>
                                            </div>
                                            <div className="absolute top-4 right-4">
                                                <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
                                                    RECOMMENDED
                                                </span>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Images Mode */}
                                    <button
                                        onClick={() => {
                                            setUploadMode('images');
                                            setStep(2);
                                        }}
                                        className="group relative p-8 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
                                    >
                                        <div className="flex flex-col items-center text-center space-y-4">
                                            <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                                                <FileImage className="h-12 w-12 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-gray-900 mb-2">Image Files Upload</h4>
                                                <p className="text-sm text-gray-600">
                                                    Upload individual image files (PNG, JPG, etc.)
                                                </p>
                                            </div>
                                            <div className="w-full pt-4 border-t border-gray-200">
                                                <ul className="text-xs text-gray-600 space-y-2">
                                                    <li className="flex items-center">
                                                        <AlertCircle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />
                                                        <span>Manual patient data entry required</span>
                                                    </li>
                                                    <li className="flex items-center">
                                                        <AlertCircle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />
                                                        <span>Manual study information required</span>
                                                    </li>
                                                    <li className="flex items-center">
                                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                                        <span>Converts images to DICOM</span>
                                                    </li>
                                                    <li className="flex items-center">
                                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                                        <span>Supports any image format</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                                        <div className="text-sm text-blue-800">
                                            <p className="font-medium">💡 Tip</p>
                                            <p className="mt-1">
                                                If you have DICOM files, use <strong>ZIP File Upload</strong> for fastest processing with automatic extraction. 
                                                Use <strong>Image Files Upload</strong> only for converting non-DICOM images (photos, scans, etc.).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Upload Form */}
                        {step === 2 && (
                            <div className="p-6 space-y-6">
                                {/* ZIP MODE - Simplified Form */}
                                {uploadMode === 'zip' && (
                                    <div className="space-y-6">
                                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-start">
                                            <FolderArchive className="h-5 w-5 text-teal-600 mr-3 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-teal-800">
                                                <p className="font-semibold mb-1">ZIP File Upload Mode</p>
                                                <p>Patient and study information will be automatically extracted from DICOM files.</p>
                                            </div>
                                        </div>

                                        {/* ✅ UPDATED: Conditional Lab Selection */}
                                        {isLabStaff ? (
                                            // Read-only lab display for lab_staff
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Assigned Lab
                                                </label>
                                                <div className="w-full px-4 py-2 border-2 border-teal-300 bg-teal-50 rounded-lg text-teal-900 font-semibold flex items-center">
                                                    <Package className="h-5 w-5 mr-2" />
                                                    {currentUser?.lab?.name || 'Unknown Lab'}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    📍 Studies will be automatically assigned to your lab
                                                </p>
                                            </div>
                                        ) : (
                                            // Dropdown for admin/super_admin
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Select Lab <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={formData.labId}
                                                    onChange={handleLabChange}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                    required
                                                >
                                                    <option value="">Select lab...</option>
                                                    {availableLabs.map(lab => (
                                                        <option key={lab._id} value={lab._id}>{lab.name}</option>
                                                    ))}
                                                </select>
                                                {errors.labId && (
                                                    <p className="text-red-500 text-xs mt-1">{errors.labId}</p>
                                                )}
                                            </div>
                                        )}

                                        {/* ZIP File Upload */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Upload ZIP File <span className="text-red-500">*</span>
                                            </label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                                <input
                                                    type="file"
                                                    accept=".zip"
                                                    onChange={handleZipFileChange}
                                                    className="hidden"
                                                    id="zip-upload"
                                                />
                                                <label htmlFor="zip-upload" className="cursor-pointer">
                                                    <FolderArchive className="mx-auto h-16 w-16 text-teal-600" />
                                                    <p className="mt-3 text-sm text-gray-600 font-medium">
                                                        Click to select a ZIP file
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        ZIP files containing DICOM studies (max 500MB)
                                                    </p>
                                                </label>
                                            </div>
                                            {errors.zip && (
                                                <p className="text-red-500 text-xs mt-1">{errors.zip}</p>
                                            )}

                                            {/* Selected ZIP File */}
                                            {selectedZip && (
                                                <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            <FolderArchive className="h-8 w-8 text-teal-600" />
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{selectedZip.name}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {(selectedZip.size / 1024 / 1024).toFixed(2)} MB
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setSelectedZip(null)}
                                                            className="text-red-500 hover:text-red-700"
                                                            type="button"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* IMAGES MODE - Full Form (same as before but with conditional lab selection) */}
                                {uploadMode === 'images' && (
                                    <div className="space-y-6">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
                                            <FileImage className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-blue-800">
                                                <p className="font-semibold mb-1">Image Files Upload Mode</p>
                                                <p>You need to manually enter patient and study information.</p>
                                            </div>
                                        </div>

                                        {/* Patient Information */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Patient Information</h3>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Patient Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="patientName"
                                                        value={formData.patientName}
                                                        onChange={handleInputChange}
                                                        placeholder="John Doe"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        required
                                                    />
                                                    {errors.patientName && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.patientName}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Patient ID <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="patientId"
                                                        value={formData.patientId}
                                                        onChange={handleInputChange}
                                                        placeholder="P12345"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        required
                                                    />
                                                    {errors.patientId && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.patientId}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Date of Birth
                                                    </label>
                                                    <input
                                                        type="date"
                                                        name="patientBirthDate"
                                                        value={formData.patientBirthDate}
                                                        onChange={handleInputChange}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Gender
                                                    </label>
                                                    <select
                                                        name="patientSex"
                                                        value={formData.patientSex}
                                                        onChange={handleInputChange}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="M">Male</option>
                                                        <option value="F">Female</option>
                                                        <option value="O">Other</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Age (Years)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        name="patientAge"
                                                        value={formData.patientAge}
                                                        onChange={handleInputChange}
                                                        placeholder="30"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Study Information */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Study Information</h3>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* ✅ UPDATED: Conditional Lab Selection (same as ZIP mode) */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        {isLabStaff ? 'Assigned Lab' : 'Select Lab'} <span className="text-red-500">*</span>
                                                    </label>
                                                    {isLabStaff ? (
                                                        <div className="w-full px-4 py-2 border-2 border-blue-300 bg-blue-50 rounded-lg text-blue-900 font-semibold flex items-center">
                                                            <Package className="h-5 w-5 mr-2" />
                                                            {currentUser?.lab?.name || 'Unknown Lab'}
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={formData.labId}
                                                            onChange={handleLabChange}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            required
                                                        >
                                                            <option value="">Select lab...</option>
                                                            {availableLabs.map(lab => (
                                                                <option key={lab._id} value={lab._id}>{lab.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {errors.labId && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.labId}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Modality <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        name="modality"
                                                        value={formData.modality}
                                                        onChange={handleInputChange}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        required
                                                    >
                                                        <option value="CT">CT - Computed Tomography</option>
                                                        <option value="MR">MR - Magnetic Resonance</option>
                                                        <option value="CR">CR - Computed Radiography</option>
                                                        <option value="DX">DX - Digital Radiography</option>
                                                        <option value="US">US - Ultrasound</option>
                                                        <option value="XA">XA - X-Ray Angiography</option>
                                                        <option value="OT">OT - Other</option>
                                                    </select>
                                                    {errors.modality && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.modality}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Study Description
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="studyDescription"
                                                        value={formData.studyDescription}
                                                        onChange={handleInputChange}
                                                        placeholder="e.g., Chest CT"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Body Part Examined
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="bodyPartExamined"
                                                        value={formData.bodyPartExamined}
                                                        onChange={handleInputChange}
                                                        placeholder="e.g., Chest"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Accession Number
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="accessionNumber"
                                                        value={formData.accessionNumber}
                                                        onChange={handleInputChange}
                                                        placeholder="Auto-generated if empty"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Referring Physician
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="referringPhysician"
                                                        value={formData.referringPhysician}
                                                        onChange={handleInputChange}
                                                        placeholder="Dr. Smith"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Clinical History
                                                    </label>
                                                    <textarea
                                                        name="clinicalHistory"
                                                        value={formData.clinicalHistory}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter relevant clinical history..."
                                                        rows={3}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Urgency
                                                    </label>
                                                    <select
                                                        name="urgency"
                                                        value={formData.urgency}
                                                        onChange={handleInputChange}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="routine">Routine</option>
                                                        <option value="urgent">Urgent</option>
                                                        <option value="stat">STAT</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Image Files Upload */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Upload Image Files <span className="text-red-500">*</span>
                                            </label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                    id="image-upload"
                                                />
                                                <label htmlFor="image-upload" className="cursor-pointer">
                                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                                    <p className="mt-2 text-sm text-gray-600">
                                                        Click to select image files
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        JPEG, PNG, GIF, BMP (max 50MB per file)
                                                    </p>
                                                </label>
                                            </div>
                                            {errors.files && (
                                                <p className="text-red-500 text-xs mt-1">{errors.files}</p>
                                            )}

                                            {/* Selected Files List */}
                                            {selectedFiles.length > 0 && (
                                                <div className="mt-4 space-y-2">
                                                    <p className="text-sm font-medium text-gray-700">
                                                        Selected Files: {selectedFiles.length}
                                                    </p>
                                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                                        {selectedFiles.map((file, index) => (
                                                            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                                                                <span className="text-sm truncate flex-1">{file.name}</span>
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-xs text-gray-500">
                                                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                                                    </span>
                                                                    <button
                                                                        onClick={() => removeFile(index)}
                                                                        className="text-red-500 hover:text-red-700"
                                                                        type="button"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-between pt-4 border-t">
                                    <button
                                        onClick={() => {
                                            setStep(1);
                                            setUploadMode(null);
                                        }}
                                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={
                                            (uploadMode === 'images' && selectedFiles.length === 0) ||
                                            (uploadMode === 'zip' && !selectedZip) ||
                                            !formData.labId
                                        }
                                        className={`px-6 py-2 rounded-lg text-white transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${
                                            uploadMode === 'zip' 
                                                ? 'bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700' 
                                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                                        }`}
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        {uploadMode === 'zip' ? 'Upload & Extract' : 'Create Study'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Progress/Result (remains the same) */}
                        {step === 3 && (
                            <div className="p-6">
                                {uploading && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center">
                                            <Loader className="h-12 w-12 text-teal-600 animate-spin" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {uploadMode === 'zip' ? 'Extracting & Processing...' : 'Uploading...'}
                                                </span>
                                                <span className="text-sm text-gray-600">{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-center text-gray-600">
                                            {uploadMode === 'zip' 
                                                ? 'Extracting DICOM files and uploading to server...'
                                                : 'Converting images to DICOM and uploading to server...'
                                            }
                                        </p>
                                    </div>
                                )}

                                {uploadResult && (
                                    <div className={`rounded-lg p-6 ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                {uploadResult.success ? (
                                                    <CheckCircle className="h-10 w-10 text-green-500" />
                                                ) : (
                                                    <AlertCircle className="h-10 w-10 text-red-500" />
                                                )}
                                            </div>
                                            <div className="ml-4 flex-1">
                                                <h3 className={`text-lg font-semibold ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                                                    {uploadResult.success ? '✅ Study Created Successfully!' : '❌ Study Creation Failed'}
                                                </h3>
                                                <p className={`text-sm mt-2 ${uploadResult.success ? 'text-green-700' : 'text-red-700'}`}>
                                                    {uploadResult.message}
                                                </p>
                                                
                                                {uploadResult.success && uploadResult.data && (
                                                    <div className="mt-4 space-y-2 text-sm">
                                                        {uploadMode === 'zip' && uploadResult.data.extractedData && (
                                                            <div className="bg-white rounded-lg p-4 border border-green-300">
                                                                <p className="font-semibold text-green-900 mb-2">📊 Extraction Summary</p>
                                                                <div className="grid grid-cols-2 gap-2 text-green-700">
                                                                    <div>
                                                                        <span className="font-medium">Studies:</span> {uploadResult.data.extractedData.totalStudies}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Series:</span> {uploadResult.data.extractedData.totalSeries}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Instances:</span> {uploadResult.data.extractedData.totalInstances}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {uploadMode === 'images' && (
                                                            <div className="bg-white rounded-lg p-4 border border-green-300 space-y-1 text-green-700">
                                                                <p><strong>Study ID:</strong> {uploadResult.data.studyId}</p>
                                                                <p><strong>Patient:</strong> {uploadResult.data.patientName}</p>
                                                                <p><strong>Accession #:</strong> {uploadResult.data.accessionNumber}</p>
                                                                {uploadResult.data.filesProcessed && (
                                                                    <p><strong>Files Processed:</strong> {uploadResult.data.filesProcessed}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                <div className="mt-6 flex space-x-3">
                                                    {uploadResult.success ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    resetForm();
                                                                }}
                                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                            >
                                                                Create Another Study
                                                            </button>
                                                            <button
                                                                onClick={handleClose}
                                                                className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                                                            >
                                                                Close
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => setStep(2)}
                                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                            >
                                                                Try Again
                                                            </button>
                                                            <button
                                                                onClick={handleClose}
                                                                className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                                            >
                                                                Close
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualStudyCreator;