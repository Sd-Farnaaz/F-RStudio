import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { subscriptionService } from '../../services/subscriptionService';
import { useAuth } from '../../context/AuthContext';
import { 
  CreditCard, Check, Sparkles, ShieldCheck, Zap, AlertCircle, 
  CheckCircle2, RefreshCw, X, ArrowRight, Star, Clock, 
  Users, Scissors, AlertTriangle, Receipt, ExternalLink, HelpCircle
} from 'lucide-react';

export default function AdminBillingPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [error, setError] = useState('');
  const [billingCycle, setBillingCycle] = useState('Monthly'); // 'Monthly' | 'Annual'

  // Checkout Execution States
  const [initiatingPlan, setInitiatingPlan] = useState(null);
  const [checkoutState, setCheckoutState] = useState('idle'); // 'idle' | 'initiating' | 'open' | 'verifying' | 'success' | 'failed' | 'cancelled'
  const [checkoutError, setCheckoutError] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);

  // Cancel Renewal State
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');

  const fetchSubscription = useCallback(async () => {
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
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingTransactions(true);
      const list = await subscriptionService.getSubscriptionTransactions();
      setTransactions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to load transaction history:', err);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
    fetchTransactions();
  }, [fetchSubscription, fetchTransactions]);

  // Dynamically load Razorpay SDK script if not already on the page
  const ensureRazorpayLoaded = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existingScript) {
        let checks = 0;
        const interval = setInterval(() => {
          checks++;
          if (window.Razorpay) {
            clearInterval(interval);
            resolve(true);
          } else if (checks > 30) {
            clearInterval(interval);
            resolve(false);
          }
        }, 100);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Direct Test Mode Plan Activation (Allows instantly testing all 3 plans: Starter, Growth, Pro)
  const handleDirectTestUpgrade = async (plan) => {
    try {
      setInitiatingPlan(plan.tier);
      setCheckoutState('verifying');
      setCheckoutError('');
      const res = await subscriptionService.upgradeSubscription({
        tier: plan.tier,
        billingCycle: billingCycle
      });
      setVerificationResult({
        tier: res.currentTier,
        billingCycle: res.billingCycle,
        transactionReference: res.transactionReference,
        renewsAtUtc: res.renewsAtUtc
      });
      setCheckoutState('success');
      await fetchSubscription();
      await fetchTransactions();
    } catch (err) {
      setCheckoutState('failed');
      setCheckoutError(err.message || 'Direct plan change failed.');
    } finally {
      setInitiatingPlan(null);
    }
  };

  // Launch official Razorpay Checkout modal
  const handleLaunchCheckout = async (plan) => {
    if (!plan || plan.tier === 'Starter') return;

    try {
      setInitiatingPlan(plan.tier);
      setCheckoutState('initiating');
      setCheckoutError('');
      setVerificationResult(null);

      const loaded = await ensureRazorpayLoaded();
      if (!loaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay payment gateway script. Please check your internet connection.');
      }

      // 1. Authoritative Backend Order Creation
      const orderData = await subscriptionService.createSubscriptionOrder({
        tier: plan.tier,
        billingCycle: billingCycle
      });

      setCheckoutState('open');

      // 2. Configure Official Checkout options
      const options = {
        key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TtEAB1fZHDnzUW',
        amount: orderData.amountInPaise,
        currency: orderData.currency || 'INR',
        name: 'F&R Beauty Studio',
        description: orderData.description || `${plan.name} Subscription (${billingCycle})`,
        image: '/images/fr-beauty-studio-logo.png',
        order_id: orderData.orderId,
        prefill: {
          name: user?.fullName || orderData.salonName || '',
          email: user?.email || orderData.salonEmail || ''
        },
        theme: {
          color: '#B66B70' // Primary Rose Brand Color
        },
        modal: {
          ondismiss: function () {
            setCheckoutState('cancelled');
            setCheckoutError('Payment modal was closed. No funds were debited.');
            setInitiatingPlan(null);
          }
        },
        handler: async function (response) {
          // 3. Cryptographic Server-Side Verification
          // Do not trust the frontend alone — the server verifies the HMAC SHA256 signature!
          setCheckoutState('verifying');
          try {
            const verifyResponse = await subscriptionService.verifySubscriptionPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentMethod: 'Razorpay Test Mode'
            });

            setVerificationResult(verifyResponse);
            setCheckoutState('success');
            await fetchSubscription();
            await fetchTransactions();
          } catch (err) {
            setCheckoutState('failed');
            setCheckoutError(err.message || 'Payment verification failed on the server.');
          } finally {
            setInitiatingPlan(null);
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      
      razorpayInstance.on('payment.failed', function (resp) {
        setCheckoutState('failed');
        setCheckoutError(resp.error?.description || 'Payment was declined or cancelled at the gateway.');
        setInitiatingPlan(null);
      });

      razorpayInstance.open();
    } catch (err) {
      setCheckoutState('failed');
      setCheckoutError(err.message || 'Failed to initiate Razorpay checkout order.');
      setInitiatingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel automatic renewal? Your plan privileges will remain active until the end of your billing cycle.')) {
      return;
    }

    try {
      setCancelling(true);
      const res = await subscriptionService.cancelSubscription();
      setCancelMessage(res.message || 'Subscription renewal cancelled.');
      await fetchSubscription();
    } catch (err) {
      alert(err.message || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const isCurrentPlan = (tier) => {
    if (!subscription) return false;
    const current = (subscription.currentTier || '').toLowerCase();
    const target = (tier || '').toLowerCase();
    if (target === 'pro' && (current === 'pro' || current === 'luxurypro')) return true;
    return current === target;
  };

  const getTierBadge = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'pro':
      case 'luxurypro':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-deep-plum text-white flex items-center gap-1 shadow-2xs"><Sparkles className="w-3 h-3 text-accent-gold" /> Pro Flagship</span>;
      case 'growth':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-rose text-white flex items-center gap-1 shadow-2xs"><Zap className="w-3 h-3" /> Growth Studio</span>;
      default:
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-ivory border border-border-color text-deep-plum">Starter Trial</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in">
        
        {/* ========================================================================= */}
        {/* 1. HEADER & TEST MODE NOTICE BANNER                                       */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-color pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif font-bold text-deep-plum">Plan & Billing</h1>
              {subscription && getTierBadge(subscription.currentTier)}
            </div>
            <p className="text-sm text-muted mt-1">
              Manage your salon subscription, specialist quotas, and Razorpay payment credentials.
            </p>
          </div>

          {subscription?.currentTier !== 'Starter' && subscription?.status === 'Active' && (
            <button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="text-xs text-muted hover:text-danger underline transition-colors self-start md:self-auto cursor-pointer"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Subscription Renewal'}
            </button>
          )}
        </div>

        {/* Razorpay Test Mode Notice */}
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-amber-900 shadow-2xs">
          <HelpCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block text-amber-950">Razorpay Test Mode Active</span>
            <p className="text-amber-800 leading-relaxed text-xs">
              All transactions on this page run in Razorpay Test Mode using Key ID <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-950">rzp_test_TtEAB1fZHDnzUW</code>. Payments are simulated and will never charge real bank accounts or credit cards.
            </p>
          </div>
        </div>

        {/* Trial Status or Expiry Warning Banners */}
        {subscription?.isTrialActive && (
          <div className="p-4 bg-soft-blush/40 border border-primary-rose/30 rounded-2xl flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-rose/10 flex items-center justify-center text-primary-rose">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-deep-plum text-sm">
                  Complimentary 30-Day Starter Trial Active
                </h4>
                <p className="text-xs text-muted">
                  {subscription.remainingTrialDays != null 
                    ? `${subscription.remainingTrialDays} days remaining` 
                    : 'Active trial period'}
                  {subscription.trialEndsAtUtc && ` • Expires ${new Date(subscription.trialEndsAtUtc).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-primary-rose bg-white px-3 py-1.5 rounded-xl border border-primary-rose/20 shadow-2xs">
              Trial Mode
            </span>
          </div>
        )}

        {subscription?.isSubscriptionExpired && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-serif font-bold text-rose-900 text-sm">
                Subscription Expired: Temporary Deactivation
              </h4>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                Your salon subscription period has ended. Client bookings and specialist catalog modifications are paused. Please upgrade or renew below to reactivate your studio immediately.
              </p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
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

        {/* ========================================================================= */}
        {/* 2. CHECKOUT PROGRESS & RESULT ALERTS                                      */}
        {/* ========================================================================= */}
        {checkoutState === 'verifying' && (
          <div className="p-5 bg-soft-blush/60 border border-primary-rose/40 rounded-2xl flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-5 h-5 text-primary-rose animate-spin shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-deep-plum block">Verifying Payment Cryptographically...</span>
              <span className="text-muted">The server is validating the Razorpay signature and activating your subscription.</span>
            </div>
          </div>
        )}

        {checkoutState === 'success' && verificationResult && (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-emerald-950 text-base">
                  Payment Verified & Plan Activated!
                </h4>
                <p className="text-xs text-emerald-800 mt-1">
                  Your salon is now active on the <strong>{verificationResult.tier}</strong> plan ({verificationResult.billingCycle}).
                  Payment reference: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">{verificationResult.transactionReference}</code>.
                </p>
                {verificationResult.renewsAtUtc && (
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Valid through: {new Date(verificationResult.renewsAtUtc).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => { setCheckoutState('idle'); setVerificationResult(null); }}
              className="text-emerald-700 hover:text-emerald-900 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {checkoutState === 'failed' && checkoutError && (
          <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-950 text-xs sm:text-sm block">Payment or Verification Failed</span>
                <p className="text-xs text-rose-800 mt-0.5">{checkoutError}</p>
              </div>
            </div>
            <button
              onClick={() => { setCheckoutState('idle'); setCheckoutError(''); }}
              className="text-rose-700 hover:text-rose-900 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {checkoutState === 'cancelled' && (
          <div className="p-4 bg-ivory border border-border-color rounded-2xl flex items-center justify-between text-xs text-muted">
            <span>{checkoutError || 'Checkout modal was dismissed.'}</span>
            <button
              onClick={() => { setCheckoutState('idle'); setCheckoutError(''); }}
              className="text-muted hover:text-deep-plum p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. USAGE & CAPACITY QUOTAS                                                */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-rose" />
            <p className="text-sm">Loading subscription details...</p>
          </div>
        ) : subscription ? (
          <>
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
                    {subscription.canAddStaff ? 'Capacity available' : 'Limit reached'}
                  </span>
                  <Link to="/admin/staff" className="text-primary-rose hover:underline font-medium">
                    Manage Team →
                  </Link>
                </div>
              </div>

              {/* Services Catalog Quota */}
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
                    {subscription.canAddService ? 'Capacity available' : 'Limit reached'}
                  </span>
                  <Link to="/admin/services" className="text-primary-rose hover:underline font-medium">
                    Catalog Menu →
                  </Link>
                </div>
              </div>

              {/* Platform Settlement Privilege */}
              <div className="bg-white p-6 rounded-2xl border border-border-color shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Platform Payout Fee</span>
                  <CreditCard className="w-4 h-4 text-primary-rose" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-serif text-deep-plum">
                    {subscription.hasZeroCommission ? '0.0%' 
                     : subscription.currentTier.toLowerCase() === 'growth' ? '2.5%' 
                     : '5.0%'}
                  </span>
                  <span className="text-xs text-muted">per booking settlement</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {subscription.hasZeroCommission
                    ? '100% revenue retention unlocked with priority zero-commission escrow.'
                    : 'Upgrade to Pro to eliminate platform settlement commission completely.'}
                </p>
                <div className="pt-1">
                  <Link to="/admin/payouts" className="text-xs text-primary-rose hover:underline font-medium">
                    View Escrow Ledger →
                  </Link>
                </div>
              </div>
            </div>

            {/* Billing Cadence Switcher */}
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

            {/* ========================================================================= */}
            {/* 4. SUBSCRIPTION PLAN CARDS (Starter Trial, Growth, Pro)                   */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              {(subscription.availablePlans || []).map((plan) => {
                const isCurrent = isCurrentPlan(plan.tier);
                const isStarter = plan.tier === 'Starter';
                const price = billingCycle === 'Annual' ? plan.annualPrice : plan.monthlyPrice;
                const priceDisplay = price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`;
                const periodDisplay = price === 0 ? 'for 30 days' : billingCycle === 'Annual' ? '/year' : '/month';

                const isUpgradingThis = initiatingPlan === plan.tier;

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

                      {/* Quotas overview */}
                      <div className="grid grid-cols-2 gap-2 p-3 bg-ivory rounded-xl border border-border-color text-xs">
                        <div>
                          <span className="text-muted block text-[10px] uppercase font-semibold">Services</span>
                          <strong className="text-deep-plum">{plan.maxServices ? `Up to ${plan.maxServices}` : 'Unlimited'}</strong>
                        </div>
                        <div>
                          <span className="text-muted block text-[10px] uppercase font-semibold">Specialists</span>
                          <strong className="text-deep-plum">{plan.maxStaff ? `Up to ${plan.maxStaff}` : 'Unlimited'}</strong>
                        </div>
                      </div>

                      {/* Features List */}
                      <div className="space-y-3 pt-3 border-t border-border-color">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                          Included Capabilities
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

                    {/* Action Button: Razorpay Checkout Trigger */}
                    <div className="pt-8">
                      {isCurrent ? (
                        <div className="space-y-2">
                          <div className="w-full py-3 bg-ivory text-deep-plum text-center text-xs font-semibold rounded-xl border border-border-color cursor-default">
                            {subscription.isSubscriptionExpired ? 'Plan Expired' : 'Active Subscription'}
                          </div>
                          {price > 0 && (
                            <button
                              type="button"
                              onClick={() => handleLaunchCheckout(plan)}
                              disabled={isUpgradingThis || checkoutState === 'initiating' || checkoutState === 'verifying'}
                              className="w-full py-2.5 text-xs font-semibold text-primary-rose bg-white border border-primary-rose/40 hover:bg-soft-blush rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isUpgradingThis ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Launching Checkout...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Renew Subscription (Test Mode)</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : isStarter ? (
                        <button
                          type="button"
                          onClick={() => handleDirectTestUpgrade(plan)}
                          disabled={isUpgradingThis || checkoutState === 'initiating' || checkoutState === 'verifying'}
                          className="w-full py-3 bg-ivory text-deep-plum hover:bg-soft-blush text-center text-xs font-semibold rounded-xl border border-border-color transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isUpgradingThis ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Switching to Starter...</span>
                            </>
                          ) : (
                            <span>Switch to Starter Trial (Test Mode)</span>
                          )}
                        </button>
                      ) : (
                        <>
                        <button
                          type="button"
                          onClick={() => handleLaunchCheckout(plan)}
                          disabled={isUpgradingThis || checkoutState === 'initiating' || checkoutState === 'verifying'}
                          className={`w-full py-3 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
                            plan.isPopular
                              ? 'bg-primary-rose text-white hover:bg-primary-rose/90 shadow-md'
                              : 'bg-deep-plum text-white hover:bg-deep-plum/90'
                          }`}
                        >
                          {isUpgradingThis ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Preparing Razorpay...</span>
                            </>
                          ) : (
                            <>
                              <span>Pay with Razorpay (Test)</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDirectTestUpgrade(plan)}
                          disabled={isUpgradingThis || checkoutState === 'initiating' || checkoutState === 'verifying'}
                          className="w-full mt-2 py-2 text-[11px] font-medium text-muted hover:text-primary-rose underline transition-colors cursor-pointer text-center"
                        >
                          ⚡ Instant Test Switch to {plan.name}
                        </button>
                      </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ========================================================================= */}
            {/* 5. TRANSACTION HISTORY & AUDIT LEDGER                                      */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl border border-border-color shadow-2xs overflow-hidden mt-10">
              <div className="p-6 border-b border-border-color flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-deep-plum text-lg flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary-rose" />
                    Subscription Transaction Ledger
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Official record of Razorpay orders, payment signatures, and plan activations for your studio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchTransactions}
                  disabled={loadingTransactions}
                  className="p-2 text-muted hover:text-deep-plum rounded-lg hover:bg-ivory transition-colors cursor-pointer"
                  title="Refresh transaction history"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingTransactions ? 'animate-spin text-primary-rose' : ''}`} />
                </button>
              </div>

              {loadingTransactions ? (
                <div className="py-12 text-center text-muted text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary-rose" />
                  Loading payment history...
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <p className="text-sm font-medium text-deep-plum">No paid transactions recorded yet</p>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    When you upgrade or renew your subscription through Razorpay Test Mode, verified transaction references and receipts will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-ivory/60 border-b border-border-color text-muted font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-6">Order ID</th>
                        <th className="py-3.5 px-6">Payment ID</th>
                        <th className="py-3.5 px-6">Plan Tier</th>
                        <th className="py-3.5 px-6">Amount</th>
                        <th className="py-3.5 px-6">Status</th>
                        <th className="py-3.5 px-6">Verification</th>
                        <th className="py-3.5 px-6">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color/60 text-deep-plum">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-ivory/30 transition-colors">
                          <td className="py-3.5 px-6 font-mono text-muted">{tx.razorpayOrderId}</td>
                          <td className="py-3.5 px-6 font-mono">
                            {tx.razorpayPaymentId || <span className="text-muted/60">—</span>}
                          </td>
                          <td className="py-3.5 px-6 font-medium">
                            {tx.planTier} ({tx.billingCycle})
                          </td>
                          <td className="py-3.5 px-6 font-semibold">
                            ₹{tx.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              tx.status === 'Paid' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : tx.status === 'Failed'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono ${
                              tx.verificationStatus === 'Verified'
                                ? 'text-emerald-700 font-semibold'
                                : tx.verificationStatus === 'Failed'
                                ? 'text-rose-700 font-semibold'
                                : 'text-muted'
                            }`}>
                              {tx.verificationStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-muted">
                            {new Date(tx.createdAtUtc).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </>
        ) : null}

      </div>
    </DashboardLayout>
  );
}
