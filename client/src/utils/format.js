const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const fullDateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' });

export const formatDateTime = (value) => dateTime.format(new Date(value));
export const formatFullDateTime = (value) => fullDateTime.format(new Date(value));
