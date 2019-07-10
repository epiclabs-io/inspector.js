export const MICROSECOND_TIMESCALE = 1000000;

export function toMicroseconds(value, timescale) {
    return MICROSECOND_TIMESCALE * value / timescale;
}

export function toSecondsFromMicros(us) {
    return us / MICROSECOND_TIMESCALE;
}

