import PublicLayout from '../../components/layout/PublicLayout';

export default function PricingPage() {
  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-serif font-semibold text-deep-plum mb-6">Simple, Transparent Pricing</h1>
        <p className="text-muted text-lg mb-12">Choose the perfect plan for your business size.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pricing cards would go here */}
          <div className="p-8 bg-white rounded-xl shadow-sm border border-border-color">
            <h3 className="text-xl font-medium mb-4">Starter</h3>
            <p className="text-3xl font-serif font-semibold mb-6">$29<span className="text-lg text-muted font-sans font-normal">/mo</span></p>
            <button className="w-full py-2 bg-rose-tint text-primary-rose font-medium rounded-md hover:bg-rose-tint/80 transition-colors">Choose Starter</button>
          </div>
          <div className="p-8 bg-primary-rose text-white rounded-xl shadow-md transform scale-105">
            <h3 className="text-xl font-medium mb-4">Professional</h3>
            <p className="text-3xl font-serif font-semibold mb-6">$79<span className="text-lg text-rose-tint font-sans font-normal">/mo</span></p>
            <button className="w-full py-2 bg-white text-primary-rose font-medium rounded-md hover:bg-white/90 transition-colors">Choose Pro</button>
          </div>
          <div className="p-8 bg-white rounded-xl shadow-sm border border-border-color">
            <h3 className="text-xl font-medium mb-4">Enterprise</h3>
            <p className="text-3xl font-serif font-semibold mb-6">$199<span className="text-lg text-muted font-sans font-normal">/mo</span></p>
            <button className="w-full py-2 bg-rose-tint text-primary-rose font-medium rounded-md hover:bg-rose-tint/80 transition-colors">Choose Enterprise</button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
