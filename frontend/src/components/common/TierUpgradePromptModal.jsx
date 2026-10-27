import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, ArrowRight, X, ShieldAlert } from 'lucide-react';

export default function TierUpgradePromptModal({ isOpen, onClose, title, message, currentTier = 'Starter' }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-border-color shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-soft-blush via-ivory to-soft-blush border-b border-border-color flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-rose/10 flex items-center justify-center text-primary-rose">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-deep-plum text-lg">
                {title || 'Unlock Plan Capacity'}
              </h3>
              <p className="text-xs text-muted">Currently on <strong className="text-primary-rose capitalize">{currentTier}</strong> Plan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted hover:text-deep-plum hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              {message || 'You have reached the maximum allowance for your current plan. Upgrade to Growth or Luxury Pro to expand your team and services.'}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Perks in Growth & Luxury Pro:</h4>
            <div className="grid grid-cols-1 gap-2.5 text-xs text-deep-plum">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Up to 10 Specialists (or Unlimited on Luxury Pro)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlimited Services & Category Customization</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instant Payment Gateway & Digital GST Invoicing</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Reduced Settlement Fees (down to 0% on Luxury Pro)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-ivory/50 border-t border-border-color flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-muted hover:text-deep-plum transition-colors"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/admin/billing');
            }}
            className="px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>View Subscription Plans</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
