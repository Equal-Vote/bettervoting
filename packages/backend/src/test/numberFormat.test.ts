import { formatCents, formatCount } from '@equal-vote/star-vote-shared/utils/numberFormat';

describe("formatCount", () => {
    test("groups thousands with commas", () => {
        expect(formatCount(42)).toBe('42');
        expect(formatCount(25700)).toBe('25,700');
        expect(formatCount(1234567)).toBe('1,234,567');
    });
});

describe("formatCents", () => {
    test("shows whole dollars without decimals, with commas", () => {
        expect(formatCents(600)).toBe('$6');
        expect(formatCents(153600)).toBe('$1,536');
        expect(formatCents(0)).toBe('$0');
    });

    test("shows cents when the amount isn't whole dollars", () => {
        expect(formatCents(1050)).toBe('$10.50');
        expect(formatCents(123456)).toBe('$1,234.56');
    });
});
