import PublicLayout from '../../components/layout/PublicLayout';

export default function FeaturesPage() {
  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-serif font-semibold text-deep-plum mb-6">Features</h1>
        <p className="text-muted text-lg">Discover all the tools you need to run your salon seamlessly.</p>
        <div className="mt-12 p-8 bg-white rounded-xl shadow-sm border border-border-color">
          <p className="text-muted">Detailed features list coming soon...</p>
        </div>
      </div>
    </PublicLayout>
  );
}
