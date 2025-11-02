import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
    ArrowLeft, 
    UserPlus, 
    Mail, 
    Lock, 
    User, 
    Stethoscope, 
    Phone, 
    FileText,
    Upload,
    Save,
    AlertCircle,
    CheckCircle,
    ChevronRight,
    ChevronLeft,
    Heart,
    Shield,
    Zap,
    Star,
    Sparkles,
    Award,
    Image,
    X
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CreateDoctor = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const fileInputRef = useRef(null);
    
    // Multi-step form state
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formSubmitted, setFormSubmitted] = useState(false);
    
    // Form data
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        username: '',
        specialization: '',
        licenseNumber: '',
        department: '',
        qualifications: [],
        yearsOfExperience: '',
        contactPhoneOffice: ''
    });

    // Signature image state
    const [signatureImage, setSignatureImage] = useState(null);
    const [signaturePreview, setSignaturePreview] = useState(null);

    // Enhanced slideshow data with animations
    const slides = [
        {
            title: "Welcome to Doctor Registration",
            subtitle: "Create a new doctor account with comprehensive profile management",
            icon: <UserPlus className="w-20 h-20 text-white drop-shadow-lg" />,
            features: ["Secure account creation", "Digital signature support", "Professional profile management"],
            gradient: "from-blue-600 via-purple-600 to-indigo-700",
            accent: "text-blue-200",
            bgPattern: "opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]"
        },
        {
            title: "Comprehensive Profiles",
            subtitle: "Build detailed doctor profiles with specializations and credentials",
            icon: <Stethoscope className="w-20 h-20 text-white drop-shadow-lg" />,
            features: ["Specialization tracking", "License management", "Qualification records"],
            gradient: "from-emerald-600 via-teal-600 to-cyan-700",
            accent: "text-emerald-200",
            bgPattern: "opacity-10 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.1)_2px,transparent_2px)] bg-[length:30px_30px]"
        },
        {
            title: "Digital Signatures",
            subtitle: "Upload and store digital signatures for report authentication",
            icon: <Upload className="w-20 h-20 text-white drop-shadow-lg" />,
            features: ["Image upload support", "High-resolution storage", "Secure authentication"],
            gradient: "from-purple-600 via-pink-600 to-rose-700",
            accent: "text-purple-200",
            bgPattern: "opacity-10 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%)] bg-[length:20px_20px]"
        },
        {
            title: "Seamless Integration",
            subtitle: "Doctors integrate directly into your organization's workflow",
            icon: <Award className="w-20 h-20 text-white drop-shadow-lg" />,
            features: ["Instant activation", "Role-based access", "Organization binding"],
            gradient: "from-orange-600 via-red-600 to-pink-700",
            accent: "text-orange-200",
            bgPattern: "opacity-10 bg-[conic-gradient(from_0deg,rgba(255,255,255,0.1),transparent_120deg,rgba(255,255,255,0.1)_240deg,transparent)]"
        }
    ];

    const [currentSlide, setCurrentSlide] = useState(0);

    // Auto-advance slideshow with pause on hover
    const [isPaused, setIsPaused] = useState(false);
    
    React.useEffect(() => {
        if (isPaused) return;
        
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length, isPaused]);

    // Handle input changes with animation feedback
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Add a subtle pulse animation to the input
        e.target.classList.add('animate-pulse');
        setTimeout(() => {
            e.target.classList.remove('animate-pulse');
        }, 200);
    };

    // Handle qualifications array
    const handleQualificationChange = (index, value) => {
        const newQualifications = [...formData.qualifications];
        newQualifications[index] = value;
        setFormData(prev => ({
            ...prev,
            qualifications: newQualifications
        }));
    };

    const addQualification = () => {
        setFormData(prev => ({
            ...prev,
            qualifications: [...prev.qualifications, '']
        }));
    };

    const removeQualification = (index) => {
        setFormData(prev => ({
            ...prev,
            qualifications: prev.qualifications.filter((_, i) => i !== index)
        }));
    };

    // ✅ SIGNATURE IMAGE HANDLING
    const handleSignatureUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        setSignatureImage(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setSignaturePreview(e.target.result);
        };
        reader.readAsDataURL(file);

        // Add upload animation
        const uploadArea = document.querySelector('.signature-upload-area');
        if (uploadArea) {
            uploadArea.classList.add('animate-bounce');
            setTimeout(() => {
                uploadArea.classList.remove('animate-bounce');
            }, 1000);
        }
    };

    const removeSignature = () => {
        setSignatureImage(null);
        setSignaturePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const convertImageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Form validation with enhanced feedback
    const validateStep = (step) => {
        switch (step) {
            case 1:
                return formData.fullName && formData.email && formData.password;
            case 2:
                return formData.specialization;
            case 3:
                return true; // Signature is optional
            default:
                return true;
        }
    };

    // Enhanced form submission with success animation
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateStep(3)) {
            toast.error('Please complete all required fields');
            return;
        }

        setLoading(true);

        try {
            const submissionData = {
                ...formData,
                yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : 0,
                qualifications: formData.qualifications.filter(q => q.trim() !== '')
            };

            // Add signature data if present
            if (signatureImage) {
                const base64Signature = await convertImageToBase64(signatureImage);
                submissionData.signature = base64Signature;
                submissionData.signatureMetadata = {
                    format: 'base64',
                    mimeType: signatureImage.type,
                    width: 0, // Will be set by backend
                    height: 0, // Will be set by backend
                    originalName: signatureImage.name,
                    originalSize: signatureImage.size
                };
            }

            const response = await api.post('/admin/admin-crud/doctors', submissionData);

            if (response.data.success) {
                setFormSubmitted(true);
                toast.success('Doctor created successfully!');
                
                // Delay navigation for success animation
                setTimeout(() => {
                    navigate('/admin/dashboard');
                }, 2000);
            }
        } catch (error) {
            console.error('Error creating doctor:', error);
            toast.error(error.response?.data?.message || 'Failed to create doctor');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 3));
        } else {
            toast.error('Please complete all required fields before proceeding');
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* ✅ LEFT SIDE - ENHANCED SLIDESHOW */}
            <div 
                className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br ${slides[currentSlide].gradient} relative overflow-hidden transition-all duration-1000 ease-in-out`}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {/* Dynamic background pattern */}
                <div className={`absolute inset-0 ${slides[currentSlide].bgPattern} transition-all duration-1000`}></div>
                
                {/* Animated overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                
                {/* Floating particles */}
                <div className="absolute inset-0">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-float"
                            style={{
                                left: `${20 + i * 15}%`,
                                top: `${30 + (i % 2) * 40}%`,
                                animationDelay: `${i * 0.5}s`,
                                animationDuration: `${3 + i * 0.5}s`
                            }}
                        >
                            <Sparkles className="w-4 h-4 text-white opacity-30" />
                        </div>
                    ))}
                </div>
                
                {/* Slideshow Content */}
                <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
                    <div className="text-center max-w-md transform transition-all duration-700 ease-out">
                        {/* Animated icon */}
                        <div className="mb-8 flex justify-center transform transition-all duration-700 hover:scale-110">
                            <div className="relative">
                                {slides[currentSlide].icon}
                                <div className="absolute inset-0 animate-ping opacity-30">
                                    {slides[currentSlide].icon}
                                </div>
                            </div>
                        </div>
                        
                        {/* Animated title */}
                        <h1 className="text-5xl font-black mb-6 leading-tight tracking-tight transform transition-all duration-700 translate-y-0">
                            {slides[currentSlide].title}
                        </h1>
                        
                        {/* Animated subtitle */}
                        <p className={`text-xl mb-8 ${slides[currentSlide].accent} leading-relaxed font-medium transform transition-all duration-700 delay-100`}>
                            {slides[currentSlide].subtitle}
                        </p>
                        
                        {/* Animated features */}
                        <div className="space-y-4">
                            {slides[currentSlide].features.map((feature, index) => (
                                <div 
                                    key={index} 
                                    className="flex items-center justify-center space-x-3 transform transition-all duration-500"
                                    style={{ 
                                        animationDelay: `${200 + index * 100}ms`,
                                        transform: 'translateX(0)'
                                    }}
                                >
                                    <div className="relative">
                                        <CheckCircle className="w-6 h-6 text-green-300" />
                                        <div className="absolute inset-0 animate-pulse opacity-50">
                                            <CheckCircle className="w-6 h-6 text-green-300" />
                                        </div>
                                    </div>
                                    <span className={`${slides[currentSlide].accent} font-medium text-lg`}>
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Enhanced slide indicators */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`relative transition-all duration-300 ${
                                    currentSlide === index 
                                        ? 'w-8 h-3 bg-white rounded-full' 
                                        : 'w-3 h-3 bg-white bg-opacity-40 rounded-full hover:bg-opacity-60'
                                }`}
                            >
                                {currentSlide === index && (
                                    <div className="absolute inset-0 bg-white rounded-full animate-pulse"></div>
                                )}
                            </button>
                        ))}
                    </div>
                    
                    {/* Enhanced navigation arrows */}
                    <button 
                        onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                        className="absolute left-6 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                        className="absolute right-6 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* ✅ RIGHT SIDE - ENHANCED FORM */}
            <div className="w-full lg:w-1/2 flex flex-col relative z-10 bg-white bg-opacity-95 backdrop-blur-sm">
                {/* Enhanced Header */}
                <div className="flex items-center justify-between p-6 bg-white bg-opacity-80 backdrop-blur-md border-b border-gray-200 shadow-sm">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-all duration-300 hover:scale-105 group"
                    >
                        <div className="p-1 rounded-full group-hover:bg-gray-100 transition-colors">
                            <ArrowLeft className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" />
                        </div>
                        <span className="font-semibold">Back to Dashboard</span>
                    </button>
                    
                    <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-500 font-medium">
                            Step {currentStep} of 3
                        </div>
                        <div className="flex space-x-1">
                            {[1, 2, 3].map((step) => (
                                <div 
                                    key={step}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                        currentStep >= step ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Enhanced Progress Bar */}
                <div className="bg-white bg-opacity-80 backdrop-blur-md px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 transform ${
                                    currentStep >= step 
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white scale-110 shadow-lg' 
                                        : 'bg-gray-200 text-gray-500 hover:scale-105'
                                }`}>
                                    {formSubmitted && step === 3 ? (
                                        <CheckCircle className="w-5 h-5 animate-bounce" />
                                    ) : (
                                        step
                                    )}
                                </div>
                                {step < 3 && (
                                    <div className={`w-20 h-2 mx-3 rounded-full transition-all duration-500 ${
                                        currentStep > step 
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                                            : 'bg-gray-200'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-600 font-medium">
                        {currentStep === 1 && (
                            <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-blue-500" />
                                <span>Basic Information</span>
                            </div>
                        )}
                        {currentStep === 2 && (
                            <div className="flex items-center space-x-2">
                                <Stethoscope className="w-4 h-4 text-green-500" />
                                <span>Professional Details</span>
                            </div>
                        )}
                        {currentStep === 3 && (
                            <div className="flex items-center space-x-2">
                                <Upload className="w-4 h-4 text-purple-500" />
                                <span>Digital Signature</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Enhanced Form Content */}
                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        
                        {/* STEP 1: Enhanced Basic Information */}
                        {currentStep === 1 && (
                            <div className="space-y-6 animate-fadeInUp">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 animate-pulse">
                                        <User className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                        Basic Information
                                    </h2>
                                    <p className="text-gray-600">Create the user account for the doctor</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        { name: 'fullName', type: 'text', placeholder: 'Dr. John Smith', icon: User, label: 'Full Name *', required: true },
                                        { name: 'email', type: 'email', placeholder: 'doctor@hospital.com', icon: Mail, label: 'Email Address *', required: true },
                                        { name: 'password', type: 'password', placeholder: '••••••••', icon: Lock, label: 'Password *', required: true },
                                        { name: 'username', type: 'text', placeholder: 'Auto-generated from email', icon: User, label: 'Username (Optional)', required: false }
                                    ].map((field, index) => (
                                        <div key={field.name} className="group" style={{ animationDelay: `${index * 100}ms` }}>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                <field.icon className="w-4 h-4 inline mr-2 text-blue-500" />
                                                {field.label}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={field.type}
                                                    name={field.name}
                                                    value={formData[field.name]}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 group-hover:border-gray-300 bg-white bg-opacity-80 backdrop-blur-sm"
                                                    placeholder={field.placeholder}
                                                    required={field.required}
                                                />
                                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Enhanced Professional Details */}
                        {currentStep === 2 && (
                            <div className="space-y-6 animate-fadeInUp">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-full mb-4 animate-pulse">
                                        <Stethoscope className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-2">
                                        Professional Details
                                    </h2>
                                    <p className="text-gray-600">Add medical credentials and contact information</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 group">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            <Stethoscope className="w-4 h-4 inline mr-2 text-green-500" />
                                            Specialization *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="specialization"
                                                value={formData.specialization}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 group-hover:border-gray-300 bg-white bg-opacity-80 backdrop-blur-sm"
                                                placeholder="Cardiology, Radiology, etc."
                                                required
                                            />
                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
                                        </div>
                                    </div>

                                    {[
                                        { name: 'licenseNumber', placeholder: 'MD12345', icon: FileText, label: 'License Number' },
                                        { name: 'department', placeholder: 'Radiology Department', icon: Shield, label: 'Department' },
                                        { name: 'yearsOfExperience', type: 'number', placeholder: '10', icon: Award, label: 'Years of Experience', min: '0' },
                                        { name: 'contactPhoneOffice', type: 'tel', placeholder: '+1 (555) 123-4567', icon: Phone, label: 'Office Phone' }
                                    ].map((field, index) => (
                                        <div key={field.name} className="group" style={{ animationDelay: `${index * 100}ms` }}>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                <field.icon className="w-4 h-4 inline mr-2 text-green-500" />
                                                {field.label}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={field.type || 'text'}
                                                    name={field.name}
                                                    value={formData[field.name]}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 group-hover:border-gray-300 bg-white bg-opacity-80 backdrop-blur-sm"
                                                    placeholder={field.placeholder}
                                                    min={field.min}
                                                />
                                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Enhanced Qualifications */}
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-4">
                                        <Star className="w-4 h-4 inline mr-2 text-yellow-500" />
                                        Qualifications
                                    </label>
                                    <div className="space-y-3">
                                        {formData.qualifications.map((qualification, index) => (
                                            <div key={index} className="flex space-x-3 animate-slideInRight" style={{ animationDelay: `${index * 100}ms` }}>
                                                <div className="flex-1 relative group">
                                                    <input
                                                        type="text"
                                                        value={qualification}
                                                        onChange={(e) => handleQualificationChange(index, e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-300 group-hover:border-gray-300 bg-white bg-opacity-80 backdrop-blur-sm"
                                                        placeholder="MBBS, MD, etc."
                                                    />
                                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeQualification(index)}
                                                    className="px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 hover:shadow-lg transform"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={addQualification}
                                            className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 hover:scale-105 hover:shadow-lg transform flex items-center space-x-2"
                                        >
                                            <Star className="w-4 h-4" />
                                            <span>Add Qualification</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Enhanced Signature Upload */}
                        {currentStep === 3 && (
                            <div className="space-y-6 animate-fadeInUp">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4 animate-pulse">
                                        <Upload className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                                        Digital Signature
                                    </h2>
                                    <p className="text-gray-600">Upload the doctor's signature image for report authentication (optional)</p>
                                </div>

                                <div className="signature-upload-area border-2 border-dashed border-gray-300 rounded-2xl p-8 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all duration-300 group">
                                    
                                    {!signaturePreview ? (
                                        <div className="text-center">
                                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                                                <Image className="w-10 h-10 text-purple-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Signature Image</h3>
                                            <p className="text-sm text-gray-600 mb-6">
                                                Choose a clear image of the doctor's signature<br />
                                                <span className="text-xs text-gray-500">Supports JPG, PNG, GIF • Max 5MB</span>
                                            </p>
                                            
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleSignatureUpload}
                                                className="hidden"
                                            />
                                            
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 hover:shadow-lg transform flex items-center space-x-3 mx-auto"
                                            >
                                                <Upload className="w-5 h-5" />
                                                <span className="font-semibold">Choose Image</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-4">
                                            <div className="relative inline-block">
                                                <img
                                                    src={signaturePreview}
                                                    alt="Signature preview"
                                                    className="max-w-full max-h-40 object-contain border-2 border-gray-200 rounded-lg shadow-lg"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={removeSignature}
                                                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center shadow-lg"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center justify-center text-green-600 animate-bounce">
                                                <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-full">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span className="text-sm font-semibold">Signature uploaded successfully!</span>
                                                </div>
                                            </div>
                                            
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 hover:scale-105 transform text-sm"
                                            >
                                                Change Image
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Enhanced Navigation Buttons */}
                        <div className="flex justify-between pt-8 border-t border-gray-200">
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 hover:scale-105 hover:shadow-lg transform"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    <span className="font-semibold">Previous</span>
                                </button>
                            )}

                            <div className="flex-1"></div>

                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 hover:shadow-lg transform"
                                >
                                    <span className="font-semibold">Next</span>
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={loading || formSubmitted}
                                    className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 hover:scale-105 hover:shadow-lg transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                            <span className="font-semibold">Creating...</span>
                                        </>
                                    ) : formSubmitted ? (
                                        <>
                                            <CheckCircle className="w-5 h-5 animate-bounce" />
                                            <span className="font-semibold">Created Successfully!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            <span className="font-semibold">Create Doctor</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateDoctor;