import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import loginBg from '../assets/login_bg.png';

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await signup(email, password, fullName, 'driver');
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative w-full overflow-hidden">
      {/* Background Desert Image */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="w-full h-full bg-cover bg-center scale-105 opacity-85"
          style={{
            backgroundImage: `url(${loginBg})`
          }}
        />
        {/* Soft overlay gradient to ensure high readability */}
        <div className="absolute inset-0 bg-gradient-to-tr from-background/90 via-background/45 to-transparent" />
      </div>

      {/* Main Content Canvas */}
      <main className="relative z-10 w-full max-w-[1100px] flex flex-col md:flex-row items-center justify-between gap-12">
        {/* Brand Side (Left on Desktop) */}
        <div className="hidden md:flex flex-col max-w-md text-left">
          <div className="mb-8">
            <h1 className="font-headline text-6xl font-bold text-on-surface tracking-tight leading-none">TransitOps</h1>
            <p className="font-label text-sm uppercase tracking-[0.2em] text-primary mt-4 font-semibold">Enterprise Control</p>
          </div>
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary-fixed text-primary">
                <span className="material-symbols-outlined text-2xl">local_shipping</span>
              </div>
              <div>
                <h3 className="font-headline text-xl font-semibold text-on-surface">Global Logistics</h3>
                <p className="text-on-surface-variant text-sm mt-1">Manage cross-border freight with sun-baked simplicity and editorial precision.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary-fixed text-primary">
                <span className="material-symbols-outlined text-2xl">route</span>
              </div>
              <div>
                <h3 className="font-headline text-xl font-semibold text-on-surface">Smart Dispatching</h3>
                <p className="text-on-surface-variant text-sm mt-1">AI-powered routing that optimizes for time, fuel, and desert conditions.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary-fixed text-primary">
                <span className="material-symbols-outlined text-2xl">monitoring</span>
              </div>
              <div>
                <h3 className="font-headline text-xl font-semibold text-on-surface">Real-time Analytics</h3>
                <p className="text-on-surface-variant text-sm mt-1">Crystal clear insights into your fleet's performance and driver safety.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login/Signup Card */}
        <div className="w-full max-w-md">
          <div className="bg-surface-container-lowest shadow-xl border border-outline-variant/60 rounded-[32px] p-8 md:p-12 relative overflow-hidden text-left">
            {/* Secure Access Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-xs font-semibold mb-8 border border-outline-variant/30">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              Secure Access
            </div>

            <div className="mb-8">
              <h2 className="font-headline text-4xl font-bold mb-2 text-on-surface">
                {isRegister ? 'Register Account' : 'Welcome Back'}
              </h2>
              <p className="text-on-surface-variant text-sm">
                {isRegister ? 'Create a corporate operator profile.' : 'Please enter your credentials to access TransitOps.'}
              </p>
            </div>

            {!isRegister && (
              <div className="mb-6 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60">
                <p className="text-xs font-bold text-on-surface mb-2.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">diversity_3</span>
                  Select a Demo Role to Autofill:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Admin', email: 'admin@transitops.com', pass: 'admin123', icon: 'shield_person' },
                    { label: 'Fleet Manager', email: 'manager@transitops.com', pass: 'manager123', icon: 'local_shipping' },
                    { label: 'Safety Officer', email: 'safety@transitops.com', pass: 'safety123', icon: 'health_and_safety' },
                    { label: 'Dispatcher', email: 'dispatcher@transitops.com', pass: 'dispatcher123', icon: 'route' },
                    { label: 'Analyst', email: 'analyst@transitops.com', pass: 'analyst123', icon: 'monitoring' },
                    { label: 'Driver', email: 'driver@transitops.com', pass: 'driver123', icon: 'person' },
                  ].map((role) => (
                    <button
                      key={role.label}
                      type="button"
                      onClick={() => {
                        setEmail(role.email);
                        setPassword(role.pass);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl text-left hover:bg-primary-fixed/40 border border-transparent hover:border-primary/20 transition-all text-xs font-semibold cursor-pointer text-on-surface-variant hover:text-on-surface bg-surface-container-lowest"
                    >
                      <span className="material-symbols-outlined text-sm text-primary shrink-0">{role.icon}</span>
                      <span className="truncate">{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container text-xs font-medium border border-error/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-error">report_problem</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegister && (
                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-bold ml-1" htmlFor="fullName">Full Name</label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 pl-11 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-outline outline-none text-on-surface"
                      id="fullName"
                      placeholder="Ananya Reddy"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={isRegister}
                    />
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl">person</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-bold ml-1" htmlFor="email">Corporate Email</label>
                <div className="relative">
                  <input
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 pl-11 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-outline outline-none text-on-surface"
                    id="email"
                    placeholder="manager@transitops.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl">alternate_email</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-bold" htmlFor="password">Security Key</label>
                  {!isRegister && (
                    <a className="text-[11px] text-primary font-bold hover:underline" href="mailto:support@transitops.com?subject=TransitOps%20password%20reset">Forgot?</a>
                  )}
                </div>
                <div className="relative">
                  <input
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 pl-11 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-outline outline-none text-on-surface"
                    id="password"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl">key</span>
                </div>
              </div>

              {isRegister && (
                <p className="text-[11px] text-on-surface-variant leading-relaxed bg-surface-container-low border border-outline-variant/40 rounded-xl p-3">
                  Self-service accounts start with the Driver role. An administrator can assign an elevated operational role after verification.
                </p>
              )}

              {!isRegister && (
                <div className="flex items-center gap-2 mt-2">
                  <input className="w-4 h-4 rounded border-outline text-primary focus:ring-primary cursor-pointer accent-primary" id="remember" type="checkbox" />
                  <label className="text-xs text-on-surface-variant cursor-pointer select-none" htmlFor="remember">Maintain session for 30 days</label>
                </div>
              )}

              <button 
                className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm mt-6 cursor-pointer disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>{isRegister ? 'Sign Up for Access' : 'Sign In to Fleet'}</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Support Footer */}
            <div className="mt-10 pt-6 border-t border-outline-variant/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[11px] text-on-surface-variant/70 uppercase tracking-widest">TransitOps v1.0</p>
              <div className="flex gap-4">
                <a className="text-[11px] font-bold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1" href="mailto:support@transitops.com">
                  <span className="material-symbols-outlined text-sm">help</span>
                  Support
                </a>
              </div>
            </div>
          </div>

          {/* Toggle between login & signup */}
          <p className="text-center mt-6 text-sm text-on-surface-variant">
            {isRegister ? (
              <>Already have a corporate account? <button onClick={() => setIsRegister(false)} className="text-primary font-bold hover:underline focus:outline-none">Sign In</button></>
            ) : (
              <>Need a corporate account? <button onClick={() => setIsRegister(true)} className="text-primary font-bold hover:underline focus:outline-none">Register here</button></>
            )}
          </p>
        </div>
      </main>

      {/* Background Accents (Minimalist) */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-primary-fixed/20 rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-tertiary-fixed/20 rounded-full blur-[100px] -z-10 -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
    </div>
  );
}
