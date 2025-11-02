import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader, Activity, Heart, Stethoscope, Shield, CheckCircle, Users, Clock, FileText, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

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
      <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs font-medium text-teal-600 whitespace-nowrap">
        {label}
      </div>
    </div>
  );
};

// ✅ UPDATED: Full-screen doctor slideshow component with teal colors
const DoctorSlideshow = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const slides = [
    {
      image: '/doc1.jpg',
      title: 'Expert Medical Care',
      description: 'Professional healthcare solutions at your fingertips.',
    },
    {
      image: '/doc2.jpg',
      title: 'Advanced Diagnostics',
      description: 'State-of-the-art medical imaging technology.',
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 500);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
      setIsTransitioning(false);
    }, 500);
  };

  const prevSlide = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      setIsTransitioning(false);
    }, 500);
  };

  const handleImageError = (slideIndex) => {
    console.error('❌ Image failed to load:', slides[slideIndex].image);
    setImageErrors(prev => ({ ...prev, [slideIndex]: true }));
  };

  const currentSlideData = slides[currentSlide];

  return (
    <div className="relative w-full h-full group">
      
      {/* ✅ FULL BACKGROUND IMAGE */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'} flex items-end justify-center`}>
        {imageErrors[currentSlide] ? (
          // ✅ UPDATED: Fallback gradient with teal colors
          <div className="w-full h-full bg-gradient-to-br from-teal-600 via-green-600 to-emerald-600 flex items-center justify-center">
            <div className="text-center p-8">
              <Activity className="h-32 w-32 text-white/40 mx-auto mb-4 animate-pulse" />
              <p className="text-white/60 text-xl font-semibold">{currentSlideData.title}</p>
            </div>
          </div>
        ) : (
          <img 
            src={currentSlideData.image} 
            className="w-188 h-188 object-cover object-center scale-110 group-hover:scale-100 group-hover:blur-0 transition-all duration-1000 ease-out" 
            onError={() => handleImageError(currentSlide)}
            onLoad={() => console.log('✅ Image loaded successfully:', currentSlideData.image)}
          />
        )}
      </div>

      {/* ✅ UPDATED: TOP-LEFT LOGO with teal colors */}
      <div className={`absolute top-8 left-8 z-20 transition-all duration-500 ${
        isTransitioning ? 'opacity-0 -translate-x-8' : 'opacity-100 translate-x-0'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-200 to-green-400 bg-clip-text text-transparent">Medical PACS</h1>
            <p className="text-white/80 text-xs bg-gradient-to-r from-teal-200 to-green-400 bg-clip-text text-transparent">Healthcare Excellence</p>
          </div>
        </div>
      </div>

      {/* ✅ UPDATED: TOP-RIGHT CONTENT with teal colors */}
      <div className="absolute top-8 right-8 z-20 max-w-sm">
        <div className={`text-right transition-all duration-500 ${
          isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
        }`}>
          <div className="space-y-2">
            <h3 className="text-3xl font-bold leading-tight bg-gradient-to-r from-teal-200 to-green-400 bg-clip-text text-transparent">
              {currentSlideData.title}
            </h3>
            <p className="text-md leading-relaxed bg-gradient-to-r from-teal-200 to-green-400 bg-clip-text text-transparent">
              {currentSlideData.description}
            </p>
          </div>
        </div>
      </div>
      
      {/* Slide indicators and navigation remain the same */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}>
        <div className="flex items-center space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setCurrentSlide(index);
                  setIsTransitioning(false);
                }, 500);
              }}
              className={`transition-all duration-300 rounded-full ${
                index === currentSlide
                  ? 'w-8 h-2 bg-white shadow-lg'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-8 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/30 transition-all hover:scale-110 z-20 border border-white/30"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-8 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/30 transition-all hover:scale-110 z-20 border border-white/30"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>

      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-white/70 font-mono bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
          {currentSlideData.image}
        </div>
      )}
    </div>
  );
};

// Stat card and security badge components remain the same
const StatCard = ({ icon: Icon, label, value, delay }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const increment = value / 50;
      const counter = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(counter);
        } else {
          setCount(Math.floor(current));
        }
      }, 30);
      return () => clearInterval(counter);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 hover:bg-white/20 transition-all">
      <div className="flex flex-col items-center text-center">
        <Icon className="h-5 w-5 text-white mb-1" />
        <p className="text-xl font-bold text-white">{count}+</p>
        <p className="text-xs text-white/80">{label}</p>
      </div>
    </div>
  );
};

// ✅ UPDATED: Security badge with teal colors
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
    <div className="min-h-screen flex overflow-hidden">
      
      {/* ✅ LEFT PANEL - FULL IMAGE SLIDESHOW */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <DoctorSlideshow />
      </div>

      {/* ✅ UPDATED: RIGHT PANEL with teal/green background */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-teal-50 via-green-50 to-emerald-50 relative">
        
        {/* ✅ UPDATED: Floating particles with teal colors */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-teal-400 opacity-10"
              style={{
                width: Math.random() * 6 + 2 + 'px',
                height: Math.random() * 6 + 2 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animation: `float ${Math.random() * 10 + 10}s linear infinite`,
                animationDelay: Math.random() * 5 + 's'
              }}
            />
          ))}
        </div>
        
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); }
            25% { transform: translateY(-20px) translateX(10px); }
            50% { transform: translateY(-10px) translateX(-10px); }
            75% { transform: translateY(-30px) translateX(5px); }
          }
        `}</style>

        <div className="max-w-md w-full space-y-6 relative z-10">
          
          {/* Header with animated icon */}
          <div className="text-center space-y-6">
            <AnimatedMedicalIcon />
            <div>
              {/* ✅ UPDATED: Title with teal gradient */}
              <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">
                Welcome Back
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Sign in to access your dashboard
              </p>
            </div>
          </div>

          {/* ✅ UPDATED: Login Form with teal colors */}
          <div className="bg-white/90 backdrop-blur-sm p-8 shadow-2xl rounded-2xl border border-teal-100">
            
            <form className="space-y-5" onSubmit={handleSubmit}>
              
              {/* ✅ UPDATED: Email field with teal colors */}
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

              {/* ✅ UPDATED: Password field with teal colors */}
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

              {/* ✅ UPDATED: Submit button with teal gradient */}
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

            {/* ✅ UPDATED: Footer with teal colors */}
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

          {/* ✅ UPDATED: Trust badges with teal colors */}
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Shield className="h-3 w-3 text-teal-600" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-teal-600" />
              <span>ISO Certified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;