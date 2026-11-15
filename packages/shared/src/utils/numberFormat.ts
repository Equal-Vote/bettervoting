// Comma-grouped counts and money, used wherever voter counts or prices are shown

// formatCount(25700) -> "25,700"
export const formatCount = (n: number): string => n.toLocaleString('en-US');

// formatCents(153600) -> "$1,536", formatCents(1050) -> "$10.50"
export const formatCents = (cents: number): string => {
    const wholeDollars = cents % 100 === 0;
    return '$' + (cents / 100).toLocaleString('en-US', {
        minimumFractionDigits: wholeDollars ? 0 : 2,
        maximumFractionDigits: 2,
    });
};
