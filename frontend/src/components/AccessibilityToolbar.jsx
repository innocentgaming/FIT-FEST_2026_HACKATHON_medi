import React, { useState, useEffect } from 'react';
import { useSenior } from '../context/SeniorContext';
import { useTheme, THEMES } from '../context/ThemeContext';
import {
  Volume2,
  VolumeX,
  Type,
  Eye,
  Globe,
  Phone,
  Shield,
  HelpCircle,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';

export const AccessibilityToolbar = () => {
  const { speechEnabled, toggleSpeech, speak, isSeniorModeActive, toggleSeniorMode } = useSenior();
  const { theme, toggleTheme } = useTheme();

  const [fontSizeLevel, setFontSizeLevel] = useState(() => {
    return parseInt(localStorage.getItem('medilink_font_size') || '100', 10);
  });

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('medilink_lang') || 'en';
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--user-font-scale', `${fontSizeLevel}%`);
    document.documentElement.style.fontSize = `${fontSizeLevel}%`;
    localStorage.setItem('medilink_font_size', fontSizeLevel.toString());
  }, [fontSizeLevel]);

  const changeFontSize = (delta) => {
    setFontSizeLevel((prev) => {
      const next = Math.min(140, Math.max(90, prev + delta));
      speak(`Text size adjusted to ${next} percent.`);
      return next;
    });
  };

  const resetFontSize = () => {
    setFontSizeLevel(100);
    speak('Text size reset to default.');
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'hi' : 'en';
    setLanguage(nextLang);
    localStorage.setItem('medilink_lang', nextLang);
    if (nextLang === 'hi') {
      speak('हिंदी भाषा का चयन किया गया है। आपातकालीन हेल्पलाइन 108 और 14567 उपलब्ध हैं।');
    } else {
      speak('English language selected. Emergency helplines 108 and 14567 available.');
    }
  };

  return (
    <div
      className="accessibility-toolbar"
      role="region"
      aria-label="Government Accessibility & Quick Help Toolbar"
      style={{
        background: 'linear-gradient(90deg, #050b14 0%, #0c1626 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.35rem 1.25rem',
        fontSize: '0.8rem',
        color: '#cbd5e1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.6rem',
        zIndex: 900
      }}
    >
      {/* Official Government & Public Health Portal Tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontWeight: 700 }}>
          <Shield size={14} />
          <span>National Healthcare & Emergency Dispatch Network (Govt. & Private Multi-Hospital Grid)</span>
        </div>

        <div className="toolbar-hotline-pills" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <a
            href="tel:108"
            style={{
              background: 'rgba(239, 68, 68, 0.18)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title="Call National Ambulance 108"
          >
            <span>🚑 108 Ambulance</span>
          </a>

          <a
            href="tel:14567"
            style={{
              background: 'rgba(56, 189, 248, 0.18)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title="Call Elder Line 14567"
          >
            <span>👴 14567 Elder Line</span>
          </a>

          <a
            href="tel:112"
            style={{
              background: 'rgba(245, 158, 11, 0.18)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.75rem'
            }}
            title="Call National Emergency 112"
          >
            🚨 112 All-Emergency
          </a>
        </div>
      </div>

      {/* Accessibility Controls: Font Resizer, Voice Assist, Language */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        {/* Font Scaling Tools */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '1px'
          }}
          title="Adjust Text Size for Accessibility"
        >
          <button
            onClick={() => changeFontSize(-10)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              padding: '0.15rem 0.45rem',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.75rem'
            }}
            aria-label="Decrease font size"
          >
            A-
          </button>
          <button
            onClick={resetFontSize}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#38bdf8',
              padding: '0.15rem 0.45rem',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.75rem'
            }}
            aria-label="Reset font size"
          >
            {fontSizeLevel}%
          </button>
          <button
            onClick={() => changeFontSize(10)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              padding: '0.15rem 0.45rem',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.82rem'
            }}
            aria-label="Increase font size"
          >
            A+
          </button>
        </div>

        {/* Voice Assistant Toggle */}
        <button
          onClick={toggleSpeech}
          style={{
            background: speechEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: speechEnabled ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
            color: speechEnabled ? '#34d399' : '#94a3b8',
            borderRadius: '4px',
            padding: '0.2rem 0.5rem',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
          title="Toggle Voice Assistance & Screen Reader Audio"
        >
          {speechEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          <span>{speechEnabled ? 'Voice Assist: ON' : 'Voice Assist: OFF'}</span>
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#cbd5e1',
            borderRadius: '4px',
            padding: '0.2rem 0.5rem',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
          title="Switch Language / भाषा बदलें"
        >
          <Globe size={13} />
          <span>{language === 'en' ? 'English | हिंदी' : 'हिंदी | English'}</span>
        </button>
      </div>
    </div>
  );
};
