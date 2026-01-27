export interface CRUDWrapperBase{
    createOne:Function;
    updateOneByID:Function;
    deleteOneByIDPermanent:Function;
    softDeleteOneByID:Function;
    get:Function
    getByID:Function
}