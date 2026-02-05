import { cn } from "./ui";

interface UserAvatarProps {
    name: string;
    surname?: string;
    className?: string;
    size?: "sm" | "md" | "lg";
}

export const UserAvatar = ({ name, surname, className, size = "md" }: UserAvatarProps) => {
    const initials = `${name.charAt(0)}${surname ? surname.charAt(0) : ""}`.toUpperCase();

    // Generate a consistent color based on the name
    const colors = [
        "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-yellow-500",
        "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-cyan-500"
    ];
    const charCode = name.charCodeAt(0) + (surname ? surname.charCodeAt(0) : 0);
    const colorClass = colors[charCode % colors.length];

    const sizeClasses = {
        sm: "w-6 h-6 text-xs",
        md: "w-8 h-8 text-sm",
        lg: "w-10 h-10 text-base"
    };

    return (
        <div className={cn(
            "rounded-full flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-slate-900", // standard ring for overlap
            colorClass,
            sizeClasses[size],
            className
        )}>
            {initials}
        </div>
    );
};
