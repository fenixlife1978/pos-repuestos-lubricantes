
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.push('/');
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verificar rol en Firestore
      const userDoc = await getDoc(doc(db, 'users', user.email?.replace(/\W/g, '_') || ''));
      
      if (userDoc.exists()) {
        toast({ title: "Acceso Concedido", description: `Bienvenido, ${userDoc.data().nombre}` });
        router.push('/');
      } else {
        // Si no hay perfil en Firestore, creamos uno básico por defecto (o manejamos el error)
        toast({ title: "Sesión Iniciada", description: "Cargando perfil..." });
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      setError('Credenciales inválidas o usuario no autorizado.');
      toast({ 
        variant: "destructive", 
        title: "Error de Acceso", 
        description: "Email o contraseña incorrectos." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-warm flex items-center justify-center p-4">
      <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[24px] shadow-2xl overflow-hidden border border-line">
        
        {/* LADO IZQUIERDO: BRANDING */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-ink relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-gold/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 bg-white/5 border border-brand-gold rounded-xl flex items-center justify-center font-black text-brand-gold text-2xl shadow-lg">
                P
              </div>
              <div>
                <div className="font-display font-black text-2xl text-white tracking-tight">
                  Pos<span className="text-brand-gold">VEN</span> Pro
                </div>
                <div className="text-[0.7rem] font-bold text-white/50 uppercase tracking-[0.2em]">
                  Cloud Edition v2.5
                </div>
              </div>
            </div>

            <h1 className="text-4xl font-display font-black text-white leading-tight mb-6">
              Gestión inteligente para el <br />
              <span className="text-brand-gold italic">comercio moderno.</span>
            </h1>
            <p className="text-white/60 text-lg max-w-sm leading-relaxed">
              Sistema de punto de venta avanzado con sincronización en la nube y control fiscal integrado.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-6">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-ink bg-surface-soft" />
              ))}
            </div>
            <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
              +1,200 comercios activos <br /> en toda Venezuela
            </div>
          </div>
        </div>

        {/* LADO DERECHO: FORMULARIO */}
        <div className="p-8 lg:p-16 flex flex-col justify-center bg-white">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-ink mb-2">Iniciar Sesión</h2>
            <p className="text-ink/50 font-medium">Ingresa tus credenciales para acceder al panel.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-status-danger-soft border border-status-danger/20 p-4 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                <AlertCircle className="w-5 h-5 text-status-danger" />
                <p className="text-sm font-bold text-status-danger uppercase tracking-tight">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-ink/60 tracking-widest block ml-1">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 group-focus-within:text-brand-gold transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  type="email" 
                  required
                  className="w-full h-14 bg-surface-soft border border-line rounded-xl pl-12 pr-4 font-bold text-ink focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 outline-none transition-all placeholder:text-ink/20"
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase text-ink/60 tracking-widest">Contraseña</label>
                <button type="button" className="text-[10px] font-black uppercase text-brand-gold hover:text-brand-gold-deep transition-colors">¿Olvidó su clave?</button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 group-focus-within:text-brand-gold transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  className="w-full h-14 bg-surface-soft border border-line rounded-xl pl-12 pr-12 font-bold text-ink focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 bg-ink text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl flex items-center justify-center gap-3 hover:bg-black active:scale-[0.98] transition-all shadow-xl shadow-ink/10 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar al Sistema
                  <ChevronRight className="w-4 h-4 text-brand-gold" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-line flex items-center justify-between">
            <div className="flex items-center gap-2 text-status-success">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Conexión Segura SSL</span>
            </div>
            <div className="text-[10px] font-black text-ink/30 uppercase tracking-widest">
              © 2026 POSVEN PRO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
