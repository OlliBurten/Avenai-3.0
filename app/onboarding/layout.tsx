export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50">
      <div className="mx-auto min-h-screen flex flex-col">
        <header className="flex-shrink-0 px-6 pt-8 pb-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="relative">
                {/* Logo with same glow effect as sign-in */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl blur-sm opacity-30"></div>
                <div className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
                  🤖
                </div>
              </div>
              <div className="text-xl font-semibold text-gray-900">Avenai</div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 pb-16 flex items-center justify-center">
          <div className="mx-auto max-w-2xl w-full">
            {/* Floating card matching sign-in page */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
