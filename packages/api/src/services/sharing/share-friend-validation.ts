import type { TransactionType } from "@board-games/db/client";

export const validateFriendSharingPermissions = async (
  transaction: TransactionType,
  currentUserId: string,
  friendId: string,
) => {
  const recipientSettings =
    await transaction.query.userSharingPreference.findFirst({
      where: { userId: friendId },
    });

  if (recipientSettings?.allowSharing === "none") {
    return {
      success: false as const,
      message: `User ${recipientSettings.userId} does not allow sharing.`,
    };
  }

  const returnedFriend = await transaction.query.friend.findFirst({
    where: {
      friendId: currentUserId,
      userId: friendId,
    },
  });

  if (!returnedFriend) {
    return {
      success: false as const,
      message: `User ${friendId} does not exist.`,
    };
  }

  return {
    success: true as const,
    friend: returnedFriend,
  };
};

export const hasExistingShare = async (
  transaction: TransactionType,
  userId: string,
  friendId: string,
  itemType:
    | "game"
    | "match"
    | "player"
    | "location"
    | "scoresheet"
    | "game_role",
  itemId: number,
) => {
  const existingShare = await transaction.query.shareRequest.findFirst({
    where: {
      itemType: itemType,
      itemId: itemId,
      ownerId: userId,
      sharedWithId: friendId,
      OR: [
        { status: "accepted" },
        {
          status: "pending",
          OR: [
            { expiresAt: { isNull: true } },
            { expiresAt: { gt: new Date() } },
          ],
        },
      ],
    },
  });
  return Boolean(existingShare);
};
