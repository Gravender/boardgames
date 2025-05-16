import type { User } from "@clerk/backend";

export function getFullName(clerkUser: User) {
  if (clerkUser.fullName) {
    return clerkUser.fullName;
  }
  if (clerkUser.firstName && clerkUser.lastName) {
    return `${clerkUser.firstName} ${clerkUser.lastName}`;
  }
  if (clerkUser.firstName) {
    return clerkUser.firstName;
  }
  if (clerkUser.lastName) {
    return clerkUser.lastName;
  }
  return "Unknown";
}
