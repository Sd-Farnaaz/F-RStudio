import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicService } from '../../services/publicService';
import SalonCard from '../../components/common/SalonCard';
import { 
  Search, 
  MapPin, 
  Store, 
  Filter, 
  X, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Sparkles 
} from 'lucide-react';

const BUSINESS_TYPES = [
  'All',
  'Hair Salon',
  'Nail Salon',
  'Beauty Salon',
  'Spa',
  'Wellness',
  'Barbershop'
];

export default function SalonsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state synchronization
  const initialSearch = searchParams.get('q') || searchParams.get('search') || '';
  const initialCity = searchParams.get('city') || '';
  const initialType = searchParams.get('type') || searchParams.get('businessType') || 'All';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [cityFilter, setCityFilter] = useState(initialCity);
  const [selectedType, setSelectedType] = useState(initialType);
  const [currentPage, setCurrentPage] = useState(isNaN(initialPage) ? 1 : initialPage);

  const [salons, setSalons] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    totalCount: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSalons = useCallback(async (params) => {
    try {
      setLoading(true);
      setError('');

      const queryParams = {
        page: params.page || 1,
        pageSize: 12
      };

      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }

      if (params.city && params.city.trim()) {
        queryParams.city = params.city.trim();
      }

      if (params.businessType && params.businessType !== 'All') {
        queryParams.businessType = params.businessType.trim();
      }

      const data = await publicService.getSalons(queryParams);

      const items = data.items || (Array.isArray(data) ? data : []);
      setSalons(items);
      setPagination({
        page: data.page || params.page || 1,
        pageSize: data.pageSize || 12,
        totalCount: typeof data.totalCount === 'number' ? data.totalCount : items.length,
        totalPages: data.totalPages || Math.ceil((data.totalCount || items.length) / 12) || 1,
        hasPreviousPage: !!data.hasPreviousPage,
        hasNextPage: !!data.hasNextPage
      });
    } catch (err) {
      setError(err.message || 'Failed to load salons from directory.');
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync with URL and fetch
  useEffect(() => {
    fetchSalons({
      search: searchTerm,
      city: cityFilter,
      businessType: selectedType,
      page: currentPage
    });

    // Update query params in URL
    const nextParams = new URLSearchParams();
    if (searchTerm) nextParams.set('search', searchTerm);
    if (cityFilter) nextParams.set('city', cityFilter);
    if (selectedType && selectedType !== 'All') nextParams.set('type', selectedType);
    if (currentPage > 1) nextParams.set('page', currentPage.toString());
    setSearchParams(nextParams, { replace: true });
  }, [searchTerm, cityFilter, selectedType, currentPage, fetchSalons, setSearchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSalons({
      search: searchTerm,
      city: cityFilter,
      businessType: selectedType,
      page: 1
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setCityFilter('');
    setSelectedType('All');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm.trim() !== '' || cityFilter.trim() !== '' || selectedType !== 'All';

  return (
    <PublicLayout>
      <div className="bg-ivory min-h-screen pb-20">
        
        {/* ========================================================================= */}
        {/* 1. DISCOVERY HERO & FILTER BAR                                           */}
        {/* ========================================================================= */}
        <section className="bg-gradient-to-b from-rose-tint/40 via-soft-blush/20 to-ivory border-b border-border-color py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blush border border-dusty-rose/40 text-primary-rose text-xs font-semibold uppercase tracking-wider shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Salon Directory</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium text-deep-plum leading-tight">
                Discover Exceptional Salons & Studios
              </h1>

              <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
                Explore verified beauty professionals, view real service catalogs, and book appointments directly with real-time calendar availability.
              </p>
            </div>

            {/* Comprehensive Search & Filter Controls */}
            <div className="max-w-4xl mx-auto bg-white rounded-3xl p-4 sm:p-5 border border-border-color shadow-sm space-y-4">
              <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                
                {/* Search Text Input */}
                <div className="md:col-span-6 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Search by salon name or specialty..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/70 transition-all"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-deep-plum p-1"
                      aria-label="Clear search text"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* City Input */}
                <div className="md:col-span-4 relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="City or location..."
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/70 transition-all"
                  />
                  {cityFilter && (
                    <button
                      type="button"
                      onClick={() => setCityFilter('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-deep-plum p-1"
                      aria-label="Clear city"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Submit Action Button */}
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full h-full min-h-[42px] px-5 py-2.5 bg-primary-rose text-white text-xs sm:text-sm font-semibold rounded-2xl hover:bg-primary-rose/90 shadow-2xs hover:shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </button>
                </div>
              </form>

              {/* Category Pills Bar */}
              <div className="pt-3 border-t border-border-color/60 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3 text-primary-rose" />
                  <span>Category:</span>
                </span>

                {BUSINESS_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedType(type);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                      selectedType.toLowerCase() === type.toLowerCase()
                        ? 'bg-deep-plum text-white shadow-2xs'
                        : 'bg-ivory text-muted hover:text-deep-plum border border-border-color/80 hover:border-dusty-rose'
                    }`}
                  >
                    {type}
                  </button>
                ))}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="ml-auto shrink-0 text-xs text-primary-rose hover:text-deep-plum font-semibold flex items-center gap-1 pl-2 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. RESULTS GRID & PAGINATION                                             */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12">
          
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-deep-plum">
                Verified Salons
              </h2>
              {!loading && !error && (
                <span className="text-xs text-muted bg-white px-2.5 py-1 rounded-full border border-border-color shadow-2xs">
                  {pagination.totalCount} {pagination.totalCount === 1 ? 'salon found' : 'salons found'}
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted">Active Filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 bg-soft-blush text-primary-rose px-2.5 py-0.5 rounded-full border border-dusty-rose/40 font-medium">
                    Search: "{searchTerm}"
                    <button type="button" onClick={() => setSearchTerm('')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {cityFilter && (
                  <span className="inline-flex items-center gap-1 bg-soft-blush text-primary-rose px-2.5 py-0.5 rounded-full border border-dusty-rose/40 font-medium">
                    City: {cityFilter}
                    <button type="button" onClick={() => setCityFilter('')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedType !== 'All' && (
                  <span className="inline-flex items-center gap-1 bg-soft-blush text-primary-rose px-2.5 py-0.5 rounded-full border border-dusty-rose/40 font-medium">
                    Type: {selectedType}
                    <button type="button" onClick={() => setSelectedType('All')}><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Loading Skeletons */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-white rounded-3xl border border-border-color p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-soft-blush rounded-2xl" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-soft-blush rounded w-1/3" />
                      <div className="h-5 bg-soft-blush rounded w-3/4" />
                    </div>
                  </div>
                  <div className="h-12 bg-ivory rounded-xl" />
                  <div className="h-8 bg-soft-blush/60 rounded-xl" />
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State with Retry */
            <div className="bg-white rounded-3xl border border-border-color p-12 text-center max-w-lg mx-auto shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl font-medium text-deep-plum mb-2">
                Unable to Load Salons
              </h3>
              <p className="text-xs sm:text-sm text-muted mb-6 leading-relaxed">
                {error}
              </p>
              <button
                type="button"
                onClick={() => fetchSalons({ search: searchTerm, city: cityFilter, businessType: selectedType, page: currentPage })}
                className="px-6 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all"
              >
                Try Again
              </button>
            </div>
          ) : salons.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-3xl border border-border-color p-12 sm:p-16 text-center max-w-xl mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-soft-blush border border-dusty-rose/30 flex items-center justify-center text-primary-rose mx-auto mb-4 shadow-2xs">
                <Store className="w-8 h-8 opacity-75" />
              </div>
              <h3 className="font-serif text-2xl font-medium text-deep-plum mb-2">
                No Salons Found
              </h3>
              <p className="text-xs sm:text-sm text-muted max-w-sm mx-auto mb-6 leading-relaxed">
                {hasActiveFilters
                  ? "We couldn't find any salons matching your current filters. Try searching with different keywords or clearing your location."
                  : "No salons are currently listed in the public directory."}
              </p>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-xs transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All Filters</span>
                </button>
              )}
            </div>
          ) : (
            /* Real Salons Grid */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {salons.map(salon => (
                  <SalonCard key={salon.id} salon={salon} />
                ))}
              </div>

              {/* Real Backend Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="mt-12 pt-8 border-t border-border-color flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-muted">
                    Showing page <span className="font-semibold text-deep-plum">{pagination.page}</span> of <span className="font-semibold text-deep-plum">{pagination.totalPages}</span> ({pagination.totalCount} total salons)
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!pagination.hasPreviousPage}
                      className="px-4 py-2 bg-white text-deep-plum border border-border-color rounded-xl text-xs font-medium hover:bg-soft-blush transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    {/* Page Numbers Indicator */}
                    <div className="hidden sm:flex items-center gap-1 px-2">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-xl text-xs font-medium transition-colors ${
                            p === pagination.page
                              ? 'bg-deep-plum text-white shadow-2xs'
                              : 'bg-white text-muted hover:text-deep-plum border border-border-color hover:border-dusty-rose'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      disabled={!pagination.hasNextPage}
                      className="px-4 py-2 bg-white text-deep-plum border border-border-color rounded-xl text-xs font-medium hover:bg-soft-blush transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </section>

      </div>
    </PublicLayout>
  );
}
