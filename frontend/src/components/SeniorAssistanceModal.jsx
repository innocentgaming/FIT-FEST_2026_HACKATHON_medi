import React, { useState, useEffect } from 'react';
import { useSenior } from '../context/SeniorContext';
import { useAuth } from '../context/AuthContext';
import { useEmergency } from '../context/EmergencyContext';
import {
  Phone,
  PhoneCall,
  PhoneForwarded,
  AlertTriangle,
  Heart,
  Pill,
  Droplet,
  Volume2,
  VolumeX,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  HelpCircle,
  Clock,
  X,
  Shield,
  Truck,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Activity,
  ArrowRight
} from 'lucide-react';

const HELPLINES = [
  {
    number: '108',
    title: 'Ambulance & Medical Emergency',
    subtitle: 'Free 24x7 Emergency Medical Dispatch',
    category: 'EMERGENCY',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    icon: '🚑'
  },
  {
    number: '14567',
    title: 'Elder Line (Senior Citizen Helpline)',
    subtitle: 'Govt. Dedicated Senior Support, Rescue & Care',
    category: 'SENIOR_CARE',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.4)',
    icon: '👴'
  },
  {
    number: '112',
    title: 'All-in-One National Emergency',
    subtitle: 'Police, Fire, Disaster & Immediate Aid',
    category: 'POLICE',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)',
    icon: '🚨'
  },
  {
    number: '1075',
    title: 'National Health & Tele-Doctor Helpline',
    subtitle: 'Free Doctor Consultation & Medical Guidance',
    category: 'HEALTH',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.4)',
    icon: '🩺'
  },
  {
    number: '102',
    title: 'Free Patient Transport & Aid',
    subtitle: 'Non-Critical Patient Transport & Elderly Transit',
    category: 'TRANSPORT',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.15)',
    border: 'rgba(139, 92, 246, 0.4)',
    icon: '🏥'
  },
  {
    number: '1090',
    title: 'Senior Citizen Police Safety Helpline',
    subtitle: 'Direct Police Protection & Wellness Check',
    category: 'SAFETY',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.15)',
    border: 'rgba(236, 72, 153, 0.4)',
    icon: '👮'
  }
];

export const SeniorAssistanceModal = () => {
  const {
    isSeniorModalOpen,
    closeSeniorModal,
    seniorTab,
    setSeniorTab,
    isSeniorModeActive,
    toggleSeniorMode,
    speechEnabled,
    toggleSpeech,
    speak,
    playDialTone,
    contacts,
    addContact,
    deleteContact,
    reminders,
    toggleReminder,
    triggerSeniorSOS,
    sosStatus,
    recentSosRequest,
    requestFamilyContactAlert
  } = useSenior();

  const { user } = useAuth();
  const { openEmergencyMode } = useEmergency();

  // Dialpad state
  const [dialedNumber, setDialedNumber] = useState('');
  const [activeCall, setActiveCall] = useState(null); // { number, name, duration }
  const [callDuration, setCallDuration] = useState(0);

  // New contact form state
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('Son / Daughter');
  const [newContactPhone, setNewContactPhone] = useState('');

  // New reminder state
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('12:00 PM');
  const [newReminderPeriod, setNewReminderPeriod] = useState('Afternoon');

  // Call duration timer
  useEffect(() => {
    let timer;
    if (activeCall) {
      timer = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [activeCall]);

  if (!isSeniorModalOpen) return null;

  // Handle dialpad button press
  const handleKeypadPress = (key) => {
    playDialTone(key);
    setDialedNumber((prev) => prev + key);
    if (speechEnabled) {
      const spokenKey = key === '*' ? 'Star' : key === '#' ? 'Hash' : key;
      speak(spokenKey);
    }
  };

  const handleBackspace = () => {
    setDialedNumber((prev) => prev.slice(0, -1));
    speak('Deleted');
  };

  const handleClearDial = () => {
    setDialedNumber('');
    speak('Cleared');
  };

  const startCall = (number, name = 'Direct Number') => {
    if (!number) return;
    speak(`Calling ${name}, number ${number}`);
    setActiveCall({ number, name });

    // Open actual native tel: handler
    try {
      window.location.href = `tel:${number}`;
    } catch (e) {
      console.warn('Native tel link trigger:', e);
    }
  };

  const endCall = () => {
    speak('Call ended');
    setActiveCall(null);
  };

  const sendSosSms = (contact) => {
    const loc = user?.address || 'Current Resident Location, Pune';
    const message = encodeURIComponent(
      `🚨 EMERGENCY ALERT: I am requesting urgent assistance from MediLink CARE. My location: ${loc}. Please check immediately!`
    );
    speak(`Opening SMS for ${contact.name}`);
    window.open(`sms:${contact.phone}?body=${message}`, '_blank');
  };

  const handleSaveContact = (e) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;
    addContact({
      name: newContactName,
      relation: newContactRelation,
      phone: newContactPhone,
      isPrimary: false
    });
    setNewContactName('');
    setNewContactPhone('');
    setShowAddContact(false);
  };

  const readGuideAloud = () => {
    speak(
      'MediLink Senior Assistance Guide. ' +
        'Step 1: Emergency Helplines. You can tap the red 108 card to call an ambulance, or tap 14567 for Senior Citizen Elder Line. ' +
        'Step 2: Family Speed Dial. Tap any contact card like Daughter or Son to call them in one tap. ' +
        'Step 3: Dialpad. You can use the large numbers to dial any phone number with audio tones. ' +
        'Step 4: Emergency SOS. Press the big Red SOS button to dispatch an ambulance directly to your address. ' +
        'Step 5: Medicine Reminders. Tap the checkbox when you take your daily pills.'
    );
  };

  return (
    <div className="modal-overlay senior-modal-overlay" style={{ zIndex: 10000, overflowY: 'auto' }}>
      <div
        className="modal-content senior-modal-container"
        style={{
          maxWidth: '1050px',
          width: '95%',
          margin: '2rem auto',
          background: 'var(--bg-main)',
          border: '2px solid var(--primary-light)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.25)',
          color: 'var(--text-primary)'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid var(--border-card)',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)'
              }}
            >
              👴
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  Senior Care & Easy Dial Assistance
                </h2>
                <span
                  style={{
                    background: 'var(--success-bg)',
                    color: 'var(--success-light)',
                    border: '1px solid var(--success-border)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  HIGH ACCESSIBILITY
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Large buttons, instant 1-tap emergency dial, voice guidance & family speed-dial.
              </p>
            </div>
          </div>

          {/* Accessibility Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Voice Guidance Toggle */}
            <button
              onClick={toggleSpeech}
              className={`btn ${speechEnabled ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1rem',
                fontSize: '0.88rem',
                fontWeight: 700
              }}
              title="Toggle Spoken Voice Assistance"
            >
              {speechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span>{speechEnabled ? 'Voice: ON' : 'Voice: OFF'}</span>
            </button>

            {/* Big Text / Senior Mode Toggle */}
            <button
              onClick={toggleSeniorMode}
              className={`btn ${isSeniorModeActive ? 'btn-success' : 'btn-secondary'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1rem',
                fontSize: '0.88rem',
                fontWeight: 700
              }}
              title="Toggle Extra Large Font & High Contrast"
            >
              <Sparkles size={18} />
              <span>{isSeniorModeActive ? 'Big Text: ON' : 'Enlarge Text'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={closeSeniorModal}
              className="btn btn-secondary"
              style={{ padding: '0.6rem', borderRadius: '50%' }}
              aria-label="Close Senior Assistance"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}
        >
          <button
            onClick={() => {
              setSeniorTab('DIAL');
              speak('Phone dialer and emergency numbers selected.');
            }}
            className={`btn ${seniorTab === 'DIAL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              fontSize: '1rem',
              fontWeight: 800,
              border: seniorTab === 'DIAL' ? '2px solid var(--primary-light)' : '1px solid var(--border-card)'
            }}
          >
            <PhoneCall size={20} />
            <span>📞 SPEED DIAL & NUMBERS</span>
          </button>

          <button
            onClick={() => {
              setSeniorTab('SOS');
              speak('Emergency SOS screen. Press the red button to call an ambulance.');
            }}
            className={`btn ${seniorTab === 'SOS' ? 'btn-danger' : 'btn-secondary'}`}
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              fontSize: '1rem',
              fontWeight: 800,
              border: seniorTab === 'SOS' ? '2px solid #ef4444' : '1px solid var(--border-card)'
            }}
          >
            <AlertTriangle size={20} />
            <span>🚨 1-TAP EMERGENCY SOS</span>
          </button>

          <button
            onClick={() => {
              setSeniorTab('MEDICINE');
              speak('Daily medicines and reminders selected.');
            }}
            className={`btn ${seniorTab === 'MEDICINE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              fontSize: '1rem',
              fontWeight: 800,
              border: seniorTab === 'MEDICINE' ? '2px solid var(--primary-light)' : '1px solid var(--border-card)'
            }}
          >
            <Pill size={20} />
            <span>💊 MEDICINES & VITAL CHECKS</span>
          </button>

          <button
            onClick={() => {
              setSeniorTab('GUIDE');
              speak('How to use this app guide selected.');
            }}
            className={`btn ${seniorTab === 'GUIDE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              fontSize: '1rem',
              fontWeight: 800,
              border: seniorTab === 'GUIDE' ? '2px solid var(--primary-light)' : '1px solid var(--border-card)'
            }}
          >
            <HelpCircle size={20} />
            <span>📖 HOW CAN I USE THIS?</span>
          </button>
        </div>

        {/* Active Call In-Progress Banner */}
        {activeCall && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25))',
              border: '2px solid #10b981',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'pulseBeacon 2s infinite',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <PhoneCall size={26} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>
                  CALL CONNECTED & IN PROGRESS
                </div>
                <h3 style={{ margin: '0.1rem 0', fontSize: '1.3rem' }}>{activeCall.name}</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Number: <strong style={{ color: '#fff' }}>{activeCall.number}</strong> • Duration:{' '}
                  {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </div>

            <button
              onClick={endCall}
              className="btn btn-danger"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)'
              }}
            >
              <Phone size={20} />
              <span>END CALL</span>
            </button>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 1: SPEED DIAL & NUMBERS */}
        {/* ============================================================= */}
        {seniorTab === 'DIAL' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Left Column: National & Emergency Helplines + Family Speed Dial */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Emergency Helplines (1-Tap Dial) */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span>🚑</span> National Emergency Helplines
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tap to call directly</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  {HELPLINES.map((h) => (
                    <div
                      key={h.number}
                      style={{
                        background: h.bg,
                        border: `2px solid ${h.border}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '0.9rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                      }}
                      onClick={() => startCall(h.number, h.title)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span style={{ fontSize: '1.8rem' }}>{h.icon}</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                fontSize: '1.25rem',
                                fontWeight: 900,
                                color: h.color,
                                letterSpacing: '0.05em'
                              }}
                            >
                              DIAL {h.number}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {h.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{h.subtitle}</div>
                        </div>
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{
                          background: h.color,
                          borderColor: h.color,
                          padding: '0.6rem 1.1rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          flexShrink: 0,
                          boxShadow: `0 4px 12px ${h.border}`
                        }}
                      >
                        <PhoneCall size={16} />
                        <span>CALL</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Family & Caregiver Speed Dial Cards */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span>👨‍👩‍👧</span> Family & Caregiver Speed Dial
                  </h3>
                  <button
                    onClick={() => setShowAddContact(!showAddContact)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Plus size={14} />
                    <span>{showAddContact ? 'Cancel' : 'Add Contact'}</span>
                  </button>
                </div>

                {/* Add Contact Drawer */}
                {showAddContact && (
                  <form
                    onSubmit={handleSaveContact}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-light)' }}>
                      Save Emergency Caregiver / Relative Contact
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Name (e.g. Daughter Ananya)"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="form-control"
                        required
                        style={{ padding: '0.6rem', fontSize: '0.9rem' }}
                      />
                      <input
                        type="tel"
                        placeholder="Phone (e.g. +91 98220 12345)"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        className="form-control"
                        required
                        style={{ padding: '0.6rem', fontSize: '0.9rem' }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Relation / Note (e.g. Primary Caregiver, Flat 402)"
                      value={newContactRelation}
                      onChange={(e) => setNewContactRelation(e.target.value)}
                      className="form-control"
                      style={{ padding: '0.6rem', fontSize: '0.9rem' }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      style={{ fontWeight: 700, alignSelf: 'flex-start' }}
                    >
                      Save Contact
                    </button>
                  </form>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: 'var(--bg-subtle)',
                        border: c.isPrimary ? '2px solid var(--primary-light)' : '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.9rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{c.name}</span>
                          {c.isPrimary && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                background: 'var(--primary-glow)',
                                color: 'var(--primary-light)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                fontWeight: 700
                              }}
                            >
                              PRIMARY
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.relation}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#38bdf8', marginTop: '0.2rem' }}>
                          {c.phone}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {/* 1-Click to trigger confirmation step */}
                        <button
                          onClick={() => requestFamilyContactAlert(c, 'CALL_AND_SMS')}
                          className="btn btn-success"
                          style={{
                            padding: '0.55rem 0.95rem',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
                          }}
                          title="Click to Alert & Call Family Member (Requires 2nd confirmation click)"
                        >
                          <PhoneCall size={15} />
                          <span>CALL & ALERT</span>
                        </button>

                        {/* SOS SMS Button */}
                        <button
                          onClick={() => requestFamilyContactAlert(c, 'SMS')}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.55rem 0.75rem',
                            fontSize: '0.85rem'
                          }}
                          title="Send Emergency Location SMS"
                        >
                          <MessageSquare size={15} />
                        </button>

                        {!c.isPrimary && (
                          <button
                            onClick={() => deleteContact(c.id)}
                            className="btn btn-secondary"
                            style={{ padding: '0.55rem', color: 'var(--danger-light)' }}
                            title="Delete Contact"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Tactile Big-Button Dialpad */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.25rem' }}>🔢 Big Keypad Dialer</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Press keys to hear dial tone & speech pronunciation
                </p>
              </div>

              {/* Number Display */}
              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '2px solid var(--border-focus)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  minHeight: '70px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem'
                }}
              >
                <div
                  style={{
                    fontSize: dialedNumber ? '1.8rem' : '1.2rem',
                    fontWeight: 900,
                    color: dialedNumber ? 'var(--text-primary)' : 'var(--text-muted)',
                    letterSpacing: '0.1em',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {dialedNumber || 'Dial any number...'}
                </div>

                {dialedNumber && (
                  <button
                    onClick={handleBackspace}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      color: 'var(--warning-light)'
                    }}
                    title="Backspace"
                  >
                    ⌫
                  </button>
                )}
              </div>

              {/* Keypad Grid (3x4) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.85rem',
                  marginBottom: '1.25rem'
                }}
              >
                {[
                  { key: '1', sub: ' ' },
                  { key: '2', sub: 'ABC' },
                  { key: '3', sub: 'DEF' },
                  { key: '4', sub: 'GHI' },
                  { key: '5', sub: 'JKL' },
                  { key: '6', sub: 'MNO' },
                  { key: '7', sub: 'PQRS' },
                  { key: '8', sub: 'TUV' },
                  { key: '9', sub: 'WXYZ' },
                  { key: '*', sub: ' ' },
                  { key: '0', sub: '+' },
                  { key: '#', sub: ' ' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleKeypadPress(item.key)}
                    className="senior-keypad-btn"
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '2px solid var(--border-card)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '0.9rem 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '1.6rem',
                        fontWeight: 900,
                        color: 'var(--text-primary)',
                        lineHeight: 1.1
                      }}
                    >
                      {item.key}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        letterSpacing: '0.1em'
                      }}
                    >
                      {item.sub}
                    </span>
                  </button>
                ))}
              </div>

              {/* Keypad Actions: Call & Clear */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <button
                  onClick={() => startCall(dialedNumber, 'Dialed Number')}
                  disabled={!dialedNumber}
                  className="btn btn-success"
                  style={{
                    padding: '1rem',
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    boxShadow: dialedNumber ? '0 0 25px rgba(16, 185, 129, 0.45)' : 'none'
                  }}
                >
                  <PhoneCall size={22} />
                  <span>CALL NOW</span>
                </button>

                <button
                  onClick={handleClearDial}
                  disabled={!dialedNumber}
                  className="btn btn-secondary"
                  style={{
                    padding: '1rem',
                    fontSize: '0.95rem',
                    fontWeight: 700
                  }}
                >
                  CLEAR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: 1-TAP EMERGENCY SOS */}
        {/* ============================================================= */}
        {seniorTab === 'SOS' && (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              textAlign: 'center'
            }}
          >
            <div style={{ maxWidth: '650px', margin: '0 auto' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger-light)',
                  padding: '0.4rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  marginBottom: '1.5rem'
                }}
              >
                <AlertTriangle size={18} />
                <span>SENIOR EMERGENCY RESCUE DISPATCH</span>
              </div>

              <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 0.5rem' }}>
                Press Big SOS Button Below for Immediate Help
              </h2>
              <p
                style={{
                  fontSize: '1.05rem',
                  color: 'var(--text-secondary)',
                  margin: '0 auto 2rem',
                  lineHeight: 1.5
                }}
              >
                One touch instantly books the nearest emergency ambulance, sends alert to hospital emergency gate,
                and calls/notifies your primary family caregiver.
              </p>

              {/* Massive SOS Button */}
              <div style={{ margin: '2rem 0' }}>
                <button
                  onClick={() => triggerSeniorSOS(user)}
                  disabled={sosStatus === 'triggering'}
                  style={{
                    width: '240px',
                    height: '240px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #ef4444 0%, #b91c1c 100%)',
                    color: '#ffffff',
                    border: '8px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 0 50px rgba(239, 68, 68, 0.7), inset 0 0 20px rgba(0,0,0,0.4)',
                    fontSize: '2.4rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    animation: sosStatus === 'dispatched' ? 'none' : 'pulseEmergency 1.8s infinite'
                  }}
                  className="senior-sos-master-btn"
                >
                  <AlertTriangle size={48} style={{ marginBottom: '0.2rem' }} />
                  <span>SOS</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, opacity: 0.9, letterSpacing: '0.05em' }}>
                    {sosStatus === 'triggering' ? 'DISPATCHING...' : 'TOUCH FOR HELP'}
                  </span>
                </button>
              </div>

              {/* SOS Dispatch Confirmation & Live Tracking */}
              {sosStatus === 'dispatched' && recentSosRequest && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
                    border: '2px solid #10b981',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    marginTop: '1.5rem',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <CheckCircle2 size={28} color="#10b981" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#34d399' }}>
                        Ambulance Dispatched! Help is on the way.
                      </h3>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Request ID: #{recentSosRequest.id} • Assigned to Pune Emergency Response Unit
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '0.75rem',
                      marginTop: '1rem',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Arrival:</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>6 - 8 Minutes</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nearest Hospital:</span>
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>Ruby Hall Clinic Emergency Gate</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Family Alerted:</span>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399' }}>SMS & Call Triggered</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => {
                        closeSeniorModal();
                        openEmergencyMode('STATUS');
                      }}
                      className="btn btn-primary"
                      style={{ fontWeight: 800, padding: '0.75rem 1.25rem' }}
                    >
                      <Truck size={18} />
                      <span>View Live GPS Ambulance Map</span>
                    </button>

                    <button
                      onClick={() => startCall('108', 'Ambulance Control 108')}
                      className="btn btn-danger"
                      style={{ fontWeight: 800, padding: '0.75rem 1.25rem' }}
                    >
                      <PhoneCall size={18} />
                      <span>Call 108 Operator Directly</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: MEDICINES & VITAL REMINDERS */}
        {/* ============================================================= */}
        {seniorTab === 'MEDICINE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
                    💊 Today's Medicine & Vital Checklist
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Large 1-tap checkmarks with spoken voice confirmations
                  </p>
                </div>

                <button
                  onClick={() => {
                    const pending = reminders.filter((r) => !r.taken);
                    if (pending.length === 0) {
                      speak('All your medicines for today are completed! Great job taking care of your health.');
                    } else {
                      speak(
                        `You have ${pending.length} pending tasks: ${pending.map((p) => p.title).join(', ')}.`
                      );
                    }
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                >
                  <Volume2 size={16} />
                  <span>Read Pending Medicines</span>
                </button>
              </div>

              {/* Reminders List */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
                {reminders.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => toggleReminder(r.id)}
                    style={{
                      background: r.taken ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-subtle)',
                      border: r.taken ? '2px solid rgba(16, 185, 129, 0.4)' : '2px solid var(--border-card)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: r.taken ? '#10b981' : 'var(--bg-input)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid ' + (r.taken ? '#10b981' : 'var(--border-card)'),
                          flexShrink: 0
                        }}
                      >
                        {r.taken ? <CheckCircle2 size={24} /> : <Circle size={24} color="var(--text-muted)" />}
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: '1.15rem',
                            fontWeight: 800,
                            color: r.taken ? 'var(--text-primary)' : 'var(--text-primary)',
                            textDecoration: r.taken ? 'line-through' : 'none',
                            opacity: r.taken ? 0.8 : 1
                          }}
                        >
                          {r.title}
                        </div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          ⏰ Scheduled: <strong style={{ color: '#38bdf8' }}>{r.time}</strong> ({r.period})
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        background: r.taken ? '#10b981' : 'var(--bg-input)',
                        color: r.taken ? '#ffffff' : 'var(--text-muted)',
                        border: '1px solid ' + (r.taken ? '#10b981' : 'var(--border-card)')
                      }}
                    >
                      {r.taken ? '✓ TAKEN' : 'TAP TO TAKE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 4: HOW CAN I USE THIS? (SENIOR USER GUIDE) */}
        {/* ============================================================= */}
        {seniorTab === 'GUIDE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
                    📖 Simple Guide for Senior Citizens
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Easy 4-step walkthrough on how to use all features effortlessly.
                  </p>
                </div>

                <button
                  onClick={readGuideAloud}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}
                >
                  <Volume2 size={18} />
                  <span>🔊 READ GUIDE ALOUD</span>
                </button>
              </div>

              {/* 4 Clear Step Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Step 1 */}
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.2rem',
                      marginBottom: '0.75rem'
                    }}
                  >
                    1
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.4rem' }}>
                    📞 How to Dial Helplines (108 / 14567)
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Click on the <strong>Speed Dial</strong> tab. Tap the red <strong>CALL 108</strong> button to speak
                    with the ambulance control room, or dial <strong>14567</strong> for the Senior Citizen Elder Line.
                  </p>
                </div>

                {/* Step 2 */}
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#38bdf8',
                      color: '#090e1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.2rem',
                      marginBottom: '0.75rem'
                    }}
                  >
                    2
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.4rem' }}>
                    👨‍👩‍👧 Call Family / Son / Daughter
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Look under <strong>Family Speed Dial</strong>. Tap the green <strong>CALL</strong> button next to
                    your child or doctor to call them instantly, or tap the message icon to send an emergency SMS.
                  </p>
                </div>

                {/* Step 3 */}
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#10b981',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.2rem',
                      marginBottom: '0.75rem'
                    }}
                  >
                    3
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.4rem' }}>
                    🚨 Press Red SOS Button
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    If you are alone and feeling unwell, open the <strong>1-Tap SOS</strong> tab and press the big glowing
                    Red SOS circle. An ambulance is immediately routed to your home address.
                  </p>
                </div>

                {/* Step 4 */}
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#8b5cf6',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.2rem',
                      marginBottom: '0.75rem'
                    }}
                  >
                    4
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.4rem' }}>
                    🔠 Enlarge Text & Hear Speech
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Tap the <strong>Enlarge Text</strong> button at top right to make everything on your screen bigger and
                    clearer. Keep <strong>Voice: ON</strong> to hear every button spoken out loud.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
