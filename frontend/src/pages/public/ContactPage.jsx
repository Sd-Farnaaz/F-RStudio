import PublicLayout from '../../components/layout/PublicLayout';

export default function ContactPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-serif font-semibold text-deep-plum mb-6 text-center">Get in Touch</h1>
        <p className="text-muted text-lg text-center mb-12">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
        
        <form className="bg-white p-8 rounded-xl shadow-sm border border-border-color space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-deep-plum mb-2">First Name</label>
              <input type="text" className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-deep-plum mb-2">Last Name</label>
              <input type="text" className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-deep-plum mb-2">Email Address</label>
            <input type="email" className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-deep-plum mb-2">Message</label>
            <textarea rows="4" className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50"></textarea>
          </div>
          <button type="button" className="w-full py-3 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-colors">
            Send Message
          </button>
        </form>
      </div>
    </PublicLayout>
  );
}
