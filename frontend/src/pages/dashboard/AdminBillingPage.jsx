import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { subscriptionService } from '../../services/subscriptionService';
import { 
  CreditCard, Check, Sparkles, ShieldCheck, Zap, AlertCircle, 
  CheckCircle2, RefreshCw, X, ArrowRight, Star, Building2, Smartphone, Users, Scissors
} from 'lucide-react';

export default function AdminBillingPage() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingCycle, setBillingCycle] = useState('Monthly'); // 'Monthly' | 'Annual'

  // Upgrade Modal State
  const [targetPlan, setTargetPlan] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('UPI');

  // Cancel State
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await subscriptionService.getSalonSubscription();
      setSubscription(data);
      if (data.billingCycle) {
        setBillingCycle(data.billingCycle);
      }
    } catch (err) {
      setError(err.message || 'Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpgrade = (plan) => {
    setTargetPlan(plan);
    setUpgradeError('');
    setUpgradeSuccess('');
  };

  const handleConfirmUpgrade = async (e) => {
    e.preventDefault();
    if (!targetPlan) return;

    try {
      setUpgrading(true);
      setUpgradeError('');
      setUpgradeSuccess('');

      const res = await subscriptionService.upgradeSubscription({
        tier: targetPlan.tier,
        billingCycle: billingCycle,
        paymentMethod: selectedMethod
      });

      setUpgradeSuccess(res.message || `Successfully upgraded to the ${targetPlan.name} plan!`);
      
      // Refresh state
      setTimeout(async () => {
        await fetchSubscription();
        setTargetPlan(null);
        setUpgradeSuccess('');
      }, 1500);
    } catch (err) {
      setUpgradeError(err.message || 'Failed to upgrade plan. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your plan renewal? Your premium perks remain active until the end of this billing cycle.')) {
      return;
    }

    try {
      setCancelling(true);
      const res = await subscriptionService.cancelSubscription();
      setCancelMessage(res.message || 'Subscription cancelled successfully.');
      await fetchSubscription();
    } catch (err) {
      alert(err.message || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const isCurrentPlan = (tier) => {
    if (!subscription) return false;
    return subscription.currentTier.toLowerCase() === tier.toLowerCase();
  };

  const getTierBadge = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'luxurypro':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-deep-plum text-white flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-300" /> Luxury Pro</span>;
      case 'growth':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary-rose text-white flex items-center gap-1"><Zap className="w-3 h-3" /> Growth Studio</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-ivory border border-border-color text-deep-plum">Starter Solo</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-color pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif font-bold text-deep-plum">Plan & Billing</h1>
              {subscription && getTierBadge(subscription.currentTier)}
            </div>
            <p className="text-sm text-muted mt-1">
              Manage your salon subscription tier, specialist quotas, and platform revenue privileges.
            </p>
          </div>

          {subscription?.currentTier !== 'Starter' && subscription?.status === 'Active' && (
            <button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="text-xs text-muted hover:text-danger underline transition-colors self-start md:self-auto cursor-pointer"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Paid Subscription'}
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {cancelMessage && (
          <div className="p-4 bg-amber-50 text-amber-800 text-sm rounded-xl border border-amber-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{cancelMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-rose" />
            <p className="text-sm">Loading subscription details...</p>
          </div>
        ) : subscription ? (
          <>
            {/* 3 Capacity & Quota Meters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Specialists Quota */}
              <div className="bg-white p-6 rounded-2xl border border-border-color shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Specialists</span>
                  <Users className="w-4 h-4 text-primary-rose" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-serif text-deep-plum">{subscription.staffCount}</span>
                  <span className="text-xs text-muted">
                    / {subscription.staffLimit ? `${subscription.staffLimit} Allowed` : 'Unlimited'}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-ivory h-2 rounded-full overflow-hidden border border-border-color">
                  <div 
                    className={`h-full transition-all rounded-full ${
                      subscription.staffLimit && subscription.staffCount >= subscription.staffLimit 
                        ? 'bg-amber-500' 
                        : 'bg-primary-rose'
                    }`}
                    style={{ 
                      width: subscription.staffLimit 
                        ? `${Math.min(100, (subscription.staffCount / subscription.staffLimit) * 100)}%` 
                        : '100%' 
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-muted">
                    {subscription.canAddStaff ? 'Capacity available' : 'Quota reached'}
                  </span>
                  <Link to="/admin/staff" className="text-primary-rose hover:underline font-medium">
                    Manage Team →
                  </Link>
                </div>
              </div>

              {/* Services Quota */}
              <div className="bg-white p-6 rounded-2xl border border-border-color shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Services Catalog</span>
                  <Scissors className="w-4 h-4 text-primary-rose" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-serif text-deep-plum">{subscription.servicesCount}</span>
                  <span className="text-xs text-muted">
                    / {subscription.servicesLimit ? `${subscription.servicesLimit} Allowed` : 'Unlimited'}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-ivory h-2 rounded-full overflow-hidden border border-border-color">
                  <div 
                    className={`h-full transition-all rounded-full ${
                      subscription.servicesLimit && subscription.servicesCount >= subscription.servicesLimit 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-600'
                    }`}
                    style={{ 
                      width: subscription.servicesLimit 
                        ? `${Math.min(100, (subscription.servicesCount / subscription.servicesLimit) * 100)}%` 
                        : '100%' 
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-muted">
                    {subscription.canAddService ? 'Capacity available' : 'Quota reached'}
                  </span>
                  <Link to="/admin/services" className="text-primary-rose hover:underline font-medium">
                    Catalog Menu →
                  </Link>
                </div>
              </div>

              {/* Commission Rate & Payout Privileges */}
              <div className="bg-white p-6 rounded-2xl border border-border-color shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Platform Payout Fee</span>
                  <CreditCard className="w-4 h-4 text-primary-rose" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-serif text-deep-plum">
                    {subscription.currentTier.toLowerCase() === 'luxurypro' ? '0.0%' 
                     : subscription.currentTier.toLowerCase() === 'growth' ? '2.5%' 
                     : '5.0%'}
                  </span>
                  <span className="text-xs text-muted">per booking settlement</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {subscription.currentTier.toLowerCase() === 'luxurypro' 
                    ? '100% revenue retention unlocked with instant zero-commission escrow.'
                    : 'Upgrade to Luxury Pro to eliminate all platform fees completely.'}
                </p>
                <div className="pt-1">
                  <Link to="/admin/payouts" className="text-xs text-primary-rose hover:underline font-medium">
                    View Escrow Ledger →
                  </Link>
                </div>
              </div>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-border-color shadow-2xs">
              <div>
                <h3 className="font-serif font-bold text-deep-plum text-base">Select Billing Cadence</h3>
                <p className="text-xs text-muted">Switch between monthly billing or annual prepay to receive 2 months complimentary.</p>
              </div>

              <div className="flex items-center p-1 bg-ivory rounded-xl border border-border-color">
                <button
                  type="button"
                  onClick={() => setBillingCycle('Monthly')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    billingCycle === 'Monthly' 
                      ? 'bg-white text-primary-rose shadow-2xs' 
                      : 'text-muted hover:text-deep-plum'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('Annual')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    billingCycle === 'Annual' 
                      ? 'bg-white text-primary-rose shadow-2xs' 
                      : 'text-muted hover:text-deep-plum'
                  }`}
                >
                  <span>Annual</span>
                  <span className="px-1.5 py-0.5 text-[10px] bg-primary-rose text-white rounded-md font-bold uppercase">
                    Save 17%
                  </span>
                </button>
              </div>
            </div>

            {/* 3-Tier Pricing Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              {(subscription.availablePlans || []).map((plan) => {
                const isCurrent = isCurrentPlan(plan.tier);
                const price = billingCycle === 'Annual' ? plan.annualPrice : plan.monthlyPrice;
                const priceDisplay = price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`;
                const periodDisplay = price === 0 ? 'forever' : billingCycle === 'Annual' ? '/year' : '/month';

                return (
                  <div
                    key={plan.tier}
                    className={`relative rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 ${
                      plan.isPopular
                        ? 'bg-white border-2 border-primary-rose shadow-xl scale-[1.02] z-10'
                        : isCurrent
                        ? 'bg-soft-blush/30 border border-primary-rose/50 shadow-sm'
                        : 'bg-white border border-border-color shadow-2xs hover:shadow-md'
                    }`}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-rose text-white text-[11px] font-bold rounded-full shadow-sm tracking-wide uppercase flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" /> Most Popular
                      </div>
                    )}

                    <div className="space-y-6">
                      {/* Title & Tagline */}
                      <div>
                        <div className="flex justify-between items-center">
                          <h4 className="font-serif font-bold text-deep-plum text-2xl">{plan.name}</h4>
                          {isCurrent && (
                            <span className="px-2.5 py-1 bg-rose-tint text-primary-rose text-xs font-semibold rounded-full border border-primary-rose/30">
                              Current Plan
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-2 leading-relaxed min-h-[36px]">{plan.tagline}</p>
                      </div>

                      {/* Pricing */}
                      <div className="pt-2 border-t border-border-color">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-serif font-bold text-deep-plum">{priceDisplay}</span>
                          <span className="text-xs text-muted">{periodDisplay}</span>
                        </div>
                        {billingCycle === 'Annual' && price > 0 && (
                          <p className="text-[11px] text-emerald-700 font-medium mt-1">
                            Includes 2 months free (₹{Math.round(price / 12).toLocaleString('en-IN')}/mo equivalent)
                          </p>
                        )}
                      </div>

                      {/* Features List */}
                      <div className="space-y-3 pt-3 border-t border-border-color">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                          Included Features
                        </span>
                        <ul className="space-y-2.5 text-xs text-deep-plum">
                          {plan.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2.5">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-snug">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-8">
                      {isCurrent ? (
                        <div className="w-full py-3 bg-ivory text-deep-plum text-center text-xs font-semibold rounded-xl border border-border-color cursor-default">
                          Your Active Subscription
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenUpgrade(plan)}
                          className={`w-full py-3 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                            plan.isPopular
                              ? 'bg-primary-rose text-white hover:bg-primary-rose/90 shadow-md'
                              : 'bg-deep-plum text-white hover:bg-deep-plum/90'
                          }`}
                        >
                          <span>Upgrade to {plan.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {/* ----------------- CHECKOUT / UPGRADE MODAL ----------------- */}
        {targetPlan && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-border-color shadow-2xl overflow-hidden my-8">
              
              <div className="px-6 py-4 border-b border-border-color bg-ivory/70 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-semibold text-deep-plum text-lg">Confirm Plan Upgrade</h3>
                  <p className="text-xs text-muted">Upgrading to {targetPlan.name} ({billingCycle})</p>
                </div>
                <button
                  onClick={() => setTargetPlan(null)}
                  className="p-1 rounded-md text-muted hover:text-deep-plum hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {upgradeSuccess ? (
                <div className="p-8 text-center space-y-4 animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h4 className="font-serif font-bold text-deep-plum text-xl">Plan Activated Successfully!</h4>
                  <p className="text-xs text-muted">{upgradeSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleConfirmUpgrade} className="p-6 space-y-6">
                  {/* Order Summary Box */}
                  <div className="p-4 bg-soft-blush/30 rounded-xl border border-border-color space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted font-medium">Selected Tier:</span>
                      <strong className="text-deep-plum font-semibold">{targetPlan.name}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Billing Cycle:</span>
                      <span className="font-medium text-deep-plum">{billingCycle}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Staff Quota:</span>
                      <span className="font-medium text-deep-plum">
                        {targetPlan.maxStaff ? `${targetPlan.maxStaff} Specialists` : 'Unlimited'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Platform Settlement Fee:</span>
                      <span className="font-medium text-emerald-700">{targetPlan.commissionPercent}%</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border-color/60 text-sm">
                      <span className="font-semibold text-deep-plum">Total Payable:</span>
                      <strong className="text-primary-rose text-base">
                        ₹{(billingCycle === 'Annual' ? targetPlan.annualPrice : targetPlan.monthlyPrice).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-deep-plum mb-2">Select Payment Method</label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
                        { id: 'Card', label: 'Cards', icon: CreditCard },
                        { id: 'NetBanking', label: 'Net Banking', icon: Building2 },
                      ].map(m => {
                        const Icon = m.icon;
                        const isSelected = selectedMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMethod(m.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'border-primary-rose bg-soft-blush/30 ring-1 ring-primary-rose'
                                : 'border-border-color bg-white hover:bg-ivory/50'
                            }`}
                          >
                            <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-primary-rose' : 'text-muted'}`} />
                            <div className="text-xs font-semibold text-deep-plum">{m.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {upgradeError && (
                    <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{upgradeError}</span>
                    </div>
                  )}

                  <div className="p-3 bg-ivory rounded-xl border border-border-color flex items-center gap-2.5 text-[11px] text-muted">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>256-Bit SSL Encrypted SaaS Subscription • Instant Activation</span>
                  </div>

                  <div className="pt-2 flex justify-end gap-3 border-t border-border-color">
                    <button
                      type="button"
                      onClick={() => setTargetPlan(null)}
                      disabled={upgrading}
                      className="px-4 py-2 text-xs text-muted hover:text-deep-plum transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={upgrading}
                      className="px-6 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {upgrading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Processing Upgrade...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>
                            Confirm & Pay ₹{(billingCycle === 'Annual' ? targetPlan.annualPrice : targetPlan.monthlyPrice).toLocaleString('en-IN')}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
