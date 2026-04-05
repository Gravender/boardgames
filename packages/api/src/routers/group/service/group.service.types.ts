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
  players: { id: number }[];
}

export interface DeleteGroupArgs {
  ctx: ServiceCtx;
  id: number;
}

export interface GetGroupArgs {
  ctx: ServiceCtx;
  id: number;
}
