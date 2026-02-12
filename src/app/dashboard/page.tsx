'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Briefcase, User } from 'lucide-react';
import Link from 'next/link';

interface Project {
    id: string;
    name: string;
    sector?: string;
}

interface MatchResult {
    targetId: string;
    name: string;
    title?: string;
    sector?: string;
    score: number;
    reason: string;
    pros: string[];
    cons: string[];
}

export default function Dashboard() {
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [userProjects, setUserProjects] = useState<Project[]>([]);
    const [showProjectSelector, setShowProjectSelector] = useState(false);

    useEffect(() => {
        // In a real app, we'd fetch projects owned by the user
        // For now, let's fetch all and filter or just show all for demo
        fetch('/api/projects')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setUserProjects(data);
                }
            });
    }, []);

    const runMatch = async (type: 'project' | 'profile', targetId?: string) => {
        setLoading(true);
        setShowProjectSelector(false);
        try {
            const res = await fetch('/api/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    id: type === 'project' ? targetId : 'current'
                }),
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

                    <div className="flex flex-col md:flex-row gap-4">
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
                            onClick={() => setShowProjectSelector(!showProjectSelector)}
                            disabled={loading}
                            className={`flex-1 py-4 border rounded-lg transition-all flex flex-col items-center gap-2 group ${showProjectSelector ? 'border-accent-red text-accent-red bg-red-50' : 'border-border hover:border-accent-red hover:text-accent-red'}`}
                        >
                            <User className="w-6 h-6 text-gray-400 group-hover:text-accent-red" />
                            <span className="font-bold">Find Talent</span>
                            <span className="text-xs text-gray-400">Match candidates to my project</span>
                        </button>
                    </div>

                    {showProjectSelector && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-sm font-bold text-ink mb-3">Select a project to match for:</h4>
                            {userProjects.length === 0 ? (
                                <p className="text-xs text-ink-light italic">No projects found. Create one first!</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {userProjects.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => runMatch('project', p.id)}
                                            className="text-left px-3 py-2 bg-white border border-border rounded hover:border-accent-red hover:bg-red-50 transition-colors text-sm"
                                        >
                                            <div className="font-bold truncate">{p.name}</div>
                                            <div className="text-[10px] text-ink-light">{p.sector}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="text-center py-12">
                        <div className="animate-spin w-8 h-8 border-2 border-ink border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-sm text-ink-light animate-pulse">Analyzing compatibility vectors...</p>
                    </div>
                )}

                {matches.length > 0 && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-ink-light uppercase tracking-widest text-xs">Top Matches</h3>
                            <button onClick={() => setMatches([])} className="text-[10px] text-ink-light hover:text-ink">Clear</button>
                        </div>
                        {matches.map((match, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-xl border border-border shadow-sm flex gap-4 items-start hover:shadow-md transition-shadow">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex flex-col items-center justify-center text-green-700 font-bold border border-green-100 flex-shrink-0">
                                    <span className="text-xl">{match.score}</span>
                                    <span className="text-[10px] uppercase">Match</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xl font-serif font-bold text-ink mb-1">{match.name}</h4>
                                    <div className="text-xs text-ink-light mb-2 font-bold px-2 py-0.5 bg-gray-100 inline-block rounded">{match.sector || match.title}</div>
                                    <p className="text-sm text-ink/80 leading-relaxed mb-3">{match.reason}</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {match.pros?.length > 0 && (
                                            <div className="text-xs">
                                                <span className="font-bold text-green-700 block mb-1 uppercase tracking-tighter">✓ Pros</span>
                                                <ul className="list-disc list-inside text-ink-light">
                                                    {match.pros.slice(0, 3).map((p, i) => <li key={i}>{p}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {match.cons?.length > 0 && (
                                            <div className="text-xs">
                                                <span className="font-bold text-red-700 block mb-1 uppercase tracking-tighter">⚠ Considerations</span>
                                                <ul className="list-disc list-inside text-ink-light">
                                                    {match.cons.slice(0, 3).map((p, i) => <li key={i}>{p}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={async () => {
                                            const res = await fetch('/api/inbox', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    targetId: match.targetId,
                                                    targetType: match.sector ? 'project' : 'user',
                                                    content: `Hi ${match.name}, I am interested in connecting based on our AI match score of ${match.score}%!`
                                                })
                                            });
                                            if (res.ok) {
                                                alert("Message initialized! Check your Inbox on the Home page.");
                                            }
                                        }}
                                        className="mt-4 px-4 py-2 bg-ink text-white text-xs rounded hover:bg-ink-light transition-colors"
                                    >
                                        Send Message
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


