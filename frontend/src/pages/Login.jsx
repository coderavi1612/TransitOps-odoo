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
  const [role, setRole] = useState('fleet_manager');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await signup(email, password, fullName, role);
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
            <h1 className="font-headline text-6xl font-bold text-on-surface tracking-tight leading-none">Sahara Fleet</h1>
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
                {isRegister ? 'Create a corporate operator profile.' : 'Please enter your credentials to access the Sahara Fleet hub.'}
              </p>
            </div>

            {!isRegister && (
              <div className="mb-6 p-4 rounded-xl bg-primary-fixed/30 text-on-primary-fixed-variant text-xs font-semibold border border-primary/20 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-base text-primary shrink-0 mt-0.5">info</span>
                <div>
                  <p className="font-bold">Demo Operator Credentials</p>
                  <p className="font-medium mt-0.5 opacity-90">Email: <span className="font-mono text-primary font-bold select-all">admin@transitops.com</span></p>
                  <p className="font-medium opacity-90">Password: <span className="font-mono text-primary font-bold select-all">admin</span></p>
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
                      placeholder="Elena Rodriguez"
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
                    placeholder="manager@sahara.com"
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
                    <a className="text-[11px] text-primary font-bold hover:underline" href="#forgot">Forgot?</a>
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
                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-bold ml-1" htmlFor="role">Assigned Role</label>
                  <div className="relative">
                    <select
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 pl-11 pr-10 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface appearance-none"
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="fleet_manager">Fleet Manager</option>
                      <option value="driver">Driver</option>
                      <option value="safety_officer">Safety Officer</option>
                      <option value="financial_analyst">Financial Analyst</option>
                      <option value="admin">System Administrator</option>
                    </select>
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl">admin_panel_settings</span>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                  </div>
                </div>
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
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
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
              <p className="text-[11px] text-on-surface-variant/70 uppercase tracking-widest">Sahara Systems v4.2.1</p>
              <div className="flex gap-4">
                <a className="text-[11px] font-bold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1" href="#help">
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
