import type {
  CreateLocationInputType,
  DeleteLocationInputType,
  EditDefaultLocationInputType,
  GetLocationInputType,
  UpdateLocationInputType,
} from "../location.input";
import type {
  WithUserIdCtx,
  WithUserIdCtxOnly,
} from "../../../utils/shared-args.types";

export type GetLocationsArgs = WithUserIdCtxOnly;

export type GetLocationArgs = WithUserIdCtx<GetLocationInputType>;

export type CreateLocationArgs = WithUserIdCtx<CreateLocationInputType>;

export type UpdateLocationArgs = WithUserIdCtx<UpdateLocationInputType>;

export type EditDefaultLocationArgs =
  WithUserIdCtx<EditDefaultLocationInputType>;

export type DeleteLocationArgs = WithUserIdCtx<DeleteLocationInputType>;
