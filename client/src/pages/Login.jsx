import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader, Activity, Heart, Stethoscope, Shield, CheckCircle } from 'lucide-react';
import ColorBends from '../creative/maxColor';

// ✅ UPDATED: Animated medical icon component with teal colors
const AnimatedMedicalIcon = () => {
  const [activeIcon, setActiveIcon] = useState(0);
  const icons = [
    { Icon: Activity, color: 'text-teal-500', label: 'Analytics' },
    { Icon: Heart, color: 'text-green-500', label: 'Health' },
    { Icon: Stethoscope, color: 'text-teal-600', label: 'Diagnosis' },
    { Icon: Shield, color: 'text-green-600', label: 'Secure' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIcon((prev) => (prev + 1) % icons.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const { Icon, color, label } = icons[activeIcon];

  return (
    <div className="relative w-12 h-12 mx-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-green-600 rounded-xl animate-pulse opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
        <Icon className={`h-6 w-6 text-white transition-all duration-500 ${activeIcon ? 'scale-110' : 'scale-100'}`} />
      </div>
      <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs font-medium text-white whitespace-nowrap">
        {label}
      </div>
    </div>
  );
};

// ✅ Security badge component
const SecurityBadge = () => {
  return (
    <div className="flex items-center justify-center space-x-2 text-xs text-teal-700">
      <Shield className="h-3 w-3" />
      <span className="font-medium">256-bit Encrypted</span>
      <CheckCircle className="h-3 w-3" />
    </div>
  );
};

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, error, isAuthenticated, getDashboardRoute, setError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated()) {
      const dashboardRoute = getDashboardRoute();
      const from = location.state?.from || dashboardRoute;
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state, getDashboardRoute]);

  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [formData, setError]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { email, password } = formData;

      if (!email.trim() || !password.trim()) {
        throw new Error('Please provide both email and password');
      }

      const { user, redirectTo } = await login(email.trim(), password);

      console.log('✅ Login successful:', {
        role: user.role,
        email: user.email,
        redirectTo
      });

      const from = location.state?.from || redirectTo || getDashboardRoute();
      navigate(from, { replace: true });

    } catch (err) {
      console.error('❌ Login failed:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      
      {/* ✅ ANIMATED BACKGROUND - ColorBends with teal colors */}
      <div className="absolute inset-0 z-0">
        <ColorBends
  colors={["#14b8a6", "#0d9488", "#06b6d4", "#0891b2", "#10b981", "#059669"]} 
  rotation={60}
  speed={0.3}
  scale={1.2}
  frequency={1.4}
  warpStrength={1.2}
  mouseInfluence={0.8}
  parallax={0.8}
  noise={0.05}
  transparent 
/>
      </div>

      {/* ✅ OVERLAY for better text readability */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-10"></div>

      {/* ✅ CENTERED LOGIN FORM */}
      <div className="relative z-20 w-full max-w-md px-6">
        
        {/* Header with animated icon */}
        <div className="text-center space-y-6 mb-8">
          <AnimatedMedicalIcon />
          <div>
            <h2 className="text-3xl font-bold text-white drop-shadow-lg">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-white/90 drop-shadow">
              Sign in to access your dashboard
            </p>
          </div>
        </div>

        {/* ✅ LOGIN FORM with glass morphism */}
        <div className="bg-white/95 backdrop-blur-xl p-8 shadow-2xl rounded-2xl border border-white/20">
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* ✅ Email field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-teal-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-teal-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@hospital.com"
                  className="block w-full pl-11 pr-4 py-3 text-sm border border-teal-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white"
                />
              </div>
            </div>

            {/* ✅ Password field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-teal-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-teal-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="block w-full pl-11 pr-12 py-3 text-sm border border-teal-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-teal-400 hover:text-teal-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-teal-400 hover:text-teal-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* ✅ Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white transition-all ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Authenticating...
                </div>
              ) : (
                <div className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Secure Sign In
                </div>
              )}
            </button>
          </form>

          {/* ✅ Footer */}
          <div className="mt-6 pt-6 border-t border-teal-100 space-y-3">
            <SecurityBadge />
            <div className="text-center">
              <button className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors">
                Forgot Password?
              </button>
            </div>
            <p className="text-xs text-center text-gray-500">
              Automatic role-based routing enabled
            </p>
          </div>
        </div>

        {/* ✅ Trust badges */}
        <div className="flex items-center justify-center space-x-6 text-xs text-white/90 mt-6 drop-shadow">
          <div className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>HIPAA Compliant</span>
          </div>
          <div className="w-px h-4 bg-white/30"></div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-3 w-3" />
            <span>ISO Certified</span>
          </div>
        </div>

        {/* ✅ Logo/Branding */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
            <Activity className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">Bharat Pacs</span>
          </div>
          <p className="text-xs text-white/70 mt-2">XCENTIC X CODINGWODING</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;