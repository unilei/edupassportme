"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { User, GraduationCap, Heart, Loader2, Check, Bell, Award, Users, BookOpen, Rss } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SessionProvider } from "next-auth/react";
import Link from "next/link";
import { useFetch } from "@/hooks/useFetch";

const EDUCATION_LEVELS = ["High School", "Undergraduate", "Graduate", "PhD", "Professional", "Self-learner"];

const INTEREST_OPTIONS = [
  "Machine Learning", "Data Science", "Web Development", "Mobile Development",
  "Cloud Computing", "Cybersecurity", "UX Design", "Digital Marketing",
  "Project Management", "Language Learning", "Mathematics", "Physics",
  "Business", "Finance", "Teaching", "EdTech", "Writing", "Research",
];

interface ProfileData {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    profile: {
      educationLevel: string | null;
      interests: string[];
      preferredLang: string;
      notifyNewMatch: boolean;
      notifyPriceDrop: boolean;
      notifyNewsletter: boolean;
    } | null;
    _count: { savedListings: number; savedSearches: number };
  } | null;
}

interface BadgeSummary {
  badges: { slug: string; name: string; icon: string; awarded: boolean }[];
  earned: number;
  total: number;
}

interface FollowSummary {
  following: unknown[];
  count: number;
}

interface ProgressSummary {
  stats: { enrolled: number; inProgress: number; completed: number; total: number };
}

function ProfileWidgets() {
  const { data: badges } = useFetch<BadgeSummary>("/api/user/badges");
  const { data: followingData } = useFetch<FollowSummary>("/api/user/follow?tab=following");
  const { data: followersData } = useFetch<FollowSummary>("/api/user/follow?tab=followers");
  const { data: progress } = useFetch<ProgressSummary>("/api/user/progress");

  const earnedBadges = badges?.badges.filter((b) => b.awarded).slice(0, 6) ?? [];

  return (
    <div className="space-y-4 mb-8">
      {/* Quick nav cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/badges" className="rounded-xl border p-3 text-center hover:bg-muted/50 transition-colors">
          <Award className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
          <p className="text-lg font-bold">{badges?.earned ?? "–"}</p>
          <p className="text-[11px] text-muted-foreground">Badges</p>
        </Link>
        <Link href="/feed" className="rounded-xl border p-3 text-center hover:bg-muted/50 transition-colors">
          <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
          <p className="text-lg font-bold">{followingData?.count ?? "–"} / {followersData?.count ?? "–"}</p>
          <p className="text-[11px] text-muted-foreground">Following / Followers</p>
        </Link>
        <Link href="/learning" className="rounded-xl border p-3 text-center hover:bg-muted/50 transition-colors">
          <BookOpen className="h-5 w-5 mx-auto mb-1 text-green-500" />
          <p className="text-lg font-bold">{progress?.stats.completed ?? "–"}</p>
          <p className="text-[11px] text-muted-foreground">Courses Completed</p>
        </Link>
        <Link href="/feed?scope=me" className="rounded-xl border p-3 text-center hover:bg-muted/50 transition-colors">
          <Rss className="h-5 w-5 mx-auto mb-1 text-orange-500" />
          <p className="text-lg font-bold">{progress?.stats.total ?? "–"}</p>
          <p className="text-[11px] text-muted-foreground">Total Enrolled</p>
        </Link>
      </div>

      {/* Badge showcase */}
      {earnedBadges.length > 0 && (
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Recent Badges</p>
            <Link href="/badges" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="flex gap-3 flex-wrap">
            {earnedBadges.map((b) => (
              <div key={b.slug} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-sm">
                <span>{b.icon}</span>
                <span className="font-medium">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData["user"]>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [notifyNewMatch, setNotifyNewMatch] = useState(true);
  const [notifyPriceDrop, setNotifyPriceDrop] = useState(true);
  const [notifyNewsletter, setNotifyNewsletter] = useState(true);

  const fetchProfile = useCallback(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data: ProfileData) => {
        setProfile(data.user);
        if (data.user) {
          setName(data.user.name || "");
          setEducationLevel(data.user.profile?.educationLevel || "");
          setInterests(data.user.profile?.interests || []);
          setNotifyNewMatch(data.user.profile?.notifyNewMatch ?? true);
          setNotifyPriceDrop(data.user.profile?.notifyPriceDrop ?? true);
          setNotifyNewsletter(data.user.profile?.notifyNewsletter ?? true);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchProfile();
    else if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, fetchProfile, router]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, educationLevel, interests, notifyNewMatch, notifyPriceDrop, notifyNewsletter }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || !profile) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card">
          <Heart className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium">{profile._count.savedListings} saved</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium capitalize">{profile.role}</span>
        </div>
      </div>

      {/* Social / Progress Quick Links */}
      <ProfileWidgets />

      <div className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Display Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>

        {/* Education Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Education Level</label>
          <div className="flex flex-wrap gap-2">
            {EDUCATION_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setEducationLevel(educationLevel === level ? "" : level)}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  educationLevel === level
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Interests</label>
          <p className="text-xs text-muted-foreground">Select topics you&apos;re interested in for personalized recommendations</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  interests.includes(interest)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-4 w-4 text-primary" />
            <label className="text-sm font-medium">Notification Preferences</label>
          </div>
          {[
            { label: "New listing matches", desc: "Get notified when new listings match your saved searches", value: notifyNewMatch, setter: setNotifyNewMatch },
            { label: "Price drop alerts", desc: "Get notified when a saved listing drops in price", value: notifyPriceDrop, setter: setNotifyPriceDrop },
            { label: "Newsletter", desc: "Receive our weekly digest of top listings and deals", value: notifyNewsletter, setter: setNotifyNewsletter },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{pref.label}</p>
                <p className="text-xs text-muted-foreground">{pref.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pref.value}
                onClick={() => pref.setter(!pref.value)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  pref.value ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                    pref.value ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Save button */}
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : saved ? (
            <><Check className="h-4 w-4 mr-2" /> Saved!</>
          ) : (
            "Save Profile"
          )}
        </Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <SessionProvider>
      <ProfileContent />
    </SessionProvider>
  );
}
