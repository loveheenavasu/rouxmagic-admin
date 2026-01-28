import { WrapperFunctionType } from "../core/api/common";
import { Response } from "../core/api/response";
import { Callbacks } from "./cb";
export interface CRUDWrapperBase<
  Entity,
  CreateDTO,
  UpdateDTO,
  GetOpts = unknown
> {
  createOne: WrapperFunctionType<
    Entity,
    [data: CreateDTO, cbs?: Callbacks]
  >;

  updateOneByID: WrapperFunctionType<
    Entity,
    [id: string, update: Partial<UpdateDTO>, cbs?: Callbacks]
  >;

  deleteOneByIDPermanent: WrapperFunctionType<
    null,
    [id: string, cbs?: Callbacks]
  >;

  softDeleteOneByID: WrapperFunctionType<
    Entity | null,
    [id: string, cbs?: Callbacks]
  >;

  get:(
    opts: GetOpts,
    cbs?: Callbacks
  ) => Promise<Response<Entity>>;

  getByID: WrapperFunctionType<
    Entity | null,
    [id: string, cbs?: Callbacks]
  >;
}
