import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Organization name is required'],
        unique: true,
        trim: true,
        index: true
    },
    identifier: {
        type: String,
        required: [true, 'Organization identifier is required'],
        unique: true,
        trim: true,
        uppercase: true,
        index: true,
        match: [/^[A-Z0-9_]+$/, 'Identifier must contain only uppercase letters, numbers, and underscores']
    },
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    
    // Company Information
    companyType: {
        type: String,
        enum: ['hospital', 'clinic', 'imaging_center', 'teleradiology', 'diagnostic_center'],
        required: true
    },
    
    // Contact Information
    contactInfo: {
        primaryContact: {
            name: { type: String, trim: true },
            email: { type: String, trim: true, lowercase: true },
            phone: { type: String, trim: true },
            designation: { type: String, trim: true }
        },
        billingContact: {
            name: { type: String, trim: true },
            email: { type: String, trim: true, lowercase: true },
            phone: { type: String, trim: true }
        },
        technicalContact: {
            name: { type: String, trim: true },
            email: { type: String, trim: true, lowercase: true },
            phone: { type: String, trim: true }
        }
    },
    
    // Address Information
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, trim: true, default: 'USA' }
    },
    
    // Organization Settings
    settings: {
        timezone: { type: String, default: 'UTC' },
        dateFormat: { type: String, default: 'MM/DD/YYYY' },
        currency: { type: String, default: 'USD' },
        language: { type: String, default: 'en' }
    },
    
    // Subscription & Billing
    subscription: {
        plan: {
            type: String,
            enum: ['basic', 'professional', 'enterprise', 'custom'],
            default: 'basic'
        },
        maxUsers: { type: Number, default: 10 },
        maxStudiesPerMonth: { type: Number, default: 1000 },
        maxStorageGB: { type: Number, default: 100 },
        billingCycle: {
            type: String,
            enum: ['monthly', 'quarterly', 'annually'],
            default: 'monthly'
        },
        subscriptionStartDate: Date,
        subscriptionEndDate: Date,
        autoRenewal: { type: Boolean, default: true }
    },
    
    // Feature Permissions
    features: {
        aiAnalysis: { type: Boolean, default: false },
        advancedReporting: { type: Boolean, default: false },
        multiModalitySupport: { type: Boolean, default: true },
        cloudStorage: { type: Boolean, default: true },
        mobileAccess: { type: Boolean, default: true },
        apiAccess: { type: Boolean, default: false },
        whiteLabeling: { type: Boolean, default: false }
    },
    
    // Status & Compliance
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'trial', 'expired'],
        default: 'trial',
        index: true
    },
    
    compliance: {
        hipaaCompliant: { type: Boolean, default: false },
        dicomCompliant: { type: Boolean, default: true },
        hl7Integration: { type: Boolean, default: false },
        fda510k: { type: Boolean, default: false }
    },
    
    // Audit & Tracking
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    notes: {
        type: String,
        trim: true
    }
}, { 
    timestamps: true,
    collection: 'organizations'
});

// Indexes for performance
OrganizationSchema.index({ identifier: 1, status: 1 });
OrganizationSchema.index({ status: 1, createdAt: -1 });
OrganizationSchema.index({ 'subscription.plan': 1, status: 1 });

// Virtual for active user count
OrganizationSchema.virtual('activeUsers', {
    ref: 'User',
    localField: '_id',
    foreignField: 'organization',
    count: true,
    match: { isActive: true }
});

// Virtual for active lab count
OrganizationSchema.virtual('activeLabs', {
    ref: 'Lab',
    localField: '_id',
    foreignField: 'organization',
    count: true,
    match: { isActive: true }
});

export default mongoose.model('Organization', OrganizationSchema);