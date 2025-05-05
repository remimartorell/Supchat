export const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };