import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@pace/shared';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      if (mounted) {
        setSession(session);
        setUser(session.user);
      }

      // Fetch profile before setting loading to false
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (mounted) {
        setProfile(profileData as Profile | null);
        setLoading(false);
      }
    }

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (mounted) {
        setSession(s);
        setUser(s?.user ?? null);
      }

      if (s?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', s.user.id)
          .single();
        if (mounted) {
          setProfile(profileData as Profile | null);
        }
      } else {
        if (mounted) {
          setProfile(null);
        }
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data as Profile | null);
  };

  return { session, user, profile, loading, refreshProfile };
}
