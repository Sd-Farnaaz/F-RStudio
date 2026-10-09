import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicService } from '../../services/publicService';
import { Search, MapPin, Store } from 'lucide-react';

export default function SalonsListPage() {
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchSalons = async (term = '') => {
    try {
      setLoading(true);
      setError('');
      // We pass searchTerm as `query` or `city` or whatever the API supports.
      // Based on common patterns, let's just use `search` or omit if empty.
      const params = term ? { search: term } : {};
      const data = await publicService.getSalons(params);
      setSalons(data.items || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load salons');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSalons(searchTerm);
  };

  return (
    <PublicLayout>
      <div className="bg-ivory border-b border-border-color py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-semibold text-deep-plum mb-6">Discover Premium Salons</h1>
          <p className="text-xl text-muted max-w-2xl mx-auto mb-10">
            Find and book appointments with the best hair, nail, and beauty professionals near you.
          </p>
          
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex items-center bg-white p-2 rounded-lg shadow-sm border border-border-color">
            <Search className="w-5 h-5 text-muted ml-3 mr-2" />
            <input 
              type="text" 
              placeholder="Search salons by name or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-2 py-2 outline-none text-deep-plum"
            />
            <button type="submit" className="px-6 py-2 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-colors">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4 text-lg">{error}</div>
            <button onClick={() => fetchSalons(searchTerm)} className="px-6 py-2 bg-white border border-border-color rounded-md shadow-sm">Try Again</button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 bg-white rounded-xl border border-border-color animate-pulse" />
            ))}
          </div>
        ) : salons.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-border-color shadow-sm">
            <Store className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-deep-plum mb-2">No salons found</h3>
            <p className="text-muted">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {salons.map(salon => (
              <Link key={salon.id} to={`/salons/${salon.slug}`} className="group bg-white rounded-xl border border-border-color overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="h-48 bg-rose-tint relative">
                  {/* Placeholder for salon image since backend doesn't have an ImageUrl in the DTO */}
                  <div className="absolute inset-0 flex items-center justify-center text-primary-rose/30">
                    <Store className="w-16 h-16" />
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-serif font-medium text-deep-plum group-hover:text-primary-rose transition-colors line-clamp-1">{salon.name}</h2>
                    <span className="text-xs font-medium px-2 py-1 bg-soft-blush text-primary-rose rounded-full">{salon.businessType}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted mb-4 mt-auto pt-4">
                    <MapPin className="w-4 h-4 mr-1 shrink-0" />
                    <span className="truncate">{[salon.city, salon.state, salon.country].filter(Boolean).join(', ') || 'Location not provided'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
