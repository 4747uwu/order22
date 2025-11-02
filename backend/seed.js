import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import Organization from './models/organisation.js';
import Lab from './models/labModel.js';
import Doctor from './models/doctorModel.js';
import connectDB from './config/db.js';

dotenv.config();

const organizations = [
  {
    name: 'Metro General Hospital',
    identifier: 'METRO_GEN',
    displayName: 'Metro General Hospital',
    companyType: 'hospital',
    contactInfo: {
      primaryContact: {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@metrogen.com',
        phone: '+1-555-0101',
        designation: 'Chief Medical Officer'
      },
      billingContact: {
        name: 'Mike Chen',
        email: 'billing@metrogen.com',
        phone: '+1-555-0102'
      },
      technicalContact: {
        name: 'Alex Rodriguez',
        email: 'tech@metrogen.com',
        phone: '+1-555-0103'
      }
    },
    address: {
      street: '123 Medical Center Drive',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    subscription: {
      plan: 'enterprise',
      maxUsers: 50,
      maxStudiesPerMonth: 5000,
      maxStorageGB: 500,
      billingCycle: 'monthly',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      autoRenewal: true
    },
    features: {
      aiAnalysis: true,
      advancedReporting: true,
      multiModalitySupport: true,
      cloudStorage: true,
      mobileAccess: true,
      apiAccess: true,
      whiteLabeling: true
    },
    status: 'active',
    compliance: {
      hipaaCompliant: true,
      dicomCompliant: true,
      hl7Integration: true,
      fda510k: true
    }
  },
  {
    name: 'City Imaging Center',
    identifier: 'CITY_IMG',
    displayName: 'City Imaging Center',
    companyType: 'imaging_center',
    contactInfo: {
      primaryContact: {
        name: 'Dr. Michael Brown',
        email: 'michael.brown@cityimg.com',
        phone: '+1-555-0201',
        designation: 'Medical Director'
      },
      billingContact: {
        name: 'Lisa Wong',
        email: 'billing@cityimg.com',
        phone: '+1-555-0202'
      },
      technicalContact: {
        name: 'David Kim',
        email: 'tech@cityimg.com',
        phone: '+1-555-0203'
      }
    },
    address: {
      street: '456 Radiology Blvd',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    },
    subscription: {
      plan: 'professional',
      maxUsers: 30,
      maxStudiesPerMonth: 3000,
      maxStorageGB: 300,
      billingCycle: 'monthly',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      autoRenewal: true
    },
    features: {
      aiAnalysis: true,
      advancedReporting: false,
      multiModalitySupport: true,
      cloudStorage: true,
      mobileAccess: true,
      apiAccess: false,
      whiteLabeling: false
    },
    status: 'active',
    compliance: {
      hipaaCompliant: true,
      dicomCompliant: true,
      hl7Integration: false,
      fda510k: true
    }
  },
  {
    name: 'Regional Diagnostic Clinic',
    identifier: 'REGIONAL_DIAG',
    displayName: 'Regional Diagnostic Clinic',
    companyType: 'clinic',
    contactInfo: {
      primaryContact: {
        name: 'Dr. Emily Davis',
        email: 'emily.davis@regionaldiag.com',
        phone: '+1-555-0301',
        designation: 'Clinic Director'
      },
      billingContact: {
        name: 'Robert Taylor',
        email: 'billing@regionaldiag.com',
        phone: '+1-555-0302'
      },
      technicalContact: {
        name: 'Jennifer Liu',
        email: 'tech@regionaldiag.com',
        phone: '+1-555-0303'
      }
    },
    address: {
      street: '789 Health Street',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA'
    },
    subscription: {
      plan: 'basic',
      maxUsers: 20,
      maxStudiesPerMonth: 1000,
      maxStorageGB: 100,
      billingCycle: 'monthly',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      autoRenewal: true
    },
    features: {
      aiAnalysis: false,
      advancedReporting: false,
      multiModalitySupport: true,
      cloudStorage: true,
      mobileAccess: false,
      apiAccess: false,
      whiteLabeling: false
    },
    status: 'active',
    compliance: {
      hipaaCompliant: true,
      dicomCompliant: true,
      hl7Integration: false,
      fda510k: false
    }
  }
];

const superAdmin = {
  username: 'superadmin',
  email: 'superadmin@pacs.com',
  password: 'SuperAdmin123!',
  fullName: 'System Super Administrator',
  role: 'super_admin'
};

const generateUsersForOrganization = (orgIdentifier, orgId, startIndex = 0) => {
  const users = [];
  const labs = [];
  const doctors = [];
  
  // Create labs for this organization
  const orgLabs = [
    { name: `${orgIdentifier} Main Lab`, identifier: 'MAIN' },
    { name: `${orgIdentifier} Emergency Lab`, identifier: 'EMERG' },
    { name: `${orgIdentifier} Outpatient Lab`, identifier: 'OUTPT' }
  ];

  // Admin user
  users.push({
    organization: orgId,
    organizationIdentifier: orgIdentifier,
    username: `admin_${orgIdentifier.toLowerCase()}`,
    email: `admin@${orgIdentifier.toLowerCase()}.com`,
    password: 'Admin123!',
    fullName: `${orgIdentifier} Administrator`,
    role: 'admin'
  });

  // Owner user
  users.push({
    organization: orgId,
    organizationIdentifier: orgIdentifier,
    username: `owner_${orgIdentifier.toLowerCase()}`,
    email: `owner@${orgIdentifier.toLowerCase()}.com`,
    password: 'Owner123!',
    fullName: `${orgIdentifier} Owner`,
    role: 'owner'
  });

  // Lab staff (12 users)
  for (let i = 1; i <= 12; i++) {
    const labIndex = (i - 1) % orgLabs.length;
    users.push({
      organization: orgId,
      organizationIdentifier: orgIdentifier,
      username: `labstaff_${orgIdentifier.toLowerCase()}_${i}`,
      email: `labstaff${i}@${orgIdentifier.toLowerCase()}.com`,
      password: 'LabStaff123!',
      fullName: `${orgIdentifier} Lab Staff ${i}`,
      role: 'lab_staff',
      lab: null // Will be set after labs are created
    });
  }

  // Doctor accounts (12 users)
  for (let i = 1; i <= 12; i++) {
    users.push({
      organization: orgId,
      organizationIdentifier: orgIdentifier,
      username: `doctor_${orgIdentifier.toLowerCase()}_${i}`,
      email: `doctor${i}@${orgIdentifier.toLowerCase()}.com`,
      password: 'Doctor123!',
      fullName: `Dr. ${orgIdentifier} Physician ${i}`,
      role: 'doctor_account'
    });
  }

  return { users, labs: orgLabs };
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Lab.deleteMany({});
    await Doctor.deleteMany({});
    
    // Create super admin first (let User model handle password hashing)
    console.log('👑 Creating super admin...');
    const superAdminUser = new User(superAdmin);
    await superAdminUser.save();
    console.log(`✅ Created super admin: ${superAdmin.email}`);
    
    // Create organizations with super admin as creator
    console.log('🏢 Creating organizations...');
    const createdOrgs = [];
    for (const orgData of organizations) {
      const org = new Organization({
        ...orgData,
        createdBy: superAdminUser._id
      });
      await org.save();
      createdOrgs.push(org);
      console.log(`✅ Created organization: ${org.identifier}`);
    }
    
    // Create users for each organization
    let totalUsers = 1; // Super admin already created
    for (const org of createdOrgs) {
      console.log(`👥 Creating users for ${org.identifier}...`);
      
      const { users: orgUsers, labs: orgLabs } = generateUsersForOrganization(org.identifier, org._id);
      
      // Create labs first
      const createdLabs = [];
      for (const labData of orgLabs) {
        const lab = new Lab({
          organization: org._id,
          organizationIdentifier: org.identifier,
          name: labData.name,
          identifier: labData.identifier,
          fullIdentifier: `${org.identifier}_${labData.identifier}`,
          contactPerson: `${org.identifier} Lab Manager`,
          contactEmail: `lab@${org.identifier.toLowerCase()}.com`,
          contactPhone: '+1-555-0000',
          address: org.address,
          isActive: true,
          notes: `Main lab for ${org.displayName}`,
          settings: {
            autoAssignStudies: true,
            defaultPriority: 'NORMAL',
            maxConcurrentStudies: 50
          }
        });
        await lab.save();
        createdLabs.push(lab);
      }
      
      // Create users (let User model handle password hashing)
      for (let i = 0; i < orgUsers.length; i++) {
        const userData = orgUsers[i];
        
        // Assign lab to lab staff
        if (userData.role === 'lab_staff') {
          const labIndex = (i - 2) % createdLabs.length; // -2 because first 2 are admin and owner
          userData.lab = createdLabs[labIndex]._id;
        }
        
        const user = new User({
          ...userData,
          createdBy: superAdminUser._id
        });
        await user.save();
        
        // Create doctor profile for doctor accounts
        if (userData.role === 'doctor_account') {
          const doctor = new Doctor({
            userAccount: user._id,
            organization: org._id,
            organizationIdentifier: org.identifier,
            specialization: ['Radiology', 'Diagnostic Imaging'][Math.floor(Math.random() * 2)],
            licenseNumber: `LIC${org.identifier}${i.toString().padStart(3, '0')}`,
            department: 'Radiology',
            qualifications: ['MD', 'Board Certified Radiologist'],
            yearsOfExperience: Math.floor(Math.random() * 20) + 5,
            contactPhoneOffice: '+1-555-0000',
            assigned: false,
            signature: '',
            isActiveProfile: true
          });
          await doctor.save();
        }
        
        totalUsers++;
      }
      
      console.log(`✅ Created ${orgUsers.length} users for ${org.identifier}`);
    }
    
    // Final statistics
    const finalStats = await Promise.all([
      Organization.countDocuments(),
      User.countDocuments(),
      Lab.countDocuments(),
      Doctor.countDocuments()
    ]);
    
    console.log('\n🎉 Seeding completed successfully!');
    console.log(`📊 Final Statistics:`);
    console.log(`   🏢 Organizations: ${finalStats[0]}`);
    console.log(`   👥 Users: ${finalStats[1]}`);
    console.log(`   🧪 Labs: ${finalStats[2]}`);
    console.log(`   👨‍⚕️ Doctors: ${finalStats[3]}`);
    
    console.log('\n🔐 Login Credentials:');
    console.log(`   👑 Super Admin: ${superAdmin.email} / ${superAdmin.password}`);
    createdOrgs.forEach(org => {
      console.log(`   🏢 ${org.identifier}:`);
      console.log(`      👨‍💼 Admin: admin@${org.identifier.toLowerCase()}.com / Admin123!`);
      console.log(`      👤 Owner: owner@${org.identifier.toLowerCase()}.com / Owner123!`);
      console.log(`      🧪 Lab Staff: labstaff1@${org.identifier.toLowerCase()}.com / LabStaff123!`);
      console.log(`      👨‍⚕️ Doctor: doctor1@${org.identifier.toLowerCase()}.com / Doctor123!`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run the seed
connectDB().then(() => {
  seedDatabase();
});