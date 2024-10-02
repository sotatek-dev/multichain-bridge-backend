import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

export const convertToDayjs = (date?: Date | string | number) => dayjs(date);

export const formatUnixToDateTime = (unixTime: number, format: string) => dayjs.unix(unixTime).format(format);

export const nowUtc = () => dayjs.utc();

export const nowUnix = () => dayjs().unix();

export const convertToUnixMillisecond = (date?: Date) => dayjs(date).valueOf();

export const convertToUnix = (date?: Date | dayjs.Dayjs) => dayjs(date).unix();

export const unixZeroMinuteSecond = (value: number) => dayjs.unix(value).minute(0).second(0).unix();

export const unixToDate = (value: number) => dayjs.unix(value).toDate();

export const startOfDayUnix = (date: Date) => dayjs(date).startOf('day').valueOf() / 1000;

export const endOfDayUnix = (date: Date) => dayjs(date).endOf('day').valueOf() / 1000;
export const getTimeInFutureInSeconds = (minutes: number) => dayjs(new Date()).add(minutes, 'minutes').unix();
