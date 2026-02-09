'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Briefcase, User, Star } from 'lucide-react';
import Link from 'next/link';

interface MatchResult {
    targetId: string;
    name: string;
    title?: string; // for talent
    sector?: string; // for project
    score: number;
    reason: string;
    pros: string[];
    cons: string[];
}

export default function Dashboard() {
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState<'founder' | 'talent' | null>(null);

    const runMatch = async (type: 'project' | 'profile') => {
        setLoading(true);
        try {
            // Ideally we get the user's project ID if they are a founder
            // For MVP, we assume if they run match as 'profile', it uses their session profile
            // If 'project', we need a project ID. Let's simplify:
            // Talent -> Matches Projects
            // Founder -> Matches Talents (requires picking a project first)

            // Defaulting to 'profile' match for now (Talent looking for Projects)
            // Or if we can detect they have a project...

            const res = await fetch('/api/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: type, id: 'current' }), // 'id' handling needs refinement in API or here
            });
            const data = await res.json();
            if (data.success) {
                setMatches(data.matches);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-paper-texture p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <h1 className="text-3xl font-serif font-bold text-ink">My Dashboard</h1>
                    <Link href="/" className="text-sm text-ink-light hover:text-ink underline">Back to Home</Link>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-border mb-8">
                    <h2 className="text-xl font-bold font-sans mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-accent-blue" />
                        AI Matchmaker
                    </h2>
                    <p className="text-ink-light mb-6">Find the perfect match for your vision or skills.</p>

                    <div className="flex gap-4">
                        <button
                            onClick={() => runMatch('profile')}
                            disabled={loading}
                            className="flex-1 py-4 border border-border rounded-lg hover:border-accent-blue hover:text-accent-blue transition-all flex flex-col items-center gap-2 group"
                        >
                            <Briefcase className="w-6 h-6 text-gray-400 group-hover:text-accent-blue" />
                            <span className="font-bold">Find Projects</span>
                            <span className="text-xs text-gray-400">Match my profile to startups</span>
                        </button>

                        <button
                            onClick={() => alert("Founder matching flow involves selecting a specific project first. Coming soon!")}
                            disabled={loading}
                            className="flex-1 py-4 border border-border rounded-lg hover:border-accent-red hover:text-accent-red transition-all flex flex-col items-center gap-2 group opacity-60"
                        >
                            <User className="w-6 h-6 text-gray-400 group-hover:text-accent-red" />
                            <span className="font-bold">Find Talent</span>
                            <span className="text-xs text-gray-400">Match candidates to my project</span>
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="text-center py-12">
                        <div className="animate-spin w-8 h-8 border-2 border-ink border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-sm text-ink-light animate-pulse">Analyzing compatibility vectors...</p>
                    </div>
                )}

                {matches.length > 0 && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        <h3 className="font-bold text-ink-light uppercase tracking-widest text-xs">Top Matches</h3>
                        {matches.map((match, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-xl border border-border shadow-sm flex gap-4 items-start">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex flex-col items-center justify-center text-green-700 font-bold border border-green-100 flex-shrink-0">
                                    <span className="text-xl">{match.score}</span>
                                    <span className="text-[10px] uppercase">Match</span>
                                </div>
                                <div>
                                    <h4 className="text-xl font-serif font-bold text-ink mb-1">{match.name}</h4>
                                    <div className="text-xs text-ink-light mb-2 font-bold px-2 py-0.5 bg-gray-100 inline-block rounded">{match.sector || match.title}</div>
                                    <p className="text-sm text-ink/80 leading-relaxed mb-3">{match.reason}</p>

                                    <div className="flex gap-4 text-xs">
                                        {match.pros?.length > 0 && (
                                            <div className="text-green-700">
                                                <span className="font-bold">✓ Pros:</span> {match.pros.slice(0, 2).join(", ")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}
