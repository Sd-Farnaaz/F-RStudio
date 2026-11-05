import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { reviewService } from '../../services/reviewService';
import { 
  Star, 
  MessageSquare, 
  CornerDownRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Check, 
  Search, 
  X, 
  Image as ImageIcon,
  ShieldCheck,
  Send,
  MessageCircle,
  ThumbsUp
} from 'lucide-react';

export default function AdminReviewsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [ratingFilter, setRatingFilter] = useState('');
  const [repliedFilter, setRepliedFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Reply Modal State
  const [replyingReview, setReplyingReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');

  // Lightbox State
  const [activePhoto, setActivePhoto] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [ratingFilter, repliedFilter, searchQuery, page]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, pageSize: 12 };
      if (ratingFilter) params.rating = parseInt(ratingFilter, 10);
      if (repliedFilter !== '') params.replied = repliedFilter === 'true';
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await reviewService.getAdminReviews(params);
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load salon reviews.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReplyModal = (review) => {
    setReplyingReview(review);
    setReplyText(review.ownerReply || '');
    setReplyError('');
    setReplySuccess('');
  };

  const handleCloseReplyModal = () => {
    setReplyingReview(null);
    setReplyText('');
    setReplyError('');
    setReplySuccess('');
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyingReview) return;
    if (!replyText.trim() || replyText.trim().length < 2) {
      setReplyError('Reply text must be at least 2 characters.');
      return;
    }

    try {
      setSubmittingReply(true);
      setReplyError('');
      const updated = await reviewService.replyToReview(replyingReview.id, replyText.trim());
      setReplySuccess('Your reply has been published successfully!');

      // Update in summary list
      if (summary?.reviews?.items) {
        setSummary(prev => ({
          ...prev,
          reviews: {
            ...prev.reviews,
            items: prev.reviews.items.map(r => r.id === updated.id ? updated : r)
          }
        }));
      }

      setTimeout(() => {
        handleCloseReplyModal();
      }, 1500);
    } catch (err) {
      setReplyError(err.message || 'Failed to publish reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const reviewsList = summary?.reviews?.items || [];
  const totalReviews = summary?.totalReviews || 0;
  const avgRating = totalReviews > 0 ? (summary?.averageRating || 0) : 0;

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              <span>Reputation Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-deep-plum">
              Client Reviews & Ratings
            </h1>
          </div>
          <button
            onClick={fetchReviews}
            disabled={loading}
            className="self-start sm:self-auto px-4 py-2 bg-white border border-border-color text-deep-plum text-xs font-medium rounded-xl hover:bg-ivory flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Analytics Top Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Average Rating */}
            <div className="bg-white p-5 rounded-2xl border border-border-color shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Average Rating</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-deep-plum">
                  {totalReviews > 0 ? avgRating.toFixed(1) : '—'}
                </span>
                {totalReviews > 0 && <span className="text-xs text-muted">/ 5.0</span>}
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${totalReviews > 0 && star <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </div>

            {/* Card 2: Total Reviews */}
            <div className="bg-white p-5 rounded-2xl border border-border-color shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total Feedback</span>
              <div className="text-3xl font-serif font-bold text-deep-plum">{totalReviews}</div>
              <p className="text-[11px] text-muted flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% verified appointments</span>
              </p>
            </div>

            {/* Card 3: 5-Star Reviews */}
            <div className="bg-white p-5 rounded-2xl border border-border-color shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">5-Star Reviews</span>
              <div className="text-3xl font-serif font-bold text-primary-rose">
                {summary.ratingBreakdown?.[5] || 0}
              </div>
              <p className="text-[11px] text-muted">
                {totalReviews > 0 ? Math.round(((summary.ratingBreakdown?.[5] || 0) / totalReviews) * 100) : 0}% of all clients
              </p>
            </div>

            {/* Card 4: Quality Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-border-color shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Category Averages</span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Cleanliness:</span>
                  <strong className="text-deep-plum">{summary.averageCleanliness ? `${summary.averageCleanliness.toFixed(1)} ★` : '—'}</strong>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Specialist Skill:</span>
                  <strong className="text-deep-plum">{summary.averageStaff ? `${summary.averageStaff.toFixed(1)} ★` : '—'}</strong>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Value for Money:</span>
                  <strong className="text-deep-plum">{summary.averageValue ? `${summary.averageValue.toFixed(1)} ★` : '—'}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-border-color shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reviews or client name..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-ivory/60 border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/30 outline-none"
              />
            </div>

            {/* Rating Filter */}
            <select
              value={ratingFilter}
              onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs bg-ivory/60 border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/30 outline-none text-deep-plum"
            >
              <option value="">All Star Ratings</option>
              <option value="5">5 Stars only</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>

            {/* Replied Filter */}
            <select
              value={repliedFilter}
              onChange={(e) => { setRepliedFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs bg-ivory/60 border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/30 outline-none text-deep-plum"
            >
              <option value="">All Statuses</option>
              <option value="false">Awaiting Salon Reply</option>
              <option value="true">Replied</option>
            </select>
          </div>

          {(ratingFilter || repliedFilter !== '' || searchQuery) && (
            <button
              onClick={() => { setRatingFilter(''); setRepliedFilter(''); setSearchQuery(''); setPage(1); }}
              className="text-xs text-primary-rose hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Reviews Feed */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted gap-2 bg-white rounded-3xl border border-border-color">
              <RefreshCw className="w-8 h-8 text-primary-rose animate-spin" />
              <span className="text-xs">Loading salon reviews...</span>
            </div>
          ) : reviewsList.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-border-color space-y-3">
              <MessageSquare className="w-10 h-10 text-dusty-rose mx-auto opacity-60" />
              <h3 className="font-serif font-semibold text-deep-plum text-lg">No reviews found</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                No customer reviews match your active filters. Once clients complete visits, their reviews will appear here.
              </p>
            </div>
          ) : (
            reviewsList.map((rev) => {
              const formattedDate = new Date(rev.createdAtUtc).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl border border-border-color p-5 sm:p-6 shadow-2xs hover:border-dusty-rose transition-all space-y-4"
                >
                  {/* Top line: customer info, ratings, and actions */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-soft-blush border border-dusty-rose/40 flex items-center justify-center font-serif font-bold text-xs text-deep-plum shrink-0">
                        {rev.customerName ? rev.customerName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-deep-plum text-sm">{rev.customerName}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-full">
                            <Check className="w-3 h-3 text-emerald-600" /> Verified Visit
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                          <div className="flex items-center text-amber-500">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span>•</span>
                          <span>{formattedDate}</span>
                          {rev.serviceName && (
                            <>
                              <span>•</span>
                              <span className="text-deep-plum font-medium">{rev.serviceName}</span>
                            </>
                          )}
                          {rev.staffName && (
                            <>
                              <span>•</span>
                              <span>Specialist: <strong>{rev.staffName}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action: Reply button */}
                    <button
                      type="button"
                      onClick={() => handleOpenReplyModal(rev)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                        rev.ownerReply
                          ? 'bg-ivory hover:bg-soft-blush text-deep-plum border border-border-color'
                          : 'bg-primary-rose text-white hover:bg-primary-rose/90 shadow-2xs'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{rev.ownerReply ? 'Edit Salon Response' : 'Reply to Client'}</span>
                    </button>
                  </div>

                  {/* Review Text */}
                  <div className="space-y-1">
                    {rev.title && (
                      <h4 className="font-serif font-semibold text-deep-plum text-sm">
                        {rev.title}
                      </h4>
                    )}
                    <p className="text-xs text-muted leading-relaxed whitespace-pre-line bg-ivory/40 p-3.5 rounded-xl border border-border-color/60">
                      {rev.comment}
                    </p>
                  </div>

                  {/* Photo attachments */}
                  {rev.photoUrls && rev.photoUrls.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-muted">Photos:</span>
                      {rev.photoUrls.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActivePhoto(url)}
                          className="w-12 h-12 rounded-xl overflow-hidden border border-border-color hover:border-primary-rose transition-all shadow-2xs cursor-pointer"
                        >
                          <img src={url} alt={`Client photo ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Owner Response Box */}
                  {rev.ownerReply && (
                    <div className="p-3.5 bg-soft-blush/35 rounded-xl border border-dusty-rose/25 text-xs space-y-1">
                      <div className="flex items-center justify-between text-deep-plum font-semibold">
                        <div className="flex items-center gap-1.5">
                          <CornerDownRight className="w-3.5 h-3.5 text-primary-rose" />
                          <span>Your Salon Response</span>
                        </div>
                        {rev.ownerRepliedAtUtc && (
                          <span className="text-[10px] text-muted font-normal">
                            Replied on {new Date(rev.ownerRepliedAtUtc).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-muted pl-5 whitespace-pre-line leading-relaxed">
                        {rev.ownerReply}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {summary?.reviews?.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-border-color text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 border border-border-color rounded-xl hover:bg-ivory disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <span className="text-muted">
              Page {page} of {summary.reviews.totalPages} ({summary.reviews.totalCount} reviews)
            </span>
            <button
              type="button"
              disabled={page >= summary.reviews.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3.5 py-1.5 border border-border-color rounded-xl hover:bg-ivory disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        )}

        {/* Modal: Owner Reply */}
        {replyingReview && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-border-color shadow-2xl overflow-hidden">
              
              <div className="px-6 py-4 border-b border-border-color bg-ivory/60 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-semibold text-deep-plum text-lg">
                    {replyingReview.ownerReply ? 'Edit Response' : 'Reply to Client Review'}
                  </h3>
                  <p className="text-xs text-muted">Client: {replyingReview.customerName}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseReplyModal}
                  className="p-1.5 rounded-full text-muted hover:text-deep-plum hover:bg-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Client's Original Feedback summary */}
                <div className="p-3 bg-ivory/60 rounded-xl border border-border-color text-xs space-y-1">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= replyingReview.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    ))}
                    <span className="text-deep-plum font-semibold ml-1.5">{replyingReview.title || 'Review'}</span>
                  </div>
                  <p className="text-muted italic line-clamp-2">"{replyingReview.comment}"</p>
                </div>

                {replySuccess && (
                  <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{replySuccess}</span>
                  </div>
                )}

                {replyError && (
                  <div className="p-3.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{replyError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitReply} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-deep-plum mb-1.5">
                      Your Official Salon Response
                    </label>
                    <textarea
                      rows={4}
                      required
                      minLength={2}
                      maxLength={2000}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Thank the client for visiting, express appreciation for their feedback, and welcome them back..."
                      className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-xl text-xs text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none resize-none"
                    />
                    <span className="text-[10px] text-muted text-right block mt-1">
                      {replyText.length} / 2000 characters
                    </span>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseReplyModal}
                      disabled={submittingReply}
                      className="px-4 py-2 text-xs text-muted hover:text-deep-plum rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="px-5 py-2 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                    >
                      {submittingReply ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Publish Response</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Photo Lightbox */}
        {activePhoto && (
          <div
            className="fixed inset-0 z-50 bg-deep-plum/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setActivePhoto(null)}
          >
            <div className="relative max-w-xl max-h-[85vh] bg-white rounded-2xl overflow-hidden p-2">
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="absolute top-4 right-4 p-1.5 bg-black/60 text-white rounded-full hover:bg-black transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <img src={activePhoto} alt="Review attachment" className="w-full max-h-[75vh] object-contain rounded-xl" />
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
