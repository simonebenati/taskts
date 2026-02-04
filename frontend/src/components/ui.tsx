import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
        const variants = {
            primary: 'btn-primary',
            secondary: 'btn-secondary',
            danger: 'bg-red-500 hover:bg-red-600 text-white',
            ghost: 'bg-transparent hover:bg-slate-800 text-slate-300',
        };

        const sizes = {
            sm: 'text-xs px-2 py-1',
            md: 'text-sm px-4 py-2',
            lg: 'text-base px-6 py-3'
        };

        // Note: using mix of my CSS classes in index.css and some utility classes if needed.
        // actually index.css defined .btn-primary etc.

        return (
            <button
                ref={ref}
                className={cn('btn', variants[variant], sizes[size], isLoading && 'opacity-70 cursor-not-allowed', className)}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                {children}
            </button>
        );
    }
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && <label className="label">{label}</label>}
                <input
                    ref={ref}
                    className={cn('input', error && 'border-red-500 focus:border-red-500', className)}
                    {...props}
                />
                {error && <p className="text-sm text-danger mt-1">{error}</p>}
            </div>
        );
    }
);

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export const Card = ({ children, className, hoverEffect = false }: CardProps) => (
    <div className={cn('card', hoverEffect && 'card-interactive', className)}>{children}</div>
);
