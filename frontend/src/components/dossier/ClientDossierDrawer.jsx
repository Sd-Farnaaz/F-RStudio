import { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles, Plus, 
  Calendar, Clock, User, Phone, Save, Trash2, Beaker, FileText, CheckCircle2 
} from 'lucide-react';
import { clientDossierService } from '../../services/clientDossierService';

export default function ClientDossierDrawer({ customerId, isOpen, onClose, staffList = [] }) {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [activeTab, setActiveTab] = useState('consultation'); // consultation | formulas | visits
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Editable consultation card state
  const [allergies, setAllergies] = useState('');
  const [skinOrHairNotes, setSkinOrHairNotes] = useState('');
  const [privateStaffNotes, setPrivateStaffNotes] = useState('');
  const [isPatchTested, setIsPatchTested] = useState(false);
  const [patchTestDate, setPatchTestDate] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // New formula form state
  const [showAddFormula, setShowAddFormula] = useState(false);
  const [formulaStaffId, setFormulaStaffId] = useState('');
  const [formulaCategory, setFormulaCategory] = useState('Color');
  const [formulaDetails, setFormulaDetails] = useState('');
  const [formulaDeveloper, setFormulaDeveloper] = useState('');
  const [formulaProcessingMins, setFormulaProcessingMins] = useState('');
  const [formulaNotes, setFormulaNotes] = useState('');
  const [savingFormula, setSavingFormula] = useState(false);

  useEffect(() => {
    if (isOpen && customerId) {
      loadDossier();
    }
  }, [isOpen, customerId]);

  const loadDossier = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      const data = await clientDossierService.getDossier(customerId);
      setDossier(data);

      const card = data.consultationCard;
      if (card) {
        setAllergies(card.allergies || '');
        setSkinOrHairNotes(card.skinOrHairNotes || '');
        setPrivateStaffNotes(card.privateStaffNotes || '');
        setIsPatchTested(card.isPatchTested || false);
        setPatchTestDate(card.patchTestDate ? card.patchTestDate.split('T')[0] : '');
        setEmergencyContactName(card.emergencyContactName || '');
        setEmergencyContactPhone(card.emergencyContactPhone || '');
      } else {
        setAllergies('');
        setSkinOrHairNotes('');
        setPrivateStaffNotes('');
        setIsPatchTested(false);
        setPatchTestDate('');
        setEmergencyContactName('');
        setEmergencyContactPhone('');
      }
    } catch (err) {
      setError(err.message || 'Failed to load client dossier.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    try {
      setSavingCard(true);
      setError('');
      setSuccessMessage('');
      await clientDossierService.updateConsultation(customerId, {
        allergies,
        skinOrHairNotes,
        privateStaffNotes,
        isPatchTested,
        patchTestDate: patchTestDate ? new Date(patchTestDate).toISOString() : null,
        emergencyContactName,
        emergencyContactPhone
      });
      setSuccessMessage('Consultation card saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadDossier();
    } catch (err) {
      setError(err.message || 'Failed to update consultation card.');
    } finally {
      setSavingCard(false);
    }
  };

  const handleAddFormula = async (e) => {
    e.preventDefault();
    if (!formulaDetails.trim()) {
      setError('Formula details are required.');
      return;
    }

    try {
      setSavingFormula(true);
      setError('');
      await clientDossierService.addFormula(customerId, {
        staffId: formulaStaffId ? parseInt(formulaStaffId) : null,
        category: formulaCategory,
        formulaDetails: formulaDetails.trim(),
        developer: formulaDeveloper.trim() || null,
        processingTimeMinutes: formulaProcessingMins ? parseInt(formulaProcessingMins) : null,
        notes: formulaNotes.trim() || null
      });

      // Reset formula form
      setFormulaDetails('');
      setFormulaDeveloper('');
      setFormulaProcessingMins('');
      setFormulaNotes('');
      setShowAddFormula(false);
      setSuccessMessage('Color formula logged!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadDossier();
    } catch (err) {
      setError(err.message || 'Failed to save formula record.');
    } finally {
      setSavingFormula(false);
    }
  };

  const handleDeleteFormula = async (formulaId) => {
    if (!window.confirm('Delete this formula record?')) return;
    try {
      await clientDossierService.deleteFormula(customerId, formulaId);
      loadDossier();
    } catch (err) {
      setError(err.message || 'Failed to delete formula record.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-deep-plum/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full transform transition-all duration-300">
          
          {/* Header */}
          <div className="p-6 border-b border-border-color bg-soft-blush/40 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-rose/10 text-primary-rose">
                  Client Dossier
                </span>
                {isPatchTested ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" /> Patch Tested
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    <ShieldAlert className="w-3.5 h-3.5" /> No Patch Test
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-serif font-bold text-deep-plum mt-1">
                {dossier?.fullName || 'Client Profile'}
              </h2>
              <p className="text-xs text-muted">
                {dossier?.email} • Client ID #{customerId}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-muted hover:text-deep-plum hover:bg-white rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Allergy Red Alert Banner if present */}
          {allergies && (
            <div className="mx-6 mt-4 p-3.5 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-900">
                  Critical Allergy & Sensitivity Alert
                </p>
                <p className="text-sm text-rose-800 mt-0.5 font-medium">
                  {allergies}
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-border-color px-6 mt-3 bg-white">
            <button
              onClick={() => setActiveTab('consultation')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'consultation'
                  ? 'border-primary-rose text-primary-rose'
                  : 'border-transparent text-muted hover:text-deep-plum'
              }`}
            >
              <FileText className="w-4 h-4" /> Consultation Card
            </button>
            <button
              onClick={() => setActiveTab('formulas')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'formulas'
                  ? 'border-primary-rose text-primary-rose'
                  : 'border-transparent text-muted hover:text-deep-plum'
              }`}
            >
              <Beaker className="w-4 h-4" /> Color Formulas ({dossier?.formulas?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('visits')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'visits'
                  ? 'border-primary-rose text-primary-rose'
                  : 'border-transparent text-muted hover:text-deep-plum'
              }`}
            >
              <Calendar className="w-4 h-4" /> Visit History ({dossier?.visitHistory?.length || 0})
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mx-6 mt-3 p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mx-6 mt-3 p-3 text-xs bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {successMessage}
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {loading ? (
              <div className="py-20 text-center text-muted">
                <div className="inline-block animate-spin w-8 h-8 border-4 border-primary-rose border-t-transparent rounded-full mb-3" />
                <p>Loading dossier records...</p>
              </div>
            ) : activeTab === 'consultation' ? (
              /* Tab 1: Consultation Card Form */
              <form onSubmit={handleSaveCard} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                    Allergies & Scalp / Skin Sensitivities
                  </label>
                  <textarea
                    rows={2}
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Sensitive to PPD, latex allergy, reacts to high ammonia bleach..."
                    className="w-full px-3.5 py-2.5 text-sm border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/20 focus:border-primary-rose bg-rose-50/20"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    Triggers a high-priority warning banner across the calendar and cashier screen.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-border-color rounded-xl">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPatchTested}
                        onChange={(e) => setIsPatchTested(e.target.checked)}
                        className="w-4 h-4 text-primary-rose rounded focus:ring-primary-rose border-border-color"
                      />
                      <span className="text-xs font-semibold text-deep-plum">
                        Patch Test Verified
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Patch Test Date
                    </label>
                    <input
                      type="date"
                      value={patchTestDate}
                      onChange={(e) => setPatchTestDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-border-color rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                    Hair Texture & Skin Condition Notes
                  </label>
                  <textarea
                    rows={3}
                    value={skinOrHairNotes}
                    onChange={(e) => setSkinOrHairNotes(e.target.value)}
                    placeholder="e.g. Fine, porosity 4, previous box dye on ends, dry scalp, prone to breakage..."
                    className="w-full px-3.5 py-2.5 text-sm border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/20 focus:border-primary-rose"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                    Private Salon & Stylist Notes
                  </label>
                  <textarea
                    rows={3}
                    value={privateStaffNotes}
                    onChange={(e) => setPrivateStaffNotes(e.target.value)}
                    placeholder="e.g. Prefers quiet appointments, drinks green tea, wedding coming up in Nov..."
                    className="w-full px-3.5 py-2.5 text-sm border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/20 focus:border-primary-rose"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    Private to your salon team. Never shown to the customer.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="e.g. Sarah Smith"
                      className="w-full px-3 py-2 text-sm border border-border-color rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Emergency Phone
                    </label>
                    <input
                      type="text"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 text-sm border border-border-color rounded-xl"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingCard}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-primary-rose text-white text-sm font-semibold rounded-xl hover:bg-deep-plum transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingCard ? 'Saving Changes...' : 'Save Consultation Card'}
                </button>
              </form>
            ) : activeTab === 'formulas' ? (
              /* Tab 2: Color & Chemical Formulas */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-deep-plum">
                    Formula Archive & Recipe History
                  </h3>
                  <button
                    onClick={() => setShowAddFormula(!showAddFormula)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-tint text-primary-rose rounded-lg hover:bg-primary-rose hover:text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showAddFormula ? 'Cancel' : 'Log New Formula'}
                  </button>
                </div>

                {showAddFormula && (
                  <form onSubmit={handleAddFormula} className="p-4 bg-soft-blush/30 border border-border-color rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-deep-plum uppercase tracking-wider">
                      Add Chemical Formula Record
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Category</label>
                        <select
                          value={formulaCategory}
                          onChange={(e) => setFormulaCategory(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-border-color rounded-lg bg-white"
                        >
                          <option value="Color">Permanent Color</option>
                          <option value="Bleach">Lightener / Bleach</option>
                          <option value="Toner">Gloss / Toner</option>
                          <option value="Balayage">Balayage / Foils</option>
                          <option value="Keratin">Keratin / Smoothing</option>
                          <option value="Perm">Perm / Relaxer</option>
                          <option value="Treatment">Bond Builder / Treatment</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Formulated By</label>
                        <select
                          value={formulaStaffId}
                          onChange={(e) => setFormulaStaffId(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-border-color rounded-lg bg-white"
                        >
                          <option value="">Select Stylist</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>{s.fullName}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Formula Recipe & Mix *</label>
                      <textarea
                        rows={2}
                        required
                        value={formulaDetails}
                        onChange={(e) => setFormulaDetails(e.target.value)}
                        placeholder="e.g. Roots: 6N (30g) + 6T (15g) with 20 Vol (45g). Ends: 9GI + Clear 1:1."
                        className="w-full px-3 py-2 text-xs border border-border-color rounded-lg bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Developer Volume</label>
                        <input
                          type="text"
                          value={formulaDeveloper}
                          onChange={(e) => setFormulaDeveloper(e.target.value)}
                          placeholder="e.g. 20 Vol (6%)"
                          className="w-full px-2.5 py-1.5 text-xs border border-border-color rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Processing Time (mins)</label>
                        <input
                          type="number"
                          value={formulaProcessingMins}
                          onChange={(e) => setFormulaProcessingMins(e.target.value)}
                          placeholder="e.g. 35"
                          className="w-full px-2.5 py-1.5 text-xs border border-border-color rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Stylist Outcome & Result Notes</label>
                      <input
                        type="text"
                        value={formulaNotes}
                        onChange={(e) => setFormulaNotes(e.target.value)}
                        placeholder="e.g. Lifted evenly to level 9, no brassiness, hair condition excellent."
                        className="w-full px-2.5 py-1.5 text-xs border border-border-color rounded-lg bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingFormula}
                      className="w-full py-2 bg-primary-rose text-white text-xs font-semibold rounded-lg hover:bg-deep-plum transition-colors disabled:opacity-50"
                    >
                      {savingFormula ? 'Saving...' : 'Save Formula to Dossier'}
                    </button>
                  </form>
                )}

                {/* Formula List */}
                {dossier?.formulas && dossier.formulas.length > 0 ? (
                  <div className="space-y-3">
                    {dossier.formulas.map((f) => (
                      <div key={f.id} className="p-4 border border-border-color rounded-2xl bg-white shadow-sm hover:shadow transition-all relative group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                              {f.category}
                            </span>
                            <span className="text-xs text-muted">
                              {new Date(f.serviceDateUtc).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted font-medium">
                              {f.staffName || 'Stylist'}
                            </span>
                            <button
                              onClick={() => handleDeleteFormula(f.id)}
                              className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Formula Recipe Block */}
                        <div className="p-3 bg-gray-50 rounded-xl font-mono text-xs text-deep-plum border border-gray-200/80 mb-2 whitespace-pre-wrap leading-relaxed">
                          {f.formulaDetails}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                          {f.developer && (
                            <span><strong>Developer:</strong> {f.developer}</span>
                          )}
                          {f.processingTimeMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {f.processingTimeMinutes} mins
                            </span>
                          )}
                          {f.notes && (
                            <span className="italic">"{f.notes}"</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted bg-gray-50/50 rounded-2xl border border-dashed border-border-color">
                    <Beaker className="w-8 h-8 text-border-color mx-auto mb-2" />
                    <p className="text-sm font-medium">No color or chemical formulas on record</p>
                    <p className="text-xs text-muted mt-1">Log exact recipes and developer ratios for future visits.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Tab 3: Visit History */
              <div className="space-y-3">
                {dossier?.visitHistory && dossier.visitHistory.length > 0 ? (
                  <div className="space-y-3">
                    {dossier.visitHistory.map((v) => (
                      <div key={v.appointmentId} className="p-4 border border-border-color rounded-2xl bg-white shadow-sm flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-deep-plum">
                              {v.serviceName}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              v.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                              v.status === 'Confirmed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {v.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(v.startAtUtc).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span>•</span>
                            <span>Stylist: {v.staffName}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-deep-plum">₹{v.price}</span>
                          <p className="text-[10px] text-muted capitalize">{v.paymentStatus}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted bg-gray-50/50 rounded-2xl border border-dashed border-border-color">
                    <Calendar className="w-8 h-8 text-border-color mx-auto mb-2" />
                    <p className="text-sm font-medium">No past visits recorded for this salon</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

