export function CapitalizeFirstLetterOfEachWord(str: string) {
  return str.replace(/(?:^|\s)\w/g, (match) => match.toUpperCase());
}

export const formatDuration = (seconds: number, withSeconds = false) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (withSeconds) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export function getOrdinalSuffix(number: number): string {
  if (number % 100 >= 11 && number % 100 <= 13) {
    return "th";
  }
  switch (number % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function combinations<T>(arr: T[], min = 2): T[][] {
  const result: T[][] = [];
  const n = arr.length;

  const helper = (start: number, combo: T[]) => {
    if (combo.length >= min) result.push([...combo]);
    for (let i = start; i < n; i++) {
      const arrValue = arr[i];
      if (arrValue === undefined) continue;
      combo.push(arrValue);
      helper(i + 1, combo);
      combo.pop();
    }
  };

  helper(0, []);
  return result;
}
