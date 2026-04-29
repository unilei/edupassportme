"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  GraduationCap,
  Loader2,
  Search,
  BookOpen,
  Briefcase,
  Calendar,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

interface PathStep {
  order: number;
  title: string;
  description: string;
  duration: string;
  type: string;
  searchQuery: string;
}

interface LearningPath {
  goal: string;
  estimatedDuration: string;
  steps: PathStep[];
  tips: string[];
}

const stepIcons: Record<string, typeof BookOpen> = {
  course: BookOpen,
  project: Lightbulb,
  event: Calendar,
  job: Briefcase,
};

export default function LearningPathPage() {
  const [goal, setGoal] = useState("");
  const [currentLevel, setCurrentLevel] = useState("");
  const [timeCommitment, setTimeCommitment] = useState("");
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    setLoading(true);
    setError("");
    setPath(null);

    try {
      const res = await fetch("/api/ai/learning-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, currentLevel, timeCommitment }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate path");
      }

      const data = await res.json();
      setPath(data.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <div className="text-center mb-8">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">AI Learning Path Planner</h1>
        <p className="text-muted-foreground mt-2">
          Tell us your goal and we&apos;ll create a personalized learning roadmap
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label className="text-sm font-medium">What do you want to learn?</label>
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. I want to become a full-stack web developer..."
            className="mt-1"
            rows={3}
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Current level</label>
            <Input
              value={currentLevel}
              onChange={(e) => setCurrentLevel(e.target.value)}
              placeholder="e.g. beginner, some Python experience"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Time commitment</label>
            <Input
              value={timeCommitment}
              onChange={(e) => setTimeCommitment(e.target.value)}
              placeholder="e.g. 10 hours/week"
              className="mt-1"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading || !goal.trim()} className="w-full sm:w-auto">
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
          ) : (
            <><GraduationCap className="h-4 w-4 mr-2" /> Generate Learning Path</>
          )}
        </Button>
      </form>

      {/* Results */}
      {path && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-bold mb-1">{path.goal}</h2>
            <p className="text-sm text-muted-foreground">
              Estimated duration: <strong>{path.estimatedDuration}</strong>
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {path.steps.map((step) => {
              const Icon = stepIcons[step.type] || BookOpen;
              return (
                <div key={step.order} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {step.order}
                    </div>
                    {step.order < path.steps.length && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="rounded-xl border bg-card p-4 flex-1 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        {step.duration}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
                    <Link
                      href={`/search?q=${encodeURIComponent(step.searchQuery)}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Search className="h-3 w-3" />
                      Find resources
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips */}
          {path.tips.length > 0 && (
            <div className="rounded-xl border bg-amber-50 dark:bg-amber-900/10 p-5">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600" /> Tips
              </h3>
              <ul className="space-y-1">
                {path.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
