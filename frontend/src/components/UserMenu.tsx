import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { User, LogOut, ChevronDown, Building, Users, Users2, Sun, Moon } from 'lucide-react';
import { cn } from './ui';

export const UserMenu = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleNavigate = (path: string) => {
        navigate(path);
        setIsOpen(false);
    };

    const isAdmin = user?.roleName === 'admin';

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-3 pl-1 pr-3 py-1 rounded-full transition-all duration-200 border border-transparent",
                    isOpen ? "bg-slate-800 border-slate-700" : "hover:bg-slate-800/50"
                )}
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
                    {user?.name?.[0]}{user?.surname?.[0]}
                </div>
                <div className="text-left hidden md:block">
                    <div className="text-sm font-medium text-slate-200 leading-none">{user?.name} {user?.surname}</div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-blue-400 mt-1">{user?.roleName}</div>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-3 py-2 border-b border-white/5 md:hidden">
                        <div className="text-sm font-medium text-white">{user?.name} {user?.surname}</div>
                        <div className="text-xs text-slate-500">{user?.email}</div>
                    </div>

                    <div className="p-1">
                        <button onClick={() => handleNavigate('/profile')} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <User className="w-4 h-4" />
                            Profile
                        </button>

                        {isAdmin && (
                            <>
                                <button onClick={() => handleNavigate('/settings')} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <Building className="w-4 h-4" />
                                    Organization
                                </button>
                                <button onClick={() => handleNavigate('/users')} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <Users className="w-4 h-4" />
                                    User Management
                                </button>
                                <button onClick={() => handleNavigate('/groups')} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <Users2 className="w-4 h-4" />
                                    Groups
                                </button>
                            </>
                        )}
                    </div>

                    <div className="h-px bg-white/5 my-1" />

                    <div className="p-1">
                        <button
                            onClick={toggleTheme}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                            </div>
                            <div className={cn(
                                "w-7 h-3.5 rounded-full relative transition-colors duration-300",
                                theme === 'dark' ? "bg-indigo-500" : "bg-slate-600"
                            )}>
                                <div className={cn(
                                    "absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 shadow-sm",
                                    theme === 'dark' ? "left-[16px]" : "left-[2px]"
                                )} />
                            </div>
                        </button>

                        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mt-1">
                            <LogOut className="w-4 h-4" />
                            Log Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
