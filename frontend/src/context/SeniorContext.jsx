import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useSocket } from './SocketContext';

const SeniorContext = createContext(null);

// Standard DTMF dial tone frequencies
const DTMF_FREQS = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

const DEFAULT_CONTACTS = [
  { id: 'c1', name: 'Daughter (Ananya)', relation: 'Daughter / Primary Caregiver', phone: '+919822012345', isPrimary: true },
  { id: 'c2', name: 'Son (Rahul)', relation: 'Son', phone: '+919876543210', isPrimary: false },
  { id: 'c3', name: 'Dr. Rao (Family Doctor)', relation: 'Cardiologist & Physician', phone: '+919422001122', isPrimary: false },
  { id: 'c4', name: 'Mr. Kulkarni (Neighbor)', relation: 'Next Door Neighbor (Flat 402)', phone: '+919850112233', isPrimary: false }
];

const DEFAULT_REMINDERS = [
  { id: 'r1', title: 'Blood Pressure Tablet (Telmisartan 40mg)', time: '8:00 AM', period: 'Morning - After Breakfast', taken: true, icon: 'pill' },
  { id: 'r2', title: 'Check Blood Sugar & Record', time: '11:30 AM', period: 'Pre-Lunch Check', taken: false, icon: 'droplet' },
  { id: 'r3', title: 'Hydration - Drink 2 Glasses of Water', time: '3:00 PM', period: 'Afternoon Hydration', taken: false, icon: 'water' },
  { id: 'r4', title: 'Night Heart Pill & Joint Relief (Atorvastatin)', time: '9:00 PM', period: 'Bedtime Routine', taken: false, icon: 'heart' }
];

export const SeniorProvider = ({ children }) => {
  const [isSeniorModalOpen, setIsSeniorModalOpen] = useState(false);
  const [seniorTab, setSeniorTab] = useState('DIAL'); // DIAL, SOS, MEDICINE, GUIDE
  const [isSeniorModeActive, setIsSeniorModeActive] = useState(() => {
    return localStorage.getItem('medilink_senior_mode') === 'true';
  });
  const [speechEnabled, setSpeechEnabled] = useState(() => {
    return localStorage.getItem('medilink_senior_speech') !== 'false';
  });

  const [contacts, setContacts] = useState(() => {
    try {
      const saved = localStorage.getItem('medilink_senior_contacts');
      return saved ? JSON.parse(saved) : DEFAULT_CONTACTS;
    } catch {
      return DEFAULT_CONTACTS;
    }
  });

  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem('medilink_senior_reminders');
      return saved ? JSON.parse(saved) : DEFAULT_REMINDERS;
    } catch {
      return DEFAULT_REMINDERS;
    }
  });

  const [sosStatus, setSosStatus] = useState(null); // idle, triggering, dispatched
  const [recentSosRequest, setRecentSosRequest] = useState(null);
  const { addToast } = useSocket() || {};

  // Audio Context for DTMF tones
  const [audioCtx, setAudioCtx] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      setAudioCtx(new Ctx());
    }
  }, []);

  // Sync Senior Mode class to body
  useEffect(() => {
    if (isSeniorModeActive) {
      document.body.classList.add('senior-mode-active');
      localStorage.setItem('medilink_senior_mode', 'true');
    } else {
      document.body.classList.remove('senior-mode-active');
      localStorage.setItem('medilink_senior_mode', 'false');
    }
  }, [isSeniorModeActive]);

  useEffect(() => {
    localStorage.setItem('medilink_senior_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('medilink_senior_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('medilink_senior_speech', speechEnabled ? 'true' : 'false');
  }, [speechEnabled]);

  // Voice narration helper
  const speak = useCallback((text) => {
    if (!speechEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel(); // Stop ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slower, clearer pace for seniors
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis not supported or failed:', e);
    }
  }, [speechEnabled]);

  // Play DTMF Tone helper
  const playDialTone = useCallback((key) => {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const freqs = DTMF_FREQS[key] || [440, 480];
      const now = audioCtx.currentTime;
      const duration = 0.12;

      freqs.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn('Audio tone play failed:', e);
    }
  }, [audioCtx]);

  const toggleSeniorMode = () => {
    setIsSeniorModeActive((prev) => {
      const next = !prev;
      if (next) {
        speak('Senior Citizen Mode activated. Text enlarged and voice assistance turned on.');
      } else {
        speak('Standard display mode restored.');
      }
      return next;
    });
  };

  const toggleSpeech = () => {
    setSpeechEnabled((prev) => {
      const next = !prev;
      if (next) speak('Voice assistance turned on.');
      return next;
    });
  };

  const openSeniorModal = (tab = 'DIAL') => {
    setSeniorTab(tab);
    setIsSeniorModalOpen(true);
    if (tab === 'DIAL') {
      speak('Senior Care Command Center opened. Tap any helpline or dial a number.');
    } else if (tab === 'SOS') {
      speak('Emergency SOS screen. Press the red button to call an ambulance immediately.');
    } else if (tab === 'MEDICINE') {
      speak('Daily health reminders and medicine checklist.');
    } else if (tab === 'GUIDE') {
      speak('How to use this app. Listen to the simple step-by-step instructions.');
    }
  };

  const closeSeniorModal = () => {
    setIsSeniorModalOpen(false);
  };

  // Trigger Senior SOS Dispatch
  const triggerSeniorSOS = async (user) => {
    setSosStatus('triggering');
    speak('Emergency SOS activated. Contacting nearest ambulance and notifying your family.');

    try {
      const res = await api.createRequest({
        type: 'AMBULANCE',
        targetHospitalId: 'hosp_ruby_hall',
        priority: 'EMERGENCY',
        details: {
          pickupLocation: user?.address || 'Senior Resident (Current GPS Location, Pune)',
          pickupCoords: { lat: 18.5204, lng: 73.8567 },
          dropLocation: 'Ruby Hall Clinic Emergency Gate',
          emergencyType: 'Senior Citizen Emergency SOS - Immediate Evacuation',
          requiresOxygen: true,
          seniorCitizenRequest: true,
          caregiverContact: contacts[0]?.phone || '+919822012345'
        }
      });

      setRecentSosRequest(res.request);
      setSosStatus('dispatched');
      speak('Emergency confirmed! Ambulance request dispatched. Unit is on the way.');

      if (addToast) {
        addToast({
          type: 'EMERGENCY_DISPATCH',
          title: '🚨 Senior SOS Triggered',
          message: `Ambulance dispatched for senior citizen. Request #${res.request.id}`
        });
      }

      return res.request;
    } catch (err) {
      console.error('Senior SOS error:', err);
      setSosStatus('error');
      speak('Could not connect to network. Please dial 108 directly on your phone.');
      throw err;
    }
  };

  const toggleReminder = (id) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const newStatus = !r.taken;
          if (newStatus) {
            speak(`Done! ${r.title} marked as completed.`);
          }
          return { ...r, taken: newStatus };
        }
        return r;
      })
    );
  };

  const addContact = (contact) => {
    setContacts((prev) => [...prev, { ...contact, id: 'c_' + Date.now() }]);
    speak(`Saved contact for ${contact.name}`);
  };

  const deleteContact = (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    speak('Contact removed.');
  };

  return (
    <SeniorContext.Provider
      value={{
        isSeniorModalOpen,
        openSeniorModal,
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
        recentSosRequest
      }}
    >
      {children}
    </SeniorContext.Provider>
  );
};

export const useSenior = () => {
  const context = useContext(SeniorContext);
  if (!context) {
    throw new Error('useSenior must be used within a SeniorProvider');
  }
  return context;
};
