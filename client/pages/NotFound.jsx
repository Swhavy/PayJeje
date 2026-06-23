import { ArrowLeft, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#001a2e] flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-20 right-10 w-72 h-72 bg-[#00FF41]/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-20 left-10 w-72 h-72 bg-[#00FF41]/5 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-lg w-full">
        <div className="text-center mb-12">
          <div className="relative mb-8">
            <div className="text-9xl font-black text-[#00FF41] opacity-20 blur-sm select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-7xl font-black bg-gradient-to-r from-[#00FF41] to-[#00cc33] bg-clip-text text-transparent">
                404
              </span>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-[#e8f0f8] mb-3">
            Page Not Found
          </h1>
          <p className="text-[#8aa6b8] text-lg leading-relaxed">
            Oops! The page you&apos;re looking for seems to have taken a detour.
            Let&apos;s get you back on track.
          </p>
        </div>

        <div className="p-6 bg-gradient-to-br from-[#0a1f3a] to-[#001a2e] border border-[#1a3a52] rounded-xl mb-8">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-[#00FF41] font-mono text-sm font-semibold min-w-max">
                Error:
              </span>
              <span className="text-[#8aa6b8] font-mono text-sm break-all">
                ROUTE_NOT_FOUND | The requested resource does not exist
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#00FF41] font-mono text-sm font-semibold min-w-max">
                Status:
              </span>
              <span className="text-[#8aa6b8] font-mono text-sm">
                HTTP 404 - Not Found
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#00FF41] font-mono text-sm font-semibold min-w-max">
                Action:
              </span>
              <span className="text-[#8aa6b8] font-mono text-sm">
                Return to home or navigate elsewhere
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            to="/"
            className="flex-1 px-6 py-3 bg-[#00FF41] text-[#001a2e] rounded-lg font-semibold hover:bg-[#00cc33] transition-all flex items-center justify-center gap-2 group"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-6 py-3 bg-[#1a3a52] text-[#e8f0f8] rounded-lg font-semibold border border-[#2a4a62] hover:border-[#00FF41] hover:text-[#00FF41] transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-[#1a3a52]">
          <p className="text-[#8aa6b8] text-sm text-center mb-4">
            Need help? Try these:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/features"
              className="px-4 py-2 bg-[#0a1f3a] border border-[#1a3a52] rounded-lg text-[#8aa6b8] text-sm hover:border-[#00FF41] hover:text-[#00FF41] transition-colors text-center"
            >
              Features
            </Link>
            <Link
              to="/how-it-works"
              className="px-4 py-2 bg-[#0a1f3a] border border-[#1a3a52] rounded-lg text-[#8aa6b8] text-sm hover:border-[#00FF41] hover:text-[#00FF41] transition-colors text-center"
            >
              How it Works
            </Link>
            <Link
              to="/pricing"
              className="px-4 py-2 bg-[#0a1f3a] border border-[#1a3a52] rounded-lg text-[#8aa6b8] text-sm hover:border-[#00FF41] hover:text-[#00FF41] transition-colors text-center"
            >
              Pricing
            </Link>
            <Link
              to="/contact"
              className="px-4 py-2 bg-[#0a1f3a] border border-[#1a3a52] rounded-lg text-[#8aa6b8] text-sm hover:border-[#00FF41] hover:text-[#00FF41] transition-colors text-center"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
