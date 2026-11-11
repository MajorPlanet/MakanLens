"use client";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { getProfile, saveProfile } from "@/lib/storage";

/** Reads the profile after mount (SSR-safe). `ready` flips once localStorage has been read. */
export function useProfile() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- read localStorage after mount (SSR-safe) */
  useEffect(() => {
    setProfile(getProfile());
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  function persist(p: Profile) {
    saveProfile(p);
    setProfile(p);
  }
  return { ready, profile, persist, reload: () => setProfile(getProfile()) };
}
