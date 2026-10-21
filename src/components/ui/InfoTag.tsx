import * as React from "react";
import { cn } from "@/lib/utils";

export interface InfoTagProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: React.ReactNode;
    color?: 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'cyan' | 'teal' | 'yellow';
}

const colorClasses = {
    blue: 'info-tag-blue',
    orange: 'info-tag-orange',
    green: 'info-tag-green',
    purple: 'info-tag-blue',
    red: 'info-tag-red',
    cyan: 'info-tag-cyan',
    teal: 'info-tag-teal',
    yellow: 'info-tag-yellow',
};

export function InfoTag({
    icon,
    children,
    color = 'blue',
    className,
    ...props
}: InfoTagProps) {
    return (
        <div
            className={cn('info-tag', colorClasses[color], className)}
            {...props}
        >
            {icon}
            <span className="truncate">{children}</span>
        </div>
    );
}

