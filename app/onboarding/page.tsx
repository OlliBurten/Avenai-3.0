"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle, ArrowRight, Users, Target, Building, FileText, AlertTriangle, Bot } from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Company", "Goal", "Finish"];
  return (
    <div className="mb-6 flex items-center gap-3">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full border text-sm font-medium flex items-center justify-center ${
              active ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300"
            }`}>{n}</div>
            <div className={`text-sm ${active ? "text-gray-900 font-medium" : "text-gray-500"}`}>{label}</div>
            {n !== 3 && <div className="mx-2 h-px w-8 bg-gray-200" />}
          </div>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);

  // Step 1: Company basic details
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [teamSize, setTeamSize] = useState<string | undefined>("2_10");

  const TEAM_OPTS = [
    { value: "1", label: "Just me" },
    { value: "2_10", label: "2–10" },
    { value: "11_50", label: "11–50" },
    { value: "51_200", label: "51–200" },
    { value: "200_plus", label: "200+" },
  ];

  // Step 2: Intent tracking
  const [useCases, setUseCases] = useState<string[]>([]);
  const [otherUseCase, setOtherUseCase] = useState("");

  // State tracking
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCompany, setSavedCompany] = useState(false);
  const [savedIntent, setSavedIntent] = useState(false);

  async function saveCompany(form: {
    name: string;
    website?: string;
    teamSize?: string;
  }) {
    setError(null);
    const res = await fetch("/api/onboarding/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error || `Failed to save company (status ${res.status})`);
    }
    setSavedCompany(true);
  }

  async function saveIntent(data: { useCases: string[]; otherUseCase?: string }) {
    const res = await fetch("/api/onboarding/intent", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error || `Failed to save intent (status ${res.status})`);
    }
    setSavedIntent(true);
  }

  async function completeOnboarding() {
    try {
      setLoading(true);
      setError(null);

      // Save company details (if not already saved)
      if (!savedCompany) {
        await saveCompany({
          name: companyName,
          website: website,
          teamSize: teamSize,
        });
      }

      // Save intent/goals
      if (!savedIntent) {
        await saveIntent({ 
          useCases, 
          otherUseCase: otherUseCase || undefined 
        });
      }

      // Mark onboarding as completed
      await fetch("/api/onboarding/first-win", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: { choice: "complete" } }),
      });

      // Advance to Step 3
      setStep(3);
    } catch (e: any) {
      console.error('Onboarding completion failed:', e);
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onNext() {
    try {
      setLoading(true);
      setError(null);

      if (step === 1) {
        if (!companyName) {
          setError("Company name is required.");
          return;
        }
        await saveCompany({
          name: companyName,
          website: website,
          teamSize: teamSize,
        });
        setStep(2);
      } else if (step === 2) {
        await completeOnboarding();
      }
    } catch (e: any) {
      console.error('Onboarding step failed:', e);
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const complete = useCallback(() => {
    try {
      const body = JSON.stringify({ source: 'finish' });

      // server cookie via API
      fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});

      // client cookie as immediate bypass (non-HttpOnly)
      document.cookie = 'av_onb=1; Path=/; Max-Age=600; SameSite=Lax';
    } catch {}
  }, []);

  const goToWorkspace = async () => {
    complete();
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, { 
      companyName, 
      goals: useCases,
      hasTour: true 
    });
    
    // Try to create a default dataset and redirect to it
    try {
      const response = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${companyName} Documentation`,
          type: "DOCUMENTATION",
          tags: ["onboarding", "default"]
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const datasetId = data.dataset?.id;
        if (datasetId) {
          router.replace(`/datasets/${datasetId}`);
          return;
        }
      }
    } catch (error) {
      console.error("Failed to create default dataset:", error);
    }
    
    // Fallback to datasets list
    router.replace("/datasets");
  };

  const skipTour = async () => {
    complete();
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, { 
      companyName, 
      goals: useCases,
      hasTour: false 
    });
    
    // Try to create a default dataset and redirect to it
    try {
      const response = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${companyName} Documentation`,
          type: "DOCUMENTATION",
          tags: ["onboarding", "default"]
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const datasetId = data.dataset?.id;
        if (datasetId) {
          router.replace(`/datasets/${datasetId}`);
          return;
        }
      }
    } catch (error) {
      console.error("Failed to create default dataset:", error);
    }
    
    // Fallback to datasets list
    router.replace("/datasets");
  };

  if (status === "loading") {
    return (
      <div className="min-h-dvh grid place-items-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="rounded-2xl bg-white/80 backdrop-blur shadow-xl p-6 animate-pulse">
          <span className="text-slate-600">Loading your session…</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  return (
    <div className="space-y-6">
      <Stepper step={step as 1 | 2 | 3} />
      <h1 className="mb-3 text-3xl font-semibold tracking-tight text-gray-900">Welcome to Avenai</h1>
      <p className="mb-8 text-base text-gray-600">Let's get your workspace ready — this takes about a minute.</p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Step 1: Company details */}
      {step === 1 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-medium">Company Setup</h2>
            <p className="text-gray-600 mt-1">Tell us about your organization so we can personalize your workspace.</p>
          </div>
          <label className="flex flex-col gap-1">
            Company name
            <input
              className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-300 focus:outline-none transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
              value={companyName}
              onChange={(e)=>setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
            />
            <div className="text-xs text-gray-500">We'll use this on invoices & team invites.</div>
          </label>
          <label className="flex flex-col gap-1">
            Website (optional)
            <input
              className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-300 focus:outline-none transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
              value={website}
              onChange={(e)=>setWebsite(e.target.value)}
              placeholder="https://acme.com"
              type="url"
            />
          </label>
          <label className="flex flex-col gap-1">
            Team size
            <select className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-300 focus:outline-none transition-all duration-200 bg-white text-gray-900" value={teamSize} onChange={(e)=>setTeamSize(e.target.value)}>
              <option value="">Select team size</option>
              {TEAM_OPTS.map((opt)=>(
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <div className="text-xs text-gray-500 mt-2">You can change these anytime in Settings → Organization.</div>
          <div className="flex justify-end">
            <button onClick={onNext} disabled={!companyName || loading} className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white disabled:opacity-50 focus:ring-2 focus:ring-purple-300 focus:outline-none min-w-[120px] transition-all duration-200">
              Continue
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Your Goal */}
      {step === 2 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-medium">Your goal</h2>
            <p className="text-gray-600 mt-1">What do you want to achieve with Avenai? (Select all that apply)</p>
          </div>
          <div className="grid gap-3">
            {[
              { id: 'speed_onboarding', label: 'Speed up developer onboarding' },
              { id: 'reduce_support', label: 'Reduce integration support load' },
              { id: 'centralize_docs', label: 'Centralize docs into one knowledge base' },
              { id: 'pilot_evaluation', label: 'Pilot evaluation for internal stakeholders' },
            ].map((option) => (
              <label key={option.id} className={`flex items-center gap-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                useCases.includes(option.id) ? 'border-purple-500 ring-2 ring-purple-200 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="checkbox"
                  checked={useCases.includes(option.id)}
                  onChange={() => {
                    setUseCases((prev) =>
                      prev.includes(option.id)
                        ? prev.filter((item) => item !== option.id)
                        : [...prev, option.id]
                    );
                  }}
                  className="form-checkbox h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="font-medium text-gray-800">{option.label}</span>
              </label>
            ))}
            <label className="flex flex-col gap-1 mt-2">
              Other (please specify)
              <textarea
                className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-300 focus:outline-none transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                value={otherUseCase}
                onChange={(e) => setOtherUseCase(e.target.value)}
                placeholder="e.g. Automate internal knowledge sharing"
                rows={2}
              />
            </label>
          </div>
          <div className="text-xs text-gray-500 mt-2">This helps us tune defaults and tips in your workspace.</div>
          <div className="flex items-center justify-between mt-6">
            <button onClick={()=>setStep(1)} className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200">Back</button>
            <button onClick={onNext} disabled={loading} className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white disabled:opacity-50 focus:ring-2 focus:ring-purple-300 focus:outline-none min-w-[120px] transition-all duration-200">
              {loading ? 'Finishing...' : 'Finish'}
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Completion */}
      {step === 3 && (
        <section className="space-y-5">
          {/* Success icon */}
          <div className="flex justify-center">
            <div className="h-11 w-11 rounded-full bg-green-100 text-green-700 grid place-items-center">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>

          {/* Title + copy */}
          <h2 className="text-xl font-semibold text-center">You're all set 🎉</h2>
          <p className="text-center text-gray-600">
            {companyName} is ready. Next, take a 30-second tour of the essentials.
          </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={goToWorkspace}
            className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-5 text-white hover:bg-indigo-700 transition"
          >
            Go to your workspace <ArrowRight className="ml-2 h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={skipTour}
            className="inline-flex h-10 items-center justify-center rounded-md border border-gray-300 px-5 text-sm hover:bg-gray-50 transition"
          >
            Skip tour
          </button>
        </div>

        {/* Hard fallback link in case the click handler fails for any reason */}
        <div className="text-center">
          <a
            href="/datasets"
            onClick={complete}
            className="text-sm text-gray-500 hover:underline"
          >
            Having trouble? Continue to datasets
          </a>
        </div>

          {/* Footnote */}
          <p className="text-center text-xs text-gray-500">
            You'll be taken to your workspace where you can upload documents and start chatting with your AI assistant.
          </p>

          {/* Footer nav (Back) */}
          <div className="flex justify-center">
            <button
              onClick={()=>setStep(2)}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200"
            >
              Back
            </button>
          </div>
        </section>
      )}
    </div>
  );
}