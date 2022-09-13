export const MICROSECOND_TIMESCALE = 1000000;

export function toMicroseconds(value, timescale) {
    return MICROSECOND_TIMESCALE * value / timescale;
}

export const MPEG_CLOCK_HZ = 90000;

export function mpegClockTimeToSecs(time: number): number {
    return time / MPEG_CLOCK_HZ;
}

