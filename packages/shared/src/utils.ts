export function CapitalizeFirstLetterOfEachWord(str: string) {
  return str.replace(/(?:^|\s)\w/g, (match) => match.toUpperCase());
}
/**
 * The `formatDuration` function in TypeScript takes a duration in seconds and returns a formatted
 * string in the format "hh:mm:ss".
 * @param {number} seconds - The `formatDuration` function takes a parameter `seconds` of type number,
 * which represents the total duration in seconds that needs to be formatted into hours, minutes, and
 * seconds.
 * @returns The `formatDuration` function returns a formatted duration string in the format "hh:mm:ss"
 * where hh represents hours, mm represents minutes, and ss represents seconds. The values are padded
 * with leading zeros if needed to ensure each part is two digits long.
 */
export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
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
