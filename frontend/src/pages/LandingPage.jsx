import React from 'react'
import { useApp } from '../context/AppContext'

const LandingPage = () => {
  const { isAuthenticated, setSelectedTab, logout } = useApp()

  // Scroll handler for landing page anchors
  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen text-on-surface bg-[#060e20] relative font-sans overflow-x-hidden">
      {/* Dynamic Style Injection for V2 Premium Effects */}
      <style>{`
        .glass-panel {
          background: rgba(23, 31, 51, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }
        .premium-border {
          border: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
        }
        .premium-border::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: inherit;
          background: linear-gradient(to bottom right, rgba(255,255,255,0.15), transparent 50%, rgba(255,255,255,0.05));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .neon-glow-primary {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          transition: all 0.3s ease;
        }
        .neon-glow-primary:hover {
          box-shadow: 0 0 35px rgba(59, 130, 246, 0.7);
        }
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .hero-gradient {
          background: radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.25) 0%, transparent 70%),
                      linear-gradient(180deg, #060e20 0%, #0b1326 100%);
        }
        .icon-glow {
          filter: drop-shadow(0 0 8px currentColor);
        }
      `}</style>

      {/* TopNavBar */}
      <nav className="sticky top-0 w-full z-[100] border-b border-white/5 bg-[#0b1326]/70 backdrop-blur-2xl transition-all duration-300">
        <div className="flex justify-between items-center h-20 px-container-padding max-w-[1440px] mx-auto">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedTab('landing')}>
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30 text-primary font-extrabold text-lg shadow-lg">
              D
            </div>
            <div>
              <span className="font-bold text-xl text-primary tracking-tight">Dispatch</span>
              <p className="text-[9px] uppercase tracking-widest text-secondary font-bold -mt-0.5">Enterprise Logistics</p>
            </div>
          </div>

          {/* Navigation Links & Action buttons */}
          <div className="flex items-center gap-8">
            <button 
              onClick={() => scrollToSection('features')} 
              className="text-label-md text-on-surface hover:text-primary transition-colors font-semibold"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('testimonials')} 
              className="text-label-md text-on-surface hover:text-primary transition-colors font-semibold"
            >
              Testimonials
            </button>
            <button 
              onClick={() => setSelectedTab('pricing')} 
              className="text-label-md text-on-surface hover:text-primary transition-colors font-semibold"
            >
              Pricing
            </button>
            
            <span className="w-[1px] h-5 bg-white/10 mx-1"></span>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedTab('dashboard')}
                  className="px-6 py-2.5 bg-primary text-white font-bold text-label-md rounded-lg neon-glow-primary hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  Dashboard <span className="material-symbols-outlined text-[16px]">dashboard</span>
                </button>
                <button
                  onClick={logout}
                  className="text-label-md font-semibold text-on-surface-variant hover:text-error transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedTab('login')}
                  className="text-label-md font-semibold text-on-surface hover:text-primary transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setSelectedTab('register')}
                  className="px-6 py-2.5 bg-primary text-white font-bold text-label-md rounded-lg neon-glow-primary hover:scale-105 active:scale-95 transition-all"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="relative">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden hero-gradient">
          {/* Background image overlay */}
          <div className="absolute inset-0 z-0 opacity-40">
            <div 
              className="w-full h-full bg-cover bg-center mix-blend-overlay" 
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDKyWSF6NczYRK8q3RsES5QDkaOSCbZPV82L7OcTY0RyYALQHpEegz2jH99GkI2KD3ThS2Ucwm-u6_rNsgBo0xOkHFduCJDIqGlUtcIV2bjNoujFvzS-qWG9OPrg-xJnuavHYLAKKzx6eBPWTxbFsNTH6aWw2wCa5A-kLC3kyBdmDzP7myFZKDb6lkssDHnJVxYfxHZ3x2tljkI8A8AEyhcZd_XUHfy2b7toyEzNwGXCn71zzAtri_Bgds2lzhcM3YCv1Rl5wv5Ihc')" }}
            ></div>
          </div>

          <div className="relative z-10 px-container-padding max-w-[1440px] mx-auto text-center pt-20">
            {/* Version Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-label-md mb-10 animate-pulse">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              LOGISTICS INTELLIGENCE v2.4
            </div>

            <h1 className="font-display-lg text-5xl md:text-7xl text-on-surface mb-8 max-w-5xl mx-auto leading-[1.05] tracking-tight font-extrabold">
              Autonomous Freight <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                Execution for Brokers
              </span>
            </h1>

            <p className="font-body-lg text-lg md:text-xl text-on-surface-variant/90 max-w-3xl mx-auto mb-12 leading-relaxed">
              Intelligently parse shipping requests, broadcast carrier RFQs, manage re-bid rounds, and reconcile invoices automatically in a single unified AI pipeline.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <button 
                onClick={() => setSelectedTab(isAuthenticated ? 'dashboard' : 'register')}
                className="px-10 py-5 bg-primary text-white font-bold text-headline-md rounded-xl neon-glow-primary hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 group"
              >
                <span>Get Started Free</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
              <button 
                onClick={() => setSelectedTab('pricing')}
                className="px-10 py-5 glass-panel premium-border text-on-surface font-bold text-headline-md rounded-xl hover:bg-white/10 active:scale-95 transition-all"
              >
                View Pricing Plans
              </button>
            </div>

            {/* Dashboard Preview mockup */}
            <div className="mt-20 max-w-5xl mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative glass-panel rounded-2xl overflow-hidden premium-border aspect-video flex items-center justify-center bg-black/40">
                <img 
                  alt="Dispatch Intelligent Pipeline" 
                  className="w-full h-full object-cover opacity-80" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0WaOlNuW61wLMjQ4Buvn-rh3d_VhectnFa2-OXFUqB-cfIt4o0dBMpRG5aVMpobZzlqPfojLT4QSsZm_ye9auHKHKJVJL31h4ziRvzhBVbr04zzpuTXsH9ugPNX119vbWWaDjoOkfq9eYOwp7PPHYeSQ60N-nGslBO5P5mFiFqTmRzr4l9jpGjI_WULWFeVGq9vDHL_KDctk3WHgvTzj4mqEIc0mDHf5Adp-ZInoLXSUYzSpMwwQ2yObTcBdMU0IEI9fwbTI_hgY"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features Section */}
        <section id="features" className="py-32 px-container-padding max-w-[1440px] mx-auto bg-grid-pattern relative">
          <div className="text-center mb-20">
            <h2 className="text-on-surface text-4xl font-bold mb-4">Powerful Features for Modern Logistics</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              Scalable AI solutions designed to automate the heavy lifting of freight management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-bento-gap">
            {/* Card 1: AI Parsing (Col-span 8) */}
            <div className="md:col-span-8 glass-panel premium-border p-10 rounded-3xl flex flex-col justify-between hover:bg-white/5 transition-all duration-300 group">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[36px] icon-glow">psychology</span>
                </div>
                <h3 className="text-on-surface text-3xl font-bold mb-4">Sub-second AI Parsing</h3>
                <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">
                  Powered by Llama 3.1 70B fine-tuned for logistics. Instantly extract origins, destinations, weight, freight class, and hazmat flags from unformatted emails with 99.9% accuracy.
                </p>
              </div>
              <div className="mt-12 flex flex-wrap gap-4">
                <span className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary">Origin: Chicago, IL</span>
                <span className="px-4 py-2 rounded-lg bg-secondary/10 border border-secondary/20 text-xs font-bold text-secondary">Class: 70</span>
                <span className="px-4 py-2 rounded-lg bg-tertiary/10 border border-tertiary/20 text-xs font-bold text-tertiary">Weight: 42,000 lbs</span>
              </div>
            </div>

            {/* Card 2: Automated Re-Bidding (Col-span 4) */}
            <div className="md:col-span-4 glass-panel premium-border p-10 rounded-3xl group hover:bg-white/5 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary mb-8 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[36px] icon-glow">rebase_edit</span>
                </div>
                <h3 className="text-on-surface text-2xl font-bold mb-4">Automated Re-Bidding</h3>
                <p className="text-on-surface-variant text-base mb-8 leading-relaxed">
                  Best-and-final triggers automatically engage preferred carriers to secure the lowest market rates.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-xs font-bold opacity-60">Initial Bid</span>
                  <span className="text-sm font-bold">$2,450</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-secondary/10 border border-secondary/30">
                  <span className="text-xs font-bold text-secondary">Final Re-bid</span>
                  <span className="text-sm font-bold text-secondary">$2,100</span>
                </div>
              </div>
            </div>

            {/* Card 3: RAG Benchmarks (Col-span 4) */}
            <div className="md:col-span-4 glass-panel premium-border p-10 rounded-3xl group hover:bg-white/5 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary mb-8 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[36px] icon-glow">data_exploration</span>
                </div>
                <h3 className="text-on-surface text-2xl font-bold mb-4">pgvector RAG Search</h3>
                <p className="text-on-surface-variant text-base leading-relaxed">
                  Instantly cross-reference historical pricing for similar lanes using high-dimensional vector search.
                </p>
              </div>
              <div className="mt-10 flex items-end gap-3 h-24">
                <div className="w-full bg-tertiary/20 h-1/2 rounded-lg"></div>
                <div className="w-full bg-tertiary/40 h-3/4 rounded-lg"></div>
                <div className="w-full bg-tertiary/60 h-2/3 rounded-lg"></div>
                <div className="w-full bg-tertiary/80 h-5/6 rounded-lg"></div>
                <div className="w-full bg-tertiary h-full rounded-lg shadow-[0_0_15px_rgba(255,185,95,0.4)]"></div>
              </div>
            </div>

            {/* Card 4: Ledger & BOLs (Col-span 8) */}
            <div className="md:col-span-8 glass-panel premium-border p-10 rounded-3xl flex flex-col md:flex-row gap-10 items-center hover:bg-white/5 transition-all duration-300 group">
              <div className="flex-1">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[36px] icon-glow">receipt_long</span>
                </div>
                <h3 className="text-on-surface text-3xl font-bold mb-4">Invoice Ledger &amp; BOLs</h3>
                <p className="text-on-surface-variant text-lg leading-relaxed">
                  Auto-generated invoice drafts and Bill of Lading documents. Dispatch handles the paperwork, ensuring 100% compliance and auditability in every transaction.
                </p>
              </div>
              <div className="w-full md:w-1/3 glass-panel bg-black/40 border-dashed border-2 border-white/10 p-6 rounded-2xl relative overflow-hidden">
                <div className="space-y-3 opacity-60">
                  <div className="h-3 w-1/2 bg-white/20 rounded-full"></div>
                  <div className="h-3 w-3/4 bg-white/20 rounded-full"></div>
                  <div className="h-3 w-full bg-white/20 rounded-full"></div>
                </div>
                <div className="mt-8 flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center text-secondary animate-bounce">
                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial Section */}
        <section id="testimonials" className="py-32 px-container-padding max-w-[1440px] mx-auto">
          <div className="relative p-16 rounded-[40px] bg-surface-container-low premium-border overflow-hidden text-center">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/15 rounded-full blur-[120px]"></div>
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-secondary/15 rounded-full blur-[120px]"></div>
            
            <div className="relative max-w-4xl mx-auto">
              <span className="material-symbols-outlined text-primary text-[64px] mb-10 icon-glow opacity-50">format_quote</span>
              <blockquote className="text-3xl md:text-4xl text-on-surface mb-12 italic leading-snug">
                "Dispatch has transformed our brokerage operations, cutting parsing time by 90%. We can now handle 5x the volume with the same team size. It's the competitive edge we needed."
              </blockquote>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full premium-border p-1.5 mb-6">
                  <div 
                    className="w-full h-full rounded-full bg-cover bg-center ring-4 ring-primary/20" 
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCqYogY7QhP-1syW43gn67a3c2AKsrTqswMcC7eEke0EyuexsivzRpUeY9o8BJ_X2erPZj4gj05-IcRBlXMBQDWVfX6xN3M8oY1vnFmIKS4qSc4OWGqZjnnb8HQ6byEOAxOo_Io7qHtVu8vJBJI3HMl1WpafHODCBt8PpVixmNdaPpQMz_hu4eV3EC7bdrXImozwVU1D9WI7QgPdK-mEBljPeqH0WHhMmLQyFHYsU4tQbD0fsIk0m138NhNWXm-DuRWPIlF1-0qFkI')" }}
                  ></div>
                </div>
                <p className="text-xl font-bold text-on-surface">Jameson Sterling</p>
                <p className="text-xs font-bold text-primary tracking-widest uppercase mt-1">Lead Broker @ Global Logistics Systems</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-32 px-container-padding max-w-[1440px] mx-auto text-center">
          <div className="glass-panel p-20 rounded-[40px] premium-border border-primary/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors"></div>
            <h2 className="text-5xl text-on-surface font-extrabold mb-8 relative z-10">
              Ready to scale your terminal?
            </h2>
            <p className="text-on-surface-variant text-xl mb-12 max-w-2xl mx-auto relative z-10 leading-relaxed">
              Join the next generation of autonomous logistics. Set up your Dispatch instance and go live in minutes.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6 relative z-10">
              <button 
                onClick={() => setSelectedTab(isAuthenticated ? 'dashboard' : 'register')}
                className="px-12 py-5 bg-primary text-white font-bold text-xl rounded-xl neon-glow-primary hover:scale-105 transition-all"
              >
                Start Free Trial
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="px-12 py-5 border-2 border-white/20 text-on-surface font-bold text-xl rounded-xl hover:bg-white/10 transition-all"
              >
                Learn More
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-20 px-container-padding border-t border-white/5 bg-black text-on-surface">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-bento-gap">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30 text-primary font-extrabold text-lg">
                D
              </div>
              <span className="font-bold text-xl text-primary tracking-tight">Dispatch</span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Autonomous logistics execution pipeline built for freight brokers and carriers.
            </p>
          </div>
          <div className="col-span-1">
            <h4 className="text-sm font-bold text-primary tracking-wider uppercase mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-on-surface-variant">
              <li><button onClick={() => scrollToSection('features')} className="hover:text-primary transition-colors">Features</button></li>
              <li><button onClick={() => setSelectedTab('pricing')} className="hover:text-primary transition-colors">Pricing</button></li>
              <li><button onClick={() => setSelectedTab(isAuthenticated ? 'dashboard' : 'login')} className="hover:text-primary transition-colors">Simulator</button></li>
            </ul>
          </div>
          <div className="col-span-1">
            <h4 className="text-sm font-bold text-primary tracking-wider uppercase mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-on-surface-variant">
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">System Diagram</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Security Audit</a></li>
            </ul>
          </div>
          <div className="col-span-1">
            <h4 className="text-sm font-bold text-primary tracking-wider uppercase mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-on-surface-variant">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1440px] mx-auto mt-20 pt-8 border-t border-white/5 text-center text-xs text-on-surface-variant/50">
          &copy; {new Date().getFullYear()} Dispatch Inc. All rights reserved. AES-256 encrypted bidding channel.
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
