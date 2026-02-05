import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Search, Command, Layout, CheckSquare, X } from 'lucide-react';

interface SearchResult {
    boards: Array<{ id: string; name: string; description: string | null }>;
    tasks: Array<{ id: string; title: string; status: string; board: { id: string; name: string } }>;
}

export const SearchModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult>({ boards: [], tasks: [] });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Toggle with Cmd+K or Custom Event
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
        };
        const openModal = () => setIsOpen(true);

        document.addEventListener('keydown', down);
        window.addEventListener('open-search', openModal);

        return () => {
            document.removeEventListener('keydown', down);
            window.removeEventListener('open-search', openModal);
        };
    }, []);

    // Debounced Search
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(async () => {
            if (query.trim().length < 2) {
                setResults({ boards: [], tasks: [] });
                return;
            }

            setLoading(true);
            try {
                const res = await api.get<{ success: boolean; data: SearchResult }>(`/search?q=${encodeURIComponent(query)}`);
                if (res.data.success) {
                    setResults(res.data.data);
                }
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, isOpen]);

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults({ boards: [], tasks: [] });
        }
    }, [isOpen]);

    const handleSelect = (path: string) => {
        setIsOpen(false);
        navigate(path);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center border-b border-slate-800 px-4">
                    <Search className="w-5 h-5 text-slate-400 mr-3" />
                    <input
                        className="flex-1 h-14 bg-transparent text-slate-200 placeholder:text-slate-500 outline-none text-lg"
                        placeholder="Search boards and tasks..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    <div className="flex items-center gap-2">
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-400 opacity-100">
                            <span className="text-xs">ESC</span>
                        </kbd>
                        <button onClick={() => setIsOpen(false)}>
                            <X className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                        </button>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {query.length < 2 && (
                        <div className="py-10 text-center text-slate-500">
                            <Command className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Type at least 2 characters to search</p>
                        </div>
                    )}

                    {loading && (
                        <div className="py-10 text-center text-slate-500">Search is loading...</div>
                    )}

                    {!loading && query.length >= 2 && results.boards.length === 0 && results.tasks.length === 0 && (
                        <div className="py-10 text-center text-slate-500">No results found.</div>
                    )}

                    {!loading && (
                        <>
                            {results.boards.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase px-3 mb-2 mt-2">Boards</h3>
                                    {results.boards.map(board => (
                                        <button
                                            key={board.id}
                                            onClick={() => handleSelect(`/boards/${board.id}`)}
                                            className="w-full flex items-center px-3 py-3 rounded-lg hover:bg-slate-800 text-left group transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 mr-3 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                <Layout className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-slate-200 font-medium group-hover:text-white">{board.name}</div>
                                                {board.description && (
                                                    <div className="text-xs text-slate-500 line-clamp-1">{board.description}</div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {results.tasks.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase px-3 mb-2 mt-2">Tasks</h3>
                                    {results.tasks.map(task => (
                                        <button
                                            key={task.id}
                                            onClick={() => handleSelect(`/boards/${task.board.id}?task=${task.id}`)} // Handling task selection via URL param later? Or just open board?
                                            // Ideally we open board and auto-open task. For now just open board.
                                            className="w-full flex items-center px-3 py-3 rounded-lg hover:bg-slate-800 text-left group transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 mr-3 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                <CheckSquare className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-slate-200 font-medium group-hover:text-white truncate">{task.title}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                                    <span>{task.board.name}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                                                    <span className="uppercase">{task.status.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 text-xs text-slate-500 flex justify-between">
                    <span>ProTip: Use arrows to navigate</span>
                    <span>TaskTS Search</span>
                </div>
            </div>
        </div>
    );
};
