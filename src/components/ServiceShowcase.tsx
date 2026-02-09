import { useState, useEffect } from 'react';
import { Search, MapPin, Building2, Briefcase, ExternalLink, Filter } from 'lucide-react';

interface ServiceProvider {
    id: string;
    name: string;
    category: string;
    description: string;
    services: string;
    city: string;
    contact: string;
    website: string;
}

export const ServiceShowcase = ({ onBack }: { onBack: () => void }) => {
    const [services, setServices] = useState<ServiceProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        fetch('/api/services')
            .then(res => res.json())
            .then(data => {
                setServices(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const categories = ['all', ...Array.from(new Set(services.map(s => s.category)))];

    const filteredServices = services.filter(s => {
        const matchesText = s.name.toLowerCase().includes(filter.toLowerCase()) ||
            s.description.toLowerCase().includes(filter.toLowerCase()) ||
            s.services.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
        return matchesText && matchesCategory;
    });

    return (
        <div className="h-full flex flex-col bg-paper-texture animate-in fade-in duration-500 overflow-hidden">
            {/* Header */}
            <div className="p-8 md:p-12 pb-6 flex-none bg-white/50 border-b border-border/50 backdrop-blur-sm z-10">
                <div className="max-w-6xl mx-auto w-full">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink mb-4">Partner Ecosystem</h1>
                    <p className="text-lg text-ink-light mb-8 max-w-2xl font-sans">
                        Accelerate your startup with verified service providers, from investors to dev shops.
                    </p>

                    <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search partners..."
                                className="w-full pl-12 pr-4 py-3 rounded-lg border border-border bg-white shadow-sm focus:ring-2 focus:ring-ink focus:outline-none transition-all"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                        <div className="relative w-full md:w-48">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                className="w-full pl-10 pr-8 py-3 rounded-lg border border-border bg-white shadow-sm focus:ring-2 focus:ring-ink focus:outline-none appearance-none capitalize cursor-pointer"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-8 md:px-12 py-12 custom-scrollbar">
                <div className="max-w-6xl mx-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
                        </div>
                    ) : filteredServices.length === 0 ? (
                        <div className="text-center py-20 bg-white/50 border border-dashed border-gray-300 rounded-xl">
                            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-ink-light font-sans">No partners found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredServices.map((service) => (
                                <div key={service.id} className="group bg-white border border-border rounded-xl p-6 shadow-sm hover:shadow-float hover:-translate-y-1 transition-all flex flex-col h-auto relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 text-ink-light">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-ink/50 bg-gray-100 px-2 py-1 rounded-sm">{service.category}</span>
                                    </div>

                                    <h3 className="text-xl font-serif font-bold text-ink mb-2">{service.name}</h3>
                                    <p className="text-sm text-ink/70 font-sans mb-4 line-clamp-3">{service.description}</p>

                                    <div className="border-t border-gray-50 pt-4 mt-auto space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-ink-light">
                                            <Briefcase className="w-3 h-3" />
                                            <span className="font-medium">Services:</span> {service.services}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-ink-light">
                                            <MapPin className="w-3 h-3" />
                                            {service.city || 'Global'}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex gap-3">
                                        <a href={`mailto:${service.contact}`} className="flex-1 py-2 text-center text-xs font-bold border border-ink text-ink rounded hover:bg-ink hover:text-white transition-colors">Contact</a>
                                        {service.website && (
                                            <a href={service.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 border border-gray-200 rounded hover:border-accent-blue hover:text-accent-blue transition-colors">
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
