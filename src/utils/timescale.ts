export const MICROSECOND_TIMESCALE = 1000000;

export function toMicroseconds(value, timescale) {
    return MICROSECOND_TIMESCALE * value / timescale;
}

export function toSecondsFromMicros(us) {
    return us / MICROSECOND_TIMESCALE;
}

export const MPEG_CLOCK_HZ = 90000;

export function mpegClockTimeToMicroSecs(time: number): number {
    return toMicroseconds(time, MPEG_CLOCK_HZ);
}

