export interface ServiceCtx {
  userId: string;
}

export interface GetGroupsArgs {
  ctx: ServiceCtx;
}

export interface GetGroupsWithPlayersArgs {
  ctx: ServiceCtx;
}

export interface CreateGroupArgs {
  ctx: ServiceCtx;
  name: string;
  players: { id: number }[];
}

export interface UpdateGroupArgs {
  ctx: ServiceCtx;
  id: number;
  name: string;
}

export interface UpdateGroupPlayersArgs {
  ctx: ServiceCtx;
  groupId: number;
  playersToAdd: { id: number }[];
  playersToRemove: { id: number }[];
}

export interface DeleteGroupArgs {
  ctx: ServiceCtx;
  id: number;
}
