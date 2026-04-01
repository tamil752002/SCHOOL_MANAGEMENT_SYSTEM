import {
  Book,
  CheckCircle,
  Clock,
  Gauge,
  GridIcon,
  LayoutDashboard,
  Menu,
  Moon,
  Shield,
  Sparkles,
  Sun,
  ArrowRight,
  Play,
  Users,
  BarChart3,
  Check,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoginForm } from '../Auth/LoginForm';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

interface LandingPageProps {
  onLoginClick?: () => void;
  onDevLoginClick?: () => void;
}

const MODULES = [
  { category: 'People', items: ['Students', 'Teachers', 'Staff', 'Parents'] },
  { category: 'Academics', items: ['Classes', 'Sections', 'Subjects', 'Exams', 'Marks'] },
  { category: 'Operations', items: ['Attendance', 'Leave', 'Fees'] },
  { category: 'Reports', items: ['Student Reports', 'Fee Reports', 'Attendance Reports'] },
  { category: 'Administration', items: ['Roles', 'Settings', 'Developer'] }
];

export function LandingPage({ onDevLoginClick }: LandingPageProps = {}) {
  const { addContact } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactFormData, setContactFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addContact({
      name: contactFormData.name,
      email: contactFormData.email,
      phone: contactFormData.phone,
      message: contactFormData.message
    });
    setContactSubmitted(true);
    setTimeout(() => {
      setContactFormData({ name: '', email: '', phone: '', message: '' });
      setShowContactForm(false);
      setContactSubmitted(false);
    }, 3000);
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContactFormData({ ...contactFormData, [e.target.name]: e.target.value });
  };

  if (showLoginPage) {
    return <LoginForm onBackToLanding={() => setShowLoginPage(false)} onDevLoginClick={onDevLoginClick} />;
  }

  return (
    <div className="min-h-screen gradient-hero text-gray-900 dark:text-white">
      {/* Fixed Navbar - EduHub style */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-soft border-b border-gray-200 dark:border-slate-700'
            : 'bg-transparent'
          }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Book className="w-6 h-6 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-gray-900 dark:text-white">SchoolHub</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
                Features
              </a>
              <a href="#modules" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
                Modules
              </a>
              <button
                onClick={() => setShowContactForm(true)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                Contact
              </button>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-600 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                aria-label={isDarkMode ? 'Light mode' : 'Dark mode'}
              >
                {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setShowLoginPage(true)}
                className="border border-cyan-600 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                className="border border-cyan-600 text-cyan-600 dark:text-cyan-400  hover:bg-cyan-50 dark:hover:bg-cyan-900/20 py-2 px-4 rounded-lg font-medium">
                Sample
              </button>
              <button
                onClick={() => setShowLoginPage(true)}
                className="gradient-primary text-white py-2 px-5 rounded-lg font-medium shadow-glow hover:opacity-90 transition-opacity"
              >
                Get Started
              </button>
              {onDevLoginClick && (
                <button
                  onClick={onDevLoginClick}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm py-2 px-2"
                >
                  Developer?
                </button>
              )}
            </div>

            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-600 dark:text-gray-400"
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium text-gray-700 dark:text-gray-300">
                Features
              </a>
              <a href="#modules" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium text-gray-700 dark:text-gray-300">
                Modules
              </a>
              <button onClick={() => { setShowContactForm(true); setMobileMenuOpen(false); }} className="py-2 font-medium text-gray-700 dark:text-gray-300 text-left">
                Contact
              </button>
              <button onClick={() => { setShowLoginPage(true); setMobileMenuOpen(false); }} className="gradient-primary text-white py-2.5 px-4 rounded-lg font-medium mt-2">
                Sign In / Get Started
              </button>
              {onDevLoginClick && (
                <button onClick={onDevLoginClick} className="py-2 text-sm text-gray-500 dark:text-gray-400 text-left">
                  Developer?
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero - EduHub style */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-teal-500/10 dark:bg-teal-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-cyan-500/5 dark:bg-cyan-400/5 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 border border-cyan-500/20 dark:border-cyan-400/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
                <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Trusted by 1000+ Schools</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
                Complete <span className="text-gradient">School Management</span> Solution
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto lg:mx-0 mb-8">
                Streamline your school with one platform. Manage students, staff, fees, attendance, and exams with ease.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                <button
                  onClick={() => setShowLoginPage(true)}
                  className="gradient-primary text-white py-3 px-6 rounded-xl font-medium shadow-glow hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowContactForm(true)}
                  className="border-2 border-cyan-600 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Contact Us
                </button>
              </div>
              <div className="flex justify-center lg:justify-start gap-8 md:gap-12">
                {[
                  { icon: Users, value: '50K+', label: 'Students' },
                  { icon: Book, value: '1000+', label: 'Schools' },
                  { icon: BarChart3, value: '99%', label: 'Uptime' }
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <s.icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                      <span className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{s.value}</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Dashboard overview - image from public/assets/images */}
            <div className="relative hidden lg:block">
              <div className="rounded-2xl shadow-card border border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Dashboard Overview</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Academic Year 2024-25</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-teal-500/80" />
                    <div className="w-3 h-3 rounded-full bg-cyan-500/80" />
                  </div>
                </div>
                <img
                  src={isDarkMode ? '/assets/images/dashboard-dark.png' : '/assets/images/dashboard-light.png'}
                  alt="SchoolHub Dashboard Overview"
                  className="w-full object-cover object-top"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = '/assets/images/dashboard.png';
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                  <p className="text-white text-sm font-medium">Everything you need at your fingertips</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-32 bg-white dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-sm font-medium mb-4">
              Features
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to <span className="text-gradient">Manage Your School</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              One platform for attendance, fees, exams, and reports with role-based access.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: LayoutDashboard, title: 'Comprehensive Platform', desc: 'Attendance, fees, exams, and reports in one place.', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
              { icon: Gauge, title: 'Time-Saving', desc: 'Automate workflows and save admin hours.', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
              { icon: Shield, title: 'Data Security', desc: 'Role-based access and secure data.', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
              { icon: GridIcon, title: 'Scalable', desc: 'From hundreds to thousands of students.', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
              { icon: Sparkles, title: 'Intuitive UX', desc: 'Minimal training for staff and teachers.', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
              { icon: Clock, title: '24/7 Support', desc: 'Dedicated support when you need it.', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' }
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl gradient-card border border-gray-200 dark:border-slate-700 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="py-20 lg:py-32 gradient-hero">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-sm font-medium mb-4">
              Modules
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Complete <span className="text-gradient">School Ecosystem</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Every module you need to run your institution efficiently.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {MODULES.map((mod) => (
              <div
                key={mod.category}
                className="p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 shadow-card"
              >
                <h3 className="font-display font-semibold text-xl text-gray-900 dark:text-white mb-4 pb-4 border-b border-gray-200 dark:border-slate-600">
                  {mod.category}
                </h3>
                <ul className="space-y-3">
                  {mod.items.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-gray-600 dark:text-gray-400">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-md w-full border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Get in Touch</h2>
              <button
                onClick={() => setShowContactForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {contactSubmitted ? (
              <div className="text-center py-10">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Thank You!</h3>
                <p className="text-gray-600 dark:text-gray-400">We'll get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {['name', 'email', 'phone'].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">{field} *</label>
                    <input
                      type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                      name={field}
                      value={contactFormData[field as keyof ContactFormData]}
                      onChange={handleContactChange}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 dark:bg-slate-700 dark:text-white"
                      required
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message *</label>
                  <textarea
                    name="message"
                    rows={4}
                    value={contactFormData.message}
                    onChange={handleContactChange}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 dark:bg-slate-700 dark:text-white"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full gradient-primary text-white py-2.5 px-4 rounded-lg font-medium shadow-glow hover:opacity-90"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer - EduHub style */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Book className="w-6 h-6 text-white" />
                </div>
                <span className="font-display font-bold text-xl text-gray-900 dark:text-white">SchoolHub</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-xs">
                The complete school management solution for administrators, teachers, and students.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Features</a></li>
                <li><a href="#modules" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Modules</a></li>
                <li><button onClick={() => setShowContactForm(true)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Contact</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Contact</h4>
              <address className="not-italic text-gray-600 dark:text-gray-400 text-sm">
                <p>123 Tech Park, Bangalore</p>
                <p>Karnataka, India 560001</p>
                <p className="mt-2">info@schoolhub.com</p>
                <p>+91 9876543210</p>
              </address>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-500">© {new Date().getFullYear()} SchoolHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
