import { nextVersionDate } from './versionDate';

describe('nextVersionDate', () => {
    afterEach(() => jest.restoreAllMocks());

    test('uses the current time when it is past the previous version', () => {
        jest.spyOn(Date, 'now').mockReturnValue(2000);
        expect(nextVersionDate('1000')).toBe('2000');
    });

    test('never repeats the previous version within the same millisecond', () => {
        jest.spyOn(Date, 'now').mockReturnValue(1000);
        expect(nextVersionDate('1000')).toBe('1001');
    });

    test('stays strictly increasing even if the clock is behind the previous version', () => {
        jest.spyOn(Date, 'now').mockReturnValue(1000);
        expect(nextVersionDate('5000')).toBe('5001');
    });
});
