/**
 * GameMenu: Ultra-luxury compact obsidian glassmorphism menu.
 * Minimalist design with zero visual noise, micro-typography,
 * multi-lingual switching (RU/EN/ZH), suit selector, and atmosphere switcher.
 */

import React, { useState } from 'react';
import {
  Language,
  translations,
  Translations,
} from './localization';
import { SuitType } from './SpidermanModel';

export type TimeOfDay = 'sunset' | 'day' | 'night';

import {
  X,
  Volume2,
  VolumeX,
  Sun,
  Sunset,
  Moon,
  RotateCcw,
  Play,
  Shield,
  Layers,
  Eye,
  Sliders,
  Check,
} from 'lucide-react';

interface GameMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
  currentSuit: SuitType;
  onSelectSuit: (suit: SuitType) => void;
  currentTimeOfDay: TimeOfDay;
  onSelectTimeOfDay: (time: TimeOfDay) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onRestart: () => void;
  // Camera Settings
  invertX: boolean;
  onToggleInvertX: () => void;
  invertY: boolean;
  onToggleInvertY: () => void;
  cameraSensitivity: number;
  onChangeSensitivity: (val: number) => void;
  cameraSmoothing: boolean;
  onToggleSmoothing: () => void;
}

export const GameMenu: React.FC<GameMenuProps> = ({
  isOpen,
  onClose,
  currentLang,
  onSelectLang,
  currentSuit,
  onSelectSuit,
  currentTimeOfDay,
  onSelectTimeOfDay,
  isMuted,
  onToggleMute,
  onRestart,
  invertX,
  onToggleInvertX,
  invertY,
  onToggleInvertY,
  cameraSensitivity,
  onChangeSensitivity,
  cameraSmoothing,
  onToggleSmoothing,
}) => {
  const [activeTab, setActiveTab] = useState<'suits' | 'atmosphere' | 'camera' | 'controls'>('suits');
  const t: Translations = translations[currentLang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xl select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-950/90 border border-white/10 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* LUXURY COMPACT HEADER */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900/90 via-slate-950 to-slate-900/90 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-comic text-2xl text-red-500">🕷️</span>
            <div>
              <h2 className="font-comic text-xl tracking-wider text-white">
                {t.gameTitle}
              </h2>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                {t.gameSubtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Minimalist Language Switcher */}
            <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/10">
              {(['ru', 'en', 'zh'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onSelectLang(lang)}
                  className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-md transition-colors ${
                    currentLang === lang
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* COMPACT LUXURY TABS */}
        <div className="flex items-center gap-1 px-5 pt-2 border-b border-white/5 bg-black/40">
          <button
            onClick={() => setActiveTab('suits')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === 'suits'
                ? 'bg-slate-900 text-red-400 border-t border-x border-white/10 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            {t.selectSuit}
          </button>
          <button
            onClick={() => setActiveTab('atmosphere')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === 'atmosphere'
                ? 'bg-slate-900 text-amber-400 border-t border-x border-white/10 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sunset className="w-3.5 h-3.5" />
            {t.timeOfDay}
          </button>
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === 'camera'
                ? 'bg-slate-900 text-purple-400 border-t border-x border-white/10 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {t.cameraSettings}
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === 'controls'
                ? 'bg-slate-900 text-cyan-400 border-t border-x border-white/10 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {t.controls}
          </button>
        </div>

        {/* TAB CONTENTS (COMPACT SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 text-white">
          {/* TAB 1: SUITS */}
          {activeTab === 'suits' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Classic */}
              <div
                onClick={() => onSelectSuit('classic')}
                className={`p-4 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                  currentSuit === 'classic'
                    ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-950/50'
                    : 'bg-black/40 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-comic text-xl text-red-400">CLASSIC</span>
                  <span className="text-xs">🔴🔵</span>
                </div>
                <h4 className="font-bold text-sm mt-2 text-white">
                  {t.suitClassic}
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {t.suitClassicDesc}
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Red & Blue</span>
                  {currentSuit === 'classic' && (
                    <span className="px-1.5 py-0.5 bg-red-600 text-white rounded font-mono font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Symbiote */}
              <div
                onClick={() => onSelectSuit('symbiote')}
                className={`p-4 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                  currentSuit === 'symbiote'
                    ? 'bg-slate-900/60 border-white shadow-md shadow-white/5'
                    : 'bg-black/40 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-comic text-xl text-slate-200">SYMBIOTE</span>
                  <span className="text-xs">⚫⚪</span>
                </div>
                <h4 className="font-bold text-sm mt-2 text-white">
                  {t.suitSymbiote}
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {t.suitSymbioteDesc}
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Glossy Black</span>
                  {currentSuit === 'symbiote' && (
                    <span className="px-1.5 py-0.5 bg-white text-slate-950 rounded font-mono font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Miles */}
              <div
                onClick={() => onSelectSuit('miles')}
                className={`p-4 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                  currentSuit === 'miles'
                    ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/50'
                    : 'bg-black/40 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-comic text-xl text-rose-500">MILES</span>
                  <span className="text-xs">⚫🔴</span>
                </div>
                <h4 className="font-bold text-sm mt-2 text-white">
                  {t.suitMiles}
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {t.suitMilesDesc}
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Carbon & Red</span>
                  {currentSuit === 'miles' && (
                    <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded font-mono font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATMOSPHERE */}
          {activeTab === 'atmosphere' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                onClick={() => onSelectTimeOfDay('sunset')}
                className={`p-4 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                  currentTimeOfDay === 'sunset'
                    ? 'bg-amber-950/40 border-amber-400 shadow-md'
                    : 'bg-black/40 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-comic text-xl text-amber-400">GOLDEN HOUR</span>
                  <Sunset className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="font-bold text-sm mt-2 text-white">
                  {t.timeSunset}
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {t.timeSunsetDesc}
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className="text-amber-300 font-mono">Warm 2400K</span>
                  {currentTimeOfDay === 'sunset' && (
                    <span className="px-1.5 py-0.5 bg-amber-400 text-black rounded font-mono font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>

              <div
                onClick={() => onSelectTimeOfDay('day')}
                className={`p-4 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                  currentTimeOfDay === 'day'
                    ? 'bg-sky-950/40 border-sky-400 shadow-md'
                    : 'bg-black/40 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-comic text-xl text-sky-400">NOON</span>
                  <Sun className="w-5 h-5 text-sky-400" />
                </div>
                <h4 className="font-bold text-sm mt-2 text-white">
                  {t.timeDay}
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {t.timeDayDesc}
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className="text-sky-300 font-mono">Daylight</span>
                  {currentTimeOfDay === 'day' && (
                    <span className="px-1.5 py-0.5 bg-sky-400 text-black rounded font-mono font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>

              <div
                onClick={() => onSelectTimeOfDay('night')}
                className={`p-4 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                  currentTimeOfDay === 'night'
                    ? 'bg-indigo-950/40 border-indigo-400 shadow-md'
                    : 'bg-black/40 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-comic text-xl text-indigo-400">CYBER NIGHT</span>
                  <Moon className="w-5 h-5 text-indigo-400" />
                </div>
                <h4 className="font-bold text-sm mt-2 text-white">
                  {t.timeNight}
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {t.timeNightDesc}
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className="text-indigo-300 font-mono">Midnight</span>
                  {currentTimeOfDay === 'night' && (
                    <span className="px-1.5 py-0.5 bg-indigo-400 text-black rounded font-mono font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CAMERA & MOUSE SETTINGS */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Horizontal Look (X-Axis) */}
                <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-purple-400" />
                      {t.invertX}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        invertX
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {invertX ? t.inverted : t.normal}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                    {invertX
                      ? 'Движение мыши вправо поворачивает камеру влево'
                      : 'Стандарт: мышь вправо = камера вправо, мышь влево = камера влево'}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => { if (invertX) onToggleInvertX(); }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                        !invertX
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {!invertX && <Check className="w-3.5 h-3.5" />}
                      {t.normal}
                    </button>
                    <button
                      onClick={() => { if (!invertX) onToggleInvertX(); }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                        invertX
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {invertX && <Check className="w-3.5 h-3.5" />}
                      {t.inverted}
                    </button>
                  </div>
                </div>

                {/* Vertical Look (Y-Axis) */}
                <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-purple-400" />
                      {t.invertY}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        invertY
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {invertY ? t.inverted : t.normal}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                    {invertY
                      ? 'Инверсия: мышь вверх = наклон вниз (авиасимулятор)'
                      : 'Стандарт: мышь вверх = взгляд в небо, мышь вниз = взгляд на землю'}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => { if (invertY) onToggleInvertY(); }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                        !invertY
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {!invertY && <Check className="w-3.5 h-3.5" />}
                      {t.normal}
                    </button>
                    <button
                      onClick={() => { if (!invertY) onToggleInvertY(); }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                        invertY
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {invertY && <Check className="w-3.5 h-3.5" />}
                      {t.inverted}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sensitivity & Smoothing */}
              <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold text-xs text-white">
                      {t.mouseSensitivity}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {Math.round(cameraSensitivity * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 font-mono">0.4x</span>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={cameraSensitivity}
                    onChange={(e) => onChangeSensitivity(parseFloat(e.target.value))}
                    className="flex-1 accent-purple-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">2.5x</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {t.cameraSmoothing}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Плавная инерционная интерполяция при поворотах
                    </span>
                  </div>

                  <button
                    onClick={onToggleSmoothing}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      cameraSmoothing
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {cameraSmoothing ? 'ВКЛЮЧЕНО' : 'ОТКЛЮЧЕНО'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONTROLS TABLE */}
          {activeTab === 'controls' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2.5 p-2.5 bg-black/40 rounded-xl border border-white/5">
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/15 rounded text-amber-300 font-mono font-bold min-w-[64px] text-center text-[11px]">
                  {t.ctrlMovement}
                </kbd>
                <span className="text-slate-300 text-[11px]">{t.ctrlMovementDesc}</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-black/40 rounded-xl border border-white/5">
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/15 rounded text-amber-300 font-mono font-bold min-w-[64px] text-center text-[11px]">
                  {t.ctrlJump}
                </kbd>
                <span className="text-slate-300 text-[11px]">{t.ctrlJumpDesc}</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-red-950/30 rounded-xl border border-red-500/20">
                <kbd className="px-2 py-0.5 bg-red-800 text-white rounded font-mono font-bold min-w-[64px] text-center text-[11px]">
                  {t.ctrlSwing}
                </kbd>
                <span className="text-red-200 text-[11px] font-medium">{t.ctrlSwingDesc}</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-amber-950/30 rounded-xl border border-amber-500/20">
                <kbd className="px-2 py-0.5 bg-amber-600 text-white rounded font-mono font-bold min-w-[64px] text-center text-[11px]">
                  {t.ctrlMelee}
                </kbd>
                <span className="text-amber-200 text-[11px] font-medium">{t.ctrlMeleeDesc}</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-cyan-950/30 rounded-xl border border-cyan-500/20">
                <kbd className="px-2 py-0.5 bg-cyan-700 text-white rounded font-mono font-bold min-w-[64px] text-center text-[11px]">
                  {t.ctrlWebPellet}
                </kbd>
                <span className="text-cyan-200 text-[11px] font-medium">{t.ctrlWebPelletDesc}</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-purple-950/30 rounded-xl border border-purple-500/20">
                <kbd className="px-2 py-0.5 bg-purple-800 text-white rounded font-mono font-bold min-w-[64px] text-center text-[11px]">
                  {t.ctrlWebCocoon}
                </kbd>
                <span className="text-purple-200 text-[11px] font-medium">{t.ctrlWebCocoonDesc}</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-black/40 rounded-xl border border-white/5">
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/15 rounded text-amber-300 font-mono font-bold min-w-[64px] text-center text-[11px]">
                  {t.ctrlSprint}
                </kbd>
                <span className="text-slate-300 text-[11px]">{t.ctrlSprintDesc}</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-black/40 rounded-xl border border-white/5">
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/15 rounded text-amber-300 font-mono font-bold min-w-[64px] text-center text-[11px]">
                  {t.ctrlZip}
                </kbd>
                <span className="text-slate-300 text-[11px]">{t.ctrlZipDesc}</span>
              </div>
            </div>
          )}
        </div>

        {/* COMPACT BOTTOM ACTION BAR */}
        <div className="px-5 py-3 bg-black/90 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 transition-colors text-xs font-semibold"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              {isMuted ? t.soundOff : t.soundOn}
            </button>
            <button
              onClick={onRestart}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 transition-colors text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t.restartGame}
            </button>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-1.5 bg-red-600 hover:bg-red-500 font-comic text-lg text-white rounded-xl shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            {t.resumeGame}
          </button>
        </div>
      </div>
    </div>
  );
};
