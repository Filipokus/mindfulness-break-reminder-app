import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

type Language = 'sv' | 'en';
type AuthMode = 'login' | 'signup';

interface AuthScreenProps {
  language: Language;
}

export default function AuthScreen({ language }: AuthScreenProps) {
  const isSv = language === 'sv';
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const friendlyError = (code: string): string => {
    const map: Record<string, { sv: string; en: string }> = {
      'auth/invalid-email': {
        sv: 'Ogiltig e-postadress.',
        en: 'Invalid email address.',
      },
      'auth/user-not-found': {
        sv: 'Inget konto hittades med den e-postadressen.',
        en: 'No account found with that email.',
      },
      'auth/wrong-password': {
        sv: 'Fel lösenord. Försök igen.',
        en: 'Wrong password. Please try again.',
      },
      'auth/invalid-credential': {
        sv: 'Fel e-post eller lösenord.',
        en: 'Incorrect email or password.',
      },
      'auth/email-already-in-use': {
        sv: 'Det finns redan ett konto med den e-postadressen.',
        en: 'An account with that email already exists.',
      },
      'auth/weak-password': {
        sv: 'Lösenordet måste vara minst 6 tecken.',
        en: 'Password must be at least 6 characters.',
      },
      'auth/popup-closed-by-user': {
        sv: 'Inloggning avbröts.',
        en: 'Sign-in was cancelled.',
      },
    };
    return map[code]
      ? map[code][language]
      : isSv
      ? 'Något gick fel. Försök igen.'
      : 'Something went wrong. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="h-full bg-[#FAFAF8] flex flex-col items-center justify-center px-6 sm:px-10"
    >
      {/* Logo / Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#C5D4C0]">
          <span className="text-2xl">🌿</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-light text-[#2C2C2A]">
          {isSv ? 'Ta en stund' : 'Take a Moment'}
        </h1>
        <p className="mt-1 text-sm font-light text-[#2C2C2A]/50">
          {mode === 'login'
            ? isSv
              ? 'Logga in för att fortsätta'
              : 'Sign in to continue'
            : isSv
            ? 'Skapa ett konto'
            : 'Create an account'}
        </p>
      </div>

      {/* Google button */}
      <button
        onClick={handleGoogle}
        disabled={loading}
        className="mb-4 flex w-full max-w-sm items-center justify-center gap-3 rounded-2xl border border-[#E8E4DC] bg-white px-4 py-3 text-sm font-light text-[#2C2C2A] shadow-sm transition hover:bg-[#F5F3EF] disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {isSv ? 'Fortsätt med Google' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div className="mb-4 flex w-full max-w-sm items-center gap-3">
        <div className="h-px flex-1 bg-[#E8E4DC]" />
        <span className="text-xs text-[#2C2C2A]/40">{isSv ? 'eller' : 'or'}</span>
        <div className="h-px flex-1 bg-[#E8E4DC]" />
      </div>

      {/* Email/password form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        <div>
          <label htmlFor="auth-email" className="mb-1 block text-xs font-light text-[#2C2C2A]/60">
            {isSv ? 'E-postadress' : 'Email address'}
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isSv ? 'du@exempel.se' : 'you@example.com'}
            className="w-full rounded-2xl border border-[#E8E4DC] bg-white px-4 py-3 text-sm font-light text-[#2C2C2A] placeholder:text-[#2C2C2A]/30 focus:border-[#C5D4C0] focus:outline-none focus:ring-2 focus:ring-[#C5D4C0]/30"
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="mb-1 block text-xs font-light text-[#2C2C2A]/60">
            {isSv ? 'Lösenord' : 'Password'}
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSv ? 'Minst 6 tecken' : 'At least 6 characters'}
            className="w-full rounded-2xl border border-[#E8E4DC] bg-white px-4 py-3 text-sm font-light text-[#2C2C2A] placeholder:text-[#2C2C2A]/30 focus:border-[#C5D4C0] focus:outline-none focus:ring-2 focus:ring-[#C5D4C0]/30"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-[#C5D4C0] px-4 py-3 text-sm font-light text-[#2C2C2A] shadow-sm transition hover:bg-[#B5C4B0] disabled:opacity-50"
        >
          {loading
            ? isSv
              ? 'Väntar…'
              : 'Please wait…'
            : mode === 'login'
            ? isSv
              ? 'Logga in'
              : 'Sign in'
            : isSv
            ? 'Skapa konto'
            : 'Create account'}
        </button>
      </form>

      {/* Toggle login / signup */}
      <p className="mt-5 text-xs font-light text-[#2C2C2A]/50">
        {mode === 'login'
          ? isSv
            ? 'Inget konto? '
            : "Don't have an account? "
          : isSv
          ? 'Har du redan ett konto? '
          : 'Already have an account? '}
        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
          className="font-normal text-[#2C2C2A] underline underline-offset-2"
        >
          {mode === 'login'
            ? isSv ? 'Skapa ett' : 'Create one'
            : isSv ? 'Logga in' : 'Sign in'}
        </button>
      </p>
    </motion.div>
  );
}
